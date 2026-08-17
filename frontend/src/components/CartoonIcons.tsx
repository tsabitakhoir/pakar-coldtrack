/**
 * Original flat two-tone icon set for ColdTrack AI.
 *
 * Drawn here rather than taken from an icon library or the web, in the same
 * flat filled style as the reefer-truck reference: solid shapes, chunky
 * proportions, no hairline strokes. Two tones only — `currentColor` for the
 * body and the same colour at low opacity for highlights — plus punched-out
 * details using `fillRule="evenodd"`, so the cut-out shows whatever is
 * behind it. That makes every icon legible on the light cards *and* on the
 * dark header bar without needing a second variant.
 */

type IconProps = {
  className?: string;
};

const BASE = "h-full w-full";

function Svg({
  className,
  children,
  viewBox = "0 0 24 24",
}: IconProps & { children: React.ReactNode; viewBox?: string }) {
  return (
    <svg
      viewBox={viewBox}
      fill="currentColor"
      className={className ?? BASE}
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
      <path
        d="M9.1 5.9a2.9 2.9 0 0 1 5.8 0v6.6a5 5 0 1 1-5.8 0Zm2.9 12.9a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z"
        fillRule="evenodd"
        opacity="0.4"
      />
      <path d="M10.9 6.4a1.1 1.1 0 0 1 2.2 0v7.3a1.1 1.1 0 0 1-2.2 0Z" />
      <circle cx="12" cy="16.2" r="2.9" />
      <path d="M19.2 3.6h1.5v6h-1.5z" opacity="0.55" />
      <path d="M16.95 6.35h6v1.5h-6z" opacity="0.55" />
    </Svg>
  );
}

/** Reefer truck with a snowflake punched out of the cargo box. */
export function IcoReeferTruck({ className }: IconProps) {
  return (
    <Svg className={className}>
      {/* cargo box with snowflake cut-out */}
      <path
        d="M1.6 6.2h12.6v9.6H1.6Z M7.9 7.7 L8.47 9.6 L10.41 9.15 L9.05 10.6 L10.41 12.05 L8.47 11.6 L7.9 13.5 L7.33 11.6 L5.39 12.05 L6.75 10.6 L5.39 9.15 L7.33 9.6 Z"
        fillRule="evenodd"
      />
      {/* cab */}
      <path d="M15.1 8.8h3.1l3.4 3.6v3.4h-6.5z" opacity="0.45" />
      <path d="M16.2 9.9h1.9l2 2.2h-3.9z" opacity="0.85" />
      {/* wheels */}
      <circle cx="6.3" cy="18" r="2.4" />
      <circle cx="6.3" cy="18" r="1" opacity="0.35" />
      <circle cx="17.4" cy="18" r="2.4" />
      <circle cx="17.4" cy="18" r="1" opacity="0.35" />
      {/* road */}
      <path d="M1.2 20.9h21.6v1.3H1.2z" opacity="0.35" />
    </Svg>
  );
}

/** Route flag with a dotted trail — trip data. */
export function IcoTripFlag({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M7.6 3.2h1.9v17.6H7.6z" />
      <path d="M9.9 4.1h9.4l-2.4 3.4 2.4 3.4H9.9z" opacity="0.5" />
      <circle cx="4.2" cy="19.4" r="1.5" opacity="0.5" />
      <circle cx="12.6" cy="19.4" r="1.5" opacity="0.5" />
      <circle cx="17.6" cy="19.4" r="1.5" opacity="0.5" />
    </Svg>
  );
}

/** Dial with a needle — risk index. */
export function IcoRiskDial({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        d="M2.6 18.2a9.4 9.4 0 0 1 18.8 0v1.6h-4.1v-1.6a5.3 5.3 0 1 0-10.6 0v1.6H2.6Z"
        fillRule="evenodd"
        opacity="0.42"
      />
      <path d="M11.2 17.7 15.9 9.9l1.9 1.3-4.2 7.1z" />
      <circle cx="12" cy="18.4" r="2.2" />
    </Svg>
  );
}

/** Stopwatch — time to breach. */
export function IcoStopwatch({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        d="M12 5.4a8.1 8.1 0 1 1 0 16.2 8.1 8.1 0 0 1 0-16.2Zm0 2.6a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z"
        fillRule="evenodd"
        opacity="0.42"
      />
      <path d="M9.4 1.8h5.2v2.3H9.4z" />
      <path d="M10.9 3.6h2.2v2.6h-2.2z" opacity="0.6" />
      <path d="M11 9.6h2v4.9h-2z" />
      <path d="M12.1 13.1h4.2v2h-4.2z" opacity="0.7" />
    </Svg>
  );
}

/** Clipboard with a tick — recommended actions. */
export function IcoActionList({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        d="M4.4 4.6h15.2v16.6H4.4Z M8.1 12.9l2.6 2.6 5.2-5.4 1.6 1.6-6.8 7-4.2-4.2z"
        fillRule="evenodd"
        opacity="0.42"
      />
      <path d="M9 2.2h6a1.3 1.3 0 0 1 1.3 1.3v2.2H7.7V3.5A1.3 1.3 0 0 1 9 2.2Z" />
      <path d="m8.1 12.9 2.6 2.6 5.2-5.4 1.6 1.6-6.8 7-4.2-4.2z" />
    </Svg>
  );
}

