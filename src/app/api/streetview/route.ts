import { integrationStatus } from "@/lib/integrations";

// GET /api/streetview?lat=..&lng=..&w=640&h=360
// Proxies a Google Street View Static image so the key stays on the server.
// Returns 404 when there's no key or no imagery, and the UI shows an
// illustration instead.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const w = Math.min(640, Math.max(100, Number(params.get("w")) || 640));
  const h = Math.min(640, Math.max(100, Number(params.get("h")) || 360));
  if (!integrationStatus().streetView || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return new Response(null, { status: 404 });
  }
  const key = process.env.GOOGLE_MAPS_API_KEY!;
  const location = `${lat},${lng}`;

  // The metadata call is free and tells us whether imagery exists nearby.
  const meta = await fetch(
    `https://maps.googleapis.com/maps/api/streetview/metadata?location=${location}&radius=150&source=outdoor&key=${key}`,
  ).then((r) => r.json()).catch(() => null);
  if (meta?.status !== "OK") return new Response(null, { status: 404 });

  const img = await fetch(
    `https://maps.googleapis.com/maps/api/streetview?size=${w}x${h}&location=${location}&radius=150&source=outdoor&fov=80&key=${key}`,
  );
  if (!img.ok) return new Response(null, { status: 404 });
  return new Response(img.body, {
    headers: { "Content-Type": img.headers.get("Content-Type") ?? "image/jpeg", "Cache-Control": "public, max-age=86400" },
  });
}
