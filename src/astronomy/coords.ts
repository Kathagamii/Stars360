import * as Astronomy from "astronomy-engine";

const DEG2RAD = Math.PI / 180;

/**
 * Scene axis convention used throughout the sky viewer:
 *   +X = East, +Y = Zenith (up), -Z = North.
 * (Matches astronomy-engine's HOR frame docs: "x=North, y=West, z=Zenith",
 * remapped as threeX=-horY, threeY=horZ, threeZ=-horX.)
 */
export function horizontalToVector3(
  altitudeDeg: number,
  azimuthDeg: number,
  radius: number,
  out: [number, number, number] = [0, 0, 0]
): [number, number, number] {
  const alt = altitudeDeg * DEG2RAD;
  const az = azimuthDeg * DEG2RAD;
  const cosAlt = Math.cos(alt);
  out[0] = radius * cosAlt * Math.sin(az); // East
  out[1] = radius * Math.sin(alt); // Up
  out[2] = -radius * cosAlt * Math.cos(az); // North is -Z
  return out;
}

/** Unit vector in the EQJ (J2000 mean equator) frame for a catalog RA(deg)/Dec(deg). */
export function eqjUnitVector(raDeg: number, decDeg: number): [number, number, number] {
  const ra = raDeg * DEG2RAD;
  const dec = decDeg * DEG2RAD;
  const rcosdec = Math.cos(dec);
  return [rcosdec * Math.cos(ra), rcosdec * Math.sin(ra), Math.sin(dec)];
}

/** 9 coefficients that map an EQJ unit vector directly to a scene-space vector (see horizontalToVector3 axes). */
export type SceneBasis = Float64Array; // [aX0,aX1,aX2, aY0,aY1,aY2, aZ0,aZ1,aZ2]

export function computeSceneBasis(date: Date, observer: Astronomy.Observer): SceneBasis {
  const rot = Astronomy.Rotation_EQJ_HOR(date, observer).rot;
  const m00 = rot[0][0], m10 = rot[1][0], m20 = rot[2][0];
  const m01 = rot[0][1], m11 = rot[1][1], m21 = rot[2][1];
  const m02 = rot[0][2], m12 = rot[1][2], m22 = rot[2][2];
  return new Float64Array([
    -m01, -m11, -m21, // threeX = -horY
    m02, m12, m22, // threeY = horZ
    -m00, -m10, -m20, // threeZ = -horX
  ]);
}

export function applySceneBasis(
  basis: SceneBasis,
  ex: number,
  ey: number,
  ez: number,
  radius: number,
  out: [number, number, number] = [0, 0, 0]
): [number, number, number] {
  out[0] = (basis[0] * ex + basis[1] * ey + basis[2] * ez) * radius;
  out[1] = (basis[3] * ex + basis[4] * ey + basis[5] * ez) * radius;
  out[2] = (basis[6] * ex + basis[7] * ey + basis[8] * ez) * radius;
  return out;
}

/** In-place batched version: fills `positions` (xyz-interleaved) from `eqj` (xyz-interleaved unit vectors). */
export function applySceneBasisBatch(
  basis: SceneBasis,
  eqj: Float32Array,
  positions: Float32Array,
  radius: number
) {
  const [a0, a1, a2, b0, b1, b2, c0, c1, c2] = basis;
  const n = eqj.length / 3;
  for (let i = 0; i < n; i++) {
    const idx = i * 3;
    const ex = eqj[idx];
    const ey = eqj[idx + 1];
    const ez = eqj[idx + 2];
    positions[idx] = (a0 * ex + a1 * ey + a2 * ez) * radius;
    positions[idx + 1] = (b0 * ex + b1 * ey + b2 * ez) * radius;
    positions[idx + 2] = (c0 * ex + c1 * ey + c2 * ez) * radius;
  }
}
