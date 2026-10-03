"use client";

import { ChevronRight, Clock, House, TrainFront, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AreaPicture, FitRing, TravelSource, euro, placeIcon, useRequireContext } from "@/components/bits";
import { AreasMap } from "@/components/MapView";
import { evaluateAllAreas, type AreaEvaluation } from "@/lib/fit/evaluate";
import { useLive } from "@/lib/live";

function AreaRow({ e, budget, hot, onHover }: { e: AreaEvaluation; budget?: number; hot: boolean; onHover: (id: string | null) => void }) {
  const work = e.links.find((l) => l.kind === "work");
  const overBudget = budget !== undefined && e.typicalRent > budget;
  const rail = e.area.transport.filter((t) => t.mode !== "Bus").map((t) => t.mode);
  return (
    <Link
      href={`/areas/${e.area.id}`}
      className={`card area-row ${hot ? "hot" : ""}`}
      onMouseEnter={() => onHover(e.area.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="area-thumb" aria-hidden>
        <AreaPicture area={e.area} height={64} />
      </div>
      <FitRing fit={e.fit} size={58} />
      <div className="area-main">
        <div className="area-name">
          <h3>{e.area.name}</h3>
          {!e.area.inDublin && <span className="tag accent">Co. {e.area.county}</span>}
        </div>
        <div className="metrics">
          <span className={`metric ${overBudget ? "warn" : budget ? "ok" : ""}`} title={`Typical rent for a ${e.beds}-bed`}>
            <Wallet size={16} /> {euro(e.typicalRent)} <small>{e.beds}-bed</small>
          </span>
          {work && (
            <span className="metric" title={`To ${work.name}`}>
              <Clock size={16} /> {work.travel.minutes} min <small>to work</small>
            </span>
          )}
          {rail.length > 0 ? (
            <span className="metric" title={e.area.transport.map((t) => t.name).join(", ")}>
              <TrainFront size={16} /> {[...new Set(rail)].join(" · ")}
            </span>
          ) : (
            <span className="metric muted"><small>Bus only</small></span>
          )}
          <span className="metric">
            <House size={16} /> {e.propertyFits.length} <small>homes</small>
          </span>
        </div>
      </div>
      <ChevronRight size={20} className="muted" />
    </Link>
  );
}

export default function AreasPage() {
  const ctx = useRequireContext();
  const { lookup } = useLive();
  const results = useMemo(() => (ctx ? evaluateAllAreas(ctx, lookup) : []), [ctx, lookup]);
  const [hot, setHot] = useState<string | null>(null);
  if (!ctx) return null;

  // Split at 70 Fit, but always show a few areas up top.
  const cut = Math.max(3, results.filter((r) => r.fit >= 70).length);
  const fits = results.slice(0, cut);
  const others = results.slice(cut);
  const beyond = fits.filter((r) => !r.area.inDublin).length;

  const places = results[0]?.links
    .filter((l) => l.kind === "work" || ctx.importantPlaces.find((p) => p.id === l.id)?.target.kind === "fixed")
    .map((l) => ({ lat: l.point.lat, lng: l.point.lng, label: l.name, kind: l.kind, icon: l.kind === "place" ? placeIcon({ name: l.name }) : undefined }));

  return (
    <div className="container fade-in">
      <div className="page-head">
        <h1>Places that could fit your life</h1>
        <div className="row">
          <span className="sub">
            {fits.length} good matches{beyond > 0 ? `, ${beyond} outside Dublin` : ""}. Fit uses typical rents for a {results[0]?.beds ?? 2}-bed.
          </span>
          <TravelSource />
        </div>
      </div>

      <div className="areas-layout">
        <div className="area-list">
          {fits.map((e) => (
            <AreaRow key={e.area.id} e={e} budget={ctx.budget} hot={hot === e.area.id} onHover={setHot} />
          ))}
          {others.length > 0 && <div className="divider">Bigger trade-offs</div>}
          {others.map((e) => (
            <AreaRow key={e.area.id} e={e} budget={ctx.budget} hot={hot === e.area.id} onHover={setHot} />
          ))}
        </div>
        <div className="areas-map">
          <AreasMap
            areas={results.map((r) => ({ id: r.area.id, lat: r.area.lat, lng: r.area.lng, label: r.area.name, fit: r.fit, href: `/areas/${r.area.id}` }))}
            places={places ?? []}
            hot={hot}
            onHover={setHot}
          />
        </div>
      </div>
    </div>
  );
}
