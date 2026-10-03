import { getArea } from "./areas";
import imported from "./imported-listings.json";
import type { Property } from "./types";

// Small curated sample of listings for the demo. Not live marketplace data.
type Row = [
  areaId: string,
  title: string,
  address: string,
  type: Property["type"],
  beds: Property["beds"],
  baths: number,
  rent: number,
  ber: string,
  walkToStopMin: number,
  stopName: string,
  dLat: number,
  dLng: number,
  features: string[],
];

const ROWS: Row[] = [
  ["dublin-8", "Bright 1-bed by the canal", "Dolphin's Barn, Dublin 8", "Apartment", 1, 1, 1850, "B2", 6, "Rialto Luas", 0.0005, 0.003, ["Balcony", "Bike storage"]],
  ["dublin-8", "2-bed apartment near Fatima Luas", "Herberton, Rialto, Dublin 8", "Apartment", 2, 1, 2500, "B1", 4, "Fatima Luas", 0.002, 0.006, ["Lift", "Concierge"]],
  ["dublin-8", "Red-brick terrace in Kilmainham", "Old Kilmainham, Dublin 8", "House", 3, 2, 2850, "C1", 7, "Suir Road Luas", 0.004, -0.004, ["Garden", "Period features"]],

  ["dundrum", "1-bed beside Balally Luas", "Wyckham Point, Dundrum", "Apartment", 1, 1, 2100, "A3", 3, "Balally Luas", -0.004, 0.004, ["Gym on site", "Parking"]],
  ["dundrum", "2-bed with balcony", "Ballinteer Road, Dundrum", "Apartment", 2, 2, 2550, "B2", 6, "Dundrum Luas", -0.002, -0.003, ["Balcony", "Parking"]],
  ["dundrum", "Family semi-d near Marlay", "Ballinteer, Dublin 16", "House", 3, 2, 3200, "C2", 12, "Ballinteer bus stop", -0.010, -0.015, ["Garden", "Driveway"]],

  ["tallaght", "1-bed in Tallaght centre", "Belgard Square, Tallaght", "Apartment", 1, 1, 1700, "B1", 4, "Tallaght Luas", 0.002, 0.004, ["Lift", "Close to The Square"]],
  ["tallaght", "2-bed near the Luas", "Cookstown Way, Tallaght", "Apartment", 2, 2, 2050, "A2", 5, "Cookstown Luas", 0.006, 0.010, ["Balcony", "Parking"]],
  ["tallaght", "3-bed semi with garden", "Old Bawn, Tallaght", "House", 3, 1, 2400, "C3", 9, "Old Bawn bus stop", -0.008, -0.002, ["Garden", "Driveway"]],
  ["tallaght", "4-bed family home", "Firhouse Road, Tallaght", "House", 4, 2, 2950, "C1", 8, "Firhouse bus stop", -0.004, 0.018, ["Garden", "Utility room"]],

  ["clondalkin", "1-bed by Clondalkin village", "Monastery Road, Clondalkin", "Apartment", 1, 1, 1650, "B3", 7, "Clondalkin village bus stop", 0.001, 0.002, ["Parking"]],
  ["clondalkin", "2-bed near Fonthill station", "Fonthill, Clondalkin", "Apartment", 2, 2, 2000, "A2", 5, "Clondalkin-Fonthill station", 0.010, 0.008, ["Balcony", "Lift"]],
  ["clondalkin", "3-bed terrace", "Bawnogue, Clondalkin", "House", 3, 1, 2350, "C2", 6, "Bawnogue bus stop", -0.006, -0.006, ["Garden"]],

  ["blanchardstown", "1-bed near Coolmine station", "Coolmine, Dublin 15", "Apartment", 1, 1, 1700, "B2", 5, "Coolmine station", 0.002, -0.008, ["Parking"]],
  ["blanchardstown", "2-bed apartment, Castleknock side", "Hartstown, Dublin 15", "Apartment", 2, 2, 2200, "A3", 8, "Castleknock station", -0.004, 0.006, ["Balcony", "Lift", "Parking"]],
  ["blanchardstown", "3-bed semi-detached", "Laurel Lodge, Dublin 15", "House", 3, 2, 2500, "C1", 10, "Laurel Lodge bus stop", -0.006, 0.010, ["Garden", "Driveway"]],

  ["swords", "1-bed in Swords town", "Main Street, Swords", "Apartment", 1, 1, 1700, "B2", 3, "Swords Main Street (Swords Express)", 0.001, 0.001, ["Close to Pavilions"]],
  ["swords", "2-bed with parking", "Holywell, Swords", "Apartment", 2, 2, 2050, "A2", 6, "Holywell bus stop", -0.010, -0.010, ["Parking", "Balcony"]],
  ["swords", "3-bed family semi", "River Valley, Swords", "House", 3, 2, 2550, "C2", 9, "River Valley bus stop", 0.004, -0.012, ["Garden", "Driveway"]],

  ["bray", "1-bed near Bray DART", "Quinsboro Road, Bray", "Apartment", 1, 1, 1650, "C1", 4, "Bray Daly DART", 0.000, 0.002, ["Sea views"]],
  ["bray", "2-bed by the seafront", "Strand Road, Bray", "Apartment", 2, 1, 2150, "B3", 7, "Bray Daly DART", -0.003, 0.005, ["Sea views", "Balcony"]],
  ["bray", "3-bed terrace", "Vevay Road, Bray", "House", 3, 2, 2400, "C2", 11, "Bray Daly DART", -0.006, -0.008, ["Garden"]],

  ["greystones", "2-bed near the harbour", "Marine Road, Greystones", "Apartment", 2, 2, 2300, "A2", 5, "Greystones DART", 0.000, 0.002, ["Sea views", "Parking"]],
  ["greystones", "3-bed semi in Charlesland", "Charlesland, Greystones", "House", 3, 2, 2600, "B2", 14, "Charlesland bus stop", -0.010, -0.008, ["Garden", "Driveway"]],

  ["maynooth", "1-bed near the university", "Parson Street, Maynooth", "Apartment", 1, 1, 1500, "B3", 5, "Maynooth station", 0.000, -0.003, ["Bike storage"]],
  ["maynooth", "2-bed townhouse", "Moyglare Road, Maynooth", "House", 2, 2, 1850, "B2", 9, "Maynooth station", 0.005, -0.002, ["Garden", "Parking"]],
  ["maynooth", "3-bed semi near the canal", "Straffan Road, Maynooth", "House", 3, 2, 2200, "C1", 7, "Maynooth station", -0.006, 0.003, ["Garden", "Driveway"]],

  ["celbridge", "2-bed apartment", "Main Street, Celbridge", "Apartment", 2, 1, 1900, "B3", 15, "Hazelhatch & Celbridge station (bus link)", 0.001, 0.002, ["Parking"]],
  ["celbridge", "3-bed semi by the Liffey", "Oldtown, Celbridge", "House", 3, 2, 2300, "C1", 18, "Hazelhatch & Celbridge station (bus link)", -0.004, -0.005, ["Garden", "Driveway"]],

  ["naas", "1-bed in Naas town", "Main Street, Naas", "Apartment", 1, 1, 1450, "C1", 6, "Naas town bus stop", 0.000, 0.001, ["Close to shops"]],
  ["naas", "2-bed near the canal harbour", "Sallins Road, Naas", "Apartment", 2, 2, 1800, "A3", 10, "Sallins & Naas station (shuttle)", 0.006, 0.008, ["Balcony", "Parking"]],
  ["naas", "3-bed semi-detached", "Ballymore Road, Naas", "House", 3, 2, 2050, "B3", 8, "Naas town bus stop", -0.006, -0.004, ["Garden", "Driveway"]],
  ["naas", "4-bed detached with garden", "Craddockstown, Naas", "House", 4, 3, 2400, "B2", 12, "Naas town bus stop", -0.010, 0.012, ["Large garden", "Driveway", "Home office"]],

  ["balbriggan", "2-bed near the station", "Drogheda Street, Balbriggan", "Apartment", 2, 1, 1650, "C1", 4, "Balbriggan station", 0.001, 0.003, ["Close to beach"]],
  ["balbriggan", "3-bed semi", "Hampton Gardens, Balbriggan", "House", 3, 2, 1950, "B3", 10, "Balbriggan station", -0.005, -0.006, ["Garden", "Driveway"]],
  ["balbriggan", "4-bed family home", "Castlemill, Balbriggan", "House", 4, 2, 2250, "B2", 13, "Balbriggan station", -0.008, -0.010, ["Garden", "Driveway"]],

  ["drogheda", "1-bed by the Boyne", "Mayoralty Street, Drogheda", "Apartment", 1, 1, 1300, "C2", 9, "Drogheda MacBride station", 0.000, 0.002, ["River views"]],
  ["drogheda", "2-bed apartment", "Dublin Road, Drogheda", "Apartment", 2, 2, 1600, "B2", 5, "Drogheda MacBride station", -0.004, 0.010, ["Parking", "Lift"]],
  ["drogheda", "3-bed semi with garden", "Rathmullen, Drogheda", "House", 3, 2, 1900, "C1", 12, "Rathmullen bus stop", 0.004, -0.010, ["Garden", "Driveway"]],

  ["navan", "2-bed townhouse", "Trimgate Street, Navan", "House", 2, 1, 1550, "C1", 6, "Navan town coach stop", 0.001, 0.001, ["Close to shops"]],
  ["navan", "3-bed semi", "Johnstown, Navan", "House", 3, 2, 1850, "B3", 9, "Johnstown coach stop", -0.012, 0.010, ["Garden", "Driveway"]],
  ["navan", "4-bed detached", "Athlumney, Navan", "House", 4, 3, 2150, "B2", 11, "Navan town coach stop", -0.006, 0.008, ["Large garden", "Driveway"]],
];

