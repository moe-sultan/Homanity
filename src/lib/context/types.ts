// Structured user context. Describes the renter only, never a listing.
import type { PoiCategory } from "../data/types";

export type Importance = "high" | "medium" | "low";

export type TransportMode = "public_transport" | "car" | "cycle";

export type WorkPlace = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  rail: boolean;
  daysPerWeek?: number;
};

// An important place is either a specific spot ("my daughter's school in
// Rathfarnham") or "the nearest one" of a kind ("a mosque nearby").
export type PlaceTarget =
  | { kind: "fixed"; label: string; lat: number; lng: number; rail: boolean }
  | { kind: "nearest"; category: PoiCategory };

export type ImportantPlace = {
  id: string;
  name: string;
  importance: Importance;
  target: PlaceTarget;
};

export type UserContext = {
  rawText: string;
  budget?: number;
  bedrooms?: { count: number; inferred: boolean };
  work: WorkPlace[];
  transport?: TransportMode;
  household: {
    adults?: number;
    children?: number;
    schoolStage?: "primary" | "secondary" | "mixed";
  };
  importantPlaces: ImportantPlace[];
  priorities: { budget: Importance; commute: Importance };
  // Things the renter mentioned that we could not pin down. Shown back to
  // them rather than guessed.
  notes: string[];
};

export interface ContextExtractor {
  extract(text: string): Promise<UserContext>;
}
