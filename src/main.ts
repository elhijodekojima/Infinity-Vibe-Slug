/**
 * ENTRY POINT — Infinity Vibe Slug
 *
 * Zero-Loading bootstrap:
 *   1. index.html is already painted (menu panel visible on first frame).
 *   2. This script initializes Three.js, wires UI events, starts the loop.
 *   3. No async asset loading. No splash screen. No preload fetches.
 *
 * Architecture boundaries:
 *   - core/*     → engine (renderer, loop, input, clock, persistence)
 *   - ui/*       → HTML panels + HUD (plain DOM, no framework)
 *   - gfx/*      → procedural visuals (shaders, generated textures)
 *   - entities/* → gameplay objects (player, bullets, enemies, grenades,
 *                  explosions, weapons)
 *   - systems/*  → cross-entity logic (spawn, collisions, scoring)
 *   - config/*   → balance + colors (single source of truth for tuning)
 */

import { Renderer } from './core/renderer';
import { Loop } from './core/loop';
import { Input } from './core/input';
import { loadHighScore, saveHighScore } from './core/persistence';
import { Background } from './gfx/background';
import { Player } from './entities/player';
import { BulletPool } from './entities/bullets';
import { EnemyPool, type EnemyConfig } from './entities/enemies/enemyPool';
import { GrenadePool } from './entities/grenades';
import { ExplosionPool } from './entities/explosions';
import { Pistol } from './entities/weapons/pistol';
import { Machinegun } from './entities/weapons/machinegun';
import { Shotgun } from './entities/weapons/shotgun';
import { RocketLauncher } from './entities/weapons/rocketLauncher';
import type { Weapon } from './entities/weapons/weapon';
import { RocketPool } from './entities/rockets';
import { ItemPool, type ItemType } from './entities/items/itemPool';
import { HelicopterPool } from './entities/enemies/helicopterPool';
import { EnemyBulletPool } from './entities/bullets';
import { SpawnSystem } from './systems/spawnSystem';
import { DifficultyDirector } from './systems/difficultyDirector';
import { TerrainManager } from './systems/terrain/terrainManager';
import { TerrainPools } from './entities/terrainPools';
import { 
  getSoldierTexture, 
  getShieldTexture, 
  getTankTexture,
} from './gfx/enemySprite';
import {
  getItemMGTexture,
  getItemSGTexture,
  getItemRLTexture,
  getItemGrenadeTexture,
} from './gfx/itemSprite';
import { aabbOverlap, type AABB } from './systems/collisions';
import { initMenu, showMenu } from './ui/menu';
import { initHUD, updateHUD, showHUD, hideHUD, showCountdown, hideCountdown } from './ui/hud';
import { initGameOver, showGameOver, type GameOverStats } from './ui/gameover';
import {
  PLAYER,
  SCROLL,
  ENEMY,
  BULLET,
  GRENADE,
  MELEE,
  WEAPON,
  DROP,
  WORLD,
  DIRECTOR,
  DROP_CONTEXT_MOD,
} from './config/balance';
import { COLORS } from './config/colors';


// ---------------------------------------------------------------------------
// Enemy pool configs — three flavors, one class.
// ---------------------------------------------------------------------------

const SOLDIER_CONFIG: EnemyConfig = {
  label: 'soldier',
  width: ENEMY.SOLDIER.WIDTH,
  height: ENEMY.SOLDIER.HEIGHT,
  speed: ENEMY.SOLDIER.SPEED,
  hesitateChance: ENEMY.SOLDIER.HESITATE_CHANCE,
  color: COLORS.ENEMY_SOLDIER,
  hp: ENEMY.SOLDIER.HP,
  score: ENEMY.SOLDIER.SCORE,
  blocksFrontalBullets: ENEMY.SOLDIER.BLOCKS_FRONTAL_BULLETS,
  poolCapacity: ENEMY.SOLDIER.POOL_CAPACITY,
  isMeleeImmune: ENEMY.SOLDIER.IS_MELEE_IMMUNE,
  map: getSoldierTexture(),
};

const SHIELD_CONFIG: EnemyConfig = {
  label: 'shield',
  width: ENEMY.SHIELD.WIDTH,
  height: ENEMY.SHIELD.HEIGHT,
  speed: ENEMY.SHIELD.SPEED,
  hesitateChance: ENEMY.SHIELD.HESITATE_CHANCE,
  color: COLORS.ENEMY_SHIELD,
  hp: ENEMY.SHIELD.HP,
  score: ENEMY.SHIELD.SCORE,
  blocksFrontalBullets: ENEMY.SHIELD.BLOCKS_FRONTAL_BULLETS,
  poolCapacity: ENEMY.SHIELD.POOL_CAPACITY,
  isMeleeImmune: ENEMY.SHIELD.IS_MELEE_IMMUNE,
  map: getShieldTexture(),
};

