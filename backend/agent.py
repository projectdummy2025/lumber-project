"""ReAct agent core: OpenAI-compatible LLM + read-only SQL tool.

Config via env: LLM_BASE_URL, LLM_MODEL, LLM_API_KEY (optional, some local providers skip it).
"""
import json
import os
import re
import sqlite3
from pathlib import Path
from typing import Any, Iterable

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).resolve().parent / ".env")

dockerDataDirectory = Path("/app/data")
if dockerDataDirectory.exists():
    DB_PATH = dockerDataDirectory / "pms_dummy.db"
else:
    DB_PATH = Path(__file__).resolve().parent / "pms_dummy.db"
MAX_STEPS = 12

DB_SCHEMA = """Database tables (SQLite):
- products(id, sku, name, category, net_volume_m3)  // net_volume_m3 = clean wood volume per set
- product_bom(id, product_id, component_name, wood_type, net_vol_m3, std_cnc_hours, std_assembly_hours, std_finishing_hours)  // std_*_hours = standard hours PER SET at that stage
- inventory_materials(id, material_code, material_name, material_type, stock_quantity, unit, moisture_pct, avg_yield_pct)  // avg_yield_pct = usable share of raw timber (45 means 45%)
- workstations(id, station_code, station_name, active_units, daily_capacity_hours, current_load_hours)  // active_units = parallel machines; daily_capacity_hours = TOTAL capacity across ALL units; current_load_hours = committed load across all units
- work_orders(id, wo_number, client_name, product_id, quantity, due_date, status)
- subcontracting_options(id, option_code, option_name, unit_cost_per_set, lead_days, detail)  // lead_days = external turnaround days; NULL = internal option (overtime / extra shift)
"""

SYSTEM_PROMPT = f"""You are the "AI Operational Consultant" for Djati Karya Furniture, a mid-sized factory producing teak furniture for export. You answer factory-owner operational questions by executing SQL queries against the Production Management System database, then reasoning with math. Always respond strictly in English.

{DB_SCHEMA}
Rules:
- Always ground recommendations in actual database data. Query first, calculate after.
- Use execute_sql for every data need. The tool is read-only (SELECT/PRAGMA); never attempt INSERT/UPDATE/DELETE.
- Standard Operational Time Units & Formulas:
  1. Workstation Capacity: Daily Capacity Hours = active_units * 8 hours/day.
  2. Free Capacity: Net Free Hours/Day = daily_capacity_hours - current_load_hours.
  3. Raw Timber Requirement: Clean Net Vol / avg_yield_pct (e.g. 0.28m3 / 0.45 = 0.622m3 raw log per set).
  4. Station Duration (Days): (order_quantity * std_hours_per_set) / Net Free Hours/Day.
  5. Total Manufacturing Lead Time (Real-world Pipelining Method):
     Total Lead Time (Days) = [Kiln Drying Days] + Max(Duration of STN-CNC, STN-ASSY, STN-FINISH)
     - Kiln Drying Days: 12 days if using raw logs (MAT-TEAK-LOG, moisture ~26%). 0 days if using kiln-dried sawn timber (MAT-TEAK-DRY, moisture ~12%).
     - Pipelining note: Non-bottleneck stations run concurrently in overlap mode and do not add cumulative days to total lead time.
- Subcontracting & Overtime Rules:
  - subcontracting_options with lead_days replaces that stage's internal duration with lead_days (external turnaround).
  - subcontracting_options with NULL lead_days is an internal option (overtime / 2-shift) which doubles that station's free capacity (x2 Net Free Hours/Day).
- Analyze feasibility against deadlines (e.g., 40 days) by comparing:
  a) Raw log (MAT-TEAK-LOG) path vs Kiln-dried (MAT-TEAK-DRY) stock path.
  b) Internal production vs Subcontracting / Overtime solutions.
- When you have gathered all the data you need, STOP calling tools and write your final analysis directly as a text message.
- FORMATTING RULE: Structure your response cleanly into distinct sections using markdown headings (`### Title`), bold titles, and numbered lists (`1.`, `2.`). ALWAYS insert double newlines (`\\n\\n`) between every point, paragraph, and section so each point renders on its own separate line. NEVER merge multiple points or analysis steps into a single continuous block of text. NEVER use dashes or hyphens (`-` or `---`) to make lists or dividers. All responses MUST be in English."""

