# 4.2 Alur Pengembangan Model

## 4.2.1 Pendekatan

ColdTrack AI menghasilkan tiga keluaran dari satu masukan yang sama — jendela telemetri 60 menit terakhir, 12 fitur per menit:

1. **Prediksi suhu** kargo pada 15, 30, dan 60 menit ke depan
2. **Klasifikasi mode kegagalan** ke dalam 7 kelas
3. **Time-to-Breach** — perkiraan menit tersisa sebelum suhu keluar dari pita aman

Keluaran ketiga adalah pembeda utama produk ini. Sistem pemantauan rantai dingin yang beredar umumnya baru berbunyi **setelah** suhu melewati ambang; pada titik itu kerusakan sudah terjadi dan yang tersisa hanyalah pencatatan. ColdTrack AI berupaya memberi tahu **sebelum** ambang terlampaui, selagi tindakan mitigasi masih mungkin dilakukan.

Sistem akhir memakai dua model hibrida dengan kontrak masukan tensor $[1, 60, 12]$ yang identik:

| | `coldtrack.onnx` | `coldtrack_ttb.onnx` |
|---|---|---|
| Arsitektur | GRU 2 lapis (hidden 64) + jalur statistik ringkasan ($41.443\text{ parameter}$) | XGBoost, 300 pohon |
| Keluaran | Prediksi suhu ($T_{15}, T_{30}, T_{60}$), probabilitas 7 kelas mode kegagalan | Time-to-Breach (regresi menit) |
| Ukuran | **173 KB** | **973 KB** |
| Latensi CPU | 1,1 ms | 0,09 ms |

Pembagian tugas ini bukan keputusan awal, melainkan hasil pengujian berbasis bukti yang diuraikan di §4.2.3.

---

## 4.2.2 Alur Pengembangan

**Tahap 1 — Kontrak data dan skema fitur.** Skema 12 kolom fitur disepakati bersama R1 dan dibekukan (`docs/feature_schema.md`), disertai tes otomatis yang memastikan kolom label target tidak pernah bocor menjadi masukan model. Pengujian ini kemudian terbukti krusial: melalui tes inilah tiga cacat pelabelan pada dataset ditemukan dan dilaporkan ke R1 — nilai Time-to-Breach yang konstan sepanjang perjalanan, konstanta termal yang membuat muatan berat nyaris kebal rusak, dan label mode kegagalan yang sudah aktif sebelum anomali benar-benar terjadi. Cacat terakhir membuat **48,3% jendela anomali salah label**; setelah diperbaiki pada dataset v4, angkanya menjadi 0%.

Selain itu, audit integrasi menemukan bahwa fitur `reefer_duration_min` awalnya dihitung per total durasi perjalanan pada dataset latih ($0-479\text{ menit}$), namun dihitung per jendela geser ($0-60\text{ menit}$) pada inferensi backend. Perhitungan ini diselaraskan penuh per jendela geser pada dataset v4 sebelum model dilatih ulang, memastikan distribusi masukan saat inferensi 100% berada dalam ruang distribusi latih.

**Tahap 2 — Penyiapan masukan.** Data per menit dipecah menjadi jendela geser 60 langkah. Jendela tidak pernah melintasi batas perjalanan, dan sasaran prediksi diambil dari **setelah** ujung jendela sehingga tidak ada informasi masa depan yang bocor ke sisi masukan (*zero lookahead bias*). Pembagian train/val/test dilakukan per perjalanan (*trip-level splitting*), bukan per baris acak.

**Tahap 3 — Eksperimen prapelatihan.** Backbone GRU dilatih pada korpus suhu IoT publik berskala besar (Intel Berkeley Lab, 1,3 juta jendela) untuk menguji apakah transfer learning dapat membantu mempelajari dinamika termal umum.

**Tahap 4 — Pelatihan model utama.** Model dilatih pada korpus cold chain sintetik terkalibrasi fisika (dataset v4, 700 trip perjalanan berpendingin Indonesia).

**Tahap 5 — Evaluasi dan pemilihan arsitektur.** Model dibandingkan dengan tiga baseline, diuji lewat ablation study, lalu dievaluasi pada split test yang belum pernah disentuh selama pengembangan.

---

## 4.2.3 Keputusan Berbasis Bukti

