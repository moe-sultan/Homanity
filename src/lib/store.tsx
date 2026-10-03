"use client";

// Client-side session state: the renter's context and their saved shortlist.
// Kept in the browser only (localStorage), never sent anywhere else.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { UserContext } from "./context/types";

type Store = {
  ready: boolean;
  context: UserContext | null;
  setContext: (ctx: UserContext | null) => void;
  saved: string[];
  toggleSaved: (propertyId: string) => void;
  isSaved: (propertyId: string) => boolean;
};

const StoreContext = createContext<Store | null>(null);
const KEY = "homanity:v1";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [context, setContextState] = useState<UserContext | null>(null);
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setContextState(parsed.context ?? null);
        setSaved(Array.isArray(parsed.saved) ? parsed.saved : []);
      }
    } catch {
      // Storage unavailable: run without persistence.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ context, saved }));
    } catch {
      // ignore
    }
  }, [ready, context, saved]);

  const setContext = useCallback((ctx: UserContext | null) => setContextState(ctx), []);
  const toggleSaved = useCallback(
    (id: string) => setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
    [],
  );
  const isSaved = useCallback((id: string) => saved.includes(id), [saved]);

  return (
    <StoreContext.Provider value={{ ready, context, setContext, saved, toggleSaved, isSaved }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}
