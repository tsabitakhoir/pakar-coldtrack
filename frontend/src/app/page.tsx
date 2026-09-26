"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader, DataSource } from "@/components/app-header";
import { ConditionForm, validateCondition } from "@/components/condition-form";
import { ActionBanner } from "@/components/action-banner";
import { VehicleStatus } from "@/components/vehicle-status";
import { TruckVisual } from "@/components/truck-visual";
import { DiagnosisCard } from "@/components/diagnosis-card";
import { LiveConditions } from "@/components/live-conditions";
import { TemperatureChart } from "@/components/temperature-chart";
import { ActionSteps } from "@/components/action-steps";
import { DriverList } from "@/components/driver-list";
import { ResultEmpty, ResultError, ResultSkeleton } from "@/components/panel-states";
import { ApiError, analyzeShipment } from "@/lib/api";
import { MIN_READINGS, parseReadingsCsv } from "@/lib/csv";
import { profileById } from "@/lib/profiles";
import { conditionFromReadings, fetchScenario } from "@/lib/scenarios";
import { buildWindow } from "@/lib/window";
import { AnalyzeResponse, ConditionInput, TelemetryReading } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 600;

const INITIAL: ConditionInput = {
  shipmentId: "TRK-JKT-0417",
  cargoProfile: "vaksin_2_8C",
  massKg: 1000,
  tempNow: 5,
  temp60Ago: 4.5,
  ambient: 31,
  humidity: 75,
  doorOpen: false,
  doorMinutes: 10,
  moving: true,
  stoppedMinutes: 10,
};

/** Data dari skenario/CSV yang menggantikan jendela bacaan buatan formulir. */
interface Feed {
  source: NonNullable<DataSource>;
  readings: TelemetryReading[];
}

// Bidang formulir yang tetap berlaku saat memakai data skenario/CSV; mengubah bidang
// lain berarti pengguna ingin kembali ke input manual.
const KEEP_FEED_KEYS: (keyof ConditionInput)[] = ["shipmentId", "cargoProfile", "massKg"];

interface Analysis {
  result: AnalyzeResponse;
  readings: TelemetryReading[];
  input: ConditionInput;
}

export default function Home() {
  const [input, setInput] = useState<ConditionInput>(INITIAL);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [feedBusy, setFeedBusy] = useState(false);
  const inFlight = useRef<AbortController | null>(null);

  // Dengan data skenario/CSV, hanya ID & massa yang divalidasi; suhu dll. diambil dari bacaan.
  const errors = useMemo(() => {
    const e = validateCondition(input);
    if (!feed) return e;
    return Object.fromEntries(Object.entries(e).filter(([k]) => k === "shipmentId" || k === "massKg"));
  }, [input, feed]);
  const valid = Object.keys(errors).length === 0;

  const run = useCallback(async (c: ConditionInput, f: Feed | null) => {
    inFlight.current?.abort();
    const ctrl = new AbortController();
    inFlight.current = ctrl;
    const readings = f ? f.readings : buildWindow(c, new Date());
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeShipment(
        { shipment_id: c.shipmentId.trim(), cargo_profile: c.cargoProfile, mass_kg: c.massKg, readings },
        ctrl.signal
      );
      setAnalysis({ result, readings, input: c });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof ApiError ? e.message : "Terjadi kesalahan yang tidak diketahui.");
    } finally {
      if (inFlight.current === ctrl) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!valid) return;
    const t = setTimeout(() => run(input, feed), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input, feed, valid, retry, run]);

  function handleForm(next: ConditionInput) {
    if (feed && (Object.keys(next) as (keyof ConditionInput)[]).some((k) => next[k] !== input[k] && !KEEP_FEED_KEYS.includes(k))) {
      setFeed(null); // kembali ke input manual
    }
    setInput(next);
  }

  async function handleScenario(id: string) {
    setFeedBusy(true);
    setError(null);
    try {
      const sc = await fetchScenario(id);
      setFeed({ source: { kind: "scenario", id }, readings: sc.readings });
      setInput((prev) => conditionFromReadings(sc.readings, sc.cargoProfile, prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat skenario.");
    } finally {
      setFeedBusy(false);
    }
  }

  async function handleCsv(file: File) {
    setFeedBusy(true);
    setError(null);
    try {
      const readings = parseReadingsCsv(await file.text());
      if (readings.length === 0) throw new Error("CSV tidak berisi bacaan yang valid.");
      if (readings.length < MIN_READINGS) {
        throw new Error(`CSV berisi ${readings.length} baris; model butuh minimal ${MIN_READINGS} bacaan (satu per menit).`);
      }
      setFeed({ source: { kind: "csv", name: file.name }, readings });
      setInput((prev) => conditionFromReadings(readings, prev.cargoProfile, prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membaca CSV.");
    } finally {
      setFeedBusy(false);
    }
  }

  const a = analysis;
  const profile = profileById((a?.input ?? input).cargoProfile);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        model={analysis?.result.model_version}
        source={feed?.source ?? null}
        busy={feedBusy}
        onSelectScenario={handleScenario}
        onImportCsv={handleCsv}
      />

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-5 p-4 lg:p-6">
        {feed && !error && (
          <p className="rounded-lg border bg-tint px-4 py-2 text-[13px] text-brand-strong">
            Menganalisis {feed.source.kind === "csv" ? `berkas ${feed.source.name}` : "data skenario"} ({feed.readings.length} bacaan).
            ID dan massa bisa diubah; mengubah suhu atau kondisi lain kembali ke input manual.
          </p>
        )}
        {error && <ResultError message={error} onRetry={() => setRetry((n) => n + 1)} />}
        {a && <ActionBanner result={a.result} />}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* Left: vehicle status + cargo input */}
          <div className="flex flex-col gap-5 xl:col-span-3">
            {a && (
              <div className="card p-5">
                <VehicleStatus result={a.result} />
              </div>
            )}
            <ConditionForm value={input} errors={errors} onChange={handleForm} />
          </div>

          {/* Center + right: results */}
          {!a ? (
            <div className="xl:col-span-9">
              {loading ? <ResultSkeleton /> : !error && (
                <ResultEmpty message="Lengkapi detail muatan untuk melihat analisis." />
              )}
            </div>
          ) : (
            <div className={cn("grid grid-cols-1 gap-5 transition-opacity duration-150 lg:grid-cols-2 xl:col-span-9 xl:grid-cols-9", loading && "opacity-60")}>
              <div className="flex flex-col gap-5 xl:col-span-5">
                <div className="card flex flex-1 flex-col justify-center p-5">
                  <TruckVisual result={a.result} input={a.input} />
                </div>
                <DiagnosisCard result={a.result} />
              </div>
              <div className="flex flex-col gap-5 xl:col-span-4">
                <LiveConditions result={a.result} input={a.input} />
                <TemperatureChart readings={a.readings} forecast={a.result.forecast} profile={profile} />
              </div>
              <div className="lg:col-span-2 xl:col-span-9 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <ActionSteps actions={a.result.actions} />
                <DriverList drivers={a.result.drivers} />
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t px-4 py-3 text-[12px] text-muted lg:px-6">
        {a && (
          <span className="num">
            {a.result.model_version} · {a.result.inference_ms} ms ·{" "}
          </span>
        )}
        Alat bantu keputusan, bukan pengganti penilaian operator.
      </footer>
    </div>
  );
}
