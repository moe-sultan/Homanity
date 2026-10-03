"use client";

import { Briefcase, House, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useEffect, useRef, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Map as LeafletMap, Marker } from "leaflet";
import { fitTone } from "@/lib/fit/evaluate";

export type MapPoint = { lat: number; lng: number; label: string; href?: string };
export type MapPlace = MapPoint & { kind: "work" | "place"; minutes?: number; icon?: ComponentType<{ size?: number }> };
export type MapArea = MapPoint & { id: string; fit: number };

const TILES = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO';

const svg = (icon: ComponentType<{ size?: number }>) => renderToStaticMarkup(createElement(icon, { size: 15 }));

// Loads Leaflet, then creates the map only if the effect is still current.
// React dev mode mounts effects twice; creating the map before checking
// would initialise the same container twice and Leaflet throws.
async function createMap(el: HTMLDivElement, isCancelled: () => boolean) {
  const L = (await import("leaflet")).default;
  if (isCancelled()) return null;
  const m = L.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
  L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(m);
  return { L, m };
}

function addPlaces(L: typeof import("leaflet"), m: LeafletMap, from: { lat: number; lng: number } | null, places: MapPlace[]) {
  const points: [number, number][] = [];
  for (const p of places) {
    if (from) {
      L.polyline(
        [
          [from.lat, from.lng],
          [p.lat, p.lng],
        ],
        { color: p.kind === "work" ? "#3461c7" : "#c96f22", weight: 2.5, opacity: 0.65, dashArray: "2 7", lineCap: "round" },
      ).addTo(m);
    }
    const icon = L.divIcon({
      className: "",
      html: `<div class="pin ${p.kind}">${svg(p.icon ?? (p.kind === "work" ? Briefcase : MapPin))}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
    L.marker([p.lat, p.lng], { icon, zIndexOffset: 500 })
      .addTo(m)
      .bindTooltip(p.minutes !== undefined ? `${p.label} · ${p.minutes} min` : p.label, { className: "label", direction: "top", offset: [0, -14] });
    points.push([p.lat, p.lng]);
  }
  return points;
}

type Props = {
  home: MapPoint;
  homeKind?: "area" | "property";
  places: MapPlace[];
  properties?: MapPoint[];
  small?: boolean;
  tall?: boolean;
};

// Shows how a home (or an area) connects to the places in the renter's life.
export function MapView({ home, homeKind = "property", places, properties = [], small, tall }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const key = JSON.stringify({ home, places: places.map(({ icon: _i, ...p }) => p), properties });

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;
    (async () => {
      if (!el.current) return;
      const created = await createMap(el.current, () => cancelled);
      if (!created) return;
      const { L, m } = created;
      map = m;
      const bounds = L.latLngBounds([[home.lat, home.lng]]);
      for (const pt of addPlaces(L, m, home, places)) bounds.extend(pt);

      for (const p of properties) {
        const icon = L.divIcon({ className: "", html: `<div class="price-pin">${p.label}</div>`, iconSize: [0, 0] });
        const marker = L.marker([p.lat, p.lng], { icon }).addTo(m);
        if (p.href) marker.on("click", () => router.push(p.href!));
        bounds.extend([p.lat, p.lng]);
      }

      const homeIcon = L.divIcon({ className: "", html: `<div class="pin home">${svg(House)}</div>`, iconSize: [34, 34], iconAnchor: [17, 17] });
      L.marker([home.lat, home.lng], { icon: homeIcon, zIndexOffset: 1000 })
        .addTo(m)
        .bindTooltip(home.label, { className: "label", direction: "top", offset: [0, -16] });

      m.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div className="map-wrap">
      <div ref={el} className={`map ${small ? "sm" : ""} ${tall ? "tall" : ""}`} />
      <div className="legend">
        <span><i className="dot" style={{ background: "var(--ink)" }} />{homeKind === "area" ? "Area" : "This home"}</span>
        <span><i className="dot" style={{ background: "var(--work)" }} />Work</span>
        <span><i className="dot" style={{ background: "var(--place)" }} />Your places</span>
      </div>
    </div>
  );
}

// All areas at once, each pinned with its Fit. Hovering a list row
// highlights its pin and vice versa.
export function AreasMap({
  areas,
  places,
  hot,
  onHover,
}: {
  areas: MapArea[];
  places: MapPlace[];
  hot: string | null;
  onHover: (id: string | null) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const markers = useRef<Map<string, Marker>>(new Map());
  const router = useRouter();
  const key = JSON.stringify({ areas, places: places.map(({ icon: _i, ...p }) => p) });

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;
    (async () => {
      if (!el.current) return;
      const created = await createMap(el.current, () => cancelled);
      if (!created) return;
      const { L, m } = created;
      map = m;
      markers.current.clear();
      const bounds = L.latLngBounds([]);
      for (const pt of addPlaces(L, m, null, places)) bounds.extend(pt);
      for (const a of areas) {
        const icon = L.divIcon({
          className: "",
          html: `<div class="fit-pin ${fitTone(a.fit)}" data-id="${a.id}"><i>${a.fit}</i><span class="nm">${a.label}</span></div>`,
          iconSize: [0, 0],
        });
        const marker = L.marker([a.lat, a.lng], { icon, zIndexOffset: a.fit * 10 }).addTo(m);
        marker.on("click", () => a.href && router.push(a.href));
        marker.on("mouseover", () => onHover(a.id));
        marker.on("mouseout", () => onHover(null));
        markers.current.set(a.id, marker);
        bounds.extend([a.lat, a.lng]);
      }
      // Names show once zoomed in enough that pins stop overlapping.
      const syncZoom = () => el.current?.classList.toggle("zoomed", m.getZoom() >= 11);
      m.on("zoomend", syncZoom);
      if (bounds.isValid()) m.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      syncZoom();
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    markers.current.forEach((marker, id) => {
      const node = marker.getElement()?.querySelector(".fit-pin");
      node?.classList.toggle("hot", id === hot);
      marker.setZIndexOffset(id === hot ? 10000 : 0);
    });
  }, [hot]);

  return (
    <div className="map-wrap">
      <div ref={el} className="map" />
      <div className="legend">
        <span><i className="dot" style={{ background: "var(--good)" }} />Strong fit</span>
        <span><i className="dot" style={{ background: "var(--mixed)" }} />Mixed</span>
        <span><i className="dot" style={{ background: "var(--weak)" }} />Weak</span>
        <span><i className="dot" style={{ background: "var(--work)" }} />Work</span>
      </div>
    </div>
  );
}
