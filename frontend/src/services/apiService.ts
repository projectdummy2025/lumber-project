export interface AgentLog {
  action: string;
  query?: string;
  observation?: string;
}

export interface ChatResponse {
  status: string;
  reply: string;
  agent_logs: AgentLog[];
}

export interface InventoryMaterial {
  id: number;
  material_code: string;
  material_name: string;
  material_type: string;
  stock_quantity: number;
  unit: string;
  moisture_pct: number;
  avg_yield_pct: number;
}

export interface Workstation {
  id: number;
  station_code: string;
  station_name: string;
  active_units: number;
  daily_capacity_hours: number;
  current_load_hours: number;
}

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`);
  }

  return response.json();
}

export async function getInventory(): Promise<InventoryMaterial[]> {
  const response = await fetch("/api/dashboard/inventory");

  if (!response.ok) {
    throw new Error(`Failed to fetch inventory: ${response.statusText}`);
  }

  return response.json();
}

export async function getWorkstations(): Promise<Workstation[]> {
  const response = await fetch("/api/dashboard/workstations");

  if (!response.ok) {
    throw new Error(`Failed to fetch workstations: ${response.statusText}`);
  }

  return response.json();
}
