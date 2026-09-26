"""Integration check: drive the real dashboard in a browser, against the real backend.

Question it answers: does what the USER SEES (status, countdown, errors) match what the API
returns for the same data, and does the UI survive bad input and a failing server?

Needs (not in backend/requirements.txt): `pip install playwright` and a Chrome/Chromium binary.
Prerequisites: backend on --api (default :8000) and the frontend built with NEXT_PUBLIC_API_URL
pointing at it, served on --ui (default :3000).

Usage: python -m eval.ui_check [--ui http://localhost:3000] [--api http://localhost:8000]
                               [--chrome /usr/bin/google-chrome] [--tag final]
Output: eval/results/integration_<tag>.json and eval/results/integration_<tag>_ui.png
"""

import argparse
import csv
import datetime as dt
import json
import math
import re
import tempfile
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

from eval.common import ROOT

SCENARIOS = [  # dropdown label -> backend scenario id (frontend/src/lib/scenarios.ts)
    ("A0 – Aman", "scenario_1_normal"),
    ("A-1 – Pintu Terbuka", "scenario_2_door_open"),
    ("A-2 – Kejut Ambient", "scenario_5_extreme_ambient"),
    ("A-3 – Sensor Macet", "scenario_4_sensor_stuck"),
]
STATUS_RE = re.compile(r"\b(AMAN|WASPADA|KRITIS)\b")


def get_json(url):
    with urllib.request.urlopen(url, timeout=20) as r:
        return json.load(r)


