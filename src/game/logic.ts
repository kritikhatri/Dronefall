import { Vector3 } from 'three';
import * as C from './config';
import { getCity, type Building } from './city';
import { readControls } from './input';
import { game, useStore, type Order } from './state';
import { sfx } from './sfx';

const city = getCity();
const n = new Vector3();
let lastWarn = 0;
let chargeBeep = 0;
let landedOn: Building | null = null;

const toast = (text: string, tone?: 'good' | 'bad' | 'info') => useStore.getState().toast(text, tone);

// ---------- Orders ----------

export function newOrder() {
  const from = game.pos;
  const pickups = city.pickups.filter((p) => Math.hypot(p.x - from.x, p.z - from.z) > 35);
  const pickup = pickups[Math.floor(Math.random() * pickups.length)];
  const drops = city.buildings.filter((b) => {
    if (b.charger || b.h > 62 || b.w < 7 || b.d < 7) return false;
    const d = Math.hypot(b.x - pickup.x, b.z - pickup.z);
    return d > 55 && d < 210;
  });
  const drop = drops[Math.floor(Math.random() * drops.length)];
  const leg1 = Math.hypot(pickup.x - from.x, pickup.z - from.z) + from.y;
  const leg2 = Math.hypot(drop.x - pickup.x, drop.z - pickup.z) + drop.h;
  // Orders get a little tighter as you deliver more
  const squeeze = Math.max(0.7, 1 - game.deliveries * 0.025);
  const timeLimit = Math.round(((leg1 + leg2) / C.ORDER_SPEED + C.ORDER_GRACE) * squeeze);
  const order: Order = { pickup, drop, timeLimit, timeLeft: timeLimit };
  game.order = order;
  game.carrying = false;
  game.objProgress = 0;
}

export function objectivePoint(out: Vector3): Vector3 | null {
  const o = game.order;
  if (!o) return null;
  if (!game.carrying) return out.set(o.pickup.x, 0.3, o.pickup.z);
  return out.set(o.drop.x, o.drop.h + 0.2, o.drop.z);
}

// ---------- Main step ----------

export function stepGame(dt: number) {
  const ctl = game.falling ? { forward: 0, turn: 0, strafe: 0, lift: 0 } : readControls();
  game.elapsed += dt;

  updateWind(dt);
  fly(dt, ctl);
  collide();
  updateBattery(dt, ctl);
  updateOrder(dt);

  game.shake = Math.max(0, game.shake - dt * 2.5);
  sfx.setRotor(game.throttle, !game.falling);

  if (game.hull <= 0) {
    game.hull = 0;
    sfx.crash(10);
    sfx.setRotor(0, false);
    useStore.getState().finish('Your drone was wrecked');
  } else if (game.falling && game.grounded) {
    sfx.setRotor(0, false);
    useStore.getState().finish('Battery ran flat');
  }
}

