import { AREAS } from "./areas";
import type { LatLng, Poi, PoiCategory } from "./types";

// Named locations people mention for work, study, school or family.
// Used to turn "I work near Grand Canal Dock" into a point on the map.
export type KnownPlace = LatLng & {
  id: string;
  name: string;
  aliases: string[]; // lower-case phrases matched in free text
  rail: boolean; // DART, Luas or commuter rail within a short walk
};

const LANDMARKS: KnownPlace[] = [
  { id: "grand-canal-dock", name: "Grand Canal Dock", aliases: ["grand canal dock", "grand canal", "silicon docks", "barrow street"], lat: 53.3393, lng: -6.2376, rail: true },
  { id: "ifsc", name: "IFSC / Docklands", aliases: ["ifsc", "docklands", "north wall", "spencer dock"], lat: 53.3489, lng: -6.2437, rail: true },
  { id: "city-centre", name: "Dublin city centre", aliases: ["dublin city centre", "city centre", "city center", "o'connell street", "town", "dublin city", "in dublin", "dublin"], lat: 53.3478, lng: -6.2597, rail: true },
  { id: "st-stephens-green", name: "St Stephen's Green", aliases: ["stephen's green", "stephens green", "grafton street"], lat: 53.3382, lng: -6.2591, rail: true },
  { id: "ballsbridge", name: "Ballsbridge", aliases: ["ballsbridge", "lansdowne"], lat: 53.3291, lng: -6.2311, rail: true },
  { id: "sandyford", name: "Sandyford", aliases: ["sandyford", "central park"], lat: 53.2773, lng: -6.2063, rail: true },
  { id: "citywest", name: "Citywest", aliases: ["citywest", "city west"], lat: 53.2876, lng: -6.4178, rail: true },
  { id: "heuston", name: "Heuston", aliases: ["heuston"], lat: 53.3464, lng: -6.2927, rail: true },
  { id: "st-james", name: "St James's Hospital", aliases: ["st james's hospital", "st james hospital", "st. james's"], lat: 53.3405, lng: -6.2946, rail: true },
  { id: "beaumont", name: "Beaumont Hospital", aliases: ["beaumont"], lat: 53.3906, lng: -6.2232, rail: false },
  { id: "airport", name: "Dublin Airport", aliases: ["dublin airport", "the airport", "airport"], lat: 53.4264, lng: -6.2499, rail: false },
  { id: "ucd", name: "UCD Belfield", aliases: ["ucd", "belfield", "university college dublin"], lat: 53.3065, lng: -6.2236, rail: false },
  { id: "trinity", name: "Trinity College", aliases: ["trinity college", "trinity", "tcd"], lat: 53.3438, lng: -6.2546, rail: true },
  { id: "dcu", name: "DCU Glasnevin", aliases: ["dcu", "dublin city university", "glasnevin"], lat: 53.3851, lng: -6.2569, rail: false },
  { id: "tud", name: "TU Dublin Grangegorman", aliases: ["tu dublin", "grangegorman", "dit"], lat: 53.3551, lng: -6.2789, rail: true },
  { id: "rathfarnham", name: "Rathfarnham", aliases: ["rathfarnham"], lat: 53.2996, lng: -6.2833, rail: false },
  { id: "clonskeagh", name: "Clonskeagh", aliases: ["clonskeagh"], lat: 53.3046, lng: -6.2405, rail: false },
  { id: "blackrock", name: "Blackrock", aliases: ["blackrock"], lat: 53.3015, lng: -6.1778, rail: true },
  { id: "dun-laoghaire", name: "Dún Laoghaire", aliases: ["dún laoghaire", "dun laoghaire"], lat: 53.2944, lng: -6.1339, rail: true },
  { id: "leopardstown", name: "Leopardstown", aliases: ["leopardstown"], lat: 53.2696, lng: -6.1993, rail: true },
  { id: "lucan", name: "Lucan", aliases: ["lucan"], lat: 53.3574, lng: -6.4489, rail: false },
  { id: "phibsborough", name: "Phibsborough", aliases: ["phibsborough", "phibsboro"], lat: 53.3606, lng: -6.2725, rail: true },
  { id: "drumcondra", name: "Drumcondra", aliases: ["drumcondra"], lat: 53.3700, lng: -6.2550, rail: true },
  { id: "parkwest", name: "Park West", aliases: ["park west", "parkwest"], lat: 53.3340, lng: -6.3800, rail: true },
];

