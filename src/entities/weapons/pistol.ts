import type { Input } from '../../core/input';
import type { BulletPool } from '../bullets';
import { WEAPON } from '../../config/balance';

/**
 * Pistol — semi-automatic with a hard cadence cap.
 *
 * GDD quote:
 *   "Si la cadencia es de 2 disparos por segundo no puedes hacer 3 si metes
 *    3 inputs en ese segundo."
 *
 * Implementation: `wasPressed` (edge-triggered) + cooldown. Extra presses
 * during cooldown are silently consumed by the Input layer — matching the
 * arcade feel where mashing faster than the cadence just wastes inputs.
 */
export class Pistol {
  private cooldown = 0;
  /** Unlimited ammo for the pistol; kept here so HUD can read a uniform API. */
  readonly ammo = Infinity;
  readonly label = 'PISTOL';

  update(
    dt: number,
    input: Input,
    bullets: BulletPool,
    muzzleX: number,
    muzzleY: number,
  ): boolean {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);

    if (input.wasPressed('fire') && this.cooldown === 0) {
      bullets.spawn(muzzleX, muzzleY, WEAPON.PISTOL.BULLET_SPEED);
      this.cooldown = WEAPON.PISTOL.INTERVAL;
      return true;
    }
    return false;
  }

  reset(): void {
    this.cooldown = 0;
  }
}
