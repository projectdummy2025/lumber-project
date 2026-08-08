import type { Plugin } from "vite";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

export function viteDatabaseApiPlugin(): Plugin {
  return {
    name: "vite-database-api-plugin",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestUrl = request.url || "";

        // Hanya tangani route API internal dashboard
        if (!requestUrl.startsWith("/api/dashboard/")) {
          return next();
        }

        const databasePath = path.resolve(
          __dirname,
          "../../backend/pms_dummy.db"
        );

        if (!fs.existsSync(databasePath)) {
          response.statusCode = 503;
          response.setHeader("Content-Type", "application/json");
          response.end(
            JSON.stringify({
              status: "error",
              message: "Database file not found. Please run backend/init_db.py first.",
            })
          );
          return;
        }

        try {
          const database = new DatabaseSync(databasePath, { readOnly: true });

          if (requestUrl === "/api/dashboard/inventory") {
            const query = database.prepare("SELECT * FROM inventory_materials");
            const inventoryData = query.all();
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify(inventoryData));
            database.close();
            return;
          }

          if (requestUrl === "/api/dashboard/workstations") {
            const query = database.prepare("SELECT * FROM workstations");
            const workstationData = query.all();
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify(workstationData));
            database.close();
            return;
          }

          if (requestUrl === "/api/dashboard/products") {
            const query = database.prepare(`
              SELECT p.id, p.sku, p.name, p.category, p.net_volume_m3,
                     b.component_name, b.wood_type, b.net_vol_m3,
                     b.std_cnc_hours, b.std_assembly_hours, b.std_finishing_hours
              FROM products p
              LEFT JOIN product_bom b ON p.id = b.product_id
            `);
            const productData = query.all();
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify(productData));
            database.close();
            return;
          }

          database.close();
          next();
        } catch (error) {
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json");
          response.end(
            JSON.stringify({
              status: "error",
              message: error instanceof Error ? error.message : "Database error",
            })
          );
        }
      });
    },
  };
}
