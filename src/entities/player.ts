import { Mesh, PlaneGeometry, MeshBasicMaterial } from 'three';
import { Input } from '../core/input';
import { PLAYER, WORLD } from '../config/balance';
import {
  getAnimation,
  preloadAllAnimations,
  type PlayerAnim,
} from '../gfx/playerSprite';
import type { AABB } from '../systems/collisions';
import type { TerrainManager } from '../systems/terrain/terrainManager';

/**
 * Player entity. Physics: horizontal move, jump with gravity, ground clamp.
 * Visuals: animated pixel-art sprite driven by a state-machine pairing one
 * of the named `PlayerAnim` states with a texture from the animation
 * registry (see `gfx/playerSprite.ts`).
 *
 * Exposes `x`, `y` (feet), `aabb`, and muzzle getters for weapons to spawn
 * bullets/grenades from.
 *
 * Animation lifecycle:
 *   1. Every frame, `selectAnim()` picks the target state from physics +
 *      input (grounded/crouch/aimUp/run/idle/shoot).
 *   2. If the state changed, `_animTime` resets to 0 — the animation plays
 *      from frame 0.
 *   3. `syncMesh()` looks up the current Animation, swaps the material's
 *      texture if it differs, and sets `texture.offset.x` to expose the
 *      right frame.
 *   4. Sprites missing from `public/` fall back to `idle` safely (see
 *      `getAnimation()` in the sprite module).
 */
export class Player {
  public readonly mesh: Mesh;

  private _x: number = PLAYER.START_X;
  private _y: number = WORLD.GROUND_Y;
  private vy = 0;
  private grounded = true;

  /** True if the 'down' key is held while grounded. */
  private _isCrouching = false;
  /** Current aiming angle in radians. 0 = Forward, PI/2 = Up, -PI/2 = Down. */
  private _aimAngle = 0;

  /** Currently-playing animation state name. */
  private _currentAnim: PlayerAnim = 'idle';
  /** Seconds since `_currentAnim` started — drives the frame index. */
  private _animTime = 0;
  /** While > 0, forces the 'shoot' animation regardless of other state. */
  private _shootAnimTimer = 0;

  /** Reused AABB — updated per-frame, not re-allocated. */
  private readonly _aabb: AABB = {
    x: 0,
    y: 0,
    w: PLAYER.WIDTH,
    h: PLAYER.HEIGHT,
  };

  constructor() {
    // Sprite quad is larger than the collision box for a forgiving hitbox
    // (see AD-017). UV repeat / filters / colorSpace are managed by the
    // sprite module — don't touch them here.
    const geom = new PlaneGeometry(PLAYER.SPRITE_W, PLAYER.SPRITE_H);
    const idle = getAnimation('idle');
    const mat = new MeshBasicMaterial({
      map: idle.texture,
      transparent: false,
      alphaTest: 0.5,
    });
    this.mesh = new Mesh(geom, mat);

    // Hide until all animation PNGs have attempted to load. This protects
    // against rendering a blank quad on the first frame.
    this.mesh.visible = false;
    preloadAllAnimations()
      .then(() => { this.mesh.visible = true; })
      .catch((err) => {
        // Fail open — keep the game playable even if network is broken.
        console.error('[player] sprite preload failed:', err);
        this.mesh.visible = true;
      });

    this.syncMesh();
  }

  /** Feet X (world units). */
  get x(): number { return this._x; }
  /** Feet Y (world units). */
  get y(): number { return this._y; }

  /** Live center-based AABB for collision queries. */
  get aabb(): AABB {
    this._aabb.x = this._x;
    const h = this._isCrouching ? PLAYER.HEIGHT / 2 : PLAYER.HEIGHT;
    this._aabb.h = h;
    this._aabb.y = this._y + h / 2;
    return this._aabb;
  }

  get isCrouching(): boolean { return this._isCrouching; }
  get aimAngle(): number { return this._aimAngle; }

  /** World position where bullets spawn. Shifts for crouching/aiming. */
  get muzzleX(): number {
    const forward = PLAYER.WIDTH * 0.55;
    if (this._aimAngle > 1.0) return this._x; // Aiming up
    if (this._aimAngle < -1.0) return this._x; // Aiming down
    return this._x + forward;
  }

  get muzzleY(): number {
    const baseH = this._isCrouching ? PLAYER.HEIGHT * 0.3 : PLAYER.HEIGHT * 0.55;
    const upOffset = this._aimAngle > 1.0 ? PLAYER.HEIGHT * 0.9 : 0;
    if (this._aimAngle > 1.0) return this._y + upOffset;
    if (this._aimAngle < -1.0) return this._y;
    return this._y + baseH;
  }

  /**
   * Force the 'shoot' animation to play for `durationSec` seconds. Main.ts
   * calls this when a weapon actually fires so the pose overrides the
   * default idle/run state. If the 'shoot' PNG isn't present yet, the
   * animation registry falls back to idle — no crash, no blank frame.
   */
  triggerShootAnim(durationSec: number): void {
    this._shootAnimTimer = durationSec;
  }