const TANK_CONFIG: EnemyConfig = {
  label: 'tank',
  width: ENEMY.TANK.WIDTH,
  height: ENEMY.TANK.HEIGHT,
  speed: ENEMY.TANK.SPEED,
  hesitateChance: ENEMY.TANK.HESITATE_CHANCE,
  color: COLORS.ENEMY_TANK,
  hp: ENEMY.TANK.HP,
  score: ENEMY.TANK.SCORE,
  blocksFrontalBullets: ENEMY.TANK.BLOCKS_FRONTAL_BULLETS,
  poolCapacity: ENEMY.TANK.POOL_CAPACITY,
  isMeleeImmune: ENEMY.TANK.IS_MELEE_IMMUNE,
  map: getTankTexture(),
};

// ---------------------------------------------------------------------------
// Engine bootstrap
// ---------------------------------------------------------------------------

const canvas = document.getElementById('c') as HTMLCanvasElement | null;
if (!canvas) throw new Error('[main] missing <canvas id="c">');

const renderer = new Renderer(canvas);
const input = new Input();

const background = new Background();
renderer.scene.add(background.mesh);

const soldiers = new EnemyPool(SOLDIER_CONFIG);
const shields = new EnemyPool(SHIELD_CONFIG);
const tanks = new EnemyPool(TANK_CONFIG);
renderer.scene.add(soldiers.mesh);
renderer.scene.add(shields.mesh);
renderer.scene.add(tanks.mesh);

/** Uniform iteration order for collision passes. */
const enemyPools: readonly EnemyPool[] = [soldiers, shields, tanks];

const bullets = new BulletPool();
renderer.scene.add(bullets.mesh);

const grenades = new GrenadePool();
renderer.scene.add(grenades.mesh);

const explosions = new ExplosionPool();
renderer.scene.add(explosions.mesh);

const rockets = new RocketPool();
renderer.scene.add(rockets.mesh);

const helicopters = new HelicopterPool();
renderer.scene.add(helicopters.mesh);

const enemyBullets = new EnemyBulletPool();
renderer.scene.add(enemyBullets.mesh);

const items = new ItemPool(
  DROP.POOL_CAPACITY,
  getItemMGTexture(),
  getItemSGTexture(),
  getItemRLTexture(),
  getItemGrenadeTexture()
);
items.meshes.forEach((m: import('three').InstancedMesh) => renderer.scene.add(m));

const terrainManager = new TerrainManager();
const terrainPools = new TerrainPools();
renderer.scene.add(terrainPools.platformMesh);
renderer.scene.add(terrainPools.groundMesh);

const player = new Player();
renderer.scene.add(player.mesh);

const weaponPistol = new Pistol();
const weaponMachinegun = new Machinegun();
const weaponShotgun = new Shotgun();
const weaponRocket = new RocketLauncher(rockets);

const arsenal: Record<string, Weapon> = {
  pistol: weaponPistol,
  machinegun: weaponMachinegun,
  shotgun: weaponShotgun,
  rocket: weaponRocket,
};
const director = new DifficultyDirector(terrainManager);
const spawnSystem = new SpawnSystem(director, soldiers, shields, tanks, helicopters);

// Unified resize handler: renderer first, then anything that depends on
// the updated camera frustum (currently just the background quad).
const onResize = (): void => {
  renderer.resize();
  background.resize(renderer.camera.right, renderer.camera.top);
};
onResize();
window.addEventListener('resize', onResize);

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

type Phase = 'menu' | 'counting' | 'running' | 'gameover';

const state = {
  phase: 'menu' as Phase,
  score: 0,
  kills: 0,
  lives: 3,
  sessionTime: 0,
  countdown: 4,
  grenades: PLAYER.START_GRENADES as number,
  username: 'AAA',
  currentWeapon: weaponPistol as Weapon,
  shootDelay: 0,
  globalShotId: 0,
  lastDropSpawnTime: 0,
  /** Cooldown in seconds between grenade throws. */
  grenadeCooldown: 0,
  isPaused: false,
};

const AOE_R2 = GRENADE.EXPLOSION_RADIUS * GRENADE.EXPLOSION_RADIUS;

/** Reusable AABBs — avoid per-frame allocation in collision loops. */
const enemyBox: AABB = { x: 0, y: 0, w: 0, h: 0 };
const bulletBox: AABB = {
  x: 0,
  y: 0,
  w: BULLET.PLAYER.WIDTH,
  h: BULLET.PLAYER.HEIGHT,
};

