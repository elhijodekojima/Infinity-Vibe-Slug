import { TextureLoader, NearestFilter, SRGBColorSpace, Texture } from 'three';

/**
 * Player animation registry.
 *
 * Single source of truth for every state the player sprite can be in.
 * To add a new animation:
 *   1. Author a horizontal strip PNG (N frames, all same width/height).
 *   2. Drop it at `public/assets/sprites/player/<name>.png`.
 *   3. Add an entry to `DEFS` below.
 *   4. Teach `selectAnim()` in `player.ts` when to trigger it.
 *
 * Safe fallback: if a PNG is missing / 404s, `getAnimation()` returns the
 * idle animation instead — the game stays playable while artwork is WIP.
 *
 * Zero-Loading stance: every animation defined here is downloaded in
 * parallel at bootstrap via `preloadAllAnimations()`. The HTML menu is
 * already on screen during download; by the time the player clicks
 * INSERT COIN, every sprite is decoded and uploaded to GPU.
 */

export type PlayerAnim =
  | 'idle'
  | 'run'
  | 'shoot'
  | 'jump'
  | 'crouch'
  | 'aimUp';

export interface AnimDef {
  readonly url: string;
  /** Number of frames in the horizontal strip. */
  readonly frames: number;
  /** Playback speed (frames per second). */
  readonly fps: number;
  /** True = wrap around indefinitely; false = hold on last frame. */
  readonly loop: boolean;
}

/**
 * Authored metadata. Frame counts/FPS are educated guesses for animations
 * that haven't been drawn yet — adjust when the PNGs land.
 */
const DEFS: Record<PlayerAnim, AnimDef> = {
  idle:   { url: '/assets/sprites/player/player_idle.png',   frames: 6, fps: 8,  loop: true  },
  run:    { url: '/assets/sprites/player/player_run.png',    frames: 8, fps: 12, loop: true  },
  shoot:  { url: '/assets/sprites/player/player_shoot.png',  frames: 4, fps: 16, loop: false },
  jump:   { url: '/assets/sprites/player/player_jump.png',   frames: 1, fps: 1,  loop: false },
  crouch: { url: '/assets/sprites/player/player_crouch.png', frames: 2, fps: 4,  loop: true  },
  aimUp:  { url: '/assets/sprites/player/player_aim_up.png', frames: 1, fps: 1,  loop: false },
};

export interface Animation {
  readonly def: AnimDef;
  /** Same Texture reference for a given name — safe to assign to material.map. */
  readonly texture: Texture;
  /** `true` once the PNG is decoded; `false` while downloading or on 404. */
  loaded: boolean;
}

const loader = new TextureLoader();
let anims: Record<PlayerAnim, Animation> | null = null;
let allReady: Promise<void> | null = null;

function initialize(): void {
  if (anims) return;

  const built: Partial<Record<PlayerAnim, Animation>> = {};
  const promises: Promise<void>[] = [];

  for (const key of Object.keys(DEFS) as PlayerAnim[]) {
    const def = DEFS[key];

    promises.push(
      new Promise<void>((resolve) => {
        // `loader.load` returns the Texture synchronously — its pixel data
        // populates when the image decodes. The onLoad / onError callbacks
        // fire asynchronously after that.
        const texture = loader.load(
          def.url,
          () => {
            built[key]!.loaded = true;
            resolve();
          },
          undefined,
          () => {
            console.warn(
              `[playerSprite] failed to load ${def.url} — falling back to 'idle'.`,
            );
            resolve(); // resolve so preloadAll doesn't hang
          },
        );

        configureTexture(texture, def);
        built[key] = { def, texture, loaded: false };
      }),
    );
  }

  anims = built as Record<PlayerAnim, Animation>;
  allReady = Promise.all(promises).then(() => undefined);
}

/** Pixel-art texture hygiene — called once per Texture at init. */
function configureTexture(tex: Texture, def: AnimDef): void {
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = SRGBColorSpace;
  tex.repeat.set(1 / def.frames, 1);
  tex.offset.set(0, 0);
}

/**
 * Look up an animation by name. Triggers lazy init on first call.
 *
 * Fallback order:
 *   1. Requested animation (if its PNG decoded).
 *   2. Idle animation (if IT has decoded — usually true after preload).
 *   3. The requested animation's empty-texture slot (mesh stays invisible
 *      via the `preloadAll` gate in Player, so this is never rendered).
 */
export function getAnimation(name: PlayerAnim): Animation {
  initialize();
  const entry = anims![name]!;
  if (entry.loaded) return entry;

  const idle = anims!.idle!;
  if (idle.loaded) return idle;

  return entry;
}

/**
 * Kick off the load of every animation and resolve when all attempts
 * have completed (loaded OR failed). Call once from main bootstrap.
 */
export function preloadAllAnimations(): Promise<void> {
  initialize();
  return allReady!;
}

// ---------------------------------------------------------------------------
// Backwards-compat exports — previous single-animation API.
// Existing callers (Player constructor, main.ts) still work without changes.
// ---------------------------------------------------------------------------

/** @deprecated Prefer `getAnimation('idle').def.frames`. */
export const PLAYER_IDLE_FRAMES = DEFS.idle.frames;

/** @deprecated Prefer `getAnimation('idle').def.fps`. */
export const PLAYER_IDLE_FPS = DEFS.idle.fps;

/** @deprecated Prefer `getAnimation('idle').texture`. */
export function getPlayerTexture(): Texture {
  return getAnimation('idle').texture;
}

/** @deprecated Prefer `preloadAllAnimations()`. */
export function preloadPlayerSprite(): Promise<void> {
  return preloadAllAnimations();
}
