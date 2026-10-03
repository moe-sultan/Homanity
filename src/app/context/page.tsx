"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useRequireContext } from "@/components/bits";
import { KNOWN_PLACES, POI_LABEL } from "@/lib/data/places";
import type { PoiCategory } from "@/lib/data/types";
import type { ImportantPlace, Importance, UserContext } from "@/lib/context/types";
import { useStore } from "@/lib/store";

const IMPORTANCE: Importance[] = ["high", "medium", "low"];
const IMPORTANCE_LABEL: Record<Importance, string> = { high: "Must", medium: "Matters", low: "Nice to have" };
const NEAREST_OPTIONS: PoiCategory[] = ["mosque", "church", "primary_school", "secondary_school", "grocery", "gp", "hospital", "gym", "park"];
const PLACE_OPTIONS = [...KNOWN_PLACES].sort((a, b) => a.name.localeCompare(b.name));

function Seg({ value, onChange }: { value: Importance; onChange: (v: Importance) => void }) {
  return (
    <div className="seg" role="group" aria-label="How much it matters">
      {IMPORTANCE.map((i) => (
        <button key={i} type="button" className={value === i ? "on" : ""} onClick={() => onChange(i)}>
          {IMPORTANCE_LABEL[i]}
        </button>
      ))}
    </div>
  );
}

