// Mock pictures for homes and areas, drawn as SVG so the demo needs no
// image files, no network and no API key. Each picture is seeded by the
// listing or area id, so it's always the same for the same home.
import type { Area, Property } from "@/lib/data/types";

function rng(seedText: string) {
  let a = [...seedText].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761), 1779033703) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)];

const SKIES = [
  ["#bfe0f5", "#eaf5fb"],
  ["#f6d8b8", "#fbeee0"],
  ["#d5dde4", "#eef1f3"],
  ["#c9e4ef", "#f4f8f2"],
];
const DOORS = ["#c0392b", "#1f4e8c", "#e2b33c", "#1e7a55", "#6b2d5c", "#222"];
const BRICK = ["#a8553f", "#b8664a", "#8f4a3a"];
const RENDER = ["#efe7da", "#e6e1d6", "#f3efe6", "#dfe6e2", "#efe3cf"];
const CLADDING = ["#d9d4cb", "#c9ced2", "#e8e2d6", "#b9c4c2"];

function Tree({ x, y, s = 1, tone = "#5f9a62" }: { x: number; y: number; s?: number; tone?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-3} y={-6} width={6} height={30} fill="#7a5a3c" />
      <circle cx={0} cy={-22} r={20} fill={tone} />
      <circle cx={-12} cy={-12} r={13} fill={tone} opacity={0.9} />
      <circle cx={12} cy={-14} r={14} fill={tone} opacity={0.85} />
    </g>
  );
}

function Window({ x, y, w, h, frame = "#fff" }: { x: number; y: number; w: number; h: number; frame?: string }) {
  return (
    <g>
      <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} fill={frame} />
      <rect x={x} y={y} width={w} height={h} fill="#7fa6bf" />
      <rect x={x} y={y} width={w} height={h * 0.45} fill="#a9c8da" />
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={frame} strokeWidth={2} />
    </g>
  );
}

function Apartment({ r }: { r: () => number }) {
  const floors = 4 + Math.floor(r() * 3);
  const cols = 4 + Math.floor(r() * 2);
  const wall = pick(r, CLADDING);
  const accent = pick(r, ["#6d7f8a", "#a8553f", "#4f6b5f", "#8a7a63"]);
  const w = 240;
  const x0 = 120;
  const fh = 32;
  const top = 250 - floors * fh;
  const balconies = r() > 0.35;
  return (
    <g>
      <rect x={x0} y={top} width={w} height={floors * fh} fill={wall} />
      <rect x={x0 + w * 0.62} y={top} width={w * 0.38} height={floors * fh} fill={accent} opacity={0.85} />
      <rect x={x0 - 4} y={top - 8} width={w + 8} height={8} fill="#55606a" />
      {Array.from({ length: floors }, (_, f) =>
        Array.from({ length: cols }, (_, c) => {
          const wx = x0 + 14 + c * ((w - 28) / cols);
          const wy = top + 7 + f * fh;
          return (
            <g key={`${f}-${c}`}>
              <Window x={wx} y={wy} w={(w - 28) / cols - 14} h={18} frame="#f4f4f4" />
              {balconies && f < floors - 1 && c % 2 === 0 && (
                <rect x={wx - 4} y={wy + 18} width={(w - 28) / cols - 6} height={6} fill="#3d4a52" opacity={0.75} />
              )}
            </g>
          );
        }),
      )}
      <rect x={x0 + w / 2 - 16} y={226} width={32} height={24} fill="#3d4a52" />
      <rect x={x0 + w / 2 - 12} y={230} width={24} height={20} fill="#9fbfd0" />
    </g>
  );
}

