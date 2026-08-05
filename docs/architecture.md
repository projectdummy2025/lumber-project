# System Architecture & Development Blueprint (5-Day Sprint)

This document is the technical reference for building the competition prototype. The primary focus is how the AI Agent addresses the problems in the case study and how responsibilities are effectively divided between the AI Engineer (Python) and the Web Developer (JS/React).

---

## 1. Solution Concept: How the Agent Addresses the Problem

The AI Agent in this prototype is designed using the **ReAct (Reasoning + Acting)** pattern integrated with **Function Calling (Tool Use)** capabilities. The AI does not merely generate text — it acts like an operational analyst that can directly query the database.

### Agentic Workflow (ReAct Loop)
1. **User Input:** The factory owner types a problem into the Dashboard (e.g., *"Check feasibility of a 100-table teak order in 40 days"*).
2. **Reasoning (Thought):** The LLM analyzes the problem and determines it needs BOM specifications and teak timber availability data.
3. **Acting (Tool Call):** The LLM invokes the `execute_sql_query` function with a specific SQL query (`SELECT ... FROM products JOIN product_bom ...`).
4. **Observation:** The database (SQLite) executes the query and returns raw data (JSON) back to the LLM.
5. **Reasoning (Math & Logic):** The LLM performs in-memory mathematical calculations (e.g., computing $28.0 / 0.45\text{ yield} = 62.22\text{ m}^3$).
6. **Iteration:** The LLM repeats steps 3–5 to check workstation capacities and detect the assembly bottleneck.
7. **Final Answer:** The AI formulates its final recommendation (e.g., "Use the raw assembly sub-contracting option") and returns it to the user interface.

---

## 2. System Architecture (Technology Stack)

Given only **5 days** of development time and the team split between Python (AI) and JS/React (Web), the system uses a **Lightweight Microservices (Decoupled Architecture)** approach. This separation ensures both developers can work in parallel without blocking each other.

```text
┌─────────────────────────┐         REST API (JSON)        ┌────────────────────────┐
│     Frontend (Web UI)   │ ◄────────────────────────────► │  AI Engine (Backend)   │
│  - React (Vite)         │       (Chat Requests)          │  - Python & FastAPI    │
│  - Dashboard & Chat UI  │                                │  - LangChain / OpenAI  │
└─────────────────────────┘                                │  - ReAct Agent Logic   │
                                                           └───────────┬────────────┘
                                                                       │ Function Calling
                                                                       ▼
                                               ┌──────────────────────────────────────┐
                                               │           Database (SQLite)          │
                                               │   - Single file: pms_dummy.db        │
                                               │   - Furniture manufacturing schema   │
                                               └──────────────────────────────────────┘
```

> **Architecture Note:** A single SQLite file (`pms_dummy.db`) is shared across both components. The Frontend reads it through API routes for dashboard visualization, while the Python backend accesses it for AI querying.

---

## 3. Team Role Division (Execution Strategy)

Tasks are divided in an isolated (Loose Coupling) manner based on each developer's area of expertise.

### AI Engineer (Python Backend)
Responsible solely for building the AI intelligence logic, data retrieval process, and operational strategy formulation.

Key Tasks:
1. **Database Setup:** Design the `pms_dummy.db` SQLite file using the DDL schema from the case study and share it with the team.
2. **Build the AI Agent:** Write a Python script that defines a strong System Prompt and provides the LLM with an SQL execution capability (`execute_sql` tool).
3. **Wrap into an API:** Create a REST API endpoint using **FastAPI** (e.g., `POST /api/chat`). This API receives user messages, runs the Agentic process, and returns the textual answer along with the SQL log so the UI can render it.

### Web Developer (Frontend React/Vite)
Responsible solely for data visualization (Dashboard) and User Experience (UX). Does not need to handle or touch LLM logic directly.

Key Tasks:
1. **Build the Factory Dashboard:** Create a user interface displaying real data from the database (timber stock table, workstation capacity chart).
2. **Build the Chat Assistant UI:** Create an interactive chat panel as the primary input interface for the owner's operational questions.
3. **API Integration:** Connect the chat panel to the `POST /api/chat` endpoint provided by the AI Engineer.
4. **Visual Feedback:** Provide visual feedback (loading state or analysis animation) while the interface waits for a response from the backend.


### Competition Strategy
Transparency of the AI process is highly valued by judges. When FastAPI responds, also return a record of the SQL queries the AI executed in the background. The Web Developer can design a small panel labeled **"Agent Thought Process"** in the interface to display:
- Agent executed: `SELECT stock_quantity FROM inventory...`
- Agent calculated: `Required volume = 62.22 m3...`

This will demonstrate that the application is a genuine Agentic AI system, not simply a ChatGPT wrapper.
