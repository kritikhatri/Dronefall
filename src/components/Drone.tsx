import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { game, useStore } from '../game/state';
import { getCity } from '../game/city';
import { objectivePoint, stepGame } from '../game/logic';

const ROTORS: [number, number][] = [
  [0.78, 0.78],
  [-0.78, 0.78],
  [0.78, -0.78],
  [-0.78, -0.78],
];

const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3();
const lookAt = new THREE.Vector3();
const smoothLook = new THREE.Vector3();
const obj = new THREE.Vector3();
const dir = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const probe = new THREE.Vector3();
const city = getCity();

// Is this point inside (or very near) any building?
function blocked(p: THREE.Vector3) {
  for (const b of city.buildings) {
    if (
      p.y < b.h + 0.6 &&
      Math.abs(p.x - b.x) < b.w / 2 + 0.6 &&
      Math.abs(p.z - b.z) < b.d / 2 + 0.6
    )
      return true;
  }
  return false;
}

function pathClear(from: THREE.Vector3, to: THREE.Vector3) {
  const steps = 14;
  for (let i = 1; i <= steps; i++) {
    probe.lerpVectors(from, to, i / steps);
    if (blocked(probe)) return false;
  }
  return true;
}

// If a building is between the drone and the camera, try higher / closer
// camera spots until one has a clear view (like most third-person games).
const CAM_OPTIONS: [number, number][] = [
  [1, 1],
  [0.85, 2.2],
  [0.65, 3.5],
  [0.45, 5],
  [0.2, 7],
];
const candidate = new THREE.Vector3();
function placeCamera(out: THREE.Vector3, back: number, height: number, sin: number, cos: number) {
  for (const [b, h] of CAM_OPTIONS) {
    candidate.set(game.pos.x + sin * back * b, game.pos.y + height * h, game.pos.z + cos * back * b);
    if (pathClear(game.pos, candidate)) {
      out.copy(candidate);
      return;
    }
  }
  out.set(game.pos.x + sin * 1.5, game.pos.y + height * 7, game.pos.z + cos * 1.5);
}

