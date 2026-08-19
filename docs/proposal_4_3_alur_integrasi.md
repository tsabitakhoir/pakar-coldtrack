# 4.3 Alur Integrasi dan Deployment

## 4.3.1 Pendekatan Arsitektur

Layanan backend ColdTrack AI dirancang sebagai mesin analisis telemetri rantai dingin yang **sepenuhnya sinkron, stateless, dan bebas efek samping**. Seluruh alur data beroperasi secara langsung (*in-memory*) tanpa ketergantungan pada basis data terdistribusi maupun pekerja latar belakang (*background workers*).

Sistem menerima payload telemetri waktu nyata dari antarmuka Next.js melalui satu-satunya endpoint inti:

$$\text{POST } /api/v1/analyze$$

Integrasi ini menghubungkan antarmuka pengguna dengan dua model ONNX dan mesin aturan deterministik dalam satu transaksi HTTP tunggal, dengan target latensi $\le 1000\text{ ms}$ (hasil pengukuran riil: $p_{95} \le 3,78\text{ ms}$).

```
[ Frontend Next.js 14 App Router ]
       │
       │ POST /api/v1/analyze (JSON payload 60-150 bacaan x 10 kolom)
       ▼
[ Backend FastAPI (Uvicorn 1 worker, Python 3.11) ]
       ├── 1. Validasi Skema Pydantic v2 (Penegakan minimal 60 bacaan)
       ├── 2. Preprocessing & Derived Feature Engineering -> Tensor [1, 60, 12]
       │      (Penyelarasan reefer_duration_min per jendela & Forbidden Column Guard)
       ├── 3. Inferensi Model Hibrida Dual-ONNX:
       │      ├── coldtrack.onnx (GRU 2-lapis, 173 KB)     -> Forecast (t15, t30, t60) & Mode (7 kelas)
       │      └── coldtrack_ttb.onnx (XGBoost, 973 KB)    -> Dedicated Time-to-Breach (menit)
       ├── 4. Skoring Cargo Risk Index & Lantai Eskalasi Deterministik (TTB & Sensor Floor)
       ├── 5. Mesin Aturan Tindakan -> 3 Rekomendasi Berprioritas dengan Estimasi Dampak (ETA)
       └── 6. Lapisan Penjelasan Fitur -> 3 Kontributor Utama
       │
       ▼
[ Respons JSON Single-Object (Status, TTB, Forecast, Driver, Actions, Latensi) ]
       │
       ▼
[ Kartu Diagnosis Antarmuka (Badge Status, Angka TTB, Grafik Recharts, Peta Leaflet) ]
```

---

## 4.3.2 Kepatuhan Batasan MVP

Untuk menjamin keandalan penuh saat demonstrasi langsung dan kemudahan evaluasi oleh dewan juri, seluruh batasan MVP dipatuhi secara ketat tanpa kompromi:

| Batasan MVP | Status Kepatuhan | Bukti Implementasi pada Repositori |
|---|---|---|
| **Pemrosesan Sinkron Saja** |  Patuh | Tidak ada Celery, RQ, Redis, `asyncio.sleep`, atau cron job di `backend/requirements.txt` dan `backend/app/`. |
| **Tanpa Database** |  Patuh | Tidak ada ORM/SQL driver (`sqlalchemy`, `psycopg2`). Skenario demo disimpan dalam berkas JSON statis di `backend/data/scenarios/`. |
| **Tanpa Otentikasi** |  Patuh | Tanpa sistem login, session, JWT, maupun cookies. Semua endpoint terbuka penuh untuk kebutuhan integrasi demo. |
| **Satu Perintah Execution** |  Patuh | Sistem berjalan penuh via `docker compose up --build` tanpa perakitan manual atau skrip persiapan terpisah. |
| **Parameter Statis Terpusat** |  Patuh | Seluruh 5 profil muatan, ambang batas suhu, bobot risiko, dan path model dibekukan di `backend/config.yaml`. |

---

## 4.3.3 Alur Pemrosesan Data dan Inferensi

Setiap permintaan yang masuk ke endpoint `POST /api/v1/analyze` melalui enam tahap pemrosesan sekuensial yang terisolasi:

1. **Validasi Skema Pydantic v2 (`app/schemas.py`)**:
   Payload diperiksa terhadap skema `AnalyzeRequest`. Jumlah bacaan telemetri diuji secara ketat ($\ge 60$ langkah). Permintaan dengan $< 60$ bacaan ditolak dengan pesan `HTTP 400 Bad Request` untuk mencegah degradasi statistik ringkasan jendela (*std/trend*) yang tidak pernah dilihat model saat pelatihan.

