# API Contract: AI Operational Consultant

This document defines the standard request and response formats (API contract) between the Frontend (Web UI) and Backend (Python FastAPI).
The Web Developer can immediately build the interface and mock the fetch functions using the schema below.

## Base URL
- **Local Development:** `http://127.0.0.1:8000`

---

## 1. Chat Completion Endpoint

The main endpoint that receives messages from the user and returns the AI analysis along with a log of the query trace (reasoning).

- **Method:** `POST`
- **Path:** `/api/chat`
- **Headers:** 
  - `Content-Type: application/json`

### Request Body (JSON)
| Field | Type | Description |
| :--- | :--- | :--- |
| `message` | `string` | User's query text (e.g., "Can the order of 100 tables be completed on time?") |

**Example Request Payload:**
```json
{
  "message": "What is our current Teak wood stock?"
}
```

---

### Response Body (JSON)

The response returns the status, the reply message from the AI, and an array of `agent_logs` objects containing the calculation and SQL query traces.

| Field | Type | Description |
| :--- | :--- | :--- |
| `status` | `string` | Request status (`"success"` or `"error"`) |
| `reply` | `string` | Final textual answer from the AI Agent |
| `agent_logs` | `array` | List of AI processing/observation steps (optional/can be empty) |

**Structure of `agent_logs` Object:**
- `action`: Type of activity (e.g., `"execute_sql"`, `"math_calculation"`)
- `query`: The executed query or instruction
- `observation`: The result or response data observed by the AI

**Example Successful Response Payload:**
```json
{
  "status": "success",
  "reply": "Based on system data, the current stock of raw Teak is sufficient (27.78 m3 remaining).",
  "agent_logs": [
    {
      "action": "execute_sql",
      "query": "SELECT stock_quantity FROM inventory_materials WHERE material_code='MAT-TEAK-LOG'",
      "observation": "stock_quantity: 90.00"
    },
    {
      "action": "math_calculation",
      "query": "Calculate required volume based on 45% yield",
      "observation": "Required: 62.22 m3. Stock is sufficient."
    }
  ]
}
```

---

## Frontend Implementation Notes (Web Developer)
1. **Mock Data:** The backend currently has a mock `/api/chat` endpoint setup which returns a response exactly like the JSON above.
2. **Visualizing Logs:** When receiving the `agent_logs` array, it is recommended to create a dedicated UI component (e.g., an "Agent Processing..." panel) to display these logs so users can transparently view the AI's analysis process.
