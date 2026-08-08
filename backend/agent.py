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

DB_PATH = Path(__file__).resolve().parent / "pms_dummy.db"
MAX_STEPS = 6

DB_SCHEMA = """Database tables (SQLite):
- products(id, sku, name, category, net_volume_m3)
- product_bom(id, product_id, component_name, wood_type, net_vol_m3, std_cnc_hours, std_assembly_hours, std_finishing_hours)
- inventory_materials(id, material_code, material_name, material_type, stock_quantity, unit, moisture_pct, avg_yield_pct)
- workstations(id, station_code, station_name, active_units, daily_capacity_hours, current_load_hours)
- work_orders(id, wo_number, client_name, product_id, quantity, due_date, status)
- subcontracting_options(id, option_code, option_name, unit_cost_per_set, lead_days, detail)
"""

SYSTEM_PROMPT = f"""You are the "AI Operational Consultant" for Djati Karya Furniture, a mid-sized factory producing teak furniture for export. You answer factory-owner operational questions by executing SQL queries against the Production Management System database, then reasoning with math.

{DB_SCHEMA}
Rules:
- Always ground recommendations in actual database data. Query first, calculate after.
- Use execute_sql for every data need. The tool is read-only (SELECT/PRAGMA); never attempt INSERT/UPDATE/DELETE.
- Raw timber volume consumed: net_volume / yield. Yield is avg_yield_pct (e.g. 45 means 45%).
- Assembly capacity left per day = daily_capacity_hours - current_load_hours.
- Kiln drying takes 12 days before cutting can start.
- When done, call finalize with your complete analysis and recommendation."""

SQL_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "execute_sql",
            "description": "Run a read-only SELECT query against the factory production database. Returns a JSON table. Use for all data lookups.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "SQL SELECT statement"},
                },
                "required": ["query"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "finalize",
            "description": "Finish the analysis and deliver the final answer to the factory owner. Call this once all data has been gathered.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reply": {"type": "string", "description": "The full final response to the user."},
                },
                "required": ["reply"],
                "additionalProperties": False,
            },
        },
    },
]


def _client() -> OpenAI:
    kwargs: dict[str, Any] = {"base_url": os.environ["LLM_BASE_URL"]}
    if os.environ.get("LLM_API_KEY"):
        kwargs["api_key"] = os.environ["LLM_API_KEY"]
    return OpenAI(**kwargs)


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


def _chat(messages: list[dict], client: OpenAI, tools: list[dict] | None) -> dict:
    kw: dict[str, Any] = {"model": os.environ["LLM_MODEL"], "messages": messages}
    if tools:
        kw["tools"] = tools
        kw["tool_choice"] = "required"
    resp = client.chat.completions.create(**kw)
    return resp.choices[0].message.model_dump(exclude_none=True)


def solve(message: str, client: OpenAI | None = None) -> tuple[str, list[dict]]:
    """Run the ReAct loop. Returns (final reply, agent logs)."""
    client = client or _client()
    logs: list[dict] = []
    messages = [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": message}]
    _execute(logs, "user", message)

    for _ in range(MAX_STEPS):
        tool_calls = None
        try:
            msg = _chat(messages, client, SQL_TOOLS)
        except Exception as e:
            _execute(logs, "tool", f"LLM call failed: {e}")
            return "Error: cannot reach the LLM provider. Check configuration.", logs
        tool_calls = msg.get("tool_calls")
        if not tool_calls:
            return msg.get("content") or "No reply from LLM.", logs
        messages.append(msg)
        for call in tool_calls:
            # some providers prefix tool names (e.g. "functions.execute_sql" or "functionsexecute_sql1")
            name = re.sub(r"^(function[s]?\.?|tool[s]?\.?)", "", call["function"]["name"]).rstrip("0123456789")
            args = json.loads(call["function"]["arguments"] or "{}")
            _execute(logs, "tool", f"{name} :: {args.get('query') or args.get('reply', '')}"[:200])
            if name == "finalize":
                reply = args.get("reply") or "No reply provided."
                _execute(logs, "finalize", reply)
                return reply, logs
            if name != "execute_sql":
                observation = f"Unknown tool: {name}"
            else:
                observation = _execute_sql(args.get("query", ""))
            _execute(logs, "observation", observation[:400])
            messages.append({"role": "tool", "tool_call_id": call["id"], "content": observation})

    _execute(logs, "finalize", "Max steps reached without a final answer.")
    return "Analysis stopped after the maximum number of reasoning steps.", logs