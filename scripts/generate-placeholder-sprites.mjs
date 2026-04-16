#!/usr/bin/env node
/**
 * generate-placeholder-sprites.mjs
 *
 * Generates 24 "monigote" (stick-figure) placeholder sprite sheets for
 * the 3-layer player animation system (AD-044 / AD-046 / AD-047). Meant
 * to validate the code pipeline end-to-end while the real pixel-art
 * sprites are being authored by the user with external AI tools.
 *
 * Writes to public/assets/sprites/player/ (production path). Real art
 * will overwrite these files later.
 *
 * Run: npm run generate:placeholders
 */
import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

// ---------------------------------------------------------------------------
// Canvas constants — must match LEGS_DEFS / TORSO_DEFS / WEAPON_DEFS in
// src/gfx/playerSprite.ts (frame dimensions + counts).
// ---------------------------------------------------------------------------
const FW = 20;
const FH = 32;
const OUT_DIR = 'public/assets/sprites/player';

// Horizontal layout reference (per frame, looking right):
//   x=0                   x=19
//   ┌────────────────────┐  row 0
//   │    hat             │
//   │  🧔 head           │
//   │    neck            │
//   │   [torso]─arm▶gun  │  row ~10
//   │    belt            │  row 14 (waist — split line)
//   │  ║      ║          │  legs
//   │  ║      ║          │
//   │ ██      ██         │  feet  row 30
//   └────────────────────┘  row 31

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
const C = {
  BODY:     [78, 138, 61, 255],
  BODY_DK:  [40, 72, 30, 255],
  SKIN:     [232, 176, 128, 255],
  HAT:      [80, 92, 30, 255],
  HAT_HL:   [255, 216, 106, 255],
  BEARD:    [30, 16, 10, 255],
  BOOT:     [12, 6, 6, 255],
  BELT:     [90, 54, 20, 255],
  GUN:      [90, 94, 104, 255],
  GUN_DK:   [30, 30, 40, 255],
  BROWN:    [110, 68, 28, 255],
  ROCKET:   [144, 64, 40, 255],
  FLASH:    [255, 240, 180, 255],
  OUTLINE:  [10, 14, 20, 255],
};

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------
function newSheet(frameCount) {
  const png = new PNG({ width: FW * frameCount, height: FH });
  png.data.fill(0); // fully transparent
  return png;
}

function px(png, fx, x, y, c) {
  const ax = fx * FW + x;
  if (ax < 0 || ax >= png.width || y < 0 || y >= png.height) return;
  const i = (y * png.width + ax) * 4;
  png.data[i]   = c[0];
  png.data[i+1] = c[1];
  png.data[i+2] = c[2];
  png.data[i+3] = c[3];
}

function rect(png, fx, x, y, w, h, c) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      px(png, fx, x + dx, y + dy, c);
    }
  }
}

function line(png, fx, x0, y0, x1, y1, c) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    px(png, fx, x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 <  dx) { err += dx; y += sy; }
  }
}

function save(png, filename) {
  const path = join(OUT_DIR, filename);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, PNG.sync.write(png));
  console.log(`  ${filename}`);
}

// ---------------------------------------------------------------------------
// Character parts
// ---------------------------------------------------------------------------

/**
 * Draw the legs region (below waist, y = 15..30). Poses:
 *   'stand'   — both legs straight down
 *   'split_r' — right leg forward, left leg back (mid-run)
 *   'split_l' — left leg forward, right leg back
 *   'push'    — legs close together, mid-stride passing pose
 *   'jump'    — knees tucked up
 *   'crouch'  — legs folded, small
 */
