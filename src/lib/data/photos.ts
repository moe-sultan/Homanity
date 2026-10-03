import type { Property } from "./types";
import manifest from "./photos.json";

// Freely licensed photos fetched with `npm run fetch:photos` (see
// scripts/fetch-photos.mjs). They show the area or the type of home, not the
// listing itself. Anything without a photo falls back to a drawing.
export type Photo = {
  src: string;
  credit: string;
  license: string;
  licenseUrl: string | null;
  sourceUrl: string;
  title: string;
};
type Manifest = { areas: Record<string, Photo>; homes: Record<string, Photo[]> };
const PHOTOS = manifest as Manifest;

export type HomeKind = "apartment" | "terrace" | "semi" | "detached" | "duplex";

export function homeKind(p: Property): HomeKind {
  if (p.type === "Apartment") return "apartment";
  if (p.type === "Duplex") return "duplex";
  const text = `${p.title} ${p.features.join(" ")}`;
  if (/terrace|period|red-brick|cottage|townhouse/i.test(text)) return "terrace";
  if (/detached/i.test(text) && !/semi/i.test(text)) return "detached";
  return "semi";
}

const FALLBACK: Record<HomeKind, HomeKind[]> = {
  apartment: ["duplex"],
  duplex: ["apartment", "terrace"],
  terrace: ["semi"],
  semi: ["detached", "terrace"],
  detached: ["semi"],
};

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

export function homePhoto(p: Property): Photo | null {
  const kind = homeKind(p);
  for (const k of [kind, ...FALLBACK[kind]]) {
    const list = PHOTOS.homes[k];
    if (list?.length) return list[hash(p.id) % list.length];
  }
  return null;
}

export function areaPhoto(areaId: string): Photo | null {
  return PHOTOS.areas[areaId] ?? null;
}

export function allPhotos(): Photo[] {
  return [...Object.values(PHOTOS.areas), ...Object.values(PHOTOS.homes).flat()];
}
