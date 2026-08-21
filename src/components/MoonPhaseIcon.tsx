import { useEffect, useRef } from "react";
import { drawMoonDisc } from "../utils/moonPhaseDraw";

export function MoonPhaseIcon({ fraction, waxing, size = 56 }: { fraction: number; waxing: boolean; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    drawMoonDisc(ctx, size, fraction, waxing);
  }, [fraction, waxing, size]);

  return <canvas ref={ref} style={{ width: size, height: size }} className="rounded-full" />;
}
