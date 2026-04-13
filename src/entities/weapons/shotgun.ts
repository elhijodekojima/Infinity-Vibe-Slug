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

  tryFire(bullets: BulletPool, muzzleX: number, muzzleY: number, shotId: number, aimAngle: number): boolean {
    if (this.cooldown > 0 || this._ammo <= 0) return false;

    const speed = WEAPON.SHOTGUN.BULLET_SPEED;
    const spread = WEAPON.SHOTGUN.SPREAD;
    const range = WEAPON.SHOTGUN.RANGE;
    const damage = WEAPON.SHOTGUN.DAMAGE;

    // Center shot
    bullets.spawn(muzzleX, muzzleY, speed * Math.cos(aimAngle), speed * Math.sin(aimAngle), true, range, shotId, damage);
    // Upper shot in the cone
    bullets.spawn(muzzleX, muzzleY, speed * Math.cos(aimAngle + spread), speed * Math.sin(aimAngle + spread), true, range, shotId, damage);
    // Lower shot in the cone
    bullets.spawn(muzzleX, muzzleY, speed * Math.cos(aimAngle - spread), speed * Math.sin(aimAngle - spread), true, range, shotId, damage);

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