def post_json(url, body):
    req = urllib.request.Request(url, json.dumps(body).encode(), {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def api_result(api, scenario_id, mass=1000):
    """What the frontend sends for a scenario: its readings, the scenario's cargo profile, mass 1000 kg."""
    sc = get_json(f"{api}/api/v1/scenarios/{scenario_id}")
    res = post_json(f"{api}/api/v1/analyze", {
        "shipment_id": "TRK-JKT-0417", "cargo_profile": sc["cargo_profile"], "mass_kg": mass, "readings": sc["readings"]})
    return sc, res


def write_csv(path, n, temp0=4.0, slope=0.04, columns=("ts", "temp_c", "ambient_c", "door_open")):
    t0 = dt.datetime(2026, 9, 26, 8, 0)
    rows = [columns]
    for i in range(n):
        vals = {"ts": (t0 + dt.timedelta(minutes=i)).isoformat(), "temp_c": round(temp0 + slope * i + 0.1 * math.sin(i), 2),
                "ambient_c": 32, "door_open": "true" if i >= n - 20 else "false"}
        rows.append(tuple(vals.get(c, 1) for c in columns))
    csv.writer(open(path, "w", newline="")).writerows(rows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ui", default="http://localhost:3000")
    ap.add_argument("--api", default="http://localhost:8000")
    ap.add_argument("--chrome", default="/usr/bin/google-chrome")
    ap.add_argument("--tag", default="final")
    a = ap.parse_args()

    tmp = Path(tempfile.mkdtemp())
    out = {"tag": a.tag, "ui": a.ui, "api": a.api, "scenarios": [], "csv": {}, "failure_handling": {}, "console_errors": []}  # console_errors: all, incl. the deliberate 500 in section 3

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=a.chrome, args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1500, "height": 900})
        page.on("pageerror", lambda e: out["console_errors"].append(str(e)))
        page.on("console", lambda m: out["console_errors"].append(m.text) if m.type == "error" else None)

        def open_page():
            page.goto(a.ui)
            page.wait_for_selector("text=STATUS KENDARAAN", timeout=15000)

        def ui_status():
            """Big status word in the 'Status kendaraan' card and the action banner headline."""
            card = page.locator("text=STATUS KENDARAAN").locator("xpath=ancestor::div[contains(@class,'card')][1]")
            m = STATUS_RE.search(card.inner_text())
            banner = page.locator("text=TINDAKAN YANG DISARANKAN").first.locator("xpath=..").inner_text()
            return (m.group(1) if m else None), banner

        # ---- 1. the four dropdown scenarios: UI == API, and API == the scenario's declared expectation
        open_page()
        for label, sid in SCENARIOS:
            sc, api = api_result(a.api, sid)
            page.locator("header select").select_option(sid)
            page.wait_for_selector("text=Menganalisis data skenario", timeout=15000)
            page.wait_for_timeout(2200)  # 600 ms debounce + request
            status, banner = ui_status()
            out["scenarios"].append({
                "dropdown": label, "backend_scenario": sid, "expected_status": sc["expected_status"],
                "api_status": api["status"], "ui_status": status, "ui_matches_api": status == api["status"],
                "api_matches_expected": api["status"] == sc["expected_status"],
                "api_countdown_min": api.get("time_to_breach_min"), "api_label": api["failure_mode"]["label"],
                "action_shown": bool(banner.strip()),
            })
            if sid == "scenario_2_door_open":
                page.screenshot(path=str(ROOT / f"eval/results/integration_{a.tag}_ui.png"))

        # ---- 2. CSV import: good file, too-short file, wrong columns
        good, short, bad = tmp / "good.csv", tmp / "short.csv", tmp / "bad.csv"
        write_csv(good, 90)
        write_csv(short, 20)
        bad.write_text("foo,bar\n1,2\n3,4\n")
        open_page()
        page.set_input_files("header input[type=file]", str(good))
        page.wait_for_selector("text=Menganalisis berkas good.csv", timeout=15000)
        page.wait_for_timeout(2200)
        status, _ = ui_status()
        out["csv"]["good_file"] = {"rows": 90, "ui_status": status, "shows_result": status is not None,
                                   "button_shows_filename": "good.csv" in page.locator("header button").inner_text()}
        for name, f in [("too_short_file", short), ("wrong_columns_file", bad)]:
            page.set_input_files("header input[type=file]", str(f))
            page.wait_for_selector("text=Analisis gagal", timeout=8000)
            txt = page.locator("text=Analisis gagal").locator("xpath=..").inner_text().replace("\n", " ")
            out["csv"][name] = {"error_shown": True, "message": txt[:200], "no_stack_trace": "at " not in txt and "Error:" not in txt}

        normal_console_errors = list(out["console_errors"])   # before we inject failures on purpose

        # ---- 3. failing / slow server: the user must see a message, not a blank page or stack trace
        open_page()
        page.route("**/api/v1/analyze", lambda r: r.abort())
        page.locator("input[type=number]").first.fill("1001")   # any edit triggers a new analysis
        page.wait_for_selector("text=Analisis gagal", timeout=8000)
        txt = page.locator("text=Analisis gagal").locator("xpath=..").inner_text().replace("\n", " ")
        out["failure_handling"]["server_unreachable"] = {"message": txt[:200], "has_retry_button": page.locator("text=Coba lagi").count() > 0}
        page.unroute("**/api/v1/analyze")
        page.route("**/api/v1/analyze", lambda r: r.fulfill(status=500, body="boom"))
        page.locator("text=Coba lagi").click()
        page.wait_for_timeout(2000)
        txt = page.locator("text=Analisis gagal").locator("xpath=..").inner_text().replace("\n", " ") if page.locator("text=Analisis gagal").count() else ""
        out["failure_handling"]["server_error_500"] = {"message": txt[:200], "no_raw_body_shown": "boom" not in txt}
        page.unroute("**/api/v1/analyze")
        page.route("**/api/v1/analyze", lambda r: (page.wait_for_timeout(2500), r.continue_()))
        page.locator("input[type=number]").first.fill("1002")
        page.wait_for_timeout(900)
        out["failure_handling"]["slow_server_shows_loading_state"] = page.locator("[aria-busy=true], .animate-pulse, .opacity-60").count() > 0
        page.unroute_all(behavior="ignoreErrors")
        browser.close()

    S = out["scenarios"]
    out["summary"] = {
        "scenarios_ui_matches_api": f"{sum(s['ui_matches_api'] for s in S)}/{len(S)}",
        "scenarios_api_matches_expected": f"{sum(s['api_matches_expected'] for s in S)}/{len(S)}",
        "console_errors_in_normal_use": len(normal_console_errors),
        "csv_and_failure_cases_ok": all([
            out["csv"]["good_file"]["shows_result"], out["csv"]["too_short_file"]["no_stack_trace"],
            out["csv"]["wrong_columns_file"]["no_stack_trace"], out["failure_handling"]["server_unreachable"]["has_retry_button"],
            out["failure_handling"]["server_error_500"]["no_raw_body_shown"], out["failure_handling"]["slow_server_shows_loading_state"]]),
    }
    path = ROOT / f"eval/results/integration_{a.tag}.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(json.dumps(out["summary"], indent=2))
    print("wrote", path)


if __name__ == "__main__":
    main()