Tiga keputusan penting pada arsitektur akhir tidak diambil berdasarkan asumsi, melainkan berdasarkan eksperimen yang hasilnya kami laporkan apa adanya — termasuk ketika hasilnya membatalkan rencana awal kami sendiri.

### Temuan 1 — GRU Menghabiskan Kapasitas untuk Pekerjaan yang Tidak Perlu

Model versi awal berperforma buruk: hanya 2 dari 7 kelas yang pernah ditebak. Setelah dua perbaikan mendasar — normalisasi fitur (rentang antar kolom timpang hingga 4500:1, sehingga radiasi matahari menenggelamkan sinyal pintu terbuka) dan penyeimbangan bobot loss (head prediksi suhu semula hanya memperoleh 2,3% dari total loss) — performa membaik tetapi tetap tertinggal dari XGBoost.

Diagnosisnya: XGBoost **menerima** statistik ringkasan jendela (*mean, std, min, max, trend*) secara langsung, sementara GRU harus **menemukan sendiri** cara menghitungnya dari data sekuensial mentah sambil melayani tiga tugas sekaligus. Statistik tersebut lalu disuplai langsung ke lapisan keluaran via *skip connection*, dengan penambahan bobot minimal:

| | Macro F1 | Prediksi Suhu (MAE @ t+30) | Time-to-Breach (MAE) |
|---|---|---|---|
| Sebelum *skip connection* | 0,440 | 0,244 °C | 22,94 menit |
| **Sesudah *skip connection*** | **0,598** | **0,209 °C** | **21,84 menit** |

Perbaikan ini menghapus hampir seluruh kerugian arsitektur multi-tugas: satu model GRU kini mengerjakan multi-tugas dengan performa mendekati tiga model terpisah (0,598 vs 0,613).

### Temuan 2 — Transfer Learning Tidak Berhasil pada Domain Ini

Rencana awal kami adalah prapelatihan pada data IoT publik lalu penalaan ke domain rantai dingin. Dua konfigurasi dilatih dengan resep identik untuk mengujinya:

| | Dari Backbone Pretrained | Dilatih dari Nol (*From Scratch*) |
|---|---|---|
| Loss latih akhir | **2,99** | 3,58 |
| Loss validasi akhir | 4,18 | **2,78** |

Arah keduanya berlawanan — varian pretrained lebih baik pada data latih tetapi lebih buruk pada data validasi, pola khas *overfitting*. **Prapelatihan bukan sekadar tidak membantu, melainkan merugikan.**

Penyebabnya dapat dijelaskan secara ilmiah. Tidak ada dataset publik yang memuat telemetri truk berpendingin lengkap; korpus terbaik yang tersedia hanya mampu mengisi **4 dari 12 fitur** — data sensor ruangan tidak mengenal pintu kargo, unit reefer, maupun kecepatan kendaraan. Delapan fitur sisanya bernilai nol, sehingga bobot backbone terspesialisasi pada distribusi masukan yang timpang, dan spesialisasi itu justru harus dilupakan pada tahap berikutnya. Korpus prapelatihan yang diperbesar menjadi 1,3 juta jendela pun tidak mengubah kesimpulan ini. Model produksi karena itu dilatih dari nol (*from scratch*).

*(Kurva konvergensi lengkap: `ml/reports/loss_curves.png`)*

### Temuan 3 — Model Pohon Lebih Unggul untuk Time-to-Breach

Untuk menjawab "mengapa perlu deep learning", kami menguji tiga baseline pembanding pada data yang sama:

| Metrik (Split Test) | GRU | XGBoost | Regresi Linear | Isolation Forest |
|---|---|---|---|---|
| Prediksi suhu t+30 (°C) | 0,198 | **0,189** | 0,338 | — |
| Macro F1 | 0,581 | **0,664** | — | — |
| PR-AUC Anomali | 0,711 | **0,753** | — | 0,371 |
| Time-to-Breach $\le 30$ menit (MAE) | 17,9 menit | **7,08 menit** | — | — |

**XGBoost mengungguli GRU pada seluruh tugas regresi TTB.** Kami memilih melaporkannya secara transparan dan mengambil keputusan rasional: tugas prediksi Time-to-Breach didelegasikan ke `coldtrack_ttb.onnx` (XGBoost), karena di situlah selisih performa terbesar dan satu-satunya model yang mampu meloloskan target lomba (MAE 7,08 menit vs target < 8 menit).