SQL_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "execute_sql",
            "description": "Run a read-only SELECT query against the factory production database. Returns a JSON table. Use for all data lookups.",
            "parameters": {
                "type": "object",
                "properties": {
                    "thought_title": {"type": "string", "description": "A short, professional title of what you are analyzing in this step (e.g., 'Checking Material Stock', 'Calculating Capacity')."},
                    "thought_description": {"type": "string", "description": "A detailed explanation of your reasoning and what you hope to achieve with this query."},
                    "query": {"type": "string", "description": "SQL SELECT statement"},
                },
                "required": ["query"],
                "additionalProperties": False,
            },
        },
    },
]


def _client() -> OpenAI:
    kwargs: dict[str, Any] = {"base_url": os.environ["LLM_BASE_URL"]}
    if os.environ.get("LLM_API_KEY"):
        kwargs["api_key"] = os.environ["LLM_API_KEY"]
    return OpenAI(**kwargs, timeout=290.0)


def _execute_sql(query: str) -> str:
    if not query.strip().lower().startswith(("select", "pragma")):
        return "Error: only SELECT and PRAGMA queries are allowed."
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        rows = [dict(r) for r in conn.execute(query).fetchmany(50)]
        conn.close()
    except sqlite3.Error as e:
        return f"SQL error: {e}"
    return json.dumps(rows, default=str)


def _execute(logs: list[dict], role: str, content: str) -> dict:
    entry = {"role": role, "content": content}
    logs.append(entry)
    return entry


def _parse_args(raw: str | None) -> dict:
    """Tolerant JSON parse — handles truncated/malformed args from weak models."""
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        result = {}
        for key in ("thought_title", "thought_description", "query"):
            m = re.search(rf'"{key}"\s*:\s*"(.*?)(?:"|$)', raw, re.DOTALL)
            if m:
                result[key] = m.group(1)
        return result


def _chat(messages: list[dict], client: OpenAI, tools: list[dict] | None) -> dict:
    kw: dict[str, Any] = {"model": os.environ["LLM_MODEL"], "messages": messages}
    if tools:
        kw["tools"] = tools
        kw["tool_choice"] = "auto"
    resp = client.chat.completions.create(**kw)
    return resp.choices[0].message.model_dump(exclude_none=True)


def solve(message: str, client: OpenAI | None = None) -> tuple[str, list[dict]]:
    """Run the ReAct loop. Returns (final reply, agent logs)."""
    client = client or _client()
    logs: list[dict] = []
    messages = [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": message}]
    _execute(logs, "user", message)

    for _ in range(MAX_STEPS):
        try:
            msg = _chat(messages, client, SQL_TOOLS)
        except Exception as e:
            _execute(logs, "tool", f"LLM call failed: {e}")
            return "Error: cannot reach the LLM provider. Check configuration.", logs

        tool_calls = msg.get("tool_calls")

        # No tool calls = model is done reasoning, this is the final answer
        if not tool_calls:
            reply = msg.get("content") or ""
            if reply.strip():
                _execute(logs, "finalize", reply)
                return reply, logs
            # Empty content — ask model to give final answer without tools
            messages.append(msg)
            messages.append({"role": "user", "content": "Please provide your final analysis and recommendation now."})
            try:
                final = _chat(messages, client, None)  # no tools = force text reply
                reply = final.get("content") or "No reply from LLM."
                _execute(logs, "finalize", reply)
                return reply, logs
            except Exception as e:
                return f"Error getting final answer: {e}", logs

        messages.append(msg)
        for call in tool_calls:
            name = re.sub(r"^(function[s]?\.?|tool[s]?\.?)", "", call["function"]["name"]).rstrip("0123456789")
            args = _parse_args(call["function"].get("arguments"))

            title = args.get("thought_title", "Processing")
            desc = args.get("thought_description", "Analyzing data...")
            _execute(logs, "thought", json.dumps({"title": title, "description": desc}))

            if name == "execute_sql":
                observation = _execute_sql(args.get("query", ""))
            else:
                observation = f"Unknown tool: {name}. Only execute_sql is available."

            messages.append({"role": "tool", "tool_call_id": call["id"], "content": observation})

    # Exhausted steps — do one final call without tools to get whatever answer we can
    messages.append({"role": "user", "content": "You have run out of steps. Please provide your final analysis now based on the data you have gathered."})
    try:
        final = _chat(messages, client, None)
        reply = final.get("content") or "Analysis stopped after the maximum number of reasoning steps."
        _execute(logs, "finalize", reply)
        return reply, logs
    except Exception:
        _execute(logs, "finalize", "Max steps reached without a final answer.")
        return "Analysis stopped after the maximum number of reasoning steps.", logs
