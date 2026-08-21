import type { ConstellationRecord, DeepSkyRecord, StarRecord } from "../types";
import { CONSTELLATION_FACTS } from "../data/constellationFacts";

const MONTHS_RU = [
  "январе", "феврале", "марте", "апреле", "мае", "июне",
  "июле", "августе", "сентябре", "октябре", "ноябре", "декабре",
];

/**
 * Rough estimate of the month(s) in which a constellation transits near
 * local midnight (i.e. is visible all night) for an observer, based on the
 * Sun's approximate ecliptic longitude through the year. This is a
 * simplification (ignores the Sun-RA/ecliptic-longitude offset and equation
 * of time) intended for a friendly "best time to observe" hint, not for
 * precise positioning -- exact positions elsewhere are computed with real
 * ephemerides.
 */
export function bestViewingMonths(raDeg: number): string {
  const targetLambda = (raDeg + 180) % 360;
  // Sun's ecliptic longitude is ~0 around March 20 (day-of-year 79).
  const daysPerDegree = 365.25 / 360;
  let dayOfYear = 79 + targetLambda * daysPerDegree;
  dayOfYear = ((dayOfYear % 365.25) + 365.25) % 365.25;
  const monthIndex = Math.floor(dayOfYear / 30.44) % 12;
  const prevMonth = (monthIndex + 11) % 12;
  const nextMonth = (monthIndex + 1) % 12;
  return `лучше всего видно в ${MONTHS_RU[prevMonth]}–${MONTHS_RU[nextMonth]}`;
}

export interface ConstellationDetails {
  con: ConstellationRecord;
  description: string;
  fact: string | null;
  brightestStars: StarRecord[];
  deepSkyObjects: DeepSkyRecord[];
  viewingHint: string;
}

export function getConstellationDetails(
  con: ConstellationRecord,
  allStars: StarRecord[],
  allDeepSky: DeepSkyRecord[]
): ConstellationDetails {
  const brightestStars = allStars
    .filter((s) => s.con === con.id)
    .sort((a, b) => a.mag - b.mag)
    .slice(0, 6);

  const deepSkyObjects = allDeepSky
    .filter((d) => isNearConstellation(d, con))
    .sort((a, b) => a.mag - b.mag)
    .slice(0, 4);

  const facts = CONSTELLATION_FACTS[con.id];
  const description =
    facts?.description ??
    `Созвездие ${con.ru} (лат. ${con.la}) — одно из 88 современных созвездий, официально признанных Международным астрономическим союзом.`;

  return {
    con,
    description,
    fact: facts?.fact || null,
    brightestStars,
    deepSkyObjects,
    viewingHint: bestViewingMonths(con.center.ra),
  };
}

/** Cheap "same general area" check by comparing against the constellation's line points bounding box. */
function isNearConstellation(obj: DeepSkyRecord, con: ConstellationRecord): boolean {
  let minRa = Infinity, maxRa = -Infinity, minDec = Infinity, maxDec = -Infinity;
  for (const seg of con.lines) {
    for (const [ra, dec] of seg) {
      minRa = Math.min(minRa, ra);
      maxRa = Math.max(maxRa, ra);
      minDec = Math.min(minDec, dec);
      maxDec = Math.max(maxDec, dec);
    }
  }
  if (!Number.isFinite(minRa)) return false;
  const pad = 3;
  return (
    obj.dec >= minDec - pad &&
    obj.dec <= maxDec + pad &&
    obj.ra >= minRa - pad &&
    obj.ra <= maxRa + pad
  );
}
