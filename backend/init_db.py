"""Create pms_dummy.db (SQLite) with the case-study schema + seed data.

Run once: python init_db.py
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "pms_dummy.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    net_volume_m3 REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS product_bom (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    component_name TEXT NOT NULL,
    wood_type TEXT,
    net_vol_m3 REAL NOT NULL,
    std_cnc_hours REAL NOT NULL,
    std_assembly_hours REAL NOT NULL,
    std_finishing_hours REAL NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS inventory_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_code TEXT UNIQUE NOT NULL,
    material_name TEXT NOT NULL,
    material_type TEXT,
    stock_quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    moisture_pct REAL,
    avg_yield_pct REAL DEFAULT 45.0
);

CREATE TABLE IF NOT EXISTS workstations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_code TEXT UNIQUE NOT NULL,
    station_name TEXT NOT NULL,
    active_units INTEGER DEFAULT 1,
    daily_capacity_hours REAL NOT NULL,
    current_load_hours REAL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS work_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wo_number TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','IN_PROCESS','COMPLETED')),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS subcontracting_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    option_code TEXT UNIQUE NOT NULL,
    option_name TEXT NOT NULL,
    unit_cost_per_set REAL NOT NULL,
    lead_days INTEGER,
    detail TEXT
);
"""

# Subcontracting option as a constant table: gives the agent the data needed
# for the capitalize-vs-contract decision.
SEED = [
    ("products",
     "(id, sku, name, category, net_volume_m3)",
     [(1, "SET-DINING-01", "Teak Dining Set (Table + 6 Chairs)", "Dining Set", 0.280)]),
    ("product_bom",
     "(product_id, component_name, wood_type, net_vol_m3, std_cnc_hours, std_assembly_hours, std_finishing_hours)",
     [(1, "Complete Set", "Teak", 0.280, 3.5, 12.0, 6.0)]),
    ("inventory_materials",
     "(material_code, material_name, material_type, stock_quantity, unit, moisture_pct, avg_yield_pct)",
     [('MAT-TEAK-LOG', 'Raw Teak Logs', 'Timber Log', 90.00, 'm3', 26.0, 45.0)]),
    ("workstations",
     "(station_code, station_name, active_units, daily_capacity_hours, current_load_hours)",
     [('STN-KILN', 'Kiln Dryer', 2, 48.0, 40.8),
      ('STN-CNC', 'CNC Router Machine', 2, 32.0, 24.9),
      ('STN-ASSY', 'Joinery & Assembly', 10, 80.0, 70.4),
      ('STN-FINISH', 'Finishing Line', 1, 8.0, 4.8)]),
    ("subcontracting_options",
     "(option_code, option_name, unit_cost_per_set, lead_days, detail)",
     [('SUBCON-ASSY-RAW', 'Raw Assembly Sub-contracting', 480000.0, 8,
       'Outsource raw carpentry assembly to local artisan partners; spray finishing stays in-house.'),
      ('OT-2SHIFT', 'Internal 2-Shift Overtime', 1200000.0, None,
       'Add night shift for assembly; labor cost balloons 1.5x and capacity remains tight.')]),
]


def init_db() -> None:
    if DB_PATH.exists():
        DB_PATH.unlink()
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA)
    for table, cols, rows in SEED:
        placeholders = ", ".join("?" * len(cols.replace("(", "").replace(")", "").split(",")))
        conn.executemany(f"INSERT INTO {table} {cols} VALUES ({placeholders})", rows)
    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print(f"Created {DB_PATH} ({DB_PATH.stat().st_size} bytes)")