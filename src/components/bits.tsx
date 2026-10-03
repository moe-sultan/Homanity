"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { fitTone } from "@/lib/fit/evaluate";
import { useStore } from "@/lib/store";

export function FitBadge({ fit, large = false }: { fit: number; large?: boolean }) {
  return (
    <span className={`fit ${fitTone(fit)} ${large ? "lg" : ""}`} title="How well this fits the life you described">
      <span className="num">{fit}</span>
      <span className="lbl">Fit</span>
    </span>
  );
}

export function SaveButton({ propertyId }: { propertyId: string }) {
  const { isSaved, toggleSaved } = useStore();
  const on = isSaved(propertyId);
  return (
    <button
      type="button"
      className={`save ${on ? "on" : ""}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSaved(propertyId);
      }}
      aria-pressed={on}
    >
      {on ? "♥ Saved" : "♡ Save"}
    </button>
  );
}

export function RentDiff({ diff }: { diff: number }) {
  if (Math.abs(diff) < 25) return <span className="value inline">In line with typical area rent</span>;
  return diff < 0 ? (
    <span className="value below">€{Math.abs(diff).toLocaleString()} below typical area rent</span>
  ) : (
    <span className="value above">€{diff.toLocaleString()} above typical area rent</span>
  );
}

export const euro = (n: number) => `€${n.toLocaleString("en-IE")}`;

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
