"use client";

import {
  ArrowRight,
  Bike,
  Briefcase,
  Bus,
  Car,
  Info,
  Minus,
  Pencil,
  Plus,
  Sparkles,
  Users,
  Wallet,
  BedDouble,
  X,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImportancePick, categoryIcon, placeIcon, placeLabel, useRequireContext } from "@/components/bits";
import { POI_LABEL } from "@/lib/data/places";
import type { PoiCategory } from "@/lib/data/types";
import type { ImportantPlace, UserContext } from "@/lib/context/types";
import { useStore } from "@/lib/store";

const QUICK_NEAREST: PoiCategory[] = ["primary_school", "secondary_school", "mosque", "church", "grocery", "gp", "gym", "park", "hospital"];

type Resolved = { label: string; lat: number; lng: number; rail: boolean };

export default function ContextPage() {
  const ctx = useRequireContext();
  const { setContext } = useStore();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [rereading, setRereading] = useState(false);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"place" | "work">("place");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  if (!ctx) return null;
  const update = (patch: Partial<UserContext>) => setContext({ ...ctx, ...patch });
  const updatePlace = (id: string, patch: Partial<ImportantPlace>) =>
    update({ importantPlaces: ctx.importantPlaces.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  async function reread() {
    setRereading(true);
    const res = await fetch("/api/context", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: draft }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setContext(data.context);
      setEditing(false);
    }
    setRereading(false);
  }

  function addNearest(category: PoiCategory) {
    if (ctx!.importantPlaces.some((p) => p.target.kind === "nearest" && p.target.category === category)) return;
    update({
      importantPlaces: [
        ...ctx!.importantPlaces,
        { id: `user-${Date.now()}`, name: `Nearest ${POI_LABEL[category].toLowerCase()}`, importance: "medium", target: { kind: "nearest", category } },
      ],
    });
  }

  async function addByName() {
    const q = query.trim();
    if (!q) return;
    setAdding(true);
    setAddError(null);
    // "Mum's house in Lucan" -> name "Mum's house", look up "Lucan".
    const m = q.match(/^(.*?)\s+(?:in|at|near|on)\s+(.+)$/i);
    const name = m ? m[1].trim() : "";
    const where = m ? m[2] : q;
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(where)}`).then((r) => r.json()).catch(() => null);
    const place: Resolved | null = res?.place ?? (m ? (await fetch(`/api/geocode?q=${encodeURIComponent(q)}`).then((r) => r.json()).catch(() => null))?.place : null);
    setAdding(false);
    if (!place) {
      setAddError(`Couldn't find "${where}". Try a town, area or landmark.`);
      return;
    }
    if (kind === "work") {
      const id = `work-${Date.now()}`;
      update({
        work: [...ctx!.work, { id, label: place.label, lat: place.lat, lng: place.lng, rail: place.rail, daysPerWeek: 3 }],
        notes: ctx!.notes.filter((n) => !/work or study|workplace/i.test(n)),
      });
    } else {
      update({
        importantPlaces: [
          ...ctx!.importantPlaces,
          {
            id: `user-${Date.now()}`,
            name: name ? `${name} (${place.label})` : place.label,
            importance: "medium",
            target: { kind: "fixed", label: place.label, lat: place.lat, lng: place.lng, rail: place.rail },
          },
        ],
      });
    }
    setQuery("");
  }

  const transport = ctx.transport ?? "public_transport";
  const beds = ctx.bedrooms?.count;
  const adults = ctx.household.adults ?? 1;
  const kids = ctx.household.children ?? 0;

  return (
    <div className="container fade-in">
      <div className="page-head">
        <h1>Here&apos;s your week, as we understood it</h1>
        <p className="sub">Tap anything to fix it. What you mark as a must counts most.</p>
      </div>

      {editing ? (
        <div className="card pad stack" style={{ marginBottom: 16 }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 12, padding: 12, fontSize: 15, resize: "vertical" }}
            autoFocus
          />
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={reread} disabled={!draft.trim() || rereading}>
              {rereading ? <span className="spinner" /> : <Sparkles size={14} />} Read it again
            </button>
          </div>
        </div>
      ) : (
        <div className="said" style={{ marginBottom: 14 }}>
          <Sparkles size={16} style={{ marginTop: 2, color: "var(--accent)" }} />
          <q>{ctx.rawText}</q>
          <button type="button" className="icon-btn plain" onClick={() => (setDraft(ctx.rawText), setEditing(true))} aria-label="Rewrite">
            <Pencil size={15} />
          </button>
        </div>
      )}

      {ctx.notes.length > 0 && (
        <div className="notes" style={{ marginBottom: 16 }}>
          {ctx.notes.map((n) => (
            <div key={n} className="note">
              <Info size={15} style={{ marginTop: 1 }} />
              <span>{n}</span>
            </div>
          ))}
        </div>
      )}

      <div className="tiles">
        <div className="card tile">
          <div className="tile-label"><span className="icon-bubble accent"><Wallet size={16} /></span>Monthly budget</div>
          <div className="money">
            €
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={50}
              value={ctx.budget ?? ""}
              placeholder="Not set"
              onChange={(e) => update({ budget: e.target.value ? Number(e.target.value) : undefined })}
              aria-label="Monthly budget in euro"
            />
          </div>
          <ImportancePick value={ctx.priorities.budget} onChange={(v) => update({ priorities: { ...ctx.priorities, budget: v } })} />
        </div>

        <div className="card tile">
          <div className="tile-label"><span className="icon-bubble accent"><Bus size={16} /></span>Getting around</div>
          <div className="toggle-group">
            {[
              { v: "public_transport", icon: Bus, label: "Transit" },
              { v: "car", icon: Car, label: "Car" },
              { v: "cycle", icon: Bike, label: "Bike" },
            ].map(({ v, icon: Icon, label }) => (
              <button key={v} type="button" className={`toggle ${transport === v ? "on" : ""}`} onClick={() => update({ transport: v as UserContext["transport"] })}>
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
          {!ctx.transport && <span className="tile-hint">Not mentioned, assuming public transport</span>}
        </div>

        <div className="card tile">
          <div className="tile-label"><span className="icon-bubble accent"><BedDouble size={16} /></span>Bedrooms</div>
          <div className="stepper">
            <button type="button" className="icon-btn" aria-label="Fewer bedrooms" onClick={() => update({ bedrooms: beds && beds > 1 ? { count: beds - 1, inferred: false } : undefined })}>
              <Minus size={15} />
            </button>
            <b className="num">{beds ?? "–"}</b>
            <button type="button" className="icon-btn" aria-label="More bedrooms" onClick={() => update({ bedrooms: { count: Math.min(4, (beds ?? 0) + 1), inferred: false } })}>
              <Plus size={15} />
            </button>
          </div>
          <span className="tile-hint">{ctx.bedrooms?.inferred ? "Our guess from your household" : beds ? "At least" : "Not mentioned"}</span>
        </div>

        <div className="card tile">
          <div className="tile-label"><span className="icon-bubble accent"><Users size={16} /></span>Household</div>
          <div className="people" aria-label={`${adults} adult${adults > 1 ? "s" : ""}, ${kids} child${kids === 1 ? "" : "ren"}`}>
            {Array.from({ length: adults }, (_, i) => <User key={`a${i}`} size={24} />)}
            {Array.from({ length: kids }, (_, i) => <User key={`k${i}`} size={18} />)}
          </div>
          <span className="tile-hint">
            {adults === 2 ? "You and a partner" : "You"}
            {kids ? `, ${kids} child${kids > 1 ? "ren" : ""}${ctx.household.schoolStage ? ` (${ctx.household.schoolStage})` : ""}` : ""}
          </span>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h2><Briefcase size={19} /> Regular trips</h2>
          <div className="row small muted">
            How much commute matters
            <ImportancePick value={ctx.priorities.commute} onChange={(v) => update({ priorities: { ...ctx.priorities, commute: v } })} />
          </div>
        </div>
        <div className="place-grid">
          {ctx.work.map((w) => (
            <div key={w.id} className="trip">
              <span className="icon-bubble work"><Briefcase size={16} /></span>
              <div className="trip-main">
                <b>{w.label}</b>
                <span>{w.daysPerWeek ?? 5} days a week</span>
              </div>
              <button type="button" className="icon-btn plain" aria-label={`Remove ${w.label}`} onClick={() => update({ work: ctx.work.filter((x) => x.id !== w.id) })}>
                <X size={15} />
              </button>
              <div className="foot">
                <span className="tiny muted">Days a week</span>
                <div className="days" role="group" aria-label="Days a week">
                  {[1, 2, 3, 4, 5].map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={(w.daysPerWeek ?? 5) === d ? "on" : ""}
                      onClick={() => update({ work: ctx.work.map((x) => (x.id === w.id ? { ...x, daysPerWeek: d } : x)) })}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {ctx.work.length === 0 && <p className="muted small">No regular commute. Add one below if you have one.</p>}
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h2>Places that matter</h2>
        </div>
        <div className="place-grid">
          {ctx.importantPlaces.map((p) => {
            const Icon = placeIcon(p);
            return (
              <div key={p.id} className="place-card">
                <span className="icon-bubble place"><Icon size={16} /></span>
                <div className="place-main">
                  <b>{placeLabel(p.name)}</b>
                  <span>{p.target.kind === "fixed" ? p.target.label : "The closest one to each home"}</span>
                </div>
                <button
                  type="button"
                  className="icon-btn plain"
                  aria-label={`Remove ${p.name}`}
                  onClick={() => update({ importantPlaces: ctx.importantPlaces.filter((x) => x.id !== p.id) })}
                >
                  <X size={15} />
                </button>
                <div className="foot">
                  <span className="tiny muted">How much it matters</span>
                  <ImportancePick value={p.importance} onChange={(v) => updatePlace(p.id, { importance: v })} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="stack" style={{ marginTop: 14, gap: 10 }}>
          <form
            className="adder"
            onSubmit={(e) => {
              e.preventDefault();
              addByName();
            }}
          >
            <Plus size={16} className="muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={kind === "work" ? "Workplace or campus, e.g. Sandyford" : "Add a place, e.g. Mum's house in Lucan"}
              aria-label="Add a place"
            />
            <select value={kind} onChange={(e) => setKind(e.target.value as "place" | "work")} aria-label="Type">
              <option value="place">Place</option>
              <option value="work">Work / study</option>
            </select>
            <button type="submit" className="btn btn-dark btn-sm" disabled={!query.trim() || adding}>
              {adding ? <span className="spinner" /> : "Add"}
            </button>
          </form>
          {addError && <span className="small" style={{ color: "var(--weak)" }}>{addError}</span>}
          <div className="chips">
            {QUICK_NEAREST.filter((c) => !ctx.importantPlaces.some((p) => p.target.kind === "nearest" && p.target.category === c)).map((c) => {
              const Icon = categoryIcon(c);
              return (
                <button key={c} type="button" className="chip" onClick={() => addNearest(c)}>
                  <Icon size={14} /> {POI_LABEL[c]} nearby
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="sticky-cta">
        <span className="small">You can come back and change this any time.</span>
        <button type="button" className="btn btn-primary" onClick={() => router.push("/areas")}>
          See areas that fit <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}
