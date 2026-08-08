import { useEffect, useState } from "react";
import {
  getInventory,
  getWorkstations,
  type InventoryMaterial,
  type Workstation,
} from "../../services/apiService";
import { Button } from "../ui/button";

interface OperationsDashboardProps {
  onSelectPrompt: (prompt: string) => void;
}

export const OperationsDashboard = ({
  onSelectPrompt,
}: OperationsDashboardProps) => {
  const [inventory, setInventory] = useState<InventoryMaterial[]>([]);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);

  useEffect(() => {
    getInventory().then(setInventory).catch(console.error);
    getWorkstations().then(setWorkstations).catch(console.error);
  }, []);

  return (
    <div className="flex h-full w-full flex-col bg-[#111] p-8 text-white overflow-y-auto">
      <div className="mx-auto w-10/12 max-w-5xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white/90">
            Factory Operations Overview
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Realtime factory telemetry connected to internal SQLite database
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Workstation Load Progress */}
          <section className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-gray-200">
              Workstation Capacity Load
            </h3>
            <div className="flex flex-col gap-5 mt-2">
              {workstations.map((station) => {
                const loadPercentage = Math.min(
                  100,
                  Math.round(
                    (station.current_load_hours /
                      station.daily_capacity_hours) *
                      100
                  )
                );
                const isHighLoad = loadPercentage > 85;

                return (
                  <div key={station.id} className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between text-gray-300">
                      <span className="font-medium">
                        {station.station_name}
                      </span>
                      <span className="font-mono text-gray-400">
                        {station.current_load_hours}h /{" "}
                        {station.daily_capacity_hours}h ({loadPercentage}%)
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-black/40">
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
          </section>

          <div className="flex flex-col gap-6">
            {/* Timber Inventory Status */}
            <section className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/5 p-6">
              <h3 className="text-lg font-semibold text-gray-200">
                Timber Inventory Stock
              </h3>
              <div className="grid grid-cols-2 gap-4 mt-2">
                {inventory.map((material) => (
                  <div
                    key={material.id}
                    className="flex flex-col justify-between rounded-xl border border-white/5 bg-black/30 p-4"
                  >
                    <div className="text-sm font-semibold text-gray-300">
                      {material.material_name}
                    </div>
                    <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
                      {material.stock_quantity}{" "}
                      <span className="text-sm font-normal text-emerald-500/70">
                        {material.unit}
                      </span>
                    </div>
                    <div className="mt-3 flex justify-between text-xs text-gray-500 border-t border-white/5 pt-2">
                      <span>MC: {material.moisture_pct}%</span>
                      <span>Yield: {material.avg_yield_pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Quick Scenario Triggers */}
            <section className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/5 p-6">
              <h3 className="text-lg font-semibold text-gray-200">
                AI Operational Scenarios
              </h3>
              <p className="text-xs text-gray-400 mb-2">
                Click a scenario to switch to the AI Assistant and automatically
                analyze the current factory state.
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  onClick={() =>
                    onSelectPrompt(
                      "Check feasibility of a 100-table teak order in 40 days"
                    )
                  }
                  className="justify-start border-blue-500/30 bg-blue-500/10 text-blue-100 hover:bg-blue-500/20"
                >
                  Analyze 100 Teak Table Order Feasibility
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    onSelectPrompt(
                      "Show current workstation capacity bottlenecks"
                    )
                  }
                  className="justify-start border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
                >
                  Detect Workstation Capacity Bottlenecks
                </Button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
