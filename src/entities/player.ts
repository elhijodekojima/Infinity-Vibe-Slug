import { Group, Mesh, PlaneGeometry, MeshBasicMaterial } from 'three';
import { Input } from '../core/input';
import { PLAYER, WORLD } from '../config/balance';
import {
  getLegsAnim,
  getTorsoAnim,
  getWeaponAnim,
  preloadAllAnimations,
  type Animation,
  type LegsAnim,
  type TorsoAction,
  type AimOrientation,
  type WeaponType,
} from '../gfx/playerSprite';
import type { AABB } from '../systems/collisions';
import type { TerrainManager } from '../systems/terrain/terrainManager';

/**
 * Player entity — three-layer animation edition (AD-046, AD-047).
 *
 * The character is a Group of three Meshes on identical 20×32 quads,
 * stacked back-to-front by z offset:
 *   - `legsMesh`   (z=0)    → movement animations
 *   - `torsoMesh`  (z=0.01) → body + head + arms (NO weapon)
 *   - `weaponMesh` (z=0.02) → interchangeable weapon sprite
 *
 * Three orthogonal state axes:
 *   - `_legsAnim`:         LegsAnim          (idle / run / jump / crouch)
 *   - `_torsoAction`:      TorsoAction       (idle / shoot / melee / throw)
 *   - `_aimOrientation`:   AimOrientation    (neutral / up / down)
 *   - `_currentWeapon`:    WeaponType        (pistol / MG / shotgun / rocket)
 *
 * The torso sheet is resolved from `(action, orientation)` with fallback
 * cascade (see playerSprite.ts). The weapon sheet is resolved from
 * `(type, orientation)`. Legs are independent.
 *
 * LEGACY MIGRATION: while layered sheets are missing, the torso falls
 * back to the legacy `player_idle.png` (which includes the weapon
 * drawn). In that case `_aimOrientation` and the weapon layer are
 * temporarily irrelevant: Animation.isLegacy = true signals us to hide
 * the weapon mesh to avoid rendering two weapons.
 */
export class Player {
  /** Scene node (Group). Add this to the scene; it owns all three layer meshes. */
  public readonly mesh: Group;

  private readonly legsMesh: Mesh;
  private readonly torsoMesh: Mesh;
  private readonly weaponMesh: Mesh;

  private _x: number = PLAYER.START_X;
  private _y: number = WORLD.GROUND_Y;
  private vy = 0;
  private grounded = true;

  private _isCrouching = false;
  /** Current aiming angle in radians. 0 = Forward, PI/2 = Up, -PI/2 = Down. */
  private _aimAngle = 0;

  // --- Animation state ---
  private _legsAnim: LegsAnim = 'idle';
  private _legsTime = 0;
  private _torsoAction: TorsoAction = 'idle';
  private _aimOrientation: AimOrientation = 'neutral';
  private _torsoTime = 0;

  /** Currently equipped weapon. Swap via `setWeapon()`. */
  private _currentWeapon: WeaponType = 'pistol';

  /** While > 0, forces the torso into `shoot`. */
  private _shootAnimTimer = 0;
  /** While > 0, forces the torso into `melee`. */
  private _meleeAnimTimer = 0;
  /** While > 0, forces the torso into `throw`. */
  private _throwAnimTimer = 0;

  /** Reused AABB — updated per-frame, not re-allocated. */
  private readonly _aabb: AABB = {
    x: 0,
    y: 0,
    w: PLAYER.WIDTH,
    h: PLAYER.HEIGHT,
  };

