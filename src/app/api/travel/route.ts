import { routeMatrix } from "@/lib/geo/routes";
import { integrationStatus } from "@/lib/integrations";
import type { TransportMode } from "@/lib/context/types";
import type { LatLng } from "@/lib/data/types";

const MODES: TransportMode[] = ["public_transport", "car", "cycle"];
const isPoint = (p: unknown): p is LatLng =>
  !!p && typeof (p as LatLng).lat === "number" && typeof (p as LatLng).lng === "number";

// POST { origins: LatLng[], destinations: LatLng[], mode }
// -> { source: "google" | "estimate", pairs: { key, minutes, km }[] }
// With no Google key this returns no pairs and the client keeps its estimates.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const origins = Array.isArray(body?.origins) ? body.origins.filter(isPoint).slice(0, 200) : [];
  const destinations = Array.isArray(body?.destinations) ? body.destinations.filter(isPoint).slice(0, 12) : [];
  const mode: TransportMode = MODES.includes(body?.mode) ? body.mode : "public_transport";

  if (integrationStatus().travelTimes !== "google" || !origins.length || !destinations.length) {
    return Response.json({ source: "estimate", pairs: [] });
  }
  try {
    const pairs = await routeMatrix(origins, destinations, mode);
    return Response.json({ source: "google", pairs });
  } catch (e) {
    console.warn("Google Routes failed, falling back to estimates:", e);
    return Response.json({ source: "estimate", pairs: [], error: "Live travel times are unavailable right now." });
  }
}
