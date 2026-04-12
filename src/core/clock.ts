/**
 * Wall-clock delta-time source. Converts `performance.now()` timestamps
 * into seconds-per-frame and tracks total elapsed game time.
 */
export class Clock {
  private lastMs = 0;
  public elapsed = 0;

  tick(nowMs: number): number {
    if (this.lastMs === 0) {
      this.lastMs = nowMs;
      return 0;
    }
    const dt = (nowMs - this.lastMs) / 1000;
    this.lastMs = nowMs;
    this.elapsed += dt;
    return dt;
  }

  reset(): void {
    this.lastMs = 0;
    this.elapsed = 0;
  }
}
