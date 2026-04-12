import type { BulletPool } from '../bullets';
import { WEAPON } from '../../config/balance';

/**
 * Pistol — semi-automatic with a hard cadence cap.
 *
 * GDD quote:
 *   "Si la cadencia es de 2 disparos por segundo no puedes hacer 3 si metes
 *    3 inputs en ese segundo."
 *
 * Refactored to separate `tickCooldown()` from `tryFire()` so the caller
 * (main.ts) can implement the melee priority:
 *   1. Player presses fire.
 *   2. Is there an enemy in knife range? → melee (no bullet).
 *   3. Otherwise → tryFire() → bullet if cooldown allows.
 *
 * The pistol doesn't know about melee — it only knows cooldowns and bullets.
 */
export class Pistol {
  private cooldown = 0;
  /** Unlimited ammo for the pistol; kept here so HUD can read a uniform API. */
  readonly ammo = Infinity;
  readonly label = 'PISTOL';

  /** Tick the cooldown timer. Call once every frame regardless of input. */
  tickCooldown(dt: number): void {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
  }

  /**
   * Attempt to fire a bullet. Returns true if a bullet was spawned.
   * Does NOT check input — the caller decides when to invoke this.
   * Respects the cadence cooldown: returns false if still cooling down.
   */
  tryFire(bullets: BulletPool, muzzleX: number, muzzleY: number): boolean {
    if (this.cooldown > 0) return false;
    bullets.spawn(muzzleX, muzzleY, WEAPON.PISTOL.BULLET_SPEED);
    this.cooldown = WEAPON.PISTOL.INTERVAL;
    return true;
  }

  reset(): void {
    this.cooldown = 0;
  }
}