// Mock locations: each listing keeps the direction of its hand-picked offset
// but sits at least ~450 m from the area centre and ~350 m from the other
// homes in the area, so every home gets its own pin on the map. Deterministic,
// so a home is always in the same spot.
const KM_PER_LAT = 111.32;
function spread(rows: Row[]): [number, number][] {
  const placed = new Map<string, [number, number][]>();
  return rows.map(([areaId, , , , , , , , , , dLat, dLng], i) => {
    const area = getArea(areaId)!;
    const kmLng = KM_PER_LAT * Math.cos((area.lat * Math.PI) / 180);
    let y = dLat * KM_PER_LAT;
    let x = dLng * kmLng;
    let dist = Math.hypot(x, y);
    let angle = dist > 0.01 ? Math.atan2(y, x) : (i * 2.39996) % (2 * Math.PI);
    dist = Math.max(dist, 0.45);
    const others = placed.get(areaId) ?? [];
    for (let tries = 0; tries < 12; tries++) {
      x = Math.cos(angle) * dist;
      y = Math.sin(angle) * dist;
      if (others.every(([ox, oy]) => Math.hypot(ox - x, oy - y) >= 0.35)) break;
      angle += 0.7;
      if (tries % 4 === 3) dist += 0.2;
    }
    others.push([x, y]);
    placed.set(areaId, others);
    return [area.lat + y / KM_PER_LAT, area.lng + x / kmLng];
  });
}
const SPOTS = spread(ROWS);

const SAMPLE: Property[] = ROWS.map((r, i) => {
  const [areaId, title, address, type, beds, baths, rent, ber, walkToStopMin, stopName, , , features] = r;
  const [lat, lng] = SPOTS[i];
  return {
    id: `${areaId}-${i + 1}`,
    areaId,
    title,
    address,
    type,
    beds,
    baths,
    rent,
    ber,
    walkToStopMin,
    stopName,
    lat: Number(lat.toFixed(5)),
    lng: Number(lng.toFixed(5)),
    features,
  };
});

// Real listings added with `npm run import:listings` (see docs/API_SETUP.md).
// They sit alongside the hand-made sample and show their source and a link.
export const PROPERTIES: Property[] = [...(imported as Property[]), ...SAMPLE];

export function getProperty(id: string): Property | undefined {
  return PROPERTIES.find((p) => p.id === id);
}

export function propertiesInArea(areaId: string): Property[] {
  return PROPERTIES.filter((p) => p.areaId === areaId);
}