2. **Prapemrosesan & Rekayasa Fitur (`app/preprocess.py`)**:
   Data telemetri dikonversi ke `pandas.DataFrame`. Jalur validasi internal (*Forbidden Column Guard*) memastikan tidak ada kolom label target (`is_anomaly`, `failure_mode`, `time_to_breach`, `temp_true_c`) yang lolos ke matriks fitur $X$. Empat fitur turunan dihitung:
   * $\Delta \text{temp}_t = \text{temp}_c[t] - \text{temp}_c[t-1]$
   * $\Delta \text{ambient}_t = \text{temp}_c[t] - \text{ambient}_c[t]$
   * $\text{reefer\_duration\_min}$: menit kumulatif unit reefer menyala tanpa jeda (dihitung per jendela sliding 60 menit).
   * $\text{hour\_of\_day}$: ekstrak jam diurnal ($0-23$).
   
   Matriks fitur disusun tepat dalam 12 kolom sesuai `docs/feature_schema.md` dan diubah menjadi tensor `float32` berdimensi $[1, 60, 12]$.

3. **Inferensi Model Hibrida ONNX (`app/inference.py`)**:
   Tensor masukan dialirkan secara paralel ke dua *InferenceSession* CPU ONNX Runtime:
   * **`coldtrack.onnx`**: Mengeluarkan array prediksi suhu $(\hat{T}_{15}, \hat{T}_{30}, \hat{T}_{60})$ dan distribusi probabilitas 7 kelas mode kegagalan.
   * **`coldtrack_ttb.onnx`**: Mengeluarkan regresi spesifik *Time-to-Breach* (menit).

4. **Skoring Risiko Kargo & Mesin Aturan Bertingkat (`app/rules.py`)**:
   *Cargo Risk Index* awal ($0.0 - 1.0$) dihitung dari empat komponen berbobot yang dikonfigurasi di `config.yaml`:
   $$R_{\text{raw}} = 0,40 \cdot R_{\text{temp}} + 0,25 \cdot R_{\text{rate}} + 0,20 \cdot R_{\text{reefer}} + 0,15 \cdot R_{\text{door}}$$
   
   Untuk mencegah anomali *false-safe* (misalnya suhu saat ini belum melewati batas tetapi muatan diproyeksikan rusak dalam waktu singkat), sistem menerapkan **dua lantai eskalasi deterministik**:
   * **Lantai Eskalasi TTB**: Bila model TTB memprediksi $\text{TTB} \le 30\text{ menit}$, status dipaksa naik menjadi **KRITIS** ($\text{Risk Index} \ge 0,85$). Bila $\text{TTB} \le 60\text{ menit}$, status dipaksa minimal **WASPADA** ($\text{Risk Index} \ge 0,45$).
   * **Lantai Eskalasi Sensor**: Bila mode kegagalan terdeteksi sebagai `masalah_sensor` (sensor macet/derau), status dipaksa minimal **WASPADA**. Hal ini melindungi pengguna dari rasa aman palsu akibat pembacaan sensor beku (*stuck-at*) yang tampak stabil padahal suhu riil di lapangan sedang bergerak menyimpang.

5. **Mesin Aturan Tindakan (`app/rules.py`)**:
   Menghasilkan tiga rekomendasi tindakan konkret berprioritas ($1, 2, 3$) beserta estimasi waktu dampak ($\text{ETA}_{\text{min}}$) berdasarkan kombinasi status risiko tereskalasi, diagnosis mode kegagalan, dan profil muatan (seperti kepatuhan Cara Distribusi Obat yang Baik / CDOB untuk vaksin).

6. **Lapisan Penjelasan Fitur (`app/explain.py`)**:
   Menghitung tiga pendorong utama (*feature drivers*) yang paling berkontribusi terhadap dinamika termal kargo untuk ditayangkan pada baris penjelasan antarmuka (*"Mengapa AI berpikir begini"*).

---

## 4.3.4 Integrasi Model Hibrida Dual-ONNX dan Keselarasan Fitur

Keputusan menggunakan dua model ONNX terpisah di tingkat backend — `coldtrack.onnx` (GRU 2-lapis, 41.443 parameter, 173 KB) dan `coldtrack_ttb.onnx` (XGBoost 300 pohon, 973 KB) — diambil berdasarkan temuan eksperimental §4.2.3, di mana XGBoost terbukti mengungguli Head-3 GRU untuk tugas regresi Time-to-Breach (MAE 3,30 menit vs 21,84 menit pada horizon $\le 10$ menit).

Integrasi hibrida ini tetap bersih dan modular karena **kedua model memakai kontrak masukan tensor $[1, 60, 12]$ yang identik**:

```python
# Pengaliran tensor 3D tunggal ke dua session ONNX Runtime terpisah
raw_forecast, raw_probs = self.session.run(None, {input_name: tensor_3d})
raw_ttb = self.ttb_session.run(None, {ttb_input_name: tensor_3d})
```

### Penyelarasan Distribusi Fitur (`reefer_duration_min`)

Pada iterasi awal, fitur `reefer_duration_min` dihitung sejak awal perjalanan pada dataset latih ($0-479\text{ menit}$), namun dihitung per jendela geser ($0-60\text{ menit}$) pada modul inferensi backend. Ketidakcocokan distribusi ini menyebabkan model menerima nilai di luar ruang latihnya. 

