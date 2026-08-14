import { useEffect, useState } from "react";
import {
  getInventory,
  getWorkstations,
  getWorkOrders,
  type InventoryMaterial,
  type Workstation,
  type WorkOrder,
} from "../../services/apiService";
import { Button } from "../ui/button";

interface OperationsDashboardProps {
  onSelectPrompt: (prompt: string) => void;
}

// Status badge styles for work order status
const STATUS_STYLE: Record<string, string> = {
  IN_PROCESS: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  QUEUED: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
  COMPLETED: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
};

// AI scenario quick-trigger buttons
const AI_SCENARIOS = [
  {
    title: "Feasibility Simulation for 100 Sets",
    desc: "Check material stock, yield rate & station bottlenecks",
    prompt: "Analyze feasibility for Order of 100 Teak Dining Sets (SET-DINING-01) with a 40-day deadline.",
  },
  {
    title: "Detect Workstation Bottlenecks",
    desc: "Identify workstation with highest queue time",
    prompt: "Are any workstations currently experiencing bottleneck or capacity overload?",
  },
  {
    title: "Subcontracting vs Overtime Trade-off",
    desc: "Calculate cost & time efficiency of external vs internal options",
    prompt: "Compare subcontracting cost options vs overtime shift to clear the backlog.",
  },
];

