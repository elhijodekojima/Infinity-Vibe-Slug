export interface GameOverOptions {
  onRetry: () => void;
}

let panel: HTMLElement;
let scoreEl: HTMLElement;

/** Wire the Game Over DOM panel (already in index.html). */
export function initGameOver(options: GameOverOptions): void {
  panel = byId('gameover');
  scoreEl = byId('final-score');
  byId('retry').addEventListener('click', () => {
    hideGameOver();
    options.onRetry();
  });
}

export function showGameOver(score: number): void {
  scoreEl.textContent = `SCORE ${Math.floor(score).toString().padStart(6, '0')}`;
  panel.classList.remove('hidden');
}

export function hideGameOver(): void {
  panel.classList.add('hidden');
}

function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`[gameover] missing #${id} in DOM`);
  return el;
}