const meleeBox: AABB = { x: 0, y: 0, w: 0, h: 0 };
let meleeCooldown = 0;

function refreshHUD(): void {
  updateHUD({
    score: state.score,
    kills: state.kills,
    sessionTime: state.sessionTime,
    weapon: state.currentWeapon.label,
    ammo: state.currentWeapon.ammo,
    grenades: state.grenades,
  });
}

function resetAllPools(): void {
  soldiers.reset();
  shields.reset();
  tanks.reset();
  bullets.reset();
  rockets.reset();
  items.reset();
  helicopters.reset();
  enemyBullets.reset();
  grenades.reset();
  explosions.reset();
}

function resetGame(): void {
  state.score = 0;
  state.kills = 0;
  state.lives = 3;
  state.sessionTime = 0;
  state.grenadeCooldown = 0;
  state.countdown = 4;
  state.shootDelay = 0;
  state.globalShotId = 0;
  state.grenades = PLAYER.START_GRENADES;

  player.reset();
  for (const w of Object.values(arsenal)) w.reset();
  state.currentWeapon = weaponPistol;

  meleeCooldown = 0;
  resetAllPools();
  spawnSystem.reset();
  terrainManager.reset();
  terrainPools.reset();

  refreshHUD();
}

function startGame(username: string): void {
  state.username = username;
  resetGame();
  state.phase = 'counting';
  showHUD();
}

/** 
 * Check for a drop on enemy death. 
 */
function handleEnemyDeath(x: number, y: number, isAir = false): void {
  director.registerKill();
  state.kills++;

  const now = performance.now() / 1000;
  if (now - state.lastDropSpawnTime < 1.0) return;

  const chance = director.dropChance;
  let shouldDrop = Math.random() < chance;
  
  if (director.isHardPity) {
    shouldDrop = true;
  }

  if (shouldDrop) {
    state.lastDropSpawnTime = now;
    director.registerDrop();
    
    // 🎲 Weighted selection Logic
    const types: ItemType[] = ['machinegun', 'shotgun', 'rocket', 'grenade'];
    const weights: Record<ItemType, number> = {
      machinegun: 1.0,
      shotgun: 1.0,
      rocket: 1.0,
      grenade: 0.5, // Grenades slightly rarer by default
    };

    // Context adjustments
    if (state.currentWeapon.label !== 'PISTOL') {
      // If already has weapon, increase grenade weight (downgrade chance)
      weights.grenade += 1.0;
      // Reduce weight of the current weapon
      const current = state.currentWeapon.label.toLowerCase() as ItemType;
      if (weights[current]) weights[current] *= 0.5;
    }

    // High Density → Shotgun weight boost
    // (A bit simplified context check here)
    const enemiesCount = enemyPools.reduce((acc, p) => acc + p.data.filter(e => e.active).length, 0);
    if (enemiesCount > 8) weights.shotgun += 1.5;
    
    // Tank presence → Rocket boost
    if (tanks.data.some(t => t.active)) weights.rocket += 1.5;

    // --- Dynamic CombatContext Scaling for Drops ---
    const context = director.context;
    const terrainMod = DROP_CONTEXT_MOD[context.terrainIntent] || {};
    
    // Apply terrain modifiers directly to weights
    if (terrainMod.machinegun) weights.machinegun *= terrainMod.machinegun;
    if (terrainMod.shotgun) weights.shotgun *= terrainMod.shotgun;
    if (terrainMod.rocket) weights.rocket *= terrainMod.rocket;
    if (terrainMod.grenade) weights.grenade *= terrainMod.grenade;
    
    // Optionally multiply all by pressure if needed, but Context Mod is enough.

    // Pick weighted result
    const itemsList = Object.keys(weights) as ItemType[];
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    let selected: ItemType = 'machinegun';
    for (const type of itemsList) {
      r -= weights[type];
      if (r <= 0) {
        selected = type;
        break;
      }
    }

    items.spawn(x, y, selected, isAir);
  }
}


function endGame(): void {
  if (state.phase !== 'running') return;
  state.phase = 'gameover';
  saveHighScore(state.score);
  hideHUD();
  const stats: GameOverStats = {
    score: state.score,
    kills: state.kills,
    sessionTime: state.sessionTime,
  };
  showGameOver(stats);
}

function backToMenu(): void {
  state.phase = 'menu';
  showMenu(loadHighScore());
  hideHUD();
  resetGame();
}

// ---------------------------------------------------------------------------
// UI wiring (DOM panels are already in the first paint — we only bind events)
// ---------------------------------------------------------------------------

initHUD();
initMenu({ highScore: loadHighScore(), onStart: startGame });
initGameOver({ onRetry: () => startGame(state.username) });