export const OperationsDashboard = ({ onSelectPrompt }: OperationsDashboardProps) => {
  const [inventory, setInventory] = useState<InventoryMaterial[]>([]);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  useEffect(() => {
    // Fetch all data sources in parallel
    getInventory().then(setInventory).catch(console.error);
    getWorkstations().then(setWorkstations).catch(console.error);
    getWorkOrders().then(setWorkOrders).catch(console.error);
  }, []);

  // Computed KPI values
  const totalStockM3 = inventory.reduce((acc, item) => acc + item.stock_quantity, 0);
  const totalCapacityHours = workstations.reduce((acc, ws) => acc + ws.daily_capacity_hours, 0);
  const totalLoadHours = workstations.reduce((acc, ws) => acc + ws.current_load_hours, 0);
  const avgUtilization = totalCapacityHours > 0 ? Math.round((totalLoadHours / totalCapacityHours) * 100) : 0;
  const activeOrdersCount = workOrders.filter((wo) => wo.status === "IN_PROCESS").length;

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[#222] p-4 sm:p-8 text-white">
      <div className="mx-auto w-full max-w-5xl">

        {/* Page Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white/90">
              Factory Operations Overview
            </h1>
            <p className="mt-1.5 text-sm text-gray-400">Realtime status metrics from SQLite database</p>
          </div>
          <Button
            onClick={() => onSelectPrompt("Analyze feasibility for Order of 100 Teak Dining Sets (SET-DINING-01) with a 40-day deadline.")}
            className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer text-xs shrink-0"
          >
            Simulate New Order (100 Sets)
          </Button>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Raw Timber</span>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white">{totalStockM3.toFixed(1)}</span>
              <span className="text-sm text-emerald-400 font-semibold">m³</span>
            </div>
            <p className="mt-2 text-xs text-gray-400">Warehouse stock status</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Factory Load</span>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white">{avgUtilization}%</span>
              <span className="text-xs text-gray-400">({totalLoadHours}h / {totalCapacityHours}h)</span>
            </div>
            <p className="mt-2 text-xs text-gray-400">Overall resource utilization</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Active Export WOs</span>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white">{activeOrdersCount}</span>
              <span className="text-xs text-gray-400">of {workOrders.length} orders</span>
            </div>
            <p className="mt-2 text-xs text-gray-400">Orders currently in progress</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Kiln Drying Cycle</span>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white">12</span>
              <span className="text-sm text-gray-400 font-semibold">Days</span>
            </div>
            <p className="mt-2 text-xs text-gray-400">Drying cycle constraint</p>
          </div>
        </div>

        {/* Workstation + Inventory Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Workstation Capacity */}
          <section className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-semibold text-gray-200">Workstation Capacity Load</h3>
              <span className="text-xs text-gray-400">Single Shift (8h/Unit)</span>
            </div>

            <div className="flex flex-col gap-5">
              {workstations.map((station) => {
                const loadPercentage = Math.min(100, Math.round((station.current_load_hours / station.daily_capacity_hours) * 100));
                const isHighLoad = loadPercentage >= 60;

                return (
                  <div key={station.id} className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between items-center text-gray-300">
                      <div>
                        <span className="font-semibold text-gray-200">{station.station_name}</span>
                        <span className="ml-2 text-xs text-gray-400">({station.active_units} Units)</span>
                      </div>
                      <span className="font-mono text-gray-300 text-xs">
                        {station.current_load_hours}h / {station.daily_capacity_hours}h
                        <span className={`ml-2 font-bold ${isHighLoad ? "text-amber-400" : "text-emerald-400"}`}>
                          ({loadPercentage}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/40 border border-white/5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isHighLoad ? "bg-amber-500" : "bg-blue-500"}`}
                        style={{ width: `${loadPercentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Timber Inventory */}
          <section className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-semibold text-gray-200">Timber Materials Stock</h3>
              <span className="text-xs text-gray-400">Raw Timber Warehouse</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {inventory.map((material) => {
                const isDry = material.material_type.includes("Sawn Board");
                return (
                  <div key={material.id} className="flex flex-col justify-between rounded-xl border border-white/5 bg-black/30 p-4">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-mono text-gray-400">{material.material_code}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isDry ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                          {isDry ? "Ready (Dry)" : "Must Drying"}
                        </span>
                      </div>
                      <div className="mt-1 text-sm font-semibold text-gray-200">{material.material_name}</div>
                    </div>

                    <div className="mt-3 flex items-baseline gap-1 font-mono text-2xl font-bold text-emerald-400">
                      {material.stock_quantity}
                      <span className="text-xs font-normal text-gray-400">{material.unit}</span>
                    </div>

                    <div className="mt-3 flex justify-between text-xs text-gray-400 border-t border-white/5 pt-2">
                      <span>Moisture: <strong className="text-white">{material.moisture_pct}%</strong></span>
                      <span>Yield: <strong className="text-emerald-300">{material.avg_yield_pct}%</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Work Orders + AI Scenarios */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Work Orders Table */}
          <section className="lg:col-span-2 flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-base font-semibold text-gray-200 border-b border-white/10 pb-3">
              Active Export Work Orders
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300 min-w-[480px]">
                <thead className="bg-white/5 text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">WO Number</th>
                    <th className="p-3">Client</th>
                    <th className="p-3 hidden sm:table-cell">Product</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3 hidden sm:table-cell">Due Date</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {workOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono font-semibold text-blue-400">{wo.wo_number}</td>
                      <td className="p-3 font-semibold text-gray-200 max-w-[100px] truncate">{wo.client_name}</td>
                      <td className="p-3 text-gray-400 hidden sm:table-cell max-w-[120px] truncate">{wo.product_name}</td>
                      <td className="p-3 font-mono">{wo.quantity} set</td>
                      <td className="p-3 font-mono text-gray-400 hidden sm:table-cell">{wo.due_date}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${STATUS_STYLE[wo.status] ?? STATUS_STYLE["QUEUED"]}`}>
                          {wo.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* AI Scenarios Panel */}
          <section className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="border-b border-white/10 pb-3">
              <h3 className="text-base font-semibold text-gray-200">AI Operational Scenarios</h3>
              <p className="text-xs text-gray-400 leading-relaxed mt-1">
                Select an operational scenario to automatically analyze current factory status.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {AI_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.title}
                  onClick={() => onSelectPrompt(scenario.prompt)}
                  className="w-full text-left border border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer p-4 rounded-xl text-xs"
                >
                  <div className="font-semibold text-gray-200">{scenario.title}</div>
                  <div className="text-[11px] text-gray-400 mt-1">{scenario.desc}</div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
