import { TextureLoader, NearestFilter, SRGBColorSpace, Texture } from 'three';

/**
 * Layered player animation registry.
 *
 * The player sprite is split into TWO independent layers that animate
 * concurrently on top of each other:
 *   - `legs`   → lower body, drives movement animations (idle/run/jump/crouch).
 *   - `torso`  → upper body + arms + weapon, drives action animations
 *               (idle/shoot/aimUp/aimDown/throw/melee).
 *
 * The two layers multiply each other semantically:
 *   - "running + shooting" = legs.run  + torso.shoot
 *   - "crouch + aiming up" = legs.crouch + torso.aimUp  (+ torso Y offset)
 *   - "jump + idle hands"  = legs.jump + torso.idle
 * Only the layer whose state changed needs a new sprite; no combinatorial
 * explosion.
 *
 * AUTHORING CONVENTION
 * --------------------
 * Every frame of every animation (in both layers) is authored on the same
 * full-body 20×32 canvas with TRANSPARENT padding for the half the layer
 * doesn't own. Example: `player_legs_run.png` shows the legs + lower hip
 * pixel-by-pixel while the top half of each frame is fully transparent.
 * This means the two Meshes can sit at the SAME world position and the
 * textures overlay perfectly — no anchor math, no per-frame offsets.
 *
 * LEGACY FALLBACK
 * ---------------
 * If a layer-specific PNG is missing (e.g., during art production), the
 * system falls back gracefully:
 *   1. `getLegsAnim(name)`  → requested sheet → legs.idle → LEGACY full-body.
 *   2. `getTorsoAnim(name)` → requested sheet → torso.idle → `null` (caller
 *      hides the torso mesh, leaving the legacy full-body visible on the
 *      legs layer).
 * The existing `player_idle.png` keeps working as a single-layer placeholder
 * until the user authors proper layered sheets.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LegsAnim = 'idle' | 'run' | 'jump' | 'crouch';
export type TorsoAnim = 'idle' | 'shoot' | 'aimUp' | 'aimDown' | 'throw' | 'melee';

export interface AnimDef {
  readonly url: string;
  /** Number of frames in the horizontal strip. */
  readonly frames: number;
  /** Playback speed (frames per second). */
  readonly fps: number;
  /** True = wrap around indefinitely; false = hold on last frame. */
  readonly loop: boolean;
}

export interface Animation {
  readonly def: AnimDef;
  /** Same Texture reference for a given name — safe to assign to material.map. */
  readonly texture: Texture;
  /** `true` once the PNG is decoded; `false` while downloading or on 404. */
  loaded: boolean;
}

// ---------------------------------------------------------------------------
// Authored metadata
// ---------------------------------------------------------------------------

const LEGS_DEFS: Record<LegsAnim, AnimDef> = {
  idle:   { url: '/assets/sprites/player/player_legs_idle.png',   frames: 6, fps: 8,  loop: true  },
  run:    { url: '/assets/sprites/player/player_legs_run.png',    frames: 8, fps: 12, loop: true  },
  jump:   { url: '/assets/sprites/player/player_legs_jump.png',   frames: 1, fps: 1,  loop: false },
  crouch: { url: '/assets/sprites/player/player_legs_crouch.png', frames: 1, fps: 1,  loop: false },
};

const TORSO_DEFS: Record<TorsoAnim, AnimDef> = {
  idle:    { url: '/assets/sprites/player/player_torso_idle.png',    frames: 4, fps: 6,  loop: true  },
  shoot:   { url: '/assets/sprites/player/player_torso_shoot.png',   frames: 4, fps: 16, loop: false },
  aimUp:   { url: '/assets/sprites/player/player_torso_aimup.png',   frames: 1, fps: 1,  loop: false },
  aimDown: { url: '/assets/sprites/player/player_torso_aimdown.png', frames: 1, fps: 1,  loop: false },
  throw:   { url: '/assets/sprites/player/player_torso_throw.png',   frames: 3, fps: 12, loop: false },
  melee:   { url: '/assets/sprites/player/player_torso_melee.png',   frames: 3, fps: 16, loop: false },
};

