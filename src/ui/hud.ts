/**
 * HUD = plain HTML nodes (see index.html).
 * This module only updates text content; no framework, zero overhead.
 */

export interface HUDState {
  score: number;
  weapon: string;
  /** Use `Infinity` for unlimited ammo (pistol). */
  ammo: number;
  grenades: number;
}

let scoreEl: HTMLElement;
let weaponEl: HTMLElement;
let grenEl: HTMLElement;
let rootEl: HTMLElement;

export function initHUD(): void {
  rootEl = byId('hud');
  scoreEl = byId('hud-score');
  weaponEl = byId('hud-weapon');
  grenEl = byId('hud-grenades');
}

export function updateHUD(state: HUDState): void {
  scoreEl.textContent = `SCORE ${Math.floor(state.score).toString().padStart(6, '0')}`;
  const ammoStr = state.ammo === Infinity ? '∞' : state.ammo.toString();
  weaponEl.textContent = `${state.weapon} ${ammoStr}`;
  grenEl.textContent = `♦ ${state.grenades}`;
}

export function showHUD(): void {
  rootEl.classList.remove('hidden');
}

export function hideHUD(): void {
  rootEl.classList.add('hidden');
}

function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`[hud] missing #${id} in DOM`);
  return el;
}
