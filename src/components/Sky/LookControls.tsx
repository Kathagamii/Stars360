import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { horizontalToVector3 } from "../../astronomy/coords";

const MIN_FOV = 22;
const MAX_FOV = 100;
const DEFAULT_FOV = 70;

export interface LookState {
  az: number;
  alt: number;
  fov: number;
}

/**
 * First-person "look around" controls: the camera stays fixed at the
 * origin (we're standing under the sky dome) and dragging/pinching changes
 * look direction and field of view, instead of orbiting an external target.
 */
export function LookControls({ stateRef }: { stateRef: React.MutableRefObject<LookState> }) {
  const { camera, gl } = useThree();
  const dir = useRef<[number, number, number]>([0, 0, -1]);

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "none";
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchStartDist: number | null = null;
    let pinchStartFov = DEFAULT_FOV;

    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

    function onPointerDown(e: PointerEvent) {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const pts = [...pointers.values()];
        pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        pinchStartFov = stateRef.current.fov;
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (!pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId)!;
      const cur = { x: e.clientX, y: e.clientY };
      pointers.set(e.pointerId, cur);

      if (pointers.size === 2) {
        const pts = [...pointers.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (pinchStartDist && pinchStartDist > 10) {
          const ratio = pinchStartDist / dist;
          stateRef.current.fov = clamp(pinchStartFov * ratio, MIN_FOV, MAX_FOV);
        }
        return;
      }

      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      const sensitivity = (stateRef.current.fov / gl.domElement.clientHeight) * 1.0;
      stateRef.current.az = (stateRef.current.az - dx * sensitivity + 360) % 360;
      stateRef.current.alt = clamp(stateRef.current.alt + dy * sensitivity, -89, 89);
    }

    function onPointerUp(e: PointerEvent) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStartDist = null;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      stateRef.current.fov = clamp(stateRef.current.fov + e.deltaY * 0.035, MIN_FOV, MAX_FOV);
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [gl, stateRef]);

  useFrame((state) => {
    const s = stateRef.current;
    const cam = camera as import("three").PerspectiveCamera;
    if (Math.abs(cam.fov - s.fov) > 0.01) {
      cam.fov = s.fov;
      cam.updateProjectionMatrix();
    }
    horizontalToVector3(s.alt, s.az, 1, dir.current);
    camera.lookAt(dir.current[0], dir.current[1], dir.current[2]);
    void state;
  });

  return null;
}

export function createLookState(initialAz = 180, initialAlt = 18): LookState {
  return { az: initialAz, alt: initialAlt, fov: DEFAULT_FOV };
}
