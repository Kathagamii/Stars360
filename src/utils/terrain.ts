/**
 * Procedural horizon silhouette (mountains + treeline), seeded by the observer's
 * lat/lon so the same location always renders the same skyline. This is a
 * stylized approximation driven by climate-band heuristics (latitude), not a
 * real elevation/land-cover dataset — no such data source is wired up (see
 * GeoLocation.elevation, which is currently always 0).
 */

export type Biome = "polar" | "taiga" | "temperate" | "desert" | "jungle";

export interface TreeSpike {
  az0: number; // degrees
  az1: number; // degrees
  height: number; // degrees above horizon
}

export interface TerrainConfig {
  biome: Biome;
  /** Altitude (degrees) of the ridgeline at a given azimuth (degrees). */
  mountainHeight: (azDeg: number) => number;
  trees: TreeSpike[];
  hueDelta: number;
  satDelta: number;
}

function seedFromLatLon(lat: number, lon: number): number {
  const a = Math.round((lat + 90) * 100);
  const b = Math.round((lon + 180) * 100);
  let h = 2166136261;
  h = Math.imul(h ^ a, 16777619);
  h = Math.imul(h ^ b, 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function classifyBiome(lat: number, rng: () => number): Biome {
  const abs = Math.abs(lat);
  if (abs >= 66) return "polar";
  if (abs >= 55) return "taiga";
  if (abs >= 35) return "temperate";
  if (abs >= 15) return rng() < 0.55 ? "desert" : "temperate";
  return "jungle";
}

interface OctaveSpec {
  freqMin: number;
  freqMax: number;
  amp: number;
}

/** Sum of ridged-sine octaves with integer frequencies, so the profile tiles seamlessly over 360°. */
function makeRidgedProfile(rng: () => number, specs: OctaveSpec[]) {
  const octaves = specs.map((s) => ({
    freq: s.freqMin + Math.floor(rng() * (s.freqMax - s.freqMin + 1)),
    phase: rng() * Math.PI * 2,
    amp: s.amp,
  }));
  return (azDeg: number) => {
    const x = (azDeg * Math.PI) / 180;
    let h = 0;
    for (const o of octaves) {
      const ridge = 1 - Math.abs(Math.sin(x * o.freq + o.phase));
      h += ridge * ridge * o.amp;
    }
    return h;
  };
}

interface BiomeParams {
  base: number;
  scale: number;
  treeDensity: number;
  treeMin: number;
  treeMax: number;
  hueDelta: number;
  satDelta: number;
}

const BIOME_PARAMS: Record<Biome, BiomeParams> = {
  polar: { base: 1.0, scale: 3.2, treeDensity: 0, treeMin: 0, treeMax: 0, hueDelta: 0.02, satDelta: 0.04 },
  taiga: { base: 1.6, scale: 11, treeDensity: 0.72, treeMin: 2.2, treeMax: 4.6, hueDelta: -0.06, satDelta: 0.12 },
  temperate: { base: 1.2, scale: 7.5, treeDensity: 0.48, treeMin: 1.4, treeMax: 3.2, hueDelta: -0.04, satDelta: 0.1 },
  desert: { base: 0.7, scale: 5, treeDensity: 0.05, treeMin: 1.0, treeMax: 1.7, hueDelta: 0.07, satDelta: 0.16 },
  jungle: { base: 2.2, scale: 4.8, treeDensity: 0.92, treeMin: 1.8, treeMax: 3.6, hueDelta: -0.08, satDelta: 0.14 },
};

const TEETH_COUNT = 260;

export function buildTerrainConfig(lat: number, lon: number): TerrainConfig {
  const rng = mulberry32(seedFromLatLon(lat, lon));
  const biome = classifyBiome(lat, rng);
  const p = BIOME_PARAMS[biome];
  const ruggedness = 0.75 + rng() * 0.6;

  const ridged = makeRidgedProfile(rng, [
    { freqMin: 2, freqMax: 4, amp: 1.0 },
    { freqMin: 5, freqMax: 9, amp: 0.5 },
    { freqMin: 10, freqMax: 17, amp: 0.28 },
    { freqMin: 20, freqMax: 30, amp: 0.14 },
  ]);
  const mountainHeight = (az: number) => p.base + ridged(az) * p.scale * ruggedness;

  const trees: TreeSpike[] = [];
  const step = 360 / TEETH_COUNT;
  for (let i = 0; i < TEETH_COUNT; i++) {
    if (rng() < p.treeDensity) {
      const az0 = i * step;
      const az1 = az0 + step * (0.55 + rng() * 0.35);
      const height = p.treeMin + rng() * (p.treeMax - p.treeMin);
      trees.push({ az0, az1, height });
    }
  }

  return { biome, mountainHeight, trees, hueDelta: p.hueDelta, satDelta: p.satDelta };
}
