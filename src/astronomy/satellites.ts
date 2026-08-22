import {
  twoline2satrec,
  propagate,
  gstime,
  eciToEcf,
  ecfToLookAngles,
  eciToGeodetic,
  radiansToDegrees,
  degreesToRadians,
  jday,
  sunPos,
  type SatRec,
} from "satellite.js";
import type { GeoLocation, HorizontalPosition } from "../types";

const AU_KM = 149_597_870.7;
const EARTH_RADIUS_KM = 6378.137;

/**
 * Cylindrical Earth-shadow approximation (no penumbra): true if the satellite
 * is on the sunlit side, or on the night side but far enough off the
 * Sun-Earth line to poke out past Earth's shadow cylinder.
 */
function isSunlitNow(sunEciAU: number[], satEciKm: { x: number; y: number; z: number }): boolean {
  const sx = sunEciAU[0] * AU_KM, sy = sunEciAU[1] * AU_KM, sz = sunEciAU[2] * AU_KM;
  const sunDist = Math.hypot(sx, sy, sz);
  const ux = sx / sunDist, uy = sy / sunDist, uz = sz / sunDist;
  const proj = satEciKm.x * ux + satEciKm.y * uy + satEciKm.z * uz;
  if (proj > 0) return true;
  const px = satEciKm.x - proj * ux;
  const py = satEciKm.y - proj * uy;
  const pz = satEciKm.z - proj * uz;
  return Math.hypot(px, py, pz) > EARTH_RADIUS_KM;
}

export function createSatRec(line1: string, line2: string): SatRec {
  return twoline2satrec(line1, line2);
}

export interface SatellitePosition extends HorizontalPosition {
  rangeKm: number;
  heightKm: number;
  velocityKmS: number;
  sunlit: boolean;
}

/** Real-time SGP4 propagation: TLE + observer + instant -> alt/az/range (degrees/km). */
export function propagateSatellite(
  satrec: SatRec,
  date: Date,
  location: GeoLocation
): SatellitePosition | null {
  const pv = propagate(satrec, date);
  if (!pv || !pv.position || !pv.velocity) return null;

  const gmst = gstime(date);
  const ecf = eciToEcf(pv.position, gmst);
  const observerGd = {
    longitude: degreesToRadians(location.lon),
    latitude: degreesToRadians(location.lat),
    height: location.elevation / 1000,
  };
  const look = ecfToLookAngles(observerGd, ecf);
  const geodetic = eciToGeodetic(pv.position, gmst);

  const jd = jday(date);
  const sun = sunPos(jd);
  const sunlit = isSunlitNow(sun.rsun, pv.position);

  const { x, y, z } = pv.velocity;
  const velocityKmS = Math.sqrt(x * x + y * y + z * z);

  return {
    altitude: radiansToDegrees(look.elevation),
    azimuth: radiansToDegrees(look.azimuth),
    visible: look.elevation > 0,
    rangeKm: look.rangeSat,
    heightKm: geodetic.height,
    velocityKmS,
    sunlit,
  };
}

export interface SatelliteOrbitStats {
  periodMinutes: number;
  inclinationDeg: number;
}

/** Orbital stats straight from the TLE's mean elements (not derived from a single instant). */
export function satelliteOrbitStats(satrec: SatRec): SatelliteOrbitStats {
  return {
    periodMinutes: (2 * Math.PI) / satrec.no,
    inclinationDeg: radiansToDegrees(satrec.inclo),
  };
}

/**
 * Whether a satellite would actually stand out to a naked-eye observer right
 * now: above the horizon, lit by the Sun (not in Earth's shadow), and the
 * local sky dark enough (Sun below civil twilight) for it to be seen against it.
 */
export function isNakedEyeVisible(satPos: SatellitePosition, sunAltitudeDeg: number): boolean {
  return satPos.visible && satPos.sunlit && sunAltitudeDeg < -6;
}
