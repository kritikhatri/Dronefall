// Tuning values for Dronefall. Tweak these to change how the game feels.

// City layout
export const GRID = 9; // blocks per side
export const BLOCK = 30; // block size (metres)
export const ROAD = 12; // road width
export const PITCH = BLOCK + ROAD;
export const HALF = (GRID * PITCH) / 2; // half the city width
export const WORLD_LIMIT = HALF + 20; // invisible wall around the city

// Drone flight
export const DRONE_RADIUS = 0.9;
export const ACCEL = 30; // horizontal thrust
export const DRAG = 1.35; // higher = lower top speed, snappier stops
export const VERT_ACCEL = 22;
export const VERT_DRAG = 2.6;
export const TURN_RATE = 2.3; // radians per second
export const CEILING = 80; // max altitude
export const CARRY_PENALTY = 0.85; // thrust multiplier while carrying a parcel

// Damage
export const CRASH_SPEED = 7; // impacts faster than this hurt
export const CRASH_DAMAGE = 4.5; // hull damage per m/s above CRASH_SPEED

// Battery (percent per second)
export const DRAIN_BASE = 0.75;
export const DRAIN_THRUST = 0.45;
export const DRAIN_CLIMB = 0.5;
export const DRAIN_CARRY = 0.3;
export const CHARGE_RATE = 16;
export const DELIVERY_BATTERY_BONUS = 6;

// Deliveries
export const HOLD_TIME = 0.6; // seconds to hover in a zone to pick up / drop off
export const PICKUP_RADIUS = 3.6;
export const DROP_RADIUS = 3.2;
export const ORDER_SPEED = 9.5; // assumed m/s when setting the time limit
export const ORDER_GRACE = 16; // extra seconds on every order

// Wind
export const WIND_BASE = 1.2;
export const WIND_PER_DELIVERY = 0.45;
export const WIND_MAX = 9;
export const WIND_FORCE = 0.65; // how strongly wind pushes the drone
