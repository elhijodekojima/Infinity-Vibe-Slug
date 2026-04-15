#!/usr/bin/env node
/**
 * optimize-sprites.mjs — batch-optimize every PNG under public/assets/sprites/
 *
 * Uses pngquant (via the `pngquant-bin` devDep) with quality 65–80, which is
 * visually lossless on pixel art while typically shrinking files 60–70%.
 * Overwrites each file in place.
 *
 * Run:  npm run optimize:sprites
 *
 * Zero-Loading note: this is a BUILD-TIME tool. It runs on the dev machine
 * before committing sprites, so the PNGs shipped to production are already
 * small. Users downloading the game never run pngquant.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import pngquant from 'pngquant-bin';

const ROOT = 'public/assets/sprites';

function* walkPng(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) yield* walkPng(p);
    else if (p.toLowerCase().endsWith('.png')) yield p;
  }
}

let totalBefore = 0;
let totalAfter = 0;
let count = 0;

// pngquant exit codes we treat as "file was left alone, not a failure":
//   98 = couldn't achieve requested quality (already low-palette)
//   99 = --skip-if-larger skipped the file (optimized output >= input)
const SKIP_EXIT_CODES = new Set([98, 99]);

for (const file of walkPng(ROOT)) {
  const before = statSync(file).size;
  let skipped = false;
  try {
    execFileSync(pngquant, [
      '--quality', '65-80',
      '--force',
      '--skip-if-larger',
      '--strip',
      '--output', file,
      file,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) {
    if (SKIP_EXIT_CODES.has(e.status)) {
      skipped = true;
    } else {
      console.error(`FAIL ${file}: exit ${e.status}`);
      continue;
    }
  }
  const after = statSync(file).size;
  const pct = before > 0 ? ((1 - after / before) * 100).toFixed(1) : '0';
  const tag = skipped ? ' (already optimal)' : '';
  console.log(`${relative('.', file)}: ${before} → ${after} bytes (-${pct}%)${tag}`);
  totalBefore += before;
  totalAfter += after;
  count++;
}

if (count === 0) {
  console.log(`No PNGs found under ${ROOT}`);
} else {
  const saved = totalBefore - totalAfter;
  const pct = ((saved / totalBefore) * 100).toFixed(1);
  console.log(`\n${count} file(s): ${totalBefore} → ${totalAfter} bytes  (saved ${saved} bytes, -${pct}%)`);
}
