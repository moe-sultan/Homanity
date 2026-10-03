"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { FitBadge, RentDiff, SaveButton, euro, useRequireContext } from "@/components/bits";
import { LifeLinks } from "@/components/LifeLinks";
import { MapView } from "@/components/MapView";
import { getArea } from "@/lib/data/areas";
import { getProperty } from "@/lib/data/properties";
import { evaluateProperty } from "@/lib/fit/evaluate";
import { useStore } from "@/lib/store";

function RentBar({ rent, typical }: { rent: number; typical: number }) {
  const lo = typical * 0.8;
  const hi = typical * 1.2;
  const pos = (v: number) => `${Math.max(2, Math.min(98, ((v - lo) / (hi - lo)) * 100))}%`;
  return (
    <div className="rentbar">
      <div className="mark typical" style={{ left: pos(typical) }}>
        <span>Typical {euro(typical)}</span>
      </div>
      <div className="mark" style={{ left: pos(rent) }}>
        <span style={{ top: -22, fontWeight: 700, color: "var(--ink)" }}>This home {euro(rent)}</span>
      </div>
    </div>
  );
}

export default function PropertyPage() {
  const { id } = useParams<{ id: string }>();
  const ctx = useRequireContext();
  const router = useRouter();
  const { isSaved, toggleSaved, saved } = useStore();
  const property = getProperty(id);
  const e = useMemo(() => (ctx && property ? evaluateProperty(ctx, property) : null), [ctx, property]);

  if (!property) return <div className="container empty"><h2>Home not found</h2><Link href="/areas" className="btn btn-ghost">Back to areas</Link></div>;
  if (!ctx || !e) return null;
  const area = getArea(property.areaId)!;

  const compare = () => {
    if (!isSaved(property.id)) toggleSaved(property.id);
    router.push("/saved");
  };

  const questions = [
    e.rentDiff > 50
      ? `This rent is ${euro(e.rentDiff)} above typical for a ${property.beds}-bed in ${area.name}. Ask what justifies the difference, and whether there's room to negotiate.`
      : `This rent is at or below typical for the area, a good sign. Still check what's included (bills, parking, furniture).`,
    "Ask what the previous rent was. Every tenancy must be registered with the RTB, and increases are limited in Rent Pressure Zones.",
    `Ask to see the BER certificate. A ${property.ber} rating affects your heating bills on top of the rent.`,
  ];

  return (
    <div className="container">
      <Link href={`/areas/${area.id}`} className="back">← Homes in {area.name}</Link>

      <div className="row between" style={{ alignItems: "flex-start", marginBottom: 20 }}>
        <div className="page-head" style={{ marginBottom: 0 }}>
          <span className="eyebrow">{area.name}, {area.county}</span>
          <h1>{property.title}</h1>
          <p className="lede">{property.address} · {property.beds} bed · {property.baths} bath · {property.type} · BER {property.ber}</p>
        </div>
        <div className="stack" style={{ alignItems: "flex-end" }}>
          <FitBadge fit={e.fit} large />
          <div className="rent">{euro(property.rent)} <small>/ month</small></div>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 24 }}>
        <SaveButton propertyId={property.id} />
        <button type="button" className="btn btn-ghost btn-sm" onClick={compare}>
          Compare with saved{saved.length > 0 ? ` (${saved.length})` : ""}
        </button>
      </div>

      <div className="split">
        <div className="stack">
          <MapView
            small
            home={{ lat: property.lat, lng: property.lng, label: property.title }}
            places={e.links.map((l) => ({ lat: l.point.lat, lng: l.point.lng, label: l.kind === "work" ? `Work: ${l.name}` : l.point.label, kind: l.kind, minutes: l.travel.minutes }))}
          />
          <div className="card pad">
            <h3 style={{ marginBottom: 12 }}>Your week from this home</h3>
            <LifeLinks evaluation={e} />
          </div>
        </div>

        <div className="stack">
          <div className="card pad">
            <h3>Is the rent fair for {area.name}?</h3>
            <RentBar rent={property.rent} typical={e.typicalRent} />
            <RentDiff diff={e.rentDiff} />
            <p className="small muted" style={{ marginTop: 4 }}>Compared with the typical asking rent for a {property.beds}-bed in {area.name}.</p>
          </div>

          <div className="card pad">
            <h3 style={{ marginBottom: 4 }}>Why {e.fit} Fit</h3>
            <p className="small muted" style={{ marginBottom: 8 }}>What you told us matters, weighted by how much it matters to you.</p>
            {e.factors.map((f) => (
              <div key={f.key} className="factor">
                <span className="small" style={{ fontWeight: 600 }}>{f.label}</span>
                <div className="factor-bar"><i style={{ width: `${Math.round(f.score * 100)}%` }} /></div>
                <span className="factor-detail">{f.detail}</span>
              </div>
            ))}
          </div>

          <div className="card pad">
            <h3 style={{ marginBottom: 8 }}>Before you view</h3>
            <div className="stack small" style={{ gap: 8 }}>
              {questions.map((q) => (
                <p key={q}>• {q}</p>
              ))}
            </div>
          </div>

          <div className="card pad">
            <h3 style={{ marginBottom: 8 }}>The home</h3>
            <div className="row" style={{ gap: 6, marginBottom: 8 }}>
              {property.features.map((f) => (
                <span key={f} className="tag">{f}</span>
              ))}
            </div>
            <p className="small muted">{property.walkToStopMin} min walk to {property.stopName}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
