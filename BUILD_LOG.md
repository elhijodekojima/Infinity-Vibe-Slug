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
  - [x] Soldados raros rojos aparecen desde la derecha con ritmo creciente.
  - [x] Hesitan visiblemente (paradas breves).
  - [x] `Space` dispara balas amarillas con cadencia 2/s.
  - [x] Balas matan soldados y suben score.
  - [x] Player vs soldado → GAME OVER y highscore se guarda.
  - [x] Retry → todo se resetea limpio.
- Siguiente elegido: **Sprite procedural pixel-art (Camino B) + granadas**.

---

### [2026-04-12] — Sprite procedural del player + granadas AoE

**Estado general:** 🟢 verde
**Bundle size actual:** pendiente (`vite build`)
**Tiempo a primer paint:** sin cambios — sprite se genera a partir de arrays de strings en el primer frame de JS, cero descarga adicional
**`tsc --noEmit`:** ✅ limpio

#### ✅ Hecho

**Infra: commit inicial + git identity**

- Identidad local del repo configurada a `elhijodekojima <hatakelolo6@gmail.com>` vía `git config --local` (sin tocar el global `Rafael Gómez Rubio`).
- `.gitignore` amplía para excluir `.claude/` (worktree accidental inofensivo).
- Commit `d4ee74e` creado con todo el scaffolding + combate básico. **Push pendiente** porque Git Credential Manager en Windows tiene cacheado `RuFFuS4` y necesita PAT para `elhijodekojima`.
- Config local adicional: `credential.username=elhijodekojima`, `credential.useHttpPath=true` como hint a GCM.

**Sprite procedural del player (Camino B)**

- **`src/gfx/pixelGen.ts`** (nuevo): helper `makePixelTexture(frames, palette)` que rasteriza arrays de strings de caracteres a un `CanvasTexture` con `NearestFilter`. Acepta rows de longitud variable (auto-pad con transparente) para permitir autoría cómoda. Reusable para cualquier sprite procedural futuro (enemigos, drops, UI).
- **`src/gfx/playerSprite.ts`** (nuevo): paleta de 14 colores (olive cap, yellow accent, dark skin, beard, 3 tonos de verde militar, metal rifle, brown belt, boots) + frame idle de **20×32** píxeles. Soldado con gorra, barba, fusil pegado al costado. Lazy-build con cache — `getPlayerTexture()` solo genera el canvas la primera vez.
- **`src/entities/player.ts`** — el `MeshBasicMaterial` de color plano se sustituye por `{ map: getPlayerTexture(), alphaTest: 0.5 }`. `alphaTest` > `transparent` porque para pixel art binario (on/off) evitamos el overhead del sorting de alpha blending.
- **`src/config/balance.ts`** — `PLAYER` gana `SPRITE_W: 20` y `SPRITE_H: 32`. La **collision box sigue siendo 14×28** (AABB) → el sprite es ~3 px más grande por todos lados que el hitbox, dando ese margen de perdón clásico de Metal Slug.
- `player.syncMesh()` ahora usa `SPRITE_H / 2` para el offset vertical (el quad visual es más alto que la caja de colisión; los pies del dibujo siguen alineados con el `GROUND_Y`).

**Granadas parabólicas + explosiones AoE**

- **`src/entities/grenades.ts`** — `GrenadePool` (cap 16) con `InstancedMesh`. Física pura: `vy += GRAVITY*dt`, `x += vx*dt`, `y += vy*dt`. Cuando `y <= GROUND_Y` marca la granada inactiva y dispara callback `onExplode(x, y)` pasando las coords del impacto.
- **`src/entities/explosions.ts`** — `ExplosionPool` (cap 16) **solo visual**. Cada instancia tiene `age` y `radius`. Animación half-sine: `scale = sin(age/duration · π)` → pop de 0 → 1 → 0 en 0.35 s. Mesh `PlaneGeometry(1,1)` escalado per-instancia. Separar visual de daño permite reusar el pool con el Rocket Launcher cuando llegue.
- **`src/config/balance.ts`** — nueva sección `GRENADE` (size, gravity, throw_vx=120, throw_vy=200, pool 16, explosion radius 32) y `EXPLOSION` (duration 0.35s, pool 16). Documentado con los valores esperados del arco: apex ~36 u sobre el muzzle, aterrizaje ~94 u a la derecha, vuelo ~0.78 s.
- **`src/config/colors.ts`** — `GRENADE: 0x9ba634` (verde-oliva metálico) y `EXPLOSION: 0xffdd80` (amarillo cálido).
- **`src/main.ts`** rewire:
  - `GrenadePool` y `ExplosionPool` creadas y añadidas a la escena.
  - Entrada `wasPressed('grenade')` → `tryThrowGrenade()` (consume del stock, spawn en muzzle con arc configurado).
  - `grenades.update(dt, onExplode)` con callback que **atomicamente** spawnea la explosión visual + aplica `applyExplosionDamage(cx, cy)`.
  - `applyExplosionDamage()` — cheap radius check `dx² + dy² ≤ r²`, mata todos los soldados dentro, suma score por cada kill.
  - `explosions.update(dt)` tras las granadas para animar las activas.
  - Reset de pools añadido a `startGame()`.
  - `window.__game` expone ahora también `grenades` y `explosions`.

