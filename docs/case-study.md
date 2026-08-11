# Operational Case Study: Scalability Dilemma & Export Delay Risks in a Mid-Sized Furniture Factory

## 1. Background & Business Problem

### Factory Profile & Field Situation
*Djati Karya Furniture* is a mid-sized manufacturing company producing teak and mahogany furniture for the export market. The factory currently operates a relational database-based **Production Management System (PMS)** to record raw material data, Bill of Materials (BOM), workstation capacities, and Work Order (WO) status.

The factory has just received a lucrative export order offer from an Australian buyer for **100 Sets of Teak Dining Tables (Table + 6 Chairs)**. However, this order requires a **strict 40-day delivery deadline**.

```
                           ┌──────────────────────────────────────────────┐
                           │   Export Order Opportunity: 100 Dining Sets  │
                           │   Delivery Deadline: 40 Days                 │
                           └──────────────────────┬───────────────────────┘
                                                  │
                                                  ▼
                         ┌──────────────────────────────────────────────────┐
                         │       The Factory Owner's Core Dilemma           │
                         ├──────────────────────────────────────────────────┤
                         │ 1. Is the raw timber stock sufficient post-yield?│
                         │ 2. Where are the shop floor bottlenecks?         │
                         │ 3. How to avoid delivery delay penalties?        │
                         └──────────────────────────────────────────────────┘
```

---

### Physical Realities of Wood Manufacturing
Decisions on this order cannot rely solely on intuition or rough estimates because it involves interconnected operational constraints:

1. **Wood Yield Recovery Rate:** Raw teak logs do not convert 100% into furniture. After cutting, removing natural defects (knots, cracks), and dimensional sizing, only **45%** of the raw wood volume becomes clean components. The rest becomes waste.
2. **Kiln Drying Lag:** Raw logs with high moisture content ($\approx 26\%$) must go through a 12-day kiln drying cycle to reach export standards ($11\%-12\%$). Machine cutting cannot commence until drying is complete.
3. **Joinery & Assembly Bottleneck:** Assembling mortise & tenon joints requires precise carpentry hours. The assembly station currently operates on a single shift with high utilization from existing orders.
4. **Delay Risks & Costs:** Forcing overtime without precise calculation causes labor costs to balloon by 1.5x and increases fatigue risk. Conversely, missing the deadline incurs contract *demurrage* penalties at the port.

---

## 2. Production Data Structure (Production Management System)

To manage daily operations, the factory relies on the following relational database schema:

```sql
-- 1. Product Master
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sku VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    net_volume_m3 DECIMAL(6,3) NOT NULL
);

-- 2. Bill of Materials (BOM) & Standard Work Hours
CREATE TABLE product_bom (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    component_name VARCHAR(100) NOT NULL,
    wood_type VARCHAR(50),
    net_vol_m3 DECIMAL(6,3) NOT NULL,
    std_cnc_hours DECIMAL(4,1) NOT NULL,
    std_assembly_hours DECIMAL(4,1) NOT NULL,
    std_finishing_hours DECIMAL(4,1) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 3. Raw Material Stock & Yield
CREATE TABLE inventory_materials (
    id INT PRIMARY KEY AUTO_INCREMENT,
    material_code VARCHAR(30) UNIQUE NOT NULL,
    material_name VARCHAR(100) NOT NULL,
    material_type VARCHAR(50),
    stock_quantity DECIMAL(8,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    moisture_pct DECIMAL(4,1),
    avg_yield_pct DECIMAL(4,1) DEFAULT 45.0
);

-- 4. Workstations & Capacity Hours (Standard 8-Hour Workday per Unit)
CREATE TABLE workstations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    station_code VARCHAR(20) UNIQUE NOT NULL,
    station_name VARCHAR(100) NOT NULL,
    active_units INT DEFAULT 1,                -- Number of parallel machines/workers
    daily_capacity_hours DECIMAL(4,1) NOT NULL, -- active_units * 8 hours
    current_load_hours DECIMAL(6,1) DEFAULT 0.0 -- Already committed load from active WOs
);

-- 5. Work Order Status
CREATE TABLE work_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    wo_number VARCHAR(30) UNIQUE NOT NULL,
    client_name VARCHAR(100) NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('QUEUED', 'IN_PROCESS', 'COMPLETED') DEFAULT 'QUEUED',
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### Initial Data State
```sql
INSERT INTO products (id, sku, name, category, net_volume_m3) VALUES
(1, 'SET-DINING-01', 'Teak Dining Set (Table + 6 Chairs)', 'Dining Set', 0.280);

