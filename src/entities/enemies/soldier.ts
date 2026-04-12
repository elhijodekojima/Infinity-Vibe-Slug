import {
  InstancedMesh,
  PlaneGeometry,
  MeshBasicMaterial,
  Object3D,
} from 'three';
import { ENEMY } from '../../config/balance';
import { COLORS } from '../../config/colors';

/**
 * Per-soldier runtime state.
 *
 * The GDD's "personality" for the raso soldier is: reactive movement with
 * brief hesitation animations, never a straight charge at the player. We
 * approximate that with two timers:
 *   - `thinkTimer` counts down until the next "decision" tick.
 *   - `hesitatingFor` > 0 freezes horizontal movement for that many seconds.
 */
export interface SoldierData {
  active: boolean;
  /** Feet X (world units). */
  x: number;
  /** Feet Y (world units). */
  y: number;
  /** Seconds until next think tick. */
  thinkTimer: number;
  /** Seconds of hesitation remaining. */
  hesitatingFor: number;
}

/**
 * Raso (basic) soldier pool. Single `InstancedMesh`, object-pooled state.
 *
 * For this milestone every enemy on screen is a raso. Shield + tank variants
 * will land as sibling pools in `src/entities/enemies/` once the core combat
 * loop is validated.
 */
export class SoldierPool {
  public readonly mesh: InstancedMesh;
  public readonly data: SoldierData[];
  private readonly dummy = new Object3D();
  private readonly capacity: number;

  constructor(capacity = ENEMY.SOLDIER.POOL_CAPACITY) {
    this.capacity = capacity;

    const geom = new PlaneGeometry(ENEMY.SOLDIER.WIDTH, ENEMY.SOLDIER.HEIGHT);
    const mat = new MeshBasicMaterial({ color: COLORS.ENEMY_SOLDIER });
    this.mesh = new InstancedMesh(geom, mat, capacity);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;

    this.data = new Array(capacity);
    for (let i = 0; i < capacity; i++) {
      this.data[i] = {
        active: false,
        x: 0,
        y: 0,
        thinkTimer: 0,
        hesitatingFor: 0,
      };
    }
  }

  /** Returns true if a slot was available. */
  spawn(x: number, y: number): boolean {
    for (let i = 0; i < this.capacity; i++) {
      const d = this.data[i]!;
      if (!d.active) {
        d.active = true;
        d.x = x;
        d.y = y;
        d.thinkTimer = 1 + Math.random() * 1.5;
        d.hesitatingFor = 0;
        return true;
      }
    }
    return false;
  }

  update(dt: number): void {
    for (let i = 0; i < this.capacity; i++) {
      const d = this.data[i]!;
      if (!d.active) continue;

      if (d.hesitatingFor > 0) {
        d.hesitatingFor -= dt;
      } else {
        // Walk left toward the player.
        d.x -= ENEMY.SOLDIER.SPEED * dt;

        // Think tick: maybe start a new hesitation.
        d.thinkTimer -= dt;
        if (d.thinkTimer <= 0) {
          d.thinkTimer = 1.2 + Math.random() * 1.8;
          if (Math.random() < ENEMY.SOLDIER.HESITATE_CHANCE) {
            d.hesitatingFor = 0.25 + Math.random() * 0.55;
          }
        }
      }

      // Despawn off-screen left.
      if (d.x < -ENEMY.SOLDIER.WIDTH * 2) {
        d.active = false;
      }
    }
    this.syncInstances();
  }

  killAt(i: number): void {
    const d = this.data[i];
    if (d && d.active) d.active = false;
  }

  reset(): void {
    for (const d of this.data) d.active = false;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  get activeCount(): number {
    let n = 0;
    for (const d of this.data) if (d.active) n++;
    return n;
  }

  private syncInstances(): void {
    let idx = 0;
    for (let i = 0; i < this.capacity; i++) {
      const d = this.data[i]!;
      if (!d.active) continue;
      this.dummy.position.set(d.x, d.y + ENEMY.SOLDIER.HEIGHT / 2, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(idx, this.dummy.matrix);
      idx++;
    }
    this.mesh.count = idx;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