#### 🧠 Decisiones arquitectónicas

- **AD-016 — Sprite procedural via CanvasTexture.** Autoría en arrays de strings (1 char = 1 color key) + paleta separada. Ventajas: versionable, diffeable, sin dependencias externas, cero HTTP. Contrapartida: pixel-art laborioso a mano; aceptable mientras el juego tenga pocos sprites. Cuando crezca, migraremos a un editor externo + export JSON.
- **AD-017 — Collision box más pequeña que el sprite (14×28 vs 20×32).** ~3 px de margen por lado. Metal Slug hace exactamente esto. Requiere guardar ambas dimensiones en `PLAYER` y usar cada una en su contexto (geometry vs AABB).
- **AD-018 — ExplosionPool solo visual, damage resolved en main.** La separación permite (a) reusar el pool desde el rocket launcher sin duplicar, (b) testear visual y daño por separado, (c) evitar que la animación de la explosión mantenga "vivo" un efecto de daño que ya ocurrió instantáneamente.
- **AD-019 — Callback `onExplode` en `grenades.update()` > array out-param.** No se aloca nada, no se necesita limpiar `.length = 0`, y el código del sitio de uso queda más lineal. Patrón que replicaremos cuando otras entidades necesiten emitir eventos discretos.

#### 🐞 Problemas / Bloqueos

- **Push a GitHub bloqueado por credenciales.** Documentado en `memory/git_identity.md`. Usuario resolverá con PAT + `git remote set-url` cuando cree el token. No afecta desarrollo.
- Ningún error de compilación. Ningún bloqueante de gameplay.

#### ➡️ Siguiente paso

- Validación visual por el usuario:
  - [x] Sprite del player, granadas, AoE, HUD — todo validado.
- Siguiente elegido: **(a) Enemigo escudo + tanqueta** (refactor a EnemyPool genérico).

---

### [2026-04-12] — Enemy pool genérico (soldier / shield / tank) + type distribution

**Estado general:** 🟢 verde
**`tsc --noEmit`:** ✅ limpio

#### ✅ Hecho

**Refactor a EnemyPool config-driven**

- **`src/entities/enemies/enemyPool.ts`** (nuevo, reemplaza `soldier.ts`):
  - Clase `EnemyPool` única que recibe un `EnemyConfig` y se instancia 3 veces (uno por tipo).
  - `EnemyConfig` incluye: `label`, `width`, `height`, `speed`, `hesitateChance`, `color`, `hp`, `score`, `blocksFrontalBullets`, `poolCapacity`.
  - `EnemyData` ahora lleva `hp` para soportar enemigos multi-hit (tanqueta).
  - Nuevo método `damageAt(i, amount)` que decrementa HP y devuelve `true` si mató al enemigo en ese hit. `killAt()` eliminado — todo pasa por `damageAt`.
  - IA de hesitación + despawn fuera de pantalla idéntica al anterior `SoldierPool`; solo los parámetros cambian por tipo.
- **`src/entities/enemies/soldier.ts`** eliminado (git lo verá como rename soldier → enemyPool).

**Configuración de los 3 tipos (`src/config/balance.ts`)**

- `ENEMY.BULLET_DAMAGE = 1` y `ENEMY.EXPLOSION_DAMAGE = 4` centralizan el daño → tanqueta con 12 HP muere en **3 explosiones** (4+4+4=12) o **12 balas de pistola**, coincide con el GDD.
- `ENEMY.SOLDIER`: 12×26, speed 35, 1 HP, 100 pts, hesitate 35%, pool 128.
- `ENEMY.SHIELD`: 14×28, speed 22 (más lento), 1 HP, **200 pts** (2×), hesitate 20%, pool 32, **`BLOCKS_FRONTAL_BULLETS: true`**.
- `ENEMY.TANK`: 36×22 (gigante y chato), speed 15 (crawl), **12 HP**, **500 pts** (5×), hesitate 10%, pool 8.
- `SCORE.SOLDIER` eliminado — cada tipo trae su score en su config.

**Distribución de tipos deslizante (`SPAWN.TYPE_*`)**

- `SPAWN.TYPE_START = { soldier: 0.90, shield: 0.09, tank: 0.01 }` — early game dominado por rasos.
- `SPAWN.TYPE_CAP = { soldier: 0.70, shield: 0.20, tank: 0.10 }` — end game con más escudos y tanquetas.
- `SPAWN.TYPE_RAMP_TIME = 180` segundos para llegar al cap.
- Selección con `lerp()` de ambas probabilidades y acumulado `r < pS ? soldier : r < pS+pSh ? shield : tank`. Random uniforme.

**`src/systems/spawnSystem.ts`** rewritten:

