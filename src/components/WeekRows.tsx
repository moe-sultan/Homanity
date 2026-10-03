"use client";

import { Bike, Bus, Car, Footprints, TrainFront, type LucideIcon } from "lucide-react";
import type { Evaluation } from "@/lib/fit/evaluate";
import type { TravelEstimate } from "@/lib/fit/travel";
import { euro, linkIcon, placeLabel } from "./bits";

const MODE_ICON: Record<TravelEstimate["mode"], LucideIcon> = {
  walk: Footprints,
  rail: TrainFront,
  bus: Bus,
  transit: TrainFront,
  car: Car,
  cycle: Bike,
};
const MODE_SHORT: Record<TravelEstimate["mode"], string> = {
  walk: "walk",
  rail: "rail",
  bus: "bus",
  transit: "transit",
  car: "drive",
  cycle: "bike",
};

// What a week looks like from a home: one bar per trip, length = minutes.
export function WeekRows({ evaluation }: { evaluation: Evaluation }) {
  if (evaluation.links.length === 0) {
    return <p className="muted small">Add work or important places to see how this connects to your week.</p>;
  }
  const weeklyMinutes = evaluation.links
    .filter((l) => l.kind === "work")
    .reduce((s, l) => s + l.travel.minutes * 2 * (l.daysPerWeek ?? 5), 0);
  return (
    <div className="week">
      {evaluation.links.map((l) => {
        const Icon = linkIcon(l);
        const ModeIcon = MODE_ICON[l.travel.mode];
        const tone = l.travel.minutes <= 25 ? "var(--good)" : l.travel.minutes <= 50 ? "var(--mixed)" : "var(--weak)";
        return (
          <div key={l.id} className="week-row" title={l.kind === "place" && l.point.label !== l.name ? l.point.label : undefined}>
            <span className={`icon-bubble ${l.kind}`}>
              <Icon size={16} />
            </span>
            <span className="name">{l.kind === "work" ? l.name : placeLabel(l.name)}</span>
            <span className="mins">
              {l.travel.minutes}
              <small>
                min <ModeIcon size={11} style={{ verticalAlign: -1 }} /> {MODE_SHORT[l.travel.mode]}
              </small>
            </span>
            <span className="bar">
              <i style={{ width: `${Math.min(100, (l.travel.minutes / 75) * 100)}%`, background: tone }} />
            </span>
          </div>
        );
      })}
      {(weeklyMinutes > 0 || (evaluation.monthlyTransportCost ?? 0) > 0) && (
        <div className="week-total">
          <span className="muted">Commuting each week</span>
          <span>
            <b>{(weeklyMinutes / 60).toFixed(1)} h</b>
            {evaluation.monthlyTransportCost ? <span className="muted"> · ≈ {euro(evaluation.monthlyTransportCost)}/mo</span> : null}
          </span>
        </div>
      )}
    </div>
  );
}
