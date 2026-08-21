/**
 * Renders a moon disc for the given illuminated fraction (0..1) and
 * waxing/waning direction onto a 2D canvas context, using the classic
 * "half-disc + terminator ellipse" technique. Shared by the 3D moon sprite
 * texture and the flat UI phase icon.
 */
export function drawMoonDisc(
  ctx: CanvasRenderingContext2D,
  size: number,
  k: number,
  waxing: boolean,
  colors: { dark: string; light: string } = { dark: "#3a3d47", light: "#f4efe2" }
) {
  const R = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  const { dark, light } = colors;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, size, size);

  const litRight = waxing;
  ctx.fillStyle = light;
  ctx.beginPath();
  if (litRight) {
    ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2);
  } else {
    ctx.arc(cx, cy, R, Math.PI / 2, (3 * Math.PI) / 2);
  }
  ctx.closePath();
  ctx.fill();

  const rx = R * Math.abs(2 * k - 1);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, R, 0, 0, Math.PI * 2);
  ctx.fillStyle = k < 0.5 ? dark : light;
  ctx.fill();

  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