export default function UnderstoodPage() {
  const ctx = useRequireContext();
  const { setContext } = useStore();
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [newWhere, setNewWhere] = useState("");
  const [newWork, setNewWork] = useState("");
  const [newDays, setNewDays] = useState("3");

  if (!ctx) return null;
  const update = (patch: Partial<UserContext>) => setContext({ ...ctx, ...patch });
  const updatePlace = (id: string, patch: Partial<ImportantPlace>) =>
    update({ importantPlaces: ctx.importantPlaces.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  function addPlace() {
    if (!newWhere) return;
    let place: ImportantPlace;
    if (newWhere.startsWith("nearest:")) {
      const category = newWhere.slice(8) as PoiCategory;
      place = { id: `user-${Date.now()}`, name: newName.trim() || `Nearest ${POI_LABEL[category].toLowerCase()}`, importance: "medium", target: { kind: "nearest", category } };
    } else {
      const kp = KNOWN_PLACES.find((k) => k.id === newWhere)!;
      place = {
        id: `user-${Date.now()}`,
        name: newName.trim() ? `${newName.trim()} (${kp.name})` : kp.name,
        importance: "medium",
        target: { kind: "fixed", label: kp.name, lat: kp.lat, lng: kp.lng, rail: kp.rail },
      };
    }
    update({ importantPlaces: [...ctx!.importantPlaces, place] });
    setNewName("");
    setNewWhere("");
  }

  function addWork() {
    const kp = KNOWN_PLACES.find((k) => k.id === newWork);
    if (!kp || ctx!.work.some((w) => w.id === kp.id)) return;
    update({
      work: [...ctx!.work, { id: kp.id, label: kp.name, lat: kp.lat, lng: kp.lng, rail: kp.rail, daysPerWeek: Number(newDays) }],
      notes: ctx!.notes.filter((n) => !/work or study/i.test(n)),
    });
    setNewWork("");
  }

  const household = [
    ctx.household.adults === 2 ? "You and a partner" : ctx.household.adults === 1 ? "Just you" : null,
    ctx.household.children ? `${ctx.household.children} child${ctx.household.children > 1 ? "ren" : ""}${ctx.household.schoolStage ? ` (${ctx.household.schoolStage} school)` : ""}` : null,
  ].filter(Boolean);

  return (
    <div className="container narrow">
      <div className="page-head">
        <span className="eyebrow">Step 1 of 3 · Your context</span>
        <h1>Here&apos;s what we understood</h1>
        <p className="lede">Check it&apos;s right. You can correct anything, and tell us what matters most so the Fit score reflects your priorities.</p>
      </div>

      <div className="card pad" style={{ marginBottom: 16 }}>
        <p className="muted small">You said</p>
        <p style={{ fontSize: 16, marginTop: 4 }}>&ldquo;{ctx.rawText}&rdquo;</p>
        <Link href="/" className="small" style={{ color: "var(--accent)", fontWeight: 600, display: "inline-block", marginTop: 8 }}>
          Rewrite it
        </Link>
      </div>

      {ctx.notes.length > 0 && (
        <div className="stack" style={{ marginBottom: 16 }}>
          {ctx.notes.map((n) => (
            <div key={n} className="note">
              <span>ⓘ</span>
              <span>{n}</span>
            </div>
          ))}
        </div>
      )}

      <div className="facts">
        <div className="fact">
          <div className="fact-label">Monthly budget</div>
          <input
            type="number"
            min={0}
            step={50}
            value={ctx.budget ?? ""}
            placeholder="Not mentioned"
            onChange={(e) => update({ budget: e.target.value ? Number(e.target.value) : undefined })}
          />
          <div style={{ marginTop: 8 }}>
            <Seg value={ctx.priorities.budget} onChange={(v) => update({ priorities: { ...ctx.priorities, budget: v } })} />
          </div>
        </div>
        <div className="fact">
          <div className="fact-label">Getting around</div>
          <select
            value={ctx.transport ?? ""}
            onChange={(e) => update({ transport: (e.target.value || undefined) as UserContext["transport"] })}
          >
            <option value="">Not mentioned (public transport)</option>
            <option value="public_transport">Public transport</option>
            <option value="car">Car</option>
            <option value="cycle">Bike</option>
          </select>
        </div>
        <div className="fact">
          <div className="fact-label">Bedrooms</div>
          <select
            value={ctx.bedrooms?.count ?? ""}
            onChange={(e) => update({ bedrooms: e.target.value ? { count: Number(e.target.value), inferred: false } : undefined })}
          >
            <option value="">Not mentioned</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
          {ctx.bedrooms?.inferred && <p className="small muted" style={{ marginTop: 6 }}>Our guess from your household. Change it if it&apos;s wrong.</p>}
        </div>
        <div className="fact">
          <div className="fact-label">Household</div>
          <div className="fact-value">{household.length ? household.join(", ") : <span className="muted">Not mentioned</span>}</div>
        </div>
      </div>

      <div className="section-title">
        <h2>Work and study</h2>
        <Seg value={ctx.priorities.commute} onChange={(v) => update({ priorities: { ...ctx.priorities, commute: v } })} />
      </div>
      <div className="card pad">
        {ctx.work.length === 0 && <p className="muted small">No regular commute yet.</p>}
        {ctx.work.map((w) => (
          <div key={w.id} className="place-row">
            <div>
              <div style={{ fontWeight: 600 }}>{w.label}</div>
              <div className="small muted">{w.daysPerWeek ? `${w.daysPerWeek} days a week` : "Days not mentioned, assuming 5"}</div>
            </div>
            <div className="row">
              <select
                className="chip"
                value={w.daysPerWeek ?? 5}
                onChange={(e) => update({ work: ctx.work.map((x) => (x.id === w.id ? { ...x, daysPerWeek: Number(e.target.value) } : x)) })}
              >
                {[1, 2, 3, 4, 5].map((d) => (
                  <option key={d} value={d}>
                    {d} day{d > 1 ? "s" : ""}/wk
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => update({ work: ctx.work.filter((x) => x.id !== w.id) })}>
                Remove
              </button>
            </div>
          </div>
        ))}
        <div className="add-place">
          <select value={newWork} onChange={(e) => setNewWork(e.target.value)}>
            <option value="">Add a workplace or campus…</option>
            {PLACE_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select value={newDays} onChange={(e) => setNewDays(e.target.value)}>
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>
                {d} day{d > 1 ? "s" : ""}/wk
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-ghost btn-sm" onClick={addWork} disabled={!newWork}>
            Add
          </button>
        </div>
      </div>

      <div className="section-title">
        <h2>Important places</h2>
        <span className="small muted">Must-haves count most in your Fit score</span>
      </div>
      <div className="card pad">
        {ctx.importantPlaces.length === 0 && <p className="muted small">Nothing yet. Add the places your week revolves around.</p>}
        {ctx.importantPlaces.map((p) => (
          <div key={p.id} className="place-row">
            <div>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div className="small muted">
                {p.target.kind === "fixed" ? `At ${p.target.label}` : "Whichever is closest to each home"}
              </div>
            </div>
            <div className="row">
              <Seg value={p.importance} onChange={(v) => updatePlace(p.id, { importance: v })} />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => update({ importantPlaces: ctx.importantPlaces.filter((x) => x.id !== p.id) })}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <div className="add-place">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name (e.g. Mum's house)" />
          <select value={newWhere} onChange={(e) => setNewWhere(e.target.value)}>
            <option value="">Where?</option>
            <optgroup label="The nearest…">
              {NEAREST_OPTIONS.map((c) => (
                <option key={c} value={`nearest:${c}`}>
                  Nearest {POI_LABEL[c].toLowerCase()}
                </option>
              ))}
            </optgroup>
            <optgroup label="A specific area">
              {PLACE_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          </select>
          <button type="button" className="btn btn-ghost btn-sm" onClick={addPlace} disabled={!newWhere}>
            Add place
          </button>
        </div>
      </div>

      <div className="row between" style={{ marginTop: 28 }}>
        <span className="small muted">You can come back and change this at any time.</span>
        <button type="button" className="btn btn-primary" onClick={() => router.push("/areas")}>
          See areas that fit
        </button>
      </div>
    </div>
  );
}
