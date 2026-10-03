# Real data setup

Homanity runs with no keys at all: context is read by built-in rules, travel times are estimated from
distance, places come from a curated list, and listings are a hand-made sample. Each integration below
switches on by adding a key to `.env.local`, and each one falls back to the built-in version if its key is
missing or a call fails, so the demo never breaks on stage.

```bash
cp .env.example .env.local   # fill in what you have
npm run dev                  # restart after changing .env.local
```

The footer of every page says which sources are live (for example "Understanding: Claude · Travel: Google
Maps"), and `GET /api/status` returns the same as JSON.

| What | Without a key | With a key | Env var |
| --- | --- | --- | --- |
| Reading the renter's description | Rule-based extractor | Claude | `ANTHROPIC_API_KEY` |
| Travel times (transit, drive, bike) | Distance-based estimate | Google Routes API, weekday 08:30 departure | `GOOGLE_MAPS_API_KEY` |
| Finding a place someone names | ~40 curated landmarks and areas | Google Places text search, anywhere in Ireland | `GOOGLE_MAPS_API_KEY` |
| Photos of homes | Illustration | Google Street View Static image | `GOOGLE_MAPS_API_KEY` |
| Listings | 42-home curated sample | Your CSV, via `npm run import:listings` | none |
| Map tiles | OpenStreetMap (free, no key) | unchanged | none |

Keys stay on the server. The browser only calls this app's own `/api/*` routes, which add the key.

---

## 1. Claude (context extraction)

What it does: turns "I work near Grand Canal Dock three days a week, no car, two teens, under €2,300, close to
my mosque" into the structured context (budget, commute, household, places and how much each matters). Claude
returns place names; the app resolves them to map points itself (curated list first, then Google Places).

1. Sign in at https://console.anthropic.com and add billing (a few euro covers a hackathon).
2. **API Keys → Create Key**, copy it.
3. In `.env.local`: `ANTHROPIC_API_KEY=sk-ant-...`
4. Restart `npm run dev` and describe a life on the start page. The note under the box changes to "Read by
   Claude".

Code: `src/lib/context/claudeExtractor.ts` (prompt and schema), swap point in `src/lib/context/index.ts`.
It uses structured outputs so the response always matches the schema, low effort for speed, and the API's
server-side fallback if a request is declined. If the call fails for any reason, the rule-based extractor
answers instead and the error is logged on the server.

Cost: one short request per description, well under a cent each.

## 2. Google Maps Platform (travel times, place search, Street View)

One key covers all three. The app only calls these server-side.

1. Go to https://console.cloud.google.com, create a project (e.g. "homanity"), and attach a billing account.
   New accounts get free monthly usage that comfortably covers a demo.
2. **APIs & Services → Library**, enable:
   - **Routes API** (travel times)
   - **Places API (New)** (finding named places: "Beaumont Hospital", "Mum's in Lucan")
   - **Street View Static API** (photos of each home)
   - **Geocoding API** (only used by the listings import script when a row has no lat/lng)
3. **APIs & Services → Credentials → Create credentials → API key**.
4. Restrict it: **API restrictions → Restrict key** to the four APIs above. Since calls come from the server,
   leave application restrictions as "None" for local dev, or restrict to your server's IP when deployed.
5. In `.env.local`: `GOOGLE_MAPS_API_KEY=AIza...`
6. Restart. The areas page shows "Live travel times" instead of "Estimated travel times", home cards show
   street photos, and "Add a place" on the context page finds anywhere in Ireland.

What each one does in the app:

- **Routes API** (`src/lib/geo/routes.ts`, `POST /api/travel`): `computeRouteMatrix` from every area and home
  to the renter's work and named places, in their mode (TRANSIT, DRIVE or BICYCLE). Transit uses a next-weekday
  08:30 departure so commutes reflect rush hour. Irish public transport (Dublin Bus, Luas, DART, Irish Rail,
  Bus Éireann, Go-Ahead) is in Google's transit data via the NTA's GTFS feed. Results are cached in memory, so a
  context costs one batch of requests (about 56 origins × your places, in chunks of 100). "Nearest mosque /
  school" stays on the estimate because the nearest one differs per home.
- **Places API (New)** (`src/lib/geo/resolve.ts`, `GET /api/geocode`): text search restricted to Ireland, used
  when Claude or the renter names a place that isn't in the curated list.
- **Street View Static API** (`GET /api/streetview`): checks the free metadata endpoint first, then proxies the
  image. Homes without imagery keep the illustration.

Turn parts off without removing the key: `GOOGLE_ROUTES_DISABLED=1`, `GOOGLE_STREETVIEW_DISABLED=1`.

Cost guide: check https://mapsplatform.google.com/pricing for current rates. A demo day of clicking around is
typically a few hundred route elements and photos, inside the free monthly usage. Set a budget alert under
**Billing → Budgets & alerts** to be safe.

## 3. Rental listings (Daft.ie and others)

**Daft.ie has no open public API**, and its terms don't allow scraping, so the app doesn't scrape it (the
spec also says scraping mustn't be on the critical path). Options, from quickest to most involved:

1. **Import a CSV you're allowed to use** (works today). Collect a handful of real listings by hand for the
   demo areas, or get an export from an agent or landlord partner, then:

   ```bash
   npm run import:listings -- path/to/listings.csv
   npm run import:listings -- --clear     # back to the sample only
   ```

   Columns: `title,address,type,beds,baths,rent,ber,lat,lng,url,source,walkToStopMin,stopName,features`
   (see `scripts/sample-listings.csv`). `lat`/`lng` can be blank if `GOOGLE_MAPS_API_KEY` is set; the address is
   geocoded. Each row is attached to the nearest curated area, rows more than 8 km from every area are skipped,
   and imported homes show their source and a "View listing" link. They sit alongside the sample.
2. **Daft.ie partner access.** Daft provides API access to agents and commercial partners by agreement. Contact
   Daft through their advertising/partner channels and explain the project; if granted, add a provider that maps
   their listing fields to the `Property` type in `src/lib/data/types.ts`.
3. **Other sources worth asking:** MyHome.ie (agent feeds), Rent.ie, local letting agents (many publish feeds to
   portals and will share them for a non-commercial civic project).

Whatever the source, keep the layers separate: listings in `src/lib/data`, renter context in
`src/lib/context`, calculations in `src/lib/fit`.

## 4. Typical rents (next step, no key needed)

Area benchmarks in `src/lib/data/areas.ts` are rounded indicative figures. The official source is the
**RTB Rent Index**, published as open data by the CSO with no key:

- Dataset: RTB average monthly rent by location and bedrooms (CSO PxStat table `RIA02`)
- API: `https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/RIA02/JSON-stat/2.0/en`

Map each curated area to its RTB location (e.g. "Bray, Wicklow") and replace `typicalRent`. RTB figures are
*registered* rents for new tenancies, which tend to sit below current asking rents, so label them as such.

## 5. Other open data that would strengthen the demo

- **NTA GTFS (static timetables)**: https://www.transportforireland.ie/transitData/PT_Data.html, free, for
  offline routing or stop-level frequency without Google.
- **NTA GTFS-Realtime API** (free key at https://developer.nationaltransport.ie): live delays, not needed for
  commute planning.
- **Schools**: Department of Education school lists with addresses (data.gov.ie), to replace the sample
  "nearest school" points.
- **OpenStreetMap Overpass API**: real mosques, churches, GPs, supermarkets and parks near each home, no key
  (respect its fair-use limits, or cache the results into `src/lib/data/places.ts`).

## 6. Photos of homes and areas (no key needed)

The app shows realistic, freely licensed photos when they've been fetched, and drawings otherwise.

```bash
npm run fetch:photos
```

This downloads one photo per area and a few per type of home (apartment, terrace, semi-d, detached, duplex) from Wikimedia Commons into `public/photos/`. It also records each photo's author and licence in `src/lib/data/photos.json`. Only licences that allow free reuse are accepted: public domain, CC0, CC BY and CC BY-SA. No royalties are due, but CC BY and CC BY-SA require a credit. The app shows the credit on the photo and on the `/credits` page.

The photos show the area or the type of home, not the actual listing, and the home page labels them "Representative photo". To swap a photo you don't like, put its exact Commons file name (`"File:Name.jpg"`) first in that entry in `scripts/photo-sources.json`, delete it from `photos.json`, and run the command again. Commit the files in `public/photos/` and `photos.json` so the demo works offline.

## Troubleshooting

- **Still says "Estimated travel times"**: restart the dev server after editing `.env.local`; check the server
  log for `Google Routes failed` (usually the Routes API isn't enabled, or billing isn't attached).
- **No street photos**: Street View Static API not enabled, or the key is restricted without it.
- **Claude not used**: the server log shows `Claude extraction failed` with the reason; the rule-based
  extractor answered instead.
