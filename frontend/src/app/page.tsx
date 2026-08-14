"use client";

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  AlertTriangle,
  Apple,
  Beef,
  CheckCircle2,
  CloudCog,
  FileUp,
  Fish,
  Gauge,
  Loader2,
  MapPin,
  Milk,
  Package,
  Play,
  Syringe,
  Thermometer,
  Timer,
  TrendingUp,
  Truck,
  Zap,
} from "lucide-react";

// Leaflet touches `window` on import, so it can only load in the browser.
const RouteMap = dynamic(() => import("@/components/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-xl bg-sky-50 text-sm font-medium text-slate-400">
      Memuat peta...
    </div>
  ),
});

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// Mirrors backend/config.yaml `cargo_profiles` — kept static per the MVP's
// "parameter statis saat demo" constraint, no endpoint exposes this yet.
const CARGO_LIMITS: Record<
  string,
  { min_temp_c: number; max_temp_c: number; critical_temp_c: number }
> = {
  vaksin_2_8C: { min_temp_c: 2.0, max_temp_c: 8.0, critical_temp_c: 10.0 },
  "daging_beku_-18C": {
    min_temp_c: -25.0,
    max_temp_c: -18.0,
    critical_temp_c: -12.0,
  },
  buah_segar_2_4C: { min_temp_c: 2.0, max_temp_c: 4.0, critical_temp_c: 6.0 },
  ikan_segar_0_5C: { min_temp_c: 0.0, max_temp_c: 5.0, critical_temp_c: 8.0 },
  produk_susu_2_4C: {
    min_temp_c: 2.0,
    max_temp_c: 4.0,
    critical_temp_c: 6.0,
  },
};

const DEFAULT_CARGO_LIMITS = CARGO_LIMITS.vaksin_2_8C;

const CARGO_PROFILE_LABELS: Record<string, string> = {
  vaksin_2_8C: "Vaksin & Produk Biologis (2 - 8°C)",
  "daging_beku_-18C": "Daging & Makanan Beku (-25 – -18°C)",
  buah_segar_2_4C: "Buah & Sayur Segar (2 - 4°C)",
  ikan_segar_0_5C: "Ikan Segar (0 - 5°C)",
  produk_susu_2_4C: "Produk Susu (2 - 4°C)",
};

const MIN_ANALYZE_READINGS = 60;

// Mirrors backend/config.yaml `model.ttb_display_cap_min` — model_card.md
// section "Limitations #1": MAE balloons past this horizon, so an exact
// countdown beyond it would overstate precision the model doesn't have.
const TTB_DISPLAY_CAP_MIN = 30;

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

/* =========================================================
   COLD CHAIN DECOR
   Hand-drawn inline SVG rather than bitmap assets: no external
   files to license or ship, and it stays crisp at any size.
========================================================= */

// Fixed (not random) so server and client render identically — Math.random()
// here would cause a hydration mismatch.
const SNOWFLAKES = [
  { left: "2%", size: 30, dur: 17, delay: 0, drift: 44, opacity: 0.5 },
  { left: "7%", size: 19, dur: 22, delay: 7, drift: -30, opacity: 0.4 },
  { left: "12%", size: 38, dur: 26, delay: 3, drift: 56, opacity: 0.45 },
  { left: "18%", size: 23, dur: 19, delay: 11, drift: -38, opacity: 0.42 },
  { left: "24%", size: 32, dur: 28, delay: 1, drift: 34, opacity: 0.36 },
  { left: "30%", size: 42, dur: 21, delay: 14, drift: -50, opacity: 0.4 },
  { left: "36%", size: 21, dur: 24, delay: 5, drift: 38, opacity: 0.46 },
  { left: "42%", size: 34, dur: 18, delay: 9, drift: -32, opacity: 0.42 },
  { left: "48%", size: 26, dur: 27, delay: 2, drift: 48, opacity: 0.38 },
  { left: "54%", size: 40, dur: 23, delay: 12, drift: -44, opacity: 0.4 },
  { left: "60%", size: 20, dur: 20, delay: 16, drift: 30, opacity: 0.44 },
  { left: "66%", size: 31, dur: 25, delay: 4, drift: -36, opacity: 0.46 },
  { left: "71%", size: 24, dur: 18, delay: 10, drift: 42, opacity: 0.4 },
  { left: "77%", size: 36, dur: 29, delay: 6, drift: -28, opacity: 0.37 },
  { left: "82%", size: 22, dur: 22, delay: 13, drift: 50, opacity: 0.45 },
  { left: "87%", size: 44, dur: 20, delay: 8, drift: -40, opacity: 0.38 },
  { left: "92%", size: 27, dur: 26, delay: 15, drift: 32, opacity: 0.43 },
  { left: "97%", size: 33, dur: 19, delay: 3, drift: -46, opacity: 0.47 },
];

function SnowflakeGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0ea5e9"
      strokeWidth="1.9"
      strokeLinecap="round"
    >
      <path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1" />
      <path d="M12 6l-2.2-2.2M12 6l2.2-2.2M12 18l-2.2 2.2M12 18l2.2 2.2M6 12l-2.2-2.2M6 12l-2.2 2.2M18 12l2.2-2.2M18 12l2.2 2.2" />
    </svg>
  );
}

function Snowfall() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {SNOWFLAKES.map((flake, index) => (
        <span
          key={index}
          className="coldtrack-snowflake"
          style={{
            left: flake.left,
            opacity: flake.opacity,
            animationDuration: `${flake.dur}s`,
            animationDelay: `-${flake.delay}s`,
            ["--snow-drift" as string]: `${flake.drift}px`,
            ["--snow-spin" as string]: `${flake.drift > 0 ? 300 : -300}deg`,
          }}
        >
          <SnowflakeGlyph size={flake.size} />
        </span>
      ))}
    </div>
  );
}

// Animates a number from 0 to `value` once results land. Purely presentational.
function useCountUp(value: number | null, duration = 900) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === null) {
      setDisplay(0);
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // ease-out so it decelerates into the final number
      setDisplay(value * (1 - Math.pow(1 - t, 3)));

      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return display;
}

