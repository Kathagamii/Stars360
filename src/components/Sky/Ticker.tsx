import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAppStore } from "../../store/appStore";
import { simClock } from "../../store/simClock";

const UI_SYNC_INTERVAL_MS = 250;

/** Advances the sim clock every render frame; lives inside the R3F Canvas. */
export function Ticker() {
  const lastSyncRef = useRef(0);

  useFrame((_, deltaSeconds) => {
    const { live, playing, speed } = useAppStore.getState();
    const deltaMs = deltaSeconds * 1000;

    if (live) {
      simClock.advance(deltaMs);
    } else if (playing) {
      simClock.advance(deltaMs * speed);
    }

    if (live || playing) {
      const now = performance.now();
      if (now - lastSyncRef.current > UI_SYNC_INTERVAL_MS) {
        lastSyncRef.current = now;
        simClock.notify();
      }
    }
  });

  return null;
}