function House({ r, beds, terrace }: { r: () => number; beds: number; terrace: boolean }) {
  const brick = terrace || r() > 0.6;
  const wall = brick ? pick(r, BRICK) : pick(r, RENDER);
  const roof = pick(r, ["#4b4f55", "#5b4a42", "#3f464d"]);
  const door = pick(r, DOORS);
  const units = terrace ? 3 : 2;
  const uw = terrace ? 96 : 120;
  const x0 = 240 - (units * uw) / 2;
  const top = 150;
  return (
    <g>
      {Array.from({ length: units }, (_, i) => {
        const x = x0 + i * uw;
        const me = i === Math.floor(units / 2) || (!terrace && i === 0);
        const w = me ? wall : brick ? pick(r, BRICK) : pick(r, RENDER);
        return (
          <g key={i} opacity={me ? 1 : 0.88}>
            <rect x={x} y={top} width={uw} height={100} fill={w} />
            {brick && Array.from({ length: 9 }, (_, k) => <line key={k} x1={x} y1={top + 10 + k * 10} x2={x + uw} y2={top + 10 + k * 10} stroke="#000" strokeOpacity={0.06} />)}
            <Window x={x + 12} y={top + 16} w={28} h={28} />
            {beds >= 3 || !me ? <Window x={x + uw - 40} y={top + 16} w={28} h={28} /> : null}
            <Window x={x + 12} y={top + 60} w={28} h={30} />
            <rect x={x + uw - 38} y={top + 52} width={26} height={48} fill={me ? door : pick(r, DOORS)} />
            <path d={`M${x + uw - 38} ${top + 52} a13 10 0 0 1 26 0`} fill="#d8e6ee" />
            <circle cx={x + uw - 17} cy={top + 78} r={1.8} fill="#e8c86a" />
          </g>
        );
      })}
      <path d={`M${x0 - 8} ${top} L${x0 + 30} ${top - 52} L${x0 + units * uw - 30} ${top - 52} L${x0 + units * uw + 8} ${top} Z`} fill={roof} />
      {Array.from({ length: units }, (_, i) => (
        <rect key={i} x={x0 + i * uw + uw - 30} y={top - 70} width={14} height={26} fill={wall} />
      ))}
    </g>
  );
}

function Duplex({ r }: { r: () => number }) {
  const wall = pick(r, RENDER);
  const timber = pick(r, ["#b98a5e", "#9a7352", "#c69c6d"]);
  const door = pick(r, DOORS);
  return (
    <g>
      <rect x={130} y={130} width={220} height={120} fill={wall} />
      <rect x={250} y={130} width={100} height={120} fill={timber} />
      {Array.from({ length: 8 }, (_, k) => <line key={k} x1={250 + k * 12.5} y1={130} x2={250 + k * 12.5} y2={250} stroke="#000" strokeOpacity={0.12} />)}
      <rect x={124} y={122} width={232} height={10} fill="#4b4f55" />
      <Window x={146} y={146} w={70} h={36} />
      <Window x={268} y={146} w={64} h={36} />
      <Window x={146} y={200} w={44} h={36} />
      <rect x={206} y={196} width={28} height={54} fill={door} />
      <rect x={290} y={200} width={34} height={50} fill="#6d8796" opacity={0.85} />
    </g>
  );
}

export function HouseArt({ property }: { property: Property }) {
  const r = rng(property.id);
  const [sky, haze] = pick(r, SKIES);
  const grass = pick(r, ["#8fbf7a", "#9cc58a", "#86b37a"]);
  const terrace = property.type === "House" && /terrace|period|red-brick|cottage/i.test(property.title + property.features.join(" "));
  const id = `sky-${property.id}`;
  return (
    <svg viewBox="0 0 480 300" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" role="img" aria-label={`Illustration of ${property.title}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky} />
          <stop offset="1" stopColor={haze} />
        </linearGradient>
      </defs>
      <rect width={480} height={300} fill={`url(#${id})`} />
      <circle cx={60 + r() * 360} cy={50} r={22} fill="#fff" opacity={0.5} />
      <ellipse cx={100 + r() * 280} cy={70} rx={46} ry={12} fill="#fff" opacity={0.65} />
      <rect y={240} width={480} height={60} fill={grass} />
      <rect y={262} width={480} height={38} fill="#b9b6ad" />
      <rect y={262} width={480} height={4} fill="#d9d5cb" />
      {property.type === "Apartment" ? <Apartment r={r} /> : property.type === "Duplex" ? <Duplex r={r} /> : <House r={r} beds={property.beds} terrace={terrace} />}
      <Tree x={50 + r() * 30} y={250} s={0.9 + r() * 0.4} />
      <Tree x={410 + r() * 30} y={252} s={0.8 + r() * 0.4} tone="#4f8a58" />
      {property.features.some((f) => /garden/i.test(f)) && (
        <g>
          <rect x={60} y={244} width={360} height={6} fill="#6f9a5f" />
          <circle cx={100} cy={244} r={8} fill="#6a9a55" />
          <circle cx={380} cy={244} r={9} fill="#6a9a55" />
        </g>
      )}
    </svg>
  );
}

type Scene = "city" | "coast" | "suburb" | "town";
const SCENE: Record<string, Scene> = {
  "dublin-8": "city",
  bray: "coast",
  greystones: "coast",
  balbriggan: "coast",
  drogheda: "town",
  navan: "town",
  naas: "town",
  maynooth: "town",
  celbridge: "town",
};