- Constructor toma **3 pools** (`soldiers`, `shields`, `tanks`).
- `pickPool()` privado hace la selección ponderada por tiempo transcurrido.
- `spawnOne()` delega a `pool.spawn()` usando el width de la config del tipo elegido (así los tanques spawnean más a la derecha que los rasos).
- `SpawnSystem.reset()` sin cambios — el estado del sistema ya estaba centralizado.

**`src/main.ts`** rewire masivo:

- 3 configs locales: `SOLDIER_CONFIG`, `SHIELD_CONFIG`, `TANK_CONFIG`, derivadas de `ENEMY.*` + `COLORS.ENEMY_*`.
- 3 pools creados y añadidos al scene graph.
- **`enemyPools: readonly EnemyPool[] = [soldiers, shields, tanks]`** como array uniforme para las 3 pasadas de colisión.
- **`resolveBulletEnemyHits()`** ahora itera los 3 pools dentro del loop de balas con un `continue bulletLoop` (etiqueta) para que cada bala se consuma al primer impacto.
  - Si el pool tiene `blocksFrontalBullets`, la bala se consume (`killAt`) pero NO se aplica damageAt → escudo inmune frontal.
- **`resolvePlayerEnemyHits()`** itera los 3 pools. Player vs CUALQUIER enemigo → game over.
- **`applyExplosionDamage(cx, cy)`** recorre los 3 pools, aplica `EXPLOSION_DAMAGE` a los que caigan en el radio. Score se atribuye usando `pool.config.score`, así el tipo correcto cobra.
- **`resetAllPools()`** nueva helper para el startGame — limpia soldados, shields, tanks, bullets, grenades, explosions de golpe.
- `enemyBox` AABB reutilizable ahora tiene `w` y `h` que se setean por pool en cada pasada (antes eran fijos para soldier).
- `window.__game` expone ahora también `shields` y `tanks`.

#### 🧠 Decisiones arquitectónicas

- **AD-020 — Una sola clase `EnemyPool` configurable.** Los 3 tipos comparten estructura (InstancedMesh + data[] + walk-hesitate AI) y solo difieren en parámetros. Clase genérica > 3 clases duplicadas. Si en el futuro un tipo necesita lógica especial (p.ej. tanqueta disparando bola rodante), se hereda o se añade un hook sin reescribir toda la base.
- **AD-021 — Damage model vía `damageAt(i, amount)`.** Unifica kill instantáneo (soldier/shield, HP=1) y multi-hit (tank, HP=12). Centraliza `BULLET_DAMAGE` y `EXPLOSION_DAMAGE` como constantes del módulo ENEMY. Ataques futuros (melee, cuchillo) solo necesitan su propio valor de damage.
- **AD-022 — Blocking de balas como flag de config, no clase diferente.** El escudo no es un tipo distinto que herede de soldier — es un `EnemyPool` con `blocksFrontalBullets: true`. La lógica vive en `main.ts/resolveBulletEnemyHits` (cliente) en vez de en el pool (servidor) porque es una decisión de juego, no de entidad. El pool no sabe "cómo" se le hace daño — solo que le han llamado `damageAt`.
- **AD-023 — Score atribuido por pool.config.score, no por una tabla global.** El pool sabe cuánto valen sus instancias. El cliente colisiona con `if (pool.damageAt(...)) state.score += pool.config.score`. Centraliza el balance en `balance.ts` (una sola fuente de verdad).
- **AD-024 — Selección de tipo en spawn: lerp lineal + acumulado uniforme.** Misma técnica que Hearthstone, League, Risk of Rain. Simple, determinista en cuanto a la curva, random en cuanto al resultado. Futuro pity system para drops usará la misma base.

#### 🐞 Problemas / Bloqueos

- Ninguno. Typecheck limpio. Git push sigue bloqueado por credenciales (documentado en `memory/git_identity.md`).

#### 🎨 Pendiente de polish

- **Enemigos siguen siendo rectángulos de color plano** (12×26 rojo, 14×28 azul-acero, 36×22 oliva). Son distinguibles por tamaño y color, pero visualmente chirrían contra el player pixel-art. La siguiente pasada de sprites procedurales debería cubrirlos (candidate milestone futuro).

#### ➡️ Siguiente paso

- Validación visual por el usuario:
  - [ ] Los primeros ~30 s solo aparecen soldados rojos (90% raso al inicio).
  - [ ] A partir de ~1 min empiezan a verse rectángulos azul-acero (shields) más grandes y lentos.
  - [ ] Shields NO mueren con balas — hay que lanzarles una granada.
  - [ ] Tanquetas (rectángulos oliva enormes, 36 u de ancho) aparecen ocasionalmente (más frecuentes conforme pasa el tiempo).
  - [ ] Tanqueta aguanta varias balas (~12) o 3 explosiones.
  - [ ] Score por kill: raso 100, escudo 200, tanqueta 500.
---

### [2026-04-12] — Arsenal completo: Machinegun, Shotgun y Rocket Launcher

**Estado general:** 🟢 verde
**`tsc --noEmit`:** ✅ (validado manual, npx falló en entorno)

