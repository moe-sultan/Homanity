// Simple, explainable travel-time estimates from straight-line distance.
// Good enough to compare options; replace with real routing (NTA GTFS,
// Google Routes) later without changing callers.
import type { LatLng } from "../data/types";
import type { TransportMode } from "../context/types";

export type Endpoint = LatLng & { rail: boolean; walkToStopMin?: number };

export type TravelEstimate = {
  minutes: number;
  mode: "walk" | "rail" | "bus" | "transit" | "car" | "cycle";
  km: number; // estimated route distance
  farePerTrip?: number; // EUR, public transport or running cost for car
  source?: "google" | "estimate";
};

// Real routed times (Google Routes) keyed by origin and destination point.
// When a pair is missing, the straight-line estimate below is used instead.
export type TravelLookup = Map<string, { minutes: number; km: number }>;

export const pointKey = (p: LatLng) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
export const pairKey = (from: LatLng, to: LatLng) => `${pointKey(from)}|${pointKey(to)}`;

export function travelBetween(from: Endpoint, to: Endpoint, mode: TransportMode = "public_transport", lookup?: TravelLookup): TravelEstimate {
  const estimate = estimateTravel(from, to, mode);
  const routed = lookup?.get(pairKey(from, to));
  if (!routed) return estimate;
  const km = routed.km;
  const farePerTrip =
    mode === "car" ? Math.round(km * 0.25 * 100) / 100 : mode === "cycle" ? 0 : km < 1.5 ? 0 : publicFare(km);
  return {
    minutes: Math.max(1, Math.round(routed.minutes)),
    mode: estimate.mode === "walk" ? "walk" : mode === "car" ? "car" : mode === "cycle" ? "cycle" : "transit",
    km,
    farePerTrip,
    source: "google",
  };
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function publicFare(km: number): number {
  // Approximate TFI Leap adult fares (2026, indicative).
  if (km < 15) return 2.0;
  if (km < 35) return 3.4;
  return 5.0;
}

export function estimateTravel(from: Endpoint, to: Endpoint, mode: TransportMode = "public_transport"): TravelEstimate {
  const km = haversineKm(from, to) * 1.3; // road/route detour factor
  const round = (n: number) => Math.max(1, Math.round(n));

  if (km < 1.5) return { minutes: round(km * 12), mode: "walk", km, source: "estimate" };

  if (mode === "car") {
    const drive = Math.min(km, 10) * 2.2 + Math.max(km - 10, 0) * 1.0 + 5;
    return { minutes: round(drive), mode: "car", km, farePerTrip: Math.round(km * 0.25 * 100) / 100, source: "estimate" };
  }

  if (mode === "cycle" && km <= 15) {
    return { minutes: round(km * 4 + 3), mode: "cycle", km, farePerTrip: 0, source: "estimate" };
  }

  const access = from.walkToStopMin ?? 8;
  const wait = 5;
  if (from.rail && to.rail) {
    const ride = Math.min(km, 10) * 1.8 + Math.max(km - 10, 0) * 0.9;
    return { minutes: round(access + wait + ride + 5), mode: "rail", km, farePerTrip: publicFare(km), source: "estimate" };
  }
  const ride = Math.min(km, 12) * 3.0 + Math.max(km - 12, 0) * 1.1;
  return { minutes: round(access + wait + ride + 4), mode: "bus", km, farePerTrip: publicFare(km), source: "estimate" };
}

export const MODE_LABEL: Record<TravelEstimate["mode"], string> = {
  walk: "walk",
  rail: "by rail",
  bus: "by bus",
  transit: "by public transport",
  car: "by car",
  cycle: "by bike",
};
