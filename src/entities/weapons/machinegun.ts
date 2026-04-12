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

  tryFire(bullets: BulletPool, muzzleX: number, muzzleY: number, shotId: number): boolean {
    if (this.cooldown > 0 || this._ammo <= 0) return false;

    const ok = bullets.spawn(muzzleX, muzzleY, WEAPON.MACHINEGUN.BULLET_SPEED, 0, false, Infinity, shotId, (WEAPON.MACHINEGUN as any).DAMAGE || 1);
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
