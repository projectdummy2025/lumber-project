import { useEffect, useState } from "react";
import {
  getInventory,
  getWorkstations,
  type InventoryMaterial,
  type Workstation,
} from "../../services/apiService";
import { Button } from "../ui/button";

interface OperationsPaneProps {
  onSelectPrompt: (prompt: string) => void;
}

export const OperationsPane = ({ onSelectPrompt }: OperationsPaneProps) => {
  const [inventory, setInventory] = useState<InventoryMaterial[]>([]);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);

  useEffect(() => {
    getInventory().then(setInventory).catch(console.error);
    getWorkstations().then(setWorkstations).catch(console.error);
  }, []);

  return (
    <section className="flex w-1/2 flex-col gap-6 overflow-y-auto border-r border-white/10 bg-[#181818] p-6">
      <div>
        <h2 className="text-xl font-bold text-gray-200">
          Factory Operations Overview
        </h2>
        <p className="text-xs text-gray-400">
          Realtime status metrics from SQLite database
        </p>
      </div>

      {/* Workstation Load Progress */}
      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-semibold text-gray-300">
          Workstation Capacity Load
        </h3>
        <div className="flex flex-col gap-3">
          {workstations.map((station) => {
            const loadPercentage = Math.min(
              100,
              Math.round(
                (station.current_load_hours / station.daily_capacity_hours) *
                  100
              )
            );
            const isHighLoad = loadPercentage > 85;

            return (
              <div key={station.id} className="flex flex-col gap-1 text-xs">
                <div className="flex justify-between text-gray-300">
                  <span className="font-medium">{station.station_name}</span>
                  <span className="font-mono">
                    {station.current_load_hours}h / {station.daily_capacity_hours}h ({loadPercentage}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isHighLoad ? "bg-red-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${loadPercentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timber Inventory Status */}
      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-semibold text-gray-300">
          Timber Inventory Stock
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {inventory.map((material) => (
            <div
              key={material.id}
              className="rounded-lg border border-white/5 bg-black/30 p-3 text-xs"
            >
              <div className="font-semibold text-gray-200">
                {material.material_name}
              </div>
              <div className="mt-1 font-mono text-base font-bold text-emerald-400">
                {material.stock_quantity} {material.unit}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-gray-400">
                <span>Moisture: {material.moisture_pct}%</span>
                <span>Yield: {material.avg_yield_pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Scenario Triggers */}
      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-semibold text-gray-300">
          Operational Scenarios
        </h3>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={() =>
              onSelectPrompt(
                "Check feasibility of a 100-table teak order in 40 days"
              )
            }
            className="justify-start border-white/10 bg-white/5 text-xs text-gray-200 hover:bg-white/10"
          >
            Check 100 Teak Table Order Feasibility
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              onSelectPrompt("Show current workstation capacity bottlenecks")
            }
            className="justify-start border-white/10 bg-white/5 text-xs text-gray-200 hover:bg-white/10"
          >
            Detect Workstation Capacity Bottlenecks
          </Button>
        </div>
      </div>
    </section>
  );
};
