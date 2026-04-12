import {
  InstancedMesh,
  PlaneGeometry,
  MeshBasicMaterial,
  Object3D,
} from 'three';
import { BULLET } from '../config/balance';
import { COLORS } from '../config/colors';

/**
 * Per-bullet runtime state. Kept as a plain object for cache-friendly loops
 * and to allow direct index-based kills from collision code.
 */
export interface BulletData {
  active: boolean;
  /** Center X in world units. */
  x: number;
  /** Center Y in world units. */
  y: number;
  /** Horizontal velocity (u/s). */
  vx: number;
}

/**
 * Player bullet pool — zero runtime allocation.
 *
 * One `InstancedMesh` backs up to `capacity` bullets. Active entries are
 * packed into the first N instance slots every frame and `mesh.count` is
 * updated so only active instances hit the GPU.
 *
 * Spawns reuse the first inactive slot; if the pool is full the spawn is
 * silently dropped (shouldn't happen with a sensible POOL_CAPACITY).
 */
export class BulletPool {
  public readonly mesh: InstancedMesh;
  public readonly data: BulletData[];
  private readonly dummy = new Object3D();
  private readonly capacity: number;

  constructor(capacity = BULLET.PLAYER.POOL_CAPACITY) {
    this.capacity = capacity;

    const geom = new PlaneGeometry(BULLET.PLAYER.WIDTH, BULLET.PLAYER.HEIGHT);
    const mat = new MeshBasicMaterial({ color: COLORS.BULLET_PLAYER });
    this.mesh = new InstancedMesh(geom, mat, capacity);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;

    this.data = new Array(capacity);
    for (let i = 0; i < capacity; i++) {
      this.data[i] = { active: false, x: 0, y: 0, vx: 0 };
    }
  }

  /** Fire a new bullet. Returns false if the pool is saturated. */
  spawn(x: number, y: number, vx: number): boolean {
    for (let i = 0; i < this.capacity; i++) {
      const d = this.data[i]!;
      if (!d.active) {
        d.active = true;
        d.x = x;
        d.y = y;
        d.vx = vx;
        return true;
      }
    }
    return false;
  }

  update(dt: number, cameraRight: number): void {
    for (let i = 0; i < this.capacity; i++) {
      const d = this.data[i]!;
      if (!d.active) continue;
      d.x += d.vx * dt;
      if (d.x > cameraRight + 16 || d.x < -16) {
        d.active = false;
      }
    }
    this.syncInstances();
  }

  /** Invalidate a bullet by pool index (used from collision resolution). */
  killAt(i: number): void {
    const d = this.data[i];
    if (d && d.active) d.active = false;
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
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(idx, this.dummy.matrix);
      idx++;
    }
    this.mesh.count = idx;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
