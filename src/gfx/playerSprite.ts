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
  '.....oYOOOOOOo......', //  6
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

// Frame 1: Aiming straight UP
const FRAME_UP: readonly string[] = [
  '....................', //  0
  '.......oOOOOOo......', //  1
  '......oYYOOOOOo.....', //  2
  '......oYOOOOOOo.....', //  3
  '......oOOOOOOOo.....', //  4
  '.......KKKKKKK......', //  5
  '.......SsssssK......', //  6
  '......KSssssSK......', //  7
  '......KSsBBBSK......', //  8
  '......KBBBBBBK......', //  9
  '.......KKKKKK.......', // 10
  '.......MMMMM........', // 11  RIFLE POINTING UP
  '.......mMMMm........', // 12
  '.......MMMMM........', // 13
  '......DDGGGGDD......', // 14  SHOULDERS
  '.....DDGGGGGGDh.....', // 15
  '....DDGGGGGGGGDh....', // 16
  '....DDGGGGGGGGDh....', // 17
  '....DDGGGGGGGGDh....', // 18
  '....DDGGGGGGGGDh....', // 19
  '....DDGGGGGGGGDh....', // 20
  '....DDGGGGGGGGDh....', // 21
  '....KRRRRRRRRRRK....', // 22   belt
  '...hDGGGGGGGGDh.....', // 23
  '...hDGGGGGGGGDh.....', // 24
  '...hDGGGGGGGGDh.....', // 25
  '...hDGGG..GGGDh.....', // 26
  '...hDGG....GGDh.....', // 27
  '....Kkk...kkK.......', // 28
  '....Kkk...kkK.......', // 29
  '....KKK...KKK.......', // 30
  '....................', // 31
];

// Frame 2: CROUCHING (compressed 16px high visual, placed at bottom of 32px frame)
const FRAME_CROUCH: readonly string[] = [
  '....................', //  0
  '....................', //  1
  '....................', //  2
  '....................', //  3
  '....................', //  4
  '....................', //  5
  '....................', //  6
  '....................', //  7
  '....................', //  8
  '....................', //  9
  '....................', // 10
  '....................', // 11
  '....................', // 12
  '....................', // 13
  '....................', // 14
  '....................', // 15
  '.......oOOOOOo......', // 16  cap
  '......oYYOOOOOo.....', // 17
  '......oYOOOOOOo.....', // 18
  '......KKKKKKK.......', // 19
  '......KSsssssK......', // 20  head
  '......KBBBBBBK......', // 21
  '.....DDGGGGGGDh.....', // 22  shoulders
  '...hDGGGGGGGGDMMMMM.', // 23  rifle
  '...hDGGGGGGGGDmMMMm.', // 24
  '...hDGGGGGGGGDMMMMM.', // 25
  '...KRRRRRRRRRRK.....', // 26  belt
  '....DDGG....GGDh....', // 27  legs
  '....Kkk...kkK.......', // 28  feet
  '....Kkk...kkK.......', // 29
  '....KKK...KKK.......', // 30
  '....................', // 31
];

// Frame 3: AIR AIMING DOWN
const FRAME_DOWN: readonly string[] = [
  '.........oOOOOOo....', //  0
  '........oYYOOOOOo...', //  1
  '........oYOOOOOOo...', //  2
  '........oOOOOOOOo...', //  3
  '.........KKKKKKK....', //  4
  '.........SsssssK....', //  5
  '........KSssssSK....', //  6
  '........KSsBBBSK....', //  7
  '........KBBBBBBK....', //  8
  '.........KKKKKK.....', //  9
  '........hDGGGGDh....', // 10
  '.......hDGGGGGGDh...', // 11
  '......hDGGGGGGGGDh..', // 12
  '......hDGGGGGGGGDh..', // 13
  '......hDGGGGGGGGDh..', // 14
  '......hDGGGGGGGGDh..', // 15
  '......KRRRRRRRRRRK..', // 16
  '......hDGGGGGGGGDh..', // 17
  '......hDGGGGGGGGDh..', // 18
  '......hDGGG..GGGDh..', // 19
  '......hDGG....GGD...', // 20
  '.......Kkk...kkK....', // 21
  '.......Kkk...kkK....', // 22
  '.......MMMMM.KKK....', // 23  RIFLE POINTING DOWN
  '.......mMMMm........', // 24
  '.......MMMMM........', // 25
  '....................', // 26
  '....................', // 27
  '....................', // 28
  '....................', // 29
  '....................', // 30
  '....................', // 31
];

let cached: CanvasTexture | null = null;

/** Returns a shared player texture (lazy-built on first access). */
export function getPlayerTexture(): CanvasTexture {
  if (cached) return cached;
  // Multi-frame strip: Forward(0), Up(1), Crouch(2), Down(3)
  cached = makePixelTexture([FRAME_IDLE, FRAME_UP, FRAME_CROUCH, FRAME_DOWN], PALETTE);
  return cached;
}
