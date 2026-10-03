// Real travel times from the Google Routes API (computeRouteMatrix). Covers
// public transport (TFI timetables are in Google's transit data), driving
// and cycling. Server-only: needs GOOGLE_MAPS_API_KEY with the Routes API on.
import type { TransportMode } from "../context/types";
import type { LatLng } from "../data/types";
import { pairKey } from "../fit/travel";

export type RoutedPair = { key: string; minutes: number; km: number };

const TRAVEL_MODE: Record<TransportMode, string> = {
  public_transport: "TRANSIT",
  car: "DRIVE",
  cycle: "BICYCLE",
};

// Results barely change within a day; keep them for the life of the server.
const cache = new Map<string, RoutedPair | null>();

// Commute times are most useful for a typical weekday morning: next
// Monday-to-Friday at 08:30 Irish time.
function nextWeekdayMorning(): string {
  const now = new Date();
  for (let add = 1; add <= 7; add++) {
    const d = new Date(now.getTime() + add * 86400000);
    const day = d.getUTCDay();
    if (day === 0 || day === 6) continue;
    const offset = new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", timeZoneName: "shortOffset" })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")?.value; // "GMT" or "GMT+1"
    const hours = Number(offset?.replace("GMT", "") || 0);
    const date = d.toISOString().slice(0, 10);
    return new Date(new Date(`${date}T08:30:00Z`).getTime() - hours * 3600000).toISOString();
  }
  return now.toISOString();
}

const waypoint = (p: LatLng) => ({ waypoint: { location: { latLng: { latitude: p.lat, longitude: p.lng } } } });

async function matrix(origins: LatLng[], destinations: LatLng[], mode: TransportMode): Promise<RoutedPair[]> {
  const body: Record<string, unknown> = {
    origins: origins.map(waypoint),
    destinations: destinations.map(waypoint),
    travelMode: TRAVEL_MODE[mode],
  };
  if (mode === "public_transport") body.departureTime = nextWeekdayMorning();
  if (mode === "car") body.routingPreference = "TRAFFIC_UNAWARE";

  const res = await fetch("https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY!,
      "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,condition",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Google Routes ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as {
    originIndex: number;
    destinationIndex: number;
    duration?: string;
    distanceMeters?: number;
    condition?: string;
  }[];
  return rows.flatMap((r) => {
    if (r.condition !== "ROUTE_EXISTS" || !r.duration) return [];
    return [
      {
        key: pairKey(origins[r.originIndex], destinations[r.destinationIndex]),
        minutes: parseInt(r.duration, 10) / 60,
        km: (r.distanceMeters ?? 0) / 1000,
      },
    ];
  });
}

// Fetches every origin x destination pair, in chunks the API accepts
// (100 elements per request for transit), reusing cached pairs.
export async function routeMatrix(origins: LatLng[], destinations: LatLng[], mode: TransportMode): Promise<RoutedPair[]> {
  const out: RoutedPair[] = [];
  const missingOrigins = new Set<number>();
  const missingDest = new Set<number>();
  origins.forEach((o, i) =>
    destinations.forEach((d, j) => {
      const key = `${mode}|${pairKey(o, d)}`;
      if (cache.has(key)) {
        const hit = cache.get(key);
        if (hit) out.push(hit);
      } else {
        missingOrigins.add(i);
        missingDest.add(j);
      }
    }),
  );
  const os = [...missingOrigins].map((i) => origins[i]);
  const ds = [...missingDest].map((j) => destinations[j]);
  const D = 5;
  const O = 20;
  const jobs: Promise<void>[] = [];
  for (let j = 0; j < ds.length; j += D) {
    for (let i = 0; i < os.length; i += O) {
      const oChunk = os.slice(i, i + O);
      const dChunk = ds.slice(j, j + D);
      jobs.push(
        matrix(oChunk, dChunk, mode).then((pairs) => {
          const found = new Set(pairs.map((p) => p.key));
          for (const p of pairs) {
            cache.set(`${mode}|${p.key}`, p);
            out.push(p);
          }
          // Remember pairs with no route so we don't ask again.
          for (const o of oChunk) for (const d of dChunk) if (!found.has(pairKey(o, d))) cache.set(`${mode}|${pairKey(o, d)}`, null);
        }),
      );
    }
  }
  await Promise.all(jobs);
  return out;
}
