import type { BulletPool } from '../bullets';
import { WEAPON } from '../../config/balance';
import type { Weapon } from './weapon';

/**
 * Shotgun (S) — powerful cone shot with penetration.
 */
export class Shotgun implements Weapon {
  private _ammo = WEAPON.SHOTGUN.AMMO;
  private cooldown = 0;

  readonly label = 'SHOTGUN';
  readonly isAutomatic = false;

  get ammo(): number {
    return this._ammo;
  }

  tickCooldown(dt: number): void {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
  }

  tryFire(bullets: BulletPool, muzzleX: number, muzzleY: number, shotId: number): boolean {
    if (this.cooldown > 0 || this._ammo <= 0) return false;

    const speed = WEAPON.SHOTGUN.BULLET_SPEED;
    const spread = WEAPON.SHOTGUN.SPREAD;
    const range = WEAPON.SHOTGUN.RANGE;
    const damage = (WEAPON.SHOTGUN as any).DAMAGE || 2;

    // Center shot
    bullets.spawn(muzzleX, muzzleY, speed, 0, true, range, shotId, damage);
    // Up shot
    bullets.spawn(muzzleX, muzzleY, speed * Math.cos(spread), speed * Math.sin(spread), true, range, shotId, damage);
    // Down shot
    bullets.spawn(muzzleX, muzzleY, speed * Math.cos(-spread), speed * Math.sin(-spread), true, range, shotId, damage);

    this._ammo--;
    this.cooldown = WEAPON.SHOTGUN.INTERVAL;
    return true;
  }

  addAmmo(count: number): void {
    this._ammo += count;
  }

  reset(): void {
    this._ammo = WEAPON.SHOTGUN.AMMO;
    this.cooldown = 0;
  }
}
