import { TextureLoader, NearestFilter, SRGBColorSpace, Texture } from 'three';

export const PLAYER_SPRITE_W = 64; // Defaulting to 64 as a safe size for the high-res sprite
export const PLAYER_SPRITE_H = 64;

let cached: Texture | null = null;

export function getPlayerTexture(): Texture {
  if (cached) return cached;
  
  const loader = new TextureLoader();
  cached = loader.load('/assets/sprites/player/player_idle.png');
  
  // Crucial for Pixel Art
  cached.magFilter = NearestFilter;
  cached.minFilter = NearestFilter;
  cached.colorSpace = SRGBColorSpace;
  cached.repeat.set(1 / 6, 1); // 6 frames in the idle sheet
  
  return cached;
}
