"""Create pms_dummy.db (SQLite) with the case-study schema + seed data.

Run once: python init_db.py
"""
import sqlite3
from pathlib import Path

DOCKER_DATA_DIR = Path("/app/data")

if DOCKER_DATA_DIR.exists():
	DB_PATH = DOCKER_DATA_DIR / "pms_dummy.db"
else:
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
     [(1, "SET-DINING-01", "Teak Dining Set (Table + 6 Chairs)", "Dining Set", 0.280),
      (2, "TBL-TEAK-01", "Teak Executive Dining Table", "Table", 0.130),
      (3, "CHR-TEAK-01", "Teak Dining Armchair", "Chair", 0.025),
      (4, "CAB-MAH-01", "Mahogany Sideboard Cabinet", "Cabinet", 0.180),
      (5, "BED-TEAK-KING", "Teak King Size Bed Frame", "Bedroom", 0.320),
      (6, "SOFA-TEAK-3S", "Teak 3-Seater Outdoor Sofa", "Outdoor", 0.210)]),
    ("product_bom",
     "(product_id, component_name, wood_type, net_vol_m3, std_cnc_hours, std_assembly_hours, std_finishing_hours)",
     [(1, "Table Solid Top & Frame", "Teak", 0.130, 1.5, 4.0, 2.0),
      (1, "Dining Chairs (6 Units)", "Teak", 0.150, 2.0, 8.0, 4.0),
      (2, "Table Top & Leg Structure", "Teak", 0.130, 1.5, 4.0, 2.0),
      (3, "Chair Frame & Seat Board", "Teak", 0.025, 0.35, 1.3, 0.7),
      (4, "Cabinet Frame & Door Panels", "Mahogany", 0.180, 2.2, 5.5, 3.5),
      (5, "Headboard & Slats", "Teak", 0.320, 3.0, 10.0, 5.0),
      (6, "Sofa Frame & Armrests", "Teak", 0.210, 2.5, 7.0, 4.0)]),
    ("inventory_materials",
     "(material_code, material_name, material_type, stock_quantity, unit, moisture_pct, avg_yield_pct)",
     [('MAT-TEAK-LOG', 'Raw Teak Logs Grade A', 'Timber Log', 120.00, 'm3', 26.0, 45.0),
      ('MAT-MAHOG-LOG', 'Raw Mahogany Logs', 'Timber Log', 65.00, 'm3', 22.0, 50.0),
      ('MAT-TEAK-DRY', 'Kiln-Dried Teak Sawn Timber', 'Sawn Board', 35.00, 'm3', 12.0, 85.0),
      ('MAT-MAHOG-DRY', 'Kiln-Dried Mahogany Sawn Board', 'Sawn Board', 20.00, 'm3', 11.5, 80.0)]),
    ("workstations",
     "(station_code, station_name, active_units, daily_capacity_hours, current_load_hours)",
     [('STN-KILN', 'Kiln Dryer (Oven 1 & 2)', 2, 48.0, 24.0),
      ('STN-CNC', 'CNC Router Cutting Station', 2, 32.0, 14.5),
      ('STN-ASSY', 'Carpentry & Joinery Assembly', 10, 80.0, 48.0),
      ('STN-FINISH', 'Spray & Lacquer Finishing Line', 4, 32.0, 18.0)]),
    ("work_orders",
     "(wo_number, client_name, product_id, quantity, due_date, status)",
     [('WO-2026-001', 'Sydney Hotel Supplies', 1, 5, '2026-08-20', 'IN_PROCESS'),
      ('WO-2026-002', 'Bali Luxury Villas', 2, 10, '2026-08-25', 'IN_PROCESS'),
      ('WO-2026-003', 'Melbourne Decor Corp', 4, 15, '2026-09-05', 'QUEUED'),
      ('WO-2026-004', 'Perth Resort Development', 5, 8, '2026-09-12', 'QUEUED'),
      ('WO-2026-005', 'Tokyo Modern Home', 6, 12, '2026-09-20', 'QUEUED')]),
    ("subcontracting_options",
     "(option_code, option_name, unit_cost_per_set, lead_days, detail)",
     [('SUBCON-ASSY-RAW', 'Raw Assembly Subcontracting', 480000.0, 8,
       'Outsource raw carpentry to the local artisan partners; spray finishing stays in-house.'),
      ('SUBCON-CNC-OUT', 'CNC Cutting Outsourcing', 650000.0, 8,
       'External CNC cutting at a partner shop; parts returned to the factory for assembly.'),
      ('SUBCON-FINISH-OUT', 'Spray Finishing Outsourcing', 850000.0, 6,
       'Spray finishing at a certified partner; assembly stays in-house.'),
      ('OT-2SHIFT', 'Internal 2-Shift Overtime', 1200000.0, None,
       'Add night shift for assembly; labor cost balloons 1.5x and capacity remains tight.'),
      ('OT-CNC-2SHIFT', 'CNC 2-Shift Overtime', 600000.0, None,
       'Add a night shift on CNC routers; doubles cutting capacity.'),
      ('OT-FINISH-2SHIFT', 'Finishing 2-Shift Overtime', 900000.0, None,
       'Add a second shift on the finishing line; doubles finishing capacity.')]),
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
