import type { EnemyPool } from '../entities/enemies/enemyPool';
import { SPAWN, WORLD, ENEMY } from '../config/balance';

/**
 * Spawn system — drives both the exponential SPAWN RATE curve and the
 * sliding TYPE DISTRIBUTION for the three ground-enemy variants.
 *
 * GDD:
 *   "Cantidad de enemigos (el más importante): escalado exponencial e
 *    infinito, empezando por spawns muy lentos."
 *   "Probabilidades base: 90% raso, 9% escudo, 1% tanqueta → cap 70/20/10."
 *
 * The math is intentionally simple:
 *   interval(t) = 1 / min(RATE_CAP, RATE_START * exp(GROWTH * t))
 *   p_type(t)   = lerp(TYPE_START[type], TYPE_CAP[type], t / TYPE_RAMP_TIME)
 *
 * Three pools are passed in. Selection happens lazily at the moment of
 * spawn — each call re-rolls fresh based on the current `elapsed` time.
 */
export class SpawnSystem {
  private timer = SPAWN.INITIAL_DELAY;
  private elapsed = 0;

  constructor(
    private readonly soldiers: EnemyPool,
    private readonly shields: EnemyPool,
    private readonly tanks: EnemyPool,
    private readonly helicopters: any, // Using any for now to avoid import loop or just import HelicopterPool
  ) {}

  update(dt: number, cameraRight: number): void {
    this.elapsed += dt;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.spawnOne(cameraRight);
      this.timer += this.currentInterval();
    }
  }

  reset(): void {
    this.timer = SPAWN.INITIAL_DELAY;
    this.elapsed = 0;
  }

  /** Seconds of active gameplay elapsed — useful for HUD / difficulty debug. */
  get elapsedTime(): number {
    return this.elapsed;
  }

  private currentInterval(): number {
    const rate = Math.min(
      SPAWN.RATE_CAP,
      SPAWN.RATE_START * Math.exp(this.elapsed * SPAWN.GROWTH),
    );
    return 1 / Math.max(0.001, rate);
  }

  /** Picks one of the four pools based on the sliding type distribution. */
  private pickPool(): { pool: any, type: 'ground' | 'air' } {
    const t = Math.min(1, this.elapsed / SPAWN.TYPE_RAMP_TIME);
    const pSoldier = lerp(SPAWN.TYPE_START.soldier, SPAWN.TYPE_CAP.soldier, t);
    const pShield  = lerp(SPAWN.TYPE_START.shield,  SPAWN.TYPE_CAP.shield,  t);
    const pTank    = lerp(SPAWN.TYPE_START.tank,    SPAWN.TYPE_CAP.tank,    t);
    // pHeli is implicit: 1 - sum(others)

    const r = Math.random();
    if (r < pSoldier) return { pool: this.soldiers, type: 'ground' };
    if (r < pSoldier + pShield) return { pool: this.shields, type: 'ground' };
    if (r < pSoldier + pShield + pTank) return { pool: this.tanks, type: 'ground' };
    return { pool: this.helicopters, type: 'air' };
  }

  private spawnOne(cameraRight: number): void {
    const { pool, type } = this.pickPool();
    // Spawn just off the right edge of the visible frustum.
    const spawnX = cameraRight + pool.config.width;
    
    if (type === 'ground') {
      pool.spawn(spawnX, WORLD.GROUND_Y);
    } else {
      pool.spawn(spawnX, ENEMY.HELICOPTER.FLY_HEIGHT);
    }
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
