import type { BulletPool } from '../bullets';
import { WEAPON } from '../../config/balance';
import type { Weapon } from './weapon';

/**
 * Machinegun (H) — high fire rate, fully automatic.
 */
export class Machinegun implements Weapon {
  private _ammo = WEAPON.MACHINEGUN.AMMO;
  private cooldown = 0;

  readonly label = 'MACHINEGUN';
  readonly isAutomatic = true;

  get ammo(): number {
    return this._ammo;
  }

  tickCooldown(dt: number): void {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
  }

  tryFire(bullets: BulletPool, muzzleX: number, muzzleY: number, shotId: number, aimAngle: number): boolean {
    if (this.cooldown > 0 || this._ammo <= 0) return false;

    const vx = Math.cos(aimAngle) * WEAPON.MACHINEGUN.BULLET_SPEED;
    const vy = Math.sin(aimAngle) * WEAPON.MACHINEGUN.BULLET_SPEED;

    const ok = bullets.spawn(muzzleX, muzzleY, vx, vy, false, Infinity, shotId, WEAPON.MACHINEGUN.DAMAGE);
    if (ok) {
      this._ammo--;
      this.cooldown = WEAPON.MACHINEGUN.INTERVAL;
      return true;
    }
    return false;
  }

  addAmmo(count: number): void {
    this._ammo += count;
  }

  reset(): void {
    this._ammo = WEAPON.MACHINEGUN.AMMO;
    this.cooldown = 0;
  }
}
