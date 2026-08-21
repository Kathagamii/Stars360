import * as Astronomy from "astronomy-engine";
import type { DeepSkyRecord, HorizontalPosition, SelectedObject, StarRecord } from "../types";
import { getBodyPosition, getMoonInfo, type PlanetName } from "./engine";
import { PLANET_INFO } from "../data/planetInfo";
import { DEEPSKY_TYPE_LABELS } from "../types";
import { cleanSpectralClass, formatDistance, formatMagnitude } from "../utils/format";

export interface ResolvedObject {
  kind: SelectedObject["kind"];
  title: string;
  subtitle: string | null;
  position: HorizontalPosition;
  rows: { label: string; value: string }[];
  extra?: { moonPhaseFraction: number; moonPhaseName: string; waxing: boolean } | undefined;
}

export function resolveSelected(
  selected: SelectedObject,
  stars: StarRecord[],
  deepsky: DeepSkyRecord[],
  observer: Astronomy.Observer,
  date: Date
): ResolvedObject | null {
  if (selected.kind === "star") {
    const hip = Number(selected.id.replace("hip-", ""));
    const star = stars.find((s) => s.hip === hip);
    if (!star) return null;
    const position = starHorizontal(star, observer, date);
    const rows = [
      { label: "Обозначение", value: star.hd ?? `HIP ${star.hip}` },
      { label: "Созвездие", value: star.con ?? "—" },
      { label: "Видимая величина", value: formatMagnitude(star.mag) },
      { label: "Расстояние", value: formatDistance(star.distanceLy) },
      { label: "Спектральный класс", value: cleanSpectralClass(star.spect) },
    ];
    return {
      kind: "star",
      title: star.name ?? starDesignation(star),
      subtitle: star.name ? starDesignation(star) : null,
      position,
      rows,
    };
  }

  if (selected.kind === "deepsky") {
    const obj = deepsky.find((d) => d.id === selected.id);
    if (!obj) return null;
    const position = bodyLikeHorizontal(obj.ra, obj.dec, observer, date);
    const rows = [
      { label: "Тип", value: DEEPSKY_TYPE_LABELS[obj.type] ?? obj.type },
      { label: "Обозначение", value: obj.desig ?? obj.id },
      { label: "Видимая величина", value: formatMagnitude(obj.mag) },
      { label: "Угловой размер", value: obj.dim ? `${obj.dim}′` : "—" },
    ];
    return {
      kind: "deepsky",
      title: obj.altName ?? obj.name,
      subtitle: obj.altName ? obj.name : null,
      position,
      rows,
    };
  }

  if (selected.kind === "sun") {
    const pos = getBodyPosition(Astronomy.Body.Sun, date, observer);
    return {
      kind: "sun",
      title: "Солнце",
      subtitle: null,
      position: pos,
      rows: [
        { label: "Расстояние", value: `${(pos.distanceAU).toFixed(4)} а.е.` },
        { label: "Видимая величина", value: "-26.7ᵐ" },
        { label: "Спектральный класс", value: "G2V" },
      ],
    };
  }

  if (selected.kind === "moon") {
    const pos = getBodyPosition(Astronomy.Body.Moon, date, observer);
    const info = getMoonInfo(date);
    const distanceKm = pos.distanceAU * 149_597_870.7;
    return {
      kind: "moon",
      title: "Луна",
      subtitle: info.ageDescription,
      position: pos,
      rows: [
        { label: "Фаза", value: info.ageDescription },
        { label: "Освещённость", value: `${Math.round(info.phaseFraction * 100)}%` },
        { label: "Расстояние", value: `${Math.round(distanceKm).toLocaleString("ru-RU")} км` },
      ],
      extra: {
        moonPhaseFraction: info.phaseFraction,
        moonPhaseName: info.ageDescription,
        waxing: info.phaseAngleDeg < 180,
      },
    };
  }

  if (selected.kind === "planet") {
    const name = selected.id.replace("planet-", "") as PlanetName;
    const body = Astronomy.Body[name];
    const pos = getBodyPosition(body, date, observer);
    const info = PLANET_INFO[name];
    return {
      kind: "planet",
      title: info.ru,
      subtitle: name,
      position: pos,
      rows: [
        { label: "Расстояние от Земли", value: `${pos.distanceAU.toFixed(3)} а.е.` },
        { label: "Экваториальный радиус", value: `${info.radiusKm.toLocaleString("ru-RU")} км` },
      ],
    };
  }

  return null;
}

function starDesignation(star: StarRecord): string {
  if (star.bayer && star.con) return `${star.bayer} ${star.con}`;
  if (star.flam && star.con) return `${star.flam} ${star.con}`;
  if (star.hd) return star.hd;
  return `HIP ${star.hip}`;
}

function starHorizontal(star: StarRecord, observer: Astronomy.Observer, date: Date): HorizontalPosition {
  return bodyLikeHorizontal(star.ra, star.dec, observer, date);
}

/** Same EQJ(J2000)->HOR pipeline the 3D renderer uses, so panel numbers exactly match what's on screen. */
export function bodyLikeHorizontal(
  raDeg: number,
  decDeg: number,
  observer: Astronomy.Observer,
  date: Date
): HorizontalPosition {
  const vec = Astronomy.VectorFromSphere(new Astronomy.Spherical(decDeg, raDeg, 1), date);
  const rot = Astronomy.Rotation_EQJ_HOR(date, observer);
  const horVec = Astronomy.RotateVector(rot, vec);
  const sph = Astronomy.HorizonFromVector(horVec, "normal");
  return { altitude: sph.lat, azimuth: sph.lon, visible: sph.lat > 0 };
}