// Every curated area is also a place someone might name ("school in Tallaght").
const AREA_PLACES: KnownPlace[] = AREAS.map((a) => ({
  id: `area-${a.id}`,
  name: a.name,
  aliases: [a.name.toLowerCase()],
  lat: a.lat,
  lng: a.lng,
  rail: a.rail,
}));

export const KNOWN_PLACES: KnownPlace[] = [...LANDMARKS, ...AREA_PLACES];

// Longest alias first, so "dublin airport" wins over "dublin".
const ALIAS_INDEX = KNOWN_PLACES.flatMap((p) => p.aliases.map((alias) => ({ alias, place: p }))).sort(
  (a, b) => b.alias.length - a.alias.length,
);

export function findKnownPlace(text: string): KnownPlace | undefined {
  const t = ` ${text.toLowerCase()} `;
  for (const { alias, place } of ALIAS_INDEX) {
    const re = new RegExp(`[^a-z]${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^a-z]`);
    if (re.test(t)) return place;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Everyday places near each area: schools, groceries, GPs, places of worship.
// Positions are approximate offsets for the demo; well-known landmarks use
// their real names, everything else a descriptive label.

type Seed = [PoiCategory, string, number, number]; // category, name, dLat, dLng

const NAMED_POIS: Poi[] = [
  { id: "icci", name: "Islamic Cultural Centre, Clonskeagh", category: "mosque", lat: 53.3046, lng: -6.2405 },
  { id: "dublin-mosque", name: "Dublin Mosque, South Circular Road", category: "mosque", lat: 53.3328, lng: -6.2789 },
  { id: "tuh", name: "Tallaght University Hospital", category: "hospital", lat: 53.2905, lng: -6.3785 },
  { id: "connolly-hosp", name: "Connolly Hospital Blanchardstown", category: "hospital", lat: 53.3895, lng: -6.3700 },
  { id: "naas-hosp", name: "Naas General Hospital", category: "hospital", lat: 53.2210, lng: -6.6580 },
  { id: "olol", name: "Our Lady of Lourdes Hospital", category: "hospital", lat: 53.7155, lng: -6.3420 },
  { id: "st-james-poi", name: "St James's Hospital", category: "hospital", lat: 53.3405, lng: -6.2946 },
  { id: "st-columcilles", name: "St Columcille's Hospital", category: "hospital", lat: 53.2350, lng: -6.1160 },
];

const AREA_SEEDS: Record<string, Seed[]> = {
  "dublin-8": [
    ["primary_school", "Primary school, Rialto", 0.002, 0.004],
    ["secondary_school", "Secondary school, Kilmainham", -0.004, -0.006],
    ["grocery", "Supermarket, Cork Street", 0.001, 0.008],
    ["gp", "GP practice, Rialto", -0.002, 0.002],
    ["church", "Parish church, Rialto", 0.003, -0.002],
    ["gym", "Gym, Dolphin's Barn", -0.003, 0.006],
    ["park", "Grand Canal & Royal Hospital grounds", 0.006, -0.008],
  ],
  dundrum: [
    ["primary_school", "Primary school, Dundrum", 0.003, -0.004],
    ["secondary_school", "Secondary school, Dundrum", -0.004, 0.005],
    ["grocery", "Dundrum Town Centre", -0.006, 0.001],
    ["gp", "GP practice, Dundrum", 0.002, 0.003],
    ["church", "Parish church, Dundrum", 0.001, -0.001],
    ["gym", "Gym, Dundrum", -0.005, 0.002],
    ["park", "Marlay Park", -0.017, -0.026],
  ],
  tallaght: [
    ["primary_school", "Primary school, Tallaght", 0.004, 0.006],
    ["secondary_school", "Secondary school, Tallaght", -0.005, -0.004],
    ["grocery", "The Square Tallaght", 0.000, 0.003],
    ["gp", "GP practice, Tallaght", 0.003, -0.002],
    ["mosque", "Mosque, Tallaght", 0.008, 0.012],
    ["church", "Parish church, Tallaght", 0.004, 0.010],
    ["gym", "Gym, Tallaght", -0.002, 0.005],
    ["park", "Sean Walsh Park", 0.006, -0.006],
  ],
  clondalkin: [
    ["primary_school", "Primary school, Clondalkin", 0.002, 0.003],
    ["secondary_school", "Secondary school, Clondalkin", -0.004, 0.005],
    ["grocery", "Supermarket, Clondalkin village", 0.001, -0.002],
    ["gp", "GP practice, Clondalkin", -0.002, -0.003],
    ["mosque", "Mosque, Clondalkin", 0.007, 0.008],
    ["church", "Parish church, Clondalkin", 0.000, 0.001],
    ["gym", "Gym, Clondalkin", 0.004, -0.004],
    ["park", "Corkagh Park", -0.012, -0.010],
  ],
  blanchardstown: [
    ["primary_school", "Primary school, Blanchardstown", 0.003, 0.004],
    ["secondary_school", "Secondary school, Blanchardstown", -0.004, -0.005],
    ["grocery", "Blanchardstown Centre", 0.005, -0.008],
    ["gp", "GP practice, Blanchardstown", -0.002, 0.003],
    ["mosque", "Mosque, Blanchardstown", 0.008, -0.014],
    ["church", "Parish church, Blanchardstown", -0.001, 0.002],
    ["gym", "Gym, Blanchardstown", 0.004, -0.006],
    ["park", "Tolka Valley Park", -0.006, 0.012],
  ],
  swords: [
    ["primary_school", "Primary school, Swords", 0.003, -0.004],
    ["secondary_school", "Secondary school, Swords", -0.004, 0.004],
    ["grocery", "Pavilions Shopping Centre", 0.000, 0.002],
    ["gp", "GP practice, Swords", 0.002, 0.001],
    ["mosque", "Mosque, Swords", -0.006, -0.006],
    ["church", "Parish church, Swords", 0.002, -0.001],
    ["gym", "Gym, Swords", -0.003, 0.006],
    ["park", "Swords Castle & Ward River Valley Park", 0.004, -0.008],
  ],
  bray: [
    ["primary_school", "Primary school, Bray", 0.003, -0.005],
    ["secondary_school", "Secondary school, Bray", -0.004, -0.006],
    ["grocery", "Supermarket, Main Street Bray", 0.000, -0.004],
    ["gp", "GP practice, Bray", 0.002, -0.002],
    ["mosque", "Mosque, Bray", 0.004, -0.008],
    ["church", "Parish church, Bray", -0.001, -0.003],
    ["gym", "Gym, Bray", 0.003, -0.001],
    ["park", "Bray seafront & Bray Head", -0.008, 0.004],
  ],
  greystones: [
    ["primary_school", "Primary school, Greystones", 0.003, -0.004],
    ["secondary_school", "Secondary school, Greystones", -0.003, -0.006],
    ["grocery", "Supermarket, Greystones", 0.001, -0.003],
    ["gp", "GP practice, Greystones", -0.001, -0.002],
    ["church", "Parish church, Greystones", 0.002, -0.001],
    ["gym", "Gym, Greystones", -0.004, -0.004],
    ["park", "Greystones South Beach", -0.005, 0.002],
  ],
  maynooth: [
    ["primary_school", "Primary school, Maynooth", 0.003, 0.004],
    ["secondary_school", "Secondary school, Maynooth", -0.003, -0.005],
    ["grocery", "Supermarket, Maynooth", 0.001, 0.002],
    ["gp", "GP practice, Maynooth", -0.002, 0.003],
    ["mosque", "Mosque, Maynooth", 0.004, -0.004],
    ["church", "Parish church, Maynooth", 0.000, -0.002],
    ["gym", "Gym, Maynooth University", -0.001, -0.007],
    ["park", "Carton Demesne", 0.008, 0.012],
  ],
  celbridge: [
    ["primary_school", "Primary school, Celbridge", 0.003, -0.003],
    ["secondary_school", "Secondary school, Celbridge", -0.004, 0.004],
    ["grocery", "Supermarket, Celbridge", 0.001, 0.001],
    ["gp", "GP practice, Celbridge", -0.002, -0.002],
    ["church", "Parish church, Celbridge", 0.002, 0.002],
    ["gym", "Gym, Celbridge", -0.003, -0.005],
    ["park", "Castletown House parklands", 0.005, 0.010],
  ],
  naas: [
    ["primary_school", "Primary school, Naas", 0.003, -0.004],
    ["secondary_school", "Secondary school, Naas", -0.004, 0.005],
    ["grocery", "Supermarket, Naas", 0.000, 0.002],
    ["gp", "GP practice, Naas", 0.002, 0.003],
    ["mosque", "Mosque, Naas", -0.005, -0.006],
    ["church", "Parish church, Naas", 0.001, -0.001],
    ["gym", "Gym, Naas", 0.004, 0.006],
    ["park", "Naas Canal Harbour", 0.003, -0.003],
  ],
  balbriggan: [
    ["primary_school", "Primary school, Balbriggan", 0.003, -0.004],
    ["secondary_school", "Secondary school, Balbriggan", -0.004, -0.003],
    ["grocery", "Supermarket, Balbriggan", 0.001, 0.001],
    ["gp", "GP practice, Balbriggan", -0.002, 0.002],
    ["mosque", "Mosque, Balbriggan", 0.005, -0.006],
    ["church", "Parish church, Balbriggan", 0.000, 0.002],
    ["gym", "Gym, Balbriggan", -0.003, -0.005],
    ["park", "Balbriggan beach", 0.002, 0.006],
  ],
  drogheda: [
    ["primary_school", "Primary school, Drogheda", 0.003, 0.004],
    ["secondary_school", "Secondary school, Drogheda", -0.004, -0.005],
    ["grocery", "Scotch Hall Shopping Centre", -0.001, 0.003],
    ["gp", "GP practice, Drogheda", 0.002, -0.002],
    ["mosque", "Mosque, Drogheda", 0.006, 0.006],
    ["church", "St Peter's Church, Drogheda", 0.001, 0.000],
    ["gym", "Gym, Drogheda", -0.003, 0.007],
    ["park", "Boyne riverside walk", -0.002, -0.006],
  ],
  navan: [
    ["primary_school", "Primary school, Navan", 0.003, -0.004],
    ["secondary_school", "Secondary school, Navan", -0.004, 0.004],
    ["grocery", "Navan Shopping Centre", 0.000, 0.002],
    ["gp", "GP practice, Navan", 0.002, 0.003],
    ["mosque", "Mosque, Navan", -0.006, -0.005],
    ["church", "Parish church, Navan", 0.001, -0.001],
    ["gym", "Gym, Navan", 0.004, 0.006],
    ["park", "Blackwater Park", 0.006, -0.004],
  ],
};

export const POIS: Poi[] = [
  ...NAMED_POIS,
  ...AREAS.flatMap((area) =>
    (AREA_SEEDS[area.id] ?? []).map(([category, name, dLat, dLng], i) => ({
      id: `${area.id}-${category}-${i}`,
      name,
      category,
      lat: area.lat + dLat,
      lng: area.lng + dLng,
    })),
  ),
];

export const POI_LABEL: Record<PoiCategory, string> = {
  mosque: "Mosque",
  church: "Church",
  primary_school: "Primary school",
  secondary_school: "Secondary school",
  grocery: "Groceries",
  gp: "GP",
  hospital: "Hospital",
  gym: "Gym",
  park: "Park",
  station: "Station",
};
