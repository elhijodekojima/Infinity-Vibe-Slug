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
 *   - entities/* → gameplay objects (player, bullets, enemies, weapons)
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
import { SoldierPool } from './entities/enemies/soldier';
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
  SCORE,
} from './config/balance';

// ---------------------------------------------------------------------------
// Engine bootstrap
// ---------------------------------------------------------------------------

const canvas = document.getElementById('c') as HTMLCanvasElement | null;
if (!canvas) throw new Error('[main] missing <canvas id="c">');

const renderer = new Renderer(canvas);
const input = new Input();

const background = new Background();
renderer.scene.add(background.mesh);

const soldiers = new SoldierPool();
renderer.scene.add(soldiers.mesh);

const bullets = new BulletPool();
renderer.scene.add(bullets.mesh);

const player = new Player();
renderer.scene.add(player.mesh);

const pistol = new Pistol();
const spawnSystem = new SpawnSystem(soldiers);

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

/** Reusable AABB for enemy instances — avoids per-frame allocation. */
const enemyBox: AABB = {
  x: 0,
  y: 0,
  w: ENEMY.SOLDIER.WIDTH,
  h: ENEMY.SOLDIER.HEIGHT,
};
const bulletBox: AABB = {
  x: 0,
  y: 0,
  w: BULLET.PLAYER.WIDTH,
  h: BULLET.PLAYER.HEIGHT,
};

function refreshHUD(): void {
  updateHUD({
    score: state.score,
    weapon: pistol.label,
    ammo: pistol.ammo,
    grenades: state.grenades,
  });
}

function startGame(username: string): void {
  state.username = username;
  state.score = 0;
  state.grenades = PLAYER.START_GRENADES;
  state.phase = 'running';

  player.reset();
  pistol.reset();
  soldiers.reset();
  bullets.reset();
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
// Collision passes — two tight loops, no spatial partitioning yet (O(B*E)).
// At ~50 enemies × ~15 bullets that's ~750 checks/frame which is trivial.
// ---------------------------------------------------------------------------

function resolveBulletEnemyHits(): void {
  const bData = bullets.data;
  const sData = soldiers.data;
  for (let bi = 0; bi < bData.length; bi++) {
    const b = bData[bi]!;
    if (!b.active) continue;
    bulletBox.x = b.x;
    bulletBox.y = b.y;

    for (let si = 0; si < sData.length; si++) {
      const s = sData[si]!;
      if (!s.active) continue;
      enemyBox.x = s.x;
      enemyBox.y = s.y + ENEMY.SOLDIER.HEIGHT / 2;

      if (aabbOverlap(bulletBox, enemyBox)) {
        bullets.killAt(bi);
        soldiers.killAt(si);
        state.score += SCORE.SOLDIER;
        break; // bullet consumed
      }
    }
  }
}

function resolvePlayerEnemyHits(): boolean {
  const pBox = player.aabb;
  const sData = soldiers.data;
  for (let si = 0; si < sData.length; si++) {
    const s = sData[si]!;
    if (!s.active) continue;
    enemyBox.x = s.x;
    enemyBox.y = s.y + ENEMY.SOLDIER.HEIGHT / 2;
    if (aabbOverlap(pBox, enemyBox)) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

const loop = new Loop(
  (dt) => {
    if (state.phase !== 'running') return;

    background.update(dt, SCROLL.BASE_SPEED);
    player.update(dt, input, renderer.camera.right);
    pistol.update(dt, input, bullets, player.muzzleX, player.muzzleY);

    bullets.update(dt, renderer.camera.right);
    soldiers.update(dt);
    spawnSystem.update(dt, renderer.camera.right);

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
    bullets,
    spawnSystem,
  };
}
