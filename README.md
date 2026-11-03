<div align="center">

<img src="public/favicon.svg" width="96" alt="Dronefall logo" />

# 🚁 Dronefall

**Grab the parcel. Beat the clock. Don't run out of battery.**

A low-poly 3D drone delivery game that runs right in your browser.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-R3F-000000?logo=threedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Zustand](https://img.shields.io/badge/state-Zustand-433E38)

</div>

---

## ✨ Features

- 🏙️ **Procedural city**: seeded buildings, parks, pickup points and charging pads
- 📦 **Timed deliveries**: fly parcels to rooftops before the clock runs out
- 🔋 **Battery management**: land on chargers before you drop out of the sky
- 🌬️ **Rising wind**: every delivery makes the wind stronger
- 🔥 **Streaks and time bonuses** for fast, back-to-back deliveries
- 📱 **Touch controls** on phones and tablets
- 🎨 **No asset files**: every model and sound is generated in code

## 🎮 How to play

| Key | Action |
| :---: | --- |
| <kbd>W</kbd> / <kbd>S</kbd> | Fly forward / back |
| <kbd>A</kbd> / <kbd>D</kbd> | Turn left / right |
| <kbd>Q</kbd> / <kbd>E</kbd> | Slide sideways |
| <kbd>Space</kbd> | Climb |
| <kbd>Shift</kbd> / <kbd>C</kbd> | Descend |
| <kbd>V</kbd> | Switch camera (close / far) |
| <kbd>P</kbd> / <kbd>Esc</kbd> | Pause |
| <kbd>M</kbd> | Mute |

> 📱 On phones and tablets, on-screen buttons appear instead.

### 🧭 Reading the map

| Marker | Meaning |
| --- | --- |
| 🟠 **Amber beam** | Hover low over it to pick up a parcel |
| 🔵 **Blue beam** | Drop-off: hover just above that rooftop |
| 🟢 **Green ⚡ rooftops** and the orange HQ pad | Land to recharge |

> ⚠️ Crashes damage the hull. If the **hull** or the **battery** hits 0, the run is over.

## 🚀 Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## 🗂️ Project structure

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

## 🛣️ Roadmap

- [ ] Upgrades between runs (bigger battery, faster motors, stronger frame)
- [ ] Day/night cycle with lit windows at night
- [ ] Fragile parcels that break on hard landings
- [ ] Online leaderboard
- [ ] Swap the procedural drone for a Blender / Kenney model (`.glb`)

---

<div align="center">

Made with ❤️ by [Kritika Khatri](https://github.com/kritikhatri)

</div>
