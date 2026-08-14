# AI Governance — ColdTrack AI

**Versi:** 1.0 · **Tanggal:** 14 Agustus 2026 · **Penanggung jawab:** R4 bersama R1

Dokumen ini merangkum bagaimana keluaran model ColdTrack AI boleh dan tidak boleh dipakai dalam
operasi rantai dingin. Detail teknis lengkap (metrik, ablation, keterbatasan per-metrik) ada di
`docs/model_card.md`; dokumen ini berfokus pada implikasi operasional dan tata kelolanya.

---

## Scope

Model AI terlibat dalam tiga keluaran yang ditampilkan ke operator lewat `POST /api/v1/analyze`:

1. **Forecast suhu** (t+15/30/60 menit) — model GRU.
2. **Klasifikasi mode kegagalan** (7 kelas, termasuk "sehat") dan skor keyakinannya — model GRU yang sama.
3. **Time-to-Breach (TTB)** — model XGBoost terpisah, memprediksi menit tersisa sebelum suhu
   melewati ambang kargo.

Di luar cakupan model AI: **status akhir** (AMAN/WASPADA/KRITIS) dan **rekomendasi tindakan**
dihasilkan oleh rule engine deterministik (`backend/app/rules.py`) yang mengombinasikan keluaran
model dengan ambang suhu statis per profil kargo (`backend/config.yaml`). Rule engine ini yang
memutuskan, bukan model — pemisahan ini disengaja, lihat bagian *Human Oversight*.

---

## Human Oversight

- **Model bukan pengambil keputusan otomatis.** Keluarannya adalah masukan bagi rule engine dan,
  pada akhirnya, bagi operator manusia. Tidak ada aksi otomatis (mis. menghentikan kendaraan,
  mengubah rute) yang dipicu langsung oleh prediksi model.
- **Override selalu tersedia di sisi manusia.** Tiga langkah tindakan yang ditampilkan bersifat
  rekomendasi berprioritas, bukan perintah; operator/pengemudi memutuskan eksekusinya di lapangan.
- **Batas kepercayaan ditampilkan, bukan disembunyikan.** Skor keyakinan mode kegagalan dan
  keterbatasan horizon TTB ditampilkan apa adanya di antarmuka (lihat *Product implications* di
  bawah) sehingga operator tahu kapan harus lebih skeptis terhadap angka yang mereka lihat.
- **Model bersifat statis selama demo/kompetisi** sesuai ketentuan lomba — tidak belajar dari data
  baru saat berjalan. Pembaruan bobot menuntut pelatihan ulang dan verifikasi ulang secara eksplisit
  oleh R1/R2, bukan pembelajaran daring.

---

## Risk & Failure Modes

Ringkasan dari `docs/model_card.md` bagian *Limitations*, disusun ulang dari sudut pandang risiko:

| Risiko | Konsekuensi | Mitigasi produk |
|---|---|---|
| **TTB dipakai sebagai hitung mundur jarak jauh** | MAE melonjak ke 52 menit di luar horizon 30 menit — angka presisi yang menyesatkan | Frontend menyembunyikan angka TTB spesifik bila > 30 menit (`ttb_display_cap_min` di `backend/config.yaml`); hanya status risiko kualitatif yang ditampilkan |
| **TTB ditampilkan saat kondisi sehat (A0)** | Model tetap mengeluarkan angka (median 17 menit) meski tidak bermakna untuk jendela sehat | Angka TTB **wajib** disembunyikan bila diagnosis menunjuk kelas sehat — diberlakukan di frontend berdasarkan `status === "AMAN"` |
| **Degradasi bertahap (kompresor melemah/kebocoran refrigeran) tidak terdeteksi** | Recall hanya 10,6% — mode kegagalan paling berbahaya karena juga luput dari pengamatan manusia | Sistem **tidak boleh dipromosikan** sebagai pendeteksi andal untuk mode ini; disebutkan eksplisit sebagai keterbatasan, bukan disembunyikan |
| **False negative vs false positive** | Alarm palsu merugikan waktu operator; kegagalan yang tidak terdeteksi berarti muatan (berpotensi vaksin) rusak sampai ke penerima | Ambang keputusan rule engine condong ke sisi waspada; sistem **tidak boleh jadi satu-satunya lapis pengaman** — pencatatan suhu manual/resmi tetap berjalan paralel |
| **Model dilatih 100% pada data sintetik** | Belum tervalidasi terhadap telemetri truk berpendingin sungguhan | Wajib dinyatakan sebagai keterbatasan di setiap materi publik (proposal, video); uji lapangan adalah langkah wajib sebelum penggunaan operasional, bukan opsional |

