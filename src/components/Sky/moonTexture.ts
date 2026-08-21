import * as THREE from "three";
import { drawMoonDisc } from "../../utils/moonPhaseDraw";

export function makeMoonTexture(k: number, waxing: boolean): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  drawMoonDisc(ctx, size, k, waxing);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
