export interface GeoLocation {
  lat: number;
  lon: number;
  elevation: number; // meters above sea level
  label: string; // human readable place name
}

export type ViewMode = "sky" | "constellations" | "objects" | "satellites";

export type TimeSpeed = 1 | 10 | 100 | 1000;

export interface AppTimeState {
  live: boolean;
  /** The simulated instant currently shown, in epoch ms. */
  current: number;
  speed: TimeSpeed;
}

export interface StarRecord {
  hip: number;
  ra: number; // degrees, J2000
  dec: number; // degrees, J2000
  mag: number;
  bv: number | null;
  name: string | null;
  bayer: string | null;
  flam: string | null;
  con: string | null;
  hd: string | null;
  distanceLy: number | null;
  spect: string | null;
}

export interface ConstellationRecord {
  id: string; // 3-letter IAU abbreviation
  en: string;
  ru: string;
  la: string;
  gen: string;
  center: { ra: number; dec: number };
  lines: [number, number][][]; // segments of [ra, dec] degree points
}

export interface DeepSkyRecord {
  id: string;
  name: string;
  altName: string | null;
  desig: string | null;
  type: string;
  mag: number;
  dim: string | null;
  ra: number;
  dec: number;
}

export type CelestialKind =
  | "star"
  | "planet"
  | "sun"
  | "moon"
  | "deepsky"
  | "constellation"
  | "satellite";

/** A curated artificial Earth satellite: real orbital elements (TLE), refreshed via scripts/data:fetch + data:build. */
export interface SatelliteRecord {
  key: string; // stable id, joins to SATELLITE_FACTS
  noradId: string;
  name: string; // catalog name from the TLE
  line1: string;
  line2: string;
  epoch: string; // ISO date the orbital elements were captured
}

/** A satellite's current live alt/az, reported up from the 3D scene for the off-screen bearing indicators. */
export interface SatelliteBearing {
  key: string;
  name: string;
  azimuth: number;
  altitude: number;
}

export interface HorizontalPosition {
  altitude: number; // degrees, 0 = horizon, 90 = zenith
  azimuth: number; // degrees, 0 = N, 90 = E, 180 = S, 270 = W
  visible: boolean; // above horizon
}

export interface SelectedObject {
  kind: CelestialKind;
  id: string; // stable identifier, e.g. "hip-32349", "planet-Mars"
}

export const DEEPSKY_TYPE_LABELS: Record<string, string> = {
  gg: "Шаровое скопление",
  gc: "Шаровое скопление",
  oc: "Рассеянное скопление",
  bn: "Диффузная туманность",
  dn: "Тёмная туманность",
  pn: "Планетарная туманность",
  snr: "Остаток сверхновой",
  sfr: "Область звёздообразования",
  rn: "Отражательная туманность",
  gx: "Галактика",
  dbl: "Двойная звезда",
  ast: "Астеризм",
  other: "Объект глубокого космоса",
};
