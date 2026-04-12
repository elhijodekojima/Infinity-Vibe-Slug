/**
 * Centralized gameplay constants. The ONLY place balance numbers live.
 * Edit here to tune the game without touching system code.
 *
 * World coordinates are pixel-art units: the camera height is always 270,
 * the width varies with window aspect ratio (see Renderer).
 */

export const WORLD = {
  /** Reference internal resolution for ortho camera height. */
  HEIGHT: 270,
  /** Fallback width (used before first resize). */
  WIDTH: 480,
  /** Y position of the ground surface (player's feet). */
  GROUND_Y: 60,
} as const;

export const PLAYER = {
  WIDTH: 14,
  HEIGHT: 28,
  /** Horizontal move speed in world units / second. */
  MOVE_SPEED: 90,
  /** Initial upward velocity on jump (units / second). */
  JUMP_VELOCITY: 220,
  /** Gravity in units / second^2. */
  GRAVITY: -620,
  START_X: 80,
  START_GRENADES: 10,
  MAX_GRENADES: 30,
} as const;

export const SCROLL = {
  /** Base auto-scroll speed (world units / second). */
  BASE_SPEED: 20,
} as const;

export const TIMING = {
  /** Fixed simulation step (60 Hz). */
  FIXED_STEP: 1 / 60,
  /** Max sim substeps per frame — clamps spiral-of-death on tab switch. */
  MAX_SUBSTEPS: 5,
} as const;

// ---------------------------------------------------------------------------
// Combat milestone — soldado raso, balas, pistola, spawn system
// ---------------------------------------------------------------------------

export const ENEMY = {
  SOLDIER: {
    WIDTH: 12,
    HEIGHT: 26,
    /** Horizontal walking speed (world units / sec). */
    SPEED: 35,
    /** Probability (per "think tick") of pausing to hesitate. 0..1. */
    HESITATE_CHANCE: 0.35,
    /** Pool capacity — max soldiers alive at once. */
    POOL_CAPACITY: 128,
  },
} as const;

export const BULLET = {
  PLAYER: {
    WIDTH: 6,
    HEIGHT: 2,
    SPEED: 320,
    POOL_CAPACITY: 64,
  },
} as const;

export const WEAPON = {
  PISTOL: {
    /** Minimum seconds between shots. Cap on mash rate (2/sec = 0.5s). */
    INTERVAL: 0.5,
    BULLET_SPEED: 320,
  },
} as const;

/**
 * Exponential spawn rate curve. Ported straight to code:
 *   rate(t) = min(RATE_CAP, RATE_START * exp(GROWTH * t))
 * Resulting spawn interval = 1 / rate(t).
 *
 * Defaults tune like this (t in seconds, rate in spawns/sec):
 *   t=0      → 0.40/s  (one every 2.5s)
 *   t=60s    → 0.73/s  (one every 1.4s)
 *   t=120s   → 1.33/s  (one every 0.75s)
 *   t=180s   → 2.42/s  (one every 0.4s)
 *   t≥240s   → 4.00/s  (capped)
 */
export const SPAWN = {
  RATE_START: 0.4,
  GROWTH: 0.01,
  RATE_CAP: 4,
  /** Delay before the first enemy spawns after game start (seconds). */
  INITIAL_DELAY: 1.5,
} as const;

export const SCORE = {
  /** Base points (X) for a raso soldier. Shield = 2X, tank = 5X later. */
  SOLDIER: 100,
} as const;