**Prinsip umum:** false negative (kegagalan yang lolos) dinilai lebih berat daripada false positive
(alarm palsu) karena konsekuensinya menyentuh keselamatan produk, bukan hanya efisiensi operasional.

---

## Monitoring

Cakupan MVP kompetisi ini adalah **inferensi sinkron tanpa database dan tanpa job latar belakang**
(lihat batasan MVP di `role/context-r4-frontend.md`), sehingga belum ada pipeline monitoring
produksi yang berjalan otomatis. Yang tersedia sampai saat ini:

- **Evaluasi offline terdokumentasi:** metrik lengkap, confusion matrix, dan ablation study di
  `ml/reports/` dan `docs/model_card.md`, dihasilkan dari split test yang tidak pernah dipakai
  untuk keputusan pengembangan.
- **Versi model tercatat** di setiap respons API (`model_version`), termasuk penanda ketika sistem
  jatuh ke `coldtrack-rule-v1.0` (fallback heuristik saat ONNX gagal dimuat) — perbedaan ini terlihat
  oleh operator, tidak disembunyikan sebagai kegagalan senyap.
- **Belum ada:** pemantauan drift data di produksi, alerting otomatis atas penurunan akurasi, atau
  logging keputusan jangka panjang — karena database dan background job eksplisit di luar cakupan
  MVP dan menjadi tanggung jawab R3 di fase pascakompetisi bila dilanjutkan.

**Rencana pascakompetisi (bukan cakupan submission ini):** logging prediksi vs. kejadian aktual per
perjalanan, dashboard drift bulanan, dan jadwal evaluasi ulang setiap penambahan data lapangan baru.

---

## Compliance & Fairness Notes

- **Konteks regulasi keamanan pangan/farmasi:** ambang suhu per profil kargo di
  `backend/config.yaml` dikalibrasi mengacu pada standar suhu resmi (WHO, BPOM No. 6/2020, Codex
  Alimentarius, SNI) sebagaimana dicatat di `docs/dataset_card.md`. Sistem membantu deteksi dini,
  **bukan pengganti** pencatatan suhu resmi yang disyaratkan CDOB/HACCP.
- **Bukan sertifikat kepatuhan.** Output ColdTrack AI tidak dimaksudkan untuk dilampirkan sebagai
  bukti kepatuhan regulasi tanpa verifikasi manusia — ditegaskan juga di `docs/model_card.md`
  bagian *Intended Use*.
- **Fairness dalam konteks ini** lebih relevan sebagai **kesetaraan performa lintas mode kegagalan**
  daripada lintas kelompok demografis (sistem tidak memproses data personal). Tabel recall per kelas
  di `docs/model_card.md` menunjukkan ketimpangan performa yang signifikan (10,6%–100%) — ketimpangan
  ini didokumentasikan secara terbuka, bukan dirata-ratakan ke satu angka akurasi keseluruhan yang
  bisa menyembunyikan kelemahan pada kelas berisiko tinggi.
- **Data sintetik, bukan data pelanggan nyata.** Seluruh data pelatihan berasal dari simulator
  (`docs/dataset_card.md`), sehingga tidak ada isu privasi data pengiriman aktual pada fase model
  ini. Pertimbangan privasi baru relevan saat sistem terhubung ke telemetri armada sungguhan pada
  fase pascakompetisi.
