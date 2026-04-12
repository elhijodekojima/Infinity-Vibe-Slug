# BUILD_LOG.md — Diario de Desarrollo

> Bitácora cronológica del desarrollo de **Infinity Vibe Slug** para la 2026 Cursor Vibe Coding Game Jam.
> Cada entrada documenta: qué se hizo, por qué, decisiones, problemas, métricas de bundle.

---

## Formato de entrada

```
## [YYYY-MM-DD] — <Título del hito>

**Estado general:** <🟢 verde / 🟡 ámbar / 🔴 rojo>
**Bundle size actual:** <KB gzipped>
**Tiempo a primer paint:** <ms>

### ✅ Hecho
- ...

### 🚧 En progreso
- ...

### 🧠 Decisiones
- ...

### 🐞 Problemas / Bloqueos
- ...

### ➡️ Siguiente paso
- ...
```

---

## 📓 Entradas

### [2026-04-12] — Kickoff del proyecto

**Estado general:** 🟢 verde
**Bundle size actual:** N/A (sin `npm install` aún)
**Tiempo a primer paint:** N/A (pendiente de medir)

#### ✅ Hecho
- Lectura y asimilación del `gdd.txt`.
- Creación del sistema de archivos de gestión (8 archivos en raíz).
- Definición de reglas duras de la Jam en `RULES.md`.
- Manifiesto de stack y assets en `STACK.md`.
- Transcripción estructurada del GDD en `GAME_DESIGN.md`.
- Arquitectura "Zero-Loading" propuesta en `MEMORY.md`.

#### 🧠 Decisiones
- Stack: **Vite + TypeScript + Three.js** (imports selectivos).
- Assets: **procedural-first** (geometrías + shaders + canvas pixel-art generado en runtime).
- Sin frameworks UI — HTML/CSS plano para HUD.
- Persistencia: `localStorage` para high-score y username.

---

### [2026-04-12] — Scaffolding Zero-Loading (esqueleto mínimo jugable)

**Estado general:** 🟢 verde
**Bundle size actual:** pendiente de `vite build` (estimado ~50 KB gzip con Three.js tree-shaken)
**Tiempo a primer paint:** teórico < 100 ms (HTML + CSS críticos inline, sin fetches bloqueantes)

#### ✅ Hecho
- **Config del proyecto:**
  - `package.json` — Vite 5 + TypeScript 5.3 + Three 0.160 (solo whitelist de `STACK.md`).
  - `tsconfig.json` — strict + `vite/client` types.
  - `vite.config.ts` — `minify: esbuild`, `cssCodeSplit: false`, `modulePreload.polyfill: false`, `assetsInlineLimit: 4096`.
  - `vercel.json` — headers de cache (`assets/*` immutable, `/` no-cache).
  - `.gitignore` — `node_modules`, `dist`, `.vercel`, etc.
- **`index.html`** (≈ 2 KB): CSS crítico inline, canvas, HUD oculto y dos panels (`#menu` + `#gameover`). Pintado al instante en el primer frame sin esperar al JS.
- **Core engine (`src/core/`):**
  - `renderer.ts` — `OrthographicCamera` con altura fija (270u), ancho derivado del aspect ratio de la ventana. Imports selectivos de `three`.
  - `loop.ts` — fixed-step 60 Hz + rAF render, clamp anti spiral-of-death.
  - `input.ts` — WASD + flechas + Space + E. Estado `held` + edge-triggered `wasPressed`.
  - `clock.ts` — delta time wrapper.
  - `persistence.ts` — localStorage para `ivs.highscore` y `ivs.username` con fallbacks.
- **UI (`src/ui/`):**
  - `menu.ts` — input de 3 letras + botón INSERT COIN. Guarda username y dispara `onStart`.
  - `hud.ts` — actualiza `SCORE / WEAPON / GRENADES` vía `textContent` (zero overhead).
  - `gameover.ts` — panel de fin de partida con botón RETRY.
- **Gráficos procedurales (`src/gfx/background.ts`)**:
  - Un único `PlaneGeometry(1,1)` escalado al frustum de la cámara.
  - `ShaderMaterial` con pseudo-noise: banda de suelo + gradiente de cielo + parallax de "colinas lejanas" + dots tipo estrella.
  - Uniforms: `uOffset` (scroll), `uGroundY`, 5 colores.
  - **Cero texturas externas.**
- **Entidades (`src/entities/player.ts`)**:
  - Placeholder: `PlaneGeometry(14, 28)` + `MeshBasicMaterial` verde.
  - Movimiento horizontal con clamp a los bordes de la pantalla.
  - Salto con gravedad (edge-triggered vía `wasPressed('up')`).
  - Método `reset()` para el flujo Retry.
