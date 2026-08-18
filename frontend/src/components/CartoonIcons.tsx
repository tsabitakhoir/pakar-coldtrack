/**
 * Original two-tone icon set for ColdTrack AI.
 *
 * Matched to the reefer-truck artwork: solid filled shapes, no hairline
 * strokes, and exactly two colours — a deep navy body with light-sky accents.
 * Pass `light` on dark surfaces (the header bar) to flip the body to white so
 * the icon keeps its weight instead of disappearing into the navy.
 */

type IconProps = {
  className?: string;
  light?: boolean;
};

const BASE = "h-full w-full";

// body / accent pairs, mirroring the truck PNG's palette
const NAVY = "#1e40af";
const SKY = "#7dd3fc";
const WHITE = "#ffffff";

function tones(light?: boolean) {
  return light
    ? { body: WHITE, accent: SKY }
    : { body: NAVY, accent: SKY };
}

function Svg({
  className,
  children,
  viewBox = "0 0 24 24",
}: {
  className?: string;
  children: React.ReactNode;
  viewBox?: string;
}) {
  return (
    <svg
      viewBox={viewBox}
      className={className ?? BASE}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Thermometer with a frost crystal - temperature monitoring. */
export function IcoThermoFrost({ className, light }: IconProps) {
  const { body, accent } = tones(light);

  return (
    <Svg className={className}>
      <rect x="8.4" y="2.4" width="7.2" height="14.4" rx="3.6" fill={accent} />
      <circle cx="12" cy="17.2" r="4.6" fill={accent} />
      <rect x="10.2" y="4.4" width="3.6" height="11.6" rx="1.8" fill={body} />
      <circle cx="12" cy="17.2" r="3.1" fill={body} />
      <rect x="17.9" y="3.2" width="1.8" height="7.4" rx="0.9" fill={body} />
      <rect x="15.1" y="6" width="7.4" height="1.8" rx="0.9" fill={body} />
    </Svg>
  );
}

/** Route flag with a travelled trail - trip data. */
export function IcoTripFlag({ className, light }: IconProps) {
  const { body, accent } = tones(light);

  return (
    <Svg className={className}>
      <path d="M6.8 3.4h11.8l-2.9 4.1 2.9 4.1H6.8z" fill={accent} />
      <rect x="4.6" y="2.2" width="2.4" height="19.6" rx="1.2" fill={body} />
      <circle cx="10.6" cy="18.8" r="2.1" fill={body} />
      <circle cx="15.4" cy="18.8" r="2.1" fill={accent} />
      <circle cx="20.2" cy="18.8" r="2.1" fill={body} />
    </Svg>
  );
}

/** Filled dial with a needle - risk index. */
export function IcoRiskDial({ className, light }: IconProps) {
  const { body, accent } = tones(light);

  return (
    <Svg className={className}>
      <path d="M2 18.6a10 10 0 0 1 20 0v2.2H2z" fill={accent} />
      <path d="M12 18.6 17.4 9.4l2.6 1.7-5.3 8.6z" fill={body} />
      <circle cx="12" cy="18.9" r="3.1" fill={body} />
      <circle cx="12" cy="18.9" r="1.2" fill={accent} />
    </Svg>
  );
}

/** Stopwatch - time to breach. */
export function IcoStopwatch({ className, light }: IconProps) {
  const { body, accent } = tones(light);

  return (
    <Svg className={className}>
      <circle cx="12" cy="14" r="8.4" fill={accent} />
      <circle cx="12" cy="14" r="5.9" fill={body} />
      <rect x="9.2" y="1.4" width="5.6" height="2.8" rx="1.4" fill={body} />
      <rect x="10.6" y="3.4" width="2.8" height="2.8" fill={body} />
      <rect x="11.1" y="9.6" width="1.8" height="5.2" rx="0.9" fill={accent} />
      <rect x="11.6" y="13.1" width="4.6" height="1.8" rx="0.9" fill={accent} />
    </Svg>
  );
}

/** Clipboard with a bold tick - recommended actions. */
export function IcoActionList({ className, light }: IconProps) {
  const { body, accent } = tones(light);

  return (
    <Svg className={className}>
      <rect x="3.6" y="4" width="16.8" height="18" rx="2.6" fill={accent} />
      <rect x="6.2" y="6.6" width="11.6" height="12.8" rx="1.6" fill={body} />
      <rect x="8" y="1.6" width="8" height="4.6" rx="2.3" fill={body} />
      <path
        d="m8.9 13.1 2.5 2.5 4.4-4.7 1.7 1.6-6.1 6.5-4.2-4.2z"
        fill={accent}
      />
    </Svg>
  );
}

/** Document with a spark - generated summary. */
export function IcoSummaryDoc({ className, light }: IconProps) {
  const { body, accent } = tones(light);

  return (
    <Svg className={className}>
      <path d="M4.4 2.4h9.6l5.6 5.6v13.6H4.4z" fill={accent} />
      <rect x="6.9" y="8.2" width="6.4" height="1.9" rx="0.95" fill={body} />
      <rect x="6.9" y="12" width="9.4" height="1.9" rx="0.95" fill={body} />
      <rect x="6.9" y="15.8" width="9.4" height="1.9" rx="0.95" fill={body} />
      <path d="M14 2.4 19.6 8H14z" fill={body} />
      <path
        d="M18.6 12.6c.6 2.8 1.2 3.4 4 4-2.8.6-3.4 1.2-4 4-.6-2.8-1.2-3.4-4-4 2.8-.6 3.4-1.2 4-4Z"
        fill={body}
      />
    </Svg>
  );
}

/** Brain - the model's own assessment. */
export function IcoBrain({ className, light }: IconProps) {
  const { body, accent } = tones(light);

  return (
    <Svg className={className}>
      <path
        d="M11.4 2.6c1.1 0 1.9.6 1.9 1.7v15.4c0 1.1-.8 1.7-1.9 1.7-1.8 0-3-1-3.3-2.4-2.1-.2-3.5-1.6-3.5-3.3 0-.5.1-.9.3-1.3-1.1-.7-1.8-1.8-1.8-3.1 0-1.1.5-2.1 1.3-2.8-.3-.5-.4-1.1-.4-1.7 0-1.7 1.2-3 3-3.3.4-1.8 1.8-3.1 4.4-3.1Z"
        fill={accent}
      />
      <path
        d="M13.7 2.6c2.6 0 4 1.3 4.4 3.1 1.8.3 3 1.6 3 3.3 0 .6-.1 1.2-.4 1.7.8.7 1.3 1.7 1.3 2.8 0 1.3-.7 2.4-1.8 3.1.2.4.3.8.3 1.3 0 1.7-1.4 3.1-3.5 3.3-.3 1.4-1.5 2.4-3.3 2.4-1.1 0-1.9-.6-1.9-1.7V4.3c0-1.1.8-1.7 1.9-1.7Z"
        fill={body}
      />
    </Svg>
  );
}

/** Magnifier over bars - why the model decided this. */
export function IcoMagnify({ className, light }: IconProps) {
  const { body, accent } = tones(light);

  return (
    <Svg className={className}>
      <rect
        x="15.4"
        y="15"
        width="3.6"
        height="8.4"
        rx="1.8"
        transform="rotate(-45 15.4 15)"
        fill={accent}
      />
      <circle cx="10.4" cy="10.4" r="8.4" fill={accent} />
      <circle cx="10.4" cy="10.4" r="6.1" fill={body} />
      <rect x="7" y="10.6" width="1.9" height="3.6" rx="0.95" fill={accent} />
      <rect x="9.5" y="7.4" width="1.9" height="6.8" rx="0.95" fill={accent} />
      <rect x="12" y="9.4" width="1.9" height="4.8" rx="0.95" fill={accent} />
    </Svg>
  );
}

/** Filled tick badge - AMAN. */
export function IcoSafe({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        d="M12 2.4a9.6 9.6 0 1 1 0 19.2 9.6 9.6 0 0 1 0-19.2Zm-1.4 13.9 6.1-6.9-1.8-1.6-4.5 5.1-2.3-2.2-1.7 1.8z"
        fillRule="evenodd"
        fill="currentColor"
      />
    </Svg>
  );
}

/** Filled warning badge - WASPADA / KRITIS. */
export function IcoAlert({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        d="M10.5 3.4a1.8 1.8 0 0 1 3 0l7.6 13.6a1.8 1.8 0 0 1-1.5 2.7H4.4a1.8 1.8 0 0 1-1.5-2.7ZM11 8.6v4.7h2V8.6Zm0 6.3v2.1h2v-2.1Z"
        fillRule="evenodd"
        fill="currentColor"
      />
    </Svg>
  );
}

/** Snowflake - cold chain marker. */
export function IcoSnowflake({ className, light }: IconProps) {
  const { body, accent } = tones(light);

  return (
    <Svg className={className}>
      <rect x="10.9" y="1.8" width="2.2" height="20.4" rx="1.1" fill={body} />
      <rect
        x="10.9"
        y="1.8"
        width="2.2"
        height="20.4"
        rx="1.1"
        transform="rotate(60 12 12)"
        fill={accent}
      />
      <rect
        x="10.9"
        y="1.8"
        width="2.2"
        height="20.4"
        rx="1.1"
        transform="rotate(-60 12 12)"
        fill={accent}
      />
      <circle cx="12" cy="12" r="2.9" fill={body} />
    </Svg>
  );
}
