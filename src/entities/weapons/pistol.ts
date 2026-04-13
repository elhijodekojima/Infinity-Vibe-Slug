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

  tryFire(bullets: BulletPool, muzzleX: number, muzzleY: number, shotId: number, aimAngle: number): boolean {
    if (this.cooldown > 0) return false;

    const vx = Math.cos(aimAngle) * WEAPON.PISTOL.BULLET_SPEED;
    const vy = Math.sin(aimAngle) * WEAPON.PISTOL.BULLET_SPEED;

    bullets.spawn(muzzleX, muzzleY, vx, vy, false, Infinity, shotId, WEAPON.PISTOL.DAMAGE);
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