function fly(dt: number, ctl: ReturnType<typeof readControls>) {
  // Turning with a little smoothing so it doesn't feel twitchy
  game.yawVel += (ctl.turn * C.TURN_RATE - game.yawVel) * Math.min(1, dt * 8);
  game.yaw += game.yawVel * dt;

  const sin = Math.sin(game.yaw);
  const cos = Math.cos(game.yaw);
  const accel = C.ACCEL * (game.carrying ? C.CARRY_PENALTY : 1);

  // forward is -Z when yaw = 0
  const ax = (-sin * ctl.forward + cos * ctl.strafe) * accel;
  const az = (-cos * ctl.forward - sin * ctl.strafe) * accel;

  const v = game.vel;
  v.x += (ax + game.wind.x * C.WIND_FORCE) * dt;
  v.z += (az + game.wind.z * C.WIND_FORCE) * dt;
  const drag = Math.exp(-C.DRAG * dt);
  v.x *= drag;
  v.z *= drag;

  if (game.falling) {
    v.y -= 14 * dt;
  } else {
    v.y += ctl.lift * C.VERT_ACCEL * dt;
    v.y *= Math.exp(-C.VERT_DRAG * dt);
  }

  game.pos.addScaledVector(v, dt);

  // Soft world edges and ceiling
  const p = game.pos;
  if (Math.abs(p.x) > C.WORLD_LIMIT) {
    p.x = Math.sign(p.x) * C.WORLD_LIMIT;
    v.x *= -0.4;
    if (game.elapsed - lastWarn > 2) {
      toast('Leaving delivery zone — turn back', 'info');
      lastWarn = game.elapsed;
    }
  }
  if (Math.abs(p.z) > C.WORLD_LIMIT) {
    p.z = Math.sign(p.z) * C.WORLD_LIMIT;
    v.z *= -0.4;
    if (game.elapsed - lastWarn > 2) {
      toast('Leaving delivery zone — turn back', 'info');
      lastWarn = game.elapsed;
    }
  }
  if (p.y > C.CEILING) {
    p.y = C.CEILING;
    if (v.y > 0) v.y = 0;
  }

  // Visual tilt follows input (nose dips when flying forward)
  const tx = -0.32 * ctl.forward;
  const tz = -0.3 * ctl.strafe + 0.12 * ctl.turn * (ctl.forward !== 0 ? 1 : 0);
  game.tiltX += (tx - game.tiltX) * Math.min(1, dt * 6);
  game.tiltZ += (tz - game.tiltZ) * Math.min(1, dt * 6);

  const effort = Math.min(1, Math.abs(ctl.forward) * 0.6 + Math.abs(ctl.strafe) * 0.4 + Math.max(0, ctl.lift) * 0.7);
  game.throttle += (effort - game.throttle) * Math.min(1, dt * 5);
}

function hit(speed: number) {
  if (speed < C.CRASH_SPEED) return;
  const dmg = (speed - C.CRASH_SPEED) * C.CRASH_DAMAGE;
  game.hull -= dmg;
  game.shake = Math.min(1, 0.3 + dmg / 25);
  game.streak = 0;
  sfx.crash(speed);
  toast(`Crash! −${Math.round(dmg)}% hull`, 'bad');
}

function collide() {
  const p = game.pos;
  const v = game.vel;
  const r = C.DRONE_RADIUS;
  game.grounded = false;
  landedOn = null;

  for (const b of city.buildings) {
    const minX = b.x - b.w / 2;
    const maxX = b.x + b.w / 2;
    const minZ = b.z - b.d / 2;
    const maxZ = b.z + b.d / 2;
    // cheap reject
    if (p.x < minX - r || p.x > maxX + r || p.z < minZ - r || p.z > maxZ + r || p.y > b.h + r) continue;

    const cx = Math.min(Math.max(p.x, minX), maxX);
    const cy = Math.min(Math.max(p.y, 0), b.h);
    const cz = Math.min(Math.max(p.z, minZ), maxZ);
    n.set(p.x - cx, p.y - cy, p.z - cz);
    let dist = n.length();
    if (dist >= r) continue;

    if (dist < 1e-5) {
      // Centre is inside the box: push out the shortest way
      const pen = [
        [p.x - minX, -1, 0, 0],
        [maxX - p.x, 1, 0, 0],
        [maxZ - p.z, 0, 0, 1],
        [p.z - minZ, 0, 0, -1],
        [b.h - p.y, 0, 1, 0],
      ].sort((a, c) => a[0] - c[0])[0];
      n.set(pen[1], pen[2], pen[3]);
      p.addScaledVector(n, pen[0] + r);
      dist = r;
    } else {
      n.divideScalar(dist);
      p.addScaledVector(n, r - dist);
    }

    const vn = v.dot(n);
    if (vn < 0) {
      hit(-vn);
      v.addScaledVector(n, -vn * 1.3);
    }
    if (n.y > 0.7) {
      game.grounded = true;
      landedOn = b;
    }
  }

  if (p.y < r) {
    p.y = r;
    if (v.y < 0) {
      hit(-v.y * 0.9);
      v.y = 0;
    }
    game.grounded = true;
    landedOn = null;
  }
  if (game.grounded) {
    // friction when resting on something
    v.x *= 0.9;
    v.z *= 0.9;
  }
}


