import { TextureLoader, NearestFilter, SRGBColorSpace, Texture } from 'three';

/**
 * Three-layer player animation registry (AD-044 + AD-046 + AD-047).
 *
 * The player is rendered as three independent, concurrent layers:
 *   - `legs`   → lower body, movement animations (idle / run / jump / crouch).
 *   - `torso`  → upper body + HEAD + arms (WITHOUT weapon). Varies by
 *                `action` (idle / shoot / melee / throw) AND `aim
 *                orientation` (neutral / up / down).
 *   - `weapon` → only the weapon, per `(weaponType, orientation)`.
 *                Interchangeable at runtime — same torso animations
 *                serve every weapon.
 *
 * All three sheets share the same 20×32 canvas with transparent padding
 * for the regions owned by the other layers. Meshes overlay at the
 * exact same world position → alignment is the artist's responsibility
 * (pixel-perfect hand anchor), not code's.
 *
 * REGISTRY SHAPE — Torso & Weapon matrices
 * ----------------------------------------
 * Torso is a sparse `Partial<Record<"<action>_<orientation>", AnimDef>>`
 * so only the cells that actually have distinct art need entries. Any
 * miss falls back via a 3-step cascade:
 *    (action, orient)   → exact
 *    (action, neutral)  → action default
 *    (idle, neutral)    → idle baseline
 *    legacy full-body   → last resort (marks Animation.isLegacy = true)
 *
 * Weapon falls back similarly but returns `null` when everything fails
 * so the caller hides the weapon mesh (legacy torso already has the
 * weapon drawn — showing the weapon mesh on top would double up).
 *
 * AUTHORING RULES
 * ---------------
 * 1. Canvas size: 20×32 per frame, horizontal strip for multi-frame.
 * 2. Legs: only draw pixels from waist down, transparent above.
 * 3. Torso: only draw torso + head + arms, transparent below waist and
 *    NO weapon (the weapon layer renders it independently).
 * 4. Weapon: only draw the gun at the exact pixel where the character's
 *    hand is on the corresponding torso sheet. Rest transparent.
 * 5. Feet anchor FIXED across all legs frames, waist anchor FIXED across
 *    all torso frames, hand anchor FIXED across all (torso, orient) with
 *    the matching weapon sheet.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LegsAnim = 'idle' | 'run' | 'jump' | 'crouch';
export type TorsoAction = 'idle' | 'shoot' | 'melee' | 'throw';
export type AimOrientation = 'neutral' | 'up' | 'down';
export type WeaponType = 'pistol' | 'machinegun' | 'shotgun' | 'rocket';

type TorsoKey = `${TorsoAction}_${AimOrientation}`;
type WeaponKey = `${WeaponType}_${AimOrientation}`;

export interface AnimDef {
  readonly url: string;
  readonly frames: number;
  readonly fps: number;
  readonly loop: boolean;
}

export interface Animation {
  readonly def: AnimDef;
  readonly texture: Texture;
  loaded: boolean;
  /** True iff this animation is the legacy full-body fallback sheet. */
  readonly isLegacy: boolean;
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

/**
 * Torso sheets indexed by `${action}_${orientation}`. Entries are OPTIONAL —
 * any missing cell falls back to `<action>_neutral` → `idle_neutral` → legacy.
 *
 * Not every combination needs its own sheet. Sensible skips:
 *   - `melee_up` / `melee_down`: knife swing only makes sense at neutral aim.
 *   - `throw_up` / `throw_down`: overhand throw is a single pose.
 */
const TORSO_DEFS: Partial<Record<TorsoKey, AnimDef>> = {
  idle_neutral:  { url: '/assets/sprites/player/player_torso_idle.png',       frames: 4, fps: 6,  loop: true  },
  idle_up:       { url: '/assets/sprites/player/player_torso_idle_up.png',    frames: 1, fps: 1,  loop: false },
  idle_down:     { url: '/assets/sprites/player/player_torso_idle_down.png',  frames: 1, fps: 1,  loop: false },
  shoot_neutral: { url: '/assets/sprites/player/player_torso_shoot.png',      frames: 4, fps: 16, loop: false },
  shoot_up:      { url: '/assets/sprites/player/player_torso_shoot_up.png',   frames: 4, fps: 16, loop: false },
  shoot_down:    { url: '/assets/sprites/player/player_torso_shoot_down.png', frames: 4, fps: 16, loop: false },
  melee_neutral: { url: '/assets/sprites/player/player_torso_melee.png',      frames: 3, fps: 16, loop: false },
  throw_neutral: { url: '/assets/sprites/player/player_torso_throw.png',      frames: 3, fps: 12, loop: false },
};

/**
 * Weapon sheets indexed by `${type}_${orientation}`. Static single-frame
 * poses for now. Future extension: multi-frame for recoil / muzzle flash
 * by setting `frames > 1` and wiring a weapon timer in Player.
 */