- **`src/main.ts`**:
  - Bootstrap en orden: Renderer → Input → Background → Player → UI → Loop.
  - State machine: `menu | running | gameover`.
  - `startGame()`, `endGame()`, `backToMenu()` como funciones top-level.
  - Flujo Zero-Loading: no hay `await` en ningún lado, todo síncrono.
  - Exposición `window.__game` en DEV para debug manual.
- **Directorio `src/config/`**: `balance.ts` (WORLD, PLAYER, SCROLL, TIMING) y `colors.ts` (paleta NeoGeo).

#### 🧠 Decisiones arquitectónicas tomadas en este commit
- **AD-009 — Cámara orto con altura fija, ancho dinámico.** Rechazado letterboxing: más simple aceptar cualquier aspect ratio y que la lógica de spawn use `camera.right` como borde derecho. Permite jugar en portrait y landscape sin reescribir el gameplay.
- **AD-010 — Background como único plane escalado al frustum.** Más barato que un mesh grande y más flexible que attach-a-la-cámara. Se actualiza en el handler de resize.
- **AD-011 — UI init es puro event wiring.** Los panels viven en `index.html` para garantizar primer paint instantáneo — JS solo les pone listeners.

#### 🐞 Problemas / Bloqueos
- Ninguno. Pendiente validar con `npm install` + `npm run dev` la primera vez.

#### ➡️ Siguiente paso
- Usuario ejecuta `npm install` + `npm run dev`.
- Validar visualmente: menú INSERT COIN → juego → rectángulo verde moviéndose con WASD y saltando con W, fondo con scroll procedural.
- Tras OK visual → empezar entidad `Enemy` (soldado raso) + pool instanciado.

---

### [2026-04-12] — Combate básico: soldado raso + pistola + spawn system

**Estado general:** 🟢 verde
**Bundle size actual:** pendiente (`vite build`)
**Tiempo a primer paint:** sin cambios (sistema combate no afecta al boot)
**`tsc --noEmit`:** ✅ limpio

#### ✅ Hecho

