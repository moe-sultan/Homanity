"use client";

import { useLive } from "@/lib/live";

// Footer line saying where the numbers come from, so nobody mistakes a demo
// estimate for a live figure.
export function DataSources() {
  const { status } = useLive();
  if (!status) return null;
  const items = [
    status.contextExtraction === "claude" ? "Understanding: Claude" : "Understanding: built-in rules",
    status.travelTimes === "google" ? "Travel: Google Maps" : "Travel: estimates",
    status.placeSearch === "google" ? "Places: Google" : "Places: curated list",
    "Listings: curated sample",
    "Rents: indicative benchmarks",
  ];
  return <span>{items.join(" · ")}</span>;
}
