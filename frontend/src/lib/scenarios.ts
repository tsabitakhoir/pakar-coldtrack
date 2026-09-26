import { ConditionInput, TelemetryReading } from "./types";
import { WINDOW_MINUTES } from "./window";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Empat skenario demo; masing-masing menunjuk skenario yang sudah ada di backend/data/scenarios/. */
export const SCENARIOS = [
  { id: "scenario_1_normal", label: "A0 – Aman", hint: "Kondisi normal" },
  { id: "scenario_2_door_open", label: "A-1 – Pintu Terbuka", hint: "Durasi pintu terbuka lama" },
  { id: "scenario_5_extreme_ambient", label: "A-2 – Kejut Ambient", hint: "Kenaikan suhu lingkungan" },
  { id: "scenario_4_sensor_stuck", label: "A-3 – Sensor Macet", hint: "Suhu sensor tidak berubah" },
] as const;

export interface LoadedScenario {
  readings: TelemetryReading[];
  cargoProfile: string;
}

export async function fetchScenario(id: string): Promise<LoadedScenario> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/scenarios/${id}`);
  } catch {
    throw new Error(`Server tidak bisa dihubungi (${API_URL}). Pastikan backend berjalan.`);
  }
  if (!res.ok) throw new Error(`Gagal memuat skenario (${res.status}).`);
  const data = await res.json();
  const readings: TelemetryReading[] = data.readings ?? [];
  if (readings.length === 0) throw new Error("Skenario tidak berisi bacaan.");
  return { readings, cargoProfile: data.cargo_profile ?? "vaksin_2_8C" };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Isi formulir dari bacaan yang dimuat, supaya kartu-kartu yang membaca `input`
 * (truk, kondisi terkini) konsisten dengan data. Nilai dijepit ke rentang
 * validasi formulir HANYA untuk tampilan; analisis memakai bacaan aslinya.
 */
export function conditionFromReadings(readings: TelemetryReading[], cargoProfile: string, prev: ConditionInput): ConditionInput {
  const win = readings.slice(-WINDOW_MINUTES);
  const last = win[win.length - 1];
  const trailing = (pred: (r: TelemetryReading) => boolean) => {
    let n = 0;
    for (let i = win.length - 1; i >= 0 && pred(win[i]); i--) n++;
    return n;
  };
  const doorMin = trailing((r) => r.door_open);
  const stopMin = trailing((r) => r.speed_kmh <= 5);
  return {
    ...prev,
    cargoProfile,
    tempNow: clamp(last.temp_c, -40, 60),
    temp60Ago: clamp(win[0].temp_c, -40, 60),
    ambient: clamp(last.ambient_c, -20, 60),
    humidity: clamp(Math.round(last.humidity), 0, 100),
    doorOpen: doorMin > 0,
    doorMinutes: doorMin > 0 ? doorMin : prev.doorMinutes,
    moving: stopMin === 0,
    stoppedMinutes: stopMin > 0 ? stopMin : prev.stoppedMinutes,
  };
}