function routePoints(readings: Reading[]) {
  return readings
    .map((r) => ({
      lat: numberFromValue(r.lat),
      lon: numberFromValue(r.lon),
    }))
    .filter(
      (p): p is { lat: number; lon: number } =>
        p.lat !== null && p.lon !== null
    );
}

// Label the route from the telemetry itself rather than hardcoding city names.
const CITIES: { name: string; lat: number; lon: number }[] = [
  { name: "Jakarta", lat: -6.2088, lon: 106.8456 },
  { name: "Bandung", lat: -6.9175, lon: 107.6191 },
  { name: "Semarang", lat: -6.9667, lon: 110.4167 },
  { name: "Yogyakarta", lat: -7.7956, lon: 110.3695 },
  { name: "Surabaya", lat: -7.2575, lon: 112.7521 },
  { name: "Malang", lat: -7.9666, lon: 112.6326 },
  { name: "Medan", lat: 3.5952, lon: 98.6722 },
  { name: "Makassar", lat: -5.1477, lon: 119.4327 },
];

function nearestCity(lat: number, lon: number) {
  let best = CITIES[0];
  let bestDist = Infinity;

  for (const city of CITIES) {
    const d =
      Math.pow(city.lat - lat, 2) + Math.pow(city.lon - lon, 2);

    if (d < bestDist) {
      bestDist = d;
      best = city;
    }
  }

  // ~0.5 degrees ≈ 55 km; beyond that don't claim a city name.
  return bestDist <= 0.25 ? best.name : null;
}

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

// Glow applied to the whole header bar so the dashboard visibly "reacts"
// when a risky scenario is analysed.
function statusGlowClass(status?: string) {
  switch (status) {
    case "WASPADA":
      return "ring-amber-300/60 shadow-[0_0_38px_-6px_rgba(245,158,11,0.55)]";

    case "KRITIS":
      return "ring-red-400/70 shadow-[0_0_44px_-4px_rgba(239,68,68,0.65)]";

    case "AMAN":
      return "ring-emerald-300/50 shadow-[0_0_32px_-8px_rgba(16,185,129,0.45)]";

    default:
      return "ring-sky-950/40 shadow-lg";
  }
}

function statusTextClass(status?: string) {
  switch (status) {
    case "AMAN":
      return "text-emerald-300";

    case "WASPADA":
      return "text-amber-300";

    case "KRITIS":
      return "text-red-300";

    default:
      return "text-sky-200";
  }
}

function statusIcon(status?: string) {
  if (status === "AMAN") {
    return <CheckCircle2 size={16} />;
  }

  return <AlertTriangle size={16} />;
}

function cargoIcon(profile: string | undefined, size: number) {
  switch (profile) {
    case "vaksin_2_8C":
      return <Syringe size={size} />;

    case "daging_beku_-18C":
      return <Beef size={size} />;

    case "buah_segar_2_4C":
      return <Apple size={size} />;

    case "ikan_segar_0_5C":
      return <Fish size={size} />;

    case "produk_susu_2_4C":
      return <Milk size={size} />;

    default:
      return <Package size={size} />;
  }
}

function formatLabel(label: string) {
  return label.replaceAll("_", " ");
}

function buildAiSummary(
  result: AnalyzeResponse,
  vehicleId: string,
  currentTemp: number | null
): { current: string; outlook: string } {
  const riskPct = Math.round(result.risk_index * 100);
  const confPct = Math.round(result.failure_mode.confidence * 100);
  const isHealthy = result.failure_mode.label === "normal_sehat";
  const topDriver = result.drivers[0];

  let current = `${vehicleId} berstatus ${result.status} dengan indeks risiko ${riskPct}%. Model mendiagnosis kondisi sebagai "${formatLabel(
    result.failure_mode.label
  )}" dengan keyakinan ${confPct}%.`;

  if (topDriver) {
    current += ` Faktor pendorong utama: ${formatLabel(
      topDriver.feature
    )} (${topDriver.value}).`;
  }

  let outlook: string;

  if (isHealthy) {
    outlook = `Tren suhu 60 menit ke depan diperkirakan tetap stabil di sekitar ${result.forecast.t60.toFixed(
      1
    )}°C, berada dalam pita aman kargo.`;
  } else if (
    result.time_to_breach_min !== null &&
    result.time_to_breach_min <= TTB_DISPLAY_CAP_MIN
  ) {
    outlook = `Jika tren saat ini berlanjut, suhu diperkirakan melewati ambang batas dalam ±${result.time_to_breach_min} menit — segera jalankan langkah prioritas pertama di panel tindakan.`;
  } else {
    outlook =
      "Proyeksi jangka panjang belum presisi di luar horizon 30 menit (keterbatasan model); pantau tren suhu secara berkala dan waspadai perubahan mendadak.";
  }

  if (currentTemp !== null) {
    const delta = result.forecast.t60 - currentTemp;

    if (Math.abs(delta) >= 0.3) {
      outlook += ` Arah tren: ${
        delta > 0 ? "naik" : "turun"
      } ${Math.abs(delta).toFixed(1)}°C dari suhu saat ini.`;
    }
  }

  return { current, outlook };
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
   CSV IMPORT
========================================================= */

const CSV_FIELD_ALIASES: Record<string, string[]> = {
  ts: ["ts", "timestamp", "time", "datetime"],
  temp_c: ["temp_c", "temperature_c", "temperature", "temp", "suhu", "suhu_c"],
  humidity: ["humidity", "kelembaban", "humidity_pct", "rh"],
  ambient_c: ["ambient_c", "ambient_temp_c", "ambient", "suhu_ambien"],
  door_open: ["door_open", "pintu_terbuka", "door"],
  reefer_on: ["reefer_on", "reefer", "reefer_aktif"],
  lat: ["lat", "latitude"],
  lon: ["lon", "lng", "longitude"],
  speed_kmh: ["speed_kmh", "speed", "kecepatan"],
  harsh_events: ["harsh_events", "harsh", "kejadian_kasar"],
  solar_radiation: ["solar_radiation", "solar", "radiasi_matahari"],
};

function parseCSVRow(line: string): string[] {
  return line
    .split(",")
    .map((value) => value.trim().replace(/^"|"$/g, ""));
}

function numOr(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolOr(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "ya"
  );
}

function parseCSVReadings(
  text: string
): { readings: Reading[]; vehicleId?: string } | { error: string } {
  const lines = text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return { error: "File CSV kosong atau tidak memiliki baris data." };
  }

  const headers = parseCSVRow(lines[0]).map((header) =>
    header.toLowerCase()
  );

  const columnIndex: Record<string, number> = {};

  for (const [field, aliases] of Object.entries(CSV_FIELD_ALIASES)) {
    const index = headers.findIndex((header) =>
      aliases.includes(header)
    );

    if (index !== -1) {
      columnIndex[field] = index;
    }
  }

  if (columnIndex.temp_c === undefined) {
    return {
      error:
        "Kolom suhu (mis. temp_c / temperature_c / suhu) tidak ditemukan di CSV.",
    };
  }

  const vehicleIndex = headers.findIndex(
    (header) => header === "vehicle_id" || header === "vehicleid"
  );

  const rows = lines.slice(1).map(parseCSVRow);

  if (rows.length < MIN_ANALYZE_READINGS) {
    return {
      error: `Minimal ${MIN_ANALYZE_READINGS} baris data diperlukan untuk analisis, CSV ini berisi ${rows.length} baris.`,
    };
  }

  const readings: Reading[] = rows.map((cols, index) => {
    const get = (field: string) =>
      columnIndex[field] !== undefined
        ? cols[columnIndex[field]]
        : undefined;

    const tempC = numOr(get("temp_c"), 0);
    const latRaw = get("lat");
    const lonRaw = get("lon");

    return {
      ts:
        get("ts") ||
        new Date(
          Date.now() - (rows.length - index) * 60000
        ).toISOString(),
      temp_c: tempC,
      humidity: numOr(get("humidity"), 50),
      ambient_c: numOr(get("ambient_c"), tempC),
      door_open: boolOr(get("door_open"), false),
      reefer_on: boolOr(get("reefer_on"), true),
      lat: latRaw ? numOr(latRaw, 0) : null,
      lon: lonRaw ? numOr(lonRaw, 0) : null,
      speed_kmh: numOr(get("speed_kmh"), 0),
      harsh_events: numOr(get("harsh_events"), 0),
      solar_radiation: numOr(get("solar_radiation"), 0),
    };
  });

  const vehicleId =
    vehicleIndex !== -1 ? rows[0][vehicleIndex] : undefined;

  return { readings, vehicleId };
}

