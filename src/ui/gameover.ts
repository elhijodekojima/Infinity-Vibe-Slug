import { formatTime } from './hud';

export interface GameOverOptions {
  onRetry: () => void;
}

export interface GameOverStats {
  score: number;
  kills: number;
  sessionTime: number; // seconds
}

let panel: HTMLElement;
let scoreEl: HTMLElement;
let killsEl: HTMLElement;
let timeEl: HTMLElement;

/** Wire the Game Over DOM panel (already in index.html). */
export function initGameOver(options: GameOverOptions): void {
  panel   = byId('gameover');
  scoreEl = byId('final-score');
  killsEl = byId('final-kills');
  timeEl  = byId('final-time');
  byId('retry').addEventListener('click', () => {
    hideGameOver();
    options.onRetry();
  });
}

export function showGameOver(stats: GameOverStats): void {
  scoreEl.textContent = `SCORE ${Math.floor(stats.score).toString().padStart(6, '0')}`;
  killsEl.textContent = `KILLS ${stats.kills.toString().padStart(4, '0')}`;
  timeEl.textContent  = `TIME  ${formatTime(stats.sessionTime)}`;
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
