"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { FitBadge, euro, useRequireContext } from "@/components/bits";
import { LifeLinks } from "@/components/LifeLinks";
import { MapView } from "@/components/MapView";
import { PropertyCard } from "@/components/PropertyCard";
import { getArea } from "@/lib/data/areas";
import { POIS, POI_LABEL } from "@/lib/data/places";
import { evaluateArea } from "@/lib/fit/evaluate";
import { haversineKm } from "@/lib/fit/travel";

export default function AreaPage() {
  const { id } = useParams<{ id: string }>();
  const ctx = useRequireContext();
  const area = getArea(id);
  const e = useMemo(() => (ctx && area ? evaluateArea(ctx, area) : null), [ctx, area]);

  if (!area) return <div className="container empty"><h2>Area not found</h2><Link href="/areas" className="btn btn-ghost">Back to areas</Link></div>;
  if (!ctx || !e) return null;

  const essentials = POIS.filter((p) => haversineKm(p, area) < 2.5 && p.category !== "station")
    .map((p) => ({ ...p, km: haversineKm(p, area) }))
    .sort((a, b) => a.km - b.km);

  return (
    <div className="container">
      <Link href="/areas" className="back">← All areas</Link>
      <div className="row between" style={{ marginBottom: 20, alignItems: "flex-start" }}>
        <div className="page-head" style={{ marginBottom: 0 }}>
          <span className="eyebrow">{area.county}{!area.inDublin ? " · beyond Dublin" : ""}</span>
          <h1>Living in {area.name}</h1>
          <p className="lede">{area.blurb}</p>
        </div>
        <div className="stack" style={{ alignItems: "flex-end", gap: 4 }}>
          <FitBadge fit={e.fit} large />
          <span className="small muted">for a typical {e.beds}-bed here</span>
        </div>
      </div>

      <div className="split">
        <MapView
          homeKind="area"
          home={{ lat: area.lat, lng: area.lng, label: area.name }}
          places={e.links.map((l) => ({ lat: l.point.lat, lng: l.point.lng, label: l.kind === "work" ? `Work: ${l.name}` : l.point.label, kind: l.kind, minutes: l.travel.minutes }))}
          properties={e.propertyFits.map(({ property, evaluation }) => ({
            lat: property.lat,
            lng: property.lng,
            label: `${euro(property.rent)} · ${evaluation.fit} Fit`,
            href: `/properties/${property.id}`,
          }))}
        />
        <div className="stack">
          <div className="card pad">
            <h3 style={{ marginBottom: 12 }}>What your week looks like from here</h3>
            <LifeLinks evaluation={e} />
          </div>
          <div className="card pad">
            <h3 style={{ marginBottom: 4 }}>Typical rent in {area.name}</h3>
            <p className="small muted" style={{ marginBottom: 12 }}>Use these to judge whether an asking price is fair.</p>
            <div className="stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {([1, 2, 3, 4] as const).map((b) => (
                <div key={b}>
                  <div className="stat-label">{b} bed</div>
                  <div className="stat-value" style={b === e.beds ? { color: "var(--accent)" } : undefined}>{euro(area.typicalRent[b])}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card pad">
            <h3 style={{ marginBottom: 10 }}>Getting around</h3>
            <div className="row" style={{ gap: 6 }}>
              {area.transport.map((t) => (
                <span key={t.name} className={`tag ${t.mode === "Bus" ? "" : "rail"}`}>{t.mode === "Bus" ? "Bus" : t.mode}: {t.name}</span>
              ))}
            </div>
            {essentials.length > 0 && (
              <>
                <h3 style={{ margin: "16px 0 8px" }}>Nearby everyday places</h3>
                <div className="signals" style={{ flexDirection: "column", gap: 4 }}>
                  {essentials.slice(0, 7).map((p) => (
                    <div key={p.id} className="row between small">
                      <span>{p.name}</span>
                      <span className="muted">{POI_LABEL[p.category]} · {p.km.toFixed(1)} km</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="section-title">
        <h2>Homes in {area.name}</h2>
        <span className="small muted">Fit is how well each home fits your life, not a rating of the property</span>
      </div>
      <div className="grid grid-3">
        {e.propertyFits.map(({ property, evaluation }) => (
          <PropertyCard key={property.id} property={property} evaluation={evaluation} />
        ))}
      </div>
    </div>
  );
}
