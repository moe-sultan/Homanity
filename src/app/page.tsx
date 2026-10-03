"use client";

import {
  ArrowRight,
  Baby,
  Briefcase,
  Car,
  GraduationCap,
  HeartHandshake,
  MapPin,
  Scale,
  Sparkles,
  Stethoscope,
  TrainFront,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useLive } from "@/lib/live";
import { useStore } from "@/lib/store";

const QUICK: { icon: LucideIcon; label: string; text: string }[] = [
  { icon: Briefcase, label: "Work", text: "I work in " },
  { icon: Wallet, label: "Budget", text: "I want to stay under €" },
  { icon: Car, label: "No car", text: "I don't have a car. " },
  { icon: Baby, label: "Kids", text: "I have two kids in primary school. " },
  { icon: MapPin, label: "A place nearby", text: "I need to be close to " },
];

const PERSONAS: { icon: LucideIcon; title: string; line: string; text: string }[] = [
  {
    icon: Users,
    title: "Family, no car",
    line: "Hybrid office job, two teens, mosque nearby",
    text: "I work near Grand Canal Dock on Mondays, Wednesdays and Thursdays. I don't have a car. I have two kids in secondary school, I want to stay under €2,300 and I need to be reasonably close to my mosque. A gym would be nice.",
  },
  {
    icon: GraduationCap,
    title: "Student at UCD",
    line: "Lectures 4 days, tight budget, cycles",
    text: "I'm a student at UCD with lectures four days a week. I cycle everywhere and I'd like to stay under €1,300 for a one-bed. Being near a park would be nice.",
  },
  {
    icon: Stethoscope,
    title: "Nurse at St James's",
    line: "Shift work, drives, mum in Lucan",
    text: "I work as a nurse at St James's Hospital, five days a week. I have a car. My partner and I need a two-bed under €2,000, and I'd like to be near my mum in Lucan.",
  },
];

const VALUES: { icon: LucideIcon; title: string; line: string }[] = [
  { icon: Scale, title: "Know what's fair", line: "Every rent checked against the area" },
  { icon: TrainFront, title: "Look beyond the city", line: "Commuter towns, in real minutes and euro" },
  { icon: HeartHandshake, title: "You decide", line: "We show the trade-offs, never pick for you" },
];

export default function StartPage() {
  const router = useRouter();
  const { context, setContext } = useStore();
  const { status } = useLive();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  const addQuick = (t: string) => {
    setText((cur) => (cur && !/\s$/.test(cur) ? `${cur} ${t}` : cur + t));
    box.current?.focus();
  };

  async function submit(value = text) {
    if (!value.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setContext(data.context);
      router.push("/context");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="container narrow">
      <div className="hero fade-in">
        <span className="pill">
          <Sparkles size={14} /> Renting in Ireland, on your terms
        </span>
        <h1>
          Find a home that fits <em>your life</em>, not just a filter.
        </h1>
        <p className="sub">Describe your week in your own words. We&apos;ll show where you could live and whether the rent is fair.</p>

        <div className="card composer">
          <textarea
            ref={box}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. I work in Dublin three days a week, no car, two kids in secondary school, under €1,800, close to my mosque."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            aria-label="Describe your life"
            autoFocus
          />
          <div className="composer-foot">
            <div className="chips">
              {QUICK.map(({ icon: Icon, label, text: t }) => (
                <button key={label} type="button" className="chip" onClick={() => addQuick(t)}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-primary" onClick={() => submit()} disabled={!text.trim() || busy}>
              {busy ? <span className="spinner" /> : null}
              {busy ? "Reading…" : "Show me places"}
              {!busy && <ArrowRight size={17} />}
            </button>
          </div>
        </div>
        {error && <p className="small" style={{ color: "var(--weak)" }}>{error}</p>}
        {status && (
          <p className="tiny muted">
            {status.contextExtraction === "claude" ? "Read by Claude" : "Read by built-in rules"} · stays in your browser
            {context && (
              <>
                {" · "}
                <a href="/context" onClick={(e) => (e.preventDefault(), router.push("/context"))} style={{ color: "var(--accent)", fontWeight: 650 }}>
                  Continue where you left off
                </a>
              </>
            )}
          </p>
        )}

        <div className="section-label" style={{ marginTop: 18 }}>Or try someone&apos;s week</div>
        <div className="personas">
          {PERSONAS.map(({ icon: Icon, title, line, text: t }) => (
            <button
              key={title}
              type="button"
              className="persona"
              disabled={busy}
              onClick={() => {
                setText(t);
                submit(t);
              }}
            >
              <span className="icon-bubble accent lg">
                <Icon size={20} />
              </span>
              <span>
                <b>{title}</b>
                <span>{line}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="values">
          {VALUES.map(({ icon: Icon, title, line }) => (
            <div key={title} className="value-tile">
              <span className="icon-bubble">
                <Icon size={18} />
              </span>
              <span>
                <b>{title}</b>
                <span>{line}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
