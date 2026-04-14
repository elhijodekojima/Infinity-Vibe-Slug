import { DIRECTOR, SpawnPhase, SPAWN, DROP, TerrainIntent, CombatContext, COMBAT_CONTEXT } from '../config/balance';
import type { TerrainManager } from './terrain/terrainManager';

export interface PlayerStats {
  ammoNormalized: number; // 0 (empty) to 1 (full)
  isPistol: boolean;
  hasSpecialWeapon: boolean;
  recentDanger: number;   // normalized 0-1 (near misses, low health if it existed)
}

export class DifficultyDirector {
  private pressure = 0;
  private currentPhase: SpawnPhase = 'mixed';
  private phaseTimer = 0;
  private timeSinceLastDrop = 0;
  private killsSinceLastDrop = 0;
  private updateTimer = 0;

  private spawnRateMultiplier = 1.0;
  private dropChanceMultiplier = 1.0;

  public context: CombatContext = {
    phase: 'mixed',
    terrainIntent: 'flat',
    pressure: 0,
    enemyDensity: 0,
    playerState: { hasSpecialWeapon: false, ammoRatio: 0 }
  };

  constructor(private readonly terrain: TerrainManager) {
    this.rollPhase();
  }

  public update(dt: number, stats: PlayerStats, enemiesNearbyCount: number): void {
    this.timeSinceLastDrop += dt;
    this.phaseTimer -= dt;
    this.updateTimer -= dt;

    if (this.phaseTimer <= 0) {
      this.rollPhase();
    }

    if (this.updateTimer <= 0) {
      this.updateTimer = COMBAT_CONTEXT.UPDATE_INTERVAL;
      this.calculatePressure(stats, enemiesNearbyCount);
      this.applyCoupling();

      // Update CombatContext layer
      this.context.phase = this.currentPhase;
      this.context.terrainIntent = this.terrain.getCurrentTerrainIntent();
      this.context.pressure = this.pressure;
      this.context.enemyDensity = enemiesNearbyCount;
      this.context.playerState.hasSpecialWeapon = stats.hasSpecialWeapon;
      this.context.playerState.ammoRatio = stats.ammoNormalized;

      this.evaluateTerrainOverrides();
    }
  }

  private evaluateTerrainOverrides(): void {
    const intent = this.context.terrainIntent;
    
    // Contextual Phase overrides
    if (intent === 'choke_low' && this.currentPhase !== 'pressure') {
      this.currentPhase = 'pressure';
    } 
    if (intent === 'chaotic' && Math.random() < 0.3 && this.currentPhase !== 'swarm') {
      this.currentPhase = 'swarm';
    }
  }

  private calculatePressure(stats: PlayerStats, enemiesCount: number): void {
    const enemiesFactor = Math.min(1, enemiesCount / 10); // 10 enemies = max density pressure
    const ammoFactor = stats.isPistol ? 1 : (1 - stats.ammoNormalized);
    
    this.pressure = 
      enemiesFactor * DIRECTOR.WEIGHTS.ENEMIES_NEARBY +
      Math.min(1, this.timeSinceLastDrop / 30) * DIRECTOR.WEIGHTS.TIME_SINCE_DROP +
      ammoFactor * DIRECTOR.WEIGHTS.LOW_AMMO +
      stats.recentDanger * DIRECTOR.WEIGHTS.DANGER;
    
    // Normalize pressure roughly to 0-1 (though weights sum to > 1 for intensity)
    this.pressure = Math.min(1.5, this.pressure);
  }

  private applyCoupling(): void {
    // Dominating: high ammo, low pressure, etc (simplification for now)
    // Actually the user defined playerDominating and playerStruggling
    // We'll use the pressure as a proxy for now or refine if needed.
    
    if (this.pressure < 0.3) {
      // Player is dominating
      this.spawnRateMultiplier = DIRECTOR.DOMINATING.SPAWN_MULT;
      this.dropChanceMultiplier = DIRECTOR.DOMINATING.DROP_MULT;
    } else if (this.pressure > 0.8) {
      // Player is struggling
      this.spawnRateMultiplier = DIRECTOR.STRUGGLING.SPAWN_MULT;
      this.dropChanceMultiplier = DIRECTOR.STRUGGLING.DROP_MULT;
    } else {
      this.spawnRateMultiplier = 1.0;
      this.dropChanceMultiplier = 1.0;
    }
  }

  private rollPhase(): void {
    const phases: SpawnPhase[] = ['pressure', 'swarm', 'mixed', 'fake_breather'];
    this.currentPhase = phases[Math.floor(Math.random() * phases.length)]!;
    this.phaseTimer = DIRECTOR.PHASE_MIN_DURATION + Math.random() * (DIRECTOR.PHASE_MAX_DURATION - DIRECTOR.PHASE_MIN_DURATION);
    console.log(`[Director] Phase change: ${this.currentPhase} for ${this.phaseTimer.toFixed(1)}s`);
  }

  public registerDrop(): void {
    this.timeSinceLastDrop = 0;
    this.killsSinceLastDrop = 0;
  }

  public registerKill(): void {
    this.killsSinceLastDrop++;
  }

  // --- Getters for Systems ---

  public get spawnMultiplier(): number {
    const phaseMult = SPAWN.PHASES[this.currentPhase].rateMult;
    return phaseMult * this.spawnRateMultiplier;
  }

  public get currentPhaseWeights(): Record<string, number> {
    return SPAWN.PHASES[this.currentPhase].weights;
  }

  public get dropChance(): number {
    // Progressive pity
    const pityFactor = this.killsSinceLastDrop / DROP.PITY_THRESHOLD;
    const pityBoost = pityFactor * DROP.PITY_BOOST;

    const baseChance = DROP.BASE_CHANCE + (this.pressure * DROP.PRESSURE_MULT);
    const finalChance = (baseChance + pityBoost) * this.dropChanceMultiplier;

    return Math.max(DROP.MIN_CHANCE, Math.min(DROP.MAX_CHANCE, finalChance));
  }

  public get isHardPity(): boolean {
    return this.killsSinceLastDrop >= DROP.PITY_THRESHOLD;
  }

  public get activePhase(): SpawnPhase {
    return this.currentPhase;
  }

  public get currentPressure(): number {
    return this.pressure;
  }
}
