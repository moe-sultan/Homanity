"use client";

import Link from "next/link";
import { allPhotos } from "@/lib/data/photos";
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
  const photos = allPhotos().length > 0;
  return (
    <span>
      {items.join(" · ")}
      {photos && (
        <>
          {" · "}
          <Link href="/credits" style={{ color: "inherit", textDecoration: "underline" }}>Photo credits</Link>
        </>
      )}
    </span>
  );
}
