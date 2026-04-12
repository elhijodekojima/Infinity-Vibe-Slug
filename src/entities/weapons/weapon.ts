import type { BulletPool } from '../bullets';

/**
 * Universal interface for all weapons in Infinity Vibe Slug.
 */
export interface Weapon {
  /** Display name for the HUD. */
  readonly label: string;
  /** Remaining bullets (Infinity for Pistol). */
  readonly ammo: number;
  /** If true, the weapon continues firing as long as the trigger is held. */
  readonly isAutomatic: boolean;

  /** Update cooldowns every frame. */
  tickCooldown(dt: number): void;
  /** Try to spawn projectiles. Returns true if successful. */
  tryFire(bullets: BulletPool, muzzleX: number, muzzleY: number, shotId: number): boolean;
  /** Add ammo to the reserve. */
  addAmmo(count: number): void;
  /** Reset to start-of-game or fresh-drop state. */
  reset(): void;
}