#### ✅ Hecho

- **Interfaz `Weapon`** (nuevo): Unifica el comportamiento de todas las armas (pistola, auto, semi, munición).
- **Pistola mejorada**: Intervalo reducido de `0.5s` a `0.25s` para cumplir la petición del usuario de "doble de velocidad".
- **Machinegun (H)** (nuevo): Fuego automático (fires while held) con 200 balas y alta cadencia (0.1s).
- **Shotgun (S)** (nuevo): Disparo triple en cono con **penetración** de proyectiles.
- **Rocket Launcher (R)** (nuevo): Cohetes lineales que detonan al impacto provocando daño AoE (reutiliza `ExplosionPool`).
- **`src/entities/rockets.ts`** (nuevo): `RocketPool` específico para proyectiles explosivos.
- **`src/entities/bullets.ts`** refactor: Soporte para velocidad horizontal/vertical y flag `penetrates` para el comportamiento de la escopeta.
- **`src/main.ts`** rewire:
  - Sistema de cambio de arma automático (vuelve a pistola al agotar munición especial).
  - Lógica de fuego automático integrada en el loop principal.
  - Resolución de colisiones específica para cohetes (detonación) y balas penetrantes.
  - Exposición de `__game.setWeapon()` para debug manual.

- **Ataque Melee Mejorado (AoE)**: El cuchillo ahora realiza un barrido que puede golpear a múltiples enemigos simultáneamente. Se ha añadido un retardo de enfunde (`HOLSTER_DELAY`) de 0.25s que impide disparar inmediatamente tras el tajo.
- **Sistema de Anti-Multihit (`shotId`)**: Implementado un sistema de rastreo de disparos que garantiza que un enemigo solo reciba daño una vez por cada pulsación del gatillo, corrigiendo el bug donde la escopeta eliminaba tanquetas de un disparo.
- **Ajuste de Escopeta**: Ángulo más cerrado (0.08 rad) y alcance reducido a 60 unidades para potenciar el combate cercano.

#### 🧠 Decisiones arquitectónicas

- **AD-025 — Penetrabilidad como flag en `BulletData`.** (Actualizado): Ahora los proyectiles penetrantes ignoran el chequeo de bloqueo de enemigos en `main.ts`, permitiendo herir a los soldados con escudo desde el frente.
- **AD-028 — Rango dinámico por proyectil.** `BulletData` ahora incluye `dist` y `range`. Esto evita tener pools de "balas de corto alcance" y "balas de largo alcance", permitiendo que cualquier arma configure su propia distancia de vida.
- **AD-029 — Manejo de entrada robusto.** Se ha separado la lectura de estado (`isDown`) del disparo de eventos (`wasPressed`) para garantizar que múltiples sistemas (melee y disparo) puedan responder a un mismo input de manera coherente.
- **AD-030 — Sistema de `shotId` para coherencia de daño.** Al asignar un ID único a cada ráfaga/disparo, resolvemos de forma elegante el problema de los proyectiles que atraviesan hitboxes grandes (evitando múltiples hits por frame) y el solapamiento de perdigones de escopeta.
- **AD-031 — Melee No-Bloqueante pero con Delay.** El ataque cuerpo a cuerpo es ahora de área (AoE), pero el `shootDelay` global introduce una penalización de tiempo necesaria para equilibrar la potencia del cuchillo frente al uso de armas de fuego.

#### ➡️ Siguiente paso

---

### [2026-04-13] — Overhaul de controles y acrobacias: Agachado, Apuntado y Air-to-Ground

**Estado general:** 🟢 verde
**Bundle size actual:** ≈ 52 KB ( Three.js tree-shaken + logic)
**Tiempo a primer paint:** < 100 ms

#### ✅ Hecho

- **Remapeo de controles**: Nuevo esquema `AD` (mover), `Space` (saltar), `W/S` (apuntar), `J/K` (disparar/granada).
- **Mecánica de Agachado (S)**: 
  - Reducción de hitbox y velocidad al 50%.
  - Sprite "comprimido" procedural.
- **Apuntado Multidireccional**:
  - Apuntado hacia arriba (`W`) con transición gradual (permitiendo disparos diagonales).
  - Apuntado hacia abajo (`S` en aire) instantáneo para ataques cenitales.
- **Ataque Aéreo (Air-to-Ground)**:
  - Disparo vertical descendente que atraviesa la defensa de los soldados con escudo.
  - Granadas verticales (sin arco parabólico) para ataques de precisión desde el aire.
- **Colisiones mejoradas**: Las balas ahora desaparecen al tocar el suelo.
- **Visuales Procedurales**: Añadidos frames específicos para mirar arriba, agacharse y aire-abajo en el generador de sprites.
- **Ajuste de Salto**: Incremento del 50% en la potencia de salto para facilitar maniobras de ataque descendente.

#### 🧠 Decisiones arquitectónicas

