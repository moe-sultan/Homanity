"use client";

import {
  ArrowLeft,
  Bath,
  BedDouble,
  Briefcase,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  Footprints,
  Gauge,
  MapPin,
  Scale,
  Sofa,
  TrainFront,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { FairRent, FitRing, HomeImage, SaveButton, TravelSource, euro, placeIcon, placeLabel, useRequireContext } from "@/components/bits";
import { MapView } from "@/components/MapView";
import { WeekRows } from "@/components/WeekRows";
import { getArea } from "@/lib/data/areas";
import { getProperty, propertiesInArea } from "@/lib/data/properties";
import { evaluateProperty, type FitFactor } from "@/lib/fit/evaluate";
import { useLive } from "@/lib/live";
import { useStore } from "@/lib/store";

function RentScale({ rent, typical }: { rent: number; typical: number }) {
  const lo = typical * 0.8;
  const hi = typical * 1.2;
  const pos = (v: number) => `${Math.max(3, Math.min(97, ((v - lo) / (hi - lo)) * 100))}%`;
  return (
    <>
      <div className="scale">
        <div className="mk typ" style={{ left: pos(typical) }}>
          <span>Typical {euro(typical)}</span>
        </div>
        <div className="mk me" style={{ left: pos(rent) }}>
          <span>{euro(rent)}</span>
        </div>
      </div>
      <div className="scale-ends">
        <span>Cheaper</span>
        <span>Pricier</span>
      </div>
    </>
  );
}

function factorIcon(f: FitFactor): LucideIcon {
  if (f.key === "budget") return Wallet;
  if (f.key.startsWith("work-")) return Briefcase;
  if (f.key === "bedrooms") return Sofa;
  if (f.key === "transport") return TrainFront;
  if (f.key === "value") return Scale;
  return placeIcon({ name: f.label });
}

export default function PropertyPage() {
  const { id } = useParams<{ id: string }>();
  const ctx = useRequireContext();
  const router = useRouter();
  const { lookup } = useLive();
  const { isSaved, toggleSaved, saved } = useStore();
  const property = getProperty(id);
  const e = useMemo(() => (ctx && property ? evaluateProperty(ctx, property, lookup) : null), [ctx, property, lookup]);

  if (!property)
    return (
      <div className="container empty">
        <h2>Home not found</h2>
        <Link href="/areas" className="btn btn-ghost">Back to areas</Link>
      </div>
    );
  if (!ctx || !e) return null;
  const area = getArea(property.areaId)!;

  const compare = () => {
    if (!isSaved(property.id)) toggleSaved(property.id);
    router.push("/saved");
  };

  const questions = [
    e.rentDiff > 50
      ? { q: "Why is it above the area's typical rent?", a: `It's ${euro(e.rentDiff)} above typical for a ${property.beds}-bed in ${area.name}. Ask what justifies the difference, and whether there's room to negotiate.` }
      : { q: "What's included in the rent?", a: "The rent is at or below typical for the area, a good sign. Check what's included: bills, parking, furniture." },
    { q: "What was the previous rent?", a: "Every tenancy must be registered with the RTB, and in Rent Pressure Zones increases are capped. You're entitled to ask." },
    { q: `Can I see the BER certificate?`, a: `A ${property.ber} rating affects heating bills on top of the rent. Lower ratings (D to G) can cost far more each winter.` },
  ];

  const sorted = [...e.factors].sort((a, b) => b.weight - a.weight);

  return (
    <div className="container fade-in">
      <Link href={`/areas/${area.id}`} className="back"><ArrowLeft size={16} /> Homes in {area.name}</Link>

      <div className="prop-hero">
        <div className="home-img">
          <HomeImage property={property} size="hero" />
          <div className="overlay-tl">
            <span className="tag dark"><MapPin size={12} /> {area.name}</span>
            {property.source ? <span className="tag dark">{property.source}</span> : <span className="tag dark">Sample listing</span>}
          </div>
        </div>
        <div className="card summary">
          <div className="row between" style={{ alignItems: "flex-start" }}>
            <div>
              <div className="rent">{euro(property.rent)}<small> /month</small></div>
              <FairRent diff={e.rentDiff} />
            </div>
            <FitRing fit={e.fit} size={80} />
          </div>
          <div>
            <h1 style={{ fontSize: 22 }}>{property.title}</h1>
            <p className="muted small" style={{ marginTop: 4 }}>{property.address}</p>
          </div>
          <div className="specs" style={{ fontSize: 14 }}>
            <span><BedDouble size={16} /> {property.beds} bed</span>
            <span><Bath size={16} /> {property.baths} bath</span>
            <span><Zap size={16} /> BER {property.ber}</span>
            <span><Footprints size={16} /> {property.walkToStopMin} min to {property.stopName}</span>
          </div>
          {property.features.length > 0 && (
            <div className="chips">
              {property.features.map((f) => (
                <span key={f} className="tag">{f}</span>
              ))}
            </div>
          )}
          <div className="row" style={{ marginTop: "auto" }}>
            <SaveButton propertyId={property.id} />
            <button type="button" className="btn btn-dark btn-sm" onClick={compare}>
              <Scale size={15} /> Compare{saved.length > 0 ? ` (${saved.length})` : ""}
            </button>
            {property.url && (
              <a href={property.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                View listing <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="three">
        <div className="card pad">
          <div className="card-title">
            <span className="icon-bubble work"><CalendarDays size={16} /></span>
            <h3>Your week from here</h3>
          </div>
          <WeekRows evaluation={e} />
          <div style={{ marginTop: 10 }}><TravelSource /></div>
        </div>

        <div className="card pad">
          <div className="card-title">
            <span className="icon-bubble accent"><Gauge size={16} /></span>
            <h3>Why {e.fit} Fit</h3>
          </div>
          {sorted.map((f) => {
            const Icon = factorIcon(f);
            return (
              <div key={f.key} className="factor" title={f.detail}>
                <Icon size={16} className="f-icon" />
                <span className="f-name">{placeLabel(f.label)}</span>
                <span className="f-w">{f.weight >= 3 ? "Must" : f.weight >= 2 ? "Matters" : ""}</span>
                <span className="f-bar">
                  <i style={{ width: `${Math.max(3, Math.round(f.score * 100))}%`, background: f.score >= 0.7 ? "var(--good)" : f.score >= 0.4 ? "var(--mixed)" : "var(--weak)" }} />
                </span>
                <span className="f-detail">{f.detail}</span>
              </div>
            );
          })}
        </div>

        <div className="stack">
          <div className="card pad">
            <div className="card-title">
              <span className="icon-bubble accent"><Scale size={16} /></span>
              <h3>Is the rent fair?</h3>
            </div>
            <RentScale rent={property.rent} typical={e.typicalRent} />
            <p className="tiny muted" style={{ marginTop: 10 }}>Against the typical asking rent for a {property.beds}-bed in {area.name}.</p>
          </div>
          <div className="card pad">
            <div className="card-title">
              <span className="icon-bubble place"><CircleHelp size={16} /></span>
              <h3>Ask before you view</h3>
            </div>
            {questions.map(({ q, a }) => (
              <details key={q} className="qa">
                <summary>
                  <CircleHelp size={16} className="muted" />
                  {q}
                  <ChevronDown size={16} className="chev" />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      <div className="section">
        <MapView
          small
          home={{ lat: property.lat, lng: property.lng, label: property.title }}
          places={e.links.map((l) => ({
            lat: l.point.lat,
            lng: l.point.lng,
            label: l.kind === "work" ? l.name : l.point.label,
            kind: l.kind,
            minutes: l.travel.minutes,
            icon: l.kind === "place" ? placeIcon({ name: l.name }) : undefined,
          }))}
          properties={propertiesInArea(area.id)
            .filter((p) => p.id !== property.id)
            .map((p) => ({ lat: p.lat, lng: p.lng, label: euro(p.rent), href: `/properties/${p.id}` }))}
        />
      </div>
    </div>
  );
}
