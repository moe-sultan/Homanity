import { resolvePlaceName } from "@/lib/geo/resolve";

// GET /api/geocode?q=Beaumont Hospital -> { place: ResolvedPlace | null }
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.slice(0, 200) ?? "";
  if (!q.trim()) return Response.json({ place: null }, { status: 400 });
  return Response.json({ place: await resolvePlaceName(q) });
}
