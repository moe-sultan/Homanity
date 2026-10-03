"use client";

import { Bath, BedDouble, Zap } from "lucide-react";
import Link from "next/link";
import type { Property } from "@/lib/data/types";
import { topSignals, type Evaluation } from "@/lib/fit/evaluate";
import { FairRent, FitPill, HomeImage, SaveButton, euro } from "./bits";

export function HomeCard({ property, evaluation, areaName }: { property: Property; evaluation: Evaluation; areaName?: string }) {
  const signals = topSignals(evaluation, 2);
  return (
    <Link href={`/properties/${property.id}`} className="card home-card fade-in">
      <div className="home-img">
        <HomeImage property={property} />
        <div className="overlay-tl">
          <FitPill fit={evaluation.fit} />
        </div>
        <div className="overlay-tr">
          <SaveButton propertyId={property.id} round />
        </div>
        {areaName && (
          <div className="overlay-bl">
            <span className="tag dark">{areaName}</span>
          </div>
        )}
      </div>
      <div className="home-body">
        <div className="row between">
          <span className="rent">
            {euro(property.rent)}
            <small> /mo</small>
          </span>
          <FairRent diff={evaluation.rentDiff} />
        </div>
        <div className="home-title">{property.title}</div>
        <div className="specs">
          <span><BedDouble size={15} /> {property.beds}</span>
          <span><Bath size={15} /> {property.baths}</span>
          <span><Zap size={15} /> {property.ber}</span>
        </div>
        {signals.length > 0 && (
          <div className="signal-row">
            {signals.map((s) => (
              <span key={s} className="tag">{s}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
