import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getCity } from '../game/city';
import { game, useStore } from '../game/state';

const city = getCity();

function Beam({
  color,
  height = 160,
  radius = 1.4,
  opacity = 0.22,
  matRef,
}: {
  color: string;
  height?: number;
  radius?: number;
  opacity?: number;
  matRef?: React.Ref<THREE.MeshBasicMaterial>;
}) {
  return (
    <mesh position={[0, height / 2, 0]}>
      <cylinderGeometry args={[radius, radius, height, 20, 1, true]} />
      <meshBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        fog={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function Pad({ color, radius = 3 }: { color: string; radius?: number }) {
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]} receiveShadow>
        <circleGeometry args={[radius, 32]} />
        <meshStandardMaterial color="#2a2f36" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0]}>
        <ringGeometry args={[radius * 0.82, radius, 40]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </>
  );
}

// Pulsing ring that also shows hover/hold progress
function Objective({ color, which }: { color: string; which: 'pickup' | 'drop' }) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const fill = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    const g = group.current!;
    const o = game.order;
    const playing = useStore.getState().phase !== 'menu';
    const active = playing && !!o && (which === 'pickup' ? !game.carrying : game.carrying);
    g.visible = active;
    if (!active || !o) return;
    if (which === 'pickup') g.position.set(o.pickup.x, 0.3, o.pickup.z);
    else g.position.set(o.drop.x, o.drop.h, o.drop.z);
    const s = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.08;
    ring.current!.scale.set(s, s, 1);
    const p = Math.max(0.001, Math.min(1, game.objProgress));
    fill.current!.scale.set(p, p, 1);
    // fade the beam when you're close so it doesn't become a wall of light
    const d = state.camera.position.distanceTo(g.position);
    if (beam.current) beam.current.opacity = THREE.MathUtils.clamp((d - 6) / 70, 0.04, 0.24);
  });

  return (
    <group ref={group} visible={false}>
      <Pad color={color} radius={which === 'pickup' ? 3.6 : 3.2} />
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.4, 0]}>
        <ringGeometry args={[3.4, 3.8, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} toneMapped={false} />
      </mesh>
      <mesh ref={fill} rotation-x={-Math.PI / 2} position={[0, 0.08, 0]}>
        <circleGeometry args={[3, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <Beam color={color} matRef={beam} />
    </group>
  );
}

function Chargers() {
  const chargers = useMemo(() => city.buildings.filter((b) => b.charger), []);
  const glow = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#3ddc84',
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  useFrame((state) => {
    glow.opacity = 0.16 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
  });
  return (
    <>
      {chargers.map((b) => (
        <group key={b.id} position={[b.x, b.h, b.z]}>
          <Pad color="#3ddc84" radius={3.4} />
          {/* lightning bolt made from two slanted bars */}
          <mesh position={[-0.35, 0.07, 0.4]} rotation={[-Math.PI / 2, 0, 0.5]}>
            <planeGeometry args={[0.5, 2]} />
            <meshBasicMaterial color="#3ddc84" toneMapped={false} />
          </mesh>
          <mesh position={[0.35, 0.07, -0.4]} rotation={[-Math.PI / 2, 0, 0.5]}>
            <planeGeometry args={[0.5, 2]} />
            <meshBasicMaterial color="#3ddc84" toneMapped={false} />
          </mesh>
          <mesh position={[0, 6, 0]} material={glow}>
            <cylinderGeometry args={[0.9, 0.9, 12, 16, 1, true]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Depot() {
  return (
    <group position={[city.depot.x, 0.38, city.depot.z]}>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[5.5, 40]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <ringGeometry args={[4.6, 5.5, 48]} />
        <meshBasicMaterial color="#ff6b35" toneMapped={false} />
      </mesh>
      {/* "H" helipad marking */}
      {[-1.2, 1.2].map((x) => (
        <mesh key={x} rotation-x={-Math.PI / 2} position={[x, 0.03, 0]}>
          <planeGeometry args={[0.6, 3.6]} />
          <meshBasicMaterial color="#f4f4f5" />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <planeGeometry args={[2.4, 0.6]} />
        <meshBasicMaterial color="#f4f4f5" />
      </mesh>
    </group>
  );
}

export function Markers() {
  return (
    <>
      <Depot />
      <Chargers />
      <Objective which="pickup" color="#ffb020" />
      <Objective which="drop" color="#38e1ff" />
    </>
  );
}
