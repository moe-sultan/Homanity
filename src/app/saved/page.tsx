"use client";

import { Bath, Briefcase, Footprints, Heart, Scale, Wallet, X, Zap, BedDouble, Coins, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { FairRent, FitRing, HomeImage, euro, placeIcon, placeLabel, useRequireContext } from "@/components/bits";
import { HomeCard } from "@/components/HomeCard";
import { getArea } from "@/lib/data/areas";
import { getProperty } from "@/lib/data/properties";
import type { Property } from "@/lib/data/types";
import { evaluateProperty, type Evaluation } from "@/lib/fit/evaluate";
import { useLive } from "@/lib/live";
import { useStore } from "@/lib/store";

type Item = { property: Property; e: Evaluation };
type Row = {
  label: string;
  icon: LucideIcon;
  values: (number | undefined)[];
  render: (item: Item) => ReactNode;
  better?: "low" | "high"; // highlight the cell that is kindest to the renter
};

export default function SavedPage() {
  const ctx = useRequireContext();
  const { lookup } = useLive();
  const { saved, toggleSaved } = useStore();
  const items: Item[] = useMemo(
    () =>
      ctx
        ? saved
            .map((id) => getProperty(id))
            .filter((p): p is Property => !!p)
            .map((property) => ({ property, e: evaluateProperty(ctx, property, lookup) }))
        : [],
    [ctx, saved, lookup],
  );
  if (!ctx) return null;

  if (items.length === 0) {
    return (
      <div className="container narrow">
        <div className="card empty">
          <span className="icon-bubble lg place"><Heart size={22} /></span>
          <h2>Nothing saved yet</h2>
          <p>Tap the heart on any home, then compare them here side by side against your week.</p>
          <Link href="/areas" className="btn btn-primary">Explore areas</Link>
        </div>
      </div>
    );
  }

  const linkIds = Array.from(new Set(items.flatMap((it) => it.e.links.map((l) => l.id))));
  const linkMeta = (id: string) => items.flatMap((it) => it.e.links).find((l) => l.id === id)!;
  const maxMinutes = Math.max(1, ...items.flatMap((it) => it.e.links.map((l) => l.travel.minutes)));

  const rows: Row[] = [
    {
      label: "Rent",
      icon: Wallet,
      values: items.map((it) => it.property.rent),
      render: (it) => (
        <div>
          <span className="num" style={{ fontSize: 17 }}>{euro(it.property.rent)}</span>
          <div><FairRent diff={it.e.rentDiff} /></div>
        </div>
      ),
      better: "low",
    },
    ...linkIds.map<Row>((id) => {
      const meta = linkMeta(id);
      return {
        label: meta.kind === "work" ? meta.name : placeLabel(meta.name),
        icon: meta.kind === "work" ? Briefcase : placeIcon({ name: meta.name }),
        values: items.map((it) => it.e.links.find((l) => l.id === id)?.travel.minutes),
        render: (it) => {
          const l = it.e.links.find((x) => x.id === id);
          if (!l) return <span className="muted">–</span>;
          return (
            <div>
              <span className="num">{l.travel.minutes} min</span>
              <div className="mini-bar">
                <i style={{ width: `${(l.travel.minutes / maxMinutes) * 100}%`, background: l.kind === "work" ? "var(--work)" : "var(--place)" }} />
              </div>
            </div>
          );
        },
        better: "low",
      };
    }),
  ];

  if (ctx.work.length) {
    rows.push({
      label: "Rent + commuting",
      icon: Coins,
      values: items.map((it) => it.property.rent + (it.e.monthlyTransportCost ?? 0)),
      render: (it) => (
        <div>
          <span className="num">≈ {euro(it.property.rent + (it.e.monthlyTransportCost ?? 0))}</span>
          <div className="tiny muted">incl. ≈ {euro(it.e.monthlyTransportCost ?? 0)} travel</div>
        </div>
      ),
      better: "low",
    });
  }

  rows.push(
    {
      label: "Bedrooms",
      icon: BedDouble,
      values: items.map((it) => it.property.beds),
      render: (it) => (
        <span className="specs">
          <span><BedDouble size={15} /> <span className="num">{it.property.beds}</span></span>
          <span><Bath size={15} /> {it.property.baths}</span>
        </span>
      ),
      better: "high",
    },
    {
      label: "Walk to transport",
      icon: Footprints,
      values: items.map((it) => it.property.walkToStopMin),
      render: (it) => <span className="num" title={it.property.stopName}>{it.property.walkToStopMin} min</span>,
      better: "low",
    },
    {
      label: "Energy (BER)",
      icon: Zap,
      values: items.map(() => undefined),
      render: (it) => <span className="tag">{it.property.ber}</span>,
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
    <div className="container fade-in">
      <div className="page-head">
        <h1>Compare your shortlist</h1>
        <p className="sub">Green marks the kinder option on each row. A pricier home might give you back hours every week; the call is yours.</p>
      </div>

      <div className="card compare-wrap">
        <table className="compare">
          <thead>
            <tr>
              <th />
              {items.map((it) => (
                <th key={it.property.id}>
                  <div className="compare-head">
                    <Link href={`/properties/${it.property.id}`} className="thumb home-img">
                      <HomeImage property={it.property} size="thumb" />
                    </Link>
                    <div className="row between" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
                      <div>
                        <Link href={`/properties/${it.property.id}`} style={{ fontWeight: 700 }}>{it.property.title}</Link>
                        <div className="tiny muted" style={{ fontWeight: 500 }}>{getArea(it.property.areaId)!.name}</div>
                      </div>
                      <button type="button" className="icon-btn plain" aria-label="Remove" onClick={() => toggleSaved(it.property.id)}>
                        <X size={15} />
                      </button>
                    </div>
                    <FitRing fit={it.e.fit} size={52} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const best = bestIndex(row);
              const Icon = row.icon;
              return (
                <tr key={row.label}>
                  <th scope="row">
                    <span className="row"><Icon size={15} className="muted" /> {row.label}</span>
                  </th>
                  {items.map((it, i) => (
                    <td key={it.property.id} className={best === i ? "best" : ""}>
                      {row.render(it)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-head">
          <h2><Scale size={19} /> Saved homes</h2>
          <Link href="/areas" className="small" style={{ color: "var(--accent)", fontWeight: 650 }}>Keep exploring</Link>
        </div>
        <div className="grid grid-3">
          {items.map(({ property, e }) => (
            <HomeCard key={property.id} property={property} evaluation={e} areaName={getArea(property.areaId)!.name} />
          ))}
        </div>
      </div>
    </div>
  );
}
