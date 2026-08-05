# Studi Kasus Operasional: Dilema Skalabilitas & Risiko Keterlambatan Ekspor pada Industri Mebel Menengah

## 1. Latar Belakang & Problematika Bisnis

### Profil Pabrik & Situasi Lapangan
*Djati Karya Furniture* adalah industri mebel skala menengah yang memproduksi furnitur kayu jati dan mahoni untuk pasar ekspor. Saat ini pabrik mengoperasikan **Production Management System (PMS)** berbasis database relasional untuk mencatat data bahan baku, Bill of Materials (BOM), kapasitas lini kerja, dan status Work Order (WO).

Pabrik baru saja menerima penawaran pesanan ekspor dari pembeli asal Australia untuk **100 Set Meja Makan Jati (Set Meja + 6 Kursi)** dengan nilai kontrak tinggi. Namun, pesanan ini mensyaratkan **tenggat pengiriman ketat dalam 40 hari**.

```
                           ┌──────────────────────────────────────────────┐
                           │   Peluang Order Ekspor: 100 Set Meja Makan   │
                           │   Tenggat Pengiriman: 40 Hari                │
                           └──────────────────────┬───────────────────────┘
                                                  │
                                                  ▼
                         ┌──────────────────────────────────────────────────┐
                         │       Dilema Utama Pemilik Pabrik (Owner)        │
                         ├──────────────────────────────────────────────────┤
                         │ 1. Apakah stok kayu mentah cukup (setelah limbah)│
                         │ 2. Di mana titik kemacetan (bottleneck) lantai? │
                         │ 3. Bagaimana menghindari penalti keterlambatan?  │
                         └──────────────────────────────────────────────────┘
```

---

### Realita Fizikal Manufaktur Kayu
Pengambilan keputusan pada pesanan ini tidak dapat dilakukan hanya dengan intuisi atau estimasi kasar karena melibatkan batasan operasional yang saling terkait:

1. **Rendemen Kayu (*Wood Yield Recovery Rate*):** Log kayu jati mentah tidak $100\%$ menjadi furnitur. Setelah pembelahan, pembuangan cacat alami (mata kayu, retak), dan pengetetan dimensi, hanya **$45\%$** volume kayu mentah yang menjadi komponen bersih. Sisanya menjadi limbah/afval.
2. **Jeda Pengeringan Oven (*Kiln Drying Lag*):** Log kayu mentah berkadar air tinggi ($\approx 26\%$) wajib melalui siklus pengeringan oven selama 12 hari agar kadar air turun ke standar ekspor ($11\%-12\%$). Pemotongan mesin tidak dapat dilakukan sebelum proses pengeringan selesai.
3. **Kapasitas Pertukangan & Perakitan (*Joinery Bottleneck*):** Perakitan konstruksi purus dan lubang (*mortise & tenon*) membutuhkan jam kerja tukang kayu yang presisi. Stasiun perakitan saat ini beroperasi pada 1 shift dengan keterpakaian tinggi untuk pesanan berjalan.
4. **Risiko & Biaya Keterlambatan:** Memaksa lembur tanpa perhitungan presisi memicu pembengkakan biaya upah 1.5x dan risiko kelelahan kerja. Sebaliknya, terlambat kirim menyebabkan penalti kontrak *demurrage* di pelabuhan.

---

## 2. Struktur Data Produksi (Production Management System)

Untuk mengelola operasional sehari-hari, pabrik mengandalkan skema basis data relasional berikut:

```sql
-- 1. Master Produk
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sku VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    net_volume_m3 DECIMAL(6,3) NOT NULL
);

-- 2. Bill of Materials (BOM) & Standar Jam Kerja
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

-- 3. Stok Bahan Baku & Rendemen
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

-- 4. Stasiun Kerja & Kapasitas Jam Kerja
CREATE TABLE workstations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    station_code VARCHAR(20) UNIQUE NOT NULL,
    station_name VARCHAR(100) NOT NULL,
    active_units INT DEFAULT 1,
    daily_capacity_hours DECIMAL(4,1) NOT NULL,
    current_load_hours DECIMAL(6,1) DEFAULT 0.0
);

-- 5. Status Pesanan Kerja (Work Orders)
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

### Kondisi Data Saat Ini (Initial State)
```sql
INSERT INTO products (id, sku, name, category, net_volume_m3) VALUES
(1, 'SET-DINING-01', 'Set Meja Makan Jati 6 Kursi', 'Dining Set', 0.280);

INSERT INTO product_bom (product_id, component_name, wood_type, net_vol_m3, std_cnc_hours, std_assembly_hours, std_finishing_hours) VALUES
(1, 'Complete Set', 'Jati', 0.280, 3.5, 12.0, 6.0);

INSERT INTO inventory_materials (material_code, material_name, material_type, stock_quantity, unit, moisture_pct, avg_yield_pct) VALUES
('MAT-TEAK-LOG', 'Log Kayu Jati Gelondongan', 'Timber Log', 90.00, 'm3', 26.0, 45.0);