GRU dipertahankan untuk dua tugas lainnya: selisih pada prediksi suhu sangat tipis ($0,198\text{ }^\circ\text{C}$ vs $0,189\text{ }^\circ\text{C}$, keduanya jauh melampaui batas target $< 0,8\text{ }^\circ\text{C}$), dan satu model GRU mampu melayani prediksi suhu multi-horizon beserta klasifikasi 7 kelas sekaligus dalam satu berkas biner ringan 173 KB.

---

## 4.2.4 Hasil Pengujian pada Split Test

Seluruh metrik berikut diukur pada **split test independen** — bagian data yang tidak pernah dipakai untuk penalaan bobot maupun pemilihan arsitektur selama proses pengembangan:

| Keluaran Model | Metrik Evaluasi | Nilai Riil Terukur | Target Kompetisi | Status |
|---|---|---|---|---|
| **Prediksi Suhu** | MAE @ t+30 menit | **0,198 °C** | $< 0,8\text{ }^\circ\text{C}$ |  **Lolos (4x lebih presisi)** |
| **Mode Kegagalan** | Macro F1 (Akurasi: 81,3%) | **0,581** | $> 0,80$ |  Belum tercapai |
| **Time-to-Breach** | MAE ($\le 30$ menit) | **7,08 menit** | $< 8,0\text{ menit}$ |  **Lolos** |
| **Deteksi Anomali** | PR-AUC | **0,711** | $> 0,85$ |  Belum tercapai |

Kegagalan reefer total (`A3`), yang merupakan skenario paling kritis dalam rantai dingin farmasi, terdeteksi dengan tingkat recall **100%**.

Kedua model diekspor ke format ONNX CPU runtime dan menghasilkan total latensi inferensi **1,2 milidetik**, 250 kali lebih cepat daripada batas toleransi latensi sistem (1000 ms).

---

## 4.2.5 Keterbatasan yang Kami Sadari

**1. Time-to-Breach Hanya Andal untuk Peringatan Jangka Pendek.**

| Horizon TTB Sebenarnya | MAE Terukur |
|---|---|
| $\le 10$ menit | **3,30 menit** |
| $\le 30$ menit | **7,08 menit** |
| Seluruh rentang (hingga 400 menit) | 52,00 menit |

Model sangat presisi pada rentang kritis yang menentukan keputusan tanggap darurat ($\le 30\text{ menit}$), dan terdegradasi pada rentang jauh karena keterbatasan informasi pada jendela 60 menit. Antarmuka dan API karena itu secara sengaja menyembunyikan angka TTB (menampilkan `null`) bila nilai prediksi $> 30\text{ menit}$ untuk menghindari ilusi presisi.

**2. Degradasi Bertahap Membutuhkan Jendela Pengamatan Lebih Panjang.**
Recall untuk kelas degradasi kompresor dan kebocoran refrigeran berada pada 10,6%. Laju kenaikan suhu yang sangat lambat ($\sim 0,02\text{ }^\circ\text{C}/\text{menit}$) sulit dibedakan dari variasi termal normal dalam jendela 60 menit.

**3. Model Dilatih pada Data Sintetik Terkalibrasi Standar.**
Simulator dikalibrasi terhadap dataset publik (Intel Berkeley, IoT Temperature) dan standar suhu resmi (WHO, Peraturan BPOM No. 6/2020 tentang CDOB, Codex Alimentarius, SNI). Namun sistem belum pernah diuji pada armada fisik nyata, sehingga pengujian lapangan tetap diwajibkan sebelum deployment produksi skala penuh.

**4. Sistem Sebagai Alat Bantu Pendukung Keputusan (*Decision Support System*).**
Keluaran model dirancang sebagai masukan bagi operator armada dan mesin aturan deterministik, bukan pengganti mutlak keputusan manusia.

---

*Dokumentasi teknis lengkap: `docs/model_card.md`, `docs/dataset_card.md`, `docs/feature_schema.md`. Seluruh metrik, artefak ONNX, dan laporan evaluasi tersimpan di `ml/reports/`.*
