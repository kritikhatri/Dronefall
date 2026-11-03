import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { game, useStore } from '../game/state';

const COUNT = 220;
const BOX = 40; // streaks live in a box this size around the drone

// Little white streaks that blow past the drone so you can *see* the wind
export function WindStreaks() {
  const { geometry, offsets } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 6), 3));
    const o = new Float32Array(COUNT * 3);
    for (let i = 0; i < o.length; i++) o[i] = Math.random() * BOX;
    return { geometry: g, offsets: o };
  }, []);
  const material = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }),
    [],
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const w = game.wind;
    const strength = w.length();
    const playing = useStore.getState().phase === 'playing';
    material.opacity = playing ? Math.min(0.55, strength * 0.08) : 0;
    if (material.opacity <= 0.01) return;

    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const len = 0.25 + strength * 0.12;
    const p = game.pos;
    for (let i = 0; i < COUNT; i++) {
      const ox = (offsets[i * 3] = (offsets[i * 3] + w.x * dt * 3 + BOX) % BOX);
      const oy = offsets[i * 3 + 1];
      const oz = (offsets[i * 3 + 2] = (offsets[i * 3 + 2] + w.z * dt * 3 + BOX) % BOX);
      // place relative to a grid anchored to the world so streaks don't follow the camera
      const x = Math.floor((p.x - ox) / BOX) * BOX + ox + BOX / 2;
      const z = Math.floor((p.z - oz) / BOX) * BOX + oz + BOX / 2;
      const y = p.y - BOX / 4 + oy * 0.5;
      arr[i * 6] = x;
      arr[i * 6 + 1] = y;
      arr[i * 6 + 2] = z;
      arr[i * 6 + 3] = x + w.x * len;
      arr[i * 6 + 4] = y;
      arr[i * 6 + 5] = z + w.z * len;
    }
    pos.needsUpdate = true;
  });

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />;
}
