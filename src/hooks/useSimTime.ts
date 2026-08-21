import { useSyncExternalStore } from "react";
import { simClock } from "../store/simClock";

/** Throttled React binding to the sim clock, safe to use in UI text (date/time display). */
export function useSimTimeMs(): number {
  return useSyncExternalStore(
    (cb) => simClock.subscribe(cb),
    () => simClock.getMs()
  );
}

export function useSimTime(): Date {
  return new Date(useSimTimeMs());
}
