// Claude-backed context extraction. Claude reads the renter's own words and
// returns a small structured summary; place names are then resolved to map
// points by resolvePlaceName (curated list, then Google Places if enabled).
// Server-only: needs ANTHROPIC_API_KEY.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { resolvePlaceName } from "../geo/resolve";
import type { ContextExtractor, ImportantPlace, UserContext, WorkPlace } from "./types";

const importance = z.enum(["high", "medium", "low"]);
const nearestCategory = z.enum(["mosque", "church", "primary_school", "secondary_school", "grocery", "gp", "hospital", "gym", "park"]);

const Extraction = z.object({
  budget: z.number().nullable().describe("Monthly rent budget in EUR, or null if not stated"),
  budgetImportance: importance,
  bedrooms: z.number().int().nullable().describe("Bedrooms explicitly asked for, or null"),
  bedroomsInferred: z.number().int().nullable().describe("A conservative minimum inferred from the household, or null"),
  transport: z.enum(["public_transport", "car", "cycle"]).nullable(),
  adults: z.number().int().nullable(),
  children: z.number().int().nullable(),
  schoolStage: z.enum(["primary", "secondary", "mixed"]).nullable(),
  commuteImportance: importance,
  work: z.array(
    z.object({
      placeName: z.string().describe("Where they work or study, as specific as the text allows, e.g. 'Grand Canal Dock, Dublin'"),
      daysPerWeek: z.number().int().nullable(),
    }),
  ),
  places: z.array(
    z.object({
      label: z.string().describe("Short name for the renter, e.g. 'Mosque', 'Mum's house', 'Secondary school'"),
      importance,
      placeName: z.string().nullable().describe("A specific named place or area if given, e.g. 'Lucan' or 'Beaumont Hospital'; null if any nearby one will do"),
      nearestCategory: nearestCategory.nullable().describe("When any nearby one will do, which kind"),
    }),
  ),
  notes: z.array(z.string()).describe("Things mentioned that could not be pinned down, phrased to the renter in second person"),
});

const SYSTEM = `You help renters in Ireland describe their life so a tool can show which areas and homes fit it.
Read the renter's description and fill in the schema. Record only what the text says or clearly implies; leave a field null rather than guess.
Importance: "high" for needs and must-haves ("need", "must", "essential"), "low" for nice-to-haves ("would be nice", "ideally"), otherwise "medium".
Work or study places: name the place as specifically as the text allows, adding "Ireland" context if helpful. Remote workers have no work entry.
Important places: if they name a specific place or area, put it in placeName; if any nearby one will do ("a mosque nearby", "near a good school"), set nearestCategory instead.
Children at school age imply a school place (nearest of the right stage) unless a specific school is named.
Notes: anything that matters to them but you could not place (e.g. "near family" with no location), written to the renter as a short sentence.`;

let client: Anthropic | null = null;

export const claudeExtractor: ContextExtractor = {
  async extract(text: string): Promise<UserContext> {
    client ??= new Anthropic();
    const response = await client.beta.messages.parse({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
      max_tokens: 4000,
      // Server-side fallback: if the request is declined, the API retries it
      // on a suitable fallback model within the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "low", format: betaZodOutputFormat(Extraction) },
      messages: [{ role: "user", content: text }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      throw new Error(`Claude extraction returned no usable output (stop_reason: ${response.stop_reason})`);
    }
    return toUserContext(text, response.parsed_output);
  },
};

async function toUserContext(rawText: string, x: z.infer<typeof Extraction>): Promise<UserContext> {
  const notes = [...x.notes];
  const work: WorkPlace[] = [];
  for (const w of x.work) {
    const p = await resolvePlaceName(w.placeName);
    if (!p) {
      notes.push(`We couldn't find "${w.placeName}" on the map. Add your workplace so we can estimate your commute.`);
      continue;
    }
    const id = `work-${p.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    if (work.some((existing) => existing.id === id)) continue;
    work.push({ id, label: p.label, lat: p.lat, lng: p.lng, rail: p.rail, daysPerWeek: w.daysPerWeek ?? undefined });
  }

  const importantPlaces: ImportantPlace[] = [];
  for (const [i, place] of x.places.entries()) {
    const id = `ai-${i}-${Date.now().toString(36)}`;
    if (place.placeName) {
      const p = await resolvePlaceName(place.placeName);
      if (p) {
        importantPlaces.push({
          id,
          name: place.label === p.label ? p.label : `${place.label} (${p.label})`,
          importance: place.importance,
          target: { kind: "fixed", label: p.label, lat: p.lat, lng: p.lng, rail: p.rail },
        });
        continue;
      }
      if (!place.nearestCategory) {
        notes.push(`We couldn't find "${place.placeName}" for ${place.label.toLowerCase()}. Add it again with a nearby area.`);
        continue;
      }
    }
    if (place.nearestCategory) {
      importantPlaces.push({
        id,
        name: /^nearest /i.test(place.label) ? place.label : `Nearest ${place.label.toLowerCase()}`,
        importance: place.importance,
        target: { kind: "nearest", category: place.nearestCategory },
      });
    }
  }

  const bedrooms =
    x.bedrooms != null
      ? { count: clampBeds(x.bedrooms), inferred: false }
      : x.bedroomsInferred != null
        ? { count: clampBeds(x.bedroomsInferred), inferred: true }
        : undefined;

  if (x.budget == null) notes.push("No budget mentioned. We'll show typical rents but won't score against a budget.");

  return {
    rawText,
    budget: x.budget ?? undefined,
    bedrooms,
    work,
    transport: x.transport ?? undefined,
    household: {
      adults: x.adults ?? undefined,
      children: x.children ?? undefined,
      schoolStage: x.schoolStage ?? undefined,
    },
    importantPlaces,
    priorities: { budget: x.budgetImportance, commute: x.commuteImportance },
    notes,
  };
}

const clampBeds = (n: number) => Math.min(4, Math.max(1, Math.round(n)));
