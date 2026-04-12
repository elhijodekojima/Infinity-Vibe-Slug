import type { BulletPool } from '../bullets';
import type { RocketPool } from '../rockets';
import { WEAPON } from '../../config/balance';
import type { Weapon } from './weapon';

/**
 * Rocket Launcher (R) — fires explosive rockets.
 *
 * NOTE: tryFire implementation for this weapon requires a RocketPool.
 * We adapt the interface to accept the pool it needs.
 */
export class RocketLauncher implements Weapon {
  private _ammo = WEAPON.ROCKET.AMMO;
  private cooldown = 0;

  readonly label = 'ROCKET';
  readonly isAutomatic = false;

  constructor(private readonly rockets: RocketPool) {}

  get ammo(): number {
    return this._ammo;
  }

  tickCooldown(dt: number): void {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
  }

  /**
   * tryFire for RocketLauncher.
   * NOTE: The Weapon interface uses BulletPool as the first arg.
   * Since RocketLauncher needs RocketPool, we pass it in the constructor
   * or rely on the caller to provide it. For now, let's keep it consistent
   * with the interface by ignoring the BulletPool arg and using the injected RocketPool.
   */
  tryFire(_bullets: BulletPool, muzzleX: number, muzzleY: number, _shotId: number): boolean {
    if (this.cooldown > 0 || this._ammo <= 0) return false;

    const ok = this.rockets.spawn(muzzleX, muzzleY, WEAPON.ROCKET.INITIAL_SPEED);
    if (ok) {
      this._ammo--;
      this.cooldown = WEAPON.ROCKET.INTERVAL;
      return true;
    }
    return false;
  }

  addAmmo(count: number): void {
    this._ammo += count;
  }

  reset(): void {
    this._ammo = WEAPON.ROCKET.AMMO;
    this.cooldown = 0;
  }
}
