# Homanity: rental decision MVP (Hack for Humanity 2026)

Your home should fit your life, not just your search criteria.

A renter describes their life in plain words. Homanity turns that into structured context, shows areas
(including commuter towns beyond Dublin) that could work, how each area connects to their week, homes with a
personal **Fit** score and a fair-rent comparison, and a side-by-side compare of their shortlist.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Node 20+ required. The map tiles load from CARTO/OpenStreetMap, so the machine needs internet access.

## The flow

1. `/` Describe your life (free text, prompt chips, "Try an example").
2. `/context` Review what was understood, fix anything, mark what's a must, matters, or nice to have, and add places.
3. `/areas` Areas with typical rent, commute, transport and a Fit indication.
4. `/areas/[id]` Map of the area against your work and important places, typical rents, everyday places, homes.
5. `/properties/[id]` One home in context: Fit, why that Fit, rent vs area, your week from here, questions to ask before viewing.
6. `/saved` Shortlist and compare, including rent + commuting cost.

Context and saved homes live in the browser (localStorage).

## Code layout (context, listings and calculations kept separate)

| Layer | Where | What |
| --- | --- | --- |
| User context | `src/lib/context/` | `UserContext` type, `ContextExtractor` interface, rule-based `mockExtractor` |
| Listing & area data | `src/lib/data/` | 14 curated areas, 42 sample listings, named places and everyday POIs |
| Derived calculations | `src/lib/fit/` | Travel-time estimates (`travel.ts`) and the Fit score (`evaluate.ts`) |
| UI | `src/app/`, `src/components/` | Next.js App Router pages, Leaflet map |

API: `POST /api/context { text }` returns `{ context: UserContext }`.

## Swapping in a real AI extractor

`src/lib/context/index.ts` → `getExtractor()` is the only swap point. Implement `ContextExtractor`
(`extract(text) => Promise<UserContext>`) with an LLM call that returns the `UserContext` JSON shape and
return it there when an API key is set. Nothing else changes. The mock deliberately records only what the text
says; anything it can't place goes into `notes` and is shown back to the renter.

## How Fit works

A weighted average of 0–1 factor scores, ×100. Weights come from what the renter said matters
(must = 3, matters = 2, nice to have = 1):

- **Budget**: 1 at or under budget, falling to 0 at 20% over.
- **Commute** per workplace: 1 at ≤25 min, 0 at ≥80 min; weight scaled by days per week.
- **Important places** (school, mosque, family, gym…): 1 at ≤8 min, 0 at ≥35 min. "Nearest" places resolve to the closest one to each home.
- **Space**: enough bedrooms or not. Too few bedrooms also scales the final score down by 25% per missing room.
- **Public transport access** (no car): walk to a frequent stop.
- **Rent vs area**: 10% below typical = 1, 10% above = 0.

Travel times are estimates from straight-line distance, mode, and whether both ends are on rail (DART, Luas,
commuter). Replace `estimateTravel` with real routing (NTA GTFS, Google Routes) later without touching callers.

## Data caveats

Typical rents are rounded indicative benchmarks, listings are a hand-made sample, and everyday places use
approximate positions with descriptive names (well-known landmarks keep real names). Good for demoing the idea;
swap for RTB/Daft benchmarks and real POI data when available.
