import { Vector3 } from 'three';
import { create } from 'zustand';
import type { Building, Pickup } from './city';

export type Order = {
  pickup: Pickup;
  drop: Building;
  timeLimit: number;
  timeLeft: number;
};

export type Phase = 'menu' | 'playing' | 'paused' | 'over';

// Fast-changing game state lives in a plain mutable object, updated every frame
// without causing React re-renders. React only re-renders on phase changes / toasts.
export const game = {
  pos: new Vector3(0, 2, 0),
  vel: new Vector3(),
  yaw: 0,
  yawVel: 0,
  tiltX: 0,
  tiltZ: 0,
  throttle: 0, // 0..1, drives rotor sound + spin
  battery: 100,
  hull: 100,
  carrying: false,
  order: null as Order | null,
  objProgress: 0, // 0..1 hold progress in a pickup/drop zone
  charging: false,
  grounded: false,
  falling: false,
  wind: new Vector3(),
  windBase: new Vector3(),
  windTarget: new Vector3(),
  windTimer: 0,
  score: 0,
  deliveries: 0,
  streak: 0,
  failed: 0,
  elapsed: 0,
  shake: 0,
  camFar: false,
};

export function resetGame() {
  game.pos.set(0, 1.2, 0);
  game.vel.set(0, 0, 0);
  game.yaw = 0;
  game.yawVel = 0;
  game.tiltX = 0;
  game.tiltZ = 0;
  game.throttle = 0;
  game.battery = 100;
  game.hull = 100;
  game.carrying = false;
  game.order = null;
  game.objProgress = 0;
  game.charging = false;
  game.grounded = true;
  game.falling = false;
  game.wind.set(0, 0, 0);
  game.windBase.set(0, 0, 0);
  game.windTarget.set(0, 0, 0);
  game.windTimer = 0;
  game.score = 0;
  game.deliveries = 0;
  game.streak = 0;
  game.failed = 0;
  game.elapsed = 0;
  game.shake = 0;
}

export type Toast = { id: number; text: string; tone: 'good' | 'bad' | 'info' };

type Store = {
  phase: Phase;
  best: number;
  result: { score: number; deliveries: number; reason: string; newBest: boolean } | null;
  toasts: Toast[];
  setPhase: (p: Phase) => void;
  finish: (reason: string) => void;
  toast: (text: string, tone?: Toast['tone']) => void;
};

function loadBest(): number {
  try {
    return Number(localStorage.getItem('dronefall-best') || 0);
  } catch {
    return 0;
  }
}

let toastId = 0;

export const useStore = create<Store>((set, get) => ({
  phase: 'menu',
  best: loadBest(),
  result: null,
  toasts: [],
  setPhase: (phase) => set({ phase }),
  finish: (reason) => {
    const best = get().best;
    const newBest = game.score > best;
    if (newBest) {
      try {
        localStorage.setItem('dronefall-best', String(game.score));
      } catch {
        /* storage unavailable */
      }
    }
    set({
      phase: 'over',
      best: Math.max(best, game.score),
      result: { score: game.score, deliveries: game.deliveries, reason, newBest },
    });
  },
  toast: (text, tone = 'info') => {
    const id = ++toastId;
    set({ toasts: [...get().toasts, { id, text, tone }].slice(-3) });
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 2200);
  },
}));
