import type { PlanetName } from "../astronomy/engine";

export const PLANET_INFO: Record<PlanetName, { ru: string; color: string; radiusKm: number }> = {
  Mercury: { ru: "Меркурий", color: "#b7aea0", radiusKm: 2439.7 },
  Venus: { ru: "Венера", color: "#f0dfb0", radiusKm: 6051.8 },
  Mars: { ru: "Марс", color: "#e2765b", radiusKm: 3389.5 },
  Jupiter: { ru: "Юпитер", color: "#e3c491", radiusKm: 69911 },
  Saturn: { ru: "Сатурн", color: "#e9d8a6", radiusKm: 58232 },
  Uranus: { ru: "Уран", color: "#a6dee8", radiusKm: 25362 },
  Neptune: { ru: "Нептун", color: "#7fa8e0", radiusKm: 24622 },
};
