import { Group, Mesh, PlaneGeometry, MeshBasicMaterial } from 'three';
import { Input } from '../core/input';
import { PLAYER, WORLD } from '../config/balance';
import {
  getLegsAnim,
  getTorsoAnim,
  preloadAllAnimations,
  type Animation,
  type LegsAnim,
  type TorsoAnim,
} from '../gfx/playerSprite';
import type { AABB } from '../systems/collisions';
import type { TerrainManager } from '../systems/terrain/terrainManager';

/**
 * Player entity — layered animation edition.
 *
 * The visible character is a `Group` containing TWO Meshes on the same
 * 20×32 quad, each with its own texture:
 *   - `legsMesh`  → movement animations (idle / run / jump / crouch).
 *   - `torsoMesh` → action animations (idle / shoot / aimUp / aimDown /
 *                   throw / melee).
 *
 * Both layers run independent state machines (`_legsAnim` + `_legsTime`,
 * `_torsoAnim` + `_torsoTime`). Per-frame, `selectLegsAnim()` and
 * `selectTorsoAnim()` pick the target state from physics/input; when a
 * state changes, its timer resets to 0 and the animation restarts.
 *
 * ALIGNMENT: every sprite frame in both layers is authored on the same
 * full-body canvas with transparent padding for the "other" layer. Both
 * Meshes sit at (0,0,0) within the Group so their textures overlay
 * automatically — no anchor math per frame.
 *
 * CROUCH SYNC: the one case where layers need coupling. When
 * `_isCrouching` is true, the torso mesh Y is shifted by
 * `PLAYER.TORSO_CROUCH_Y_OFFSET` so the drawn torso lines up with the
 * folded-leg hips of the crouch-legs sheet. One offset covers every
 * crouch+torso combination — no combinatorial sheets required.
 *
 * MIGRATION: while layered PNGs don't exist yet, `getLegsAnim()` falls
 * back to the legacy `player_idle.png` and `getTorsoAnim()` returns null
 * (torso mesh becomes invisible). Result: current visual stays identical
 * until layered sheets are dropped in — each new PNG activates progressively.
 */
export class Player {
  /** Scene node. Add this to the scene; it contains both layer meshes. */
  public readonly mesh: Group;

  private readonly legsMesh: Mesh;
  private readonly torsoMesh: Mesh;

  private _x: number = PLAYER.START_X;
  private _y: number = WORLD.GROUND_Y;
  private vy = 0;
  private grounded = true;

  /** True if the 'down' key is held while grounded. */
  private _isCrouching = false;
  /** Current aiming angle in radians. 0 = Forward, PI/2 = Up, -PI/2 = Down. */
  private _aimAngle = 0;

  // ---- Layered animation state ----
  private _legsAnim: LegsAnim = 'idle';
  private _legsTime = 0;
  private _torsoAnim: TorsoAnim = 'idle';
  private _torsoTime = 0;

  /** While > 0, forces the torso into 'shoot' regardless of other state. */
  private _shootAnimTimer = 0;
  /** While > 0, forces the torso into 'melee'. */
  private _meleeAnimTimer = 0;
  /** While > 0, forces the torso into 'throw'. */
  private _throwAnimTimer = 0;

  /** Reused AABB — updated per-frame, not re-allocated. */
  private readonly _aabb: AABB = {
    x: 0,
    y: 0,
    w: PLAYER.WIDTH,
    h: PLAYER.HEIGHT,
  };

