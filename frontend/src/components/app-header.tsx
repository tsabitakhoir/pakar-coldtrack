"use client";

import { useRef } from "react";
import Image from "next/image";
import { CaretDown, UploadSimple } from "@phosphor-icons/react/dist/ssr";
import { SCENARIOS } from "@/lib/scenarios";
import { cn } from "@/lib/utils";

/** Sumber data yang sedang dianalisis (null = formulir manual). */
export type DataSource = { kind: "scenario"; id: string } | { kind: "csv"; name: string } | null;

interface Props {
  model?: string;
  source: DataSource;
  busy: boolean;
  onSelectScenario: (id: string) => void;
  onImportCsv: (file: File) => void;
}

export function AppHeader({ model, source, busy, onSelectScenario, onImportCsv }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const value = source?.kind === "scenario" ? source.id : "";

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Image src="/logo.webp" alt="" width={64} height={33} priority className="h-9 w-auto" />
        <div>
          <h1 className="text-[24px] font-extrabold leading-none tracking-[-0.03em] text-brand-strong">
            Cold<span className="italic text-accent">Track</span>
          </h1>
          <p className="mt-1 hidden text-[12px] text-muted lg:block">
            Berapa menit lagi muatan aman, dan apa yang harus dilakukan sekarang.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex items-center">
          <span className="sr-only">Skenario</span>
          <select
            value={value}
            disabled={busy}
            onChange={(e) => e.target.value && onSelectScenario(e.target.value)}
            className={cn(
              "h-10 min-w-[210px] cursor-pointer appearance-none rounded-full border bg-surface pl-4 pr-9 text-[13px] font-medium text-ink",
              "transition-colors duration-150 hover:border-accent-soft disabled:cursor-wait disabled:opacity-60"
            )}
          >
            <option value="" disabled>
              Pilih skenario…
            </option>
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} — {s.hint}
              </option>
            ))}
          </select>
          <CaretDown size={14} className="pointer-events-none absolute right-3.5 text-muted" aria-hidden />
        </label>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImportCsv(f);
            e.target.value = ""; // izinkan memilih berkas yang sama lagi
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="flex h-10 cursor-pointer items-center gap-2 rounded-full border bg-surface px-4 text-[13px] font-medium text-ink transition-colors duration-150 hover:border-accent-soft disabled:cursor-wait disabled:opacity-60"
        >
          <UploadSimple size={16} className="text-accent" aria-hidden />
          <span className="max-w-[160px] truncate">{source?.kind === "csv" ? source.name : "Import CSV"}</span>
        </button>

        {model && (
          <span className="hidden items-center gap-2 rounded-full border bg-surface px-3 py-2.5 text-[12px] font-medium text-muted xl:flex">
            <span className="size-2 rounded-full bg-ok" aria-hidden />
            Model aktif · <span className="num">{model}</span>
          </span>
        )}
      </div>
    </header>
  );
}
