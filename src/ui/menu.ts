import { loadUsername, saveUsername } from '../core/persistence';

export interface MenuOptions {
  highScore: number;
  onStart: (username: string) => void;
}

/**
 * Initial "insert coin" screen. The DOM for this panel lives in index.html
 * so it's visible on the very first frame — no JS-rendered loading spinner.
 * This file only wires up events.
 */
export function initMenu(options: MenuOptions): void {
  const menu = byId('menu');
  const input = byId<HTMLInputElement>('username');
  const button = byId<HTMLButtonElement>('start');
  const hi = byId('highscore');

  input.value = loadUsername();
  hi.textContent = `HI ${padScore(options.highScore)}`;

  const start = (): void => {
    const raw = (input.value || 'AAA').toUpperCase().replace(/[^A-Z]/g, '');
    const name = (raw || 'AAA').slice(0, 3).padEnd(3, 'A');
    saveUsername(name);
    menu.classList.add('hidden');
    options.onStart(name);
  };

  button.addEventListener('click', start);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') start();
  });

  // Autofocus after the next tick (DOM is already painted).
  queueMicrotask(() => input.focus());
}

export function showMenu(highScore: number): void {
  const hi = byId('highscore');
  hi.textContent = `HI ${padScore(highScore)}`;
  byId('menu').classList.remove('hidden');
}

export function hideMenu(): void {
  byId('menu').classList.add('hidden');
}

function padScore(n: number): string {
  return Math.max(0, Math.floor(n)).toString().padStart(6, '0');
}

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`[menu] missing #${id} in DOM`);
  return el as T;
}
