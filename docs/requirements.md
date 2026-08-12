# 🪚 Lumber

> **AI Operational Consultant for Furniture Factories**

## Team Members

1. Ahmad Dedad
2. Alvin Nando Erik S.

## 🔗 Project Links

- **GitHub Repository:** https://github.com/projectdummy2025/lumber-project.git
- **Demo Video (2–5 minutes):** [Insert Video Link Here]
- **Live Demo (Optional):** [Insert Live Demo Link Here]

## 📖 Project Description

Lumber is a hackathon prototype for a single-case AI Operational Consultant. Built specifically for the competition, it demonstrates how a **ReAct (Reasoning + Acting)** Agent can serve as an operational analyst. It is designed to solve a highly specific and complex operational problem: optimizing production capacity, calculating timber yield, and evaluating overtime vs. subcontracting for a mid-sized furniture factory facing a tight export deadline.

## 🎯 Problem Solved & Project Impact

Mid-sized manufacturing companies (like furniture factories) often rely on intuition rather than data to make critical operational decisions. When faced with large export orders and strict deadlines, the combination of raw material yield, machine capacity, and drying times creates a complex scalability dilemma.

The primary goal of the **Lumber AI Agent** is to assist factory owners in making data-driven decisions by directly querying their existing Production Management System (PMS). Specifically, it helps by:

1. **Analyzing Raw Material Feasibility**: Calculating raw timber required by factoring in yield recovery rates (e.g. 45% yield after removing defects) and moisture content/kiln drying times.
2. **Bottleneck Detection**: Mapping workstation capacities (e.g., CNC, Assembly, Finishing) against standard Work Hours and BOM requirements to detect shop-floor bottlenecks.
3. **Strategic Optimization**: Providing actionable recommendations such as choosing between internal overtime vs. subcontracting options to avoid strict delivery delay penalties.

## 📸 Screenshots

> _(Place your Dashboard UI and Chat Assistant screenshot here when ready)_
>
> `![Chat UI](./assets/ss-1.png)`
> `![Dashboard UI](./assets/ss-2.png)`
> `![Dashboard UI](./assets/ss-3.png)`

## 💻 Technologies Used

We used a **Lightweight Microservices (Decoupled Architecture)** approach.

### Frontend (Web UI)

- **React & Vite**: For a fast, lightweight dashboard visualization.
- **Tailwind CSS**: For clean styling.
- **Chat Interface**: To display the conversation and expose the "Agent Thought Process" (e.g. raw SQL queries and math logic) for transparency.

### Backend & AI (AI Engine)

- **Framework:** Python, FastAPI, Uvicorn
- **Database:** SQLite (`pms_dummy.db`) containing the relational furniture manufacturing schema (Products, BOM, Inventory, Workstations, Work Orders).
- **AI Agent:** **ReAct (Reasoning + Acting) pattern**. The LLM is provided with SQL Execution Tooling (`execute_sql_query`) to autonomously query the database (Read-Only), perform in-memory mathematical logic, and return actionable advice.

## 🛠️ Installation Instructions

### 1. Backend Setup (AI Engine)

Navigate to the backend directory and set up the Python environment:

```bash
cd backend
python3 -m venv venv

# Activate the virtual environment:
# For Mac/Linux:
source venv/bin/activate
# For Windows:
# .\venv\Scripts\activate

pip install -r requirements.txt
uvicorn main:app --reload
```

### 2. Frontend Setup (Dashboard)

Navigate to the frontend directory and run the React app:

```bash
cd frontend
npm install
npm run dev
```