INSERT INTO product_bom (product_id, component_name, wood_type, net_vol_m3, std_cnc_hours, std_assembly_hours, std_finishing_hours) VALUES
(1, 'Complete Set', 'Teak', 0.280, 3.5, 12.0, 6.0);

INSERT INTO inventory_materials (material_code, material_name, material_type, stock_quantity, unit, moisture_pct, avg_yield_pct) VALUES
('MAT-TEAK-LOG', 'Raw Teak Logs', 'Timber Log', 90.00, 'm3', 26.0, 45.0);

INSERT INTO workstations (station_code, station_name, active_units, daily_capacity_hours, current_load_hours) VALUES
('STN-KILN', 'Kiln Dryer', 2, 48.0, 40.8),
('STN-CNC', 'CNC Router Machine', 2, 32.0, 24.9),
('STN-ASSY', 'Joinery & Assembly', 10, 80.0, 70.4),
INSERT INTO workstations (station_code, station_name, active_units, daily_capacity_hours, current_load_hours) VALUES
('STN-KILN', 'Kiln Dryer', 2, 48.0, 24.0),
('STN-CNC', 'CNC Router Machine', 2, 32.0, 12.0),
('STN-ASSY', 'Joinery & Assembly', 10, 80.0, 40.0),
('STN-FINISH', 'Finishing Line', 4, 32.0, 16.0);
```

---

## 3. Standard Operational Metrics & Analysis Complexity

To answer whether the 100 dining set order can be accepted, the production manager and AI Consultant perform standard manufacturing calculations:

### Standard Scheduling & Pipelining Metrics
1. **Daily Resource Capacity**:
   - `Daily Capacity Hours = Active Units * 8 hours/day` (Standard 8-hour shift per machine/worker).
   - `Net Free Hours/Day = Daily Capacity Hours - Current Load Hours`.

2. **Manufacturing Lead Time (Real-World Pipelining Method)**:
   In modern wood manufacturing, stations operate concurrently in **pipelining mode** (overlapping batches), so total shop-floor execution time is driven by the **primary bottleneck stasiun (stasiun dengan durasi terlama)** rather than summing all stasiuns sequentially.

   `Total Production Lead Time (Days) = Kiln Drying Cycle + Max(Station Durations)`

   - *Kiln Drying Cycle:* Fixed 12 days (Only if using raw logs `MAT-TEAK-LOG`. If using `MAT-TEAK-DRY` ready stock, Kiln Drying is 0 days).
   - *Station Duration (Days) = (Order Qty * Std Hours) / Net Free Hours/Day*.

### Operational Calculation Example (100 Sets SET-DINING-01):
1. **Raw Timber Requirement:**
   - Clean component volume per set = $0.280\text{ m}^3$.
   - Factoring in the $45\%$ yield rate (`MAT-TEAK-LOG`), raw timber required = $\frac{28.0\text{ m}^3}{0.45} = \mathbf{62.22\text{ m}^3}$.
   - Available raw logs stock is $90.00\text{ m}^3$ (Sufficient by volume, requires 12 days Kiln Drying).

2. **Workstation Duration & Bottleneck Detection (Internal Production):**
   - **CNC Router Machine** (`STN-CNC`): Free capacity = $32.0 - 12.0 = \mathbf{20.0 \text{ hours/day}}$.
     - Duration = $\frac{100 \text{ sets} \times 3.5 \text{ h}}{20.0 \text{ h/day}} = \mathbf{17.5 \text{ days}}$.
   - **Joinery & Assembly** (`STN-ASSY`): Free capacity = $80.0 - 40.0 = \mathbf{40.0 \text{ hours/day}}$.
     - Duration = $\frac{100 \text{ sets} \times 12.0 \text{ h}}{40.0 \text{ h/day}} = \mathbf{30.0 \text{ days}}$ **(Primary Bottleneck)**.
   - **Finishing Line** (`STN-FINISH`): Free capacity = $32.0 - 16.0 = \mathbf{16.0 \text{ hours/day}}$.
     - Duration = $\frac{100 \text{ sets} \times 6.0 \text{ h}}{16.0 \text{ h/day}} = \mathbf{37.5 \text{ days}}$ **(Tightest Bottleneck)**.

   - **Internal Lead Time Summary (Pipelining):**
     - Using `MAT-TEAK-LOG`: $12 \text{ days (KD)} + \max(17.5, 30.0, 37.5) = 12 + 37.5 = \mathbf{49.5 \text{ days}}$ (Exceeds 40-day deadline).
     - Using `MAT-TEAK-DRY` (ready stock): $0 \text{ days (KD)} + 37.5 \text{ days} = \mathbf{37.5 \text{ days}}$ **(Feasible / Meets 40-day deadline!)**.

3. **Strategic Optimization (Subcontracting vs Overtime):**
   - *Option A (Use MAT-TEAK-DRY stock):* Lead time = 37.5 days (Finished on time internally without extra cost!).
   - *Option B (If using MAT-TEAK-LOG + Subcontract Assembly/Finishing):* Lead time drops to $12 \text{ (KD)} + 8 \text{ (Subcon lead days)} = \mathbf{20 \text{ days}}$.

---

## 4. Organic Solution: Integration of AI Operational Consultant

Given the complex combination of variables (BOM, yield factors, oven schedules, workstation hours, and subcon cost evaluation), the factory owner requires an **AI Operational Consultant** capable of connecting directly to the PMS database.

### Role & Workflow of the AI Consultant

The AI Consultant acts as an *Operational Co-Pilot*, executing relational data queries dynamically, performing non-linear mathematical simulations, and providing data-backed recommendations:

```
┌────────────────────────┐      SQL Queries (Read-Only) ┌────────────────────────┐
│                        ├────────────────────────────►│                        │
│  AI Operational        │                             │  Production Management │
│  Consultant            │◄────────────────────────────┤  System (PMS Database) │
│                        │       Result Sets           │                        │
└───────────┬────────────┘                             └────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Data-Driven Decision Recommendations for Factory Owner:               │
│                                                                        │
│  1. Material: Allocate 62.22 m3 of teak logs, schedule 12-day drying. │
│  2. Bottleneck: Outsource CNC, Assembly, and Finishing to partners.    │
│  3. Timeline: Total 34 days — completed before the 40-day deadline    │
│     with a safe 6-day buffer.                                          │
└────────────────────────────────────────────────────────────────────────┘
```

### Example Query Interaction (Read-Only)

When asked to analyze order feasibility, the AI Consultant autonomously executes the following queries against the PMS database:

```sql
-- 1. AI checks BOM & Raw Material Stock
SELECT p.name, b.net_vol_m3, i.stock_quantity, i.avg_yield_pct
FROM products p
JOIN product_bom b ON p.id = b.product_id
JOIN inventory_materials i ON i.material_code = 'MAT-TEAK-LOG'
WHERE p.sku = 'SET-DINING-01';

-- 2. AI checks capacity of every workstation
SELECT station_code, daily_capacity_hours, current_load_hours, active_units
FROM workstations;

-- 3. AI evaluates subcontracting options (external lead days vs internal overtime)
SELECT option_code, option_name, unit_cost_per_set, lead_days
FROM subcontracting_options;
```

**Note:** The agent is **read-only** (SELECT/PRAGMA only) — it never mutates the PMS. Registering the work order and allocating stock ("WO-2026-EXP01" for 100 sets, deducting 62.22 m3 from inventory) is the manager's next step, executed in the PMS after the AI recommendation is approved.

---

## 5. Conclusion

By placing the **operational problems of the furniture industry as the primary focus**, the AI Consultant is introduced naturally rather than being forced into the narrative. The AI serves as a real solution to the complex calculations of timber yield, carpentry bottleneck detection, and sub-contracting versus overtime decisions for mid-sized manufacturers.
