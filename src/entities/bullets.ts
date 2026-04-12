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
  /** Vertical velocity (u/s). */
  vy: number;
  /** If true, this bullet doesn't die on hit. */
  penetrates: boolean;
  /** Distance traveled in world units. */
  dist: number;
  /** Max distance before deactivating (controlled by weapon). */
  range: number;
  /** Unique ID of the trigger pull that spawned this projectile. */
  shotId: number;
  /** Damage dealt by this bullet. */
  damage: number;
}

/**
 * Player bullet pool — zero runtime allocation.
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
      this.data[i] = {
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        penetrates: false,
        dist: 0,
        range: Infinity,
        shotId: -1,
        damage: 1,
      };
    }
  }

  /** Fire a new bullet. Returns false if the pool is saturated. */
  spawn(x: number, y: number, vx: number, vy = 0, penetrates = false, range = Infinity, shotId = -1, damage = 1): boolean {
    for (let i = 0; i < this.capacity; i++) {
      const d = this.data[i]!;
      if (!d.active) {
        d.active = true;
        d.x = x;
        d.y = y;
        d.vx = vx;
        d.vy = vy;
        d.penetrates = penetrates;
        d.dist = 0;
        d.range = range;
        d.shotId = shotId;
        d.damage = damage;
        return true;
      }
    }
    return false;
  }

  update(dt: number, cameraRight: number): void {
    for (let i = 0; i < this.capacity; i++) {
      const d = this.data[i]!;
      if (!d.active) continue;

      const dx = d.vx * dt;
      const dy = d.vy * dt;
      d.x += dx;
      d.y += dy;
      d.dist += Math.sqrt(dx * dx + dy * dy);

      if (d.x > cameraRight + 32 || d.x < -32 || d.y < -100 || d.y > 600 || d.dist > d.range) {
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
