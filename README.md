# Dronefall

A low-poly 3D delivery game that runs in the browser. Pick up parcels around the city, fly them to rooftops before the timer runs out, and land on charging pads before your battery dies. The wind gets stronger with every delivery.

Built with **React Three Fiber** (Three.js), **TypeScript**, **Zustand** and **Vite**. All graphics and sounds are generated in code, so there are no asset files to download.

## How to play

| Key | Action |
| --- | --- |
| W / S | Fly forward / back |
| A / D | Turn left / right |
| Q / E | Slide sideways |
| Space | Climb |
| Shift / C | Descend |
| V | Switch camera (close / far) |
| P / Esc | Pause |
| M | Mute |

On phones and tablets, on-screen buttons appear instead.

- **Amber beam**: hover low over it to pick up a parcel.
- **Blue beam**: fly the parcel there and hover just above the rooftop.
- **Green ⚡ rooftops** (and the orange HQ pad): land to recharge.
- Fast deliveries earn time bonuses. Back-to-back deliveries build a streak.
- Crashes damage the hull. If the hull or the battery hits 0, the run is over.

## Running locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Project structure

```
src/
├── game/
│   ├── config.ts     # all tuning numbers (speed, battery drain, wind…)
│   ├── city.ts       # seeded procedural city: buildings, parks, pickups, chargers
│   ├── logic.ts      # flight physics, collisions, battery, orders, wind
│   ├── state.ts      # per-frame game state + Zustand store for UI
│   ├── input.ts      # keyboard + touch input
│   └── sfx.ts        # Web Audio synthesised sounds
├── components/       # 3D scene: City, Drone (+ camera), Markers, WindStreaks
└── ui/               # HUD with minimap, menus, touch controls
```

## Ideas for next steps

- Upgrades between runs (bigger battery, faster motors, stronger frame)
- Day/night cycle with lit windows at night
- Fragile parcels that break on hard landings
- Online leaderboard
- Swap the procedural drone for a Blender / Kenney model (`.glb`)