// ---------------------------------------------------------------------------
// Collision passes
// ---------------------------------------------------------------------------
// Two tight loops, no spatial partitioning yet. At ~80 enemies across the
// three pools × ~15 bullets that's ~1200 checks/frame which is trivial.
// When a bullet hits a shield the bullet is still consumed (visual "ping"
// off the shield) but no damage or score is applied.

function resolveBulletEnemyHits(): void {
  const bData = bullets.data;
    bulletLoop: for (let bi = 0; bi < bData.length; bi++) {
    const b = bData[bi]!;
    if (!b.active) continue;
    
    // Safety: ensure we don't pass NaN to collision checks
    if (isNaN(b.x) || isNaN(b.y)) {
      bullets.killAt(bi);
      continue;
    }

    bulletBox.x = b.x;
    bulletBox.y = b.y;

    for (const pool of enemyPools) {
      enemyBox.w = pool.config.width;
      enemyBox.h = pool.config.height;
      const sData = pool.data;
      const halfH = pool.config.height / 2;
      for (let si = 0; si < sData.length; si++) {
        const s = sData[si]!;
        if (!s.active || !b.active) continue;

        // Skip enemies that haven't entered the screen yet
        if (s.x > renderer.camera.right || s.x < -pool.config.width) continue;

        // Anti-multihit: each shot (trigger pull) only damages an enemy once.
        if (s.lastShotIdHit === b.shotId) continue;

        enemyBox.x = s.x;
        enemyBox.y = s.y + halfH;
        
        if (isNaN(enemyBox.x) || isNaN(enemyBox.y)) continue;

        if (aabbOverlap(bulletBox, enemyBox)) {
          // Record the hit to prevent double-dipping from this shot.
          s.lastShotIdHit = b.shotId;

          // Normal bullets only damage if the enemy isn't blocking (shield).
          // Special rule: Shield is vulnerable ONLY at the very top or very bottom lines.
          const isFromAbove = b.y > s.y + pool.config.height - 4;
          const isFromBelow = b.y < s.y + 4;
          const canDamage = b.penetrates || !pool.config.blocksFrontalBullets || isFromAbove || isFromBelow;
          
          if (canDamage) {
            if (pool.damageAt(si, b.damage)) {
              state.score += pool.config.score;
              handleEnemyDeath(s.x, s.y);
            }
          }

          // Non-penetrating bullets (pistol/mg) always die on hit.
          // Shields also stop everything EXCEPT penetrating bullets.
          if (!b.penetrates) {
            bullets.killAt(bi);
            continue bulletLoop;
          }
        }
      }
    }
  }

  // --- Helicopter hits (with anti-multihit protection) ---
  const hData = helicopters.data;
  bulletLoop: for (let bi = 0; bi < bullets.data.length; bi++) {
    const b = bullets.data[bi]!;
    if (!b.active) continue;
    bulletBox.x = b.x;
    bulletBox.y = b.y;
    for (let hi = 0; hi < hData.length; hi++) {
      const h = hData[hi]!;
      if (!h.active) continue;
      // Skip off-screen helicopters
      if (h.x > renderer.camera.right || h.x < -ENEMY.HELICOPTER.WIDTH) continue;
      // Anti-multihit: shotgun pellets from the same trigger pull only damage once
      if (h.lastShotIdHit === b.shotId) continue;
      const hBox = { x: h.x, y: h.y, w: ENEMY.HELICOPTER.WIDTH, h: ENEMY.HELICOPTER.HEIGHT };
      if (aabbOverlap(bulletBox, hBox)) {
        h.lastShotIdHit = b.shotId;
        if (helicopters.damageAt(hi, b.damage)) {
          state.score += ENEMY.HELICOPTER.SCORE;
          handleEnemyDeath(h.x, h.y, true);
        }
        if (!b.penetrates) {
          bullets.killAt(bi);
          continue bulletLoop;
        }
      }
    }
  }
}

