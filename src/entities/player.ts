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

  /** Reused AABB — updated per-frame, not re-allocated. */
  private readonly _aabb: AABB = {
    x: 0,
    y: 0,
    w: PLAYER.WIDTH,
    h: PLAYER.HEIGHT,
  };

  constructor() {
    // Sprite quad is larger than the collision box — the visual has ~3
    // pixels of slack on every side so the hitbox feels generous.
    const geom = new PlaneGeometry(PLAYER.SPRITE_W, PLAYER.SPRITE_H);
    const mat = new MeshBasicMaterial({
      map: getPlayerTexture(),
      transparent: false,
      // Alpha-test cuts out transparent pixels from the canvas texture
      // without enabling full alpha blending — cleaner for pixel art.
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
    this._aabb.y = this._y + PLAYER.HEIGHT / 2;
    return this._aabb;
  }

  /** World position where bullets spawn (right side of torso). */
  get muzzleX(): number { return this._x + PLAYER.WIDTH * 0.55; }
  get muzzleY(): number { return this._y + PLAYER.HEIGHT * 0.55; }

  update(dt: number, input: Input, maxX: number): void {
    // --- Horizontal ---
    let vx = 0;
    if (input.isDown('left')) vx -= PLAYER.MOVE_SPEED;
    if (input.isDown('right')) vx += PLAYER.MOVE_SPEED;
    this._x += vx * dt;

    // Clamp to screen horizontally (Metal Slug-style soft bounds).
    const minX = PLAYER.WIDTH / 2;
    const maxRight = maxX - PLAYER.WIDTH / 2;
    if (this._x < minX) this._x = minX;
    if (this._x > maxRight) this._x = maxRight;

    // --- Jump (edge-triggered) ---
    if (this.grounded && input.wasPressed('up')) {
      this.vy = PLAYER.JUMP_VELOCITY;
      this.grounded = false;
    }

    // --- Gravity ---
    this.vy += PLAYER.GRAVITY * dt;
    this._y += this.vy * dt;

    if (this._y <= WORLD.GROUND_Y) {
      this._y = WORLD.GROUND_Y;
      this.vy = 0;
      this.grounded = true;
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
    // The mesh is centered on its geometry; offset so y is the feet
    // position. We use the SPRITE height here because the visual quad is
    // larger than the collision box.
    this.mesh.position.set(this._x, this._y + PLAYER.SPRITE_H / 2, 0);
  }
}