  constructor() {
    // One shared geometry across all three layers — they're all identical
    // 20×32 quads at the same origin. The sprite modules manage UV repeat/
    // offset per texture (AD-038), so passing the same geom is safe.
    const geom = new PlaneGeometry(PLAYER.SPRITE_W, PLAYER.SPRITE_H);
    const seed = getLegsAnim('idle');
    const makeMat = (): MeshBasicMaterial => new MeshBasicMaterial({
      map: seed.texture,
      transparent: false,
      alphaTest: 0.5,
    });

    this.legsMesh = new Mesh(geom, makeMat());
    this.torsoMesh = new Mesh(geom, makeMat());
    this.weaponMesh = new Mesh(geom, makeMat());

    // Stack order: legs (back) → torso → weapon (front).
    this.torsoMesh.position.z = 0.01;
    this.weaponMesh.position.z = 0.02;

    this.torsoMesh.visible = false;
    this.weaponMesh.visible = false;

    this.mesh = new Group();
    this.mesh.add(this.legsMesh);
    this.mesh.add(this.torsoMesh);
    this.mesh.add(this.weaponMesh);

    // Hide the whole group until preload resolves — prevents a flash of
    // untextured quads during the initial decode.
    this.mesh.visible = false;
    preloadAllAnimations()
      .then(() => { this.mesh.visible = true; })
      .catch((err) => {
        console.error('[player] sprite preload failed:', err);
        this.mesh.visible = true;
      });

    this.syncMesh();
  }

  // ---------- Accessors ----------

  get x(): number { return this._x; }
  get y(): number { return this._y; }

  get aabb(): AABB {
    this._aabb.x = this._x;
    const h = this._isCrouching ? PLAYER.HEIGHT / 2 : PLAYER.HEIGHT;
    this._aabb.h = h;
    this._aabb.y = this._y + h / 2;
    return this._aabb;
  }

  get isCrouching(): boolean { return this._isCrouching; }
  get aimAngle(): number { return this._aimAngle; }
  get currentLegsAnim(): LegsAnim { return this._legsAnim; }
  get currentTorsoAction(): TorsoAction { return this._torsoAction; }
  get currentAimOrientation(): AimOrientation { return this._aimOrientation; }
  get currentWeapon(): WeaponType { return this._currentWeapon; }

  /** World position where bullets spawn. Shifts for crouching/aiming. */
  get muzzleX(): number {
    const forward = PLAYER.WIDTH * 0.55;
    if (this._aimAngle > 1.0) return this._x;
    if (this._aimAngle < -1.0) return this._x;
    return this._x + forward;
  }

  get muzzleY(): number {
    const baseH = this._isCrouching ? PLAYER.HEIGHT * 0.3 : PLAYER.HEIGHT * 0.55;
    const upOffset = this._aimAngle > 1.0 ? PLAYER.HEIGHT * 0.9 : 0;
    if (this._aimAngle > 1.0) return this._y + upOffset;
    if (this._aimAngle < -1.0) return this._y;
    return this._y + baseH;
  }

  // ---------- Animation hooks (called by main.ts on events) ----------

  /** Swap the equipped weapon. Idempotent — safe to call every frame. */
  setWeapon(type: WeaponType): void {
    this._currentWeapon = type;
  }

  triggerShootAnim(durationSec: number): void { this._shootAnimTimer = durationSec; }
  triggerMeleeAnim(durationSec: number): void { this._meleeAnimTimer = durationSec; }
  triggerThrowAnim(durationSec: number): void { this._throwAnimTimer = durationSec; }