- **Reestructuración del repositorio:** los 19 archivos del scaffolding se movieron del worktree accidental (`.claude/worktrees/nervous-aryabhata`) a la raíz real `R:\Proyectos_Trabajos\WorkSpaces\Claude\Infinity-Vibe-Slug\`. `npm install` y `npm run dev` validados por el usuario — pantalla INSERT COIN operativa.

- **`src/systems/collisions.ts`** (nuevo):
  - `AABB` center-based: `{ x, y, w, h }` con (x,y) = centro.
  - `aabbOverlap(a, b)` — función pura, sin allocations. Fórmula `|dx|*2 < w1+w2 && |dy|*2 < h1+h2`.

- **`src/entities/bullets.ts`** (nuevo — `BulletPool`):
  - `InstancedMesh` con capacidad por defecto 64 (configurable en `BULLET.PLAYER.POOL_CAPACITY`).
  - `BulletData[]` paralelo al mesh con `active`, `x`, `y`, `vx`.
  - `spawn()` busca el primer slot libre; silencioso si el pool está saturado.
  - `update(dt, cameraRight)` mueve y despawnea cuando sale del frustum.
  - `killAt(i)` para resolución de colisiones por índice directo.
  - `syncInstances()` empaqueta activos en slots consecutivos y setea `mesh.count`.

- **`src/entities/enemies/soldier.ts`** (nuevo — `SoldierPool`):
  - Mismo patrón InstancedMesh + data array paralelo, capacidad 128.
  - **IA de personalidad (GDD):** cada soldado tiene `thinkTimer` + `hesitatingFor`. En cada "think tick" (1.2-3s) hay un 35% de probabilidad de pausar 0.25-0.8s. Resultado: los rasos avanzan pero con breves pausas, no cargan en línea recta → respeta el "movimiento pausado" del Metal Slug original.
  - Despawn a la izquierda fuera de pantalla.
  - `activeCount` getter para métricas.

- **`src/entities/weapons/pistol.ts`** (nuevo — `Pistol`):
  - Cadencia dura: `INTERVAL = 0.5s` (2 disparos/s máx). Cumple la regla del GDD de que machacar no supera la cadencia.
  - `wasPressed('fire')` + cooldown → cualquier input durante cooldown se pierde silenciosamente (feel arcade).
  - `ammo = Infinity`, `label = 'PISTOL'` para que el HUD use API uniforme cuando lleguen las otras armas.

- **`src/systems/spawnSystem.ts`** (nuevo):
  - Curva exponencial: `rate(t) = min(RATE_CAP, RATE_START * exp(GROWTH * t))`.
  - Con los defaults (0.4 start, 0.01 growth, 4 cap) el ritmo va de 1 enemigo cada 2.5s en t=0 hasta el máximo de 4/s alrededor de los 4 minutos. Documentado con tabla en `balance.ts`.
  - `INITIAL_DELAY = 1.5s` de respiro antes del primer enemigo tras "INSERT COIN".
  - Spawns en `cameraRight + WIDTH` sobre `WORLD.GROUND_Y`.

- **`src/config/balance.ts`** extendido con `ENEMY.SOLDIER`, `BULLET.PLAYER`, `WEAPON.PISTOL`, `SPAWN` y `SCORE`. Zero magic numbers en el código de sistemas — todo pasa por aquí.

- **`src/config/colors.ts`** extendido con `ENEMY_SOLDIER`, `ENEMY_SHIELD` (reservado), `ENEMY_TANK` (reservado), `BULLET_PLAYER`, `BULLET_ENEMY` (reservado).

- **`src/entities/player.ts`** refactor:
  - Campos privados renombrados a `_x` / `_y` con anotación explícita `: number` (el `as const` de `PLAYER.START_X` estrechaba el tipo a literal `80` y rompía tsc).
  - Getters públicos: `x`, `y`, `aabb` (live, reusa objeto — zero alloc), `muzzleX`, `muzzleY`.

- **`src/main.ts`** reescrito:
  - Bootstrap ahora crea `SoldierPool`, `BulletPool`, `Pistol`, `SpawnSystem` y añade sus meshes a la escena.
  - Loop de update ordenado: `background → player → pistol → bullets → soldiers → spawnSystem → colisiones`.
  - `resolveBulletEnemyHits()` — doble bucle O(B×E) con AABBs reutilizadas (sin alloc). `break` tras cada hit para no double-kill una bala.
  - `resolvePlayerEnemyHits()` — devuelve true en el primer contacto y dispara `endGame()`.
  - `refreshHUD()` — llamada cada frame, `textContent` es idempotente.
  - `endGame()` ahora guardea contra re-entrada con `if (state.phase !== 'running') return`.
  - `window.__game` en DEV ahora expone también `soldiers`, `bullets`, `spawnSystem` para inspección en tiempo real.

#### 🧠 Decisiones arquitectónicas

- **AD-012 — Pools con InstancedMesh + data array paralelo.** En lugar de `Entity[]` con `Mesh` individual por slot, usamos `InstancedMesh(capacity)` + `SoldierData[capacity]`. `syncInstances()` empaqueta los activos en los primeros N slots y actualiza `mesh.count`. Resultado: un draw call por tipo de entidad, sin importar cuántos haya vivos. Necesario cuando lleguen los escudos y tanquetas.

- **AD-013 — Colisiones O(B×E) sin particionado.** En este hito 50 enemigos × 15 balas = 750 checks/frame, trivial. No adelantamos trabajo con quadtree / grid hasta que un profile demuestre que hace falta. "Premature optimization is the root of all evil."

- **AD-014 — Pistola como clase, no función libre.** El `cooldown` es estado mutable y tendremos N armas con API común (`update`, `reset`, `label`, `ammo`). Clases alineadas por shape permiten que el HUD consulte la misma superficie sin conocer el tipo concreto.

- **AD-015 — `endGame()` idempotente.** Protegido con early-return si la fase ya no es `running`. Evita doble-save del highscore y doble-show del panel si varios enemigos tocan al player en el mismo frame.

#### 🐞 Problemas / Bloqueos

- **TS2322 en `player.ts`** (resuelto): `private _x = PLAYER.START_X` infería tipo literal `80` por el `as const`. Arreglado con anotación explícita `: number`. Latente también en el commit anterior — hasta ahora no se había corrido `tsc` porque el usuario fue directo a `vite dev` (esbuild no typechecks).
- **Worktree accidental** (resuelto): la sesión se inició en un worktree automático; los archivos fueron copiados a la raíz real. El worktree duplicado (`.claude/worktrees/nervous-aryabhata`) sigue en disco pero es inofensivo — pendiente limpieza manual del usuario.

#### ➡️ Siguiente paso

- Validación visual por el usuario:
  - [ ] Soldados raros rojos aparecen desde la derecha con ritmo creciente.
  - [ ] Hesitan visiblemente (paradas breves).
  - [ ] `Space` dispara balas amarillas a 320 u/s con cadencia 2/s (machacar no acelera).
  - [ ] Balas matan soldados y suben score (+100).
  - [ ] Player vs soldado → GAME OVER y highscore se guarda.
  - [ ] Retry → todo se resetea limpio (pools, cooldowns, spawn timer).
- Tras OK visual → siguiente hito candidato (elegir):
  - (a) **Sprites procedurales pixel-art** — reemplazar los `MeshBasicMaterial` por texturas generadas en canvas offscreen (mantiene Zero-Loading). Mejor look inmediato.
  - (b) **Enemigo escudo + tanqueta** con selección ponderada en `SpawnSystem` (matriz de probabilidades del GDD: 90/9/1 → 70/20/10 con el tiempo).
  - (c) **Granadas + arma rocket** — lanzador parabólico con daño AoE (acerca el gameplay al Metal Slug real).

---
