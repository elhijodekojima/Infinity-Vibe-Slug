import type { EnemyPool } from '../entities/enemies/enemyPool';
import { WORLD, ENEMY } from '../config/balance';
import { DifficultyDirector } from './difficultyDirector';

/**
 * Refactored SpawnSystem — now driven by the DifficultyDirector.
 * Removed linear interpolation; uses Phase-based weights and multipliers.
 */
export class SpawnSystem {
  private timer = 1.5; // Initial delay
  private elapsed = 0;

  constructor(
    private readonly director: DifficultyDirector,
    private readonly soldiers: EnemyPool,
    private readonly shields: EnemyPool,
    private readonly tanks: EnemyPool,
    private readonly helicopters: any,
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
    this.timer = 1.5;
    this.elapsed = 0;
  }

  private currentInterval(): number {
    // Basic exponential growth capped, then multiplied by director
    const baseRate = Math.min(4, 0.4 * Math.exp(this.elapsed * 0.01));
    const finalRate = baseRate * this.director.spawnMultiplier;
    
    return 1 / Math.max(0.01, finalRate);
  }

  private spawnOne(cameraRight: number): void {
    const weights = this.director.currentPhaseWeights;
    const r = Math.random();
    
    let pool: EnemyPool | any;
    let type: 'ground' | 'air' = 'ground';

    // Weighted selection
    if (r < weights.soldier) {
      pool = this.soldiers;
    } else if (r < weights.soldier + weights.shield) {
      pool = this.shields;
    } else if (r < weights.soldier + weights.shield + weights.tank) {
      pool = this.tanks;
    } else {
      pool = this.helicopters;
      type = 'air';
    }

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
