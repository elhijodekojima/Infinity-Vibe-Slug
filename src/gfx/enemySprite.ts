import { CanvasTexture } from 'three';
import { makePixelTexture } from './pixelGen';
import { COLORS } from '../config/colors';

/**
 * Procedural Enemy Sprites - Character Grid Authoring
 */

const PALETTE: Readonly<Record<string, string>> = {
  'K': '#1a1a24', // deep outline
  'k': '#2a2a34', // shadow outline
  'S': '#c85a3a', // Soldier Red (ENEMY_SOLDIER)
  'H': '#e8b080', // Skin highlight
  's': '#9a432a', // Soldier shadow
  'M': '#5a7098', // Shield Metal (ENEMY_SHIELD)
  'm': '#3a4a68', // Shield shadow
  'T': '#707068', // Tank Gray (ENEMY_TANK)
  't': '#4a4a44', // Tank shadow
  'B': '#ffd86a', // Brass/Accent
  'G': '#333333', // Gun metal
};

const SOLDIER_H = 18;
const SOLDIER_W = 12;

const FRAME_SOLDIER: string[] = [
  '..KKKKKK....', //  0
  '.KSSSSSSK...', //  1 cap
  '.KssSSSSsK..', //  2
  '.KSSSSSSSK..', //  3
  '..KKKKKKK...', //  4
  '..KHHHHHK...', //  5 face
  '..KHKHKHK...', //  6 eyes
  '..KHHHHHK...', //  7
  '..KKKKKKK...', //  8
  '..KSSSSSsK..', //  9 chest
  '.KSSSSSSSK..', // 10
  'KSSSSSSSSSK.', // 11
  'KSSKKKKSSSsK', // 12 rifle peek
  '.KSs..KSs...', // 13 legs
  '.KSS..KSS...', // 14
  '.Kss..Kss...', // 15
  '.KKK..KKK...', // 16 boots
  '............', // 17
];

const SHIELD_H = 20;
const SHIELD_W = 16;
const FRAME_SHIELD: string[] = [
  '..KKKKKKKKKK....', //  0
  '.KMMMMMMMMMMK...', //  1 shield top
  '.KMkkMMkkMMmK...', //  2 bolts
  '.KMMMMMMMMMMK...', //  3
  '.KMMMMMMMMMMK...', //  4
  '.KMMMKKKMMMMK...', //  5 eye slot
  '.KMMMKKKMMMMK...', //  6
  '.KMMMMMMMMMMK...', //  7
  '.KMMMMMMMMMMK...', //  8
  '.KMkkMMkkMMmK...', //  9
  '.KMMMMMMMMMMK...', // 10
  '.KMMMMMMMMMMK...', // 11
  '.KMMMMMMMMMMK...', // 12
  '.KMkkMMkkMMmK...', // 13
  '.KMMMMMMMMMMK...', // 14
  '.KMMMMMMMMMMK...', // 15
  '.KMMMMMMMMMMK...', // 16
  '.KMMMMMMMMMMK...', // 17
  '.KKKKKKKKKKKK...', // 18
  '................', // 19
];

const TANK_H = 24;
const TANK_W = 32;
const FRAME_TANK: string[] = [
  '................................', // 0
  '.........KKKKKKKKKK.............', // 1
  '........KTTTTTTTTTTKGGG.........', // 2 Turret
  '........KTttttttttTKGGG.........', // 3 Barrel
  '........KTTTTTTTTTTK............', // 4
  '........KKKKKKKKKKKK............', // 5
  '.......KTTTTTTTTTTTTK...........', // 6 Hull top
  '...KKKKKTTTTTTTTTTTTKKKKK.......', // 7
  '..KTTTTTTTTTTTTTTTTTTTTTTK......', // 8
  '.KTTTTTTTTTTTTTTTTTTTTTTTTK.....', // 9
  '.KTttttttttttttttttttttttTK.....', // 10
  '.KTTTTTTTTTTTTTTTTTTTTTTTTK.....', // 11
  '.KKKKKKKKKKKKKKKKKKKKKKKKKK.....', // 12
  '.KKKBBBKBBBKBBBKBBBKBBBKBBK.....', // 13 Treads wheels
  '.KBBGGBBGGGBBGGGBBGGGBBGGKK.....', // 14
  '.KKKBBBKBBBKBBBKBBBKBBBKBBK.....', // 15
  '.KKKKKKKKKKKKKKKKKKKKKKKKKK.....', // 16
  '................................', // 17
  '................................', // 18
  '................................', // 19
  '................................', // 20
  '................................', // 21
  '................................', // 22
  '................................', // 23
];

const HELI_H = 24;
const HELI_W = 48;
const FRAME_HELI: string[] = [
  '................................................', // 0
  '.......KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK..........', // 1 ROTOR TOP
  '...................KKK..........................', // 2
  '..............KKKKKTTTKKKKK.....................', // 3 Top hub
  '...........KKKTTTTTTTTTTTTTKKK..................', // 4
  '..KKKKKKKKKTTTTTTTTTTTTTTTTTTTKKKKKKKKKKKKKKK...', // 5 BODY TOP
  '.KTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTK..', // 6
  'KTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTK.', // 7
  'KTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTK.', // 8
  'KTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTK.', // 9
  'KTtttttttttttttttttttttttttttttttttttttttttttTK.', // 10 shadow
  'KTtttttttttttttttttttttttttttttttttttttttttttTK.', // 11
  'KKTtttttttttttttttttttttttttttttttttttttttttTKK.', // 12
  '.KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK..', // 13
  '.......KKK..........................KKK.........', // 14 Struts
  '......KTTTK........................KTTTK........', // 15
  '.....KTTTTTK......................KTTTTTK.......', // 16
  '..KKKTTTTTTTKKKKKKKKKKKKKKKKKKKKKKTTTTTTTKKK....', // 17 SKIDS
  '.KTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTK...', // 18
  '..KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK....', // 19
  '................................................', // 20
  '................................................', // 21
  '................................................', // 22
  '................................................', // 23
];

export function getSoldierTexture(): CanvasTexture {
  return makePixelTexture([FRAME_SOLDIER], PALETTE);
}

export function getShieldTexture(): CanvasTexture {
  return makePixelTexture([FRAME_SHIELD], PALETTE);
}

export function getTankTexture(): CanvasTexture {
  return makePixelTexture([FRAME_TANK], PALETTE);
}

export function getHelicopterTexture(): CanvasTexture {
  return makePixelTexture([FRAME_HELI], PALETTE);
}
