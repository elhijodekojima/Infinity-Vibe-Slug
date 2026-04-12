import { Clock } from './clock';
import { TIMING } from '../config/balance';

type UpdateFn = (dt: number) => void;
type RenderFn = () => void;

/**
 * Fixed-step simulation + rAF render loop.
 *
 * Uses the classic accumulator pattern:
 *   - Render every rAF tick (variable frame rate).
 *   - Step the simulation in fixed `TIMING.FIXED_STEP` increments.
 *   - Cap substeps with `TIMING.MAX_SUBSTEPS` to avoid spiral-of-death
 *     when the tab regains focus after minutes in the background.
 */
export class Loop {
  private readonly clock = new Clock();
  private accumulator = 0;
  private running = false;
  private rafId = 0;

  constructor(
    private readonly update: UpdateFn,
    private readonly render: RenderFn,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.reset();
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private frame = (nowMs: number): void => {
    if (!this.running) return;

    // Clamp big frames (e.g., returning from background tab).
    const dt = Math.min(this.clock.tick(nowMs), 0.1);
    this.accumulator += dt;

    let steps = 0;
    while (this.accumulator >= TIMING.FIXED_STEP && steps < TIMING.MAX_SUBSTEPS) {
      this.update(TIMING.FIXED_STEP);
      this.accumulator -= TIMING.FIXED_STEP;
      steps++;
    }
    // Drop leftover accumulated time if we hit the substep cap.
    if (steps >= TIMING.MAX_SUBSTEPS) this.accumulator = 0;

    this.render();
    this.rafId = requestAnimationFrame(this.frame);
  };
}
