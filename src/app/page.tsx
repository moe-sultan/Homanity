"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";

const PROMPTS = [
  { label: "Where do you work or study?", text: "I work in " },
  { label: "How many days do you go in?", text: " days a week" },
  { label: "How do you get around?", text: "I don't have a car. " },
  { label: "Who are you living with?", text: "I live with " },
  { label: "What's your budget?", text: "I want to stay under €" },
  { label: "What places do you need nearby?", text: "I need to be close to " },
];

const EXAMPLE =
  "I work near Grand Canal Dock on Mondays, Wednesdays and Thursdays. I don't have a car. I have two kids in secondary school, I want to stay under €2,300 and I need to be reasonably close to my mosque. A gym would be nice.";

export default function ContextPage() {
  const router = useRouter();
  const { context, setContext } = useStore();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addPrompt = (t: string) => setText((cur) => (cur && !cur.endsWith(" ") ? `${cur} ${t}` : cur + t));

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
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
      <div className="hero">
        <span className="eyebrow">Renting in Ireland, on your terms</span>
        <h1>Your home should fit your life, not just your search criteria.</h1>
        <p className="lede">
          Tell us how you actually live. We&apos;ll show you where you could live, what each home would mean for your week, and
          whether the rent is fair for the area, so you walk into every viewing knowing as much as the landlord does.
        </p>
      </div>

      <div className="card composer" style={{ marginTop: 16 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="For example: I work in Dublin three days a week, I don't have a car, I have two kids in secondary school, I want to stay under €1,800 and I need to be reasonably close to my mosque."
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) submit();
          }}
          autoFocus
        />
        <div className="composer-foot">
          <button type="button" className="chip" onClick={() => setText(EXAMPLE)}>
            Try an example
          </button>
          <div className="row">
            {context && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => router.push("/context")}>
                Back to my context
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={submit} disabled={!text.trim() || busy}>
              {busy ? <span className="spinner" /> : null}
              {busy ? "Understanding your life…" : "Show me where I could live"}
            </button>
          </div>
        </div>
      </div>
      {error && <p className="small" style={{ color: "var(--weak)", marginTop: 8 }}>{error}</p>}

      <div className="chips" style={{ marginTop: 16 }}>
        {PROMPTS.map((p) => (
          <button key={p.label} type="button" className="chip" onClick={() => addPrompt(p.text)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="promises">
        <div className="promise">
          <h3>Know what&apos;s fair</h3>
          <p>Every rent is shown against the typical rent for that area and size, so you can spot overpricing.</p>
        </div>
        <div className="promise">
          <h3>Look beyond the city</h3>
          <p>Commuter towns often give you more space for less. See the real trade-off in minutes and euro.</p>
        </div>
        <div className="promise">
          <h3>You decide</h3>
          <p>We lay out the trade-offs for your life. The choice is always yours, and we never pick for you.</p>
        </div>
      </div>
    </div>
  );
}