export function Drone({ sun }: { sun: React.RefObject<THREE.DirectionalLight | null> }) {
  const root = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const props = useRef<(THREE.Group | null)[]>([]);
  const parcel = useRef<THREE.Group>(null);
  const arrow = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const phase = useStore.getState().phase;

    if (phase === 'playing') stepGame(dt);

    // --- place the model ---
    const g = root.current!;
    g.position.copy(game.pos);
    g.rotation.y = game.yaw;
    tilt.current!.rotation.set(game.tiltX, 0, game.tiltZ);
    if (phase !== 'playing') {
      // gentle idle bob on the menu
      g.position.y += Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }

    const spin = game.falling ? 4 : 40 + game.throttle * 30;
    props.current.forEach((p, i) => {
      if (p) p.rotation.y += spin * dt * (i % 2 ? 1 : -1);
    });
    parcel.current!.visible = game.carrying;
    if (game.carrying) parcel.current!.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.08 - game.tiltZ * 0.6;

    // --- guide arrow pointing at the current objective ---
    const a = arrow.current!;
    const target = phase === 'playing' ? objectivePoint(obj) : null;
    a.visible = !!target;
    if (target) {
      a.position.set(game.pos.x, game.pos.y + 2.2, game.pos.z);
      dir.subVectors(target, a.position).normalize();
      a.quaternion.setFromUnitVectors(up, dir);
    }

    // --- camera ---
    if (phase === 'menu') {
      const t = state.clock.elapsedTime * 0.05;
      camera.position.set(Math.cos(t) * 150, 85, Math.sin(t) * 150);
      camera.lookAt(0, 10, 0);
      smoothLook.set(0, 10, 0);
    } else {
      const far = game.camFar;
      const back = far ? 18 : 8.5;
      const height = far ? 9 : 3.4;
      const sin = Math.sin(game.yaw);
      const cos = Math.cos(game.yaw);
      placeCamera(camTarget, back, height, sin, cos);
      camPos.copy(camera.position).lerp(camTarget, Math.min(1, dt * 5));
      // never let the smoothed camera sit inside a wall
      if (blocked(camPos)) camPos.copy(camTarget);
      camera.position.copy(camPos);
      // when the camera has been lifted over a building, look more steeply down at the drone
      const lifted = THREE.MathUtils.clamp((camTarget.y - game.pos.y - height) / (height * 3), 0, 1);
      const ahead = 6 * (1 - lifted);
      lookAt.set(game.pos.x - sin * ahead, game.pos.y + 0.8 * (1 - lifted), game.pos.z - cos * ahead);
      smoothLook.lerp(lookAt, Math.min(1, dt * 8));
      if (game.shake > 0) {
        const s = game.shake * 0.5;
        camera.position.x += (Math.random() - 0.5) * s;
        camera.position.y += (Math.random() - 0.5) * s;
      }
      camera.lookAt(smoothLook);
    }

    // --- keep the sun's shadow area centred on the drone ---
    const l = sun.current;
    if (l) {
      const focus = phase === 'menu' ? camTarget.set(0, 0, 0) : game.pos;
      l.position.set(focus.x + 60, 110, focus.z + 40);
      l.target.position.set(focus.x, 0, focus.z);
      l.target.updateMatrixWorld();
    }
  });

  return (
    <>
      <group ref={root}>
        <group ref={tilt}>
          {/* body */}
          <mesh castShadow position={[0, 0, 0]}>
            <boxGeometry args={[1.0, 0.3, 1.25]} />
            <meshStandardMaterial color="#f4f4f5" roughness={0.4} />
          </mesh>
          <mesh castShadow position={[0, 0.22, 0.05]}>
            <boxGeometry args={[0.66, 0.18, 0.8]} />
            <meshStandardMaterial color="#ff6b35" roughness={0.35} />
          </mesh>
          {/* camera gimbal at the front */}
          <mesh position={[0, -0.2, -0.55]}>
            <sphereGeometry args={[0.14, 12, 10]} />
            <meshStandardMaterial color="#1f2937" roughness={0.2} metalness={0.6} />
          </mesh>
          {/* arms */}
          {[Math.PI / 4, -Math.PI / 4].map((r) => (
            <mesh key={r} rotation-y={r} castShadow>
              <boxGeometry args={[2.2, 0.08, 0.13]} />
              <meshStandardMaterial color="#2b2f36" />
            </mesh>
          ))}
          {ROTORS.map(([x, z], i) => (
            <group key={i} position={[x, 0.08, z]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.13, 0.13, 0.2, 10]} />
                <meshStandardMaterial color="#1f2328" />
              </mesh>
              <group ref={(el) => void (props.current[i] = el)} position={[0, 0.14, 0]}>
                <mesh>
                  <boxGeometry args={[0.95, 0.02, 0.09]} />
                  <meshStandardMaterial color="#111" />
                </mesh>
                <mesh rotation-y={Math.PI / 2}>
                  <boxGeometry args={[0.95, 0.02, 0.09]} />
                  <meshStandardMaterial color="#111" />
                </mesh>
                <mesh>
                  <cylinderGeometry args={[0.5, 0.5, 0.01, 24]} />
                  <meshBasicMaterial color="#cbd5e1" transparent opacity={0.18} depthWrite={false} />
                </mesh>
              </group>
              {/* nav lights: white front, red back */}
              <mesh position={[0, -0.12, 0]}>
                <sphereGeometry args={[0.06, 8, 6]} />
                <meshBasicMaterial color={z < 0 ? '#ffffff' : '#ff3b3b'} toneMapped={false} />
              </mesh>
            </group>
          ))}
          {/* parcel hanging underneath */}
          <group ref={parcel} position={[0, -0.15, 0]} visible={false}>
            <mesh position={[0, -0.35, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.7, 4]} />
              <meshStandardMaterial color="#222" />
            </mesh>
            <mesh position={[0, -0.95, 0]} castShadow>
              <boxGeometry args={[0.6, 0.5, 0.6]} />
              <meshStandardMaterial color="#c8925a" roughness={0.9} />
            </mesh>
            <mesh position={[0, -0.95, 0]}>
              <boxGeometry args={[0.62, 0.1, 0.62]} />
              <meshStandardMaterial color="#e9d8a6" />
            </mesh>
          </group>
        </group>
      </group>

      {/* guide arrow */}
      <group ref={arrow} visible={false}>
        <mesh position={[0, 0.55, 0]}>
          <coneGeometry args={[0.28, 0.7, 12]} />
          <meshBasicMaterial color="#ffd23f" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.4, 8]} />
          <meshBasicMaterial color="#ffd23f" toneMapped={false} />
        </mesh>
      </group>
    </>
  );
}
