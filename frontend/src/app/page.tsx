"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CloudCog,
  FileUp,
  Loader2,
  MapPin,
  Play,
  Thermometer,
  Truck,
  Zap,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Reading = Record<string, unknown>;

type Scenario = {
  id: string;
  title: string;
  description: string;
  cargo_profile: string;
  expected_status: string;
  reading_count: number;
};

type AnalyzeResponse = {
  status: string;
  risk_index: number;
  time_to_breach_min: number | null;

  failure_mode: {
    label: string;
    confidence: number;
  };

  forecast: {
    t15: number;
    t30: number;
    t60: number;
  };

  drivers: {
    feature: string;
    value: string;
    contribution: number;
  }[];

  actions: {
    priority: number;
    text: string;
    eta_min: number | null;
  }[];

  model_version: string;
  inference_ms: number;
};

/* =========================================================
   HELPERS
========================================================= */

function statusClass(status?: string) {
  switch (status) {
    case "AMAN":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "WASPADA":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "KRITIS":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function statusIcon(status?: string) {
  if (status === "AMAN") {
    return <CheckCircle2 size={16} />;
  }

  return <AlertTriangle size={16} />;
}

function formatLabel(label: string) {
  return label.replaceAll("_", " ");
}

function numberFromValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
}

function temperatureFromReading(
  reading: Reading
): number | null {
  const keys = [
    "temp_c",
    "temperature_c",
    "temperature",
    "temp",
    "suhu",
    "suhu_c",
  ];

  for (const key of keys) {
    const value = numberFromValue(reading[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function timestampFromReading(
  reading: Reading,
  index: number
): string {
  const keys = [
    "ts",
    "timestamp",
    "time",
    "datetime",
  ];

  for (const key of keys) {
    const value = reading[key];

    if (value !== undefined && value !== null) {
      return String(value);
    }
  }

  return `${index + 1}`;
}

/* =========================================================
   TEMPERATURE CHART
========================================================= */

function TemperatureChart({
  readings,
  forecast,
}: {
  readings: Reading[];
  forecast: AnalyzeResponse["forecast"];
}) {
  const points = useMemo(() => {
    return readings
      .map((reading, index) => {
        const temperature =
          temperatureFromReading(reading);

        if (temperature === null) {
          return null;
        }

        return {
          temperature,
          timestamp: timestampFromReading(
            reading,
            index
          ),
        };
      })
      .filter(
        (
          point
        ): point is {
          temperature: number;
          timestamp: string;
        } => point !== null
      );
  }, [readings]);

  if (!points.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl bg-slate-50">
        <div className="text-center">
          <Thermometer
            size={28}
            className="mx-auto mb-2 text-slate-300"
          />

          <p className="text-sm font-medium text-slate-500">
            Temperature telemetry belum tersedia
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Forecast AI tetap tersedia di panel analisis.
          </p>
        </div>
      </div>
    );
  }

  const actualValues = points.map(
    (point) => point.temperature
  );

  const allValues = [
    ...actualValues,
    forecast.t15,
    forecast.t30,
    forecast.t60,
  ];

  let minTemp = Math.min(...allValues);
  let maxTemp = Math.max(...allValues);

  if (minTemp === maxTemp) {
    minTemp -= 1;
    maxTemp += 1;
  }

  const margin =
    Math.max((maxTemp - minTemp) * 0.12, 0.5);

  minTemp -= margin;
  maxTemp += margin;

  const width = 900;
  const height = 300;

  const left = 58;
  const right = 24;
  const top = 24;
  const bottom = 42;

  const plotWidth =
    width - left - right;

  const plotHeight =
    height - top - bottom;

  const xActual = (index: number) => {
    if (points.length === 1) {
      return left;
    }

    return (
      left +
      (index / (points.length - 1)) *
        plotWidth *
        0.82
    );
  };

  const yTemp = (value: number) =>
    top +
    ((maxTemp - value) /
      (maxTemp - minTemp)) *
      plotHeight;

  const actualPath = points
    .map((point, index) => {
      return `${index === 0 ? "M" : "L"} ${xActual(
        index
      )} ${yTemp(point.temperature)}`;
    })
    .join(" ");

  const actualEndX =
    xActual(points.length - 1);

  const actualEndY =
    yTemp(points[points.length - 1].temperature);

  const forecastX1 =
    left + plotWidth * 0.88;

  const forecastX2 =
    left + plotWidth * 0.94;

  const forecastX3 =
    left + plotWidth;

  const forecastPath = [
    `M ${actualEndX} ${actualEndY}`,
    `L ${forecastX1} ${yTemp(forecast.t15)}`,
    `L ${forecastX2} ${yTemp(forecast.t30)}`,
    `L ${forecastX3} ${yTemp(forecast.t60)}`,
  ].join(" ");

  const grid = Array.from(
    { length: 5 },
    (_, index) => {
      const ratio = index / 4;

      const y =
        top + ratio * plotHeight;

      const value =
        maxTemp -
        ratio * (maxTemp - minTemp);

      return { y, value };
    }
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-slate-50">
      <div className="absolute right-4 top-3 z-10 flex items-center gap-4 rounded-lg bg-white/90 px-3 py-2 text-xs shadow-sm backdrop-blur">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
          Actual
        </span>

        <span className="flex items-center gap-1.5 text-slate-500">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
          Forecast
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        preserveAspectRatio="none"
      >
        {grid.map((line, index) => (
          <g key={index}>
            <line
              x1={left}
              y1={line.y}
              x2={width - right}
              y2={line.y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />

            <text
              x={left - 9}
              y={line.y + 4}
              textAnchor="end"
              fontSize="11"
              fill="#94a3b8"
            >
              {line.value.toFixed(1)}°
            </text>
          </g>
        ))}

        <line
          x1={actualEndX}
          y1={top}
          x2={actualEndX}
          y2={height - bottom}
          stroke="#cbd5e1"
          strokeDasharray="5 5"
        />

        <path
          d={actualPath}
          fill="none"
          stroke="#0f172a"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d={forecastPath}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="3"
          strokeDasharray="8 6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle
          cx={actualEndX}
          cy={actualEndY}
          r="5"
          fill="#0f172a"
        />

        <circle
          cx={forecastX1}
          cy={yTemp(forecast.t15)}
          r="5"
          fill="white"
          stroke="#94a3b8"
          strokeWidth="2"
        />

        <circle
          cx={forecastX2}
          cy={yTemp(forecast.t30)}
          r="5"
          fill="white"
          stroke="#94a3b8"
          strokeWidth="2"
        />

        <circle
          cx={forecastX3}
          cy={yTemp(forecast.t60)}
          r="5"
          fill="white"
          stroke="#94a3b8"
          strokeWidth="2"
        />

        <text
          x={left}
          y={height - 11}
          fontSize="11"
          fill="#94a3b8"
        >
          Start
        </text>

        <text
          x={forecastX1}
          y={height - 11}
          textAnchor="middle"
          fontSize="11"
          fill="#94a3b8"
        >
          +15m
        </text>

        <text
          x={forecastX2}
          y={height - 11}
          textAnchor="middle"
          fontSize="11"
          fill="#94a3b8"
        >
          +30m
        </text>

        <text
          x={forecastX3}
          y={height - 11}
          textAnchor="end"
          fontSize="11"
          fill="#94a3b8"
        >
          +60m
        </text>
      </svg>
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function Home() {
  const [scenarios, setScenarios] = useState<
    Scenario[]
  >([]);

  const [selectedScenario, setSelectedScenario] =
    useState("");

  const [result, setResult] =
    useState<AnalyzeResponse | null>(null);

  const [selectedReadings, setSelectedReadings] =
    useState<Reading[]>([]);

  const [loadingScenarios, setLoadingScenarios] =
    useState(true);

  const [analyzing, setAnalyzing] =
    useState(false);

  const [backendOnline, setBackendOnline] =
    useState(false);

  const [error, setError] = useState("");

  const [vehicleId, setVehicleId] =
    useState("VH-001");

  const [csvName, setCsvName] =
    useState("");

  /* =======================================================
     LOAD SCENARIOS
  ======================================================= */

  useEffect(() => {
    async function loadScenarios() {
      try {
        const healthResponse =
          await fetch(`${API_URL}/health`);

        if (!healthResponse.ok) {
          throw new Error(
            "Backend health check failed"
          );
        }

        setBackendOnline(true);

        const scenarioResponse =
          await fetch(
            `${API_URL}/api/v1/scenarios`
          );

        if (!scenarioResponse.ok) {
          throw new Error(
            "Failed to load scenarios"
          );
        }

        const data: Scenario[] =
          await scenarioResponse.json();

        setScenarios(data);

        if (data.length > 0) {
          setSelectedScenario(data[0].id);
        }
      } catch (err) {
        console.error(err);

        setError(
          "Backend tidak dapat dihubungi. Pastikan FastAPI berjalan di port 8000."
        );
      } finally {
        setLoadingScenarios(false);
      }
    }

    loadScenarios();
  }, []);

  /* =======================================================
     RUN ANALYSIS
  ======================================================= */

  async function runAnalysis() {
    if (!selectedScenario) {
      return;
    }

    setAnalyzing(true);
    setError("");
    setResult(null);

    try {
      const scenarioResponse =
        await fetch(
          `${API_URL}/api/v1/scenarios/${selectedScenario}`
        );

      if (!scenarioResponse.ok) {
        throw new Error(
          "Failed to load selected scenario"
        );
      }

      const scenario =
        await scenarioResponse.json();

      if (
        Array.isArray(scenario.readings)
      ) {
        setSelectedReadings(
          scenario.readings
        );
      } else {
        setSelectedReadings([]);
      }

      const payload = {
        shipment_id: scenario.id,
        cargo_profile:
          scenario.cargo_profile,
        readings: scenario.readings,
      };

      const analysisResponse =
        await fetch(
          `${API_URL}/api/v1/analyze`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

      const data =
        await analysisResponse.json();

      if (!analysisResponse.ok) {
        throw new Error(
          data.detail ||
            "Analysis request failed"
        );
      }

      setResult(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat melakukan analisis."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  /* =======================================================
     CSV IMPORT
  ======================================================= */

  function handleCSVImport(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setCsvName(file.name);

    const reader = new FileReader();

    reader.onload = () => {
      const text =
        String(reader.result || "");

      const lines = text
        .split(/\r?\n/)
        .filter(Boolean);

      if (lines.length < 2) {
        return;
      }

      const headers =
        lines[0]
          .split(",")
          .map((header) =>
            header
              .trim()
              .replace(/^"|"$/g, "")
          );

      const vehicleIndex =
        headers.findIndex(
          (header) =>
            header.toLowerCase() ===
              "vehicle_id" ||
            header.toLowerCase() ===
              "vehicleid"
        );

      if (vehicleIndex !== -1) {
        const values =
          lines[1]
            .split(",")
            .map((value) =>
              value
                .trim()
                .replace(/^"|"$/g, "")
            );

        if (values[vehicleIndex]) {
          setVehicleId(
            values[vehicleIndex]
          );
        }
      }
    };

    reader.readAsText(file);

    event.target.value = "";
  }

  const selected = scenarios.find(
    (scenario) =>
      scenario.id === selectedScenario
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 xl:h-screen xl:overflow-hidden">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="h-[76px] border-b bg-white">
        <div className="flex h-full items-center justify-between px-6 lg:px-8">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Truck size={20} />
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                ColdTrack AI
              </h1>

              <p className="text-xs text-slate-500">
                Cold Chain Early Warning System
              </p>
            </div>

          </div>

          <div className="flex items-center gap-2">

            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">

              <FileUp size={15} />

              Import CSV

              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleCSVImport}
              />

            </label>

            <button
              onClick={runAnalysis}
              disabled={
                analyzing ||
                loadingScenarios ||
                !selectedScenario ||
                !backendOnline
              }
              className="flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >

              {analyzing ? (
                <>
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />

                  Analyzing
                </>
              ) : (
                <>
                  <Play size={15} />

                  Run Analysis
                </>
              )}

            </button>

            <div
              className={`ml-2 flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold ${
                backendOnline
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >

              <span
                className={`h-2 w-2 rounded-full ${
                  backendOnline
                    ? "bg-emerald-500"
                    : "bg-red-500"
                }`}
              />

              {backendOnline
                ? "System Active"
                : "Backend Offline"}

            </div>

          </div>

        </div>
      </header>

      {/* =====================================================
          MAIN
      ====================================================== */}

      <div className="w-full px-6 py-4 lg:px-8">

        {/* =================================================
            TITLE
        ================================================== */}

        <section className="mb-3 flex items-end justify-between">

          <div className="min-w-0">

            <div className="mb-0.5 flex items-center gap-2">

              <span className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                OPERATIONS DASHBOARD
              </span>

              {result && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500">
                  ANALYSIS COMPLETE
                </span>
              )}

            </div>

            <h2 className="text-[28px] font-bold leading-tight tracking-tight">
              Perjalanan & Analisis
            </h2>

            <p className="mt-1 text-base text-slate-500">
              Monitor perjalanan cold chain dan jalankan analisis AI.
            </p>

          </div>

          <div className="hidden text-right lg:block">

            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Vehicle
            </p>

            <p className="text-sm font-bold">
              {vehicleId}
            </p>

          </div>

        </section>

        {/* =================================================
            DATA PERJALANAN + KPI
        ================================================== */}

        <section className="mb-3 grid gap-3 xl:grid-cols-[1.35fr_0.8fr_0.8fr_0.8fr]">

          {/* DATA PERJALANAN */}

          <div className="rounded-xl border bg-white p-3 shadow-sm">

            <div className="mb-2 flex items-center gap-2">

              <CloudCog size={17} />

              <h3 className="text-sm font-bold">
                Data Perjalanan
              </h3>

            </div>

            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Scenario
            </label>

            <select
              value={selectedScenario}
              onChange={(event) => {
                setSelectedScenario(
                  event.target.value
                );

                setResult(null);
                setSelectedReadings([]);
              }}
              disabled={loadingScenarios}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium outline-none transition focus:border-slate-400"
            >
              {loadingScenarios ? (
                <option>
                  Loading scenarios...
                </option>
              ) : (
                scenarios.map(
                  (scenario) => (
                    <option
                      key={scenario.id}
                      value={scenario.id}
                    >
                      {scenario.title}
                    </option>
                  )
                )
              )}
            </select>

            <div className="mt-2 flex items-center gap-2">

              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600">
                Vehicle: {vehicleId}
              </span>

              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600">
                {selected?.cargo_profile || "—"}
              </span>

            </div>

          </div>

          {/* STATUS */}

          <div className="rounded-xl border bg-white p-3 shadow-sm">

            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Status Perjalanan
            </p>

            {result ? (
              <>
                <div
                  className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${statusClass(
                    result.status
                  )}`}
                >
                  {statusIcon(
                    result.status
                  )}

                  {result.status}
                </div>
              </>
            ) : (
              <p className="mt-3 text-base font-semibold text-slate-400">
                Ready
              </p>
            )}

          </div>

          {/* RISK */}

          <div className="rounded-xl border bg-white p-3 shadow-sm">

            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Risk Index
            </p>

            {result ? (
              <>
                <p className="mt-1 text-[30px] font-bold leading-none">
                  {(
                    result.risk_index *
                    100
                  ).toFixed(1)}

                  <span className="text-base text-slate-400">
                    %
                  </span>
                </p>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">

                  <div
                    className="h-full rounded-full bg-slate-800"
                    style={{
                      width: `${Math.min(
                        result.risk_index *
                          100,
                        100
                      )}%`,
                    }}
                  />

                </div>
              </>
            ) : (
              <p className="mt-3 text-base font-semibold text-slate-400">
                —
              </p>
            )}

          </div>

          {/* BREACH */}

          <div className="rounded-xl border bg-white p-3 shadow-sm">

            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Time to Breach
            </p>

            {result ? (
              <>
                <p className="mt-1 text-[30px] font-bold leading-none">
                  {result.time_to_breach_min !==
                  null
                    ? result.time_to_breach_min
                    : "—"}

                  {result.time_to_breach_min !==
                    null && (
                    <span className="ml-1 text-sm font-medium text-slate-400">
                      min
                    </span>
                  )}
                </p>

                <p className="mt-2 text-[10px] text-slate-400">
                  Estimasi mencapai batas suhu
                </p>
              </>
            ) : (
              <p className="mt-3 text-base font-semibold text-slate-400">
                —
              </p>
            )}

          </div>

        </section>

        {/* =================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">

            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={15} />
              Error
            </div>

            <p className="mt-0.5 text-xs">
              {error}
            </p>

          </div>
        )}

        {/* =================================================
            RESULT AREA
        ================================================== */}

        {result && (
          <div className="grid gap-3">

            {/* =============================================
                CHART + MAP
            ============================================== */}

            <section className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">

              {/* TEMPERATURE */}

              <div className="rounded-xl border bg-white p-4 shadow-sm">

                <div className="mb-3 flex items-center justify-between">

                  <div>

                    <div className="flex items-center gap-2">

                      <Thermometer size={18} />

                      <h3 className="text-base font-bold">
                        Temperature Monitoring
                      </h3>

                    </div>

                    <p className="mt-0.5 text-sm text-slate-500">
                      Actual telemetry dan forecast temperatur
                    </p>

                  </div>

                  <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                    {selectedReadings.length} points
                  </span>

                </div>

                <div className="h-[280px]">

                  <TemperatureChart
                    readings={selectedReadings}
                    forecast={result.forecast}
                  />

                </div>

              </div>

              {/* VEHICLE TRACKING */}

              <div className="rounded-xl border bg-white p-4 shadow-sm">

                <div className="mb-3 flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <MapPin size={18} />

                    <div>

                      <h3 className="text-base font-bold">
                        Vehicle Tracking
                      </h3>

                      <p className="text-sm text-slate-500">
                        Monitoring posisi kendaraan
                      </p>

                    </div>

                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    ● In Transit
                  </span>

                </div>

                <div className="relative h-[220px] overflow-hidden rounded-xl bg-slate-100">

                  {/* MAP BACKGROUND */}

                  <div className="absolute inset-0">

                    <div className="absolute left-[15%] top-0 h-full w-px bg-slate-200" />

                    <div className="absolute left-[35%] top-0 h-full w-px bg-slate-200" />

                    <div className="absolute left-[55%] top-0 h-full w-px bg-slate-200" />

                    <div className="absolute left-[75%] top-0 h-full w-px bg-slate-200" />

                    <div className="absolute left-0 top-[25%] h-px w-full bg-slate-200" />

                    <div className="absolute left-0 top-[50%] h-px w-full bg-slate-200" />

                    <div className="absolute left-0 top-[75%] h-px w-full bg-slate-200" />

                  </div>

                  <svg
                    viewBox="0 0 600 300"
                    className="absolute inset-0 h-full w-full"
                    preserveAspectRatio="none"
                  >

                    <path
                      d="M45 250 C120 220, 150 100, 245 140 S400 220, 550 50"
                      fill="none"
                      stroke="#cbd5e1"
                      strokeWidth="22"
                    />

                    <path
                      d="M45 250 C120 220, 150 100, 245 140 S400 220, 550 50"
                      fill="none"
                      stroke="white"
                      strokeWidth="10"
                    />

                  </svg>

                  {/* ORIGIN */}

                  <div className="absolute bottom-7 left-5">

                    <div className="h-3 w-3 rounded-full bg-slate-900 ring-4 ring-white" />

                    <p className="mt-1 text-xs font-bold text-slate-700">
                      Bandung
                    </p>

                  </div>

                  {/* VEHICLE */}

                  <div className="absolute left-[56%] top-[47%]">

                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg ring-4 ring-white">

                      <Truck size={16} />

                    </div>

                    <div className="mt-1 rounded-md bg-white px-2 py-1 text-[10px] font-bold shadow-sm">
                      {vehicleId}
                    </div>

                  </div>

                  {/* DESTINATION */}

                  <div className="absolute right-5 top-6">

                    <div className="h-3 w-3 rounded-full bg-slate-900 ring-4 ring-white" />

                    <p className="mt-1 text-xs font-bold text-slate-700">
                      Malang
                    </p>

                  </div>

                </div>

                <div className="mt-3 grid grid-cols-3 gap-3">

                  <div>

                    <p className="text-xs text-slate-400">
                      Vehicle
                    </p>

                    <p className="text-sm font-bold">
                      {vehicleId}
                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-slate-400">
                      Route
                    </p>

                    <p className="text-sm font-bold">
                      Bandung → Malang
                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-slate-400">
                      Status
                    </p>

                    <p className="text-sm font-bold text-emerald-600">
                      Active
                    </p>

                  </div>

                </div>

              </div>

            </section>

            {/* =============================================
                LOWER ANALYSIS
            ============================================== */}

            <section className="grid gap-3 xl:grid-cols-[1fr_1fr]">

              {/* DRIVERS */}

              <div className="rounded-xl border bg-white p-4 shadow-sm">

                <div className="mb-3 flex items-center justify-between">

                  <div>

                    <h3 className="text-base font-bold">
                      Feature Drivers
                    </h3>

                    <p className="mt-0.5 text-sm text-slate-500">
                      Faktor yang berkontribusi terhadap hasil analisis.
                    </p>

                  </div>

                  <Activity
                    size={17}
                    className="text-slate-300"
                  />

                </div>

                <div className="grid gap-2">

                  {result.drivers.map(
                    (driver, index) => (
                      <div
                        key={`${driver.feature}-${index}`}
                        className="rounded-lg bg-slate-50 px-3 py-2.5"
                      >

                        <div className="flex items-center justify-between">

                          <span className="text-sm font-semibold capitalize">
                            {formatLabel(
                              driver.feature
                            )}
                          </span>

                          <span className="text-sm font-bold">
                            {(
                              driver.contribution *
                              100
                            ).toFixed(1)}
                            %
                          </span>

                        </div>

                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">

                          <div
                            className="h-full rounded-full bg-slate-800"
                            style={{
                              width: `${
                                driver.contribution *
                                100
                              }%`,
                            }}
                          />

                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          {driver.value}
                        </p>

                      </div>
                    )
                  )}

                </div>

              </div>

              {/* ACTIONS */}

              <div className="rounded-xl border bg-white p-4 shadow-sm">

                <div className="mb-3 flex items-center justify-between">

                  <div>

                    <h3 className="text-base font-bold">
                      Recommended Actions
                    </h3>

                    <p className="mt-0.5 text-sm text-slate-500">
                      Tindakan prioritas berdasarkan kondisi perjalanan.
                    </p>

                  </div>

                  <CheckCircle2
                    size={17}
                    className="text-slate-300"
                  />

                </div>

                <div className="space-y-2">

                  {result.actions.map(
                    (action) => (
                      <div
                        key={action.priority}
                        className="flex gap-3 rounded-lg bg-slate-50 p-3"
                      >

                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                          {action.priority}
                        </div>

                        <div className="min-w-0">

                          <p className="text-sm font-medium leading-5">
                            {action.text}
                          </p>

                          {action.eta_min !==
                            null && (
                            <p className="mt-0.5 text-xs text-slate-400">
                              Target response:{" "}
                              {
                                action.eta_min
                              }{" "}
                              min
                            </p>
                          )}

                        </div>

                      </div>
                    )
                  )}

                </div>

              </div>

            </section>

            {/* =============================================
                AI SUMMARY
            ============================================== */}

            <section className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr]">

              <div className="rounded-xl border bg-white p-4 shadow-sm">

                <div className="mb-3 flex items-center gap-2">

                  <Activity size={17} />

                  <h3 className="text-base font-bold">
                    AI Assessment
                  </h3>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-sm text-slate-500">
                    Status
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(
                      result.status
                    )}`}
                  >
                    {result.status}
                  </span>

                </div>

                <div className="mt-3 flex items-center justify-between">

                  <span className="text-sm text-slate-500">
                    Failure Mode
                  </span>

                  <span className="text-sm font-bold capitalize">
                    {formatLabel(
                      result.failure_mode.label
                    )}
                  </span>

                </div>

              </div>

              <div className="rounded-xl border bg-white p-4 shadow-sm">

                <div className="mb-3 flex items-center gap-2">

                  <Thermometer size={17} />

                  <h3 className="text-base font-bold">
                    Temperature Forecast
                  </h3>

                </div>

                <div className="grid grid-cols-3 gap-2">

                  {[
                    [
                      "+15 min",
                      result.forecast.t15,
                    ],
                    [
                      "+30 min",
                      result.forecast.t30,
                    ],
                    [
                      "+60 min",
                      result.forecast.t60,
                    ],
                  ].map(
                    ([label, value]) => (
                      <div
                        key={String(label)}
                        className="rounded-lg bg-slate-50 p-3 text-center"
                      >

                        <p className="text-xs text-slate-400">
                          {label}
                        </p>

                        <p className="mt-1 text-xl font-bold">
                          {Number(
                            value
                          ).toFixed(1)}

                          <span className="text-xs text-slate-400">
                            °C
                          </span>
                        </p>

                      </div>
                    )
                  )}

                </div>

              </div>

              <div className="rounded-xl border bg-white p-4 shadow-sm">

                <div className="mb-3 flex items-center gap-2">

                  <Zap size={17} />

                  <h3 className="text-base font-bold">
                    Model Information
                  </h3>

                </div>

                <p className="truncate text-sm font-bold">
                  {result.model_version}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Inference time:{" "}
                  <span className="font-semibold text-slate-700">
                    {result.inference_ms} ms
                  </span>
                </p>

              </div>

            </section>

          </div>
        )}

        {/* =====================================================
            EMPTY / LOADING
        ====================================================== */}

        {!result &&
          !analyzing &&
          !error && (
            <section className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed bg-white">

              <div className="text-center">

                <Activity
                  size={32}
                  className="mx-auto mb-3 text-slate-300"
                />

                <h3 className="text-base font-semibold">
                  Belum ada hasil analisis
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Pilih scenario lalu tekan Run Analysis.
                </p>

              </div>

            </section>
          )}

        {analyzing && (
          <section className="flex min-h-[420px] items-center justify-center rounded-xl border bg-white">

            <div className="text-center">

              <Loader2
                size={32}
                className="mx-auto mb-3 animate-spin text-slate-700"
              />

              <h3 className="text-base font-semibold">
                AI sedang menganalisis perjalanan
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Telemetry sedang diproses oleh FastAPI backend.
              </p>

            </div>

          </section>
        )}

      </div>
    </main>
  );
}