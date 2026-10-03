"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { FitBadge, RentDiff, euro, useRequireContext } from "@/components/bits";
import { PropertyCard } from "@/components/PropertyCard";
import { getArea } from "@/lib/data/areas";
import { getProperty } from "@/lib/data/properties";
import type { Property } from "@/lib/data/types";
import { evaluateProperty, type Evaluation } from "@/lib/fit/evaluate";
import { useStore } from "@/lib/store";

type Item = { property: Property; e: Evaluation };
type Row = {
  label: string;
  values: (number | undefined)[];
  render: (item: Item, i: number) => ReactNode;
  better?: "low" | "high"; // highlight the cell that is kindest to the renter
};

export default function SavedPage() {
  const ctx = useRequireContext();
  const { saved, toggleSaved } = useStore();
  const items: Item[] = useMemo(
    () =>
      ctx
        ? saved
            .map((id) => getProperty(id))
            .filter((p): p is Property => !!p)
            .map((property) => ({ property, e: evaluateProperty(ctx, property) }))
        : [],
    [ctx, saved],
  );
  if (!ctx) return null;

  if (items.length === 0) {
    return (
      <div className="container narrow">
        <div className="card empty">
          <h2>Nothing saved yet</h2>
          <p>Save homes as you explore areas, then compare them here side by side against your life.</p>
          <Link href="/areas" className="btn btn-primary">Explore areas</Link>
        </div>
      </div>
    );
  }

  const linkIds = Array.from(new Set(items.flatMap((it) => it.e.links.map((l) => l.id))));
  const linkMeta = (id: string) => items.flatMap((it) => it.e.links).find((l) => l.id === id)!;

  const rows: Row[] = [
    {
      label: "Fit with your life",
      values: items.map((it) => it.e.fit),
      render: (it) => <FitBadge fit={it.e.fit} />,
      better: "high",
    },
    {
      label: "Rent",
      values: items.map((it) => it.property.rent),
      render: (it) => <span className="num">{euro(it.property.rent)}</span>,
      better: "low",
    },
    {
      label: "Typical area rent",
      values: items.map((it) => it.e.rentDiff),
      render: (it) => (
        <div className="stack" style={{ gap: 2 }}>
          <span className="num">{euro(it.e.typicalRent)}</span>
          <RentDiff diff={it.e.rentDiff} />
        </div>
      ),
      better: "low",
    },
    ...linkIds.map<Row>((id) => {
      const meta = linkMeta(id);
      return {
        label: meta.kind === "work" ? `To work: ${meta.name}` : meta.name,
        values: items.map((it) => it.e.links.find((l) => l.id === id)?.travel.minutes),
        render: (it) => {
          const l = it.e.links.find((x) => x.id === id);
          if (!l) return <span className="muted">—</span>;
          return (
            <div>
              <span className="num">{l.travel.minutes} min</span>
              {l.kind === "place" && l.point.label !== l.name && <div className="small muted">{l.point.label}</div>}
            </div>
          );
        },
        better: "low",
      };
    }),
  ];

  if (ctx.work.length) {
    rows.push(
      {
        label: "Commuting cost",
        values: items.map((it) => it.e.monthlyTransportCost),
        render: (it) => <span className="num">≈ {euro(it.e.monthlyTransportCost ?? 0)}/mo</span>,
        better: "low",
      },
      {
        label: "Rent + commuting",
        values: items.map((it) => it.property.rent + (it.e.monthlyTransportCost ?? 0)),
        render: (it) => <span className="num">≈ {euro(it.property.rent + (it.e.monthlyTransportCost ?? 0))}/mo</span>,
        better: "low",
      },
    );
  }

  rows.push(
    {
      label: "Bedrooms",
      values: items.map((it) => it.property.beds),
      render: (it) => <span className="num">{it.property.beds} bed · {it.property.baths} bath</span>,
      better: "high",
    },
    {
      label: "Walk to transport",
      values: items.map((it) => it.property.walkToStopMin),
      render: (it) => <span>{it.property.walkToStopMin} min · <span className="muted small">{it.property.stopName}</span></span>,
      better: "low",
    },
    {
      label: "BER",
      values: items.map(() => undefined),
      render: (it) => <span>{it.property.ber}</span>,
    },
  );

  const bestIndex = (row: Row): number | undefined => {
    if (!row.better || items.length < 2) return undefined;
    const vals = row.values.map((v, i) => ({ v, i })).filter((x): x is { v: number; i: number } => x.v !== undefined);
    if (vals.length < 2) return undefined;
    const sorted = [...vals].sort((a, b) => (row.better === "low" ? a.v - b.v : b.v - a.v));
    return sorted[0].v === sorted[1].v ? undefined : sorted[0].i;
  };

  return (
    <div className="container">
      <div className="page-head">
        <span className="eyebrow">Step 3 of 3 · Saved</span>
        <h1>Compare your shortlist</h1>
        <p className="lede">
          Each row is something you told us matters. Green marks the kinder option on that row. The trade-offs are yours to weigh;
          a home that costs more might give you back hours every week.
        </p>
      </div>

      <div className="card compare-wrap">
        <table className="compare">
          <thead>
            <tr>
              <th />
              {items.map((it) => (
                <th key={it.property.id}>
                  <Link href={`/properties/${it.property.id}`} style={{ fontWeight: 650 }}>{it.property.title}</Link>
                  <div className="small muted" style={{ fontWeight: 400 }}>{getArea(it.property.areaId)!.name}</div>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => toggleSaved(it.property.id)}>
                    Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const best = bestIndex(row);
              return (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {items.map((it, i) => (
                    <td key={it.property.id} className={best === i ? "best" : ""}>
                      {row.render(it, i)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="section-title">
        <h2>Saved homes</h2>
        <Link href="/areas" className="small" style={{ color: "var(--accent)", fontWeight: 600 }}>Keep exploring</Link>
      </div>
      <div className="grid grid-3">
        {items.map(({ property, e }) => (
          <PropertyCard key={property.id} property={property} evaluation={e} showArea={getArea(property.areaId)!.name} />
        ))}
      </div>
    </div>
  );
}