/** Legacy single-sheet full-body idle (used as fallback while layer sheets are missing). */
const LEGACY_DEF: AnimDef = {
  url: '/assets/sprites/player/player_idle.png',
  frames: 6,
  fps: 8,
  loop: true,
};

// ---------------------------------------------------------------------------
// Runtime state
// ---------------------------------------------------------------------------

const loader = new TextureLoader();
let legsAnims: Record<LegsAnim, Animation> | null = null;
let torsoAnims: Record<TorsoAnim, Animation> | null = null;
let legacyAnim: Animation | null = null;
let allReady: Promise<void> | null = null;

function initialize(): void {
  if (legsAnims && torsoAnims && legacyAnim) return;

  const builtLegs: Partial<Record<LegsAnim, Animation>> = {};
  const builtTorso: Partial<Record<TorsoAnim, Animation>> = {};
  const promises: Promise<void>[] = [];

  const load = <T extends Animation>(def: AnimDef, out: (anim: T) => void): void => {
    promises.push(
      new Promise<void>((resolve) => {
        const texture = loader.load(
          def.url,
          () => { anim.loaded = true; resolve(); },
          undefined,
          () => {
            console.warn(`[playerSprite] failed to load ${def.url} — fallback will be used.`);
            resolve();
          },
        );
        configureTexture(texture, def);
        const anim = { def, texture, loaded: false } as T;
        out(anim);
      }),
    );
  };

  for (const key of Object.keys(LEGS_DEFS) as LegsAnim[]) {
    load(LEGS_DEFS[key], (a) => { builtLegs[key] = a; });
  }
  for (const key of Object.keys(TORSO_DEFS) as TorsoAnim[]) {
    load(TORSO_DEFS[key], (a) => { builtTorso[key] = a; });
  }
  load(LEGACY_DEF, (a) => { legacyAnim = a; });

  legsAnims = builtLegs as Record<LegsAnim, Animation>;
  torsoAnims = builtTorso as Record<TorsoAnim, Animation>;
  allReady = Promise.all(promises).then(() => undefined);
}

/** Pixel-art texture hygiene — applied once per Texture at init. */
function configureTexture(tex: Texture, def: AnimDef): void {
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = SRGBColorSpace;
  tex.repeat.set(1 / def.frames, 1);
  tex.offset.set(0, 0);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Lookup a legs-layer animation by name.
 *
 * Fallback cascade:
 *   1. Requested animation (if its PNG decoded).
 *   2. Legs `idle` (if decoded — usually true after preload).
 *   3. Legacy full-body `player_idle.png` (during migration).
 *   4. Requested animation's empty-texture slot (mesh invisible until preload).
 */
export function getLegsAnim(name: LegsAnim): Animation {
  initialize();
  const entry = legsAnims![name]!;
  if (entry.loaded) return entry;

  const idle = legsAnims!.idle!;
  if (idle.loaded) return idle;

  if (legacyAnim && legacyAnim.loaded) return legacyAnim;

  return entry;
}

/**
 * Lookup a torso-layer animation by name.
 *
 * Returns `null` (not a fallback Animation) when no torso sheets are loaded —
 * the caller is expected to HIDE the torso mesh in that case. This produces
 * a clean legacy-only rendering (only legs layer visible with the full-body
 * fallback) instead of doubling the character up with two full-body sheets.
 */
export function getTorsoAnim(name: TorsoAnim): Animation | null {
  initialize();
  const entry = torsoAnims![name]!;
  if (entry.loaded) return entry;

  const idle = torsoAnims!.idle!;
  if (idle.loaded) return idle;

  // No torso sheet available — signal caller to hide the torso layer.
  return null;
}

/**
 * Kick off the load of every layered animation (plus the legacy fallback)
 * and resolve when all attempts have completed (loaded OR failed).
 */
export function preloadAllAnimations(): Promise<void> {
  initialize();
  return allReady!;
}
