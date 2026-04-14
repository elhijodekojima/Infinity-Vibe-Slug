/**
 * HUD = plain HTML nodes (see index.html).
 * This module only updates text content; no framework, zero overhead.
 */

export interface HUDState {
  score: number;
  kills: number;
  sessionTime: number; // seconds
  weapon: string;
  /** Use `Infinity` for unlimited ammo (pistol). */
  ammo: number;
  grenades: number;
}

let scoreEl: HTMLElement;
let killsEl: HTMLElement;
let timerEl: HTMLElement;
let weaponEl: HTMLElement;
let grenEl: HTMLElement;
let rootEl: HTMLElement;

let countEl: HTMLElement;

export function initHUD(): void {
  rootEl   = byId('hud');
  scoreEl  = byId('hud-score');
  killsEl  = byId('hud-kills');
  timerEl  = byId('hud-timer');
  weaponEl = byId('hud-weapon');
  grenEl   = byId('hud-grenades');
  countEl  = byId('hud-countdown');
}

export function updateHUD(state: HUDState): void {
  scoreEl.textContent  = `SCORE ${Math.floor(state.score).toString().padStart(6, '0')}`;
  killsEl.textContent  = `KILLS ${state.kills.toString().padStart(4, '0')}`;
  timerEl.textContent  = formatTime(state.sessionTime);
  const ammoStr = state.ammo === Infinity ? '∞' : state.ammo.toString();
  weaponEl.textContent = `${state.weapon} ${ammoStr}`;
  grenEl.textContent   = `♦ ${state.grenades}`;
}

export function showCountdown(text: string): void {
  countEl.textContent = text;
  countEl.classList.remove('hidden');
}

export function hideCountdown(): void {
  countEl.classList.add('hidden');
}

export function showHUD(): void {
  rootEl.classList.remove('hidden');
}


export function hideHUD(): void {
  rootEl.classList.add('hidden');
}

/** Format seconds as MM:SS. */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`[hud] missing #${id} in DOM`);
  return el;
}
