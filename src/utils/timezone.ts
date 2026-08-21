import tzLookup from "tz-lookup";

export function getTimeZone(lat: number, lon: number): string {
  try {
    return tzLookup(lat, lon);
  } catch {
    return "UTC";
  }
}

/** Converts a wall-clock date/time (as if read off a clock in `timeZone`) to the UTC instant it represents. */
export function zonedWallTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  let guess = Date.UTC(year, month - 1, day, hour, minute);
  for (let i = 0; i < 2; i++) {
    const offsetMs = tzOffsetMs(new Date(guess), timeZone);
    const next = Date.UTC(year, month - 1, day, hour, minute) - offsetMs;
    if (next === guess) break;
    guess = next;
  }
  return new Date(guess);
}

/** Offset (ms) such that localTime = utcTime + offset, for the given instant and IANA zone. */
function tzOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - date.getTime();
}

const dateFmtCache = new Map<string, Intl.DateTimeFormat>();
function cachedFormatter(timeZone: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = timeZone + JSON.stringify(opts);
  let f = dateFmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("ru-RU", { ...opts, timeZone });
    dateFmtCache.set(key, f);
  }
  return f;
}

export function formatInZone(date: Date, timeZone: string, opts: Intl.DateTimeFormatOptions): string {
  return cachedFormatter(timeZone, opts).format(date);
}

/** Extracts {year,month,day,hour,minute} as displayed in `timeZone`, for pre-filling editable inputs. */
export function getZonedParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

export function timeZoneAbbrev(date: Date, timeZone: string): string {
  const dtf = new Intl.DateTimeFormat("ru-RU", { timeZone, timeZoneName: "shortOffset" });
  const part = dtf.formatToParts(date).find((p) => p.type === "timeZoneName");
  return part?.value ?? timeZone;
}
