import { Mesh, PlaneGeometry, MeshBasicMaterial } from 'three';
import { Input } from '../core/input';
import { PLAYER, WORLD } from '../config/balance';
import { getPlayerTexture } from '../gfx/playerSprite';
import type { AABB } from '../systems/collisions';

/**
 * Player entity. Physics: horizontal move, jump with gravity, ground clamp.
 * Visuals: a procedural pixel-art sprite (see gfx/playerSprite.ts) on a
 * `PlaneGeometry` slightly larger than the collision box for a forgiving
 * hitbox feel.
 *
 * Exposes `x`, `y` (feet), `aabb`, and muzzle getters for weapons to spawn
 * bullets/grenades from. Melee + crouch will be layered on top later.
 */
export class Player {
  public readonly mesh: Mesh;

  private _x: number = PLAYER.START_X;
  private _y: number = WORLD.GROUND_Y;
  private vy = 0;
  private grounded = true;

  /** True if the 'down' key is held while grounded. */
  private _isCrouching = false;
  /** Current aiming angle in radians. 0 = Forward, PI/2 = Up, -PI/2 = Down (Air). */
  private _aimAngle = 0;
  
  /** Timer for idle animation loop */
  private _idleTime = 0;
  /** Timer for run animation loop */
  private _runTime = 0;

  /** Reused AABB — updated per-frame, not re-allocated. */
  private readonly _aabb: AABB = {
    x: 0,
    y: 0,
    w: PLAYER.WIDTH,
    h: PLAYER.HEIGHT,
  };

  constructor() {
    // Sprite quad is larger than the collision box.
    const geom = new PlaneGeometry(PLAYER.SPRITE_W, PLAYER.SPRITE_H);
    const tex = getPlayerTexture();
    // Sprite-sheet setup: 17 frames (Run[0..7], Idle[8..13], Up(14), Crouch(15), Down(16))
    tex.repeat.set(1 / 17, 1);
    const mat = new MeshBasicMaterial({
      map: tex,
      transparent: false,
      alphaTest: 0.5,
    });
    this.mesh = new Mesh(geom, mat);
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

  update(dt: number, input: Input, maxX: number, terrain: any): void {
    const down = input.isDown('down');
    const up = input.isDown('up');

    // --- State: Crouch & Aim ---
    if (this.grounded) {
      // Crouch state: S held on ground.
      this._isCrouching = down;
      
      // Aim state (Grounded): W held, mutually exclusive with crouch.
      if (!this._isCrouching) {
        const target = up ? Math.PI / 2 : 0;
        // Gradual transition
        const step = PLAYER.AIM_SPEED * dt;
        if (this._aimAngle < target) this._aimAngle = Math.min(target, this._aimAngle + step);
        else if (this._aimAngle > target) this._aimAngle = Math.max(target, this._aimAngle - step);
      } else {
        this._aimAngle = 0; // Crouch looks forward
      }
    } else {
      // Air state: S held forces instant down-aim.
      this._isCrouching = false;
      if (down) {
        this._aimAngle = -Math.PI / 2;
      } else {
        // Air-aim up is also gradual.
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

    // Animation Timers
    if (Math.abs(vx) > 0 && this.grounded && !this._isCrouching && this._aimAngle === 0) {
      this._runTime += dt;
      this._idleTime = 0;
      this.mesh.scale.x = vx < 0 ? -1 : 1;
    } else if (vx === 0 && this.grounded && !this._isCrouching && this._aimAngle === 0) {
      this._idleTime += dt;
      this._runTime = 0;
    } else {
      this._idleTime = 0;
      this._runTime = 0;
    }

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

    // Variable jump height: if we release space while moving up, cut velocity.
    if (!this.grounded && !jumpHeld && this.vy > 0) {
      this.vy *= 0.5; // "Short jump" logic
    }

    // --- Gravity ---
    this.vy += PLAYER.GRAVITY * dt;
    this._y += this.vy * dt;

    // --- Terrain Collision ---
    const surfaceY = terrain.getSurfaceHeight(this._x, this._y, this.vy);
    
    // Land if we hit the surface while falling (vy <= 0).
    // Small buffer for slopes: if we are within range of surface, stick to it.
    if (this._y <= surfaceY && (this.vy <= 0 || (this.grounded && this._y > surfaceY - 5))) {
      this._y = surfaceY;
      this.vy = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }

    this.syncMesh();
  }

  reset(): void {
    this._x = PLAYER.START_X;
    this._y = WORLD.GROUND_Y;
    this.vy = 0;
    this.grounded = true;
    this.syncMesh();
  }

  private syncMesh(): void {
    // QUICK POC: Loop the 6 idle frames continuously using a global timer
    const time = this._idleTime + this._runTime;
    const IDLE_FPS = 8; // Good cadence for idle
    const frame = Math.floor(time * IDLE_FPS) % 6;

    const map = this.mesh.material instanceof MeshBasicMaterial ? this.mesh.material.map : null;
    if (map) map.offset.x = frame * (1 / 6);

    this.mesh.position.set(
      this._x + PLAYER.SPRITE_OFFSET_X, 
      this._y + (PLAYER.SPRITE_H / 2) + PLAYER.SPRITE_OFFSET_Y, 
      0
    );
  }
}
