"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FitBadge, euro, useRequireContext } from "@/components/bits";
import { evaluateAllAreas, topSignals, type AreaEvaluation } from "@/lib/fit/evaluate";

function AreaCard({ e, budget }: { e: AreaEvaluation; budget?: number }) {
  const work = e.links.find((l) => l.kind === "work");
  const signals = topSignals(e, 3).filter((s) => !s.endsWith("to work")).slice(0, 2);
  const rents = e.propertyFits.map((p) => p.property.rent);
  const overBudget = budget !== undefined && e.typicalRent > budget;
  return (
    <Link href={`/areas/${e.area.id}`} className="card area-card">
      <div className="row between">
        <div>
          <h3>{e.area.name}</h3>
          <div className="small muted">
            {e.area.county}
            {!e.area.inDublin ? " · beyond Dublin" : ""}
          </div>
        </div>
        <FitBadge fit={e.fit} />
      </div>
      <div className="stats">
        <div>
          <div className="stat-label">Typical rent, {e.beds} bed</div>
          <div className="stat-value" style={overBudget ? { color: "var(--mixed)" } : undefined}>
            {euro(e.typicalRent)}
          </div>
        </div>
        <div>
          <div className="stat-label">{work ? `To ${work.name}` : "To the city centre"}</div>
          <div className="stat-value">{work ? `${work.travel.minutes} min` : "—"}</div>
        </div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        {e.area.transport.map((t) => (
          <span key={t.name} className={`tag ${t.mode === "Bus" ? "" : "rail"}`}>
            {t.mode === "Bus" ? t.name : t.mode}
          </span>
        ))}
      </div>
      {signals.length > 0 && (
        <div className="signals">
          {signals.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      )}
      <div className="small muted">
        {e.propertyFits.length} homes to explore{rents.length ? ` · ${euro(Math.min(...rents))} to ${euro(Math.max(...rents))}` : ""}
      </div>
    </Link>
  );
}

export default function AreasPage() {
  const ctx = useRequireContext();
  const results = useMemo(() => (ctx ? evaluateAllAreas(ctx) : []), [ctx]);
  if (!ctx) return null;

  // Split at 75 Fit, but always show at least a few areas up top.
  const cut = Math.max(3, results.filter((r) => r.fit >= 75).length);
  const fits = results.slice(0, cut);
  const others = results.slice(cut);
  const beyond = fits.filter((r) => !r.area.inDublin).length;

  return (
    <div className="container">
      <Link href="/context" className="back">← Your context</Link>
      <div className="page-head">
        <span className="eyebrow">Step 2 of 3 · Areas</span>
        <h1>Places that could fit your life</h1>
        <p className="lede">
          Each area is scored on how well it fits what you told us, using typical rents for a {results[0]?.beds ?? 2}-bed home.
          {beyond > 0 && ` ${beyond} of these are outside Dublin, where your rent often goes further.`}
        </p>
      </div>

      <div className="grid grid-3">
        {fits.map((e) => (
          <AreaCard key={e.area.id} e={e} budget={ctx.budget} />
        ))}
      </div>

      {others.length > 0 && (
        <>
          <div className="section-title">
            <h2>Bigger trade-offs</h2>
            <span className="small muted">Still worth a look if something else matters more to you</span>
          </div>
          <div className="grid grid-3">
            {others.map((e) => (
              <AreaCard key={e.area.id} e={e} budget={ctx.budget} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
