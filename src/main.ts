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
import { SpawnSystem } from './systems/spawnSystem';
import { aabbOverlap, type AABB } from './systems/collisions';
import { initMenu, showMenu } from './ui/menu';
import { initHUD, updateHUD, showHUD, hideHUD } from './ui/hud';
import { initGameOver, showGameOver } from './ui/gameover';
import {
  PLAYER,
  SCROLL,
  ENEMY,
  BULLET,
  GRENADE,
  MELEE,
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

const player = new Player();
renderer.scene.add(player.mesh);

const pistol = new Pistol();
const spawnSystem = new SpawnSystem(soldiers, shields, tanks);

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

type Phase = 'menu' | 'running' | 'gameover';

const state = {
  phase: 'menu' as Phase,
  score: 0,
  grenades: PLAYER.START_GRENADES,
  username: 'AAA',
};

/** Reusable AABBs — avoid per-frame allocation in collision loops. */
const enemyBox: AABB = { x: 0, y: 0, w: 0, h: 0 };
const bulletBox: AABB = {
  x: 0,
  y: 0,
  w: BULLET.PLAYER.WIDTH,
  h: BULLET.PLAYER.HEIGHT,
};

const AOE_R2 = GRENADE.EXPLOSION_RADIUS * GRENADE.EXPLOSION_RADIUS;

/** Melee detection box — player AABB extended to the right by MELEE.REACH. */
const meleeBox: AABB = { x: 0, y: 0, w: 0, h: 0 };
let meleeCooldown = 0;

function refreshHUD(): void {
  updateHUD({
    score: state.score,
    weapon: pistol.label,
    ammo: pistol.ammo,
    grenades: state.grenades,
  });
}

function resetAllPools(): void {
  soldiers.reset();
  shields.reset();
  tanks.reset();
  bullets.reset();
  grenades.reset();
  explosions.reset();
}

function startGame(username: string): void {
  state.username = username;
  state.score = 0;
  state.grenades = PLAYER.START_GRENADES;
  state.phase = 'running';

  player.reset();
  pistol.reset();
  meleeCooldown = 0;
  resetAllPools();
  spawnSystem.reset();

  refreshHUD();
  showHUD();
}

function endGame(): void {
  if (state.phase !== 'running') return;
  state.phase = 'gameover';
  saveHighScore(state.score);
  hideHUD();
  showGameOver(state.score);
}

function backToMenu(): void {
  state.phase = 'menu';
  hideHUD();
  showMenu(loadHighScore());
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
    bulletBox.x = b.x;
    bulletBox.y = b.y;

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
        if (aabbOverlap(bulletBox, enemyBox)) {
          bullets.killAt(bi);
          if (!pool.config.blocksFrontalBullets) {
            if (pool.damageAt(si, ENEMY.BULLET_DAMAGE)) {
              state.score += pool.config.score;
            }
          }
          continue bulletLoop;
        }
      }
    }
  }
}

function resolvePlayerEnemyHits(): boolean {
  const pBox = player.aabb;
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
        return true;
      }
    }
  }
  return false;
}

/** Apply AoE damage from a grenade detonation across every enemy pool. */
function applyExplosionDamage(cx: number, cy: number): void {
  for (const pool of enemyPools) {
    const sData = pool.data;
    const halfH = pool.config.height / 2;
    for (let si = 0; si < sData.length; si++) {
      const s = sData[si]!;
      if (!s.active) continue;
      const dx = s.x - cx;
      const dy = (s.y + halfH) - cy;
      if (dx * dx + dy * dy <= AOE_R2) {
        if (pool.damageAt(si, ENEMY.EXPLOSION_DAMAGE)) {
          state.score += pool.config.score;
        }
      }
    }
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
        if (pool.damageAt(si, MELEE.DAMAGE)) {
          state.score += pool.config.score;
        }
        meleeCooldown = MELEE.COOLDOWN;
        return true; // one hit per fire press
      }
    }
  }
  return false;
}

/**
 * Grenade throw handler — edge-triggered. Consumes one from the stock,
 * spawns a grenade at the muzzle with the configured arc.
 */
function tryThrowGrenade(): void {
  if (state.grenades <= 0) return;
  const ok = grenades.spawn(
    player.muzzleX,
    player.muzzleY,
    GRENADE.THROW_VX,
    GRENADE.THROW_VY,
  );
  if (ok) state.grenades--;
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

const loop = new Loop(
  (dt) => {
    if (state.phase !== 'running') return;

    background.update(dt, SCROLL.BASE_SPEED);
    player.update(dt, input, renderer.camera.right);

    // --- Weapon / melee priority (GDD: fire + in contact → knife > bullet) ---
    pistol.tickCooldown(dt);
    meleeCooldown = Math.max(0, meleeCooldown - dt);

    const firePressed = input.wasPressed('fire');
    if (firePressed) {
      const didMelee = tryMelee();
      if (!didMelee) {
        pistol.tryFire(bullets, player.muzzleX, player.muzzleY);
      }
    }
    if (input.wasPressed('grenade')) tryThrowGrenade();

    bullets.update(dt, renderer.camera.right);
    soldiers.update(dt);
    shields.update(dt);
    tanks.update(dt);
    spawnSystem.update(dt, renderer.camera.right);

    // Grenade physics + detonation in a single pass. Callback fires once
    // per explosion so we can spawn the visual flash and apply AoE damage
    // atomically.
    grenades.update(dt, (gx, gy) => {
      explosions.spawn(gx, gy, GRENADE.EXPLOSION_RADIUS);
      applyExplosionDamage(gx, gy);
    });
    explosions.update(dt);

    resolveBulletEnemyHits();
    refreshHUD();

    if (resolvePlayerEnemyHits()) {
      endGame();
    }
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
    grenades,
    explosions,
    spawnSystem,
  };
}
