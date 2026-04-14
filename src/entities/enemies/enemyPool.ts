import {
  InstancedMesh,
  PlaneGeometry,
  MeshBasicMaterial,
  Object3D,
  Texture,
} from 'three';
import { PLAYER, OBSTACLE } from '../../config/balance';

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
}export interface EnemyData {
  active: boolean;
  /** Feet X (world units). */
  x: number;
  /** Feet Y (world units). */
  y: number;
  /** Vertical velocity. */
  vy: number;
  grounded: boolean;
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
  /** If > 0, soldier is waiting to perform a jump/drop. */
  jumpWaitTimer: number;
  /**
   * Active movement state:
   * - 'approach': enemy walks toward player (leftward in world coords).
   * - 'idle':     enemy holds world-position.
   */
  behaviorState: 'approach' | 'idle';
}

/**
 * Generic ground-enemy pool: one `InstancedMesh` + a data array of the
 * same length. 
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
      alphaTest: 0.5, 
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
        vy: 0,
        grounded: true,
        hp: 0,
        thinkTimer: 0,
        hesitatingFor: 0,
        lastShotIdHit: -1,
        shootTimer: 0,
        preFireTimer: 0,
        meleeTimer: 0,
        jumpWaitTimer: 0,
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
        d.vy = 0;
        d.grounded = true;
        d.hp = this.config.hp;
        d.thinkTimer = 1 + Math.random() * 1.5;
        d.hesitatingFor = 0;
        d.lastShotIdHit = -1;
        d.shootTimer = 1.0 + Math.random() * 2.0;
        d.preFireTimer = 0;
        d.meleeTimer = 0;
        d.jumpWaitTimer = 0;
        d.behaviorState = this.config.label === 'tank' ? 'approach' : (Math.random() < 0.5 ? 'approach' : 'idle');
        return true;
      }
    }
    return false;
  }

  update(dt: number, scrollSpeed: number, terrain: any, playerY: number, spawnProjectile?: (x: number, y: number) => void): void {
    const { speed, hesitateChance, width, poolCapacity, label } = this.config;
    const activeCount = this.activeCount;

    for (let i = 0; i < poolCapacity; i++) {
      const d = this.data[i]!;
      if (!d.active) continue;
      
      // World scroll: keep enemies attached to platforms
      const scrollDelta = scrollSpeed * dt;
      d.x -= scrollDelta;
      // --- Physics ---
      if (!d.grounded) {
        d.vy += PLAYER.GRAVITY * dt;
      }
      d.y += d.vy * dt;

      const surfaceY = terrain.getSurfaceHeight(d.x, d.y, d.vy);
      if (d.y <= surfaceY && d.vy <= 0) {
        d.y = surfaceY;
        d.vy = 0;
        d.grounded = true;
      } else if (d.y > surfaceY + 2) { // Buffer to avoid floating state on tiny deltas
        d.grounded = false;
      }

      // Melee logic timer
      if (d.meleeTimer > 0) {
        d.meleeTimer -= dt;
      }

      // --- Pre-fire stop ---
      if (d.preFireTimer > 0) {
        d.preFireTimer -= dt;
        if (d.preFireTimer <= 0 && spawnProjectile) {
          const fireY = label === 'tank' 
            ? d.y + 6 
            : d.y + this.config.height * 0.65;
          spawnProjectile(d.x, fireY);
        }
        continue;
      }

      // Shooting logic
      d.shootTimer -= dt;
      if (d.shootTimer <= 0) {
        const prob = 0.05 + (activeCount / poolCapacity) * 0.2;
        if (Math.random() < prob) {
          d.preFireTimer = 0.75;
        }
        d.shootTimer = label === 'tank'
          ? 3.0 + Math.random() * 5.0
          : 2.0 + Math.random() * 4.0;
      }

      // --- Movement & AI ---
      if (d.preFireTimer > 0 || d.hesitatingFor > 0) {
        d.hesitatingFor -= dt;
        continue;
      }

      // Edge Detection & Vertical AI
      const atEdge = terrain.isFallingEdge(d.x - speed * dt, d.y);
      
      if (label === 'soldier') {
        if (d.jumpWaitTimer > 0) {
          d.jumpWaitTimer -= dt;
          if (d.jumpWaitTimer <= 0) {
            if (playerY > d.y + 20) {
              // Perform Jump
              d.vy = PLAYER.JUMP_VELOCITY * 0.8;
              d.grounded = false;
            } else {
              // Just drop (walk forward)
              d.x -= speed * dt;
            }
          }
          continue;
        }

        if (atEdge && d.grounded) {
          const dy = playerY - d.y;
          // If player is on a different level, wait then transition
          if (Math.abs(dy) > 20) {
            d.jumpWaitTimer = OBSTACLE.AI.JUMP_DELAY_MIN + Math.random() * (OBSTACLE.AI.JUMP_DELAY_MAX - OBSTACLE.AI.JUMP_DELAY_MIN);
            continue;
          }
        }
      } else {
        // Shield/Tank stop at edges
        if (atEdge && d.grounded) {
           continue; // Stop movement for THIS enemy, but continue the loop for others.
        }
      }

      // Normal approach
      if (label === 'tank') {
        d.x -= speed * dt;
      } else if (d.behaviorState === 'approach') {
        d.x -= speed * dt;
        d.thinkTimer -= dt;
        if (d.thinkTimer <= 0) {
          const r = Math.random();
          if (r < 0.35) {
            d.behaviorState = 'idle';
            d.thinkTimer = 0.8 + Math.random() * 1.5;
          } else if (r < 0.35 + hesitateChance) {
            d.hesitatingFor = 0.25 + Math.random() * 0.55;
            d.thinkTimer = 1.2 + Math.random() * 1.8;
          } else {
            d.thinkTimer = 1.2 + Math.random() * 1.8;
          }
        }
      } else {
        d.thinkTimer -= dt;
        if (d.thinkTimer <= 0) {
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