function resolveRocketEnemyHits(): void {
  const rData = rockets.data;
  rocketLoop: for (let ri = 0; ri < rData.length; ri++) {
    const r = rData[ri]!;
    if (!r.active) continue;
    bulletBox.x = r.x;
    bulletBox.y = r.y;

    for (const pool of enemyPools) {
      enemyBox.w = pool.config.width;
      enemyBox.h = pool.config.height;
      const sData = pool.data;
      const halfH = pool.config.height / 2;
      for (let si = 0; si < sData.length; si++) {
        const s = sData[si]!;
        if (!s.active) continue;
        // Skip enemies off-screen (can't melee or be meleed off-screen)
        if (s.x > renderer.camera.right || s.x < -pool.config.width) continue;
        enemyBox.x = s.x;
        enemyBox.y = s.y + halfH;
        if (aabbOverlap(bulletBox, enemyBox)) {
          // Rockets explode on ANY hit.
          rockets.killAt(ri);
          explosions.spawn(r.x, r.y, GRENADE.EXPLOSION_RADIUS);
          applyExplosionDamage(r.x, r.y);
        continue rocketLoop; // Process next rocket instead of returning
        }
      }
    }
  }

  // --- Rocket vs Helicopter ---
  rocketLoop: for (let ri = 0; ri < rData.length; ri++) {
    const r = rData[ri]!;
    if (!r.active) continue;
    bulletBox.x = r.x;
    bulletBox.y = r.y;
    for (let hi = 0; hi < helicopters.data.length; hi++) {
      const h = helicopters.data[hi]!;
      if (!h.active) continue;
      // Skip off-screen helicopters
      if (h.x > renderer.camera.right || h.x < -ENEMY.HELICOPTER.WIDTH) continue;
      const hBox = { x: h.x, y: h.y, w: ENEMY.HELICOPTER.WIDTH, h: ENEMY.HELICOPTER.HEIGHT };
      if (aabbOverlap(bulletBox, hBox)) {
        rockets.killAt(ri);
        explosions.spawn(r.x, r.y, GRENADE.EXPLOSION_RADIUS);
        // applyExplosionDamage handles helicopter damage (same path as tanks)
        applyExplosionDamage(r.x, r.y);
        continue rocketLoop;
      }
    }
  }
}

function resolvePlayerEnemyHits(): boolean {
  const pBox = player.aabb;
  
  // Helicopter contact = instant death
  for (const h of helicopters.data) {
    if (!h.active) continue;
    const hBox = { x: h.x, y: h.y, w: ENEMY.HELICOPTER.WIDTH, h: ENEMY.HELICOPTER.HEIGHT };
    if (aabbOverlap(pBox, hBox)) return true;
  }

  for (const pool of enemyPools) {
    enemyBox.w = pool.config.width;
    enemyBox.h = pool.config.height;
    const sData = pool.data;
    const halfH = pool.config.height / 2;
    for (let si = 0; si < sData.length; si++) {
      const s = sData[si]!;
      if (!s.active) continue;
      enemyBox.x = s.x;
      enemyBox.y = s.y + halfH;
      if (aabbOverlap(pBox, enemyBox)) {
        if (pool.config.label === 'tank') return true; // Tank is instant death

        // Melee only triggers when the enemy is AHEAD (right side) of the player.
        // If the player has passed through to the enemy's back, no death.
        const isFrontal = s.x > player.x;
        if (!isFrontal) continue;
        
        // Soldier/Shield: starts melee timer if not already attacking
        if (s.meleeTimer <= 0) {
          s.meleeTimer = 0.5; // Start "attack animation"
        } else if (s.meleeTimer < 0.05) {
          // Timer finished while still in frontal contact
          return true;
        }
      }
    }
  }
  return false;
}

/** Apply AoE damage from a detonation across every enemy pool. */
function applyExplosionDamage(cx: number, cy: number, excludeEnemies = false): void {
  if (excludeEnemies) return; // Currently, explosions from enemy bombs only affect player via a separate check.

  for (const pool of enemyPools) {
    const sData = pool.data;
    const halfH = pool.config.height / 2;
    for (let si = 0; si < sData.length; si++) {
      const s = sData[si]!;
      if (!s.active) continue;
      if (s.x > renderer.camera.right || s.x < -pool.config.width) continue;
      const dx = s.x - cx;
      const dy = (s.y + halfH) - cy;
      if (dx * dx + dy * dy <= AOE_R2) {
        if (pool.damageAt(si, ENEMY.EXPLOSION_DAMAGE)) {
          state.score += pool.config.score;
          handleEnemyDeath(s.x, s.y);
        }
      }
    }
  }
  // Helicopters take explosion damage too
  for (let hi = 0; hi < helicopters.data.length; hi++) {
    const h = helicopters.data[hi]!;
    if (!h.active) continue;
    if (h.x > renderer.camera.right || h.x < -ENEMY.HELICOPTER.WIDTH) continue;
    const dx = h.x - cx;
    const dy = h.y - cy;
    if (dx * dx + dy * dy <= AOE_R2) {
      if (helicopters.damageAt(hi, ENEMY.EXPLOSION_DAMAGE)) {
        state.score += ENEMY.HELICOPTER.SCORE;
        handleEnemyDeath(h.x, h.y, true);
      }
    }
  }
}