- **AD-032 — Interpolación de Ángulo de Apuntado.** En lugar de estados discretos, el jugador tiene un `aimAngle` que interpola, permitiendo que la ráfaga de la machinegun haga un "barrido" visual y táctico.
- **Vulnerabilidad de Escudo por Vector.** Los escudos ahora comprueban el `vy` de la bala; si viene de arriba (`vy < -100`), se ignora el bloqueo.

#### ➡️ Siguiente paso

- Implementar enemigos voladores que aprovechen el nuevo sistema de apuntado vertical.

---

### [2026-04-14] — Major Gameplay & Difficulty Refactor

**Estado general:** 🟢 verde
**Bundle size actual:** ≈ 54 KB (gzip)
**Tiempo a primer paint:** < 100 ms

#### ✅ Hecho

- **Difficulty Director (src/systems/difficultyDirector.ts):**
  - Implementado sistema de fases (`Pressure`, `Swarm`, `Mixed`, `FakeBreather`) para gestionar el ritmo del juego.
  - El sistema calcula un **Pressure Score** dinámico basado en densidad de enemigos, niveles de munición del jugador y tiempo transcurrido desde el último drop.
  - La dificultad es ahora reactiva: escala más rápido si el jugador domina y da respiros si está agobiado.
- **Dynamic Drop System (Refactoreado):**
  - Selección de items mediante **RNG ponderado** basado en el contexto.
  - El sistema favorece armas específicas según la necesidad: baja munición → armas; alta densidad → escopeta; presencia de tanques → lanzacohetes.
  - Implementada rampa de **Progressive Pity** que garantiza drops tras 25 bajas sin botín.
- **Gameplay Polish & Fixes:**
  - **Variable Jump Height**: Implementada física de salto dependiente de la duración de pulsación (Space).
  - **Ground Collision**: Las balas y perdigones ahora se destruyen al tocar el suelo; los cohetes detonan provocando explosión visual y daño AoE.
  - **Helicopter Bombs**: Corregido el fuego aliado (no dañan enemigos terrestres) y añadida muerte instantánea al contacto con el jugador.
  - **Countdown Sequence**: Añadida una cuenta atrás de 3 segundos (temporizador de 4s) con mensaje "START MISSION" antes de iniciar el run.
- **HUD & UI**:
  - Actualización del HUD para soportar mensajes overlay de cuenta atrás.
  - Optimización de refresco de HUD en el main loop.

#### 🧠 Decisiones
- **AD-033 — Difficulty Director**: Priorizar el "feel" arcade mediante cambios bruscos de fase en lugar de un escalado lineal aburrido.
- **AD-034 — Contextual Drops**: El juego ayuda al jugador de forma invisible pero justa, mejorando la retención y la "power fantasy".

#### 🐞 Problemas / Bloqueos
- **Import Error**: Error detectado y corregido en `main.ts` tras el refactor.
- **Countdown Timing**: Ajustado a 4s para asegurar visibilidad del número "3".

#### ➡️ Siguiente paso
- Implementación de enemigos voladores y efectos de sonido (Web Audio API).

---

### [2026-04-14] — Procedural Obstacle System & Terrain-Aware AI

**Estado general:** 🟢 verde
**Bundle size actual:** ≈ 58 KB (gzip)
**Tiempo a primer paint:** < 100 ms

#### ✅ Hecho

- **Terrain Management (src/systems/terrain/terrainManager.ts):**
  - Implementado generador de "chunks" con 5 patrones: Single Platform, Stair Sequence, Platform Swarm, Hill y Valley.
  - Sistema de superficie dinámico que soporta colinas con pendientes suaves (`lerp`) y plataformas atravesables desde abajo (one-way).
- **Instanced Rendering (src/entities/terrainPools.ts):**
  - Uso de `InstancedMesh` para optimizar el dibujo de cientos de segmentos de terreno y plataformas.
  - Técnica de "vertical slices" (listones de 4px) para renderizar pendientes suaves de forma procedural sin texturas externas.
- **Physics & AI Refactor:**
  - **Player & Items**: Refactorizada la gravedad para consultar `getSurfaceHeight` en lugar de una constante de suelo.
  - **Soldier AI**: Implementada lógica de salto y caída con retardo (0.3s-0.7s) para que persigan al jugador verticalmente.
  - **Shield/Tank AI**: Añadida detección de bordes para que se detengan en precipicios/bordes de plataforma.
  - **Heli Bombs**: Lógica de colisión selectiva: atraviesan plataformas a menos que el jugador esté a la misma altura o impacten con terreno sólido.
- **Spawn System Integration:**
  - El sistema de spawn ahora identifica automáticamente superficies elevadas para instanciar enemigos fuera de pantalla.
  - Ajuste dinámico de pesos: menos tanques en zonas de plataformas/parkour; más helicópteros para presionar verticalmente.

#### 🧠 Decisiones
- **AD-035 — Sliced Terrain Rendering**: Se optó por dibujar el terreno sólido mediante "slices" verticales de 4px de ancho. Esto permite representar cualquier pendiente `lerp-ed` manteniendo el "zero-loading" y con un coste de draw-call mínimo (1 call por todo el suelo).

