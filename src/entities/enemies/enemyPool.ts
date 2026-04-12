import {
  InstancedMesh,
  PlaneGeometry,
  MeshBasicMaterial,
  Object3D,
  Texture,
} from 'three';

/**
 * Immutable configuration of a concrete enemy type.
 *
 * A single `EnemyPool` class plays host to every ground enemy variant —
 * raso soldiers, shield soldiers and tanks all live in their own pool,
 * differing only by the values in this config. Bigger behavioral
 * divergences (tank rolling shots, per-type death animations, …) will
 * be layered on top later without breaking the generic abstraction.
 */
export interface EnemyConfig {
  /** Short identifier for debugging / logs. */
  readonly label: 'soldier' | 'shield' | 'tank';
  /** Collision + visual width (world units). */
  readonly width: number;
  /** Collision + visual height (world units). */
  readonly height: number;
  /** Horizontal walking speed (units / sec). */
  readonly speed: number;
  /** Probability [0,1] of starting a hesitation pause on a "think tick". */
  readonly hesitateChance: number;
  /** Flat-color hex RGB for the placeholder InstancedMesh material. */
  readonly color: number;
  /** Starting hit points (soldiers/shields are 1; tanks are 10-12). */
  readonly hp: number;
  /** Score awarded when an instance dies. */
  readonly score: number;
  /** If true, player bullets are consumed on hit but deal zero damage. */
  readonly blocksFrontalBullets: boolean;
  /** Max concurrent instances of this type. */
  readonly poolCapacity: number;
  /** If true, this unit takes no damage from melee attacks. */
  readonly poolCapacity: number;
  /** If true, this unit takes no damage from melee attacks. */
  readonly isMeleeImmune: boolean;
  /** Sprite texture (optional). */
  readonly map?: Texture;
}

export interface EnemyData {
  active: boolean;
  /** Feet X (world units). */
  x: number;
  /** Feet Y (world units). */
  y: number;
  /** Current hit points. Kills when <= 0. */
  hp: number;
  /** Seconds until next "decision" tick. */
  thinkTimer: number;
  /** Seconds of hesitation remaining (movement frozen while > 0). */
  hesitatingFor: number;
  /** Tracks the ID of the last projectile shot that hit this enemy. */
  lastShotIdHit: number;
}

/**
 * Generic ground-enemy pool: one `InstancedMesh` + a data array of the
 * same length. The update loop walks the array, advances each active
 * enemy, and at the end packs the active ones into the first N instance
 * slots of the mesh before setting `count`. Zero runtime allocation.
 *
 * Behavior per the GDD:
 *   - Walk left at `config.speed`.
 *   - Occasionally pause for 0.25–0.8 s at the end of a 1.2–3 s think
 *     window, with probability `config.hesitateChance`.
 *   - Despawn off-screen to the left.
 */
export class EnemyPool {
  public readonly mesh: InstancedMesh;
  public readonly data: EnemyData[];
  public readonly config: EnemyConfig;
  private readonly dummy = new Object3D();

  constructor(config: EnemyConfig) {
    this.config = config;

    const geom = new PlaneGeometry(config.width, config.height);
    const mat = new MeshBasicMaterial({ 
      color: config.color,
      map: config.map || null,
      transparent: !!config.map,
      alphaTest: 0.5, // Standard for crisp pixel cutouts
    });
    this.mesh = new InstancedMesh(geom, mat, config.poolCapacity);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;

    this.data = new Array(config.poolCapacity);
    for (let i = 0; i < config.poolCapacity; i++) {
      this.data[i] = {
        active: false,
        x: 0,
        y: 0,
        hp: 0,
        thinkTimer: 0,
        hesitatingFor: 0,
      };
    }
  }

  /** Returns true if a slot was available. */
  spawn(x: number, y: number): boolean {
    for (let i = 0; i < this.config.poolCapacity; i++) {
      const d = this.data[i]!;
      if (!d.active) {
        d.active = true;
        d.x = x;
        d.y = y;
        d.hp = this.config.hp;
        d.thinkTimer = 1 + Math.random() * 1.5;
        d.hesitatingFor = 0;
        d.lastShotIdHit = -1;
        return true;
      }
    }
    return false;
  }

  update(dt: number): void {
    const { speed, hesitateChance, width, poolCapacity } = this.config;
    for (let i = 0; i < poolCapacity; i++) {
      const d = this.data[i]!;
      if (!d.active) continue;

      if (d.hesitatingFor > 0) {
        d.hesitatingFor -= dt;
      } else {
        d.x -= speed * dt;
        d.thinkTimer -= dt;
        if (d.thinkTimer <= 0) {
          d.thinkTimer = 1.2 + Math.random() * 1.8;
          if (Math.random() < hesitateChance) {
            d.hesitatingFor = 0.25 + Math.random() * 0.55;
          }
        }
      }

      if (d.x < -width * 2) {
        d.active = false;
      }
    }
    this.syncInstances();
  }

  /**
   * Deal damage to instance `i`. Returns true iff this hit killed it.
   * Callers read `this.config.score` to attribute points.
   */
  damageAt(i: number, amount: number): boolean {
    const d = this.data[i];
    if (!d || !d.active) return false;
    d.hp -= amount;
    if (d.hp <= 0) {
      d.active = false;
      return true;
    }
    return false;
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
    const h = this.config.height;
    let idx = 0;
    for (let i = 0; i < this.config.poolCapacity; i++) {
      const d = this.data[i]!;
      if (!d.active) continue;
      this.dummy.position.set(d.x, d.y + h / 2, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(idx, this.dummy.matrix);
      idx++;
    }
    this.mesh.count = idx;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
