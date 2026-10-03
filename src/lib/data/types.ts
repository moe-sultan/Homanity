// Listing and area data. Static, curated, and independent of any user.

export type LatLng = { lat: number; lng: number };

export type TransportLink = {
  mode: "DART" | "Luas" | "Commuter rail" | "Bus";
  name: string; // e.g. "Luas Red Line", "Swords Express"
};

export type PoiCategory =
  | "mosque"
  | "church"
  | "primary_school"
  | "secondary_school"
  | "grocery"
  | "gp"
  | "hospital"
  | "gym"
  | "park"
  | "station";

export type Poi = LatLng & {
  id: string;
  name: string;
  category: PoiCategory;
};

export type Area = LatLng & {
  id: string;
  name: string;
  county: string;
  inDublin: boolean;
  blurb: string;
  // Rail (DART, Luas, commuter) within easy reach of most homes in the area.
  rail: boolean;
  transport: TransportLink[];
  // Typical monthly asking rent by bedroom count (curated benchmark, EUR).
  typicalRent: Record<1 | 2 | 3 | 4, number>;
};

export type Property = LatLng & {
  id: string;
  areaId: string;
  title: string;
  address: string;
  type: "Apartment" | "House" | "Duplex";
  beds: 1 | 2 | 3 | 4;
  baths: number;
  rent: number;
  ber: string;
  walkToStopMin: number; // walk to nearest frequent public transport stop
  stopName: string;
  features: string[];
  // Imported listings only: where the listing came from and a link to it.
  source?: string;
  url?: string;
};