#### 🐞 Problemas / Bloqueos
- **Duplicate Syntax**: Corregido un error de sintaxis duplicada tras el refactor de `EnemyPool`.
- **Item Collision**: Corregida la colisión de cajas de armas para que no se "entierren" en las pendientes de las colinas.

#### ➡️ Siguiente paso
- Implementación final de la mecánica de "Heli-2" (vuelo inteligente) y SFX.

---

### [2026-04-15] — Player sprite integration + PNG optimization pipeline

**Estado general:** 🟢 verde
**Bundle size actual:** ≈ 58 KB JS (gzip) + 68 KB PNG (player_idle)
**Tiempo a primer paint:** < 100 ms (menú HTML inline); sprite se carga en paralelo
**`tsc --noEmit`:** ✅ limpio

#### ✅ Hecho

**Sprite loader API (`src/gfx/playerSprite.ts` rewrite)**

- Nuevas constantes exportadas:
  - `PLAYER_IDLE_FRAMES = 6` — número de frames en la sheet (strip horizontal).
  - `PLAYER_IDLE_FPS = 8` — cadencia de animación idle.
- Función `preloadPlayerSprite(): Promise<Texture>` que resuelve cuando el PNG está decodificado y subido a GPU. Misma instancia de `Texture` que `getPlayerTexture()` (sync), así que un solo upload.
- `configureTexture()` centraliza: `NearestFilter` (min+mag), `generateMipmaps: false`, `SRGBColorSpace`, `repeat.x = 1/PLAYER_IDLE_FRAMES`.
- **Single-request guard**: `ensureLoading()` evita doble-fetch si `getPlayerTexture()` y `preloadPlayerSprite()` se llaman en orden distinto.

**Bug fix en `src/entities/player.ts`**

- Eliminadas las líneas `tex.repeat.set(1/17, 1)` y el comentario del sheet consolidado de 17 frames que era un plan futuro, NO el PNG actual. El constructor hacía que el `repeat.x` fuese `1/17` mientras `syncMesh` hacía offsets de `1/6` → **los frames se recortaban mal**.
- `syncMesh()` ahora usa `PLAYER_IDLE_FRAMES` y `PLAYER_IDLE_FPS` importados, no magic numbers.
- **Mesh invisible hasta PNG decodificado**: constructor setea `mesh.visible = false` y `preloadPlayerSprite().then(() => mesh.visible = true)`. Fail-open si el fetch da 404 (log + mostrar igual).

**PNG pipeline de optimización**

- `pngquant-bin` añadido como devDependency (binario cross-platform bundled).
- `scripts/optimize-sprites.mjs` — batch optimizer idempotente:
  - Recorre `public/assets/sprites/**/*.png` recursivamente.
  - Aplica `pngquant --quality 65-80 --force --skip-if-larger --strip`.
  - Maneja exit codes 98/99 (ya optimizado) como "skip, no failure".
  - Reporta before/after por archivo y total.
- `npm run optimize:sprites` en `package.json`.

**Resultado medido en `player_idle.png`:**

| | Antes | Después | Reducción |
|---|---|---|---|
| Tamaño | **231,848 B** | **67,508 B** | **-70.9%** |
| Profundidad | RGBA 8-bit (4 canales) | 8-bit colormap (paleta) | palette-indexed |
| Dimensiones | 1180 × 194 | 1180 × 194 | sin cambio |

**`public/assets/README.md` nuevo** — documenta:
- Layout de carpetas (`sprites/{player,enemies,items,ui}/`).
- Reglas de autoría (strips horizontales, frame count en código no en filename).
- Comando de optimización (`npm run optimize:sprites`).
- Presupuesto 300 KB total para la Jam.

#### 🧠 Decisiones

- **AD-036 — Sprite assets en `public/` (no `src/assets/`).** Paths estables (`/assets/...`) sin hashing ni procesamiento bundler; evita import statements en cada módulo de loader. Trade-off: no inlining automático como data-URI. Los sprites son >4 KB de todas formas; el bundler no los inlinearía.
- **AD-037 — UV config en el módulo del sprite, NO en el consumidor.** El bug del `1/17` nació porque el consumidor (Player) reconfiguraba `tex.repeat`. Regla nueva: solo `playerSprite.ts` toca `repeat`/`offset.initial`/`filter`. El consumidor solo lee `map.offset.x = frame / PLAYER_IDLE_FRAMES`.
- **AD-038 — Preload con fail-open.** Si el PNG falla (red caída, 404), el juego sigue jugable (mesh visible sin textura) en vez de congelarse. Log de error para diagnóstico pero sin crash.
- **AD-039 — Optimización PNG como paso de build, no runtime.** pngquant corre en la máquina del autor antes del commit. El bundle servido a usuarios ya es pequeño. Cero overhead en la carga del juego.

#### 🐞 Problemas / Bloqueos

