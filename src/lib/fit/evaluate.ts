// Derived calculations: combines a UserContext with listing/area data.
// Nothing here is stored; it is recomputed from the two inputs.
import { AREAS, getArea } from "../data/areas";
import { POIS } from "../data/places";
import { PROPERTIES, propertiesInArea } from "../data/properties";
import type { Area, LatLng, Poi, Property } from "../data/types";
import type { ImportantPlace, Importance, UserContext, WorkPlace } from "../context/types";
import { haversineKm, travelBetween, type Endpoint, type TravelEstimate, type TravelLookup } from "./travel";

const WEIGHT: Record<Importance, number> = { high: 3, medium: 2, low: 1 };

export type FitFactor = {
  key: string;
  label: string;
  weight: number;
  score: number; // 0..1
  detail: string;
};

export type PlaceLink = {
  id: string;
  name: string;
  importance: Importance;
  point: LatLng & { label: string };
  travel: TravelEstimate;
  kind: "work" | "place";
  daysPerWeek?: number;
};

export type Evaluation = {
  fit: number; // 0..100
  factors: FitFactor[];
  links: PlaceLink[];
  rent: number;
  typicalRent: number;
  rentDiff: number; // rent - typical (negative = below typical)
  monthlyTransportCost?: number;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const linear = (value: number, best: number, worst: number) => clamp01((worst - value) / (worst - best));

function nearestPoi(home: LatLng, category: Poi["category"]): Poi | undefined {
  let best: Poi | undefined;
  let bestKm = Infinity;
  for (const poi of POIS) {
    if (poi.category !== category) continue;
    const km = haversineKm(home, poi);
    if (km < bestKm) {
      bestKm = km;
      best = poi;
    }
  }
  return best;
}

function resolvePlace(home: LatLng, place: ImportantPlace): (Endpoint & { label: string }) | undefined {
  if (place.target.kind === "fixed") return { ...place.target };
  const poi = nearestPoi(home, place.target.category);
  return poi ? { lat: poi.lat, lng: poi.lng, rail: false, label: poi.name } : undefined;
}

function workLink(home: Endpoint, w: WorkPlace, ctx: UserContext, lookup?: TravelLookup): PlaceLink {
  return {
    id: w.id,
    name: w.label,
    importance: ctx.priorities.commute,
    point: { lat: w.lat, lng: w.lng, label: w.label },
    travel: travelBetween(home, w, ctx.transport, lookup),
    kind: "work",
    daysPerWeek: w.daysPerWeek,
  };
}

export function evaluateHome(
  ctx: UserContext,
  home: Endpoint,
  rent: number,
  typicalRent: number,
  beds?: number,
  lookup?: TravelLookup,
): Evaluation {
  const factors: FitFactor[] = [];
  const links: PlaceLink[] = [];

  if (ctx.budget) {
    const over = rent - ctx.budget;
    factors.push({
      key: "budget",
      label: "Budget",
      weight: WEIGHT[ctx.priorities.budget],
      score: over <= 0 ? 1 : clamp01(1 - over / (ctx.budget * 0.2)),
      detail: over <= 0 ? `€${Math.abs(over).toLocaleString()} under your budget` : `€${over.toLocaleString()} over your budget`,
    });
  }

  let monthlyCost = 0;
  for (const w of ctx.work) {
    const link = workLink(home, w, ctx, lookup);
    links.push(link);
    const days = w.daysPerWeek ?? 5;
    const dayFactor = 0.6 + 0.12 * days;
    factors.push({
      key: `work-${w.id}`,
      label: `Commute to ${w.label}`,
      weight: WEIGHT[ctx.priorities.commute] * dayFactor * 1.5,
      score: linear(link.travel.minutes, 25, 80),
      detail: `${link.travel.minutes} min each way, ${days} day${days === 1 ? "" : "s"} a week`,
    });
    if (link.travel.farePerTrip !== undefined) monthlyCost += link.travel.farePerTrip * 2 * days * 4.33;
  }

  for (const place of ctx.importantPlaces) {
    const target = resolvePlace(home, place);
    if (!target) continue;
    const travel = travelBetween(home, target, ctx.transport, lookup);
    links.push({ id: place.id, name: place.name, importance: place.importance, point: target, travel, kind: "place" });
    factors.push({
      key: `place-${place.id}`,
      label: place.name,
      weight: WEIGHT[place.importance],
      score: linear(travel.minutes, 8, 35),
      detail: `${travel.minutes} min to ${target.label}`,
    });
  }

  if (ctx.bedrooms && beds !== undefined) {
    const short = ctx.bedrooms.count - beds;
    factors.push({
      key: "bedrooms",
      label: "Space",
      weight: 3,
      score: short <= 0 ? 1 : 0,
      detail: short <= 0 ? `${beds} bed${beds === 1 ? "" : "s"}, enough for your household` : `${beds} bed${beds === 1 ? "" : "s"}, ${short} fewer than you need`,
    });
  }

  if (ctx.transport === "public_transport" && home.walkToStopMin !== undefined) {
    factors.push({
      key: "transport",
      label: "Public transport access",
      weight: 1,
      score: linear(home.walkToStopMin, 5, 20),
      detail: `${home.walkToStopMin} min walk to a frequent stop`,
    });
  }

  const rentDiff = rent - typicalRent;
  factors.push({
    key: "value",
    label: "Rent vs area",
    weight: 1,
    score: linear(rentDiff / typicalRent, -0.1, 0.1),
    detail: rentDiffLabel(rentDiff),
  });

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  let fit = (100 * factors.reduce((s, f) => s + f.weight * f.score, 0)) / totalWeight;
  // A home that is too small for the household can't be a strong fit,
  // however good the rest looks.
  const bedShort = ctx.bedrooms && beds !== undefined ? ctx.bedrooms.count - beds : 0;
  if (bedShort > 0) fit *= Math.pow(0.75, bedShort);
  fit = Math.round(fit);

  return {
    fit,
    factors,
    links,
    rent,
    typicalRent,
    rentDiff,
    monthlyTransportCost: ctx.work.length ? Math.round(monthlyCost) : undefined,
  };
}

export function rentDiffLabel(diff: number): string {
  if (Math.abs(diff) < 25) return "In line with typical area rent";
  return diff < 0
    ? `€${Math.abs(diff).toLocaleString()} below typical area rent`
    : `€${diff.toLocaleString()} above typical area rent`;
}

export function evaluateProperty(ctx: UserContext, property: Property, lookup?: TravelLookup): Evaluation {
  const area = getArea(property.areaId)!;
  return evaluateHome(
    ctx,
    { lat: property.lat, lng: property.lng, rail: area.rail, walkToStopMin: property.walkToStopMin },
    property.rent,
    area.typicalRent[property.beds],
    property.beds,
    lookup,
  );
}

export type AreaEvaluation = Evaluation & {
  area: Area;
  beds: 1 | 2 | 3 | 4;
  propertyFits: { property: Property; evaluation: Evaluation }[];
};

export function evaluateArea(ctx: UserContext, area: Area, lookup?: TravelLookup): AreaEvaluation {
  const beds = (Math.min(4, Math.max(1, ctx.bedrooms?.count ?? 2)) as 1 | 2 | 3 | 4);
  const props = propertiesInArea(area.id);
  const avgWalk = props.length ? Math.round(props.reduce((s, p) => s + p.walkToStopMin, 0) / props.length) : 8;
  const evaluation = evaluateHome(
    ctx,
    { lat: area.lat, lng: area.lng, rail: area.rail, walkToStopMin: avgWalk },
    area.typicalRent[beds],
    area.typicalRent[beds],
    beds,
    lookup,
  );
  const propertyFits = props
    .map((property) => ({ property, evaluation: evaluateProperty(ctx, property, lookup) }))
    .sort((a, b) => b.evaluation.fit - a.evaluation.fit);
  return { ...evaluation, area, beds, propertyFits };
}

export function evaluateAllAreas(ctx: UserContext, lookup?: TravelLookup): AreaEvaluation[] {
  return AREAS.map((a) => evaluateArea(ctx, a, lookup)).sort((a, b) => b.fit - a.fit);
}

// Every origin (area centres and homes) and fixed destination (work and named
// places) the Fit score needs a travel time for. "Nearest" places are left to
// the estimate since they depend on the home.
export function travelPairsFor(ctx: UserContext): { origins: LatLng[]; destinations: LatLng[] } {
  const origins = [...AREAS.map((a) => ({ lat: a.lat, lng: a.lng })), ...PROPERTIES.map((p) => ({ lat: p.lat, lng: p.lng }))];
  const destinations = [
    ...ctx.work.map((w) => ({ lat: w.lat, lng: w.lng })),
    ...ctx.importantPlaces.flatMap((p) => (p.target.kind === "fixed" ? [{ lat: p.target.lat, lng: p.target.lng }] : [])),
  ];
  return { origins, destinations };
}

// Short human signals for cards: "42 min to work · 8 min to school".
export function topSignals(e: Evaluation, max = 3): string[] {
  const order: Record<Importance, number> = { high: 0, medium: 1, low: 2 };
  return [...e.links]
    .sort((a, b) => (a.kind === "work" ? -1 : 0) - (b.kind === "work" ? -1 : 0) || order[a.importance] - order[b.importance])
    .slice(0, max)
    .map((l) => `${l.travel.minutes} min to ${shortName(l)}`);
}

export function shortName(l: PlaceLink): string {
  if (l.kind === "work") return "work";
  return l.name
    .replace(/^Nearest /, "")
    .replace(/ \(.*\)$/, "")
    .toLowerCase()
    .replace(/^secondary school$|^primary school$/, "school");
}

export function fitTone(fit: number): "strong" | "good" | "mixed" | "weak" {
  if (fit >= 80) return "strong";
  if (fit >= 65) return "good";
  if (fit >= 50) return "mixed";
  return "weak";
}