  constructor() {
    // Build both layer meshes on the same quad. Texture repeat/filter are
    // managed inside the sprite module (AD-038) — do not touch here.
    const geom = new PlaneGeometry(PLAYER.SPRITE_W, PLAYER.SPRITE_H);
    const legsInitial = getLegsAnim('idle');
    const legsMat = new MeshBasicMaterial({
      map: legsInitial.texture,
      transparent: false,
      alphaTest: 0.5,
    });
    const torsoMat = new MeshBasicMaterial({
      map: legsInitial.texture, // placeholder until preload resolves
      transparent: false,
      alphaTest: 0.5,
    });
    this.legsMesh = new Mesh(geom, legsMat);
    this.torsoMesh = new Mesh(geom, torsoMat);
    // Torso renders on top of legs.
    this.torsoMesh.position.z = 0.01;
    // Until preload finishes, hide torso — legs will show the legacy sheet.
    this.torsoMesh.visible = false;

    this.mesh = new Group();
    this.mesh.add(this.legsMesh);
    this.mesh.add(this.torsoMesh);

    // Hide whole group until any animation decodes. The fallback chain in
    // the sprite module means once the legacy sheet loads, the group can
    // already render legs+hidden-torso (legacy look).
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

  // ---------- Public accessors ----------

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
  get currentLegsAnim(): LegsAnim { return this._legsAnim; }
  get currentTorsoAnim(): TorsoAnim { return this._torsoAnim; }

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

  // ---------- Animation hooks (called by main.ts when events occur) ----------

  /** Force the torso into 'shoot' for `durationSec` seconds. */
  triggerShootAnim(durationSec: number): void {
    this._shootAnimTimer = durationSec;
  }

  /** Force the torso into 'melee' for `durationSec` seconds. */
  triggerMeleeAnim(durationSec: number): void {
    this._meleeAnimTimer = durationSec;
  }

  /** Force the torso into 'throw' for `durationSec` seconds. */
  triggerThrowAnim(durationSec: number): void {
    this._throwAnimTimer = durationSec;
  }

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
    // Flipping the Group flips both child meshes uniformly.
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

    // --- Decay per-action timers before picking torso state ---
    this._shootAnimTimer = Math.max(0, this._shootAnimTimer - dt);
    this._meleeAnimTimer = Math.max(0, this._meleeAnimTimer - dt);
    this._throwAnimTimer = Math.max(0, this._throwAnimTimer - dt);

    // --- Layered animation state machines ---
    const nextLegs = this.selectLegsAnim(vx);
    if (nextLegs !== this._legsAnim) {
      this._legsAnim = nextLegs;
      this._legsTime = 0;
    }
    this._legsTime += dt;

    const nextTorso = this.selectTorsoAnim();
    if (nextTorso !== this._torsoAnim) {
      this._torsoAnim = nextTorso;
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
    this._torsoAnim = 'idle';
    this._torsoTime = 0;
    this._shootAnimTimer = 0;
    this._meleeAnimTimer = 0;
    this._throwAnimTimer = 0;
    this.syncMesh();
  }

  // ---------- Selectors ----------

  /**
   * Movement-driven animation. Priority:
   *   airborne → jump
   *   crouching → crouch
   *   moving → run
   *   else → idle
   */
  private selectLegsAnim(vx: number): LegsAnim {
    if (!this.grounded) return 'jump';
    if (this._isCrouching) return 'crouch';
    if (vx !== 0) return 'run';
    return 'idle';
  }

  /**
   * Action-driven animation. Priority order:
   *   triggered one-shot (shoot/melee/throw, while timer > 0) >
   *   aimUp (W held, ground or air) > aimDown (S held in air) > idle.
   * When aimDown+aimUp collide in the air, the input layer forces the
   * angle to one extreme — we mirror that here by checking aimAngle.
   */
  private selectTorsoAnim(): TorsoAnim {
    if (this._meleeAnimTimer > 0) return 'melee';
    if (this._throwAnimTimer > 0) return 'throw';
    if (this._shootAnimTimer > 0) return 'shoot';
    if (this._aimAngle > 1.0) return 'aimUp';
    if (this._aimAngle < -1.0) return 'aimDown';
    return 'idle';
  }

  // ---------- Rendering ----------

  private syncMesh(): void {
    // Anchor the whole group at the player's world position.
    this.mesh.position.set(
      this._x + PLAYER.SPRITE_OFFSET_X,
      this._y + PLAYER.SPRITE_H / 2 + PLAYER.SPRITE_OFFSET_Y,
      0,
    );

    // Legs layer — always visible (either the layered sheet or the legacy
    // full-body fallback through getLegsAnim).
    const legs = getLegsAnim(this._legsAnim);
    applyLayer(this.legsMesh, legs, this._legsTime);

    // Torso layer — may be null during migration (no torso sheets yet).
    const torso = getTorsoAnim(this._torsoAnim);
    if (torso) {
      this.torsoMesh.visible = true;
      applyLayer(this.torsoMesh, torso, this._torsoTime);
      // Crouch sync: shift torso down so it rests on folded legs hips.
      this.torsoMesh.position.y = this._isCrouching ? PLAYER.TORSO_CROUCH_Y_OFFSET : 0;
    } else {
      this.torsoMesh.visible = false;
    }
  }
}

/**
 * Apply one Animation's texture + current frame offset to a Mesh.
 * Swaps `material.map` only when it changed so we don't flag extra uploads.
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
