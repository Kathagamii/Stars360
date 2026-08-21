import * as Astronomy from "astronomy-engine";
import type { GeoLocation, HorizontalPosition } from "../types";

export type { RotationMatrix, Vector } from "astronomy-engine";

/** Bodies from astronomy-engine we render individually (not from the star catalog). */
export const PLANET_BODIES = [
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
] as const;
export type PlanetName = (typeof PLANET_BODIES)[number];

export function makeObserver(loc: GeoLocation): Astronomy.Observer {
  return new Astronomy.Observer(loc.lat, loc.lon, loc.elevation);
}

/** Unit vector (EQJ / J2000 mean equator frame) for a catalog RA(deg)/Dec(deg). */
export function eqjVectorFromCatalog(raDeg: number, decDeg: number): Astronomy.Vector {
  return Astronomy.VectorFromSphere(new Astronomy.Spherical(decDeg, raDeg, 1), new Date());
}

/** Rotation matrix taking EQJ (J2000) vectors to local horizontal (N/E/Up-ish) vectors. */
export function horizonRotation(date: Date, observer: Astronomy.Observer): Astronomy.RotationMatrix {
  return Astronomy.Rotation_EQJ_HOR(date, observer);
}

/** Apply a horizon rotation to an EQJ vector and return altitude/azimuth. */
export function horizontalFromEqjVector(
  vec: Astronomy.Vector,
  rot: Astronomy.RotationMatrix
): HorizontalPosition {
  const horVec = Astronomy.RotateVector(rot, vec);
  const sph = Astronomy.HorizonFromVector(horVec, "normal");
  return { altitude: sph.lat, azimuth: sph.lon, visible: sph.lat > 0 };
}

export interface BodyPosition extends HorizontalPosition {
  ra: number; // degrees, of-date apparent
  dec: number; // degrees, of-date apparent
  distanceAU: number;
}

export function getBodyPosition(
  body: Astronomy.Body,
  date: Date,
  observer: Astronomy.Observer
): BodyPosition {
  const equ = Astronomy.Equator(body, date, observer, true, true);
  const hor = Astronomy.Horizon(date, observer, equ.ra, equ.dec, "normal");
  return {
    altitude: hor.altitude,
    azimuth: hor.azimuth,
    visible: hor.altitude > 0,
    ra: equ.ra * 15,
    dec: equ.dec,
    distanceAU: equ.dist,
  };
}

export interface MoonInfo {
  phaseFraction: number; // 0..1 illuminated fraction
  phaseAngleDeg: number; // 0..360, 0 = new, 180 = full
  ageDescription: string;
}

const MOON_PHASE_NAMES: [number, string][] = [
  [22.5, "Новолуние"],
  [67.5, "Растущий серп"],
  [112.5, "Первая четверть"],
  [157.5, "Растущая Луна"],
  [202.5, "Полнолуние"],
  [247.5, "Убывающая Луна"],
  [292.5, "Последняя четверть"],
  [337.5, "Убывающий серп"],
  [360.1, "Новолуние"],
];

export function getMoonInfo(date: Date): MoonInfo {
  const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);
  const phaseAngleDeg = Astronomy.MoonPhase(date);
  const name = MOON_PHASE_NAMES.find(([max]) => phaseAngleDeg < max)?.[1] ?? "Новолуние";
  return {
    phaseFraction: illum.phase_fraction,
    phaseAngleDeg,
    ageDescription: name,
  };
}

export function siderealTimeHours(date: Date): number {
  return Astronomy.SiderealTime(date);
}

export const AU_IN_KM = 149_597_870.7;
export const LY_IN_AU = 63241.077;