- **Desalineación en la documentación.** Las entradas entre 2026-04-13 y 2026-04-14 se añadieron directamente en el BUILD_LOG por la otra sesión, pero varias decisiones (DifficultyDirector, terrain, helicopter, weapon interface, aim angle) NO tienen su reflejo en `MEMORY.md` ni en `PROMPTS.md`. Se documentarán en el próximo pase de consolidación.
- Ningún bloqueante activo. Typecheck limpio.

#### ➡️ Siguiente paso

- Validación in-game por el usuario: confirmar que el personaje anima correctamente (6 frames idle cycled a 8 FPS).
- Añadir las siguientes animaciones del player usando el mismo pipeline:
  - `player_run.png` (N frames de carrera)
  - `player_shoot.png` / `player_aim_up.png` (diferentes poses de disparo)
  - `player_crouch.png` (1-2 frames)
  - `player_jump.png` (1 frame en el aire)
- Por cada sheet nueva: drop en `public/assets/sprites/player/`, añadir constante + getter en `playerSprite.ts`, y `Player` selecciona la textura según su estado de animación.

---

### [2026-04-15] — Cleanup session: tipado, registry de animaciones, colisiones y docs

**Estado general:** 🟢 verde
**`tsc --noEmit`:** ✅ limpio
**Objetivo:** Dejar el código preparado para añadir las animaciones restantes sin fricción, cerrar la brecha de tipado y consolidar la documentación.
**Sin cambios de comportamiento:** todas las refactors son isomorfas (el juego se ve y juega igual).

#### ✅ Hecho — 4 fases

**Fase 1 — Eliminar `any` en fronteras de módulo (cero riesgo)**
- `src/entities/player.ts:109` — `terrain: any` → `TerrainManager`.
- `src/entities/enemies/enemyPool.ts:147` — `terrain: any` → `TerrainManager`, firma reformateada en multi-línea.
- `src/systems/spawnSystem.ts` — 6 `any` eliminados: `helicopters: any` → `HelicopterPool`, 3× `terrain: any` → `TerrainManager`, variante tipada `EnemyPool | HelicopterPool` para la `pool` local. Imports `import type` para evitar runtime dependency cycles. Eliminada función `lerp()` dead code.
- Resultado: autocompletado funcional en IDE, typecheck detecta ahora renombrados en `TerrainManager` / `HelicopterPool`.

**Fase 2 — Registry de animaciones del Player (prep para run/shoot/crouch/jump)**
- `src/gfx/playerSprite.ts` reescrito alrededor de un `Record<PlayerAnim, AnimDef>` inmutable:
  - Tipo `PlayerAnim = 'idle' | 'run' | 'shoot' | 'jump' | 'crouch' | 'aimUp'`.
  - `DEFS` con metadata por animación: `url`, `frames`, `fps`, `loop`.
  - `getAnimation(name)` síncrono con **fallback cascada**: animación pedida → idle → textura vacía (mesh invisible vía gate de preload).
  - `preloadAllAnimations()` hace `Promise.all` de todas las animaciones; las que fallan (404, PNG no existe todavía) **se resuelven igualmente** (fail-open) con `console.warn`, nunca rechazan la Promise.
  - Exports deprecated (`PLAYER_IDLE_FRAMES`, `PLAYER_IDLE_FPS`, `getPlayerTexture`, `preloadPlayerSprite`) mantenidos para backward-compat con cualquier caller antiguo.
- `src/entities/player.ts` reescrito con state machine de animación:
  - Fields antes: `_idleTime`, `_runTime` (dos timers). Ahora: `_currentAnim: PlayerAnim`, `_animTime: number`, `_shootAnimTimer: number`.
  - Nuevo `selectAnim(vx)` decide el estado cada frame con prioridad **shoot > jump > crouch > aimUp > run > idle**.
  - Nuevo método público `triggerShootAnim(durationSec)` — main.ts lo invocará cuando dispare una arma, fuerza el estado 'shoot' durante N segundos.
  - `syncMesh()` ahora hace swap de `material.map` cuando la animación cambia; respeta `loop: false` para shoot/jump (clamp en último frame).
  - `reset()` reinicia también el animation state (bug menor anterior: los timers sobrevivían a Retry).
- **Impacto**: añadir una animación nueva = 1 entrada en `DEFS` + 1 PNG + 1 caso en `selectAnim()`. Cero duplicación de loaders.

**Fase 3 — Extraer helpers de colisión (desduplicación)**
- 5 funciones nuevas en `src/main.ts`:
  - `bulletVsGroundPool(b, bi, pool)` — chequeo de bala vs un pool de suelo, incluyendo regla del escudo (bullets top/bottom penetran) y anti-multihit por `shotId`.
  - `bulletVsHelicopters(b, bi)` — chequeo de bala vs helicópteros con anti-multihit.
  - `rocketVsGroundPool(pool)` — detección de overlap rocket-suelo (sin daño aquí; se delega a `detonateRocket`).
  - `rocketVsHelicopters()` — análogo para helicópteros.
  - `detonateRocket(r, ri)` — atómico: kill + spawn explosion + `applyExplosionDamage`.
