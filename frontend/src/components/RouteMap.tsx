"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Polyline,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type RoutePoint = { lat: number; lon: number };

// Keeps the whole trip in view whenever the scenario changes.
function FitRoute({ points }: { points: RoutePoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length < 2) {
      return;
    }

    map.fitBounds(
      points.map((p) => [p.lat, p.lon] as [number, number]),
      { padding: [24, 24] }
    );
  }, [map, points]);

  return null;
}

export default function RouteMap({
  points,
  status,
}: {
  points: RoutePoint[];
  status?: string;
}) {
  const latlngs = useMemo(
    () => points.map((p) => [p.lat, p.lon] as [number, number]),
    [points]
  );

  if (latlngs.length < 2) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl bg-sky-50 text-sm font-medium text-slate-500">
        Koordinat perjalanan tidak tersedia
      </div>
    );
  }

  const start = latlngs[0];
  const current = latlngs[latlngs.length - 1];

  const routeColor =
    status === "KRITIS"
      ? "#dc2626"
      : status === "WASPADA"
      ? "#d97706"
      : "#0284c7";

  return (
    <MapContainer
      // Remounting per-scenario avoids stale panes when the route changes.
      key={`${start[0]},${start[1]}-${latlngs.length}`}
      center={current}
      zoom={9}
      scrollWheelZoom={true}
      zoomControl={true}
      attributionControl={false}
      className="h-full w-full rounded-xl"
      style={{ background: "#e0f2fe" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={18}
      />

      <FitRoute points={points} />

      {/* Casing + core so the line stays legible over busy map tiles */}
      <Polyline
        positions={latlngs}
        pathOptions={{ color: "#ffffff", weight: 7, opacity: 0.9 }}
      />

      <Polyline
        positions={latlngs}
        pathOptions={{ color: routeColor, weight: 3.5, opacity: 1 }}
      />

      <CircleMarker
        center={start}
        radius={6}
        pathOptions={{
          color: "#ffffff",
          weight: 2,
          fillColor: "#0f172a",
          fillOpacity: 1,
        }}
      >
        <Tooltip direction="top" offset={[0, -6]}>
          Titik awal
        </Tooltip>
      </CircleMarker>

      <CircleMarker
        center={current}
        radius={9}
        pathOptions={{
          color: "#ffffff",
          weight: 3,
          fillColor: routeColor,
          fillOpacity: 1,
        }}
      >
        <Tooltip direction="top" offset={[0, -8]}>
          Posisi sekarang
        </Tooltip>
      </CircleMarker>
    </MapContainer>
  );
}
