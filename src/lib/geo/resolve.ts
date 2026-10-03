// Turns a place name ("Grand Canal Dock", "Beaumont Hospital", "Mum's in
// Lucan") into a point. Curated places first (instant, no key), then Google
// Places text search when GOOGLE_MAPS_API_KEY is set. Server-only.
import { findKnownPlace, KNOWN_PLACES } from "../data/places";
import { haversineKm } from "../fit/travel";
import { integrations } from "../integrations";

export type ResolvedPlace = {
  label: string;
  lat: number;
  lng: number;
  rail: boolean;
  source: "curated" | "google";
};

// Rough bounding box for the island of Ireland, used to keep searches local.
const IRELAND = { low: { latitude: 51.3, longitude: -10.7 }, high: { latitude: 55.5, longitude: -5.3 } };

// Is there rail (DART, Luas, commuter) close by? Borrowed from the nearest
// curated place; only used by the offline travel estimate.
function nearRail(lat: number, lng: number): boolean {
  return KNOWN_PLACES.some((p) => p.rail && haversineKm(p, { lat, lng }) < 1.5);
}

const cache = new Map<string, ResolvedPlace | null>();

async function googlePlaceSearch(query: string): Promise<ResolvedPlace | null> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY!,
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({ textQuery: query, regionCode: "IE", locationRestriction: { rectangle: IRELAND }, pageSize: 1 }),
  });
  if (!res.ok) {
    console.warn(`Google Places search failed (${res.status}): ${await res.text()}`);
    return null;
  }
  const data = (await res.json()) as {
    places?: { displayName?: { text: string }; formattedAddress?: string; location: { latitude: number; longitude: number } }[];
  };
  const p = data.places?.[0];
  if (!p) return null;
  const { latitude: lat, longitude: lng } = p.location;
  const label = p.displayName?.text ?? p.formattedAddress?.split(",")[0] ?? query;
  return { label, lat, lng, rail: nearRail(lat, lng), source: "google" };
}

export async function resolvePlaceName(query: string): Promise<ResolvedPlace | null> {
  const q = query.trim();
  if (!q) return null;
  const known = findKnownPlace(q);
  const curated: ResolvedPlace | null = known
    ? { label: known.name, lat: known.lat, lng: known.lng, rail: known.rail, source: "curated" }
    : null;
  // "Dublin" on its own resolves to the city centre; with a key, let Google
  // try the fuller name first ("Microsoft, Leopardstown, Dublin").
  const generic = known?.id === "city-centre" && !/^\s*(dublin|dublin city( centre)?|city cent(re|er)|town)\s*$/i.test(q);
  if (curated && !(generic && integrations.googleMaps())) return curated;
  if (!integrations.googleMaps()) return curated;

  const key = q.toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? curated;
  let found: ResolvedPlace | null = null;
  try {
    found = await googlePlaceSearch(q);
  } catch (e) {
    console.warn("Google Places search error", e);
  }
  cache.set(key, found);
  return found ?? curated;
}
