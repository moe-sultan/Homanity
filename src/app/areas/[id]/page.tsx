"use client";

import { ArrowLeft, Bus, CalendarDays, MapPinned, TrainFront, Wallet } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { AreaPicture, FitRing, TravelSource, categoryIcon, euro, placeIcon, useRequireContext } from "@/components/bits";
import { HomeCard } from "@/components/HomeCard";
import { MapView } from "@/components/MapView";
import { WeekRows } from "@/components/WeekRows";
import { getArea } from "@/lib/data/areas";
import { POIS, POI_LABEL } from "@/lib/data/places";
import type { Area } from "@/lib/data/types";
import { evaluateArea } from "@/lib/fit/evaluate";
import { haversineKm } from "@/lib/fit/travel";
import { useLive } from "@/lib/live";

function RentBars({ area, beds, budget }: { area: Area; beds: number; budget?: number }) {
  const values = ([1, 2, 3, 4] as const).map((b) => area.typicalRent[b]);
  const max = Math.max(...values, budget ?? 0) * 1.08;
  const H = 94; // tallest column, px
  const BASE = 24; // label row under the columns, px
  return (
    <div className="rent-bars">
      {budget && (
        <div className="budget-line" style={{ bottom: BASE + (budget / max) * H }}>
          <span>Your budget {euro(budget)}</span>
        </div>
      )}
      {([1, 2, 3, 4] as const).map((b) => (
        <div key={b} className={`rent-col ${b === beds ? "me" : ""}`}>
          <span className="v">{euro(area.typicalRent[b])}</span>
          <span className="col" style={{ height: (area.typicalRent[b] / max) * H }} />
          <span className="k">{b} bed</span>
        </div>
      ))}
    </div>
  );
}

export default function AreaPage() {
  const { id } = useParams<{ id: string }>();
  const ctx = useRequireContext();
  const { lookup } = useLive();
  const area = getArea(id);
  const e = useMemo(() => (ctx && area ? evaluateArea(ctx, area, lookup) : null), [ctx, area, lookup]);

  if (!area)
    return (
      <div className="container empty">
        <h2>Area not found</h2>
        <Link href="/areas" className="btn btn-ghost">Back to areas</Link>
      </div>
    );
  if (!ctx || !e) return null;

  const nearby = POIS.filter((p) => haversineKm(p, area) < 2.5 && p.category !== "station")
    .map((p) => ({ ...p, km: haversineKm(p, area) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 8);

  return (
    <div className="container fade-in">
      <Link href="/areas" className="back"><ArrowLeft size={16} /> All areas</Link>
      <div className="area-banner">
        <AreaPicture area={area} height={200} credit />
      </div>
      <div className="detail-head">
        <div className="titles">
          <div className="row">
            <h1>{area.name}</h1>
            <span className={`tag ${area.inDublin ? "" : "accent"}`}>{area.inDublin ? "Dublin" : `Co. ${area.county}`}</span>
          </div>
          <p className="sub">{area.blurb}</p>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <span className="small muted" style={{ textAlign: "right" }}>Fit for a<br />typical {e.beds}-bed</span>
          <FitRing fit={e.fit} size={78} />
        </div>
      </div>

      <div className="split">
        <MapView
          tall
          homeKind="area"
          home={{ lat: area.lat, lng: area.lng, label: area.name }}
          places={e.links.map((l) => ({
            lat: l.point.lat,
            lng: l.point.lng,
            label: l.kind === "work" ? l.name : l.point.label,
            kind: l.kind,
            minutes: l.travel.minutes,
            icon: l.kind === "place" ? placeIcon({ name: l.name }) : undefined,
          }))}
          properties={e.propertyFits.map(({ property }) => ({
            lat: property.lat,
            lng: property.lng,
            label: euro(property.rent),
            href: `/properties/${property.id}`,
          }))}
        />
        <div className="stack">
          <div className="card pad">
            <div className="card-title">
              <span className="icon-bubble work"><CalendarDays size={16} /></span>
              <h3>Your week from here</h3>
              <TravelSource />
            </div>
            <WeekRows evaluation={e} />
          </div>
          <div className="card pad">
            <div className="card-title">
              <span className="icon-bubble accent"><Wallet size={16} /></span>
              <h3>Typical rent</h3>
            </div>
            <RentBars area={area} beds={e.beds} budget={ctx.budget} />
          </div>
        </div>
      </div>

      <div className="split section">
        <div className="card pad">
          <div className="card-title">
            <span className="icon-bubble"><MapPinned size={16} /></span>
            <h3>Everyday places nearby</h3>
          </div>
          <div className="nearby">
            {nearby.map((p) => {
              const Icon = categoryIcon(p.category);
              return (
                <div key={p.id} className="nearby-item" title={p.name}>
                  <Icon size={16} className="muted" />
                  <div>
                    <b>{POI_LABEL[p.category]}</b>
                    <span>{p.km < 1 ? `${Math.round(p.km * 1000)} m` : `${p.km.toFixed(1)} km`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card pad">
          <div className="card-title">
            <span className="icon-bubble"><TrainFront size={16} /></span>
            <h3>Getting around</h3>
          </div>
          <div className="chips">
            {area.transport.map((t) => (
              <span key={t.name} className={`tag ${t.mode === "Bus" ? "" : "accent"}`} style={{ fontSize: 13, padding: "6px 10px" }}>
                {t.mode === "Bus" ? <Bus size={14} /> : <TrainFront size={14} />} {t.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h2>{e.propertyFits.length} homes in {area.name}</h2>
          <span className="small muted">Fit is how well a home fits your life, not a rating of the home</span>
        </div>
        <div className="grid grid-3">
          {e.propertyFits.map(({ property, evaluation }) => (
            <HomeCard key={property.id} property={property} evaluation={evaluation} />
          ))}
        </div>
      </div>
    </div>
  );
}
