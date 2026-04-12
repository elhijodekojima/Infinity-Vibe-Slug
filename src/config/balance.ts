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
  /** Collision AABB width (narrower than the sprite for forgiving hits). */
  WIDTH: 14,
  /** Collision AABB height. */
  HEIGHT: 28,
  /** Visual sprite width — matches playerSprite.ts PLAYER_SPRITE_W. */
  SPRITE_W: 20,
  /** Visual sprite height — matches playerSprite.ts PLAYER_SPRITE_H. */
  SPRITE_H: 32,
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
  /** Damage per player bullet hit. Soldiers/shields die on a single hit. */
  BULLET_DAMAGE: 1,
  /** Damage per explosion (grenade / rocket) — tanks take ~3 explosions. */
  EXPLOSION_DAMAGE: 4,

  SOLDIER: {
    WIDTH: 12,
    HEIGHT: 26,
    SPEED: 35,
    HESITATE_CHANCE: 0.35,
    HP: 1,
    SCORE: 100,
    BLOCKS_FRONTAL_BULLETS: false,
    POOL_CAPACITY: 128,
  },

  /**
   * Shield soldier. Slower than the raso, blocks frontal bullets, does
   * NOT jump on platforms. The GDD calls it out as the glue that lets
   * lesser enemies accumulate behind it for satisfying grenade payoffs.
   */
  SHIELD: {
    WIDTH: 14,
    HEIGHT: 28,
    SPEED: 22,
    HESITATE_CHANCE: 0.2,
    HP: 1,
    SCORE: 200, // 2X the soldier
    BLOCKS_FRONTAL_BULLETS: true,
    POOL_CAPACITY: 32,
  },

  /**
   * Tank (tanqueta). Big, slow, tanky (12 HP). One-shots the player on
   * contact and eats ~3 explosions to die. Rolling-ball projectile will
   * land in a later milestone.
   */
  TANK: {
    WIDTH: 36,
    HEIGHT: 22,
    SPEED: 15,
    HESITATE_CHANCE: 0.1,
    HP: 12,
    SCORE: 500, // 5X the soldier
    BLOCKS_FRONTAL_BULLETS: false,
    POOL_CAPACITY: 8,
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

  /**
   * Enemy-type probability distribution. Linearly slides from TYPE_START
   * at t=0 to TYPE_CAP at t=TYPE_RAMP_TIME seconds, then stays locked.
   * Each entry is a probability in [0,1]; the three entries must sum to 1
   * at both endpoints.
   *
   * Shape matches the GDD:
   *   - Early game is full of raso soldiers, tanks are a rare surprise.
   *   - Late game has 2× more shields and 10× more tanks.
   */
  TYPE_RAMP_TIME: 180,
  TYPE_START: { soldier: 0.90, shield: 0.09, tank: 0.01 },
  TYPE_CAP:   { soldier: 0.70, shield: 0.20, tank: 0.10 },
} as const;

// ---------------------------------------------------------------------------
// Grenades + explosions
// ---------------------------------------------------------------------------

/**
 * Throwable grenades — parabolic arc with gravity.
 *
 * With THROW_VX=120, THROW_VY=200, GRAVITY=-560 and muzzle at y≈75 (a bit
 * above ground at 60), the grenade:
 *   - peaks ~36 units above the muzzle (~111 world y),
 *   - lands ~94 units to the right of the muzzle,
 *   - total flight time ~0.78s.
 * That's a satisfying, clearly-readable arc at the game's scale.
 */
export const GRENADE = {
  SIZE: 4,
  GRAVITY: -560,
  THROW_VX: 120,
  THROW_VY: 200,
  POOL_CAPACITY: 16,
  /** Radius of the AoE damage sphere on detonation. */
  EXPLOSION_RADIUS: 32,
} as const;

export const EXPLOSION = {
  /** Lifetime of the visual flash (seconds). */
  DURATION: 0.35,
  POOL_CAPACITY: 16,
} as const;

// ---------------------------------------------------------------------------
// Melee
// ---------------------------------------------------------------------------

/**
 * GDD:
 *   "Si el jugador colisiona con un enemigo y efectúa un disparo no se
 *    dispara el arma, si no que el sprite realiza un ataque cuerpo a cuerpo
 *    (ahorrando una bala si el jugador llevaba armas con munición finita)."
 *
 * Melee has PRIORITY over bullets: when the player presses fire within
 * knife range, the melee triggers instead of the gun. This:
 *   - Saves ammo (critical for finite-ammo drops later).
 *   - Bypasses shield immunity (knife ignores `blocksFrontalBullets`).
 *   - Creates clutch survival moments (knife the enemy about to kill you).
 */
export const MELEE = {
  /**
   * Extra horizontal reach beyond the player's right edge (world units).
   * With REACH = 12, the safe knife zone (melee range minus death range)
   * is ~12 units wide — at enemy speed 35 u/s that's ~0.34 s of reaction
   * window. Enough for mashing but not trivially safe.
   */
  REACH: 12,
  /** Damage per melee hit. Kills 1-HP enemies; chips tanks (2/12 per hit). */
  DAMAGE: 2,
  /** Minimum seconds between consecutive melee hits (~6.6 hits/sec). */
  COOLDOWN: 0.15,
} as const;