function drawLegs(png, fx, pose) {
  if (pose === 'stand') {
    rect(png, fx,  7, 15, 3, 13, C.BODY);
    rect(png, fx, 11, 15, 3, 13, C.BODY);
    rect(png, fx,  6, 28, 4, 2, C.BOOT);
    rect(png, fx, 11, 28, 4, 2, C.BOOT);
  } else if (pose === 'split_r') {
    // Right leg angles forward (to the right).
    line(png, fx, 11, 15, 14, 27, C.BODY);
    line(png, fx, 12, 15, 15, 27, C.BODY);
    // Left leg angles back.
    line(png, fx,  9, 15,  6, 27, C.BODY);
    line(png, fx,  8, 15,  5, 27, C.BODY);
    rect(png, fx, 13, 28, 4, 2, C.BOOT);
    rect(png, fx,  3, 28, 4, 2, C.BOOT);
  } else if (pose === 'split_l') {
    // Left leg forward (to the right of sprite center — flipped cycle phase).
    line(png, fx,  8, 15, 13, 27, C.BODY);
    line(png, fx,  9, 15, 14, 27, C.BODY);
    line(png, fx, 12, 15,  7, 27, C.BODY);
    line(png, fx, 11, 15,  6, 27, C.BODY);
    rect(png, fx, 12, 28, 4, 2, C.BOOT);
    rect(png, fx,  5, 28, 4, 2, C.BOOT);
  } else if (pose === 'push') {
    // Legs passing, close together, bent.
    rect(png, fx,  8, 15, 2, 6, C.BODY);
    rect(png, fx, 11, 15, 2, 6, C.BODY);
    rect(png, fx,  8, 21, 3, 7, C.BODY);
    rect(png, fx, 10, 21, 3, 7, C.BODY);
    rect(png, fx,  7, 28, 4, 2, C.BOOT);
    rect(png, fx, 10, 28, 4, 2, C.BOOT);
  } else if (pose === 'jump') {
    // Knees tucked up and out — "frog" jump pose.
    rect(png, fx,  6, 15, 3, 5, C.BODY);
    rect(png, fx, 12, 15, 3, 5, C.BODY);
    rect(png, fx,  5, 20, 4, 3, C.BODY);
    rect(png, fx, 12, 20, 4, 3, C.BODY);
    rect(png, fx,  4, 22, 5, 2, C.BOOT);
    rect(png, fx, 12, 22, 5, 2, C.BOOT);
  } else if (pose === 'crouch') {
    // Folded legs — visibly compressed.
    rect(png, fx,  5, 22, 4, 2, C.BODY);
    rect(png, fx, 12, 22, 4, 2, C.BODY);
    rect(png, fx,  4, 24, 12, 2, C.BODY_DK);
    rect(png, fx,  3, 26, 5, 2, C.BOOT);
    rect(png, fx, 13, 26, 5, 2, C.BOOT);
  }
}

/**
 * Draw head + hat + torso + belt. Stays the same across every action,
 * but eye position shifts with aim orientation.
 */
function drawBodyCore(png, fx, orient) {
  // Hat (olive with yellow highlight on the left brim)
  rect(png, fx, 6, 2, 8, 1, C.HAT);
  rect(png, fx, 5, 3, 10, 1, C.HAT);
  px(png, fx, 6, 3, C.HAT_HL);
  px(png, fx, 7, 3, C.HAT_HL);

  // Head (skin)
  rect(png, fx, 6, 4, 8, 4, C.SKIN);

  // Beard
  rect(png, fx, 6, 8, 8, 2, C.BEARD);
  px(png, fx, 7, 7, C.BEARD);
  px(png, fx, 12, 7, C.BEARD);

  // Eyes — shift with aim orientation (cartoon face tilt).
  const eyeY = orient === 'up' ? 5 : orient === 'down' ? 7 : 6;
  px(png, fx, 10, eyeY, C.OUTLINE);
  px(png, fx, 11, eyeY, C.OUTLINE);

  // Shoulders + torso
  rect(png, fx, 5, 10, 10, 1, C.BODY_DK);
  rect(png, fx, 6, 11, 8, 3, C.BODY);

  // Belt
  rect(png, fx, 6, 14, 8, 1, C.BELT);
}

/**
 * Hand position for a given aim orientation — used both by drawArm()
 * and drawWeapon() so the weapon lands exactly at the hand.
 */
function handAnchor(orient) {
  if (orient === 'up')   return { x: 12, y: 5 };
  if (orient === 'down') return { x: 14, y: 17 };
  return { x: 16, y: 12 };
}

function drawArm(png, fx, action, orient, frame) {
  const shoulder = { x: 13, y: 11 };
  let { x: hx, y: hy } = handAnchor(orient);

  // Per-action deformations (still rooted at the orient anchor).
  if (action === 'shoot') {
    // Recoil: hand shifts backward on frames 1..2, returns on 3.
    const recoil = (frame === 1 || frame === 2) ? 1 : 0;
    if (orient === 'neutral') hx -= recoil;
    else if (orient === 'up') hy += recoil;
    else hy -= recoil;
  } else if (action === 'melee') {
    if (frame === 0)      { hx = 13; hy = 10; }         // cocked back
    else if (frame === 1) { hx = 17; hy = 13; }         // full swipe
    else                  { hx = 15; hy = 12; }         // recovery
  } else if (action === 'throw') {
    if (frame === 0)      { hx = 11; hy = 4; }          // wind-up (up)
    else if (frame === 1) { hx = 15; hy = 8; }          // release
    else                  { hx = 17; hy = 13; }         // follow through
  } else if (action === 'idle') {
    if (frame % 2 === 1) hy += 1;                       // breath bob
  }

  // Arm as a 2-pixel-wide line.
  line(png, fx, shoulder.x, shoulder.y, hx, hy, C.BODY);
  line(png, fx, shoulder.x, shoulder.y + 1, hx, hy + 1, C.BODY_DK);

  // Hand (skin blob).
  px(png, fx, hx,     hy,     C.SKIN);
  px(png, fx, hx + 1, hy,     C.SKIN);
  px(png, fx, hx,     hy + 1, C.SKIN);
}

