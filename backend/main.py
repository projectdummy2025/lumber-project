from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

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

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend API is running. See /docs for Swagger UI."}

@app.post("/api/chat", response_model=ChatResponse)
def chat_with_agent(request: ChatRequest):
    """
    Main endpoint for AI communication.
    This is a dummy/mock implementation which will later be replaced
    with actual ReAct Agent + SQL Execution logic.
    """
    
    # --- MOCK RESPONSE: To be replaced during Day 2 & 3 development ---
    mock_reply = "Based on system data calculations, the current stock of raw Teak is sufficient (27.78 m3 remaining). However, the assembly line is facing a severe bottleneck. My recommendation is to use the raw assembly sub-contracting option."
    
    mock_logs = [
        AgentLog(
            action="execute_sql", 
            query="SELECT stock_quantity, avg_yield_pct FROM inventory_materials WHERE material_code='MAT-TEAK-LOG'",
            observation="stock_quantity: 90.00, avg_yield_pct: 45.0"
        ),
        AgentLog(
            action="math_calculation", 
            query="Calculate (100 units * 0.280 m3) / 0.45",
            observation="Required: 62.22 m3. Stock is sufficient."
        )
    ]
    
    return ChatResponse(
        status="success",
        reply=mock_reply,
        agent_logs=mock_logs
    )

if __name__ == "__main__":
    import uvicorn
    # Run the local server on port 8000
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
