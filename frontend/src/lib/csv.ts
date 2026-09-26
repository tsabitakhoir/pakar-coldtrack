import { TelemetryReading } from "./types";

/** Backend menolak payload di bawah 60 bacaan. */
export const MIN_READINGS = 60;

/**
 * CSV -> bacaan dalam bentuk kawat backend, siap dikirim ke POST /api/v1/analyze.
 *
 * Kolom wajib   : temp_c
 * Kolom opsional: ts, humidity, ambient_c, door_open, reefer_on, speed_kmh, harsh_events
 * Field yang diwajibkan backend tapi tidak ada di CSV diisi nilai wajar
 * (lebih baik terisi daripada ditolak 422).
 */
const bool = (v: string | undefined) => ["true", "1", "yes", "ya"].includes((v ?? "").trim().toLowerCase());

function num(v: string | undefined, fallback: number): number {
  if (v === undefined || v.trim() === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function parseReadingsCsv(text: string): TelemetryReading[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const iTemp = col("temp_c");
  if (iTemp === -1) {
    throw new Error("CSV harus punya kolom `temp_c`. Kolom lain yang dikenali: ts, humidity, ambient_c, door_open, reefer_on, speed_kmh, harsh_events.");
  }
  const [iTs, iHum, iAmb, iDoor, iReefer, iSpeed, iHarsh] =
    ["ts", "humidity", "ambient_c", "door_open", "reefer_on", "speed_kmh", "harsh_events"].map(col);

  const base = Date.now() - (lines.length - 1) * 60000;

  return lines.slice(1).map((line, i) => {
    const c = line.split(",").map((x) => x.trim());
    const temp = Number(c[iTemp]);
    if (!Number.isFinite(temp)) throw new Error(`Baris ${i + 2}: nilai temp_c tidak valid ("${c[iTemp] ?? ""}").`);

    // Tanpa kolom ts, waktu dibuat berjarak 1 menit — model butuh urutan, bukan tanggal asli.
    const parsed = iTs !== -1 && c[iTs] ? Date.parse(c[iTs]) : NaN;
    const ts = new Date(Number.isFinite(parsed) ? parsed : base + i * 60000).toISOString();

    return {
      ts,
      temp_c: temp,
      humidity: num(c[iHum], 65),
      ambient_c: num(c[iAmb], 30),
      door_open: iDoor !== -1 ? bool(c[iDoor]) : false,
      reefer_on: iReefer !== -1 ? bool(c[iReefer]) : true,
      speed_kmh: num(c[iSpeed], 45),
      harsh_events: Math.round(num(c[iHarsh], 0)),
    };
  });
}
