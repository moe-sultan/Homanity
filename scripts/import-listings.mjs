#!/usr/bin/env node
// Imports real rental listings from a CSV into src/lib/data/imported-listings.json.
//
//   npm run import:listings -- path/to/listings.csv
//
// Columns (header row required; extra columns are ignored):
//   title,address,type,beds,baths,rent,ber,lat,lng,url,source,walkToStopMin,stopName,features
// - type: Apartment | House | Duplex
// - lat/lng: optional if GOOGLE_MAPS_API_KEY is set (the address is geocoded)
// - features: separated by "|", e.g. "Garden|Parking"
// Each listing is assigned to the nearest curated area. Listings more than
// 8 km from every area are skipped, since there's no area context for them.
//
// Use listings you have the right to use: your own, a partner feed, or an
// export a provider licenses to you. Don't scrape sites whose terms forbid it.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run import:listings -- path/to/listings.csv   (or --clear to remove imported listings)");
  process.exit(1);
}
const outPath = join(root, "src/lib/data/imported-listings.json");
if (file === "--clear") {
  writeFileSync(outPath, "[]\n");
  console.log("Cleared imported listings.");
  process.exit(0);
}

// Area centres, read from the curated areas file so there's one source of truth.
const areasSrc = readFileSync(join(root, "src/lib/data/areas.ts"), "utf8");
const AREAS = [...areasSrc.matchAll(/id: "([^"]+)",[\s\S]*?lat: ([\d.-]+),\s*lng: ([\d.-]+)/g)].map((m) => ({
  id: m[1],
  lat: Number(m[2]),
  lng: Number(m[3]),
}));

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  const [header, ...body] = rows;
  const keys = header.map((h) => h.trim());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

const km = (a, b) => {
  const R = 6371, rad = Math.PI / 180;
  const s = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

async function geocode(address) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&components=country:IE&key=${key}`;
  const data = await fetch(url).then((r) => r.json());
  const loc = data.results?.[0]?.geometry?.location;
  return loc ? { lat: loc.lat, lng: loc.lng } : null;
}

const rows = parseCsv(readFileSync(file, "utf8"));
const out = [];
for (const [i, r] of rows.entries()) {
  let lat = Number(r.lat), lng = Number(r.lng);
  if (!r.lat || !r.lng) {
    const g = await geocode(r.address);
    if (!g) { console.warn(`Skipped row ${i + 2}: no lat/lng and couldn't geocode "${r.address}"`); continue; }
    ({ lat, lng } = g);
  }
  const nearest = AREAS.map((a) => ({ a, d: km(a, { lat, lng }) })).sort((x, y) => x.d - y.d)[0];
  if (nearest.d > 8) { console.warn(`Skipped row ${i + 2}: ${nearest.d.toFixed(1)} km from the nearest area`); continue; }
  const beds = Math.min(4, Math.max(1, Math.round(Number(r.beds) || 1)));
  out.push({
    id: `imp-${i + 1}`,
    areaId: nearest.a.id,
    title: r.title || `${beds}-bed ${String(r.type || "home").toLowerCase()}`,
    address: r.address,
    type: ["Apartment", "House", "Duplex"].includes(r.type) ? r.type : "Apartment",
    beds,
    baths: Number(r.baths) || 1,
    rent: Number(String(r.rent).replace(/[^\d.]/g, "")),
    ber: r.ber || "Unknown",
    walkToStopMin: Number(r.walkToStopMin) || 8,
    stopName: r.stopName || "nearest stop",
    lat,
    lng,
    features: r.features ? r.features.split("|").map((f) => f.trim()).filter(Boolean) : [],
    source: r.source || undefined,
    url: r.url || undefined,
  });
}
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.log(`Imported ${out.length} of ${rows.length} listings into src/lib/data/imported-listings.json`);
