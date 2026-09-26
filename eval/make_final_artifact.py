"""Build the final Evaluation Artifact: Integration, Iteration and Evaluation.

One document for the whole hackathon: baseline -> iteration 1 -> iteration 2 -> integration.
It reads only committed result files, so it can be rebuilt anywhere:

  eval/results/{baseline,iter1,iter2,final}_results.json   (run_eval.py)
  eval/results/sim_v3_{iter1,iter2}.json                    (sim_check.py; dataset_v3 is not in git)
  eval/results/margin_sweep_iter2.json                      (run_eval.py --margin-sweep)
  eval/results/integration_final.json (+ _ui.png)           (ui_check.py)

Usage: python -m eval.make_final_artifact
Output: eval/results/Evaluation_Artifact_Integration_Iteration_Evaluation.pdf
"""

import json
import os
import subprocess
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

RES = Path(__file__).parent / "results"
OUT = RES / "Evaluation_Artifact_Integration_Iteration_Evaluation.pdf"
J = lambda n: json.loads((RES / n).read_text())
pct = lambda x: f"{100 * x:.0f}%"


def git(*a):
    return subprocess.run(["git", *a], capture_output=True, text=True).stdout.strip()


def main():
    B, R1, R2, F = J("baseline_results.json"), J("iter1_results.json"), J("iter2_results.json"), J("final_results.json")
    S1, S2, SW, UI = J("sim_v3_iter1.json"), J("sim_v3_iter2.json"), J("margin_sweep_iter2.json"), J("integration_final.json")

    # ---- the numbers that appear in more than one place --------------------
    def m(R, base=False):
        a, g3 = R["G5_end_to_end_api"], R["G3_imminent_breach"]
        u = a["true_ttb_le30"]
        a0 = a["by_true_mode_status"]["A0"]
        g4 = R["G4_robustness"]
        if base:
            stuck = g4["stuck_sensor_on_imminent_breach"]["pred_masalah_sensor"]
            n03 = g4["sensor_noise_sigma_0.3C"]["imminent_pred_A0_rate"]
            fc = R["G1_forecast"]["mae_t30"]
        else:
            stuck = g4["stuck_sensor_on_imminent_breach"]["flagged_sensor"]
            n03 = g4["sensor_noise_sigma_0.3C"]["imminent_aman_rate"]
            fc = R["G1_forecast"]["mae_t30"]
        return dict(green=u["AMAN"], crit=u["KRITIS"], cd=u["ttb_shown"], healthy=a0["WASPADA"] + a0["KRITIS"],
                    stuck=stuck, n03=n03, fc=fc, p95=a["latency_ms_p95"], nreq=a["n_requests"])

    mb, m1, m2, mf = m(B, True), m(R1), m(R2), m(F)
    assert abs(mf["green"] - m2["green"]) < 1e-9 and abs(mf["healthy"] - m2["healthy"]) < 1e-9  # final == iteration 2 engine

    pt = subprocess.run(["python", "-m", "pytest", "eval/test_baseline.py", "-q", "-p", "no:cacheprovider", "-rA"], capture_output=True,
                        text=True, env={**os.environ, "EVAL_TAG": "final"}).stdout
    checks = [(l.split()[0], l.split()[1].split("::")[1]) for l in pt.splitlines() if l.startswith(("PASSED", "FAILED"))]
    n_pass = sum(c == "PASSED" for c, _ in checks)
    ev = F["G2_events"]["per_event"]
    ui_ok = UI["summary"]
    main_sha = git("rev-parse", "--short", "origin/main")
    same_core = subprocess.run(["git", "diff", "--quiet", "c336a2a", "origin/main", "--", "backend", "ml"]).returncode == 0
    on_main = "origin/main" in git("branch", "-r", "--contains", "8e374a0")
    where = "merged into main" if on_main else "on branch frontend-ui, not yet on main at the time of writing"

    ss = getSampleStyleSheet()
    H1 = ParagraphStyle("h1", parent=ss["Heading1"], fontSize=15, spaceAfter=6)
    H2 = ParagraphStyle("h2", parent=ss["Heading2"], fontSize=11.5, spaceBefore=8, spaceAfter=3)
    Bd = ParagraphStyle("b", parent=ss["BodyText"], fontSize=9, leading=12)
    Sm = ParagraphStyle("s", parent=Bd, fontSize=7.5, leading=9.5, textColor=colors.HexColor("#555555"))
    Cl = ParagraphStyle("c", parent=Bd, fontSize=8, leading=10)
    p = lambda t, st=Bd: Paragraph(t, st)

    def table(rows, widths):
        t = Table([[p(str(c), Cl) for c in r] for r in rows], colWidths=widths, repeatRows=1)
        t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), .4, colors.HexColor("#BBBBBB")), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                               ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8EAF0"))]))
        return t

    img = lambda name, w, h: Image(str(RES / name), width=w * cm, height=h * cm)
    s = []

    # ================= page 1: what / summary =================
    s += [p("ColdTrack AI: Evaluation Artifact", H1),
          p("Integration, Iteration and Evaluation (final)", H2),
          p("AIC COMPFEST 18 Final · Smart Logistics · 26 September 2026 · code version: <b>main @ %s</b> plus the eval suite (%s); dashboard tested at frontend-ui @ %s" % (main_sha, F.get("commit", "?"), UI.get("frontend_commit") or "?"), Sm),
          p("What is this document?", H2),
          p("ColdTrack AI watches the sensors of a refrigerated truck and warns the operator before the cargo gets too warm. "
            "This document is the story of one working day, told with measurements. In the morning we measured the prototype from the qualifying round (the <b>baseline</b>) and "
            "found where it fails. We then rebuilt the core (<b>iteration 1</b>), changed four rules after looking at the new failures (<b>iteration 2</b>), "
            "connected the dashboard to the rebuilt system (<b>integration</b>), and finally tested the whole thing, screen included (<b>evaluation</b>). "
            "Everything below is measured by the test suite in the <font face='Courier'>eval/</font> folder; where we did not measure something, we say so.", Bd),
          p("Key terms", H2),
          table([["Term", "Meaning"],
                 ["Breach", "The cargo temperature goes outside its safe range (for example above 8 °C for vaccines)."],
                 ["Urgent case", "A one-minute snapshot of a truck whose cargo really breaches within 30 minutes. This is when the operator must act."],
                 ["Countdown", "Minutes left before a breach (time-to-breach)."],
                 ["Status", "AMAN = safe (green), WASPADA = warning (amber), KRITIS = critical (red)."],
                 ["Snapshot / trip", "A snapshot is the state of one truck at one minute, with its history. A trip is one whole journey; 106 trips make the main test set."]],
                [3.6 * cm, 12.8 * cm]),
          p("Summary", H2),
          p(f"<b>The most dangerous failure is fixed.</b> When a breach was less than 30 minutes away, the baseline showed green in {pct(mb['green'])} of cases. "
            f"The final system shows green in {pct(m2['green'])}, and the whole dashboard shows the same status as the server in "
            f"{ui_ok['scenarios_ui_matches_api']} demo scenarios (integration check). "
            f"<b>But the fix has costs and several goals are still missed:</b> it passes {n_pass} of {len(checks)} checks (baseline: 8 of 23, an older list). "
            f"The countdown appears in only {pct(m2['cd'])} of urgent cases (goal 80%), healthy trucks get a warning in {pct(m2['healthy'])} of snapshots (goal 10% or less), "
            f"and the temperature forecast is {mf['fc']:.2f} °C off on average, worse than the baseline's {mb['fc']:.2f} °C and worse than guessing “no change” (0.19 °C).", Bd),
          table([["What we measure (server, 106 test trips)", "Baseline", "Iteration 1", "Iteration 2 = final", "Goal"],
                 ["Urgent cases shown as green", pct(mb["green"]), pct(m1["green"]), pct(m2["green"]), "5% or less"],
                 ["Urgent cases shown as critical", pct(mb["crit"]), pct(m1["crit"]), pct(m2["crit"]), "no goal set"],
                 ["Urgent cases with a countdown", pct(mb["cd"]), pct(m1["cd"]), pct(m2["cd"]), "80% or more"],
                 ["Healthy snapshots with a warning or critical status", pct(mb["healthy"]), pct(m1["healthy"]), pct(m2["healthy"]), "10% or less"],
                 ["Sensor frozen during a real breach: flagged", pct(mb["stuck"]), pct(m1["stuck"]), pct(m2["stuck"]), "50% or more"],
                 ["Urgent cases treated as safe with 0.3 °C sensor noise", pct(mb["n03"]), pct(m1["n03"]), pct(m2["n03"]), "50% or less"],
                 ["Forecast error at 30 minutes (°C)", f"{mb['fc']:.2f}", f"{m1['fc']:.2f}", f"{m2['fc']:.2f}", "below 0.8"],
                 ["Response time, 95th percentile (ms)", f"{mb['p95']:.0f}", f"{m1['p95']:.0f}", f"{m2['p95']:.0f}", "below 300"],
                 ["Checks passed", "8 of 23", "7 of 19", f"{n_pass} of {len(checks)}", "lists differ"]],
                [6.4 * cm, 2.1 * cm, 2.3 * cm, 3.0 * cm, 2.6 * cm]),
          p("“Urgent treated as safe with noise”: before, this meant the classifier said healthy; after, the status is green. Fault names before came from 7 classes, after from 3 events, so those rows are not compared.", Sm),
          PageBreak()]

    # ================= 1. How we tested =================
    s += [p("1. How we tested", H1),
          p("Idea: test what the <b>user really sees</b> (status, countdown, fault name, and finally the screen), not only the models inside. "
            "The pass marks are our own; we set them before iterating and kept them, so the numbers stay comparable across versions.", Bd),
          table([["Test", "What we did", "What it can NOT tell us"],
                 ["Forecast", f"Compared the predicted cargo temperature 15/30/60 min ahead with what happened in {F['n_windows']:,} snapshots, and against a “no change” guess.",
                  "Most snapshots are calm, so an average hides the moments that matter."],
                 ["Fault naming", "Checked whether the three events (door open 20+ min, sudden outside heat, faulty sensor) are named when they are true. Repeated on random samples of trips to see how uncertain the numbers are.",
                  "Modes like cooling degradation have no event; they are judged only through status and countdown."],
                 ["Urgent-breach warnings", "Took only snapshots where the cargo really breaches within 30 minutes: what status was shown, was a countdown shown, how accurate was it?",
                  "Ground truth comes from simulators, not real trucks."],
                 ["Stress tests", "Added sensor noise (0.1 / 0.3 / 0.5 °C), shifted the clock by 7 hours, froze the temperature sensor during a real warming.",
                  "The noise is artificial: it shows sensitivity, not the exact error on a real truck."],
                 ["Whole-server check", f"Sent {F['G5_end_to_end_api']['n_requests']:,} requests to the real API and compared with batch scoring (agreement: {pct(F['G5_end_to_end_api']['parity_status_agreement'])}).",
                  "Says nothing about the screen."],
                 ["New simulator trips", f"Scored {S2['n_test_trips']} held-out trips from the new physics simulator (never trained on) to make sure rule changes were not tuned only to the old test trips.",
                  "dataset_v3 is not in git (80 MB); the results are committed, the run cannot be repeated without the file."],
                 ["Integration check (new)", "A script drives the real dashboard in a browser against the real server: 4 demo scenarios, 3 CSV cases (good, too short, wrong columns), 3 failure cases (server unreachable, server error, slow server).",
                  "One browser and one screen size; not run inside Docker; not a usability test with real operators."]],
                [3.2 * cm, 8.4 * cm, 4.8 * cm]),
          p("Other checks that pass: backend tests 25 of 25; dashboard type-check and lint clean.", Bd),
          p("Two test sets, and why: the 106 <b>old-generator trips</b> (dataset v4) are the same ones the baseline was scored on, so all versions are comparable. "
            "But the rebuilt models were trained on a different simulator, so v4 is out-of-distribution for them, and some results may reflect that gap and not the truck. "
            "The 225 <b>new-simulator trips</b> (dataset v3) are the fair test for the rebuilt models.", Bd),
          PageBreak()]

    # ================= 2. Baseline =================
    bu = B["G5_end_to_end_api"]["true_ttb_le30"]
    s += [p("2. Baseline: where the qualifying-round prototype fails (tag checkpoint-1-baseline)", H1),
          p(f"The baseline passed 8 of 23 checks. Model scores from the qualifying round reproduced exactly (fault score {B['G2_classification']['macro_f1']:.2f}, forecast error {B['G1_forecast']['mae_t30']:.2f} °C), "
            "but the server often failed the operator. Full detail: Evaluation_Artifact_baseline.pdf.", Bd),
          table([["#", "Finding", "Evidence"],
                 ["F1", "Urgent cases shown as green.", f"AMAN {pct(bu['AMAN'])}, WASPADA {pct(bu['WASPADA'])}, KRITIS {pct(bu['KRITIS'])} (n={bu['n']})."],
                 ["F2", "Countdown hidden when the classifier says “healthy”.", f"{pct(B['G3_imminent_breach']['true_ttb_le30']['miss_gate_A0'])} of urgent cases were judged healthy by the classifier; the models alone showed a countdown in {pct(B['G3_imminent_breach']['true_ttb_le30']['shown_rate'])}."],
                 ["F3", "Sensor noise confuses it.", f"With 0.3 °C noise, urgent cases judged healthy rose from {pct(B['G4_robustness']['clean']['imminent_pred_A0_rate'])} to {pct(B['G4_robustness']['sensor_noise_sigma_0.3C']['imminent_pred_A0_rate'])}."],
                 ["F4", "A frozen sensor is read as healthy.", f"{pct(B['G4_robustness']['stuck_sensor_on_imminent_breach']['pred_A0_healthy'])} predicted healthy; {pct(B['G4_robustness']['stuck_sensor_on_imminent_breach']['pred_masalah_sensor'])} flagged as sensor problem."],
                 ["F5", "The forecast target is met by a trivial guess.", f"“No change” scores {B['G1_forecast']['naive_persistence_mae_t30']:.3f} °C against the model's {B['G1_forecast']['mae_t30']:.3f} °C."],
                 ["F6", "Three fault types mostly missed.", f"Found: outside heat {pct(B['G2_classification']['per_class']['A7']['recall'])}, poor pre-cooling {pct(B['G2_classification']['per_class']['A8']['recall'])}, weakening cooling {pct(B['G2_classification']['per_class']['degradasi_bertahap']['recall'])}."],
                 ["F7", "Test data too thin for per-class or per-cargo claims.", "2 to 4 test trips for several fault types; no urgent cases for vaccine, frozen meat or fish."]],
                [1 * cm, 6.2 * cm, 9.2 * cm]),
          p("Cause we found: the status followed a forecast that was roughly “no change”, and the countdown was hidden whenever the classifier believed the truck healthy. The classifier was weakest on exactly the slow faults that end in a breach.", Bd),
          PageBreak()]

    # ================= 3. Iterations =================
    s += [p("3. Iterations: what we changed and what happened", H1),
          p("Iteration 1 (tag checkpoint-2-iteration)", H2),
          p("We replaced the prototype with a <b>physics engine</b> that estimates the cargo temperature from the cabin sensor, counts down to a breach and sets the status; "
            "a set of <b>sensor rules</b>; and a <b>learned model</b> (GRU) that names three events and forecasts the cargo temperature (an XGBoost countdown is kept as information only). "
            "The countdown no longer depends on the fault classifier, which was the baseline's main failure. The models were trained on a new physics simulator with real Indonesian climate data (BMKG) and real faulty-sensor patterns (Intel Berkeley Lab).", Bd),
          p(f"<b>Result:</b> urgent cases shown as green fell from {pct(mb['green'])} to {pct(m1['green'])}. But the cost was large: the countdown was never shown ({pct(m1['cd'])}), healthy trucks were warned in {pct(m1['healthy'])} of snapshots (baseline {pct(mb['healthy'])}), "
            f"and the forecast got worse ({mb['fc']:.2f} → {m1['fc']:.2f} °C). Door open was never named ({pct(R1['G2_events']['per_event']['door']['recall'])}).", Bd),
          p("Iteration 2 (rule changes, no retraining)", H2),
          table([["Change", "Finding it targets", "New rule"],
                 ["Drift countdown", "Urgent cases were warned but never given a countdown or critical status.", "When the smoothed reading rises at least 0.3 °C per hour over 20 minutes and the door has been shut for 30 minutes, count the minutes until the reading itself would cross the limit; use the shorter of this and the physics countdown."],
                 ["Margin scaled to cargo range", "Healthy trucks warned in 33% of snapshots.", "The “near the limit” warning starts at 35% of the cargo range, at most 1 °C (0.7 °C for 2–4 °C cargo)."],
                 ["Sensor reading as upper bound", "Found while testing the margin change: the extreme-heat demo showed green with the sensor above the limit.", "The margin rule uses the higher of the estimated cargo temperature and the smoothed sensor reading."],
                 ["Stuck sensor after a rise", "A sensor frozen 30 min before a breach was never flagged.", "A flat reading becomes suspect once the trend of the 30 minutes before it would have moved it by 0.3 °C."]],
                [3.4 * cm, 5.2 * cm, 7.8 * cm]),
          p("<b>Status bars.</b> Each bar groups snapshots by how soon the cargo really breaches; the top bar should be red.", Bd),
          img("iteration2_fig_status.png", 16.4, 5.4),
          p(f"<b>Result on the 106 old trips:</b> countdown shown in {pct(m2['cd'])} of urgent cases (iteration 1: {pct(m1['cd'])}, baseline {pct(mb['cd'])}) and accurate when shown "
            f"(off by {R2['G3_imminent_breach']['true_ttb_le30']['mae_when_shown']:.1f} minutes); critical status for {pct(m2['crit'])} of urgent cases (was 0%); "
            f"frozen sensor flagged in {pct(m2['stuck'])} (was 0%); healthy warnings down from {pct(m1['healthy'])} to {pct(m2['healthy'])}; urgent cases treated as safe under 0.3 °C noise: {pct(m1['n03'])} → {pct(m2['n03'])}.", Bd),
          PageBreak()]

    sweep_rows = [["Margin for 2–4 °C cargo", "Urgent shown green", "Healthy warned"]] + [
        [f"{r['margin_2_4C']:.1f} °C" + (" (chosen)" if abs(r["frac"] - SW["chosen_frac"]) < 1e-9 else ""), pct(r["urgent_aman"]), pct(r["healthy_alert"])] for r in SW["sweep"]]
    s += [p("Trade-off we could not avoid: how wide should the “near the limit” margin be?", H2),
          table(sweep_rows, [6 * cm, 4.6 * cm, 4.6 * cm]),
          p("No width meets both goals on the old test trips: urgent and healthy snapshots sit at overlapping distances from the limit. 0.7 °C is the narrowest that keeps urgent-green near the 5% goal; 0.5 °C would cut healthy warnings to 13% but show 7% of urgent cases as green. The team chose safety.", Bd),
          p("Results on the new simulator's held-out trips (225 trips the models never trained on)", H2),
          table([["Per trip", "Iteration 1", "Iteration 2", "Trips"],
                 ["Breaching trips warned before the breach", pct(S1["breach_warned_before"]), pct(S2["breach_warned_before"]), S2["n_breach_scorable"]],
                 ["Breaching trips critical before the breach", pct(S1["breach_kritis_before"]), pct(S2["breach_kritis_before"]), S2["n_breach_scorable"]],
                 ["Median lead of the critical status (min)", f"{S1['median_lead_kritis_min']:.0f}", f"{S2['median_lead_kritis_min']:.0f}", ""],
                 ["Healthy trips with any warning", pct(S1["healthy_trips_any_warning"]), pct(S2["healthy_trips_any_warning"]), S2["n_healthy"]],
                 ["Door trips without a breach: any warning", pct(S1["door_no_breach_any_warning"]), pct(S2["door_no_breach_any_warning"]), S2["n_door_no_breach"]],
                 ["Door trips without a breach: critical", pct(S1["door_no_breach_any_kritis"]), pct(S2["door_no_breach_any_kritis"]), S2["n_door_no_breach"]],
                 ["Sensor-fault trips flagged", pct(S1["sensor_fault_trips_flagged"]), pct(S2["sensor_fault_trips_flagged"]), S2["n_sensor_fault"]]],
                [8 * cm, 2.8 * cm, 2.8 * cm, 2.4 * cm]),
          p("On the fair test set nothing got worse for healthy trucks or sensor faults and the critical status comes earlier (median 44 → 54 minutes before the breach). "
            "The price: 63% of trips where the door opened but the cargo never breached now reach critical (48% before). We do not know whether these are false alarms: it depends on where the probe sits (section 5).", Bd),
          p("What went wrong and why (things that got worse, not only better)", H2),
          table([["What got worse", "Why (measured unless marked)"],
                 ["Countdown coverage: 62% → 23%", "The baseline showed a countdown from its models plus a fallback estimate in the server; the physics countdown only projects a breach when the cabin air is already above the limit. In the old test trips urgent cases are slow drifts, so 78% stay above the 60-minute display limit. Drift rule recovered part of it."],
                 ["Healthy warnings: 6% → 19%", "One rule (cargo within a margin of the limit) causes them all. Dairy and produce allow only 2–4 °C, and healthy cargo in the old trips runs inside that margin. The new simulator keeps the same cargo at its setpoint, so this may be partly a generator gap (hypothesis)."],
                 [f"Forecast error: {mb['fc']:.2f} → {m2['fc']:.2f} °C", "The model learned the new simulator's cooling setpoints, so it predicts frozen meat about 2 °C warmer than in the old trips. It was not retrained in iteration 2, so this is unchanged."],
                 ["Door named: 59% → 0%", "In the new simulator the cabin reading jumps 14–36 °C per minute when a door opens, a known flaw (no heat stored in walls and racks); in the old trips an open door barely moves the reading. The physics rules still raise the status for many door cases."]],
                [4.6 * cm, 11.8 * cm]),
          PageBreak()]

    # ================= 4. Integration =================
    S = UI["scenarios"]
    csvr, fh = UI["csv"], UI["failure_handling"]
    s += [p("4. Integration: connecting the dashboard to the rebuilt system", H1),
          p("<b>What was connected.</b> (1) The server (<font face='Courier'>/api/v1/analyze</font>) now runs the physics engine, sensor rules and models, and also serves the demo scenarios. "
            "(2) The new dashboard (pull request #25) builds a 60-minute window from the cargo form and shows status, countdown, truck picture, forecast chart, actions and drivers. "
            "(3) The header now has a scenario dropdown and an Import CSV button (commit 8e374a0, " + where + "): both send real telemetry to the same server instead of the form's synthetic window. "
            "The four dropdown entries A0, A-1, A-2 and A-3 map to the backend scenarios normal, door open, extreme ambient and stuck sensor. "
            "Tested combination: dashboard at commit " + (UI.get("frontend_commit") or "?") + ", server code at commit " + UI.get("server_commit", "?") + " (main is " + main_sha + ").", Bd),
          p("<b>How we checked it.</b> The script <font face='Courier'>eval/ui_check.py</font> opens the dashboard in a real browser against a real server and compares what the screen shows with what the API returns for the same data.", Bd),
          table([["Dropdown", "Expected status", "Server says", "Screen shows", "Countdown", "Fault name"]] +
                [[x["dropdown"], x["expected_status"], x["api_status"], x["ui_status"], f"{x['api_countdown_min']:.0f} min" if x["api_countdown_min"] else "none", x["api_label"]] for x in S],
                [3.3 * cm, 2.4 * cm, 2.4 * cm, 2.4 * cm, 2.2 * cm, 3.7 * cm]),
          p(f"Screen equals server in {ui_ok['scenarios_ui_matches_api']} scenarios and the server meets its own scenario expectation in {ui_ok['scenarios_api_matches_expected']}. "
            f"No errors appeared in the browser console during normal use ({ui_ok['console_errors_in_normal_use']}).", Bd),
          table([["Case", "What the user sees", "Result"],
                 ["CSV, 90 rows, has temp_c", "Result shown, button shows the file name", "ok" if csvr["good_file"]["shows_result"] and csvr["good_file"]["button_shows_filename"] else "FAIL"],
                 ["CSV, 20 rows", csvr["too_short_file"]["message"].replace("Analisis gagal", "").replace("Coba lagi", "").strip(), "ok" if csvr["too_short_file"]["no_stack_trace"] else "FAIL"],
                 ["CSV without temp_c", csvr["wrong_columns_file"]["message"].replace("Analisis gagal", "").replace("Coba lagi", "").strip()[:110] + "…", "ok" if csvr["wrong_columns_file"]["no_stack_trace"] else "FAIL"],
                 ["Server unreachable", fh["server_unreachable"]["message"].replace("Analisis gagal", "").replace("Coba lagi", "").strip() + " (with a “Coba lagi” retry button)", "ok" if fh["server_unreachable"]["has_retry_button"] else "FAIL"],
                 ["Server error 500", fh["server_error_500"]["message"].replace("Analisis gagal", "").replace("Coba lagi", "").strip(), "ok" if fh["server_error_500"]["no_raw_body_shown"] else "FAIL"],
                 ["Slow server", "A loading state is shown while waiting", "ok" if fh["slow_server_shows_loading_state"] else "FAIL"]],
                [3.8 * cm, 10.6 * cm, 2 * cm]),
          p("Dashboard for the door-open scenario, as the operator sees it (screenshot from the check):", Bd),
          img("integration_final_ui.png", 15.6, 9.4),
          PageBreak()]

    # ================= 5. Still open =================
    s += [p("5. Findings not yet fixed, and why", H1),
          p("Causes are marked <i>measured</i> or <i>hypothesis</i>. Plans are for after the hackathon; nothing below is claimed as done.", Sm),
          table([["Finding", "Where we stand", "Cause and next step"],
                 ["N1 Countdown for urgent cases", f"Shown in {pct(m2['cd'])} (goal 80%).", "Physics cannot project a slow drift (measured). Next: fall back to the learned countdown (XGBoost) when neither physics nor drift can project; judge on both test sets."],
                 ["N2 False warnings on healthy trucks", f"{pct(m2['healthy'])} of snapshots (goal 10%).", "The margin alone cannot separate slow approaches from healthy running (measured; see sweep). Needs an extra signal."],
                 ["N3 Forecast", f"{mf['fc']:.2f} °C off; “no change” is 0.19 °C.", "Learned the new simulator's setpoints (measured); the exact cause of the bias is a hypothesis. Next: predict the change, not the level. The dashboard chart shows this forecast, so the drawn prediction can be about 1.4 °C off; for 2–4 °C cargo that is most of the safe range."],
                 ["N4 Door and outside heat named", f"Door {pct(ev['door']['recall'])}, outside heat {pct(ev['shock']['recall'])}.", "Simulator flaws (no wall/rack heat storage, no sunlight) (measured differences). Next: fix the simulator and retrain. The physics rules still raise the status in many door cases."],
                 ["N5 Noise", "Event names collapse at 0.1 °C noise; status holds.", "Trained with 0.073 °C noise only (known). Next: train with 0.05–0.5 °C."],
                 ["N6 Stuck sensor", f"Flagged in {pct(m2['stuck'])} (goal 50%); shown green in {pct(F['G4_robustness']['stuck_sensor_on_imminent_breach']['status_aman'])}.", "The rule fires only when the reading was rising before it froze (measured). Next: flag a flat reading when the estimated cargo should be warming."],
                 ["N7 Test validity", "Two test sets, both simulated.", "No real truck data exists in this project. Results are evidence about the simulators and the rules, not about the field."],
                 ["Sensor position (open question)", "Unanswered.", "The engine assumes a probe in the cabin air; the API says temp_c is cargo temperature. If in the cargo, the new rules are exact; if in the air, they warn earlier than needed (the door-trip cost in section 3). Ask the hardware owner."],
                 ["Integration limits", "Not measured.", "Header controls " + where + ". Not run inside Docker in this check; one browser and one screen size; no usability test with real operators; the compressor-failure demo scenario is hidden from the dropdown (that fault is postponed) but still exists in the server."]],
                [3.6 * cm, 4.2 * cm, 8.6 * cm]),
          p("What we would tell a judge in one sentence: the system no longer tells an operator “safe” when a breach is near, the dashboard shows exactly what the server says and handles bad input and outages, "
            "but it still misses the countdown in most urgent cases, warns too often on healthy trucks, and its temperature forecast is not yet useful.", Bd),
          PageBreak()]

    # ================= appendices =================
    trail = git("log", "--format=%h|%an|%ad|%s", "--date=format:%H:%M", "--since=2026-09-26 00:00", "--reverse", "origin/main", "origin/fix/iteration", "origin/frontend-ui", "eval/integration-final").splitlines()
    seen, rows = set(), [["Time", "Commit", "Author", "What"]]
    for l in sorted(trail, key=lambda x: x.split("|")[2]):
        h, a, t, msg = l.split("|", 3)
        if h in seen or msg.startswith("Merge") or "ColdTrack brand" in msg or "design system" in msg or "ui-ux-pro-max" in msg:
            continue
        seen.add(h)
        rows.append([t, h, a, msg[:78]])
    tags = []
    for t in ["checkpoint-1-baseline", "checkpoint-2-iteration", "checkpoint-2-iteration-2", "checkpoint-3-integration"]:
        tags.append([t, git("log", "-1", "--format=%h %ad", "--date=format:%H:%M", t) or "not found"])
    s += [p("Appendix A: acceptance checks (final = iteration 2 engine)", H1),
          table([["Result", "Check"]] + [["PASS" if c == "PASSED" else "FAIL", n] for c, n in checks], [2 * cm, 14.4 * cm]),
          p("The final run (commit " + F.get("commit", "?") + ") reproduced every one of the 231 numeric results of the iteration 2 run, which was measured at c336a2a (response times excluded). "
            + ("Backend and ml code are identical between c336a2a and main " + main_sha + " (git diff is empty), so the iteration 2 numbers stand for main." if same_core
               else "WARNING: backend or ml code differs between c336a2a and main " + main_sha + "; re-measure before relying on iteration 2 numbers."), Sm),
          Spacer(1, 8),
          p("Appendix B: how to reproduce", H1),
          p("<font face='Courier'>python -m eval.run_eval --tag final</font> (about 4 min) · <font face='Courier'>EVAL_TAG=final pytest eval/test_baseline.py</font> · "
            "<font face='Courier'>python -m eval.ui_check --ui http://localhost:3000 --api http://localhost:8000</font> (needs <font face='Courier'>pip install playwright</font> and Chrome; frontend built with NEXT_PUBLIC_API_URL) · "
            "<font face='Courier'>python -m eval.make_final_artifact</font>. The baseline cannot be re-run (its models were removed); its results are archived in results/baseline_results.json.", Bd),
          Spacer(1, 6),
          p("Appendix C: what was committed when (26 September 2026, WIB)", H1),
          table(rows, [1.3 * cm, 1.7 * cm, 2.9 * cm, 10.5 * cm]),
          Spacer(1, 4),
          p("Tags at the time of writing: " + "; ".join(f"{a} → {b}" for a, b in tags) + ". The last two tags point at the same commit, before the iteration 2 rule changes and before the dashboard merge; "
            "a tag on the final commit is still to be created.", Sm)]

    SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=1.8 * cm, bottomMargin=1.6 * cm,
                      title="ColdTrack AI - Evaluation Artifact: Integration, Iteration and Evaluation").build(s)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
