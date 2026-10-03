"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

export type MapPoint = { lat: number; lng: number; label: string; href?: string };
export type MapPlace = MapPoint & { kind: "work" | "place"; minutes?: number };

type Props = {
  home: MapPoint; // the area centre or the property
  homeKind?: "area" | "property";
  places: MapPlace[]; // the renter's life: work and important places
  properties?: MapPoint[]; // listings in the area
  small?: boolean;
};

// Shows how a home connects to the places in the renter's life.
export function MapView({ home, homeKind = "property", places, properties = [], small }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const router = useRouter();
  const key = JSON.stringify({ home, places, properties });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current) return;
      map.current?.remove();
      const m = L.map(el.current, { scrollWheelZoom: false, zoomControl: true });
      map.current = m;
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
        maxZoom: 19,
      }).addTo(m);

      const pin = (cls: string) => L.divIcon({ className: "", html: `<div class="pin ${cls}"></div>`, iconSize: [20, 20], iconAnchor: [10, 10] });
      const bounds = L.latLngBounds([[home.lat, home.lng]]);

      for (const p of places) {
        L.polyline(
          [
            [home.lat, home.lng],
            [p.lat, p.lng],
          ],
          { color: p.kind === "work" ? "#2f5fb3" : "#c0702a", weight: 2, opacity: 0.7, dashArray: "6 6" },
        ).addTo(m);
        L.marker([p.lat, p.lng], { icon: pin(p.kind) })
          .addTo(m)
          .bindTooltip(p.minutes !== undefined ? `${p.label} · ${p.minutes} min` : p.label, { className: "label", direction: "top", offset: [0, -8] });
        bounds.extend([p.lat, p.lng]);
      }

      for (const p of properties) {
        const marker = L.marker([p.lat, p.lng], { icon: pin("prop") })
          .addTo(m)
          .bindTooltip(p.label, { className: "label", direction: "top", offset: [0, -6] });
        if (p.href) marker.on("click", () => router.push(p.href!));
        bounds.extend([p.lat, p.lng]);
      }

      L.marker([home.lat, home.lng], { icon: pin("home"), zIndexOffset: 1000 })
        .addTo(m)
        .bindTooltip(home.label, { className: "label", direction: "top", offset: [0, -10], permanent: homeKind === "area" });

      m.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div>
      <div ref={el} className={`map ${small ? "sm" : ""}`} />
      <div className="legend">
        <span><i className="dot" style={{ background: "#1d2422" }} />{homeKind === "area" ? "Area" : "This home"}</span>
        <span><i className="dot" style={{ background: "#2f5fb3" }} />Work / study</span>
        <span><i className="dot" style={{ background: "#c0702a" }} />Your important places</span>
        {properties.length > 0 && <span><i className="dot" style={{ background: "#1f6f5c" }} />Homes to rent</span>}
      </div>
    </div>
  );
}