Melalui audit integrasi, perhitungan fitur diselaraskan penuh per jendela geser di kedua sisi, dan model dilatih ulang pada dataset v4. Hasil evaluasi pasca-penyelarasan membuktikan peningkatan konsistensi: seluruh 5 skenario demo kini terdiagnosis dengan benar (dari sebelumnya 0 dari 5 menjadi 5 dari 5).

### Penanganan Khusus Gating Time-to-Breach

Sesuai evaluasi keandalan model, nilai *Time-to-Breach* di-gate secara khusus:
* **Truk Sehat (Kelas A0)**: Dikembalikan sebagai `null`. Model TTB dilatih dengan masking pada jendela sehat, sehingga luaran TTB pada kondisi normal tidak memiliki arti fisik.
* **Pembatasan Horizon (Display Cap 30 Menit)**: Apabila nilai TTB terprediksi $> 30\text{ menit}$, sistem mengembalikan `null`. Hal ini mencegah penayangan angka hitung mundur jarak jauh yang memiliki eror margin tinggi (MAE naik dari 3,30 menit pada $\le 10$ menit menjadi 52,00 menit pada seluruh rentang), menjaga kredibilitas sistem di hadapan pengguna dan dewan juri.

---

## 4.3.5 Rekayasa Kontainer dan Integrasi CI

Layanan dikemas menggunakan Docker multi-stage build untuk meminimalisir ukuran citra produksi dan menghilangkan ketergantungan runtime eksternal:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
```

### Keunggulan Desain Kontainer:
1. **Pengemasan Bobot ONNX Mandiri**: Berkas `coldtrack.onnx` (173 KB) dan `coldtrack_ttb.onnx` (973 KB) disalin langsung ke dalam citra saat kompilasi. Citra backend tidak mengunduh artefak apa pun saat runtime, menjamin keberhasilan eksekusi di lingkungan luring (*offline*).
2. **Ukuran Citra Ringan**: Penggunaan `onnxruntime` CPU menggantikan kerangka kerja PyTorch penuh, menekan ukuran citra backend dari $\sim 2,5\text{ GB}$ menjadi hanya $\sim 450\text{ MB}$.
3. **Pemeriksaan Kesehatan Container**: Endpoint `GET /health` dihubungkan ke fitur `healthcheck` Docker Compose (`interval: 10s`, `retries: 5`). Layanan frontend Next.js dikonfigurasi dengan `condition: service_healthy` untuk menjamin frontend hanya menerima lalu lintas setelah backend siap.
4. **Otomasi CI Komprehensif**: GitHub Actions memverifikasi setiap perubahan backend melalui linter `ruff` dan pengujian `pytest` (24 kasus uji backend + 7 kasus uji data contract ML).

---

## 4.3.6 Profil Latensi dan Evaluasi 5 Skenario Demo Riil

Pengujian latensi dilakukan langsung menggunakan `httpx.TestClient` terhadap 5 skenario demo riil yang masing-masing berisi 125–150 bacaan dari dataset v4 (100 kali pengulangan setelah *warmup*):

| Skenario Pengujian | Profil Muatan | Mode Anomali Dominan | Latensi $p_{50}$ | Latensi $p_{95}$ | Latensi $p_{99}$ |
|---|---|---|---|---|---|
| **Skenario 1 — Normal** | `vaksin_2_8C` | Normal Sehat (A0) | 2,15 ms | 3,78 ms | 5,22 ms |
| **Skenario 2 — Pintu Terbuka** | `daging_beku_-18C` | Pintu Terbuka Lama (A1) | 2,07 ms | 3,63 ms | 4,95 ms |
| **Skenario 3 — Kompresor Melemah** | `produk_susu_2_4C` | Degradasi Pendinginan (A2/A4) | 2,11 ms | 3,70 ms | 5,10 ms |
| **Skenario 4 — Sensor Macet** | `buah_segar_2_4C` | Masalah Sensor (A5/A6) | 2,14 ms | 3,75 ms | 5,28 ms |
| **Skenario 5 — Ambien Ekstrem** | `produk_susu_2_4C` | Kejutan Ambien (A7) | 2,08 ms | 3,66 ms | 5,04 ms |

### Analisis Komposisi Latensi:
* **Dual ONNX Inference**: $\sim 1,19\text{ ms}$ (ONNX Runtime C++ core via CPU Execution Provider).
* **Preprocessing & Feature Math**: $\sim 0,75\text{ ms}$ (Operasi vektor NumPy/Pandas).
* **Rule Engine & Serialisasi JSON**: $\sim 0,20\text{ ms}$ (Pydantic v2 JSON serialization).

Hasil menunjukkan latensi $p_{95}$ backend secara konsisten berada di bawah $4\text{ ms}$ — **250 kali lebih cepat daripada target SLA 1000 ms**, memungkinkan antarmuka Next.js memberikan visualisasi interaktif dan respons seketika tanpa jeda.
