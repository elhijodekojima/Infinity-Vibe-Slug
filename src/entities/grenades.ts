import {
  InstancedMesh,
  PlaneGeometry,
  MeshBasicMaterial,
  Object3D,
} from 'three';
import { GRENADE, WORLD } from '../config/balance';
import { COLORS } from '../config/colors';

/**
 * Per-grenade runtime state. Parabolic projectile: constant gravity pulls
 * `vy` down each frame, `x` advances linearly with `vx`, and the grenade
 * detonates when its `y` crosses the ground line (see main loop for the
 * AoE damage resolution that reads `data[i]` after detonation).
 */
export interface GrenadeData {
  active: boolean;
  /** Center X, world units. */
  x: number;
  /** Center Y, world units. */
  y: number;
  /** Horizontal velocity (u/s), set at throw. */
  vx: number;
  /** Vertical velocity (u/s), starts positive (upward) and decays. */
  vy: number;
  /** If true, gravity is ignored (used for vertical drops in air). */
  isStraight: boolean;
}

/**
 * Grenade pool — InstancedMesh + parallel data array, same ownership
 * pattern as the bullet/enemy pools (see AD-012).
 *
 * Visuals: a small flat-colored square. Cheap, readable, legible in motion.
 * The real explosion pop happens in the `ExplosionPool` when `onExplode` is
 * triggered from `update()`.
 */
export class GrenadePool {
  public readonly mesh: InstancedMesh;
  public readonly data: GrenadeData[];
  private readonly dummy = new Object3D();
  private readonly capacity: number;

  constructor(capacity = GRENADE.POOL_CAPACITY) {
    this.capacity = capacity;

    const geom = new PlaneGeometry(GRENADE.SIZE, GRENADE.SIZE);
    const mat = new MeshBasicMaterial({ color: COLORS.GRENADE });
    this.mesh = new InstancedMesh(geom, mat, capacity);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;

    this.data = new Array(capacity);
    for (let i = 0; i < capacity; i++) {
      this.data[i] = { active: false, x: 0, y: 0, vx: 0, vy: 0, isStraight: false };
    }
  }

  /** Throw a new grenade. Returns false if the pool is saturated. */
  spawn(x: number, y: number, vx: number, vy: number, isStraight = false): boolean {
    for (let i = 0; i < this.capacity; i++) {
      const d = this.data[i]!;
      if (!d.active) {
        d.active = true;
        d.x = x;
        d.y = y;
        d.vx = vx;
        d.vy = vy;
        d.isStraight = isStraight;
        return true;
      }
    }
    return false;
  }

  /**
   * Physics step. Calls `onExplode(x, y)` once per grenade that reached
   * the ground this frame. The grenade is already marked inactive by the
   * time the callback fires, and `d.y` has been clamped to `GROUND_Y`.
   */
  update(dt: number, scrollSpeed: number, onExplode: (x: number, y: number) => void): void {
    for (let i = 0; i < this.capacity; i++) {
      const d = this.data[i]!;
      if (!d.active) continue;

      // World scroll: projectiles in flight should follow the world
      d.x -= scrollSpeed * dt;

      if (!d.isStraight) {
        d.vy += GRENADE.GRAVITY * dt;
      }
      d.x += d.vx * dt;
      d.y += d.vy * dt;

      if (d.y <= WORLD.GROUND_Y) {
        d.y = WORLD.GROUND_Y;
        d.active = false;
        onExplode(d.x, d.y);
      }
    }
    this.syncInstances();
  }

  reset(): void {
    for (const d of this.data) d.active = false;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  private syncInstances(): void {
    let idx = 0;
    for (let i = 0; i < this.capacity; i++) {
      const d = this.data[i]!;
      if (!d.active) continue;
      this.dummy.position.set(d.x, d.y, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(idx, this.dummy.matrix);
      idx++;
    }
    this.mesh.count = idx;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
