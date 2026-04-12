import { CanvasTexture } from 'three';
import { makePixelTexture } from './pixelGen';
import { COLORS } from '../config/colors';

/**
 * Procedural Item Sprites - H, S, R Crate Grids
 */

const PALETTE: Readonly<Record<string, string>> = {
  'K': '#1a0e05', // crate dark outline
  'k': '#3a1f0a', // wood shadow
  'W': '#7a4f2a', // wood mid
  'w': '#a87a4a', // wood light
  'H': '#ffffff', // Letter highlight
  'S': '#ffd86a', // Letter Accent
};

const ITEM_SIZE = 16;

const FRAME_H: string[] = [
  'KKKKKKKKKKKKKKKK',
  'KwwwwwwwwwwwwwkK',
  'KwnnnnnnnnnnnnkK',
  'Kwn.HHHH.HHHH.nkK',
  'Kwn.H..H.H..H.nkK',
  'Kwn.H..H.H..H.nkK',
  'Kwn.HHHH.HHHH.nkK',
  'Kwn.H..H.H..H.nkK',
  'Kwn.H..H.H..H.nkK',
  'Kwn.HHHH.HHHH.nkK',
  'KwnnnnnnnnnnnnkK',
  'KwnnnnnnnnnnnnkK',
  'KkkkkkkkkkkkkkkK',
  'KKKKKKKKKKKKKKKK',
  '................',
];
// Wait, drafting letters in 16x16 is hard. Let's do simplified icons.

const BOX_BASE = [
  'KKKKKKKKKKKKKKKK', // 0
  'KwwwwwwwwwwwwwkK', // 1
  'KwWWWWWWWWWWWkK', // 2
  'KwWWWWWWWWWWWkK', // 3
  'KwWWWWWWWWWWWkK', // 4
  'KwWWWWWWWWWWWkK', // 5
  'KwWWWWWWWWWWWkK', // 6
  'KwWWWWWWWWWWWkK', // 7
  'KwWWWWWWWWWWWkK', // 8
  'KwWWWWWWWWWWWkK', // 9
  'KwWWWWWWWWWWWkK', // 10
  'KwWWWWWWWWWWWkK', // 11
  'KkkkkkkkkkkkkkK', // 12
  'KKKKKKKKKKKKKKKK', // 13
];

function overlayLetter(base: string[], pixels: string[]): string[] {
  const result = [...base];
  for(let y=0; y<pixels.length; y++) {
    const row = pixels[y];
    const targetY = 4 + y;
    let oldRow = result[targetY];
    let newRow = oldRow.substring(0, 5) + row + oldRow.substring(5 + row.length);
    result[targetY] = newRow;
  }
  return result;
}

const LETTER_H = [
  'S...S',
  'S...S',
  'SSSSS',
  'S...S',
  'S...S',
];

const LETTER_S = [
  'SSSSS',
  'S....',
  'SSSSS',
  '....S',
  'SSSSS',
];

const LETTER_R = [
  'SSSS.',
  'S...S',
  'SSSS.',
  'S.S..',
  'S..S.',
];

const LETTER_G = [
  ' SSSS',
  'S....',
  'S.SSS',
  'S...S',
  ' SSSS',
];

export function getItemMGTexture(): CanvasTexture {
  return makePixelTexture([overlayLetter(BOX_BASE, LETTER_H)], PALETTE);
}

export function getItemSGTexture(): CanvasTexture {
  return makePixelTexture([overlayLetter(BOX_BASE, LETTER_S)], PALETTE);
}

export function getItemRLTexture(): CanvasTexture {
  return makePixelTexture([overlayLetter(BOX_BASE, LETTER_R)], PALETTE);
}

export function getItemGrenadeTexture(): CanvasTexture {
  return makePixelTexture([overlayLetter(BOX_BASE, LETTER_G)], PALETTE);
}
