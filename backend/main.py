import os
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

if __name__ == "__main__":
    import uvicorn
    # Run the local server on port 8000
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
