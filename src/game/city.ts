import { BLOCK, GRID, PITCH, ROAD } from './config';

export type Building = {
  id: number;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
  address: string;
  charger: boolean;
};

export type Rect = { x: number; z: number; w: number; d: number };

export type Pickup = { id: number; x: number; z: number; name: string; corner: string };

export type Tree = { x: number; z: number; s: number };

export type RoofDetail = { x: number; y: number; z: number; w: number; h: number; d: number };

export type City = {
  buildings: Building[];
  blocks: Rect[];
  parks: Rect[];
  trees: Tree[];
  pickups: Pickup[];
  roofDetails: RoofDetail[];
  antennas: { x: number; y: number; z: number; h: number }[];
  depot: { x: number; z: number };
  roadCenters: number[];
};

// Small seeded random generator so the city is the same every time
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STREETS_NS = ['Maple', 'Juniper', 'Cedar', 'Willow', 'Aspen', 'Birch', 'Hazel', 'Rowan', 'Alder', 'Linden'];
const STREETS_EW = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
const SHOPS = [
  'Noodle Bar', 'Pharmacy', 'Bookshop', 'Bakery', 'Flower Stall', 'Tech Store', 'Pizza Place',
  'Tea House', 'Hardware Store', 'Taco Truck', 'Record Shop', 'Pet Store', 'Dumpling Kitchen',
  'Bike Repair', 'Grocery', 'Sushi Counter', 'Toy Shop', 'Post Office', 'Juice Bar', 'Laundromat',
];

const PALETTE = [
  '#e8d5b7', '#f2b880', '#e57a63', '#9ec1cf', '#b8c99d', '#d4a5a5', '#c9b6e4', '#f6e7a1',
  '#a3c4bc', '#e9c46a', '#f4a261', '#8ecae6', '#cdb4db', '#ffc8a2', '#bde0fe', '#d8e2dc',
];

let cached: City | null = null;

export function getCity(): City {
  if (!cached) cached = generateCity(20261103);
  return cached;
}

function generateCity(seed: number): City {
  const rand = mulberry32(seed);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const center = (GRID - 1) / 2;

  const buildings: Building[] = [];
  const blocks: Rect[] = [];
  const parks: Rect[] = [];
  const trees: Tree[] = [];
  const roofDetails: RoofDetail[] = [];
  const antennas: City['antennas'] = [];

  const blockCenter = (i: number) => (i - center) * PITCH;

  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const cx = blockCenter(i);
      const cz = blockCenter(j);
      blocks.push({ x: cx, z: cz, w: BLOCK, d: BLOCK });
      const ring = Math.max(Math.abs(i - center), Math.abs(j - center));

      const isDepot = i === center && j === center;
      const isPark = isDepot || (ring > 1 && rand() < 0.09);
      if (isPark) {
        parks.push({ x: cx, z: cz, w: BLOCK - 3, d: BLOCK - 3 });
        const count = isDepot ? 10 : 16;
        for (let t = 0; t < count; t++) {
          const tx = cx + (rand() - 0.5) * (BLOCK - 6);
          const tz = cz + (rand() - 0.5) * (BLOCK - 6);
          // keep the depot pad clear
          if (isDepot && Math.hypot(tx - cx, tz - cz) < 8) continue;
          trees.push({ x: tx, z: tz, s: 0.8 + rand() * 0.7 });
        }
        continue;
      }

      // Split the block into 1, 2 or 4 lots
      const r = rand();
      const splitsX = r < 0.3 ? 1 : 2;
      const splitsZ = r < 0.55 ? 1 : 2;
      const lotW = BLOCK / splitsX;
      const lotD = BLOCK / splitsZ;

      for (let a = 0; a < splitsX; a++) {
        for (let b = 0; b < splitsZ; b++) {
          const lx = cx - BLOCK / 2 + lotW * (a + 0.5);
          const lz = cz - BLOCK / 2 + lotD * (b + 0.5);
          const margin = 2.2;
          const w = lotW - margin * 2 - rand() * 3;
          const d = lotD - margin * 2 - rand() * 3;

          let h: number;
          if (ring <= 1) h = 30 + rand() * 34;
          else if (ring === 2) h = 16 + rand() * 26;
          else h = 7 + rand() * 17;
          h = Math.round(h);

          const street = `${STREETS_NS[i]} ${i % 2 ? 'Ave' : 'St'}`;
          const number = 10 + Math.floor(rand() * 180);
          const bld: Building = {
            id: buildings.length,
            x: lx,
            z: lz,
            w,
            d,
            h,
            color: pick(PALETTE),
            address: `${number} ${street}`,
            charger: false,
          };
          buildings.push(bld);

          // rooftop clutter in the corners (keeps the middle clear for landing pads)
          const units = 1 + Math.floor(rand() * 3);
          for (let u = 0; u < units; u++) {
            const sx = rand() < 0.5 ? -1 : 1;
            const sz = rand() < 0.5 ? -1 : 1;
            const uw = 1.2 + rand() * 1.4;
            const ud = 1.2 + rand() * 1.4;
            roofDetails.push({
              x: lx + sx * (w / 2 - uw / 2 - 0.6),
              z: lz + sz * (d / 2 - ud / 2 - 0.6),
              y: h,
              w: uw,
              d: ud,
              h: 0.8 + rand() * 1.2,
            });
          }
          if (h > 40 && rand() < 0.6) {
            antennas.push({ x: lx + w * 0.3, z: lz - d * 0.3, y: h, h: 6 + rand() * 8 });
          }
        }
      }
    }
  }

  // Pick charging rooftops spread across the city (one per quadrant + extras)
  const quadrants = [
    [-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0],
  ];
  for (const [qx, qz] of quadrants) {
    const tx = qx * PITCH * 2.4;
    const tz = qz * PITCH * 2.4;
    let best: Building | null = null;
    let bestD = Infinity;
    for (const b of buildings) {
      if (b.charger || b.h > 36 || b.w < 9 || b.d < 9) continue;
      const dd = Math.hypot(b.x - tx, b.z - tz);
      if (dd < bestD) {
        bestD = dd;
        best = b;
      }
    }
    if (best) best.charger = true;
  }

  // Pickup points sit in road intersections (street level)
  const roadCenters: number[] = [];
  for (let k = 0; k < GRID - 1; k++) roadCenters.push(blockCenter(k) + PITCH / 2);

  const pickups: Pickup[] = [];
  const shops = [...SHOPS];
  for (let k = 0; k < 20 && shops.length; k++) {
    const ix = Math.floor(rand() * roadCenters.length);
    const iz = Math.floor(rand() * roadCenters.length);
    const x = roadCenters[ix];
    const z = roadCenters[iz];
    if (pickups.some((p) => p.x === x && p.z === z)) continue;
    const name = shops.splice(Math.floor(rand() * shops.length), 1)[0];
    pickups.push({
      id: pickups.length,
      x,
      z,
      name,
      corner: `${STREETS_NS[ix]} & ${STREETS_EW[iz]}`,
    });
  }

  return {
    buildings,
    blocks,
    parks,
    trees,
    pickups,
    roofDetails,
    antennas,
    depot: { x: 0, z: 0 },
    roadCenters,
  };
}

export const ROAD_WIDTH = ROAD;