// Wide banner for an area: city terraces, the coast, a suburb or a county town.
export function AreaArt({ area, height = 180 }: { area: Area; height?: number }) {
  const r = rng(area.id);
  const scene = SCENE[area.id] ?? "suburb";
  const [sky, haze] = pick(r, SKIES);
  const id = `asky-${area.id}`;
  return (
    <svg viewBox="0 0 800 240" preserveAspectRatio="xMidYMid slice" width="100%" height={height} role="img" aria-label={`Illustration of ${area.name}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky} />
          <stop offset="1" stopColor={haze} />
        </linearGradient>
      </defs>
      <rect width={800} height={240} fill={`url(#${id})`} />
      <circle cx={620} cy={56} r={26} fill="#fff" opacity={0.55} />
      {/* Distant hills: Dublin and Wicklow mountains on the skyline. */}
      <path d="M0 150 Q120 90 240 130 T480 120 T800 110 V240 H0 Z" fill="#a9c3a4" opacity={0.6} />
      {scene === "coast" && (
        <g>
          <path d="M520 150 Q600 70 690 140 L800 140 V240 H520 Z" fill="#7da47a" />
          <rect x={0} y={170} width={800} height={70} fill="#5c93b8" />
          {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M${i * 90 + 10} ${190 + (i % 3) * 12} q15 -6 30 0`} stroke="#d6e8f2" strokeWidth={2} fill="none" />)}
          <path d="M0 200 L380 168 L800 176 V240 H0 Z" fill="#e3d3ae" />
          {Array.from({ length: 9 }, (_, i) => (
            <rect key={i} x={200 + i * 44} y={138 - (i % 3) * 6} width={38} height={44 + (i % 3) * 6} fill={pick(r, [...RENDER, "#cfe0e8", "#f1d9c9"])} />
          ))}
        </g>
      )}
      {scene === "city" && (
        <g>
          {Array.from({ length: 14 }, (_, i) => {
            const h = 60 + r() * 70;
            return <rect key={i} x={i * 58} y={200 - h} width={52} height={h} fill={pick(r, [...BRICK, "#c9ced2", "#8d9aa3"])} />;
          })}
          {Array.from({ length: 14 }, (_, i) => (
            <g key={i}>
              {Array.from({ length: 3 }, (_, k) => <rect key={k} x={i * 58 + 10 + k * 13} y={150} width={8} height={12} fill="#f3e6b8" opacity={0.75} />)}
            </g>
          ))}
          <rect x={0} y={200} width={800} height={14} fill="#6c8aa0" />
          <rect x={0} y={214} width={800} height={26} fill="#a7a49b" />
          <path d="M120 214 h560" stroke="#4d8a76" strokeWidth={3} strokeDasharray="20 10" />
        </g>
      )}
      {(scene === "suburb" || scene === "town") && (
        <g>
          <rect x={0} y={190} width={800} height={50} fill="#8fbf7a" />
          {scene === "town" && (
            <g>
              <path d="M0 180 Q200 160 400 182 T800 176 V200 H0 Z" fill="#b6cf8f" />
              <rect x={540} y={92} width={26} height={98} fill="#9b9a92" />
              <path d="M536 92 L553 40 L570 92 Z" fill="#6f6d66" />
            </g>
          )}
          {Array.from({ length: 11 }, (_, i) => {
            const x = 20 + i * 72;
            const wall = pick(r, scene === "town" ? [...RENDER, ...BRICK] : RENDER);
            return (
              <g key={i}>
                <rect x={x} y={150} width={56} height={44} fill={wall} />
                <path d={`M${x - 4} 150 L${x + 28} 124 L${x + 60} 150 Z`} fill={pick(r, ["#4b4f55", "#5b4a42"])} />
                <rect x={x + 22} y={170} width={12} height={24} fill={pick(r, DOORS)} />
                <rect x={x + 6} y={160} width={11} height={11} fill="#8fb2c6" />
                <rect x={x + 39} y={160} width={11} height={11} fill="#8fb2c6" />
              </g>
            );
          })}
          {Array.from({ length: 6 }, (_, i) => <Tree key={i} x={60 + i * 140 + r() * 40} y={206} s={0.7 + r() * 0.3} />)}
          <rect x={0} y={214} width={800} height={26} fill="#b4b0a6" />
        </g>
      )}
    </svg>
  );
}