/* =========================================================
   CHART SIZING
========================================================= */

// Charts are drawn at the container's real pixel size so one SVG unit stays
// one pixel. Stretching a fixed viewBox with preserveAspectRatio="none"
// distorts strokes and text, which is why labels looked squashed.
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  const [size, setSize] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;

      if (rect) {
        setSize({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

/* =========================================================
   TEMPERATURE CHART
========================================================= */

function TemperatureChart({
  readings,
  forecast,
  limits,
}: {
  readings: Reading[];
  forecast: AnalyzeResponse["forecast"];
  limits: { min_temp_c: number; max_temp_c: number; critical_temp_c: number };
}) {
  const { ref, size } = useElementSize<HTMLDivElement>();

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
      <div
        ref={ref}
        className="flex h-full items-center justify-center rounded-xl bg-slate-50"
      >
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
    limits.min_temp_c,
    limits.max_temp_c,
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

  const width = size.width || 900;
  const height = size.height || 300;

  const left = 58;
  const right = 22;
  const top = 20;
  const bottom = 34;

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

  const clampY = (value: number) =>
    Math.min(
      height - bottom,
      Math.max(top, yTemp(value))
    );

  const bandTopY = clampY(limits.max_temp_c);
  const bandBottomY = clampY(limits.min_temp_c);

  const showCritical =
    limits.critical_temp_c > minTemp &&
    limits.critical_temp_c < maxTemp;

  const criticalY = clampY(limits.critical_temp_c);

  return (
    <div
      ref={ref}
      className="relative h-full w-full overflow-hidden rounded-xl bg-white"
    >
      <div className="absolute right-3 top-2 z-10 flex items-center gap-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-900" />
          Actual
        </span>

        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
          Forecast
        </span>

        <span className="flex items-center gap-1.5 text-emerald-700">
          <span className="h-2.5 w-2.5 rounded-sm border border-emerald-500 bg-emerald-100" />
          Ambang aman
        </span>
      </div>

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block"
      >
        <rect
          x={left}
          y={bandTopY}
          width={width - left - right}
          height={Math.max(bandBottomY - bandTopY, 0)}
          fill="#10b981"
          fillOpacity="0.13"
        />

        {/* Explicit band edges — the fill alone is too faint to read as a
            threshold, especially when it spans most of the plot. */}
        {[
          { y: bandTopY, value: limits.max_temp_c },
          { y: bandBottomY, value: limits.min_temp_c },
        ].map((edge) => (
          <g key={`edge-${edge.value}`}>
            <line
              x1={left}
              y1={edge.y}
              x2={width - right}
              y2={edge.y}
              stroke="#059669"
              strokeWidth="2"
              strokeDasharray="7 4"
            />

            <text
              x={width - right - 6}
              y={edge.y - 6}
              textAnchor="end"
              fontSize="13"
              fontWeight="700"
              fill="#047857"
            >
              {edge.value.toFixed(1)}°
            </text>
          </g>
        ))}

        {grid.map((line, index) => (
          <g key={index}>
            <line
              x1={left}
              y1={line.y}
              x2={width - right}
              y2={line.y}
              stroke="#cbd5e1"
              strokeWidth="1"
            />

            <text
              x={left - 9}
              y={line.y + 5}
              textAnchor="end"
              fontSize="15"
              fontWeight="700"
              fill="#1e293b"
            >
              {line.value.toFixed(1)}°
            </text>
          </g>
        ))}

        {showCritical && (
          <g>
            <line
              x1={left}
              y1={criticalY}
              x2={width - right}
              y2={criticalY}
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            <text
              x={width - right - 4}
              y={criticalY - 6}
              textAnchor="end"
              fontSize="12"
              fill="#ef4444"
            >
              Kritis {limits.critical_temp_c.toFixed(1)}°
            </text>
          </g>
        )}

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
          stroke="#0c4a6e"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="coldtrack-draw"
          style={{
            strokeDasharray: 6000,
            strokeDashoffset: 6000,
          }}
        />

        <path
          d={forecastPath}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="coldtrack-draw-delayed"
          style={{
            strokeDasharray: 2000,
            strokeDashoffset: 2000,
          }}
        />

        <circle
          cx={actualEndX}
          cy={actualEndY}
          r="5"
          fill="#0c4a6e"
        />

        <circle
          cx={forecastX1}
          cy={yTemp(forecast.t15)}
          r="5"
          fill="white"
          stroke="#38bdf8"
          strokeWidth="2"
          className="coldtrack-fade-in"
        />

        <circle
          cx={forecastX2}
          cy={yTemp(forecast.t30)}
          r="5"
          fill="white"
          stroke="#38bdf8"
          strokeWidth="2"
          className="coldtrack-fade-in"
        />

        <circle
          cx={forecastX3}
          cy={yTemp(forecast.t60)}
          r="5"
          fill="white"
          stroke="#38bdf8"
          strokeWidth="2"
          className="coldtrack-fade-in"
        />

        <text
          x={left}
          y={height - 11}
          fontSize="14"
          fontWeight="600"
          fill="#334155"
        >
          Start
        </text>

        <text
          x={forecastX1}
          y={height - 11}
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill="#334155"
        >
          +15m
        </text>

        <text
          x={forecastX2}
          y={height - 11}
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill="#334155"
        >
          +30m
        </text>

        <text
          x={forecastX3}
          y={height - 11}
          textAnchor="end"
          fontSize="14"
          fontWeight="600"
          fill="#334155"
        >
          +60m
        </text>
      </svg>
    </div>
  );
}

/* =========================================================
   FORECAST CHART (t15 / t30 / t60 mini trend)
========================================================= */

function ForecastChart({
  currentTemp,
  forecast,
}: {
  currentTemp: number;
  forecast: AnalyzeResponse["forecast"];
}) {
  const { ref, size } = useElementSize<HTMLDivElement>();

  const points = [
    { label: "Sekarang", value: currentTemp },
    { label: "+15m", value: forecast.t15 },
    { label: "+30m", value: forecast.t30 },
    { label: "+60m", value: forecast.t60 },
  ];

  const values = points.map((point) => point.value);

  let minTemp = Math.min(...values);
  let maxTemp = Math.max(...values);

  if (minTemp === maxTemp) {
    minTemp -= 1;
    maxTemp += 1;
  }

  const margin = Math.max((maxTemp - minTemp) * 0.25, 0.5);

  minTemp -= margin;
  maxTemp += margin;

  const width = size.width || 400;
  const height = size.height || 220;

  const left = 34;
  const right = 26;
  const top = 26;
  const bottom = 24;

  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  const x = (index: number) =>
    left + (index / (points.length - 1)) * plotWidth;

  const y = (value: number) =>
    top + ((maxTemp - value) / (maxTemp - minTemp)) * plotHeight;

  const linePath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${x(index)} ${y(point.value)}`
    )
    .join(" ");

  const areaPath = `${linePath} L ${x(points.length - 1)} ${
    height - bottom
  } L ${x(0)} ${height - bottom} Z`;

  return (
    <div ref={ref} className="h-full w-full">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block"
      >
        <defs>
          <linearGradient
            id="forecastFill"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#3b82f6"
              stopOpacity="0.22"
            />
            <stop
              offset="100%"
              stopColor="#3b82f6"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#forecastFill)" />

        <path
          d={linePath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="coldtrack-draw"
          style={{
            strokeDasharray: 2000,
            strokeDashoffset: 2000,
          }}
        />

        {points.map((point, index) => (
          <g key={point.label} className="coldtrack-fade-in">
            <circle
              cx={x(index)}
              cy={y(point.value)}
              r="4"
              fill="#fff"
              stroke="#3b82f6"
              strokeWidth="2"
            />

            <text
              x={x(index)}
              y={y(point.value) - 10}
              textAnchor={
                index === 0
                  ? "start"
                  : index === points.length - 1
                  ? "end"
                  : "middle"
              }
              fontSize="14"
              fontWeight="700"
              fill="#0c4a6e"
            >
              {point.value.toFixed(1)}°
            </text>

            <text
              x={x(index)}
              y={height - 8}
              textAnchor={
                index === 0
                  ? "start"
                  : index === points.length - 1
                  ? "end"
                  : "middle"
              }
              fontSize="13"
              fontWeight="600"
              fill="#334155"
            >
              {point.label}
            </text>
          </g>
        ))}
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

  const [csvReadings, setCsvReadings] =
    useState<Reading[] | null>(null);

  const [csvCargoProfile, setCsvCargoProfile] = useState(
    "vaksin_2_8C"
  );

  const usingCsv = csvReadings !== null;

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

  async function callAnalyze(payload: {
    shipment_id: string;
    cargo_profile: string;
    readings: Reading[];
  }) {
    setAnalyzing(true);
    setError("");
    setResult(null);
    setSelectedReadings(payload.readings);

    try {
      const analysisResponse = await fetch(
        `${API_URL}/api/v1/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await analysisResponse.json();

      if (!analysisResponse.ok) {
        throw new Error(
          data.detail || "Analysis request failed"
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

  async function runAnalysis() {
    if (usingCsv) {
      if (!csvReadings) {
        return;
      }

      await callAnalyze({
        shipment_id: csvName || vehicleId,
        cargo_profile: csvCargoProfile,
        readings: csvReadings,
      });

      return;
    }

    if (!selectedScenario) {
      return;
    }

    setAnalyzing(true);
    setError("");
    setResult(null);

    try {
      const scenarioResponse = await fetch(
        `${API_URL}/api/v1/scenarios/${selectedScenario}`
      );

      if (!scenarioResponse.ok) {
        throw new Error(
          "Failed to load selected scenario"
        );
      }

      const scenario = await scenarioResponse.json();

      const readings: Reading[] = Array.isArray(
        scenario.readings
      )
        ? scenario.readings
        : [];

      setAnalyzing(false);

      await callAnalyze({
        shipment_id: scenario.id,
        cargo_profile: scenario.cargo_profile,
        readings,
      });
    } catch (err) {
      console.error(err);

      setAnalyzing(false);

      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memuat skenario."
      );
    }
  }

  /* =======================================================
     CSV IMPORT
  ======================================================= */

  function handleCSVImport(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const text = String(reader.result || "");

      const parsed = parseCSVReadings(text);

      if ("error" in parsed) {
        setError(parsed.error);
        return;
      }

      setError("");
      setResult(null);
      setSelectedReadings([]);
      setCsvName(file.name);
      setCsvReadings(parsed.readings);

      if (parsed.vehicleId) {
        setVehicleId(parsed.vehicleId);
      }
    };

    reader.readAsText(file);

    event.target.value = "";
  }

  function clearCsvImport() {
    setCsvReadings(null);
    setCsvName("");
    setResult(null);
    setSelectedReadings([]);
    setError("");
  }

  const selected = scenarios.find(
    (scenario) =>
      scenario.id === selectedScenario
  );

  // Backend already nulls time_to_breach_min for the healthy class (A0) and
  // beyond the display cap (backend/app/inference.py `is_healthy` + `cap`
  // check) — that null is the authoritative "don't show a number" signal.
  // `status` is a separate rule-engine verdict and must not gate this.
  const tripRoute = useMemo(
    () => routePoints(selectedReadings),
    [selectedReadings]
  );

  const routeLabel = useMemo(() => {
    if (tripRoute.length < 2) {
      return "—";
    }

    const a = tripRoute[0];
    const b = tripRoute[tripRoute.length - 1];

    const from = nearestCity(a.lat, a.lon);
    const to = nearestCity(b.lat, b.lon);

    if (from && to) {
      return `${from} → ${to}`;
    }

    return `${a.lat.toFixed(2)}, ${a.lon.toFixed(2)} → ${b.lat.toFixed(
      2
    )}, ${b.lon.toFixed(2)}`;
  }, [tripRoute]);

  const riskCount = useCountUp(
    result ? result.risk_index * 100 : null
  );

  const ttbCount = useCountUp(
    result?.time_to_breach_min ?? null
  );

  const confidenceCount = useCountUp(
    result ? result.failure_mode.confidence * 100 : null
  );

  const showTTBNumber =
    result !== null &&
    result.time_to_breach_min !== null &&
    result.time_to_breach_min <= TTB_DISPLAY_CAP_MIN;

  const isHealthyDiagnosis =
    result?.failure_mode.label === "normal_sehat";

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-sky-200 via-cyan-100 to-sky-100 text-slate-900 lg:h-screen lg:overflow-hidden">

      <Snowfall />

      <div className="relative z-10 flex w-full flex-1 flex-col gap-2 overflow-hidden px-6 py-2 lg:px-8">

        {/* =================================================
            BRAND + DATA PERJALANAN + KPI
        ================================================== */}

        <section
          className={`relative z-10 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-r from-sky-950 via-sky-900 to-cyan-900 p-2.5 ring-1 transition-shadow duration-700 2xl:p-3 ${statusGlowClass(
            result?.status
          )}`}
        >

          <div className="grid gap-[1.375rem] text-white xl:grid-cols-[1.28fr_1fr_0.92fr_0.86fr_0.92fr_0.84fr] 2xl:grid-cols-[1.7fr_0.95fr_0.9fr_0.85fr_0.9fr_0.86fr]">

            {/* BRAND + CONTROLS */}

            <div className="flex min-w-0 flex-col justify-between gap-2.5">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 2xl:h-14 2xl:w-14">
                  <Truck size={22} className="2xl:hidden" />
                  <Truck size={28} className="hidden 2xl:block" />
                </div>

                <div className="min-w-0">

                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-bold leading-tight tracking-tight 2xl:text-3xl">
                      ColdTrack AI
                    </h1>

                    <span className="rounded-full border border-amber-300/50 bg-amber-400/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-100 2xl:px-2 2xl:text-xs">
                      Mode Demo — parameter statis
                    </span>
                  </div>

                  <p className="truncate text-xs font-medium leading-tight text-sky-100 2xl:text-base">
                    Cold Chain Early Warning System
                  </p>

                </div>

              </div>

              <div className="flex flex-nowrap items-center gap-2">

                <div className="hidden items-center gap-2 rounded-lg bg-white/10 px-3 py-2 2xl:flex">

                  <Zap size={16} className="shrink-0 text-sky-200" />

                  <p className="truncate text-xs font-semibold leading-tight 2xl:text-sm">
                    {result ? result.model_version : "Model siap"}
                  </p>

                </div>

                <label className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-white/15 px-3 text-xs font-semibold transition hover:bg-white/25 2xl:h-10 2xl:px-3.5 2xl:text-sm">

                  <FileUp size={16} />

                  Import CSV

                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleCSVImport}
                  />

                </label>

              </div>

            </div>

            {/* DATA PERJALANAN */}

            <div className="flex min-w-0 flex-col rounded-xl bg-white/10 p-2.5 ring-1 ring-white/15">

              <div className="mb-1.5 flex items-center justify-between gap-2">

                <div className="flex items-center gap-1.5">

                  <CloudCog size={16} className="shrink-0 text-sky-200" />

                  <h3 className="text-sm font-bold 2xl:text-base">
                    Data Perjalanan
                  </h3>

                </div>

                {usingCsv && (
                  <button
                    onClick={clearCsvImport}
                    className="text-[10px] font-semibold text-sky-200 underline-offset-2 hover:text-white hover:underline 2xl:text-xs"
                  >
                    Gunakan skenario
                  </button>
                )}

              </div>

              {usingCsv ? (
                <>
                  <div className="flex h-9 w-full items-center gap-2 rounded-lg border border-sky-400/30 bg-sky-950/50 px-2.5 text-xs font-semibold text-white 2xl:h-10 2xl:text-sm">
                    <FileUp
                      size={14}
                      className="shrink-0 text-sky-300"
                    />

                    <span className="truncate">
                      {csvName}
                    </span>

                    <span className="ml-auto shrink-0 text-[10px] text-sky-200">
                      {csvReadings?.length ?? 0} baris
                    </span>
                  </div>

                  <select
                    value={csvCargoProfile}
                    onChange={(event) => {
                      setCsvCargoProfile(
                        event.target.value
                      );

                      setResult(null);
                    }}
                    className="mt-1.5 h-9 w-full rounded-lg border border-sky-400/30 bg-sky-950/50 px-2.5 text-xs font-semibold text-white outline-none transition focus:border-sky-300 2xl:h-10 2xl:text-sm"
                  >
                    {Object.entries(
                      CARGO_PROFILE_LABELS
                    ).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
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
                  className="h-9 w-full rounded-lg border border-sky-400/30 bg-sky-950/50 px-2.5 text-xs font-semibold text-white outline-none transition focus:border-sky-300 2xl:h-10 2xl:text-sm"
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
              )}

            </div>

            {/* STATUS + RUN ANALYSIS */}

            <div className="flex min-w-0 flex-col justify-center gap-2 rounded-xl bg-white/10 p-2.5 ring-1 ring-white/15">

              <div className="flex min-w-0 items-center gap-2.5">

                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 2xl:h-11 2xl:w-11 ${statusTextClass(
                    result?.status
                  )}`}
                >
                  {statusIcon(result?.status)}
                </div>

                <div className="min-w-0">

                  <p className="truncate text-[10px] font-bold uppercase tracking-wide text-sky-100 2xl:text-xs">
                    Status Perjalanan
                  </p>

                  <p
                    className={`truncate text-base font-extrabold leading-tight 2xl:text-xl ${
                      result
                        ? statusTextClass(result.status)
                        : "text-sky-200"
                    }`}
                  >
                    {result ? result.status : "Ready"}
                  </p>

                </div>

              </div>

              <button
                onClick={runAnalysis}
                disabled={
                  analyzing ||
                  !backendOnline ||
                  (usingCsv
                    ? !csvReadings
                    : loadingScenarios || !selectedScenario)
                }
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-cyan-400 text-xs font-bold text-sky-950 shadow-sm transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 2xl:h-10 2xl:text-sm"
              >

                {analyzing ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />

                    Analyzing
                  </>
                ) : (
                  <>
                    <Play size={16} />

                    Run Analysis
                  </>
                )}

              </button>

            </div>

            {/* RISK INDEX */}

            <div className="flex min-w-0 items-center gap-2.5 rounded-xl bg-white/10 p-2.5 ring-1 ring-white/15">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 2xl:h-14 2xl:w-14">
                <Gauge size={22} className="text-sky-100 2xl:hidden" />
                <Gauge size={28} className="hidden text-sky-100 2xl:block" />
              </div>

              <div className="min-w-0 flex-1">

                <p className="text-[11px] font-bold uppercase tracking-wider text-sky-100 2xl:text-sm">
                  Risk Index
                </p>

                {result ? (
                  <>
                    <p className="mt-0.5 text-3xl font-extrabold leading-none text-white 2xl:text-4xl">
                      {riskCount.toFixed(1)}

                      <span className="text-lg font-bold text-sky-200 2xl:text-xl">
                        %
                      </span>
                    </p>

                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/25">

                      <div
                        className="h-full rounded-full bg-sky-300 transition-[width] duration-700 ease-out"
                        style={{
                          width: `${Math.min(riskCount, 100)}%`,
                        }}
                      />

                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-xl font-bold text-sky-200">
                    —
                  </p>
                )}

              </div>

            </div>

            {/* TIME TO BREACH */}

            <div className="flex min-w-0 items-center gap-2.5 rounded-xl bg-white/10 p-2.5 ring-1 ring-white/15">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 2xl:h-14 2xl:w-14">
                <Timer size={22} className="text-sky-100 2xl:hidden" />
                <Timer size={28} className="hidden text-sky-100 2xl:block" />
              </div>

              <div className="min-w-0 flex-1">

                <p className="text-[11px] font-bold uppercase tracking-wider text-sky-100 2xl:text-sm">
                  Time to Breach
                </p>

                {result ? (
                  showTTBNumber ? (
                    <>
                      <p className="mt-0.5 text-3xl font-extrabold leading-none text-white 2xl:text-4xl">
                        {ttbCount.toFixed(1)}

                        <span className="ml-1 text-base font-bold text-sky-200 2xl:text-lg">
                          min
                        </span>
                      </p>

                      <p className="mt-1 text-[11px] font-semibold leading-snug text-sky-100 2xl:text-sm">
                        Muatan aman {result.time_to_breach_min} menit lagi
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-0.5 text-xl font-extrabold leading-tight text-white 2xl:text-2xl">
                        {isHealthyDiagnosis
                          ? "Terkendali"
                          : "Belum presisi"}
                      </p>

                      <p className="mt-1 text-[11px] font-semibold leading-snug text-sky-100 2xl:text-sm">
                        {isHealthyDiagnosis
                          ? "TTB disembunyikan — kondisi sehat"
                          : "Risiko jangka panjang, angka belum presisi"}
                      </p>
                    </>
                  )
                ) : (
                  <p className="mt-1 text-xl font-bold text-sky-200">
                    —
                  </p>
                )}

              </div>

            </div>

            {/* SHIPMENT — vehicle + cargo */}

            <div className="flex min-w-0 flex-col justify-center gap-2 rounded-xl bg-white/10 p-2.5 ring-1 ring-white/15">

              <div className="flex min-w-0 items-center gap-2.5">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 2xl:h-11 2xl:w-11">
                  <Truck size={18} className="text-sky-100" />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-sky-100 2xl:text-xs">
                    Vehicle ID
                  </p>
                  <p className="truncate text-base font-extrabold leading-tight text-white 2xl:text-xl">
                    {vehicleId}
                  </p>
                </div>

              </div>

              <div className="flex min-w-0 items-center gap-2.5">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-sky-100 2xl:h-11 2xl:w-11">
                  {cargoIcon(
                    usingCsv
                      ? csvCargoProfile
                      : selected?.cargo_profile,
                    18
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-sky-100 2xl:text-xs">
                    Cargo Profile
                  </p>
                  <p className="truncate text-sm font-extrabold leading-tight text-white 2xl:text-base">
                    {usingCsv
                      ? csvCargoProfile
                      : selected?.cargo_profile || "—"}
                  </p>
                </div>

              </div>

            </div>


          </div>

        </section>

        {/* =================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">

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
          <div className="flex min-h-0 flex-1 flex-col gap-2">

            {/* =============================================
                CHART + MAP
            ============================================== */}

            <section className="grid min-h-0 flex-[6] gap-2 xl:grid-cols-[1.6fr_1fr]">

              {/* TEMPERATURE — main chart (60% zone, left) */}

              <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-white/60 bg-white/75 p-3 shadow-sm ring-1 ring-sky-100/60 backdrop-blur-md">

                <div className="mb-2 flex shrink-0 items-center justify-between">

                  <div>

                    <div className="flex items-center gap-2">

                      <Thermometer size={18} />

                      <h3 className="text-base font-bold 2xl:text-lg">
                        Temperature Monitoring
                      </h3>

                    </div>

                    <p className="mt-0.5 text-xs text-slate-500 2xl:text-sm">
                      Actual telemetry dan forecast temperatur
                    </p>

                  </div>

                  <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 2xl:px-3 2xl:py-1 2xl:text-sm">
                    {selectedReadings.length} points
                  </span>

                </div>

                <div className="min-h-0 flex-1">

                  <TemperatureChart
                    readings={selectedReadings}
                    forecast={result.forecast}
                    limits={
                      CARGO_LIMITS[
                        usingCsv
                          ? csvCargoProfile
                          : selected?.cargo_profile ?? ""
                      ] || DEFAULT_CARGO_LIMITS
                    }
                  />

                </div>

              </div>

              {/* RIGHT COLUMN — map 30% + forecast 30% */}

              <div className="flex min-h-0 min-w-0 flex-col gap-2">

              {/* VEHICLE TRACKING */}

              <div className="flex min-h-0 min-w-0 flex-[1.35] flex-col rounded-xl border border-white/60 bg-white/75 p-3 shadow-sm ring-1 ring-sky-100/60 backdrop-blur-md">

                <div className="mb-2 flex shrink-0 items-center justify-between gap-2">

                  <div className="flex min-w-0 items-center gap-2">

                    <MapPin size={17} className="shrink-0" />

                    <div className="min-w-0">

                      <h3 className="truncate text-base font-bold 2xl:text-lg">
                        Vehicle Tracking
                      </h3>

                      <p className="truncate text-xs text-slate-500 2xl:text-sm">
                        Monitoring posisi kendaraan
                      </p>

                    </div>

                  </div>

                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 2xl:px-3 2xl:py-1 2xl:text-sm">
                    ● In Transit
                  </span>

                </div>

                <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl">

                  <RouteMap
                    points={tripRoute}
                    status={result.status}
                  />

                </div>

                <div className="mt-2 grid shrink-0 grid-cols-3 gap-2">

                  <div>

                    <p className="text-[10px] text-slate-400 2xl:text-xs">
                      Vehicle
                    </p>

                    <p className="truncate text-sm font-bold 2xl:text-base">
                      {vehicleId}
                    </p>

                  </div>

                  <div>

                    <p className="text-[10px] text-slate-400 2xl:text-xs">
                      Route
                    </p>

                    <p className="truncate text-sm font-bold 2xl:text-base">
                      {routeLabel}
                    </p>

                  </div>

                  <div>

                    <p className="text-[10px] text-slate-400 2xl:text-xs">
                      Titik GPS
                    </p>

                    <p className="text-sm font-bold text-emerald-600 2xl:text-base">
                      {tripRoute.length}
                    </p>

                  </div>

                </div>

              </div>

              {/* TEMPERATURE FORECAST */}

              <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-white/60 bg-white/75 p-3 shadow-sm ring-1 ring-sky-100/60 backdrop-blur-md">

                <div className="mb-1 flex shrink-0 items-center gap-2">

                  <TrendingUp size={17} className="shrink-0 text-blue-500" />

                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold 2xl:text-lg">
                      Temperature Forecast
                    </h3>

                    <p className="truncate text-xs text-slate-500 2xl:text-sm">
                      Proyeksi t+15/30/60 menit.
                    </p>
                  </div>

                </div>

                <div className="min-h-0 flex-1">
                  <ForecastChart
                    currentTemp={
                      temperatureFromReading(
                        selectedReadings[
                          selectedReadings.length - 1
                        ] || {}
                      ) ?? result.forecast.t15
                    }
                    forecast={result.forecast}
                  />
                </div>

              </div>

              </div>

            </section>

            {/* =============================================
                LOWER ANALYSIS — 40% zone
            ============================================== */}

            <section className="grid min-h-0 flex-[4] gap-2 xl:grid-cols-[0.82fr_1.4fr_0.83fr_1.15fr]">

              {/* DRIVERS */}

              <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-white/60 bg-white/75 p-3 shadow-sm ring-1 ring-sky-100/60 backdrop-blur-md">

                <div className="mb-3 flex shrink-0 items-center justify-between">

                  <div>

                    <h3 className="text-base font-bold 2xl:text-lg">
                      Mengapa AI Berpikir Begini
                    </h3>

                    <p className="mt-0.5 text-xs text-slate-500 2xl:text-sm">
                      3 faktor pendorong teratas hasil analisis.
                    </p>

                  </div>

                  <Activity
                    size={17}
                    className="text-slate-300"
                  />

                </div>

                <div className="flex min-h-0 flex-1 flex-col justify-between gap-2 overflow-y-auto">

                  {result.drivers.slice(0, 3).map(
                    (driver, index) => (
                      <div
                        key={`${driver.feature}-${index}`}
                        className="flex flex-col justify-center rounded-lg bg-sky-50/70 px-3 py-2"
                      >

                        <div className="flex items-center justify-between">

                          <span className="text-sm font-semibold capitalize 2xl:text-base">
                            {formatLabel(
                              driver.feature
                            )}
                          </span>

                          <span className="text-base font-bold">
                            {(
                              driver.contribution *
                              100
                            ).toFixed(1)}
                            %
                          </span>

                        </div>

                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sky-100">

                          <div
                            className="h-full rounded-full bg-sky-600 transition-[width] duration-700 ease-out"
                            style={{
                              width: `${
                                driver.contribution *
                                100
                              }%`,
                            }}
                          />

                        </div>

                        <p className="mt-1 text-xs text-slate-500 2xl:text-sm">
                          {driver.value}
                        </p>

                      </div>
                    )
                  )}

                </div>

              </div>

              {/* ACTIONS */}

              <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-white/60 bg-white/75 p-3 shadow-sm ring-1 ring-sky-100/60 backdrop-blur-md">

                <div className="mb-3 flex shrink-0 items-center justify-between">

                  <div>

                    <h3 className="text-base font-bold 2xl:text-lg">
                      Rekomendasi Tindakan
                    </h3>

                    <p className="mt-0.5 text-xs text-slate-500 2xl:text-sm">
                      Tiga langkah prioritas berdasarkan kondisi perjalanan.
                    </p>

                  </div>

                  <CheckCircle2
                    size={17}
                    className="text-slate-300"
                  />

                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">

                  {result.actions.map(
                    (action) => (
                      <div
                        key={action.priority}
                        className="flex items-center gap-3 rounded-xl bg-sky-50/70 p-3"
                      >

                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-900 text-sm font-bold text-white 2xl:h-10 2xl:w-10 2xl:text-base">
                          {action.priority}
                        </div>

                        <p className="min-w-0 flex-1 text-sm font-medium leading-snug 2xl:text-base">
                          {action.text}
                        </p>

                        {action.eta_min !== null && (
                          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-sm font-bold text-sky-700 ring-1 ring-sky-200 2xl:text-base">
                            {action.eta_min}m
                          </span>
                        )}

                      </div>
                    )
                  )}

                </div>

              </div>

              {/* AI ASSESSMENT */}

              <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-white/60 bg-white/75 p-3 shadow-sm ring-1 ring-sky-100/60 backdrop-blur-md">

                <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">

                  <div className="flex items-center gap-2">

                    <Activity size={18} className="text-sky-600" />

                    <h3 className="text-base font-bold 2xl:text-lg">
                      AI Assessment
                    </h3>

                  </div>

                  <div className="flex min-w-0 items-center gap-2">

                    <div className="min-w-0 text-right">

                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 2xl:text-xs">
                        Failure Mode
                      </p>

                      <p className="truncate text-sm font-bold capitalize leading-tight 2xl:text-base">
                        {formatLabel(
                          result.failure_mode.label
                        )}
                      </p>

                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold 2xl:px-2.5 2xl:py-1 2xl:text-sm ${statusClass(
                        result.status
                      )} ${
                        result.status === "KRITIS"
                          ? "coldtrack-pulse"
                          : ""
                      }`}
                    >
                      {statusIcon(result.status)}
                      {result.status}
                    </span>

                  </div>

                </div>

                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5">

                  <div
                    className="relative flex aspect-square w-full max-w-[6.5rem] items-center justify-center rounded-full 2xl:max-w-[9rem]"
                    style={{
                      background: `conic-gradient(#0284c7 ${Math.min(
                        confidenceCount,
                        100
                      )}%, #e2e8f0 0)`,
                    }}
                  >

                    <div className="flex h-[76%] w-[76%] flex-col items-center justify-center rounded-full bg-white">

                      <span className="text-2xl font-extrabold leading-none 2xl:text-4xl">
                        {(
                          result.failure_mode.confidence * 100
                        ).toFixed(0)}
                        %
                      </span>

                      <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 2xl:text-[11px]">
                        Keyakinan
                      </span>

                    </div>

                  </div>

                  {/* Confidence is only meaningful next to the model's known
                      per-class reliability — see docs/model_card.md. */}
                  <p className="px-1 text-center text-xs font-medium leading-snug text-slate-600 2xl:text-sm">
                    {result.failure_mode.confidence >= 0.8
                      ? "Keyakinan tinggi — diagnosis konsisten dengan pola fitur."
                      : result.failure_mode.confidence >= 0.5
                      ? "Keyakinan sedang — verifikasi dengan kondisi lapangan."
                      : "Keyakinan rendah — perlakukan sebagai indikasi awal, bukan kesimpulan."}
                  </p>

                </div>

              </div>

              {/* AI SUMMARY */}

              <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-white/60 bg-white/75 p-3 shadow-sm ring-1 ring-sky-100/60 backdrop-blur-md">

                <div className="mb-2 flex shrink-0 items-center gap-2">

                  <Zap size={17} />

                  <h3 className="text-base font-bold 2xl:text-lg">
                    AI Summary
                  </h3>

                </div>

                {(() => {
                  const summary = buildAiSummary(
                    result,
                    vehicleId,
                    temperatureFromReading(
                      selectedReadings[
                        selectedReadings.length - 1
                      ] || {}
                    )
                  );

                  return (
                    <div className="flex min-h-0 flex-1 flex-col justify-start gap-2 overflow-y-auto">

                      <div className="rounded-lg bg-sky-50/60 p-2.5">

                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 2xl:text-xs">
                          Kondisi Saat Ini
                        </p>

                        <p className="mt-1 text-base leading-relaxed text-slate-700 2xl:text-lg">
                          {summary.current}
                        </p>

                      </div>

                      <div className="rounded-lg bg-sky-50/60 p-2.5">

                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 2xl:text-xs">
                          Proyeksi Ke Depan
                        </p>

                        <p className="mt-1 text-base leading-relaxed text-slate-700 2xl:text-lg">
                          {summary.outlook}
                        </p>

                      </div>

                    </div>
                  );
                })()}

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
            <section className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-sky-200 bg-white/70">

              <div className="text-center">

                <Activity
                  size={32}
                  className="mx-auto mb-3 text-slate-300"
                />

                <h3 className="text-base font-semibold">
                  Belum ada hasil analisis
                </h3>

                <p className="mt-1 text-xs text-slate-500 2xl:text-sm">
                  Pilih scenario lalu tekan Run Analysis.
                </p>

              </div>

            </section>
          )}

        {analyzing && (
          <section className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-sky-100 bg-white">

            <div className="text-center">

              <Loader2
                size={32}
                className="mx-auto mb-3 animate-spin text-slate-700"
              />

              <h3 className="text-base font-semibold">
                AI sedang menganalisis perjalanan
              </h3>

              <p className="mt-1 text-xs text-slate-500 2xl:text-sm">
                Telemetry sedang diproses oleh FastAPI backend.
              </p>

            </div>

          </section>
        )}

      </div>
    </main>
  );
}