  // ---------- Main tick ----------

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
        this._aimAngle = 0;
      }
    } else {
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
    if (!this.grounded && !jumpHeld && this.vy > 0) this.vy *= 0.5;

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

    // --- Decay per-action timers before picking torso state ---
    this._shootAnimTimer = Math.max(0, this._shootAnimTimer - dt);
    this._meleeAnimTimer = Math.max(0, this._meleeAnimTimer - dt);
    this._throwAnimTimer = Math.max(0, this._throwAnimTimer - dt);

    // --- Animation state machines ---
    const nextLegs = this.selectLegsAnim(vx);
    if (nextLegs !== this._legsAnim) {
      this._legsAnim = nextLegs;
      this._legsTime = 0;
    }
    this._legsTime += dt;

    const nextAction = this.selectTorsoAction();
    const nextOrientation = this.selectAimOrientation();
    if (nextAction !== this._torsoAction || nextOrientation !== this._aimOrientation) {
      this._torsoAction = nextAction;
      this._aimOrientation = nextOrientation;
      this._torsoTime = 0;
    }
    this._torsoTime += dt;

    this.syncMesh();
  }

  reset(): void {
    this._x = PLAYER.START_X;
    this._y = WORLD.GROUND_Y;
    this.vy = 0;
    this.grounded = true;
    this._isCrouching = false;
    this._aimAngle = 0;
    this._legsAnim = 'idle';
    this._legsTime = 0;
    this._torsoAction = 'idle';
    this._aimOrientation = 'neutral';
    this._torsoTime = 0;
    this._shootAnimTimer = 0;
    this._meleeAnimTimer = 0;
    this._throwAnimTimer = 0;
    this.syncMesh();
  }

  // ---------- Selectors ----------

  private selectLegsAnim(vx: number): LegsAnim {
    if (!this.grounded) return 'jump';
    if (this._isCrouching) return 'crouch';
    if (vx !== 0) return 'run';
    return 'idle';
  }

  /**
   * Torso action — the "what are you doing with your arms" dimension.
   * One-shot triggers (melee / throw / shoot) take priority over idle.
   */
  private selectTorsoAction(): TorsoAction {
    if (this._meleeAnimTimer > 0) return 'melee';
    if (this._throwAnimTimer > 0) return 'throw';
    if (this._shootAnimTimer > 0) return 'shoot';
    return 'idle';
  }

  /**
   * Aim orientation — the "where are you pointing" dimension.
   * Independent of action; combines multiplicatively via the torso
   * (action × orientation) sheet matrix.
   */
  private selectAimOrientation(): AimOrientation {
    if (this._aimAngle > 1.0) return 'up';
    if (this._aimAngle < -1.0) return 'down';
    return 'neutral';
  }

  // ---------- Rendering ----------

  private syncMesh(): void {
    this.mesh.position.set(
      this._x + PLAYER.SPRITE_OFFSET_X,
      this._y + PLAYER.SPRITE_H / 2 + PLAYER.SPRITE_OFFSET_Y,
      0,
    );

    const crouchOffset = this._isCrouching ? PLAYER.TORSO_CROUCH_Y_OFFSET : 0;

    // --- Legs layer ---
    const legs = getLegsAnim(this._legsAnim);
    applyLayer(this.legsMesh, legs, this._legsTime);

    // --- Torso layer ---
    const torso = getTorsoAnim(this._torsoAction, this._aimOrientation);
    this.torsoMesh.visible = true;
    applyLayer(this.torsoMesh, torso, this._torsoTime);
    this.torsoMesh.position.y = crouchOffset;

    // --- Weapon layer ---
    // Suppressed when torso is using the legacy full-body sheet (legacy
    // already has the weapon drawn onto it — rendering the weapon mesh
    // on top would show the weapon twice).
    if (torso.isLegacy) {
      this.weaponMesh.visible = false;
    } else {
      const weapon = getWeaponAnim(this._currentWeapon, this._aimOrientation);
      if (weapon) {
        this.weaponMesh.visible = true;
        applyLayer(this.weaponMesh, weapon, 0);
        this.weaponMesh.position.y = crouchOffset;
      } else {
        // No weapon sheet at all for this (type, orientation) — hide
        // rather than substitute a different weapon's art.
        this.weaponMesh.visible = false;
      }
    }
  }
}

/**
 * Apply a single Animation's current frame to a Mesh: swap the texture
 * reference on the material (only when it changed — avoids unnecessary
 * GPU uploads) and update the UV offset to expose the right frame.
 */
function applyLayer(mesh: Mesh, anim: Animation, animTime: number): void {
  const mat = mesh.material as MeshBasicMaterial;
  if (mat.map !== anim.texture) {
    mat.map = anim.texture;
    mat.needsUpdate = true;
  }
  const { frames, fps, loop } = anim.def;
  const raw = Math.floor(animTime * fps);
  const frame = loop ? raw % frames : Math.min(raw, frames - 1);
  anim.texture.offset.x = frame / frames;
}
