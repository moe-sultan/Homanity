"use client";

import {
  Briefcase,
  Building2,
  Church,
  Dumbbell,
  GraduationCap,
  Heart,
  Hospital,
  House,
  MapPin,
  Mosque,
  School,
  ShoppingCart,
  Stethoscope,
  Trees,
  TrainFront,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ImportantPlace, Importance } from "@/lib/context/types";
import type { PoiCategory, Property } from "@/lib/data/types";
import { fitTone, type PlaceLink } from "@/lib/fit/evaluate";
import { useLive } from "@/lib/live";
import { useStore } from "@/lib/store";

export const euro = (n: number) => `€${Math.round(n).toLocaleString("en-IE")}`;

// "Nearest secondary school" -> "Secondary school", "Mosque (Clonskeagh)" -> "Mosque".
export const placeLabel = (name: string) =>
  name.replace(/ \(.*\)$/, "").replace(/^Nearest (.)/, (_, c: string) => c.toUpperCase());

// Circular Fit score. The ring fills to the score; colour follows the tone.
export function FitRing({ fit, size = 56, label = true }: { fit: number; size?: number; label?: boolean }) {
  const stroke = Math.max(4, Math.round(size / 11));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = fitTone(fit);
  return (
    <span className={`ring tone-${tone}`} style={{ width: size, height: size }} title="How well this fits the life you described">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(c * fit) / 100} ${c}`}
        />
      </svg>
      <span className="ring-n">
        <span style={{ margin: 0 }}>
          <b style={{ fontSize: size * 0.34, color: "var(--ink)" }}>{fit}</b>
          {label && size >= 48 && <span>Fit</span>}
        </span>
      </span>
    </span>
  );
}

export function FitPill({ fit }: { fit: number }) {
  return (
    <span className={`fit-pill tone-${fitTone(fit)}`}>
      {fit} <small>Fit</small>
    </span>
  );
}

export function SaveButton({ propertyId, round }: { propertyId: string; round?: boolean }) {
  const { isSaved, toggleSaved } = useStore();
  const on = isSaved(propertyId);
  return (
    <button
      type="button"
      className={`save ${on ? "on" : ""} ${round ? "round" : ""}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSaved(propertyId);
      }}
      aria-pressed={on}
      aria-label={on ? "Remove from saved" : "Save"}
    >
      <Heart size={16} fill={on ? "currentColor" : "none"} />
      {!round && (on ? "Saved" : "Save")}
    </button>
  );
}

export function FairRent({ diff }: { diff: number }) {
  if (Math.abs(diff) < 25) return <span className="fair inline">≈ Typical rent for the area</span>;
  return diff < 0 ? (
    <span className="fair below">▼ {euro(Math.abs(diff))} below typical</span>
  ) : (
    <span className="fair above">▲ {euro(diff)} above typical</span>
  );
}

const CATEGORY_ICON: Record<PoiCategory, LucideIcon> = {
  mosque: Mosque,
  church: Church,
  primary_school: School,
  secondary_school: GraduationCap,
  grocery: ShoppingCart,
  gp: Stethoscope,
  hospital: Hospital,
  gym: Dumbbell,
  park: Trees,
  station: TrainFront,
};

export function categoryIcon(c: PoiCategory): LucideIcon {
  return CATEGORY_ICON[c] ?? MapPin;
}

// Best-guess icon for an important place from its target or name.
export function placeIcon(place: ImportantPlace | { name: string; target?: ImportantPlace["target"] }): LucideIcon {
  if (place.target?.kind === "nearest") return categoryIcon(place.target.category);
  const n = place.name.toLowerCase();
  if (/mosque/.test(n)) return Mosque;
  if (/church/.test(n)) return Church;
  if (/secondary|college|university|campus/.test(n)) return GraduationCap;
  if (/school/.test(n)) return School;
  if (/hospital/.test(n)) return Hospital;
  if (/gp|doctor|clinic/.test(n)) return Stethoscope;
  if (/gym/.test(n)) return Dumbbell;
  if (/park/.test(n)) return Trees;
  if (/grocer|shop|supermarket/.test(n)) return ShoppingCart;
  if (/family|mum|mom|dad|parent|sister|brother|gran|nana/.test(n)) return Users;
  return MapPin;
}

export function linkIcon(l: PlaceLink): LucideIcon {
  if (l.kind === "work") return Briefcase;
  return placeIcon({ name: l.name });
}

export const IMPORTANCE_LABEL: Record<Importance, string> = { high: "Must", medium: "Matters", low: "Nice" };

export function ImportancePick({ value, onChange }: { value: Importance; onChange: (v: Importance) => void }) {
  return (
    <div className="imp-pick" role="group" aria-label="How much it matters">
      {(["high", "medium", "low"] as Importance[]).map((i) => (
        <button key={i} type="button" className={value === i ? "on" : ""} onClick={() => onChange(i)}>
          {IMPORTANCE_LABEL[i]}
        </button>
      ))}
    </div>
  );
}

// Where travel times come from: real routing or the built-in estimate.
export function TravelSource() {
  const { travelSource, loadingTravel } = useLive();
  if (loadingTravel)
    return (
      <span className="source">
        <span className="spinner dark" style={{ width: 10, height: 10 }} /> Getting live travel times…
      </span>
    );
  return travelSource === "google" ? (
    <span className="source" title="Weekday 8:30 departure, from Google Maps routing">
      <span className="live" /> Live travel times
    </span>
  ) : (
    <span className="source" title="Estimated from distance and transport links">
      <span className="est" /> Estimated travel times
    </span>
  );
}

// Photo for a home: Google Street View when enabled, otherwise an illustration.
const HUES = [158, 200, 28, 340, 260, 90, 12];
export function HomeImage({ property, size = "card" }: { property: Property; size?: "card" | "hero" | "thumb" }) {
  const { status } = useLive();
  const [failed, setFailed] = useState(false);
  const hue = HUES[[...property.id].reduce((s, ch) => s + ch.charCodeAt(0), 0) % HUES.length];
  const Icon = property.type === "Apartment" ? Building2 : House;
  const showPhoto = status?.streetView && !failed;
  const [w, h] = size === "hero" ? [640, 420] : size === "thumb" ? [320, 180] : [480, 300];
  return (
    <>
      <div
        className="illu"
        style={{ background: `linear-gradient(135deg, hsl(${hue} 38% 62%), hsl(${(hue + 30) % 360} 42% 44%))` }}
        aria-hidden
      >
        <Icon size={size === "hero" ? 96 : size === "thumb" ? 36 : 56} strokeWidth={1.4} />
      </div>
      {showPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/streetview?lat=${property.lat}&lng=${property.lng}&w=${w}&h=${h}`}
          alt={`Street view near ${property.address}`}
          onError={() => setFailed(true)}
          style={{ position: "relative" }}
          loading="lazy"
        />
      )}
    </>
  );
}

// Pages past the first step need a context; send people back to describe
// their life if they land here cold.
export function useRequireContext() {
  const { ready, context } = useStore();
  const router = useRouter();
  useEffect(() => {
    if (ready && !context) router.replace("/");
  }, [ready, context, router]);
  return ready ? context : null;
}