/** Document with a spark — generated summary. */
export function IcoSummaryDoc({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        d="M4.8 2.6h9.4l5 5v14H4.8Z M7.6 8.4h5.2v1.9H7.6z M7.6 12.2h8.8v1.9H7.6z M7.6 16h8.8v1.9H7.6z"
        fillRule="evenodd"
        opacity="0.42"
      />
      <path d="M14.2 2.6l5 5h-5z" />
      <path d="M18.6 13.4c.5 2.6 1.1 3.2 3.7 3.7-2.6.5-3.2 1.1-3.7 3.7-.5-2.6-1.1-3.2-3.7-3.7 2.6-.5 3.2-1.1 3.7-3.7Z" />
    </Svg>
  );
}

/** Brain — the model's own assessment. */
export function IcoBrain({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        d="M10.9 2.6c1 0 1.8.5 1.8 1.5v15.9c0 1-.8 1.6-1.8 1.6-1.6 0-2.7-.9-3-2.2-1.9-.2-3.2-1.4-3.2-3 0-.4.1-.8.2-1.1-1-.6-1.6-1.6-1.6-2.8 0-1 .4-1.9 1.2-2.5-.3-.5-.4-1-.4-1.6 0-1.5 1.1-2.7 2.7-3 .3-1.6 1.6-2.8 4.1-2.8Z"
        opacity="0.45"
      />
      <path d="M13.9 2.6c2.5 0 3.8 1.2 4.1 2.8 1.6.3 2.7 1.5 2.7 3 0 .6-.1 1.1-.4 1.6.8.6 1.2 1.5 1.2 2.5 0 1.2-.6 2.2-1.6 2.8.1.3.2.7.2 1.1 0 1.6-1.3 2.8-3.2 3-.3 1.3-1.4 2.2-3 2.2-1 0-1.8-.6-1.8-1.6V4.1c0-1 .8-1.5 1.8-1.5Z" />
    </Svg>
  );
}

/** Magnifier over bars — why the model decided this. */
export function IcoMagnify({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        d="M10.4 2.4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z"
        fillRule="evenodd"
      />
      <path d="m16.1 16.4 2-2 5.1 5.1-2 2z" opacity="0.6" />
      <path d="M7.6 10.6h1.7v4.1H7.6z" opacity="0.55" />
      <path d="M9.9 8.2h1.7v6.5H9.9z" opacity="0.75" />
      <path d="M12.2 11.8h1.7v2.9h-1.7z" opacity="0.55" />
    </Svg>
  );
}

/** Filled tick badge — AMAN. */
export function IcoSafe({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        d="M12 2.4a9.6 9.6 0 1 1 0 19.2 9.6 9.6 0 0 1 0-19.2Zm-1.4 13.9 6.1-6.9-1.8-1.6-4.5 5.1-2.3-2.2-1.7 1.8z"
        fillRule="evenodd"
      />
    </Svg>
  );
}

/** Filled warning badge — WASPADA / KRITIS. */
export function IcoAlert({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        d="M10.5 3.4a1.8 1.8 0 0 1 3 0l7.6 13.6a1.8 1.8 0 0 1-1.5 2.7H4.4a1.8 1.8 0 0 1-1.5-2.7ZM11 8.6v4.7h2V8.6Zm0 6.3v2.1h2v-2.1Z"
        fillRule="evenodd"
      />
    </Svg>
  );
}

/** Snowflake — cold chain marker. */
export function IcoSnowflake({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M11.1 1.8h1.8v20.4h-1.8z" />
      <path d="M2.6 6.6 3.5 5l17.7 10.2-.9 1.6z" opacity="0.75" />
      <path d="M20.5 5l.9 1.6L3.7 16.8l-.9-1.6z" opacity="0.75" />
      <path d="M12 4.2 9.3 2.1 8.2 3.5 12 6.4l3.8-2.9-1.1-1.4z" opacity="0.6" />
      <path d="M12 19.8 9.3 21.9l-1.1-1.4L12 17.6l3.8 2.9-1.1 1.4z" opacity="0.6" />
    </Svg>
  );
}

/**
 * Side-view reefer truck used for the chart fly-through animation.
 * Same flat two-tone language as IcoReeferTruck but larger, so the extra
 * detail (window, bumper, wheel hubs) survives at chart scale.
 */
export function TruckSide({ className }: IconProps) {
  return (
    <Svg className={className} viewBox="0 0 44 30">
      {/* cargo box with punched-out snowflake */}
      <path
        d="M1.5 3h27v18h-27Z M15.5 9.3 L16.75 13.33 L20.87 12.4 L18.0 15.5 L20.87 18.6 L16.75 17.67 L15.5 21.7 L14.25 17.67 L10.13 18.6 L13.0 15.5 L10.13 12.4 L14.25 13.33 Z"
        fillRule="evenodd"
      />
      {/* cab */}
      <path d="M29.5 8h5.6l6.6 6.4V21h-12.2z" opacity="0.5" />
      <path d="M31.2 9.7h3.4l4.2 4.3h-7.6z" opacity="0.9" />
      {/* wheels */}
      <circle cx="9.5" cy="24" r="4.4" />
      <circle cx="9.5" cy="24" r="1.8" opacity="0.35" />
      <circle cx="33.5" cy="24" r="4.4" />
      <circle cx="33.5" cy="24" r="1.8" opacity="0.35" />
    </Svg>
  );
}