function updateBattery(dt: number, ctl: ReturnType<typeof readControls>) {
  if (game.falling) return;
  const thrust = Math.min(1, Math.abs(ctl.forward) + Math.abs(ctl.strafe) * 0.5);
  let drain = C.DRAIN_BASE + thrust * C.DRAIN_THRUST + Math.max(0, ctl.lift) * C.DRAIN_CLIMB;
  if (game.carrying) drain += C.DRAIN_CARRY;
  game.battery -= drain * dt;

  // Charging: rest on the depot pad or a charger rooftop
  const speed = game.vel.length();
  const onDepot = Math.hypot(game.pos.x - city.depot.x, game.pos.z - city.depot.z) < 4.5 && game.pos.y < 2;
  const onCharger =
    game.grounded &&
    landedOn !== null &&
    landedOn.charger &&
    Math.hypot(game.pos.x - landedOn.x, game.pos.z - landedOn.z) < 3.8;
  game.charging = (onDepot || onCharger) && speed < 3 && game.battery < 100;
  if (game.charging) {
    game.battery = Math.min(100, game.battery + C.CHARGE_RATE * dt);
    chargeBeep -= dt;
    if (chargeBeep <= 0) {
      sfx.charge();
      chargeBeep = 0.5;
    }
  }

  if (game.battery < 20 && game.elapsed - lastWarn > 4) {
    sfx.warn();
    toast('Low battery — find a ⚡ charger', 'bad');
    lastWarn = game.elapsed;
  }

  if (game.battery <= 0) {
    game.battery = 0;
    game.falling = true;
    game.throttle = 0;
    toast('Battery dead!', 'bad');
  }
}

function updateOrder(dt: number) {
  const o = game.order;
  if (!o) return;
  o.timeLeft -= dt;
  if (o.timeLeft <= 0) {
    game.failed += 1;
    game.streak = 0;
    game.score = Math.max(0, game.score - 50);
    sfx.fail();
    toast('Order expired −50', 'bad');
    newOrder();
    return;
  }

  const p = game.pos;
  const speed = game.vel.length();
  let inZone = false;
  if (!game.carrying) {
    const d = Math.hypot(p.x - o.pickup.x, p.z - o.pickup.z);
    inZone = d < C.PICKUP_RADIUS && p.y < 3.5 && speed < 6;
  } else {
    const d = Math.hypot(p.x - o.drop.x, p.z - o.drop.z);
    inZone = d < C.DROP_RADIUS && p.y > o.drop.h && p.y - o.drop.h < 3.5 && speed < 6;
  }

  if (inZone) game.objProgress += dt / C.HOLD_TIME;
  else game.objProgress = Math.max(0, game.objProgress - dt * 2);

  if (game.objProgress >= 1) {
    game.objProgress = 0;
    if (!game.carrying) {
      game.carrying = true;
      sfx.pickup();
      toast(`Picked up from ${o.pickup.name}`, 'info');
    } else {
      game.streak += 1;
      const timeBonus = Math.round(o.timeLeft * 5);
      const streakBonus = (game.streak - 1) * 25;
      const pts = 100 + timeBonus + streakBonus;
      game.score += pts;
      game.deliveries += 1;
      game.battery = Math.min(100, game.battery + C.DELIVERY_BATTERY_BONUS);
      sfx.deliver();
      toast(`Delivered! +${pts}${game.streak > 1 ? `  (streak ×${game.streak})` : ''}`, 'good');
      newOrder();
    }
  }
}

function updateWind(dt: number) {
  game.windTimer -= dt;
  if (game.windTimer <= 0) {
    const level = Math.min(C.WIND_MAX, C.WIND_BASE + game.deliveries * C.WIND_PER_DELIVERY);
    const angle = Math.random() * Math.PI * 2;
    const strength = level * (0.6 + Math.random() * 0.4);
    const prev = game.windTarget.length();
    game.windTarget.set(Math.cos(angle) * strength, 0, Math.sin(angle) * strength);
    game.windTimer = 14 + Math.random() * 10;
    if (strength > 3 && strength - prev > 1) toast('Wind picking up 🌬', 'info');
  }
  game.windBase.lerp(game.windTarget, Math.min(1, dt * 0.4));
  // gusts on top of the steady wind
  const gust = 1 + Math.sin(game.elapsed * 1.7) * 0.25 + Math.sin(game.elapsed * 4.3) * 0.1;
  game.wind.copy(game.windBase).multiplyScalar(gust);
}
