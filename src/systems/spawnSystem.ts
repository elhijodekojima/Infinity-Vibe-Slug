import type { EnemyPool } from '../entities/enemies/enemyPool';
import { WORLD, ENEMY, TERRAIN_INTENT_WEIGHTS } from '../config/balance';
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

  update(dt: number, cameraRight: number, terrain: any): void {
    this.elapsed += dt;
    this.timer -= dt;

    if (this.timer <= 0) {
      this.spawnOne(cameraRight, terrain);
      this.timer += this.currentInterval(terrain);
    }
  }

  reset(): void {
    this.timer = 1.5;
    this.elapsed = 0;
  }

  private currentInterval(terrain: any): number {
    let baseRate = Math.min(4, 0.4 * Math.exp(this.elapsed * 0.01));
    
    // Swarm obstacle: reduce enemy count to focus on traversal ( parkour )
    // We check if many platforms are active as a proxy for "swarm"
    if (terrain.platforms.length > 5) {
      baseRate *= 0.5;
    }

    const finalRate = baseRate * this.director.spawnMultiplier;
    return 1 / Math.max(0.01, finalRate);
  }

  private spawnOne(cameraRight: number, terrain: any): void {
    const context = this.director.context;
    const baseWeights = { ...this.director.currentPhaseWeights };
    const intentMod = TERRAIN_INTENT_WEIGHTS[context.terrainIntent] || {};
    
    // Dynamic CombatContext Scaling
    const weights = {
      soldier: baseWeights.soldier * (intentMod.soldier || 1) * (context.pressure > 0.8 ? 1.2 : 1),
      shield: baseWeights.shield * (intentMod.shield || 1),
      tank: baseWeights.tank * (intentMod.tank || 1),
      helicopter: baseWeights.helicopter * (intentMod.helicopter || 1)
    };

    let pool: EnemyPool | any;
    let type: 'ground' | 'air' = 'ground';
    let specificZoneType: 'ground' | 'elevated' | 'any' = 'any';

    const total = weights.soldier + weights.shield + weights.tank + weights.helicopter;
    const roll = Math.random() * total;

    if (roll < weights.soldier) {
      pool = this.soldiers;
    } else if (roll < weights.soldier + weights.shield) {
      pool = this.shields;
      specificZoneType = Math.random() < 0.5 ? 'elevated' : 'any'; // Shields like high ground
    } else if (roll < weights.soldier + weights.shield + weights.tank) {
      pool = this.tanks;
      specificZoneType = 'ground'; // Tanks MUST be on ground
    } else {
      pool = this.helicopters;
      type = 'air';
    }

    const spawnX = cameraRight + pool.config.width;
    
    if (type === 'ground') {
      const zones = terrain.getSpawnZones(cameraRight);
      let targetZones = zones.ground;

      if (specificZoneType === 'elevated' && zones.elevated.length > 0) {
         targetZones = zones.elevated;
      } else if (specificZoneType === 'any' && zones.elevated.length > 0 && Math.random() < 0.3) {
         targetZones = zones.elevated;
      }

      if (targetZones.length === 0) targetZones = zones.ground; // fallback
      
      const zone = targetZones[Math.floor(Math.random() * targetZones.length)];
      
      let finalSpawnX = spawnX;
      if (zone.type === 'elevated') {
        // Center on platform roughly
        finalSpawnX = Math.max(cameraRight, zone.x - 20 + Math.random() * 40);
      } else if (zone.x > cameraRight) {
         finalSpawnX = zone.x + Math.random() * 50;
      }

      const spawnY = terrain.getSurfaceHeight(finalSpawnX, 300, -100);
      pool.spawn(finalSpawnX, spawnY);
    } else {
      pool.spawn(spawnX, ENEMY.HELICOPTER.FLY_HEIGHT);
    }
  }
}


function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
