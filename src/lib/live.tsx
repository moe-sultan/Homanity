"use client";

// Live data layer: which integrations are on, and real travel times for the
// current context when Google Routes is enabled. Everything degrades to the
// built-in estimates when a key is missing or a call fails.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { IntegrationStatus } from "./integrations";
import { travelPairsFor } from "./fit/evaluate";
import type { TravelLookup } from "./fit/travel";
import { useStore } from "./store";

type Live = {
  status: IntegrationStatus | null;
  lookup: TravelLookup | undefined;
  travelSource: "google" | "estimate";
  loadingTravel: boolean;
};

const LiveContext = createContext<Live>({ status: null, lookup: undefined, travelSource: "estimate", loadingTravel: false });

export function LiveProvider({ children }: { children: ReactNode }) {
  const { context } = useStore();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [lookup, setLookup] = useState<TravelLookup | undefined>(undefined);
  const [travelSource, setTravelSource] = useState<"google" | "estimate">("estimate");
  const [loadingTravel, setLoadingTravel] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  // Only the parts of the context that change travel times trigger a fetch.
  const { origins, destinations } = context ? travelPairsFor(context) : { origins: [], destinations: [] };
  const mode = context?.transport ?? "public_transport";
  const travelKey = JSON.stringify({ destinations, mode });

  useEffect(() => {
    if (status?.travelTimes !== "google" || !destinations.length) {
      setLookup(undefined);
      setTravelSource("estimate");
      return;
    }
    let cancelled = false;
    setLoadingTravel(true);
    fetch("/api/travel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origins, destinations, mode }),
    })
      .then((r) => r.json())
      .then((data: { source: "google" | "estimate"; pairs: { key: string; minutes: number; km: number }[] }) => {
        if (cancelled) return;
        setLookup(data.pairs.length ? new Map(data.pairs.map((p) => [p.key, { minutes: p.minutes, km: p.km }])) : undefined);
        setTravelSource(data.pairs.length ? data.source : "estimate");
      })
      .catch(() => !cancelled && setTravelSource("estimate"))
      .finally(() => !cancelled && setLoadingTravel(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [travelKey, status?.travelTimes]);

  return <LiveContext.Provider value={{ status, lookup, travelSource, loadingTravel }}>{children}</LiveContext.Provider>;
}

export const useLive = () => useContext(LiveContext);
