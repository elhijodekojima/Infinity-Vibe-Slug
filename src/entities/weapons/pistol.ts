import type { BulletPool } from '../bullets';
import { WEAPON } from '../../config/balance';
import type { Weapon } from './weapon';

/**
 * Pistol — semi-automatic with a hard cadence cap.
 */
export class Pistol implements Weapon {
  private cooldown = 0;
  readonly ammo = Infinity;
  readonly label = 'PISTOL';
  readonly isAutomatic = false;

  tickCooldown(dt: number): void {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
  }

  tryFire(bullets: BulletPool, muzzleX: number, muzzleY: number, shotId: number): boolean {
    if (this.cooldown > 0) return false;
    bullets.spawn(muzzleX, muzzleY, WEAPON.PISTOL.BULLET_SPEED, 0, false, Infinity, shotId, (WEAPON.PISTOL as any).DAMAGE || 1);
    this.cooldown = WEAPON.PISTOL.INTERVAL;
    return true;
  }

  addAmmo(): void {
    // Pistol has infinite ammo, do nothing.
  }

  reset(): void {
    this.cooldown = 0;
  }
}
