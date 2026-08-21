export function formatDegrees(deg: number, kind: "lat" | "lon"): string {
  const hemi = kind === "lat" ? (deg >= 0 ? "с.ш." : "ю.ш.") : deg >= 0 ? "в.д." : "з.д.";
  const abs = Math.abs(deg);
  return `${abs.toFixed(4)}° ${hemi}`;
}

export function formatAltAz(altitude: number, azimuth: number): string {
  return `${altitude >= 0 ? "+" : ""}${altitude.toFixed(1)}° / ${azimuth.toFixed(0)}°`;
}

export function formatDistance(ly: number | null): string {
  if (ly == null) return "нет данных";
  if (ly < 0.02) {
    const km = ly * 9.4607e12;
    return `${(km / 1_000_000).toFixed(1)} млн км`;
  }
  if (ly < 1000) return `~${ly.toFixed(ly < 10 ? 2 : 0)} св. лет`;
  if (ly < 1_000_000) return `~${(ly / 1000).toFixed(1)} тыс. св. лет`;
  return `~${(ly / 1_000_000).toFixed(2)} млн св. лет`;
}

export function formatMagnitude(mag: number): string {
  return mag >= 0 ? `+${mag.toFixed(2)}ᵐ` : `${mag.toFixed(2)}ᵐ`;
}

export function cleanSpectralClass(spect: string | null): string {
  if (!spect) return "—";
  return spect.replace(/\.+$/, "").trim() || "—";
}

const DATE_FMT = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const TIME_FMT = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(date: Date): string {
  return DATE_FMT.format(date);
}

export function formatTime(date: Date): string {
  return TIME_FMT.format(date);
}

export function formatDateTimeLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function azimuthCompass(azimuth: number): string {
  const dirs = ["С", "ССВ", "СВ", "ВСВ", "В", "ВЮВ", "ЮВ", "ЮЮВ", "Ю", "ЮЮЗ", "ЮЗ", "ЗЮЗ", "З", "ЗСЗ", "СЗ", "ССЗ"];
  return dirs[Math.round(azimuth / 22.5) % 16];
}
