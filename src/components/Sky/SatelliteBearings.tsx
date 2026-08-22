import { useEffect, useRef } from "react";
import type { SatelliteBearing } from "../../types";
import type { LookState } from "./LookControls";

function wrapDeg180(deg: number): number {
  let x = deg % 360;
  if (x > 180) x -= 360;
  if (x < -180) x += 360;
  return x;
}

/**
 * Small edge chips pointing toward currently above-horizon satellites that
 * are outside the camera's current field of view — the sky is a full 360°
 * sphere but the viewport only shows a narrow slice of it at a time, so
 * without this a satellite outside that slice is simply invisible with no
 * hint which way to turn to find it.
 */
export function SatelliteBearings({
  bearings,
  lookStateRef,
  onFocus,
}: {
  bearings: SatelliteBearing[];
  lookStateRef: React.MutableRefObject<LookState>;
  onFocus: (bearing: SatelliteBearing) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bearingsRef = useRef(bearings);
  bearingsRef.current = bearings;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const container = containerRef.current;
      if (container) {
        const { az, fov } = lookStateRef.current;
        const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
        const halfFov = (fov / 2) * Math.max(aspect, 1) + 6;
        container.querySelectorAll<HTMLElement>("[data-bearing-key]").forEach((node) => {
          const key = node.dataset.bearingKey!;
          const b = bearingsRef.current.find((x) => x.key === key);
          if (!b) {
            node.style.display = "none";
            return;
          }
          const delta = wrapDeg180(b.azimuth - az);
          if (Math.abs(delta) <= halfFov) {
            node.style.display = "none";
            return;
          }
          node.style.display = "flex";
          node.style.left = delta > 0 ? "" : "0.75rem";
          node.style.right = delta > 0 ? "0.75rem" : "";
          const spread = Math.max(180 - halfFov, 1);
          const t = Math.min((Math.abs(delta) - halfFov) / spread, 1);
          node.style.top = `${22 + t * 56}%`;
          const arrow = node.querySelector<HTMLElement>("[data-arrow]");
          if (arrow) arrow.textContent = delta > 0 ? "›" : "‹";
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lookStateRef]);

  if (bearings.length === 0) return null;

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-[180]">
      {bearings.map((b) => (
        <button
          key={b.key}
          data-bearing-key={b.key}
          onClick={() => onFocus(b)}
          className="glass pointer-events-auto absolute hidden -translate-y-1/2 items-center gap-1.5 rounded-full border border-emerald-400/30 py-1.5 pl-2 pr-3 text-xs font-medium text-emerald-200 shadow-lg transition hover:bg-white/10"
        >
          <span data-arrow className="text-sm leading-none text-emerald-300">
            ‹
          </span>
          🛰 {b.name}
        </button>
      ))}
    </div>
  );
}
