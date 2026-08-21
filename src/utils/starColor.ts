/**
 * Approximates a star's visual RGB color from its B-V color index using the
 * widely used piecewise polynomial fit (Mitchell Charity, "What color are
 * the stars?"). Returns linear 0..1 components.
 */
export function colorFromBV(bv: number | null): [number, number, number] {
  const t = bv ?? 0.65; // default ~ Sun-like G star if unknown
  const clamped = Math.max(-0.4, Math.min(2.0, t));

  let r: number, g: number, b: number;

  if (clamped < 0.0) {
    r = 0.61 + 0.11 * clamped + 0.1 * clamped * clamped;
    g = 0.7 + 0.07 * clamped + 0.1 * clamped * clamped;
    b = 1.0;
  } else if (clamped < 0.4) {
    r = 0.83 + 0.17 * clamped;
    g = 0.87 + 0.11 * clamped;
    b = 1.0;
  } else if (clamped < 1.6) {
    r = 1.0;
    g = 0.98 - 0.16 * (clamped - 0.4);
    b = 0.665 - 0.462 * (clamped - 0.4) + 0.19 * (clamped - 0.4) * (clamped - 0.4);
  } else {
    r = 1.0;
    g = 0.82 - 0.5 * (clamped - 1.6);
    b = 0.0;
  }

  return [clampUnit(r), clampUnit(g), clampUnit(b)];
}

function clampUnit(v: number) {
  return Math.max(0, Math.min(1, v));
}

/** Rough B-V -> spectral class letter, used only when catalog spect is missing. */
export function spectralClassFromBV(bv: number | null): string {
  if (bv == null) return "—";
  if (bv < -0.3) return "O";
  if (bv < 0.0) return "B";
  if (bv < 0.3) return "A";
  if (bv < 0.58) return "F";
  if (bv < 0.81) return "G";
  if (bv < 1.4) return "K";
  return "M";
}

/** Point render radius (before magnitude-based scaling) for a given visual magnitude. */
export function starRenderSize(mag: number): number {
  const clamped = Math.max(-1.5, Math.min(6.5, mag));
  return Math.pow(1.9, -clamped * 0.62) * 2.1;
}