INSERT INTO workstations (station_code, station_name, active_units, daily_capacity_hours, current_load_hours) VALUES
('STN-KILN', 'Oven Pengeringan', 2, 48.0, 40.8),
('STN-CNC', 'Mesin CNC Router', 2, 32.0, 24.9),
('STN-ASSY', 'Perakitan & Pertukangan', 10, 80.0, 70.4),
('STN-FINISH', 'Lini Finishing', 1, 8.0, 4.8);
```

---

## 3. Kompleksitas Analisis & Hambatan Perhitungan Manual

Untuk menjawab apakah pesanan 100 set meja makan dapat diterima, manajer produksi harus melakukan analisis silang yang rumit:

1. **Kalkulasi Kebutuhan Kayu Baku Mentah:**
   - Volume komponen bersih per set = $0.280\text{ m}^3$.
   - Kebutuhan bersih 100 set = $100 \times 0.280 = 28.0\text{ m}^3$.
   - Dengan rendemen kayu jati $45\%$, kebutuhan kayu mentah aktual = $\frac{28.0\text{ m}^3}{0.45} = \mathbf{62.22\text{ m}^3}$.
   - Stok kayu mentah di gudang saat ini adalah $90.00\text{ m}^3$ (Secara volume mencukupi, tetapi butuh pengeringan 12 hari).

2. **Kalkulasi Beban Jam Kerja & Bottleneck:**
   - Kebutuhan perakitan = $100 \text{ unit} \times 12.0 \text{ jam} = \mathbf{1.200 \text{ jam}}$.
   - Kapasitas sisa stasiun perakitan (`STN-ASSY`) setelah terpakai pesanan eksisting = $80.0 - 70.4 = \mathbf{9.6 \text{ jam/hari}}$.
   - Waktu pengerjaan perakitan internal tanpa intervensi = $\frac{1.200 \text{ jam}}{9.6 \text{ jam/hari}} = \mathbf{125 \text{ hari}}$.
   - **Masalah Utama:** Pengerjaan internal murni dipastikan terlambat 85 hari dari batas 40 hari.

3. **Trade-off Keputusan Strategis:**
   - *Opsi 1 (Lembur Internal 2 Shift):* Menambah shift malam untuk perakitan. Namun biaya lembur membengkak dan kapasitas tetap mepet.
   - *Opsi 2 (Sub-kontrak / Subcon Perakitan Mentah):* Mencarter pertukangan mentah ke pengrajin mitra lokal untuk memangkas waktu perakitan internal menjadi 8 hari, sementara pengecatan finishing tetap dilakukan internal untuk menjaga standar mutu.

---

## 4. Solusi Organik: Integrasi AI Operational Consultant

Melihat rumitnya kombinasi variabel (BOM, faktor rendemen, jadwal oven, jam stasiun kerja, dan evaluasi biaya subcon), pemilik pabrik membutuhkan **asisten pembuat keputusan operasional (AI Operational Consultant)** yang dapat langsung terhubung ke database PMS.

### Peran & Alur Kerja AI Consultant dalam Sistem

AI Consultant bertindak sebagai *Co-Pilot Operasional* yang melakukan query data relasional secara dinamis, melakukan simulasi matematik non-linear, dan memberikan rekomendasi berbasis data riil:

```
┌────────────────────────┐      SQL Queries (DML)      ┌────────────────────────┐
│                        ├────────────────────────────►│                        │
│  AI Operational        │                             │  Production Management │
│  Consultant            │◄────────────────────────────┤  System (PMS Database) │
│                        │       Result Sets           │                        │
└───────────┬────────────┘                             └────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Rekomendasi Keputusan Berbasis Data untuk Pemilik Pabrik:              │
│                                                                        │
│  1. Alokasi Bahan: Gunakan 62.22 m3 log jati, jadwalkan oven 12 hari.  │
│  2. Solusi Bottleneck: Gunakan Opsi Subcon Perakitan Mentah (8 Hari).  │
│  3. Kepastian Waktu: Total waktu produksi 36 Hari (Selesai sebelum     │
│     tenggat 40 Hari, dengan buffer aman 4 Hari).                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Contoh Interaksi Query & Simulasi Database oleh AI Agent

Saat diminta menganalisis kelayakan pesanan, AI Consultant secara mandiri menjalankan query DML berikut ke database PMS:

```sql
-- 1. AI memeriksa BOM & Stok Bahan Baku
SELECT p.name, b.net_vol_m3, i.stock_quantity, i.avg_yield_pct
FROM products p
JOIN product_bom b ON p.id = b.product_id
JOIN inventory_materials i ON i.material_code = 'MAT-TEAK-LOG'
WHERE p.sku = 'SET-DINING-01';

-- 2. AI mengeksekusi simulasi pendaftaran WO dan alokasi stok setelah keputusan disetujui
INSERT INTO work_orders (wo_number, client_name, product_id, quantity, due_date, status)
VALUES ('WO-2026-EXP01', 'Australia Living Corp', 1, 100, DATE_ADD(CURRENT_DATE(), INTERVAL 40 DAY), 'IN_PROCESS');

UPDATE inventory_materials
SET stock_quantity = stock_quantity - 62.22
WHERE material_code = 'MAT-TEAK-LOG';
```

---

## 5. Kesimpulan & Nilai Tambah

Dengan menempatkan **problematika operasional industri mebel sebagai fokus utama**, penerapan AI Consultant tidak terasa dipaksakan. AI hadir bukan sebagai gimmick, melainkan sebagai solusi nyata atas rumitnya kalkulasi rendemen kayu, deteksi *bottleneck* kapasitas pertukangan, dan pengambilan keputusan *sub-kontrak vs lembur* bagi manufaktur skala menengah.
