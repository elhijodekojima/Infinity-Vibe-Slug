/**
 * Keyboard input for Player 1.
 *   WASD  → move / crouch
 *   Space → fire
 *   E     → grenade
 *   Arrow keys are also mapped as a fallback.
 *
 * Tracks two flavors per action:
 *   - "down"      : held (state)
 *   - "wasPressed": edge-triggered, auto-consumed on read (great for jumps).
 */

export type InputAction = 'left' | 'right' | 'up' | 'down' | 'fire' | 'grenade';

const KEY_MAP: Record<string, InputAction> = {
  KeyA: 'left',
  KeyD: 'right',
  KeyW: 'up',
  KeyS: 'down',
  Space: 'fire',
  KeyE: 'grenade',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

const ACTIONS: InputAction[] = ['left', 'right', 'up', 'down', 'fire', 'grenade'];

export class Input {
  private held: Record<InputAction, boolean>;
  private pressed: Record<InputAction, boolean>;

  constructor() {
    this.held = this.blankMap();
    this.pressed = this.blankMap();

    window.addEventListener('keydown', (e) => {
      const action = KEY_MAP[e.code];
      if (!action) return;
      if (!this.held[action]) this.pressed[action] = true;
      this.held[action] = true;
      // Prevent page scroll on game keys.
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    });

    window.addEventListener('keyup', (e) => {
      const action = KEY_MAP[e.code];
      if (!action) return;
      this.held[action] = false;
    });

    // Release all on blur — avoids stuck keys when the window loses focus.
    window.addEventListener('blur', () => {
      this.held = this.blankMap();
      this.pressed = this.blankMap();
    });
  }

  isDown(action: InputAction): boolean {
    return this.held[action];
  }

  /** Returns true once per physical keypress, then false until next keydown. */
  wasPressed(action: InputAction): boolean {
    const p = this.pressed[action];
    this.pressed[action] = false;
    return p;
  }

  private blankMap(): Record<InputAction, boolean> {
    const m = {} as Record<InputAction, boolean>;
    for (const a of ACTIONS) m[a] = false;
    return m;
  }
}