  update(dt: number, input: Input, maxX: number, terrain: TerrainManager): void {
    const down = input.isDown('down');
    const up = input.isDown('up');

    // --- State: Crouch & Aim ---
    if (this.grounded) {
      this._isCrouching = down;

      if (!this._isCrouching) {
        const target = up ? Math.PI / 2 : 0;
        const step = PLAYER.AIM_SPEED * dt;
        if (this._aimAngle < target) this._aimAngle = Math.min(target, this._aimAngle + step);
        else if (this._aimAngle > target) this._aimAngle = Math.max(target, this._aimAngle - step);
      } else {
        this._aimAngle = 0; // Crouch always looks forward.
      }
    } else {
      // Air state: S held forces instant down-aim.
      this._isCrouching = false;
      if (down) {
        this._aimAngle = -Math.PI / 2;
      } else {
        const target = up ? Math.PI / 2 : 0;
        const step = PLAYER.AIM_SPEED * dt;
        if (this._aimAngle < target) this._aimAngle = Math.min(target, this._aimAngle + step);
        else if (this._aimAngle > target) this._aimAngle = Math.max(target, this._aimAngle - step);
      }
    }

    // --- Horizontal ---
    let vx = 0;
    const speed = this._isCrouching ? PLAYER.CROUCH_MOVE_SPEED : PLAYER.MOVE_SPEED;
    if (input.isDown('left')) vx -= speed;
    if (input.isDown('right')) vx += speed;
    this._x += vx * dt;

    // Face the direction of last movement (sticky: no flip while idle).
    if (vx !== 0) this.mesh.scale.x = vx < 0 ? -1 : 1;

    // Clamp to screen horizontally.
    const minX = PLAYER.WIDTH / 2;
    const maxRight = maxX - PLAYER.WIDTH / 2;
    if (this._x < minX) this._x = minX;
    if (this._x > maxRight) this._x = maxRight;

    // --- Jump (Space) ---
    const jumpHeld = input.isDown('jump');
    if (this.grounded && input.wasPressed('jump')) {
      this.vy = PLAYER.JUMP_VELOCITY;
      this.grounded = false;
      this._isCrouching = false;
    }

    // Variable jump height: release space → cut upward velocity.
    if (!this.grounded && !jumpHeld && this.vy > 0) {
      this.vy *= 0.5;
    }

    // --- Gravity ---
    this.vy += PLAYER.GRAVITY * dt;
    this._y += this.vy * dt;

    // --- Terrain Collision ---
    const surfaceY = terrain.getSurfaceHeight(this._x, this._y, this.vy);
    if (this._y <= surfaceY && (this.vy <= 0 || (this.grounded && this._y > surfaceY - 5))) {
      this._y = surfaceY;
      this.vy = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }

    // --- Animation state machine ---
    this._shootAnimTimer = Math.max(0, this._shootAnimTimer - dt);
    const nextAnim = this.selectAnim(vx);
    if (nextAnim !== this._currentAnim) {
      this._currentAnim = nextAnim;
      this._animTime = 0;
    }
    this._animTime += dt;

    this.syncMesh();
  }

  reset(): void {
    this._x = PLAYER.START_X;
    this._y = WORLD.GROUND_Y;
    this.vy = 0;
    this.grounded = true;
    this._isCrouching = false;
    this._aimAngle = 0;
    this._currentAnim = 'idle';
    this._animTime = 0;
    this._shootAnimTimer = 0;
    this.syncMesh();
  }

  /**
   * Decide which animation to play this frame, in priority order:
   *   shoot (while timer > 0) > airborne (jump) > crouch > aim up > run > idle.
   * Aim-up wins over run (standing still while pointing up is the expected
   * pose); if we ever want "run + aim up" we can add a combined state.
   */
  private selectAnim(vx: number): PlayerAnim {
    if (this._shootAnimTimer > 0) return 'shoot';
    if (!this.grounded) return 'jump';
    if (this._isCrouching) return 'crouch';
    if (this._aimAngle > 1.0) return 'aimUp';
    if (vx !== 0) return 'run';
    return 'idle';
  }

  private syncMesh(): void {
    const anim = getAnimation(this._currentAnim);
    const mat = this.mesh.material as MeshBasicMaterial;

    // Swap texture if the animation changed (or if fallback returned a
    // different one this frame because the PNG just finished loading).
    if (mat.map !== anim.texture) {
      mat.map = anim.texture;
      mat.needsUpdate = true;
    }

    // Advance the frame. Looping anims wrap; non-looping clamp to last frame.
    const { frames, fps, loop } = anim.def;
    const raw = Math.floor(this._animTime * fps);
    const frame = loop ? raw % frames : Math.min(raw, frames - 1);
    anim.texture.offset.x = frame / frames;

    this.mesh.position.set(
      this._x + PLAYER.SPRITE_OFFSET_X,
      this._y + (PLAYER.SPRITE_H / 2) + PLAYER.SPRITE_OFFSET_Y,
      0,
    );
  }
}
