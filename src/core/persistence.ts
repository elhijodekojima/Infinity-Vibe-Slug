/**
 * localStorage-backed persistence. Per the Jam rules (see RULES.md)
 * we do NOT have a backend: high scores and the username live in the
 * browser only. Keys are namespaced with `ivs.` to avoid collisions.
 */

const KEY_HIGHSCORE = 'ivs.highscore';
const KEY_USERNAME = 'ivs.username';

export function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(KEY_HIGHSCORE);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function saveHighScore(score: number): void {
  try {
    const current = loadHighScore();
    if (score > current) localStorage.setItem(KEY_HIGHSCORE, String(Math.floor(score)));
  } catch {
    /* storage unavailable — just ignore */
  }
}

export function loadUsername(): string {
  try {
    return (localStorage.getItem(KEY_USERNAME) || 'AAA').slice(0, 3).toUpperCase();
  } catch {
    return 'AAA';
  }
}

export function saveUsername(name: string): void {
  try {
    localStorage.setItem(KEY_USERNAME, name.slice(0, 3).toUpperCase());
  } catch {
    /* ignore */
  }
}
