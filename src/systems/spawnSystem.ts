import type { SoldierPool } from '../entities/enemies/soldier';
import { ENEMY, SPAWN, WORLD } from '../config/balance';

/**
 * Spawn system — exponential rate curve driving enemy spawns.
 *
 * GDD:
 *   "Cantidad de enemigos (el más importante): escalado exponencial e
 *    infinito, empezando por spawns muy lentos."
 *
 * Rate formula (see `SPAWN` constants in balance.ts):
 *   rate(t)     = min(RATE_CAP, RATE_START * exp(GROWTH * t))
 *   interval(t) = 1 / rate(t)
 *
 * For this milestone every spawn is a raso soldier. Shield/tank variants
 * will ride on top of this curve via difficulty-weighted type selection.
 */
export class SpawnSystem {
  private timer = SPAWN.INITIAL_DELAY;
  private elapsed = 0;

  constructor(private readonly soldiers: SoldierPool) {}

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

  private spawnOne(cameraRight: number): void {
    // Spawn just off the right edge of the visible frustum, feet on ground.
    const spawnX = cameraRight + ENEMY.SOLDIER.WIDTH;
    this.soldiers.spawn(spawnX, WORLD.GROUND_Y);
  }
}