/** Player vs Enemy Projectiles */
function resolveEnemyBulletPlayerHits(): void {
  const pBox = player.aabb;
  for (let i = 0; i < enemyBullets.data.length; i++) {
    const b = enemyBullets.data[i]!;
    if (!b.active) continue;
    
    // Scale bullet hitbox based on type
    let s: number = BULLET.ENEMY.WIDTH;
    if (b.type === 'bomb') s = ENEMY.BOMB.SIZE;
    else if (b.type === 'cannonball') s = ENEMY.CANNONBALL.SIZE;
    
    const bBox = { x: b.x, y: b.y, w: s, h: s };
    if (aabbOverlap(pBox, bBox)) {
      if (b.type === 'bomb') {
        // Bomb triggers explosion on player contact + INSTANT DEATH
        enemyBullets.killAt(i);
        explosions.spawn(b.x, b.y, GRENADE.EXPLOSION_RADIUS);
        // excludeEnemies = true: no friendly fire
        applyExplosionDamage(b.x, b.y, true); 
        endGame(); // Direct contact = instant death
      } else {
        endGame();
      }
    }
  }
}


/** Check if player is caught in a mushroom/bomb explosion */
function resolveExplosionPlayerHits(cx: number, cy: number): void {
  const pBox = player.aabb;
  const dx = Math.abs(player.x - cx);
  // Mushroom explosion damage: Narrow (player width) but tall.
  const isMatchX = dx < PLAYER.WIDTH;
  const isMatchY = player.y > (cy - GRENADE.EXPLOSION_RADIUS) && player.y < (cy + 100);
  
  if (isMatchX && isMatchY) {
    endGame();
  }
}

/**
 * Melee attack — GDD priority rule: fire + contact → knife > bullet.
 *
 * The melee box is the player's AABB extended by MELEE.REACH to the right
 * (the direction the player always faces). This creates a "safe knife zone"
 * of ~REACH units wide beyond the player's death collision box, giving the
 * player a ~0.3 s reaction window to mash fire before the enemy overlaps.
 *
 * If the enemy has ALREADY overlapped, melee still fires first in the frame
 * (before the death check). For 1-HP enemies this saves the player; for
 * tanks (12 HP) it only chips — the death check runs later and kills the
 * player anyway. Fair and consistent with the GDD's one-hit-death rule.
 *
 * Returns true if an enemy was hit (fire press consumed for melee).
 */
function tryMelee(): boolean {
  if (meleeCooldown > 0) return false;

  // Build the knife hitbox: player body + reach extending right.
  meleeBox.w = PLAYER.WIDTH + MELEE.REACH;
  meleeBox.h = PLAYER.HEIGHT;
  meleeBox.x = player.x + MELEE.REACH / 2; // shifted right
  meleeBox.y = player.y + PLAYER.HEIGHT / 2;

  let hitAny = false;
  for (const pool of enemyPools) {
    enemyBox.w = pool.config.width;
    enemyBox.h = pool.config.height;
    const halfH = pool.config.height / 2;
    for (let si = 0; si < pool.data.length; si++) {
      const s = pool.data[si]!;
      if (!s.active) continue;
      enemyBox.x = s.x;
      enemyBox.y = s.y + halfH;
      if (aabbOverlap(meleeBox, enemyBox)) {
        // Knife ignores blocksFrontalBullets — bypasses shield.
        // BUT it doesn't damage vehicles or immune units.
        const isImmune = (pool.config as any).isMeleeImmune;
        if (!isImmune) {
          if (pool.damageAt(si, MELEE.DAMAGE)) {
            state.score += pool.config.score;
            handleEnemyDeath(s.x, s.y);
          }
        }
        hitAny = true;
      }
    }
  }

  if (hitAny) {
    meleeCooldown = MELEE.COOLDOWN;
    // GDD/User: delay before shooting again after melee.
    state.shootDelay = MELEE.HOLSTER_DELAY;
    return true; 
  }
  return false;
}

/**
 * Grenade throw handler — edge-triggered. Consumes one from the stock,
 * spawns a grenade at the muzzle with the configured arc.
 */
function tryThrowGrenade(): void {
  if (state.grenades <= 0) return;
  
  const isTargetingGround = player.aimAngle < -1.0;
  
  const ok = grenades.spawn(
    player.muzzleX,
    player.muzzleY,
    isTargetingGround ? 0 : GRENADE.THROW_VX,
    isTargetingGround ? -400 : GRENADE.THROW_VY,
    isTargetingGround // isStraight = true when targeting ground in air
  );
  if (ok) {
    state.grenades--;
    state.grenadeCooldown = 1.5;
  }
}