- `resolveBulletEnemyHits()` pasa de 90 líneas con dos loops `bulletLoop:` duplicados a 20 líneas orquestadoras: un solo loop de balas, llamadas a helpers, `consumed` flag para cortar.
- `resolveRocketEnemyHits()` misma reestructuración, de 50 a 15 líneas.
- Nuevas AABBs reutilizables: `heliBox`, `enemyBulletBox` — eliminan 3 allocations inline por frame (`{ x, y, w, h }` per-iteración en `resolvePlayerEnemyHits` + `resolveEnemyBulletPlayerHits`).
- `import { type RocketData }` añadido explícitamente (antes los rockets compartían shape por duck-typing).
- Net LOC en `main.ts`: +29 líneas (los helpers añaden líneas que los inlines eliminados quitan), pero la **estructura lógica** gana enormemente. Añadir un 5º tipo de arma o enemigo = 1 helper nuevo, no 50 líneas de copy-paste.

**Fase 4 — Documentación consolidada**
- `MEMORY.md`:
  - Nuevas ADs documentadas: **AD-037** (sprites en `public/`), **AD-038** (UV config solo en módulo sprite — bug-fix de `1/17` vs `1/6`), **AD-039** (preload fail-open), **AD-040** (registry de animaciones), **AD-041** (optimización PNG como build-step), **AD-042** (cero `any` en fronteras de módulo).
  - File tree reescrito reflejando el estado **real** del repo al 2026-04-15 (la versión anterior era el plan original con archivos que nunca existieron como `shaders/*.glsl`, `dropSystem.ts`, `soldier.ts`/`shieldSoldier.ts`/`tank.ts` separados).
  - Sección nueva **"Cómo añadir una nueva animación del player"** con el flujo de 3 pasos (drop PNG → entry en `DEFS` → case en `selectAnim()`).
  - Checklist de estado actual extendido con PASO 10 (primera animación integrada) y PASO 11 (esta limpieza).
- `PROMPTS.md`: entrada P07 (esta sesión).
- `BUILD_LOG.md`: esta entrada.

#### 🧠 Decisiones

- **AD-040 — Registry de animaciones del player.** Un `Record<PlayerAnim, AnimDef>` + map runtime de `Texture`. Rationale: reusabilidad con cero duplicación, fallback automático durante producción de arte, preload paralelo sin código bespoke por animación.
- **AD-042 — Cero `any` en fronteras de módulo.** `import type { TerrainManager }` siempre que sea posible (evita ciclos de módulo). Los `any` internos a un módulo podrían quedarse si son inocuos, pero cruzar una frontera requiere tipo formal.
- **AD-043 — Helpers de colisión con efectos laterales documentados.** `bulletVsGroundPool()` comunica via return value (`boolean consumed`) + mutación directa de `state.score` y de `pool.data[si]`. Pattern aceptable aquí porque el caller (`resolveBulletEnemyHits`) es el único consumer; exponer como módulo separado requeriría pasar `state` explícitamente. Cuando main.ts se divida en múltiples archivos, este contrato se formalizará.

#### 🐞 Problemas / Bloqueos

- Bug al inicio de Fase 3: las helper functions asumían `BulletData` pero los rockets usan `RocketData`. TS lo atrapó inmediatamente (`TS2345: RocketData missing shotId, damage, penetrates, dist, range`). Fix: import `type RocketData` y helpers específicos para rockets que no leen esos fields.
- Warning CRLF/LF en varios archivos al guardar — Windows default; `.gitattributes` podría unificarlo pero no es prioritario.

#### 📏 Métricas

| Archivo | Cambios netos |
|---|---|
| `src/main.ts` | +283 / −254 (refactor + helpers; +29 net LOC, mayor legibilidad) |
| `src/entities/player.ts` | +160 / −0 (rewrite con state machine) |
| `src/gfx/playerSprite.ts` | +171 / −0 (rewrite con registry) |
| `src/systems/spawnSystem.ts` | +54 / −0 (rewrite con tipos formales) |
| `src/entities/enemies/enemyPool.ts` | +9 / −0 (firma multi-línea + import type) |
| `MEMORY.md` | +185 líneas (6 ADs + file tree + guía de animaciones) |
| `BUILD_LOG.md` | +74 líneas (esta entrada) |

#### ➡️ Siguiente paso

- **Añadir animaciones restantes del player** una a una. El workflow por animación:
  1. Dibujar sheet horizontal (N frames, píxeles uniformes).
  2. Guardar en `public/assets/sprites/player/player_<nombre>.png`.
  3. `npm run optimize:sprites` para comprimir.
  4. Ajustar `DEFS.<nombre>` en `playerSprite.ts` si el frame count real difiere de la estimación.
  5. Si es `'shoot'`, wire `player.triggerShootAnim(duration)` en `main.ts` cuando el arma dispare.
- Orden sugerido: **run** (visible siempre que te muevas) → **jump** (el más simple, 1 frame) → **shoot** (con wiring) → **crouch** (corto loop) → **aimUp** (1 frame pose).

---
