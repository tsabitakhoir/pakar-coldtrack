/**
 * Original cartoon-style icon set for ColdTrack AI.
 *
 * Hand-drawn here rather than pulled from an icon library or the web:
 * chunky rounded strokes, friendly proportions, and a cold-chain motif
 * (snowflakes on the reefer, frost on the thermometer). Two-tone — the
 * outline follows `currentColor`, accents use a translucent fill — so a
 * single icon works on both the light cards and the dark header bar.
 */

type IconProps = {
  className?: string;
};

const base = "h-full w-full";

function Svg({
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? base}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Thermometer with a frost crystal — temperature monitoring. */
export function IcoThermoFrost({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M9.6 13.6V6.2a2.4 2.4 0 0 1 4.8 0v7.4a4.4 4.4 0 1 1-4.8 0Z" />
      <circle cx="12" cy="17.2" r="2.3" fill="currentColor" stroke="none" />
      <path d="M12 14.8V9.4" strokeWidth="2.4" />
      <path d="M18.4 4.4v4M16.4 6.4h4" strokeWidth="1.5" opacity="0.75" />
    </Svg>
  );
}

/** Reefer truck carrying a snowflake — vehicle / shipment. */
export function IcoReeferTruck({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="1.8" y="6.4" width="12" height="9" rx="1.8" />
      <path d="M13.8 9.4h3.4l2.9 3.2v2.8h-6.3z" />
      <circle cx="6.4" cy="17.8" r="2.1" fill="currentColor" stroke="none" />
      <circle cx="17.1" cy="17.8" r="2.1" fill="currentColor" stroke="none" />
      <path
        d="M7.8 8.9v4M5.8 10.9h4M6.4 9.5l2.8 2.8M9.2 9.5l-2.8 2.8"
        strokeWidth="1.3"
        opacity="0.85"
      />
    </Svg>
  );
}

/** Winding road with a destination pin — trip data. */
export function IcoRoute({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        d="M4.6 19.4c3.4 0 2.2-6 6.2-6s3.2-5.4 6.8-5.4"
        strokeDasharray="0.1 3.4"
        strokeWidth="2.2"
      />
      <circle cx="4.6" cy="19.4" r="1.9" fill="currentColor" stroke="none" />
      <path d="M17.8 3.2c1.9 0 3.4 1.5 3.4 3.4 0 2.4-3.4 5.6-3.4 5.6s-3.4-3.2-3.4-5.6c0-1.9 1.5-3.4 3.4-3.4Z" />
      <circle cx="17.8" cy="6.6" r="1.15" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Chunky dial with a needle — risk index. */
export function IcoRiskDial({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3.4 17.6a8.6 8.6 0 0 1 17.2 0" strokeWidth="2.1" />
      <path d="M12 17.6 16.4 11" strokeWidth="2.2" />
      <circle cx="12" cy="17.6" r="1.8" fill="currentColor" stroke="none" />
      <path d="M5.4 13.6l1.3.7M12 9.6V11M18.6 13.6l-1.3.7" strokeWidth="1.4" opacity="0.7" />
    </Svg>
  );
}

/** Stopwatch — time to breach. */
export function IcoStopwatch({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="14" r="7.2" />
      <path d="M9.6 2.6h4.8" strokeWidth="2.1" />
      <path d="M12 2.6v2.2" strokeWidth="2.1" />
      <path d="M18.4 8.2l1.5-1.5" strokeWidth="1.6" opacity="0.8" />
      <path d="M12 10.4V14l2.6 1.8" strokeWidth="2.1" />
    </Svg>
  );
}

/** Clipboard with a tick — recommended actions. */
export function IcoActionList({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="4.2" y="4.4" width="15.6" height="16.2" rx="2.4" />
      <path d="M9 4.4V3.2a1.4 1.4 0 0 1 1.4-1.4h3.2A1.4 1.4 0 0 1 15 3.2v1.2z" fill="currentColor" stroke="none" />
      <path d="M8.4 13.4l2.4 2.4 4.8-5" strokeWidth="2.2" />
    </Svg>
  );
}

/** Sparkle cluster — AI generated summary. */
export function IcoSparkle({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        d="M11 3.4c.6 3.6 1.6 4.6 5.2 5.2-3.6.6-4.6 1.6-5.2 5.2-.6-3.6-1.6-4.6-5.2-5.2 3.6-.6 4.6-1.6 5.2-5.2Z"
        fill="currentColor"
        stroke="none"
      />
      <path
        d="M17.6 13.4c.35 2 .9 2.55 2.9 2.9-2 .35-2.55.9-2.9 2.9-.35-2-.9-2.55-2.9-2.9 2-.35 2.55-.9 2.9-2.9Z"
        fill="currentColor"
        stroke="none"
        opacity="0.65"
      />
      <circle cx="6.4" cy="18.4" r="1.5" fill="currentColor" stroke="none" opacity="0.5" />
    </Svg>
  );
}

/** Lightbulb — why the model decided this. */
export function IcoWhyBulb({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M8.4 14.6a5.6 5.6 0 1 1 7.2 0c-.9.75-1.3 1.5-1.4 2.6H9.8c-.1-1.1-.5-1.85-1.4-2.6Z" />
      <path d="M9.9 19.6h4.2M10.6 21.6h2.8" strokeWidth="2" />
      <path d="M12 2.2V1M3.8 8.6H2.6M21.4 8.6h-1.2M5.6 3.6l-.9-.9M18.4 3.6l.9-.9" strokeWidth="1.4" opacity="0.7" />
    </Svg>
  );
}

/** Shield with a pulse line — AI assessment. */
export function IcoAssessShield({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 2.6l7.4 2.8v5.6c0 4.7-3.1 8.4-7.4 10.4-4.3-2-7.4-5.7-7.4-10.4V5.4Z" />
      <path d="M7.8 12.4h2.3l1.4-2.8 1.6 5 1.3-2.2h1.8" strokeWidth="2" />
    </Svg>
  );
}

/** Rounded tick badge — AMAN. */
export function IcoSafe({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9.2" fill="currentColor" stroke="none" opacity="0.16" />
      <circle cx="12" cy="12" r="9.2" />
      <path d="M7.8 12.4l2.8 2.8 5.6-6" strokeWidth="2.4" />
    </Svg>
  );
}

/** Rounded warning badge — WASPADA / KRITIS. */
export function IcoAlert({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        d="M10.5 3.6a1.75 1.75 0 0 1 3 0l7.2 12.9a1.75 1.75 0 0 1-1.5 2.6H4.8a1.75 1.75 0 0 1-1.5-2.6Z"
        fill="currentColor"
        stroke="none"
        opacity="0.16"
      />
      <path d="M10.5 3.6a1.75 1.75 0 0 1 3 0l7.2 12.9a1.75 1.75 0 0 1-1.5 2.6H4.8a1.75 1.75 0 0 1-1.5-2.6Z" />
      <path d="M12 9.2v3.8" strokeWidth="2.4" />
      <circle cx="12" cy="16.2" r="1.15" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Snowflake — cargo / cold chain marker. */
export function IcoSnowflake({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 2.4v19.2M3.7 7.2l16.6 9.6M20.3 7.2 3.7 16.8" strokeWidth="2" />
      <path
        d="M12 6.2 9.6 4M12 6.2 14.4 4M12 17.8l-2.4 2.2M12 17.8l2.4 2.2M6.6 9.4l-3.2-.3M6.6 14.6l-3.2.3M17.4 9.4l3.2-.3M17.4 14.6l3.2.3"
        strokeWidth="1.7"
      />
    </Svg>
  );
}
