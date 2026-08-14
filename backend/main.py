import os
import sqlite3
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional

from agent import solve

app = FastAPI(title="AI Operational Consultant API", version="1.0.0")

# Setup CORS so the React Frontend (Vite) can call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev, we open it to all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Input Request Schema
class ChatRequest(BaseModel):
    message: str

# Output/Log Thought Schema
class AgentLog(BaseModel):
    action: str
    query: Optional[str] = None
    observation: Optional[str] = None

# Main Output Response Schema
class ChatResponse(BaseModel):
    status: str
    reply: str
    agent_logs: List[AgentLog] = []

# Dashboard inventory item schema
class InventoryMaterial(BaseModel):
    id: int
    material_code: str
    material_name: str
    material_type: Optional[str] = None
    stock_quantity: float
    unit: str
    moisture_pct: Optional[float] = None
    avg_yield_pct: Optional[float] = None

# Dashboard workstation schema
class Workstation(BaseModel):
    id: int
    station_code: str
    station_name: str
    active_units: int
    daily_capacity_hours: float
    current_load_hours: float

# Dashboard work order schema
class WorkOrder(BaseModel):
    id: int
    wo_number: str
    client_name: str
    quantity: int
    due_date: str
    status: str
    sku: str
    product_name: str

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend API is running. See /docs for Swagger UI."}

@app.post("/api/chat", response_model=ChatResponse)
def chat_with_agent(request: ChatRequest):
    """Main endpoint for AI communication — runs the ReAct agent loop."""
    missing = [k for k in ("LLM_BASE_URL", "LLM_MODEL") if not os.environ.get(k)]
    if missing:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "reply": f"Missing env vars: {', '.join(missing)}", "agent_logs": []},
        )

    try:
        reply, logs = solve(request.message)
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "reply": f"Agent error: {e}", "agent_logs": []},
        )

    # Convert agent logs to API contract format
    formatted = []
    for entry in logs:
        if entry["role"] == "finalize":
            continue
        formatted.append(AgentLog(
            action=entry["role"],
            query=entry["content"][:200] if entry["role"] == "tool" else None,
            observation=entry["content"][:400] if entry["role"] == "observation" else None,
        ))
    formatted = [f for f in formatted if f.query or f.observation]
    return ChatResponse(status="success", reply=reply, agent_logs=formatted)

@app.get("/api/dashboard/inventory", response_model=List[InventoryMaterial])
def fetchInventory():
    # Resolve the database path depending on container or local host environment
    dockerDataDirectory = Path("/app/data")
    if dockerDataDirectory.exists():
        databasePath = dockerDataDirectory / "pms_dummy.db"
    else:
        databasePath = Path(__file__).resolve().parent / "pms_dummy.db"

    # Connect to the SQLite database and query materials
    databaseConnection = sqlite3.connect(databasePath)
    databaseConnection.row_factory = sqlite3.Row
    databaseCursor = databaseConnection.cursor()
    databaseCursor.execute("SELECT * FROM inventory_materials")
    inventoryRows = databaseCursor.fetchall()
    
    # Convert SQLite row objects to a list of dicts for Pydantic response parsing
    inventoryItems = [dict(row) for row in inventoryRows]
    databaseConnection.close()
    return inventoryItems

@app.get("/api/dashboard/workstations", response_model=List[Workstation])
def fetchWorkstations():
    # Resolve the database path depending on container or local host environment
    dockerDataDirectory = Path("/app/data")
    if dockerDataDirectory.exists():
        databasePath = dockerDataDirectory / "pms_dummy.db"
    else:
        databasePath = Path(__file__).resolve().parent / "pms_dummy.db"

    # Connect to the SQLite database and query workstations
    databaseConnection = sqlite3.connect(databasePath)
    databaseConnection.row_factory = sqlite3.Row
    databaseCursor = databaseConnection.cursor()
    databaseCursor.execute("SELECT * FROM workstations")
    workstationRows = databaseCursor.fetchall()
    
    # Convert SQLite row objects to a list of dicts for Pydantic response parsing
    workstationItems = [dict(row) for row in workstationRows]
    databaseConnection.close()
    return workstationItems

@app.get("/api/dashboard/workorders", response_model=List[WorkOrder])
def fetchWorkorders():
    # Resolve the database path depending on container or local host environment
    dockerDataDirectory = Path("/app/data")
    if dockerDataDirectory.exists():
        databasePath = dockerDataDirectory / "pms_dummy.db"
    else:
        databasePath = Path(__file__).resolve().parent / "pms_dummy.db"

    # Connect to the SQLite database and query work orders with product details joined
    databaseConnection = sqlite3.connect(databasePath)
    databaseConnection.row_factory = sqlite3.Row
    databaseCursor = databaseConnection.cursor()
    databaseCursor.execute("""
        SELECT w.id, w.wo_number, w.client_name, w.quantity, w.due_date, w.status, p.sku, p.name as product_name
        FROM work_orders w
        JOIN products p ON w.product_id = p.id
    """)
    workorderRows = databaseCursor.fetchall()
    
    # Convert SQLite row objects to a list of dicts for Pydantic response parsing
    workorderItems = [dict(row) for row in workorderRows]
    databaseConnection.close()
    return workorderItems

if __name__ == "__main__":
    import uvicorn
    # Run the local server on port 8000
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
