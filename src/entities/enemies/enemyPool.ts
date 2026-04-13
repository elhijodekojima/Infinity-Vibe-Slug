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
  /** Seconds until this enemy can fire its weapon. */
  shootTimer: number;
  /** If > 0, enemy has stopped to aim and will fire when this reaches 0. */
  preFireTimer: number;
  /** If > 0, enemy is "executing" a melee attack. Player dies if they stay in range frontally. */
  meleeTimer: number;
  /**
   * Active movement state:
   * - 'approach': enemy walks toward player (leftward in world coords).
   * - 'idle':     enemy holds world-position (camera scroll still drifts
   *               them left on-screen, so they never truly stand still
   *               from the player's perspective).
   * Tanks ignore this field — they always approach.
   */
  behaviorState: 'approach' | 'idle';
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
        lastShotIdHit: -1,
        shootTimer: 0,
        preFireTimer: 0,
        meleeTimer: 0,
        behaviorState: 'approach',
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
        d.shootTimer = 1.0 + Math.random() * 2.0;
        d.preFireTimer = 0;
        d.meleeTimer = 0;
        // Tanks start approaching immediately; infantry starts with a random state
        d.behaviorState = this.config.label === 'tank' ? 'approach' : (Math.random() < 0.5 ? 'approach' : 'idle');
        return true;
      }
    }
    return false;
  }

  update(dt: number, spawnProjectile?: (x: number, y: number) => void): void {
    const { speed, hesitateChance, width, poolCapacity, label } = this.config;
    const activeCount = this.activeCount;

    for (let i = 0; i < poolCapacity; i++) {
      const d = this.data[i]!;
      if (!d.active) continue;

      // Melee logic timer
      if (d.meleeTimer > 0) {
        d.meleeTimer -= dt;
      }

      // --- Pre-fire stop: when counting down, enemy is frozen
      if (d.preFireTimer > 0) {
        d.preFireTimer -= dt;
        if (d.preFireTimer <= 0 && spawnProjectile) {
          // Stop elapsed — now actually fire
          spawnProjectile(d.x, d.y + this.config.height * 0.6);
        }
        // Skip movement while aiming
        continue;
      }

      // Shooting logic — all types fire, tanks reset timer longer
      d.shootTimer -= dt;
      if (d.shootTimer <= 0) {
        // Fire rate increases with density (approx 5-25% chance per attempt)
        const prob = 0.05 + (activeCount / poolCapacity) * 0.2;
        if (Math.random() < prob) {
          // Start the pre-fire pause (enemy stops to aim)
          d.preFireTimer = 0.75;
        }
        // Tanks fire less frequently than infantry
        d.shootTimer = label === 'tank'
          ? 3.0 + Math.random() * 5.0
          : 2.0 + Math.random() * 4.0;
      }

      // --- Movement state machine ---
      // Pre-fire and hesitate freeze movement in all cases.
      if (d.preFireTimer > 0 || d.hesitatingFor > 0) {
        d.hesitatingFor -= dt;
      } else if (label === 'tank') {
        // Tank ALWAYS advances. No idle, no hesitate, no stopping.
        d.x -= speed * dt;
      } else if (d.behaviorState === 'approach') {
        // Active walk toward the player
        d.x -= speed * dt;
        d.thinkTimer -= dt;
        if (d.thinkTimer <= 0) {
          const r = Math.random();
          if (r < 0.35) {
            // Switch to idle stance
            d.behaviorState = 'idle';
            d.thinkTimer = 0.8 + Math.random() * 1.5;
          } else if (r < 0.35 + hesitateChance) {
            // Brief hesitation pause
            d.hesitatingFor = 0.25 + Math.random() * 0.55;
            d.thinkTimer = 1.2 + Math.random() * 1.8;
          } else {
            // Continue approaching
            d.thinkTimer = 1.2 + Math.random() * 1.8;
          }
        }
      } else {
        // 'idle' — enemy holds world position (camera scroll still moves them)
        d.thinkTimer -= dt;
        if (d.thinkTimer <= 0) {
          // Always resume approaching after idle
          d.behaviorState = 'approach';
          d.thinkTimer = 1.5 + Math.random() * 2.0;
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
