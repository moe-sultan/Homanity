import { getExtractor } from "@/lib/context";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return Response.json({ error: "Tell us a little about your life first." }, { status: 400 });
  if (text.length > 4000) return Response.json({ error: "That's a lot. Try a shorter description." }, { status: 400 });

  const context = await getExtractor().extract(text);
  return Response.json({ context });
}
