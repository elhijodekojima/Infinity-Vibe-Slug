import {
  InstancedMesh,
  PlaneGeometry,
  MeshBasicMaterial,
  Object3D,
} from 'three';
import { EXPLOSION } from '../config/balance';
import { COLORS } from '../config/colors';

/**
 * Visual-only explosion pool.
 *
 * The actual AoE damage is resolved inline in `main.ts` at the moment a
 * grenade detonates — this pool exists purely so the player SEES a flash
 * expanding and contracting where it happened. Keeping damage separate
 * from the visual means the same pool is re-usable by the rocket launcher
 * later without touching gameplay logic.
 *
 * The animation curve is a half-sine: scale = sin(age / duration · π).
 * That's 0 → 1 → 0 in one smooth pop, peaking at the midpoint and feeling
 * way better than a linear grow/shrink.
 */
export interface ExplosionData {
  active: boolean;
  x: number;
  y: number;
  /** Seconds since spawn. */
  age: number;
  /** Peak radius of the flash (world units). */
  radius: number;
}

export class ExplosionPool {
  public readonly mesh: InstancedMesh;
  public readonly data: ExplosionData[];
  private readonly dummy = new Object3D();
  private readonly capacity: number;

  constructor(capacity = EXPLOSION.POOL_CAPACITY) {
    this.capacity = capacity;

    // A 1×1 quad we scale per-instance to `radius * curve(age)`.
    const geom = new PlaneGeometry(1, 1);
    const mat = new MeshBasicMaterial({ color: COLORS.EXPLOSION });
    this.mesh = new InstancedMesh(geom, mat, capacity);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;

    this.data = new Array(capacity);
    for (let i = 0; i < capacity; i++) {
      this.data[i] = { active: false, x: 0, y: 0, age: 0, radius: 0 };
    }
  }

  spawn(x: number, y: number, radius: number): boolean {
    for (let i = 0; i < this.capacity; i++) {
      const d = this.data[i]!;
      if (!d.active) {
        d.active = true;
        d.x = x;
        d.y = y;
        d.age = 0;
        d.radius = radius;
        return true;
      }
    }
    return false;
  }

  update(dt: number, scrollSpeed: number): void {
    for (let i = 0; i < this.capacity; i++) {
      const d = this.data[i]!;
      if (!d.active) continue;

      // World scroll: explosions follow the ground
      d.x -= scrollSpeed * dt;

      d.age += dt;
      if (d.age >= EXPLOSION.DURATION) {
        d.active = false;
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

      const t = d.age / EXPLOSION.DURATION; // 0..1
      const curve = Math.sin(t * Math.PI); // half-sine pop
      const size = d.radius * 2 * curve;

      this.dummy.position.set(d.x, d.y, 0);
      this.dummy.scale.set(size, size, 1);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(idx, this.dummy.matrix);
      idx++;
    }
    this.mesh.count = idx;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