const WEAPON_DEFS: Partial<Record<WeaponKey, AnimDef>> = {
  pistol_neutral:     { url: '/assets/sprites/player/player_weapon_pistol_neutral.png',     frames: 1, fps: 1, loop: false },
  pistol_up:          { url: '/assets/sprites/player/player_weapon_pistol_up.png',          frames: 1, fps: 1, loop: false },
  pistol_down:        { url: '/assets/sprites/player/player_weapon_pistol_down.png',        frames: 1, fps: 1, loop: false },
  machinegun_neutral: { url: '/assets/sprites/player/player_weapon_machinegun_neutral.png', frames: 1, fps: 1, loop: false },
  machinegun_up:      { url: '/assets/sprites/player/player_weapon_machinegun_up.png',      frames: 1, fps: 1, loop: false },
  machinegun_down:    { url: '/assets/sprites/player/player_weapon_machinegun_down.png',    frames: 1, fps: 1, loop: false },
  shotgun_neutral:    { url: '/assets/sprites/player/player_weapon_shotgun_neutral.png',    frames: 1, fps: 1, loop: false },
  shotgun_up:         { url: '/assets/sprites/player/player_weapon_shotgun_up.png',         frames: 1, fps: 1, loop: false },
  shotgun_down:       { url: '/assets/sprites/player/player_weapon_shotgun_down.png',       frames: 1, fps: 1, loop: false },
  rocket_neutral:     { url: '/assets/sprites/player/player_weapon_rocket_neutral.png',     frames: 1, fps: 1, loop: false },
  rocket_up:          { url: '/assets/sprites/player/player_weapon_rocket_up.png',          frames: 1, fps: 1, loop: false },
  rocket_down:        { url: '/assets/sprites/player/player_weapon_rocket_down.png',        frames: 1, fps: 1, loop: false },
};

/** Legacy single-sheet full-body idle (fallback while layer sheets are missing). */
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
let torsoAnims: Partial<Record<TorsoKey, Animation>> | null = null;
let weaponAnims: Partial<Record<WeaponKey, Animation>> | null = null;
let legacyAnim: Animation | null = null;
let allReady: Promise<void> | null = null;

function initialize(): void {
  if (legsAnims && torsoAnims && weaponAnims && legacyAnim) return;

  const builtLegs: Partial<Record<LegsAnim, Animation>> = {};
  const builtTorso: Partial<Record<TorsoKey, Animation>> = {};
  const builtWeapon: Partial<Record<WeaponKey, Animation>> = {};
  const promises: Promise<void>[] = [];

  /** Generic loader factory — returns the Animation synchronously and registers async populate. */
  const makeAnim = (def: AnimDef, isLegacy: boolean): Animation => {
    const state: Animation = { def, texture: null as unknown as Texture, loaded: false, isLegacy };
    promises.push(
      new Promise<void>((resolve) => {
        const texture = loader.load(
          def.url,
          () => { state.loaded = true; resolve(); },
          undefined,
          () => {
            console.warn(`[playerSprite] failed to load ${def.url} — fallback will be used.`);
            resolve();
          },
        );
        configureTexture(texture, def);
        (state as { texture: Texture }).texture = texture;
      }),
    );
    return state;
  };

  for (const key of Object.keys(LEGS_DEFS) as LegsAnim[]) {
    builtLegs[key] = makeAnim(LEGS_DEFS[key], false);
  }
  for (const key of Object.keys(TORSO_DEFS) as TorsoKey[]) {
    const def = TORSO_DEFS[key];
    if (def) builtTorso[key] = makeAnim(def, false);
  }
  for (const key of Object.keys(WEAPON_DEFS) as WeaponKey[]) {
    const def = WEAPON_DEFS[key];
    if (def) builtWeapon[key] = makeAnim(def, false);
  }
  legacyAnim = makeAnim(LEGACY_DEF, true);

  legsAnims = builtLegs as Record<LegsAnim, Animation>;
  torsoAnims = builtTorso;
  weaponAnims = builtWeapon;
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
 * Legs-layer animation.
 *
 * Cascade: requested → legs.idle → legacy → empty slot.
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
 * Torso-layer animation for a given (action, orientation).
 *
 * Cascade:
 *   1. `<action>_<orientation>` (exact match)
 *   2. `<action>_neutral`       (orientation fallback)
 *   3. `idle_neutral`           (action fallback)
 *   4. Legacy full-body idle    (marks Animation.isLegacy = true)
 *
 * Always returns SOMETHING — the player mesh always renders a torso.
 * Callers can inspect `.isLegacy` to hide the weapon mesh when the legacy
 * sheet is active (legacy already has the weapon drawn into it).
 */
export function getTorsoAnim(action: TorsoAction, orientation: AimOrientation): Animation {
  initialize();

  const tryKey = (k: TorsoKey): Animation | undefined => {
    const a = torsoAnims![k];
    return a && a.loaded ? a : undefined;
  };

  const a =
    tryKey(`${action}_${orientation}`) ??
    tryKey(`${action}_neutral`) ??
    tryKey('idle_neutral');
  if (a) return a;

  if (legacyAnim && legacyAnim.loaded) return legacyAnim;

  // Nothing decoded yet — return the requested slot (or any slot) so the
  // material has a Texture ref. Mesh stays invisible via preload gate.
  return torsoAnims![`${action}_${orientation}`] ?? torsoAnims![`${action}_neutral`] ?? torsoAnims!['idle_neutral'] ?? legacyAnim!;
}

/**
 * Weapon-layer animation for a given (type, orientation).
 *
 * Cascade:
 *   1. `<type>_<orientation>` (exact)
 *   2. `<type>_neutral`       (orientation fallback)
 *   3. `null`                 — caller hides the weapon mesh.
 *
 * Returning null (instead of falling back to another weapon type) avoids
 * rendering a pistol in place of a missing machinegun sprite.
 */
export function getWeaponAnim(type: WeaponType, orientation: AimOrientation): Animation | null {
  initialize();

  const exact = weaponAnims![`${type}_${orientation}`];
  if (exact && exact.loaded) return exact;

  const neutral = weaponAnims![`${type}_neutral`];
  if (neutral && neutral.loaded) return neutral;

  return null;
}

/**
 * Kick off the load of every registered layer + legacy fallback.
 * Resolves when every PNG has either decoded OR failed (fail-open).
 */
export function preloadAllAnimations(): Promise<void> {
  initialize();
  return allReady!;
}