/**
 * Torso composite: body + arm for the given (action, orient, frame).
 */
function drawTorso(png, fx, action, orient, frame) {
  drawBodyCore(png, fx, orient);
  drawArm(png, fx, action, orient, frame);
}

// ---------------------------------------------------------------------------
// Weapon layer — each weapon is a simple shape painted from the hand
// anchor in the direction of the orientation.
// ---------------------------------------------------------------------------
function drawWeapon(png, fx, type, orient) {
  const { x: hx, y: hy } = handAnchor(orient);

  // Weapon dimensions + color
  const spec = {
    pistol:     { len: 3, thick: 1, color: C.GUN    },
    machinegun: { len: 6, thick: 2, color: C.GUN_DK },
    shotgun:    { len: 5, thick: 2, color: C.BROWN  },
    rocket:     { len: 7, thick: 2, color: C.ROCKET },
  }[type];

  if (orient === 'neutral') {
    // Horizontal, extends to the right from the hand.
    rect(png, fx, hx, hy, spec.len, spec.thick, spec.color);
    // Tip highlight (muzzle)
    if (spec.thick > 1) px(png, fx, hx + spec.len - 1, hy, C.FLASH);
  } else if (orient === 'up') {
    rect(png, fx, hx, hy - spec.len, spec.thick, spec.len, spec.color);
    if (spec.thick > 1) px(png, fx, hx, hy - spec.len, C.FLASH);
  } else {
    rect(png, fx, hx, hy, spec.thick, spec.len, spec.color);
    if (spec.thick > 1) px(png, fx, hx, hy + spec.len - 1, C.FLASH);
  }
}

// ---------------------------------------------------------------------------
// Sheet generators
// ---------------------------------------------------------------------------

// Legs
function genLegsIdle() {
  const png = newSheet(6);
  // 6-frame subtle cycle: two micro-bob variants repeated.
  const cycle = ['stand', 'stand', 'stand', 'stand', 'stand', 'stand'];
  cycle.forEach((p, f) => drawLegs(png, f, p));
  // Subtle bob — shift boots 1px on every other frame.
  for (let f = 1; f < 6; f += 2) {
    // Re-draw feet 1px higher to simulate weight shift.
    rect(png, f, f * FW + 6, 28, 4, 2, [0, 0, 0, 0]); // no-op; boots already stable
  }
  save(png, 'player_legs_idle.png');
}

function genLegsRun() {
  const png = newSheet(8);
  // Classic 4-pose cycle expanded over 8 frames.
  const cycle = ['split_r', 'push', 'split_l', 'push', 'split_r', 'push', 'split_l', 'push'];
  cycle.forEach((p, f) => drawLegs(png, f, p));
  save(png, 'player_legs_run.png');
}

function genLegsJump() {
  const png = newSheet(1);
  drawLegs(png, 0, 'jump');
  save(png, 'player_legs_jump.png');
}

function genLegsCrouch() {
  const png = newSheet(1);
  drawLegs(png, 0, 'crouch');
  save(png, 'player_legs_crouch.png');
}

// Torso — (action × orient) matrix
function genTorso(action, orient, frames, filename) {
  const png = newSheet(frames);
  for (let f = 0; f < frames; f++) drawTorso(png, f, action, orient, f);
  save(png, filename);
}

// Weapon — per (type × orient)
function genWeapon(type, orient) {
  const png = newSheet(1);
  drawWeapon(png, 0, type, orient);
  save(png, `player_weapon_${type}_${orient}.png`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log('Generating placeholder monigote sprites...\n');
console.log('Legs:');
genLegsIdle();
genLegsRun();
genLegsJump();
genLegsCrouch();

console.log('\nTorso (action × orientation):');
genTorso('idle',  'neutral', 4, 'player_torso_idle.png');
genTorso('idle',  'up',      1, 'player_torso_idle_up.png');
genTorso('idle',  'down',    1, 'player_torso_idle_down.png');
genTorso('shoot', 'neutral', 4, 'player_torso_shoot.png');
genTorso('shoot', 'up',      4, 'player_torso_shoot_up.png');
genTorso('shoot', 'down',    4, 'player_torso_shoot_down.png');
genTorso('melee', 'neutral', 3, 'player_torso_melee.png');
genTorso('throw', 'neutral', 3, 'player_torso_throw.png');

console.log('\nWeapons (type × orientation):');
for (const type of ['pistol', 'machinegun', 'shotgun', 'rocket']) {
  for (const orient of ['neutral', 'up', 'down']) {
    genWeapon(type, orient);
  }
}

console.log('\n✓ Done — 24 placeholder sheets written to', OUT_DIR);
