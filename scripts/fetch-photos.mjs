#!/usr/bin/env node
// Downloads freely licensed, realistic photos for areas and homes from
// Wikimedia Commons into public/photos, and records each photo's author and
// licence in src/lib/data/photos.json so the app can credit it.
//
//   npm run fetch:photos            # fetch anything missing
//   npm run fetch:photos -- --force # re-fetch everything
//
// What to search for lives in scripts/photo-sources.json. Only licences that
// allow free reuse are accepted (public domain, CC0, CC BY, CC BY-SA), so no
// royalties are due; CC BY and CC BY-SA need the credit the app shows.
// The photos are representative of the area or type of home, not of a
// specific listing, and the app labels them that way.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sources = JSON.parse(readFileSync(join(root, "scripts/photo-sources.json"), "utf8"));
const manifestPath = join(root, "src/lib/data/photos.json");
const force = process.argv.includes("--force");
const manifest = force ? { areas: {}, homes: {} } : JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.areas ??= {};
manifest.homes ??= {};

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "HomanityDemo/1.0 (hackathon prototype; https://github.com/moe-sultan/Homanity)";
const FREE = /^(cc0|public domain|pd|cc by(-sa)? \d(\.\d)?)/i;
const used = new Set([
  ...Object.values(manifest.areas).map((p) => p.sourceUrl),
  ...Object.values(manifest.homes).flat().map((p) => p.sourceUrl),
]);

const strip = (html = "") => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

async function candidates(query) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "1280",
    origin: "*",
  });
  if (query.startsWith("File:")) params.set("titles", query);
  else {
    params.set("generator", "search");
    params.set("gsrsearch", `${query} filetype:bitmap`);
    params.set("gsrnamespace", "6");
    params.set("gsrlimit", "30");
  }
  const res = await fetch(`${API}?${params}`, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Commons search failed (${res.status}) for "${query}"`);
  const pages = Object.values((await res.json()).query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const out = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info || info.mime !== "image/jpeg") continue;
    const meta = info.extmetadata ?? {};
    const license = strip(meta.LicenseShortName?.value);
    if (!FREE.test(license)) continue;
    const pinned = query.startsWith("File:");
    if (!pinned && (info.width < 1200 || info.width < info.height * 1.2)) continue;
    if (used.has(info.descriptionurl)) continue;
    out.push({
      thumb: info.thumburl,
      credit: strip(meta.Artist?.value) || "Unknown author",
      license,
      licenseUrl: meta.LicenseUrl?.value ?? null,
      sourceUrl: info.descriptionurl,
      title: page.title.replace(/^File:/, "").replace(/\.\w+$/, ""),
    });
  }
  return out;
}

async function download(photo, rel) {
  const res = await fetch(photo.thumb, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${photo.sourceUrl}`);
  const file = join(root, "public", rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  used.add(photo.sourceUrl);
  const { thumb, ...rest } = photo;
  return { src: `/${rel}`, ...rest };
}

async function findOne(queries) {
  for (const q of queries) {
    const [hit] = await candidates(q);
    if (hit) return hit;
  }
  return null;
}

for (const [areaId, queries] of Object.entries(sources.areas)) {
  if (manifest.areas[areaId] && existsSync(join(root, "public", manifest.areas[areaId].src))) continue;
  const hit = await findOne(queries);
  if (!hit) {
    console.warn(`No free photo found for area ${areaId}; it keeps its drawing.`);
    continue;
  }
  manifest.areas[areaId] = await download(hit, `photos/areas/${areaId}.jpg`);
  console.log(`area  ${areaId}: ${hit.title} (${hit.license}, ${hit.credit})`);
}

for (const [kind, queries] of Object.entries(sources.homes)) {
  const list = (manifest.homes[kind] ?? []).filter((p) => existsSync(join(root, "public", p.src)));
  for (const q of queries) {
    if (list.length >= sources.perHomeKind) break;
    for (const hit of await candidates(q)) {
      if (list.length >= sources.perHomeKind) break;
      list.push(await download(hit, `photos/homes/${kind}-${list.length + 1}.jpg`));
      console.log(`home  ${kind}: ${hit.title} (${hit.license}, ${hit.credit})`);
    }
  }
  manifest.homes[kind] = list;
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
const homeCount = Object.values(manifest.homes).flat().length;
console.log(`\nSaved ${Object.keys(manifest.areas).length} area photos and ${homeCount} home photos. Credits are in src/lib/data/photos.json.`);
