import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getCity } from '../game/city';
import { GRID, HALF, PITCH, ROAD } from '../game/config';

const city = getCity();
const tmp = new THREE.Object3D();
const color = new THREE.Color();

// Building material: draws windows procedurally from world position, so every
// building gets correctly-sized windows no matter how tall it is.
function makeBuildingMaterial() {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNormal;',
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 wp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp;
        #endif
        wp = modelMatrix * wp;
        vWPos = wp.xyz;
        vWNormal = normalize(mat3(modelMatrix) * objectNormal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNormal;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        if (abs(vWNormal.y) < 0.5) {
          float u = abs(vWNormal.x) > 0.5 ? vWPos.z : vWPos.x;
          float v = vWPos.y;
          float fu = fract(u / 2.6);
          float fv = fract(v / 3.4);
          float win = step(0.22, fu) * step(fu, 0.78) * step(0.28, fv) * step(fv, 0.82) * step(3.0, v);
          vec2 cell = floor(vec2(u / 2.6, v / 3.4)) + floor(vWPos.xz / 50.0);
          float rnd = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
          vec3 glass = mix(vec3(0.20, 0.28, 0.38), vec3(0.55, 0.70, 0.82), step(0.7, rnd));
          glass = mix(glass, vec3(1.0, 0.86, 0.58), step(0.93, rnd));
          diffuseColor.rgb = mix(diffuseColor.rgb, glass, win * 0.9);
          // darker ground floor band
          diffuseColor.rgb *= mix(0.78, 1.0, step(3.0, v));
        } else if (vWNormal.y > 0.5) {
          diffuseColor.rgb *= 0.72;
        }`,
      );
  };
  mat.customProgramCacheKey = () => 'dronefall-buildings';
  return mat;
}

function Buildings() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(makeBuildingMaterial, []);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  useLayoutEffect(() => {
    const mesh = ref.current!;
    city.buildings.forEach((b, i) => {
      tmp.position.set(b.x, b.h / 2, b.z);
      tmp.scale.set(b.w, b.h, b.d);
      tmp.rotation.set(0, 0, 0);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
      mesh.setColorAt(i, color.set(b.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, city.buildings.length]}
      castShadow
      receiveShadow
    />
  );
}

function Boxes({
  items,
  color: c,
  roughness = 0.9,
  shadows = true,
}: {
  items: { x: number; y: number; z: number; w: number; h: number; d: number }[];
  color: string;
  roughness?: number;
  shadows?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    items.forEach((b, i) => {
      tmp.position.set(b.x, b.y + b.h / 2, b.z);
      tmp.scale.set(b.w, b.h, b.d);
      tmp.rotation.set(0, 0, 0);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow={shadows} receiveShadow>
      <boxGeometry />
      <meshStandardMaterial color={c} roughness={roughness} />
    </instancedMesh>
  );
}

function Trees() {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    city.trees.forEach((t, i) => {
      tmp.rotation.set(0, 0, 0);
      tmp.position.set(t.x, 0.35 + 1 * t.s, t.z);
      tmp.scale.set(t.s, t.s, t.s);
      tmp.updateMatrix();
      trunks.current!.setMatrixAt(i, tmp.matrix);
      tmp.position.set(t.x, 0.35 + 3.3 * t.s, t.z);
      tmp.updateMatrix();
      crowns.current!.setMatrixAt(i, tmp.matrix);
      crowns.current!.setColorAt(i, color.set(i % 3 === 0 ? '#5f9e4f' : i % 3 === 1 ? '#4c8a45' : '#73ac5a'));
    });
    trunks.current!.instanceMatrix.needsUpdate = true;
    crowns.current!.instanceMatrix.needsUpdate = true;
    if (crowns.current!.instanceColor) crowns.current!.instanceColor.needsUpdate = true;
    trunks.current!.computeBoundingSphere();
    crowns.current!.computeBoundingSphere();
  }, []);
  return (
    <>
      <instancedMesh ref={trunks} args={[undefined, undefined, city.trees.length]} castShadow>
        <cylinderGeometry args={[0.18, 0.25, 2, 6]} />
        <meshStandardMaterial color="#7a5a3a" />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, city.trees.length]} castShadow>
        <coneGeometry args={[1.5, 3.6, 7]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
    </>
  );
}

export function City() {
  const sidewalks = useMemo(
    () => city.blocks.map((b) => ({ x: b.x, y: 0, z: b.z, w: b.w, h: 0.25, d: b.d })),
    [],
  );
  const parks = useMemo(
    () => city.parks.map((p) => ({ x: p.x, y: 0.25, z: p.z, w: p.w, h: 0.1, d: p.d })),
    [],
  );
  const roof = useMemo(
    () => city.roofDetails.map((r) => ({ x: r.x, y: r.y, z: r.z, w: r.w, h: r.h, d: r.d })),
    [],
  );
  const antennas = useMemo(
    () => city.antennas.map((a) => ({ x: a.x, y: a.y, z: a.z, w: 0.25, h: a.h, d: 0.25 })),
    [],
  );
  // Dashed centre lines on every road
  const dashes = useMemo(() => {
    const out: { x: number; y: number; z: number; w: number; h: number; d: number }[] = [];
    const span = HALF + 10;
    for (const c of city.roadCenters) {
      for (let t = -span; t < span; t += 6) {
        // skip intersections
        if (city.roadCenters.some((rc) => Math.abs(rc - t) < ROAD / 2 + 1)) continue;
        out.push({ x: c, y: 0.01, z: t, w: 0.25, h: 0.02, d: 2.6 });
        out.push({ x: t, y: 0.01, z: c, w: 2.6, h: 0.02, d: 0.25 });
      }
    }
    return out;
  }, []);

  return (
    <group>
      {/* asphalt */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[GRID * PITCH * 4, GRID * PITCH * 4]} />
        <meshStandardMaterial color="#454b54" roughness={1} />
      </mesh>
      <Boxes items={sidewalks} color="#b9bec4" shadows={false} />
      <Boxes items={parks} color="#79b35f" shadows={false} />
      <Boxes items={dashes} color="#f2f2e6" shadows={false} />
      <Buildings />
      <Boxes items={roof} color="#8e949b" roughness={0.6} />
      <Boxes items={antennas} color="#d9dde2" roughness={0.4} />
      <Trees />
    </group>
  );
}
