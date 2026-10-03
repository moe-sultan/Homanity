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

Node 20+ required. The map tiles load from OpenStreetMap, so the machine needs internet access.

It runs with no API keys. To switch on real data (Claude for reading the description, Google Maps for live
travel times, place search and street photos, and your own listings), copy `.env.example` to `.env.local` and
follow [docs/API_SETUP.md](docs/API_SETUP.md). Every integration falls back to the built-in version if its key
is missing, and the footer shows which sources are live.

## The flow

1. `/` Describe your life in free text, add details with quick chips, or start from one of three example weeks.
2. `/context` Review what was understood, fix anything, mark what's a must, matters, or nice to have, and add places.
3. `/areas` Areas as a list with a Fit ring, rent, commute and rail at a glance, next to a map pinned with each Fit.
4. `/areas/[id]` Map of the area against your work and important places, typical rents, everyday places, homes.
5. `/properties/[id]` One home in context: Fit, why that Fit, rent vs area, your week from here, questions to ask before viewing.
6. `/saved` Shortlist and compare, including rent + commuting cost.

Context and saved homes live in the browser (localStorage).

## Code layout (context, listings and calculations kept separate)

| Layer | Where | What |
| --- | --- | --- |
| User context | `src/lib/context/` | `UserContext` type, `ContextExtractor` interface, `claudeExtractor` and rule-based `mockExtractor` |
| Listing & area data | `src/lib/data/` | 14 curated areas, 42 sample listings, named places and everyday POIs |
| Derived calculations | `src/lib/fit/` | Travel times (`travel.ts`: real routed times when available, else estimates) and the Fit score (`evaluate.ts`) |
| Integrations (server) | `src/lib/geo/`, `src/lib/integrations.ts`, `src/app/api/` | Google Routes, Places and Street View; which sources are live |
| UI | `src/app/`, `src/components/` | Next.js App Router pages, Leaflet map |

API: `POST /api/context { text }` returns `{ context: UserContext }`. Also `POST /api/travel`, `GET /api/geocode?q=`,
`GET /api/streetview?lat=&lng=` and `GET /api/status` (see docs/API_SETUP.md).

## AI extraction

`src/lib/context/index.ts` → `getExtractor()` is the only swap point. With `ANTHROPIC_API_KEY` set it uses
`claudeExtractor` (structured output, place names resolved to points by `src/lib/geo/resolve.ts`), falling back
to the rule-based `mockExtractor` on any error. Both record only what the text says; anything they can't place
goes into `notes` and is shown back to the renter.

## How Fit works

A weighted average of 0–1 factor scores, ×100. Weights come from what the renter said matters
(must = 3, matters = 2, nice to have = 1):

- **Budget**: 1 at or under budget, falling to 0 at 20% over.
- **Commute** per workplace: 1 at ≤25 min, 0 at ≥80 min; weight scaled by days per week.
- **Important places** (school, mosque, family, gym…): 1 at ≤8 min, 0 at ≥35 min. "Nearest" places resolve to the closest one to each home.
- **Space**: enough bedrooms or not. Too few bedrooms also scales the final score down by 25% per missing room.
- **Public transport access** (no car): walk to a frequent stop.
- **Rent vs area**: 10% below typical = 1, 10% above = 0.

Travel times come from Google Routes when `GOOGLE_MAPS_API_KEY` is set (work and named places, weekday 08:30).
Otherwise, and for "nearest" places, they're estimates from straight-line distance, mode, and whether both ends
are on rail (DART, Luas, commuter).

## Data caveats

Typical rents are rounded indicative benchmarks, listings are a hand-made sample, and everyday places use
approximate positions with descriptive names (well-known landmarks keep real names). Good for demoing the idea;
swap for RTB/Daft benchmarks and real POI data when available.
