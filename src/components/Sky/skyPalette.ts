import * as THREE from "three";

export interface SkyPalette {
  zenith: THREE.Color;
  horizon: THREE.Color;
  glow: THREE.Color;
  glowStrength: number;
  starOpacity: number;
  groundColor: THREE.Color;
}

const c = (hex: number) => new THREE.Color(hex);

// Keyframes across solar altitude (degrees): [altitude, zenith, horizon, glow]
const STOPS: { alt: number; zenith: THREE.Color; horizon: THREE.Color; glow: THREE.Color }[] = [
  { alt: 10, zenith: c(0x1e63c9), horizon: c(0xbfe0ff) , glow: c(0xffffff) },
  { alt: 0, zenith: c(0x2a4c8f), horizon: c(0xff9d5c), glow: c(0xffcf8a) },
  { alt: -6, zenith: c(0x131a3d), horizon: c(0xaa4f5e), glow: c(0xff8d5a) },
  { alt: -12, zenith: c(0x060a1c), horizon: c(0x241c3c), glow: c(0xc36b6b) },
  { alt: -18, zenith: c(0x020308), horizon: c(0x0a0e1e), glow: c(0x2a2f55) },
];

function lerpColor(a: THREE.Color, b: THREE.Color, t: number) {
  return a.clone().lerp(b, THREE.MathUtils.clamp(t, 0, 1));
}

export function getSkyPalette(sunAltitudeDeg: number): SkyPalette {
  let zenith: THREE.Color, horizon: THREE.Color, glow: THREE.Color;

  if (sunAltitudeDeg >= STOPS[0].alt) {
    ({ zenith, horizon, glow } = STOPS[0]);
  } else if (sunAltitudeDeg <= STOPS[STOPS.length - 1].alt) {
    ({ zenith, horizon, glow } = STOPS[STOPS.length - 1]);
  } else {
    let lo = STOPS[0];
    let hi = STOPS[STOPS.length - 1];
    for (let i = 0; i < STOPS.length - 1; i++) {
      if (sunAltitudeDeg <= STOPS[i].alt && sunAltitudeDeg >= STOPS[i + 1].alt) {
        lo = STOPS[i];
        hi = STOPS[i + 1];
        break;
      }
    }
    const t = (lo.alt - sunAltitudeDeg) / (lo.alt - hi.alt);
    zenith = lerpColor(lo.zenith, hi.zenith, t);
    horizon = lerpColor(lo.horizon, hi.horizon, t);
    glow = lerpColor(lo.glow, hi.glow, t);
  }

  // Stars fade in through civil/nautical twilight and are fully out by astronomical twilight.
  const starOpacity = 1 - THREE.MathUtils.smoothstep(sunAltitudeDeg, -14, 8);
  // Warm horizon glow peaks around golden hour and fades both into daylight and deep night.
  const golden = (sunAltitudeDeg - 1) / 9;
  const glowStrength = Math.exp(-golden * golden) * 0.9;

  return { zenith, horizon, glow, glowStrength, starOpacity, groundColor: c(0x03040a) };
}
