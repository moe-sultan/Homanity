// Rule-based stand-in for the AI extraction step. It only records what the
// text actually says; anything it cannot place goes into `notes`.
// Swap for an LLM-backed ContextExtractor in ./index.ts without touching the UI.
import { findKnownPlace } from "../data/places";
import type { PoiCategory } from "../data/types";
import type { ContextExtractor, ImportantPlace, Importance, UserContext, WorkPlace } from "./types";

const NUMBER_WORDS: Record<string, number> = {
  one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
};

function toNumber(word: string): number | undefined {
  const n = Number(word);
  if (!Number.isNaN(n)) return n;
  return NUMBER_WORDS[word.toLowerCase()];
}

function splitClauses(text: string): string[] {
  return text
    .split(/[.;!?\n]+|,(?!\s*(?:and\s+)?(?:mon|tue|wed|thu|fri|sat|sun))|\s+and\s+(?!(?:on\s+)?(?:mon|tue|wed|thu|fri|sat|sun))|\s+but\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

function importanceOf(clause: string, fallback: Importance): Importance {
  const c = clause.toLowerCase();
  if (/\b(must|need|needs|essential|crucial|important|has to|have to|non-negotiable|really|definitely)\b/.test(c)) return "high";
  if (/\b(nice|ideally|would like|bonus|if possible|prefer|preferably|maybe|occasionally)\b/.test(c)) return "low";
  return fallback;
}

function extractBudget(text: string): number | undefined {
  const t = text.toLowerCase().replace(/(\d),(\d{3})/g, "$1$2");
  const patterns = [
    /(?:under|below|max(?:imum)?|up to|budget(?: is| of)?|less than|no more than|around|about|at most|keep (?:it|rent|the rent) (?:under|below))\s*(?:€|eur|euro)?\s?(\d+(?:\.\d+)?)\s?(k)?/,
    /(?:€|eur\s?|euro\s?)(\d+(?:\.\d+)?)\s?(k)?/,
    /(\d+(?:\.\d+)?)\s?(k)?\s?(?:euro|eur|a month|per month|pm|\/month)/,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (!m) continue;
    let value = parseFloat(m[1]);
    if (m[2]) value *= 1000;
    if (value >= 400 && value <= 10000) return Math.round(value);
  }
  return undefined;
}

function extractDays(text: string): number | undefined {
  const t = text.toLowerCase();
  if (/\b(every day|five days|5 days|full[- ]time in the office|daily|monday to friday|mon-fri)\b/.test(t)) return 5;
  const m = t.match(/\b(one|two|three|four|five|\d)\s+days?\b/);
  if (m) return toNumber(m[1]);
  const weekdays = t.match(/\b(mondays?|tuesdays?|wednesdays?|thursdays?|fridays?)\b/g);
  if (weekdays && weekdays.length) return new Set(weekdays.map((d) => d.replace(/s$/, ""))).size;
  if (/\bhybrid\b/.test(t)) return undefined;
  return undefined;
}

const PLACE_RULES: { re: RegExp; name: string; category: PoiCategory; defaultImportance: Importance }[] = [
  { re: /\b(mosque|masjid|jummah|jumu'?ah)\b/, name: "Mosque", category: "mosque", defaultImportance: "medium" },
  { re: /\b(church|mass|parish)\b/, name: "Church", category: "church", defaultImportance: "medium" },
  { re: /\b(gym|fitness)\b/, name: "Gym", category: "gym", defaultImportance: "low" },
  { re: /\b(hospital|dialysis|clinic|treatment)\b/, name: "Hospital", category: "hospital", defaultImportance: "medium" },
  { re: /\b(gp|doctor|pharmacy)\b/, name: "GP", category: "gp", defaultImportance: "medium" },
  { re: /\b(supermarket|groceries|grocery|shops|lidl|aldi|tesco|dunnes)\b/, name: "Groceries", category: "grocery", defaultImportance: "low" },
  { re: /\b(park|green space|walks?|playground)\b/, name: "Park", category: "park", defaultImportance: "low" },
];

const FAMILY_RE = /\b(mum|mom|mother|dad|father|parents|family|grandparents|granny|nana|sister|brother|in-laws)\b/;

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

export function extractContextFromText(text: string): UserContext {
  const lower = text.toLowerCase();
  const clauses = splitClauses(text);
  const notes: string[] = [];
  const work: WorkPlace[] = [];
  const importantPlaces: ImportantPlace[] = [];

  // Budget
  const budget = extractBudget(text);

  // Transport
  let transport: UserContext["transport"];
  if (/\b(no car|don'?t (?:have|own) (?:a )?car|without a car|car-?free|don'?t drive|can'?t drive|not driving)\b/.test(lower)) {
    transport = /\b(cycle|cycling|bike)\b/.test(lower) ? "cycle" : "public_transport";
  } else if (/\b(have a car|own a car|drive|drives|driving|by car|my car|our car)\b/.test(lower)) {
    transport = "car";
  } else if (/\b(cycle|cycling|bike)\b/.test(lower)) {
    transport = "cycle";
  } else if (/\b(public transport|bus|train|luas|dart)\b/.test(lower)) {
    transport = "public_transport";
  }

  // Household
  const household: UserContext["household"] = {};
  const kids = lower.match(/\b(one|two|three|four|five|\d)\s+(?:young\s+|teenage\s+|small\s+|little\s+)?(kids|children|sons|daughters|boys|girls|teenagers)\b/);
  if (kids) household.children = toNumber(kids[1]);
  else if (/\b(my|a|our)\s+(daughter|son|child|kid|baby|toddler)\b/.test(lower)) household.children = 1;
  else if (/\b(kids|children)\b/.test(lower)) household.children = undefined;
  const hasKids = household.children !== undefined || /\b(kids|children|daughter|son|child)\b/.test(lower);
  const secondary = /\b(secondary|high school|teen|teenage|leaving cert)\b/.test(lower);
  const primary = /\b(primary|national school|junior)\b/.test(lower);
  if (hasKids && (secondary || primary)) household.schoolStage = secondary && primary ? "mixed" : secondary ? "secondary" : "primary";
  if (/\b(partner|wife|husband|girlfriend|boyfriend|fianc[eé]e?)\b/.test(lower)) household.adults = 2;
  else if (/\b(on my own|by myself|alone|single)\b/.test(lower)) household.adults = 1;

  // Bedrooms: stated, or a conservative minimum inferred from children.
  let bedrooms: UserContext["bedrooms"];
  const bedMatch = lower.match(/\b(one|two|three|four|\d)[ -]?(?:bed|bedroom)/);
  if (bedMatch) bedrooms = { count: toNumber(bedMatch[1])!, inferred: false };
  else if (household.children) bedrooms = { count: Math.min(4, 1 + Math.ceil(household.children / 2)), inferred: true };

  let schoolPlaced = false;

  for (const clause of clauses) {
    const c = clause.toLowerCase();

    // Work or study
    if (/\b(work|works|working|office|job|student|uni|commute|study|studying|college|university|campus|lectures)\b/.test(c) && !/\b(work from home|remote(ly)?|wfh)\b/.test(c)) {
      const place = findKnownPlace(clause);
      if (place && !work.some((w) => w.id === place.id)) {
        work.push({ id: place.id, label: place.name, lat: place.lat, lng: place.lng, rail: place.rail, daysPerWeek: extractDays(clause) ?? extractDays(text) });
        continue;
      }
      if (!place && !/\b(school)\b/.test(c)) {
        notes.push(`You mentioned work or study ("${clause}") but not where. Add it so we can estimate your commute.`);
        continue;
      }
    }

    // Children's school
    if (/\bschool\b/.test(c) && hasKids) {
      const place = findKnownPlace(clause);
      const stageLabel = household.schoolStage === "secondary" ? "Secondary school" : household.schoolStage === "primary" ? "Primary school" : "School";
      if (place) {
        importantPlaces.push({
          id: nextId("school"),
          name: `${stageLabel} (${place.name})`,
          importance: importanceOf(clause, "high"),
          target: { kind: "fixed", label: place.name, lat: place.lat, lng: place.lng, rail: place.rail },
        });
      } else {
        importantPlaces.push({
          id: nextId("school"),
          name: `Nearest ${stageLabel.toLowerCase()}`,
          importance: importanceOf(clause, "high"),
          target: { kind: "nearest", category: household.schoolStage === "primary" ? "primary_school" : "secondary_school" },
        });
      }
      schoolPlaced = true;
      continue;
    }

    // Family
    if (FAMILY_RE.test(c)) {
      const place = findKnownPlace(clause);
      const who = c.match(FAMILY_RE)![1];
      if (place) {
        importantPlaces.push({
          id: nextId("family"),
          name: `Family (${who}, ${place.name})`,
          importance: importanceOf(clause, "medium"),
          target: { kind: "fixed", label: place.name, lat: place.lat, lng: place.lng, rail: place.rail },
        });
      } else if (/\b(near|close|visit|see)\b/.test(c)) {
        notes.push(`You'd like to be near family (${who}). Add where they live to include it.`);
      }
      continue;
    }

    // Other important places
    for (const rule of PLACE_RULES) {
      if (!rule.re.test(c)) continue;
      const place = findKnownPlace(clause);
      if (place) {
        importantPlaces.push({
          id: nextId(rule.category),
          name: `${rule.name} (${place.name})`,
          importance: importanceOf(clause, rule.defaultImportance),
          target: { kind: "fixed", label: place.name, lat: place.lat, lng: place.lng, rail: place.rail },
        });
      } else {
        importantPlaces.push({
          id: nextId(rule.category),
          name: `Nearest ${rule.name.toLowerCase()}`,
          importance: importanceOf(clause, rule.defaultImportance),
          target: { kind: "nearest", category: rule.category },
        });
        if (/\bmy (mosque|church)\b/.test(c)) {
          notes.push(`We're using the nearest ${rule.name.toLowerCase()} to each home. If you go to a specific one, add its area.`);
        }
      }
    }
  }

  // Kids at school age mentioned, but no school clause matched.
  if (hasKids && household.schoolStage && !schoolPlaced) {
    importantPlaces.push({
      id: nextId("school"),
      name: household.schoolStage === "primary" ? "Nearest primary school" : "Nearest secondary school",
      importance: "high",
      target: { kind: "nearest", category: household.schoolStage === "primary" ? "primary_school" : "secondary_school" },
    });
  }

  if (budget === undefined) notes.push("No budget mentioned. We'll show typical rents but won't score against a budget.");
  if (work.length === 0 && !notes.some((n) => n.includes("work or study"))) {
    if (!/\b(work from home|remote(ly)?|wfh|retired|not working)\b/.test(lower)) {
      notes.push("No work or study location found. Add one if you commute.");
    }
  }

  return {
    rawText: text,
    budget,
    bedrooms,
    work,
    transport,
    household,
    importantPlaces,
    priorities: {
      budget: budget ? importanceOf(clauses.find((c) => /€|\d{3,}|budget|rent/i.test(c)) ?? "", "high") : "medium",
      commute: "high",
    },
    notes,
  };
}

export const mockExtractor: ContextExtractor = {
  async extract(text: string) {
    return extractContextFromText(text);
  },
};
