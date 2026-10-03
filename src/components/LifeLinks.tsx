"use client";

import type { Evaluation } from "@/lib/fit/evaluate";
import { MODE_LABEL } from "@/lib/fit/travel";
import { euro } from "./bits";

export function LifeLinks({ evaluation }: { evaluation: Evaluation }) {
  if (evaluation.links.length === 0) {
    return <p className="muted small">Add work or important places to see how this connects to your week.</p>;
  }
  return (
    <div className="links">
      {evaluation.links.map((l) => (
        <div key={l.id} className="link-row">
          <div className="link-name">
            {l.kind === "work" ? `Work: ${l.name}` : l.name}
            <span className={`imp ${l.importance}`}>{l.importance}</span>
          </div>
          <div className="link-min">{l.travel.minutes} min</div>
          <div className="link-sub">
            {MODE_LABEL[l.travel.mode]} · {l.travel.km.toFixed(1)} km
            {l.kind === "place" && l.point.label !== l.name ? ` · ${l.point.label}` : ""}
            {l.daysPerWeek ? ` · ${l.daysPerWeek} days a week` : ""}
          </div>
        </div>
      ))}
      {evaluation.monthlyTransportCost !== undefined && evaluation.monthlyTransportCost > 0 && (
        <div className="link-row">
          <div className="link-name">Commuting cost</div>
          <div className="link-min">≈ {euro(evaluation.monthlyTransportCost)}/mo</div>
          <div className="link-sub">Estimated from typical fares or running costs</div>
        </div>
      )}
    </div>
  );
}
