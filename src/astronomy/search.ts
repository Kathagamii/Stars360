import type { ConstellationRecord, DeepSkyRecord, SatelliteRecord, SelectedObject, StarRecord } from "../types";
import { STAR_NAMES_RU } from "../data/starNamesRu";
import { PLANET_INFO } from "../data/planetInfo";
import { SATELLITE_FACTS } from "../data/satelliteFacts";
import { PLANET_BODIES } from "./engine";

export interface SearchEntry {
  obj: SelectedObject;
  title: string;
  subtitle: string;
  keywords: string;
  constellationId?: string;
}

export function buildSearchIndex(
  stars: StarRecord[],
  constellations: ConstellationRecord[],
  deepsky: DeepSkyRecord[],
  satellites: SatelliteRecord[] = []
): SearchEntry[] {
  const entries: SearchEntry[] = [];

  entries.push({
    obj: { kind: "sun", id: "sun" },
    title: "Солнце",
    subtitle: "Звезда",
    keywords: "солнце sun",
  });
  entries.push({
    obj: { kind: "moon", id: "moon" },
    title: "Луна",
    subtitle: "Спутник Земли",
    keywords: "луна moon",
  });

  for (const name of PLANET_BODIES) {
    entries.push({
      obj: { kind: "planet", id: `planet-${name}` },
      title: PLANET_INFO[name].ru,
      subtitle: "Планета",
      keywords: `${PLANET_INFO[name].ru} ${name}`.toLowerCase(),
    });
  }

  for (const s of stars) {
    if (!s.name) continue;
    const ru = STAR_NAMES_RU[s.name] ?? "";
    entries.push({
      obj: { kind: "star", id: `hip-${s.hip}` },
      title: s.name,
      subtitle: s.con ? `Звезда · ${s.con}` : "Звезда",
      keywords: `${s.name} ${ru} hip${s.hip}`.toLowerCase(),
    });
  }

  for (const c of constellations) {
    entries.push({
      obj: { kind: "constellation", id: c.id },
      title: c.ru,
      subtitle: `Созвездие · ${c.la}`,
      keywords: `${c.ru} ${c.en} ${c.la} ${c.id}`.toLowerCase(),
      constellationId: c.id,
    });
  }

  for (const d of deepsky) {
    entries.push({
      obj: { kind: "deepsky", id: d.id },
      title: d.altName ?? d.name,
      subtitle: `Глубокий космос · ${d.desig ?? d.id}`,
      keywords: `${d.name} ${d.altName ?? ""} ${d.desig ?? ""}`.toLowerCase(),
    });
  }

  for (const s of satellites) {
    const fact = SATELLITE_FACTS[s.key];
    if (!fact) continue;
    entries.push({
      obj: { kind: "satellite", id: s.key },
      title: fact.ru,
      subtitle: `Спутник · ${s.name}`,
      keywords: `${fact.ru} ${s.name} ${s.key}`.toLowerCase(),
    });
  }

  return entries;
}

export function searchObjects(index: SearchEntry[], query: string, limit = 8): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts: SearchEntry[] = [];
  const contains: SearchEntry[] = [];
  for (const entry of index) {
    if (entry.keywords.startsWith(q) || entry.title.toLowerCase().startsWith(q)) {
      starts.push(entry);
    } else if (entry.keywords.includes(q)) {
      contains.push(entry);
    }
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}
