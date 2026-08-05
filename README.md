<div align="center">
# Lumber

**A hackathon prototype for a single-case AI Operational Consultant.**

This is a focused, single-scenario proof of concept built specifically for the competition. It is not a generalized product for universal use.

[The Agent](docs/architecture.md) · [Stack](#stack) · [Quick Start](#quick-start) · [Architecture](docs/architecture.md) · [Case Study](docs/case-study.md)

![License](https://img.shields.io/badge/license-MIT-blue)
![Agent](https://img.shields.io/badge/agent-ReAct-black)
![Backend](https://img.shields.io/badge/backend-FastAPI-009688)
![Frontend](https://img.shields.io/badge/frontend-React-61DAFB)
![Database](https://img.shields.io/badge/database-SQLite-003B57)

<br/>

*(Place your Dashboard UI screenshot here when ready)*
<!-- ![Dashboard UI](./docs/assets/dashboard.png) -->

</div>

---

## Overview

This project is a **single-case study prototype** built specifically for a Hackathon competition. It is designed to solve one highly specific operational problem: optimizing production capacity and calculating timber yield for a mid-sized furniture factory. **It is not a generalized SaaS or universal product.**

The primary goal of this AI Agent is to assist furniture factory owners in analyzing raw material stock availability, calculating timber yield recovery rates, and providing data-driven operational solutions to overcome workstation capacity bottlenecks.

## Directory Structure

- `/backend` : REST API Server (FastAPI) and AI Agent Logic.
- `/frontend` : User Interface (UI) built with React & Vite.
- `/docs` : Architecture blueprint, operational case study, and API contracts.

## Stack

- **Frontend:** React, Vite
- **Backend:** Python, FastAPI, Uvicorn
- **AI Agent:** ReAct (Reasoning + Acting) pattern integrated with SQL Tooling
- **Database:** SQLite (single file `pms_dummy.db`)

## Quick Start

### 1. Backend Setup (Python / FastAPI)
It is highly recommended to use a **Virtual Environment (venv)** to prevent Python library conflicts with the host system.

**Steps:**
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a new Virtual Environment:
   ```bash
   python3 -m venv venv
   ```
3. Activate the Virtual Environment:
   - **Linux / macOS:** `source venv/bin/activate`
   - **Windows:** `.\venv\Scripts\activate`
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Run the local server:
   ```bash
   uvicorn main:app --reload
   ```
   The server will run on `http://127.0.0.1:8000`

### 2. Frontend Setup (React / Vite)
The frontend is built using lightweight and fast React through the Vite bundler.

**Steps:**
1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node.js dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   Open your browser and access the provided local link (usually `http://localhost:5173`).

## Further Reading (Documentation)
For the development team, please refer to the following documents before writing code:
1. [Case Study & Business Scenario](docs/case-study.md) - Understand the factory's operational constraints and the AI logic flow.
2. [Architecture & Role Allocation](docs/architecture.md) - Technical blueprint and development strategy.
3. [JSON API Contract](docs/api-contract.md) - Endpoint formats for communication between Frontend and Backend.