function resolvePlayerItemPickups(): void {
  const iData = items.data;
  const playerBox: AABB = {
    x: player.x,
    y: player.y + PLAYER.HEIGHT / 2,
    w: PLAYER.WIDTH,
    h: PLAYER.HEIGHT,
  };
  const itemBox: AABB = {
    x: 0,
    y: 0,
    w: DROP.ITEM_SIZE,
    h: DROP.ITEM_SIZE,
  };

  for (let i = 0; i < iData.length; i++) {
    const it = iData[i]!;
    // Delay increased to 0.8s to allow boxes to settle.
    if (!it.active || it.age < 0.8) continue;

    itemBox.x = it.x;
    itemBox.y = it.y + DROP.ITEM_SIZE / 2;
    // Tighter hitboxes for items: 80% of original size.
    itemBox.w = DROP.ITEM_SIZE * 0.8;
    itemBox.h = DROP.ITEM_SIZE * 0.8;

    if (aabbOverlap(playerBox, itemBox)) {
      items.killAt(i);
      
      if (it.type === 'grenade') {
        // Grenade boxes: +5 units, max 30.
        state.grenades = Math.min(PLAYER.MAX_GRENADES, state.grenades + DROP.GRENADE_AMOUNT);
      } else {
        const weapon = arsenal[it.type];
        if (weapon) {
          if (state.currentWeapon === weapon) {
            // Cumulative ammo: add base ammo to current
            const baseAmmo = (WEAPON as any)[it.type.toUpperCase()].AMMO || 0;
            weapon.addAmmo(baseAmmo);
          } else {
            state.currentWeapon = weapon;
            weapon.reset(); // Initial pickup resets to base
          }
        }
      }
      refreshHUD();
    }
  }
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

const loop = new Loop(
  (dt) => {
    if (state.phase === 'counting') {
      state.countdown -= dt;
      if (state.countdown <= 0) {
        state.phase = 'running';
        hideCountdown();
      } else {
        const text = state.countdown > 1 ? Math.ceil(state.countdown - 1).toString() : 'START MISSION';
        showCountdown(text);
      }
      return;
    }

    // --- Pause Toggle ---
    if (input.wasPressed('pause')) {
      if (state.phase === 'running') {
        state.isPaused = !state.isPaused;
        const pauseEl = document.getElementById('pause');
        if (pauseEl) {
          if (state.isPaused) pauseEl.classList.remove('hidden');
          else pauseEl.classList.add('hidden');
        }
      }
    }

    if (state.isPaused) return;

    if (state.phase !== 'running') return;

    state.sessionTime += dt;

    // --- Difficulty Director Update ---
    // Count enemies within pressure radius
    const nearbyCount = enemyPools.reduce((acc, pool) => {
      const activeInRadius = pool.data.filter(e => e.active && Math.abs(e.x - player.x) < DIRECTOR.PRESSURE_RADIUS);
      return acc + activeInRadius.length;
    }, 0);
    
    // Low ammo factor for pressure
    const ammoNorm = state.currentWeapon.ammo / ((WEAPON as any)[state.currentWeapon.label.split(' ')[0].toUpperCase()]?.AMMO || 1);
    
    director.update(dt, {
      ammoNormalized: isFinite(ammoNorm) ? ammoNorm : 1,
      isPistol: state.currentWeapon.label === 'PISTOL',
      hasSpecialWeapon: state.currentWeapon.label !== 'PISTOL',
      recentDanger: 0, // Could be increased on near misses later
    }, nearbyCount);

    terrainManager.update(dt, SCROLL.BASE_SPEED);
    background.update(dt, SCROLL.BASE_SPEED);
    player.update(dt, input, renderer.camera.right, terrainManager);

    // --- Weapon / melee priority ---
    state.currentWeapon.tickCooldown(dt);
    meleeCooldown = Math.max(0, meleeCooldown - dt);
    state.shootDelay = Math.max(0, state.shootDelay - dt);

    const fireDown = input.isDown('fire');
    const firePressed = input.wasPressed('fire');
    const shouldAttemptFire = state.currentWeapon.isAutomatic ? fireDown : firePressed;

    if (shouldAttemptFire && state.shootDelay <= 0) {
      const didMelee = firePressed ? tryMelee() : false;
      if (!didMelee) {
        if (state.currentWeapon.tryFire(bullets, player.muzzleX, player.muzzleY, state.globalShotId, player.aimAngle)) {
          state.globalShotId++;
        }
      }
    }
    
    if (state.currentWeapon !== weaponPistol && state.currentWeapon.ammo <= 0) {
      state.currentWeapon = weaponPistol;
    }

    state.grenadeCooldown = Math.max(0, state.grenadeCooldown - dt);
    if (input.wasPressed('grenade') && state.grenadeCooldown <= 0) tryThrowGrenade();

    bullets.update(dt, renderer.camera.right);
    for (const b of bullets.data) {
      if (b.active) {
        // Bullets ignore platforms completely, only die on solid terrain
        const groundY = terrainManager.getSurfaceHeight(b.x, b.y, 0, true);
        if (b.y <= groundY) {
          b.active = false;
        }
      }
    }

    rockets.update(dt, renderer.camera.right, terrainManager, (rx, ry) => {
      explosions.spawn(rx, ry, GRENADE.EXPLOSION_RADIUS);
      applyExplosionDamage(rx, ry);
    });

    // --- Enemy Entities Update ---
    const screenRight = renderer.camera.right;
    
    soldiers.update(dt, SCROLL.BASE_SPEED, terrainManager, player.y, (x, y) => {
      enemyBullets.spawn(x, y + 9, -BULLET.ENEMY.SPEED, 0, 'bullet');
    });
    shields.update(dt, SCROLL.BASE_SPEED, terrainManager, player.y, (x, y) => {
      enemyBullets.spawn(x, y + 12, -BULLET.ENEMY.SPEED, 0, 'bullet');
    });
    tanks.update(dt, SCROLL.BASE_SPEED, terrainManager, player.y, (x, y) => {
      enemyBullets.spawn(x, y + 6, -ENEMY.CANNONBALL.SPEED, 0, 'cannonball');
    });
    
    helicopters.update(dt, player.x, renderer.camera.right, (x, y) => {
      enemyBullets.spawn(x, y, 0, -ENEMY.BOMB.SPEED, 'bomb');
    });

    enemyBullets.update(dt, renderer.camera.right);
    // Enemy projectiles hitting ground
    for (const b of enemyBullets.data) {
      if (b.active) {
        // Feature: Cannonballs follow slopes (Hills/Valleys)
        if (b.type === 'cannonball') {
           const nextY = terrainManager.getSurfaceHeight(b.x, b.y, 0);
           b.y = nextY + 4; // Stick to ground with a small radius offset
        }

        // Query solid ground (floor/hills/valleys) regardless of parity
        const solidGroundY = terrainManager.getSurfaceHeight(b.x, b.y, 0, true);
        
        if (b.type === 'bomb') {
          // GDD: Bomb only collides with platforms if player is at target height.
          const platformGroundY = terrainManager.getSurfaceHeight(b.x, b.y, 0, false);
          const hasPlatform = platformGroundY > solidGroundY;
          const playerOnPlatform = (player.y + 10) > platformGroundY;

          if (hasPlatform && playerOnPlatform) {
              if (b.y <= platformGroundY) {
                  b.active = false;
                  explosions.spawn(b.x, platformGroundY, GRENADE.EXPLOSION_RADIUS);
                  applyExplosionDamage(b.x, platformGroundY, true); 
              }
          } else if (b.y <= solidGroundY) {
              b.active = false;
              explosions.spawn(b.x, solidGroundY, GRENADE.EXPLOSION_RADIUS);
              applyExplosionDamage(b.x, solidGroundY, true); 
          }
        } else if (b.y <= solidGroundY) {
          b.active = false;
        }
      }
    }

    grenades.update(dt, SCROLL.BASE_SPEED, terrainManager, (gx, gy) => {
      explosions.spawn(gx, gy, GRENADE.EXPLOSION_RADIUS);
      applyExplosionDamage(gx, gy);
    });
    explosions.update(dt, SCROLL.BASE_SPEED);
    
    // Items falling to terrain
    items.update(dt, SCROLL.BASE_SPEED, terrainManager);

    terrainPools.update(terrainManager.platforms, terrainManager.segments);

    spawnSystem.update(dt, renderer.camera.right, terrainManager);

    // --- Collision Passes ---
    resolveBulletEnemyHits();
    resolveRocketEnemyHits();
    resolveEnemyBulletPlayerHits();
    resolvePlayerItemPickups();

    if (resolvePlayerEnemyHits()) {
      endGame();
    }

    refreshHUD();
  },
  () => {
    renderer.render();
  },
);

loop.start();

// ---------------------------------------------------------------------------
// Dev-only diagnostics — stripped from production by Vite.
// ---------------------------------------------------------------------------

if (import.meta.env.DEV) {
  (window as unknown as { __game: unknown }).__game = {
    state,
    endGame,
    backToMenu,
    renderer,
    soldiers,
    shields,
    tanks,
    bullets,
    rockets,
    grenades,
    explosions,
    spawnSystem,
    arsenal,
    setWeapon: (id: string) => {
      if (arsenal[id]) state.currentWeapon = arsenal[id];
    },
  };
}
