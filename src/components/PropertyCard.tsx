"use client";

import Link from "next/link";
import type { Property } from "@/lib/data/types";
import { topSignals, type Evaluation } from "@/lib/fit/evaluate";
import { FitBadge, RentDiff, SaveButton, euro } from "./bits";

export function PropertyCard({ property, evaluation, showArea }: { property: Property; evaluation: Evaluation; showArea?: string }) {
  const signals = topSignals(evaluation);
  return (
    <Link href={`/properties/${property.id}`} className="card prop-card">
      <div className="prop-top">
        <FitBadge fit={evaluation.fit} />
        <SaveButton propertyId={property.id} />
      </div>
      <div className="rent">
        {euro(property.rent)} <small>/ month</small>
      </div>
      <div>
        <div className="prop-title">{property.title}</div>
        <div className="prop-meta">
          {showArea ? `${showArea} · ` : ""}
          {property.beds} bed · {property.baths} bath · {property.type} · BER {property.ber}
        </div>
      </div>
      {signals.length > 0 && (
        <div className="signals">
          {signals.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      )}
      <RentDiff diff={evaluation.rentDiff} />
    </Link>
  );
}
