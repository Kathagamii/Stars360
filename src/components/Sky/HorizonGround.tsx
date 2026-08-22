import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DOME_RADIUS } from "./constants";
import { horizontalToVector3 } from "../../astronomy/coords";
import { makeTextSprite } from "./textSprite";
import type { SkyPalette } from "./skyPalette";

const COMPASS = [
  { label: "С", az: 0 },
  { label: "СВ", az: 45 },
  { label: "В", az: 90 },
  { label: "ЮВ", az: 135 },
  { label: "Ю", az: 180 },
  { label: "ЮЗ", az: 225 },
  { label: "З", az: 270 },
  { label: "СЗ", az: 315 },
];

export function HorizonGround({
  paletteRef,
  onBackgroundClick,
}: {
  paletteRef: React.MutableRefObject<SkyPalette>;
  onBackgroundClick?: () => void;
}) {
  const groundMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const ringRef = useRef<THREE.LineBasicMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  const ringGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < 128; i++) {
      const az = (i / 128) * 360;
      const [x, y, z] = horizontalToVector3(0, az, DOME_RADIUS * 0.999);
      points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  const labels = useMemo(() => {
    return COMPASS.map(({ label, az }) => {
      const major = label.length === 1;
      const sprite = makeTextSprite(label, {
        color: major ? "#eaf1ff" : "#8b93ab",
        fontSize: major ? 68 : 50,
        worldSize: major ? 4.2 : 3,
      });
      const [x, y, z] = horizontalToVector3(1.5, az, DOME_RADIUS * 0.97);
      sprite.position.set(x, y, z);
      sprite.renderOrder = 10;
      return sprite;
    });
  }, []);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    labels.forEach((s) => group.add(s));
    return () => {
      labels.forEach((s) => group.remove(s));
    };
  }, [labels]);

  useFrame(() => {
    const p = paletteRef.current;
    if (groundMatRef.current) {
      groundMatRef.current.color.copy(p.horizon).multiplyScalar(0.12).offsetHSL(0, 0, 0.01);
    }
    if (ringRef.current) {
      ringRef.current.color.copy(p.horizon).lerp(new THREE.Color(0xffffff), 0.15);
    }
  });

  return (
    <group>
      <mesh rotation={[0, 0, 0]} renderOrder={-5} onClick={onBackgroundClick}>
        <sphereGeometry args={[DOME_RADIUS * 1.05, 48, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshBasicMaterial ref={groundMatRef} color={0x03040a} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <lineLoop renderOrder={-4}>
        <primitive object={ringGeometry} attach="geometry" />
        <lineBasicMaterial ref={ringRef} color={0x3a4668} transparent opacity={0.55} />
      </lineLoop>
      <group ref={groupRef} />
    </group>
  );
}
