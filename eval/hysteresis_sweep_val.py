"""Sapuan histeresis pembukaan insiden armada (debounce D + tahan pulih H) di split VAL v4. Usulan, TIDAK diterapkan.

  python -m eval.hysteresis_sweep_val            (dari root repo, PYTHONPATH=backend:.)

Status mesin fisika per menit TIDAK diubah (margin sekarang, engine.CFG). Yang disapu adalah lapisan episode
armada (app/fleet/incidents.py), tempat status yang bolak-balik menjadi insiden + notifikasi:
  D (tunda buka)   episode dibuka bila status bukan AMAN bertahan D menit berturut-turut; KRITIS membuka langsung
  H (tahan pulih)  episode ditutup bila AMAN bertahan H menit berturut-turut (sebelum itu dianggap masih episode)

KRITERIA (ditetapkan sebelum hasil dilihat, 2026-10-12):
  usulan = (D, H) dengan episode insiden per jam trip normal TERENDAH yang breach terlewat (peringatan episode
  < 10 menit sebelum breach) TIDAK LEBIH BANYAK dari tanpa histeresis (D=0, H=0); bila seri, D terkecil lalu H
  terkecil. Tidak diterapkan otomatis.

Metrik (menit >= 59 = saat dasbor menampilkan status; trip normal = failure_mode A0 di SEMUA menit):
  episode_per_jam_normal   episode insiden yang dibuka per jam trip normal
  menit_episode_normal     fraksi menit trip normal yang berada di dalam episode terbuka
  breach_terlewat_lead_lt10, lead_median_menit   lead = menit breach - menit episode dibuka (episode yang
                           masih terbuka di menit breach-1); < 10 menit = terlewat
"""

import json
import time
from pathlib import Path

import numpy as np

from app.core import engine
from eval.margin_sweep_val import LEAD_MIN, W, muat_val, siapkan

D_VALS = (0, 3, 5, 10)
H_VALS = (0, 5, 10, 15)
OUT = Path(__file__).resolve().parents[1] / "eval" / "results" / "hysteresis_sweep_val.json"


def episode(status: np.ndarray, d: int, h: int) -> np.ndarray:
    """Boolean per menit: episode insiden terbuka. Menit < W-1 tidak ditampilkan (MENUNGGU_DATA)."""
    n = len(status)
    buka = np.zeros(n, dtype=bool)
    aktif, run_alarm, run_aman = False, 0, 0
    for t in range(n):
        if t < W - 1:
            continue
        alarm, kritis = status[t] != "AMAN", status[t] == "KRITIS"
        run_alarm = run_alarm + 1 if alarm else 0
        run_aman = 0 if alarm else run_aman + 1
        if not aktif and (kritis or (alarm and run_alarm >= max(d, 1))):
            aktif = True
        elif aktif and not alarm and run_aman >= max(h, 1):
            aktif = False
        buka[t] = aktif
    return buka


def nilai(data, statuses, d, h):
    m_normal = ep_normal = menit_ep = 0
    leads = []
    for x, st in zip(data, statuses):
        ep = episode(st, d, h)
        tampil = np.arange(len(st)) >= W - 1
        ok = x["ok"] & tampil
        if x["normal"]:
            m_normal += int(ok.sum())
            menit_ep += int((ep & ok).sum())
            ep_normal += int((ep[1:] & ~ep[:-1]).sum())
        b = x["breach_min"]
        if b is not None and b >= W + LEAD_MIN and b - 1 < len(st):
            lead, t = 0, b - 1
            while t >= W - 1 and ep[t]:
                lead += 1
                t -= 1
            leads.append(lead)
    leads = np.array(leads)
    return {
        "D": d, "H": h,
        "episode_per_jam_normal": ep_normal / (m_normal / 60.0),
        "menit_episode_normal": menit_ep / m_normal,
        "n_trip_breach_dinilai": len(leads),
        "breach_terlewat_lead_lt10": int((leads < LEAD_MIN).sum()),
        "breach_tanpa_peringatan": int((leads == 0).sum()),
        "lead_median_menit": float(np.median(leads)) if len(leads) else None,
    }


def main():
    t0 = time.time()
    data = siapkan(muat_val())
    statuses = [engine.run(x["trip"], x["prod"], x["prod"]["mass_kg"]).status_txt.to_numpy() for x in data]
    hasil = [nilai(data, statuses, d, h) for d in D_VALS for h in H_VALS]
    acuan = next(r for r in hasil if r["D"] == 0 and r["H"] == 0)
    lolos = [r for r in hasil if r["breach_terlewat_lead_lt10"] <= acuan["breach_terlewat_lead_lt10"]]
    usulan = min(lolos, key=lambda r: (round(r["episode_per_jam_normal"], 6), r["D"], r["H"]))
    OUT.write_text(json.dumps({
        "split": "val", "margin_waspada_frac": engine.CFG["margin_waspada_frac"],
        "n_trip_normal": sum(x["normal"] for x in data),
        "kriteria": "episode/jam normal terendah dengan breach_terlewat_lead_lt10 <= (D=0,H=0); seri -> D lalu H terkecil",
        "usulan": {"D": usulan["D"], "H": usulan["H"]}, "diterapkan": False,
        "sapuan": hasil, "durasi_s": round(time.time() - t0, 1),
    }, indent=2), encoding="utf-8")
    for r in hasil:
        print(r["D"], r["H"], round(r["episode_per_jam_normal"], 3), round(r["menit_episode_normal"], 3),
              r["breach_terlewat_lead_lt10"], r["breach_tanpa_peringatan"], "/", r["n_trip_breach_dinilai"],
              r["lead_median_menit"])
    print("usulan", usulan["D"], usulan["H"], "->", OUT)


if __name__ == "__main__":
    main()
