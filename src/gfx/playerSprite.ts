import { CanvasTexture } from 'three';
import { makePixelTexture } from './pixelGen';

/**
 * Procedural pixel-art soldier — Camino B of the sprite decision.
 *
 * We hand-author a single 20×32 idle frame as a grid of characters. Each
 * character is a palette key. The frame is rasterized into a CanvasTexture
 * at boot time; zero external assets, fully compliant with AD-002
 * ("procedural over imported").
 *
 * The geometry of the player mesh is 20×32 world units, which matches 1:1
 * to texels. The collision AABB (see balance.ts PLAYER.WIDTH/HEIGHT) is
 * narrower (14×28) so the visual has a forgiving 3-pixel margin around
 * the hitbox — classic Metal Slug feel.
 *
 * The palette is inspired by the reference the user shared: olive cap with
 * a yellow accent, dark skin with a full beard, green fatigues, brown
 * belt, metal rifle held at the hip.
 */

export const PLAYER_SPRITE_W = 20;
export const PLAYER_SPRITE_H = 32;

const PALETTE: Readonly<Record<string, string>> = {
  K: '#0a0e14', // outline / dark detail
  o: '#2c3c12', // olive dark (cap shadow)
  O: '#515e1e', // olive mid (cap)
  Y: '#ffd86a', // yellow cap accent
  S: '#9a531e', // dark skin
  s: '#d08a4a', // skin highlight
  B: '#1e100a', // beard dark
  D: '#163612', // green dark (fatigue shadow)
  G: '#336628', // green mid (fatigue body)
  h: '#5a9a30', // green highlight
  M: '#484850', // metal rifle
  m: '#18181e', // metal dark
  R: '#5a3614', // brown belt
  k: '#040410', // boot
};

// 20 columns × 32 rows. Every row MUST be exactly 20 characters wide.
// Reading top-to-bottom, the figure is a soldier facing right with a
// compact rifle held at the hip.
const FRAME_IDLE: readonly string[] = [
  '....................', //  0
  '....................', //  1
  '....................', //  2
  '......oOOOOOo.......', //  3   cap top
  '.....oYYOOOOOo......', //  4   cap + yellow accent (left)
  '.....oYOOOOOOo......', //  5
  '.....oOOOOOOOo......', //  6
  '......KKKKKKK.......', //  7   brim shadow
  '......SsssssK.......', //  8   forehead
  '.....KSssssSK.......', //  9   eyes level
  '.....KSsBBBSK.......', // 10   beard starts
  '.....KBBBBBBK.......', // 11   full beard
  '......KKKKKK........', // 12   jaw
  '.....hDGGGGDh.......', // 13   shoulders (highlighted)
  '....hDGGGGGGDh......', // 14   upper chest
  '...hDGGGGGGGGDh.....', // 15   chest
  '...hDGGGGGGGGDMMMMM.', // 16   arm line + rifle top
  '...hDGGGGGGGGDmMMMm.', // 17   rifle body
  '...hDGGGGGGGGDMMMMM.', // 18   rifle bottom
  '...hDGGGGGGGGDh.....', // 19
  '...hDGGGGGGGGDh.....', // 20
  '...hDGGGGGGGGDh.....', // 21
  '...KRRRRRRRRRRK.....', // 22   belt
  '...hDGGGGGGGGDh.....', // 23   pants top
  '...hDGGGGGGGGDh.....', // 24
  '...hDGGGGGGGGDh.....', // 25
  '...hDGGG..GGGDh.....', // 26   leg split
  '...hDGG....GGDh.....', // 27   knees apart
  '....Kkk...kkK.......', // 28   boots
  '....Kkk...kkK.......', // 29
  '....KKK...KKK.......', // 30   boot soles
  '....................', // 31
];

let cached: CanvasTexture | null = null;

/** Returns a shared player texture (lazy-built on first access). */
export function getPlayerTexture(): CanvasTexture {
  if (cached) return cached;
  cached = makePixelTexture([FRAME_IDLE], PALETTE);
  return cached;
}
