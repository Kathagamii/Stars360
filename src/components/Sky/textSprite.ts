import * as THREE from "three";

/** Small self-contained canvas-texture label sprite (no external font/network fetch needed). */
export function makeTextSprite(
  text: string,
  opts: { color?: string; fontSize?: number; weight?: string; padding?: number; worldSize?: number } = {}
): THREE.Sprite {
  const { color = "#eaf1ff", fontSize = 64, weight = "600", padding = 24, worldSize = 5 } = opts;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${weight} ${fontSize}px "Segoe UI", sans-serif`;
  const metrics = ctx.measureText(text);
  const width = Math.ceil(metrics.width + padding * 2);
  const height = Math.ceil(fontSize * 1.4 + padding);
  canvas.width = width;
  canvas.height = height;

  ctx.font = `${weight} ${fontSize}px "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  ctx.fillText(text, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  const aspect = width / height;
  sprite.scale.set(worldSize * aspect, worldSize, 1);
  return sprite;
}
