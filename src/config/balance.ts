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
  /** Speed while crouching (halved). */
  CROUCH_MOVE_SPEED: 45,
  /** Initial upward velocity on jump (units / second). */
  JUMP_VELOCITY: 330,
  /** Gravity in units / second^2. */
  GRAVITY: -620,
  /** Speed of aiming transition (radians / sec). ~0.15s to reach 90deg. */
  AIM_SPEED: 10,
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
  BULLET_DAMAGE: 1, // Default damage; overridden by weapon damage.
  /** Damage per explosion (grenade / rocket) — tanks take ~3 explosions. */
  EXPLOSION_DAMAGE: 4,

  SOLDIER: {
    WIDTH: 12,
    HEIGHT: 26,
    SPEED: 45,          // Half of PLAYER.MOVE_SPEED (90)
    HESITATE_CHANCE: 0.35,
    HP: 1,
    SCORE: 100,
    BLOCKS_FRONTAL_BULLETS: false,
    POOL_CAPACITY: 128,
    IS_MELEE_IMMUNE: false,
  },

  /**
   * Shield soldier. Slower than the raso, blocks frontal bullets.
   */
  SHIELD: {
    WIDTH: 14,
    HEIGHT: 28,
    SPEED: 34,          // 25% slower than SOLDIER (45 * 0.75 ≈ 34)
    HESITATE_CHANCE: 0.2,
    HP: 1,
    SCORE: 200,
    BLOCKS_FRONTAL_BULLETS: true,
    POOL_CAPACITY: 32,
    IS_MELEE_IMMUNE: false,
  },

  /**
   * Tank (tanqueta). Big, slow, tanky (12 HP).
   */
  TANK: {
    WIDTH: 54,
    HEIGHT: 33,
    SPEED: 12,          // Always advancing, very slow
    HESITATE_CHANCE: 0.0, // Tank never hesitates — always rolls forward
    HP: 12,
    SCORE: 500,
    BLOCKS_FRONTAL_BULLETS: false,
    POOL_CAPACITY: 8,
    IS_MELEE_IMMUNE: true,
  },

  /**
   * Helicopter. High altitude, inert movements, drops bombs.
   */
  HELICOPTER: {
    WIDTH: 54,  // Same as Tank
    HEIGHT: 33, // Same as Tank
    FLY_HEIGHT: 270,  // Above max jump height (~148 from ground): JUMP_V²/(2·G) = 330²/1240 ≈ 88 + GROUND_Y 60 = 148
    SPEED: 85,  // Fast, similar to player
    HP: 12,     // Same as Tank — tough target
    SCORE: 1000,
    POOL_CAPACITY: 4,
  },

  BOMB: {
    SIZE: 14,           // ~Size of player head sprite (~6px → ~14 world units)
    SPEED: 200,         // Vertical fall speed
    DAMAGE: 4,
    EXPLOSION_RADIUS: 24,
  },

  CANNONBALL: {
    SIZE: 14,           // Same visible size as bomb
    SPEED: 60,
    DAMAGE: 2,
  },
} as const;

export const BULLET = {
  PLAYER: {
    WIDTH: 6,
    HEIGHT: 2,
    SPEED: 320,
    POOL_CAPACITY: 64,
  },
  ENEMY: {
    WIDTH: 4,
    HEIGHT: 4,
    SPEED: 120,
    POOL_CAPACITY: 64,
  },
} as const;

export const WEAPON = {
  PISTOL: {
    INTERVAL: 0.25,
    BULLET_SPEED: 320,
    DAMAGE: 1,
  },
  MACHINEGUN: {
    INTERVAL: 0.1,
    BULLET_SPEED: 320,
    AMMO: 200,
    DAMAGE: 1,
  },
  SHOTGUN: {
    INTERVAL: 0.8,
    BULLET_SPEED: 400,
    AMMO: 50,
    /** Tighter cone requested by user. */
    SPREAD: 0.08,
    /** Shorter range (60) requested by user. */
    RANGE: 60,
    /** Double damage (2) to kill Tank in 6 shots. */
    DAMAGE: 2,
  },
  ROCKET: {
    INTERVAL: 1.0,
    INITIAL_SPEED: 40,
    ACCELERATION: 450,
    AMMO: 20,
    DAMAGE: 1, // Not used primarily (explosion does 4).
  },
} as const;

export const DROP = {
  ITEM_SIZE: 16,
  /** Gravity while falling. */
  GRAVITY: -400,
  /** Chance to drop an item on enemy death (0-1). */
  CHANCE: 0.15,
  /** Forced drop after this many kills without one. */
  PITY_THRESHOLD: 12,
  POOL_CAPACITY: 8,
  GRENADE_AMOUNT: 5,
} as const;

/**
 * Exponential spawn rate curve.
 */
export const SPAWN = {
  RATE_START: 0.4,
  GROWTH: 0.01,
  RATE_CAP: 4,
  INITIAL_DELAY: 1.5,
  TYPE_RAMP_TIME: 180,
  TYPE_START: { soldier: 0.85, shield: 0.09, tank: 0.05, helicopter: 0.01 },
  TYPE_CAP:   { soldier: 0.65, shield: 0.20, tank: 0.10, helicopter: 0.05 },
} as const;

export const GRENADE = {
  SIZE: 4,
  GRAVITY: -560,
  THROW_VX: 120,
  THROW_VY: 200,
  POOL_CAPACITY: 16,
  EXPLOSION_RADIUS: 32,
} as const;

export const EXPLOSION = {
  DURATION: 0.35,
  POOL_CAPACITY: 16,
} as const;

export const MELEE = {
  REACH: 12,
  DAMAGE: 2,
  COOLDOWN: 1.0, // Increased to avoid spam.
  /** Short delay before the player can shoot again after a knife swipe. */
  HOLSTER_DELAY: 0.25,
} as const;
