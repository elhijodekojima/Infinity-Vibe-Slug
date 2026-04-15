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
  /** Screen width (reference). */
  SCREEN_WIDTH: 480,
} as const;

export const PLAYER = {
  /** Collision AABB width (narrower than the sprite for forgiving hits). */
  WIDTH: 14,
  /** Collision AABB height. */
  HEIGHT: 28,
  /** Visual sprite width. (Reduced from 64 to 34 to match tank size). */
  SPRITE_W: 34,
  /** Visual sprite height. */
  SPRITE_H: 35,
  /** Visual offset X. Shifts the sprite quad horizontally from the feet. */
  SPRITE_OFFSET_X: 0,
  /**
   * Visual offset Y. 0 aligns mesh.bottom with feet (ground). Use positive
   * values to lift the sprite (useful if the sheet has bottom padding),
   * negative values to sink it below ground line. With the current
   * 1180×194 idle sheet the feet touch the bottom of each frame, so 0 is
   * correct — any negative value sinks the character into the floor.
   */
  SPRITE_OFFSET_Y: 0,
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
    FIRE_HEIGHT_OFFS: 16,
    CANNON_HEIGHT_OFFS: 6,
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
    INTERVAL: 0.66,
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
  /** Base probability per kill (0-1). Reduced from 0.15 for dynamic scaling. */
  BASE_CHANCE: 0.1,
  /** Minimum chance even at low pressure. */
  MIN_CHANCE: 0.05,
  /** Absolute cap for drop chance. */
  MAX_CHANCE: 0.35,
  /** Pressure multiplier for drop chance. */
  PRESSURE_MULT: 0.25,
  /** Progressive pity boost per kill without drop. */
  PITY_BOOST: 0.02,
  /** Forced drop after this many kills without one. */
  PITY_THRESHOLD: 20,
  POOL_CAPACITY: 8,
  GRENADE_AMOUNT: 5,
} as const;

export const DIRECTOR = {
  /** Radius around player to count enemies for pressure (world units). */
  PRESSURE_RADIUS: 200,
  /** How often to update the director state (seconds). */
  UPDATE_INTERVAL: 0.5,
  /** Min phase duration. */
  PHASE_MIN_DURATION: 15,
  /** Max phase duration. */
  PHASE_MAX_DURATION: 30,
  
  /** Weights for pressure calculation. */
  WEIGHTS: {
    ENEMIES_NEARBY: 0.4,
    TIME_SINCE_DROP: 0.3,
    LOW_AMMO: 0.6,
    DANGER: 0.8,
  },

  /** Performance coupling multipliers. */
  DOMINATING: {
    SPAWN_MULT: 1.3,
    DROP_MULT: 0.7,
  },
  STRUGGLING: {
    SPAWN_MULT: 0.8,
    DROP_MULT: 1.5,
  }
} as const;

export type SpawnPhase = 'pressure' | 'swarm' | 'mixed' | 'fake_breather';

// --- Combat Context Layer ---
export type TerrainIntent = "flat" | "vertical" | "choke_low" | "high_ground" | "chaotic";

export interface CombatContext {
  phase: SpawnPhase;
  terrainIntent: TerrainIntent;
  pressure: number;
  enemyDensity: number;
  playerState: {
    hasSpecialWeapon: boolean;
    ammoRatio: number;
  };
}

export const COMBAT_CONTEXT = {
  UPDATE_INTERVAL: 0.25, // seconds
} as const;

export const TERRAIN_INTENT_WEIGHTS: Record<TerrainIntent, Partial<Record<string, number>>> = {
  flat: {},
  vertical: { helicopter: 1.6, shield: 1.3 },
  choke_low: { tank: 1.5, shield: 1.2 },
  high_ground: { tank: 1.5, helicopter: 0.7 },
  chaotic: { soldier: 1.5, shotgunBias: 1.5 },
};

export const DROP_CONTEXT_MOD: Record<TerrainIntent, Partial<Record<string, number>>> = {
  flat: {},
  vertical: {},
  chaotic: { shotgun: 1.5 },
  choke_low: { rocket: 1.3 },
  high_ground: { rocket: 1.2 },
};
// -----------------------------


export const SPAWN = {
  RATE_START: 0.4,
  GROWTH: 0.01,
  RATE_CAP: 4,
  INITIAL_DELAY: 1.5,
  
  PHASES: {
    pressure: {
      rateMult: 0.8,
      weights: { soldier: 0.4, shield: 0.4, tank: 0.15, helicopter: 0.05 }
    },
    swarm: {
      rateMult: 1.4,
      weights: { soldier: 0.9, shield: 0.08, tank: 0.01, helicopter: 0.01 }
    },
    mixed: {
      rateMult: 1.0,
      weights: { soldier: 0.7, shield: 0.2, tank: 0.07, helicopter: 0.03 }
    },
    fake_breather: {
      rateMult: 0.6,
      weights: { soldier: 0.6, shield: 0.2, tank: 0.1, helicopter: 0.1 }
    }
  } as Record<SpawnPhase, { rateMult: number, weights: Record<string, number> }>
} as const;

export const GRENADE = {
  SIZE: 4,
  GRAVITY: -560,
  THROW_VX: 120,
  THROW_VY: 200,
  POOL_CAPACITY: 16,
  EXPLOSION_RADIUS: 32,
  COOLDOWN: 1.5,
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

export type ObstacleType = 'none' | 'single' | 'stair' | 'swarm' | 'valley' | 'hill' | 'fortress';

export const OBSTACLE = {
  /** Distance between patterns (world units). 1.5 - 3 screen widths. */
  MIN_GAP: 700,
  MAX_GAP: 1200,
  
  /** Platform dimensions. */
  PLATFORM: {
    WIDTH_MIN: 120,
    WIDTH_MAX: 180,
    HEIGHT: 8,
    JUMP_HEIGHT: 60, // Standard height reachable in one jump
  },

  /** Slope transitions. */
  TERRAIN: {
    SLOPE_WIDTH: 60,
    MAX_HEIGHT_DIFF: 40,
  },

  /** Weighted selection. */
  WEIGHTS: {
    single: 0.35,
    stair: 0.2,
    valley: 0.1,
    hill: 0.1,
    swarm: 0.1,
    fortress: 0.15,
  } as Record<Exclude<ObstacleType, 'none'>, number>,

  /** Soldier AI. */
  AI: {
    JUMP_DELAY_MIN: 0.3,
    JUMP_DELAY_MAX: 0.7,
    EDGE_STOP_MARGIN: 10,
  }
} as const;

// Helper to map ObstacleType to TerrainIntent
export const OBSTACLE_TO_INTENT: Record<Exclude<ObstacleType, 'none'>, TerrainIntent> = {
  single: 'flat',
  stair: 'vertical',
  valley: 'choke_low',
  hill: 'high_ground',
  swarm: 'chaotic',
  fortress: 'high_ground'
};


