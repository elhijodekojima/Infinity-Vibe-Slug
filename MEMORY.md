# MEMORY.md — Cerebro del Proyecto

> Este archivo es la **memoria persistente** del proyecto Infinity Vibe Slug.
> Contiene decisiones arquitectónicas, directivas de build y contexto global para cualquier sesión de trabajo futura.

---

## 🧠 Contexto general

- **Proyecto:** Infinity Vibe Slug
- **Jam:** 2026 Cursor Vibe Coding Game Jam
- **Deadline:** 2026-05-01 13:37 UTC
- **Stack:** Vite + TypeScript + Three.js (ver `STACK.md`)
- **Reglas duras de la Jam:** ver `RULES.md`
- **GDD estructurado:** ver `GAME_DESIGN.md`
- **Objetivo económico:** primer premio ($20,000)

---

## 🏛️ Decisiones Arquitectónicas

### AD-001 — Stack: Vite + TypeScript + Three.js
**Fecha:** 2026-04-12
**Decisión:** Usar Vite como bundler, TypeScript strict, Three.js con imports selectivos.
**Alternativas consideradas:** PixiJS (demasiado 2D-only, ecosistema menor), Canvas 2D puro (no queremos perder shaders / flexibilidad).
**Razón:** Three.js con `OrthographicCamera` + `InstancedMesh` + `ShaderMaterial` nos da render 2D performante con capacidad de efectos shader pixel-art, mientras Vite garantiza bundle mínimo y HMR instantáneo.

### AD-002 — Procedural-first con Sprites 2D Dedicados
**Fecha:** 2026-04-12 (Actualizado 2026-04-15)
**Decisión:** **Se permite la carga estática de atlas de sprites 2D en PNG transparentes** para jugador y enemigos, terrenos, obstáculos y fondos.
**Razón:** Para destacar visualmente en la Jam, el pixel art real ofrece mucho mayor impacto visual y competitividad con un peso mínimo que no compromete excesivamente el bundle (a diferencia de objetos 3D o librerías pesadas).
**Excepción (Deprecada):** Antes se restringía al 100% de proceduralidad de texto. Ahora la integración de sprite atlas es normativa oficial.

### AD-003 — Sin framework UI
**Fecha:** 2026-04-12
**Decisión:** HUD y menús en HTML/CSS plano sobre el `<canvas>` de Three.js. Nada de React/Vue/Svelte.
**Razón:** Bundle mínimo. La UI es simple: HUD con contadores, pantalla de username, pantalla de game over.

### AD-004 — Persistencia solo en localStorage
**Fecha:** 2026-04-12
**Decisión:** High-score, username, quizás settings → `localStorage`. Cero backend.
**Razón:** Cumple regla "No login / No signup". Cero fricción.

### AD-005 — Estado del juego como módulos TS explícitos
**Fecha:** 2026-04-12
**Decisión:** Sin Redux/Zustand. Singletons de módulo o clases pequeñas con export.
**Razón:** El juego es single-session, el estado es efímero, no necesita time-travel debugging.

### AD-006 — Object pooling obligatorio para balas/enemigos
**Fecha:** 2026-04-12
**Decisión:** Balas, enemigos, partículas de explosión y drops usan **object pools**. Nunca `new` en el loop.
**Razón:** Garbage collection de Three.js puede causar stutters. En survival infinito con cientos de entidades, el GC es el enemigo.

### AD-007 — InstancedMesh para enemigos y balas
**Fecha:** 2026-04-12
**Decisión:** Un `InstancedMesh` por tipo de entidad (soldados, escudos, tanquetas, balas jugador, balas enemigo). Matrices actualizadas por frame.
**Razón:** Minimiza draw calls. Esencial para mantener 60 FPS con densidad alta.

### AD-008 — Render loop con `requestAnimationFrame` + fixed-step sim
**Fecha:** 2026-04-12
**Decisión:** Render en `rAF`, simulación de juego en pasos fijos (ej: 60 Hz) con interpolación.
**Razón:** Determinismo para el balance, independencia del framerate del navegador.

### AD-032 — Mecánica de Agachado y Apuntado Multidireccional
**Fecha:** 2026-04-13
**Decisión:** Implementar apuntado hacia arriba (gradual) y hacia abajo (instantáneo en aire). Agacharse reduce velocidad y hitbox al 50%.
**Razón:** Profundiza la táctica defensiva y permite atacar enemigos voladores (futuro) o vulnerables cenitalmente (escudos).

### AD-033 — Difficulty Director (Performance Coupling)
**Fecha:** 2026-04-14
**Decisión:** Reemplazar escalado lineal de enemigos por un Director de Dificultad reactivo basado en el "Pressure Score" (densidad de enemigos, munición, peligro reciente).
**Razón:** Evita el aburrimiento en rachas de dominio y el agobio injusto, creando loops de tensión y alivio arcade.

**Razón:** Ayuda al jugador cuando lo necesita y potencia la "fantasía de poder" en momentos críticos de forma orgánica.

### AD-035 — Procedural Obstacle System (Terrain)
**Fecha:** 2026-04-14
**Decisión:** Implementar un sistema de "chunks" para obstáculos (plataformas, escaleras, colinas, valles) usando `InstancedMesh`. Las colinas/valles se dibujan con "slices" verticales para permitir pendientes suaves sin assets externos.
**Razón:** Rompe la linealidad horizontal del nivel y añade verticalidad táctica sin violar la regla "Zero-Loading".

### AD-036 — Combat Context Layer
**Fecha:** 2026-04-14
**Decisión:** Unificar los sistemas de AI, Terrain y Drops mediante un "Contexto de Combate" que categoriza geográficamente el terreno activo (`choke_low`, `chaotic`, `high_ground`) y afecta la probabilidad base de spawns e items dinámicamente cada 0.25s.
**Razón:** Evita la desconexión mecánica y asegura una reactividad sistémica ("Emergent Gameplay") estilo Left 4 Dead AI Director.

### AD-037 — Sprite assets viven en `public/`, no en `src/assets/`
**Fecha:** 2026-04-15
**Decisión:** Los sprite sheets PNG se sirven desde `public/assets/sprites/<categoría>/<nombre>.png` con URLs estables (`/assets/...`). Vite/Vercel los sirven tal cual, sin hashing ni procesamiento bundler.
**Razón:** Paths predecibles para los loaders; evita un `import` por cada sprite. Trade-off: no hay auto-inline como data-URI, pero los sheets son >4 KB de todas formas.

### AD-038 — Configuración de UV en el módulo de sprite, NO en el consumidor
**Fecha:** 2026-04-15
**Decisión:** `texture.repeat`, `texture.offset` inicial, filtros y mipmaps se setean UNA vez en `gfx/<x>Sprite.ts` (`configureTexture()`). El consumidor (Player, EnemyPool) solo lee `texture.offset.x = frame / frameCount` para avanzar la animación.
**Razón:** Un bug `repeat=1/17` del consumidor contra `offset=1/6` del consumidor rompió los recortes de frame. Una sola fuente de verdad por textura.

### AD-039 — Preload de sprites con fail-open
**Fecha:** 2026-04-15
**Decisión:** Si un PNG da 404 o error de red, el módulo de sprite resuelve el preload igualmente (sin rechazar la Promise) y `getAnimation()` hace fallback a `idle`. Logueo de warning, nunca crash.
**Razón:** El juego sigue jugable aunque falten animaciones durante la fase de producción de arte.

### AD-040 — Registry de animaciones del player (1 clase, N estados)
**Fecha:** 2026-04-15
**Decisión:** `playerSprite.ts` expone un `Record<PlayerAnim, AnimDef>` inmutable con metadata (url, frames, fps, loop) + runtime map con `Texture` cacheada. `Player` selecciona su `PlayerAnim` cada frame (via `selectAnim()`) y swappea `material.map` cuando cambia, sin recrear materiales ni geometrías.
**Razón:** Añadir una animación = 1 entrada en el registry + 1 PNG + 1 caso en `selectAnim()`. Cero duplicación de loaders, precargas o constantes de frames.

### AD-041 — Optimización PNG como paso de build, no de runtime
**Fecha:** 2026-04-15
**Decisión:** `pngquant-bin` como devDep + `npm run optimize:sprites` (script Node idempotente que recorre `public/assets/sprites/**`). Se ejecuta en la máquina del autor antes del commit; los PNGs servidos a usuarios ya están comprimidos.
**Razón:** Sin overhead en la carga del juego. Resultado medido en `player_idle.png`: 232 KB → 68 KB (-70.9%).

### AD-042 — Cero `any` en fronteras de módulo
**Fecha:** 2026-04-15
**Decisión:** Todo parámetro de función cruzando módulos tiene su tipo formal. `TerrainManager`, `HelicopterPool` y `EnemyPool` se importan con `import type` cuando solo se usan como tipo.
**Razón:** TypeScript atrapa bugs antes de runtime (ej. método renombrado en TerrainManager detecta los callsites). Autocompletado funciona en el IDE. El coste es un `import type` extra por archivo.

### AD-043 — Helpers de colisión en main.ts con mutación compartida
**Fecha:** 2026-04-15
**Decisión:** Los helpers `bulletVsGroundPool`, `bulletVsHelicopters`, `rocketVsGroundPool`, `rocketVsHelicopters`, `detonateRocket` viven en `main.ts` y mutan directamente `state.score`, `bullets`, `rockets`, `explosions`. Contrato: devuelven `boolean consumed` para que el orquestador corte el procesamiento del proyectil. No son módulo reutilizable.
**Razón:** Separarlos a un módulo externo requeriría pasar `state` + 5 pools como parámetros (ruido). Una vez `main.ts` se divida en múltiples archivos, se formalizará el contrato.

### AD-044 — Animación del player por CAPAS (legs + torso) — solo personaje principal
**Fecha:** 2026-04-16
**Decisión:** El sprite del jugador se divide en DOS capas independientes (`legsMesh` + `torsoMesh`), cada una con su propia Textura, animación y state machine. Legs expresa movimiento (`idle`/`run`/`jump`/`crouch`), Torso expresa acción (`idle`/`shoot`/`aimUp`/`aimDown`/`throw`/`melee`). Las capas se renderizan en el mismo punto del mundo dentro de un `Group`. Ambos sheets son full-body 20×32 con padding transparente para la mitad que no les toca (cero anchor math). Crouch sincroniza las dos capas vía un Y-offset fijo (`PLAYER.TORSO_CROUCH_Y_OFFSET`) aplicado solo al torso. Enemigos y otros elementos NO usan este sistema — mantienen sheets full-body tradicionales.
**Razón:** Evita la explosión combinatoria de animaciones completas (run+shoot, jump+shoot, crouch+aimUp, crouch+shoot...). Añadir una animación nueva = 1 entrada en `LEGS_DEFS` o `TORSO_DEFS` + 1 PNG + 1 case en `selectLegsAnim()` o `selectTorsoAnim()`. Con N estados de legs × M estados de torso, N+M sheets en lugar de N×M. Migración no-rompedora: si una capa no tiene sheet layered, fallback en cascada → legs muestra `player_idle.png` legacy y torso se oculta.

### AD-045 — Hooks `trigger*Anim(dur)` para animaciones one-shot
**Fecha:** 2026-04-16
**Decisión:** El torso tiene tres estados one-shot (`shoot`, `melee`, `throw`) que deben reproducirse cuando ocurre un evento discreto de juego, no cuando un input se mantiene. El Player expone `triggerShootAnim(dur)`, `triggerMeleeAnim(dur)`, `triggerThrowAnim(dur)` como métodos públicos. Main.ts los invoca cuando el arma dispara / melee hit / grenade throw. Cada hook enciende un timer interno; `selectTorsoAnim()` prioriza el timer > 0 sobre cualquier otro estado.
**Razón:** Desacopla el "qué pasó" (main.ts lo sabe) del "cómo animar" (player.ts lo decide). Evita polluir el player con referencias a sistemas externos. Duración configurable por caller: shoot típicamente 0.15s, melee 0.25s, throw 0.35s.

---

## 📁 Estructura de carpetas (estado real al 2026-04-15)

```
infinity-vibe-slug/
├── index.html                      # ⚡ ≤4 KB — CSS crítico inline, menú/HUD/gameover en DOM
├── package.json                    # scripts: dev, build, preview, typecheck, optimize:sprites
├── tsconfig.json
├── vite.config.ts
├── vercel.json                     # headers cache, rewrites
├── .gitignore
│
├── public/                         # Assets servidos por Vite / Vercel sin procesamiento
│   └── assets/
│       ├── README.md               # convenciones de sprites
│       └── sprites/
│           └── player/
│               └── player_idle.png # 68 KB (optimizado con pngquant, 6 frames 1180×194)
│
├── scripts/
│   └── optimize-sprites.mjs        # npm run optimize:sprites — batch pngquant idempotente
│
├── src/
│   ├── main.ts                     # 🚀 bootstrap, state machine, game loop, collision passes
│   │
│   ├── ui/                         # 🪶 DOM puro, se pinta antes que el canvas
│   │   ├── hud.ts
│   │   ├── menu.ts
│   │   └── gameover.ts
│   │
│   ├── core/                       # ⚙️ Motor
│   │   ├── renderer.ts             # WebGLRenderer + OrthographicCamera (altura fija 270)
│   │   ├── loop.ts                 # Fixed-step sim (60 Hz) + rAF render
│   │   ├── input.ts                # WASD + jump + fire + grenade + aim + crouch
│   │   ├── clock.ts                # Delta time
│   │   └── persistence.ts          # localStorage (highscore, username)
│   │
│   ├── gfx/                        # 🎨 Generación visual
│   │   ├── background.ts           # ShaderMaterial parallax (pure GLSL, zero assets)
│   │   ├── pixelGen.ts             # makePixelTexture(frames, palette) → CanvasTexture
│   │   ├── playerSprite.ts         # Registry de animaciones (PNG externos, ver AD-040)
│   │   ├── enemySprite.ts          # Canvas-generated sprites (soldier/shield/tank/heli)
│   │   └── itemSprite.ts           # Drop pickups (machinegun/shotgun/rocket/grenade)
│   │
│   ├── entities/
│   │   ├── player.ts               # Physics + state machine de animación
│   │   ├── bullets.ts              # BulletPool (player) + EnemyBulletPool (bullet/bomb/cannonball)
│   │   ├── grenades.ts             # Parabólica con onExplode callback
│   │   ├── explosions.ts           # Pool solo visual (AD-018)
│   │   ├── terrainPools.ts         # InstancedMesh para suelo + plataformas
│   │   ├── enemies/
│   │   │   ├── enemyPool.ts        # Clase genérica (soldier/shield/tank) — AD-020
│   │   │   └── helicopterPool.ts   # Patrol → approach → lock → exit, dropea bombs
│   │   └── weapons/
│   │       ├── weapon.ts           # Interface común (label/ammo/isAutomatic/tickCooldown/tryFire)
│   │       ├── pistol.ts           # Infinita, semi-auto, cadencia cap 0.25s
│   │       ├── machinegun.ts       # 200 balas, automática, cadencia 0.1s
│   │       ├── shotgun.ts          # 50 balas, 3-spread, cono corto, atraviesa escudo
│   │       └── rocketLauncher.ts   # 20 rockets, usa RocketPool, explosión AoE
│   │
│   ├── systems/
│   │   ├── collisions.ts           # AABB center-based (pure functions, zero alloc)
│   │   ├── spawnSystem.ts          # Exponencial × fases × context — typed (AD-042)
│   │   ├── difficultyDirector.ts   # Pressure score + fases (domin./normal/struggle)
│   │   └── terrain/
│   │       └── terrainManager.ts   # Chunks procedurales, 5+ patrones, slice rendering
│   │
│   └── config/
│       ├── balance.ts              # 19 bloques `export const` — única fuente de balance
│       └── colors.ts               # Paleta NeoGeo (hex literales)
│
├── RULES.md                        # Reglas de la Jam
├── STACK.md                        # Stack + manifiesto de assets
├── GAME_DESIGN.md                  # GDD estructurado
├── MEMORY.md                       # ← este archivo (índice AD + file tree + convenciones)
├── BUILD_LOG.md                    # Diario cronológico de hitos
├── PROMPTS.md                      # Registro de prompts IA (regla 90% de la Jam)
├── SUBMISSION_CHECKLIST.md         # Checklist de envío final
├── ERROR_LOG.md                    # Bugs críticos
├── README.md
└── gdd.txt                         # GDD original del usuario (intocado)
```

### Principios de separación (clave)

1. **`ui/`** — DOM puro, **se pinta antes que el canvas**. Esto garantiza primer paint < 100 ms.
2. **`core/`** — Three.js aislado. Cualquier cambio de render no toca gameplay.
3. **`entities/`** — geometrías primitivas (`PlaneGeometry`) + shaders; nunca imports externos.
4. **`systems/`** — lógica pura, testable sin DOM (determinista para balance).
5. **`config/`** — valores ajustables en un solo lugar. IA puede iterar balance aquí sin tocar código de sistemas.

---

## 🏗️ Directiva de Build (OBLIGATORIA)

> **Al finalizar el proyecto**, crear un script (`scripts/extract-embed-snippet.ts`) que:
>
> 1. Lea la URL de producción de Vercel (de `vercel.json` o de una variable de entorno).
> 2. Genere un bloque HTML limpio **listo para pegar en el Google Form de inscripción de la Vibe Jam**.
> 3. El snippet puede ser:
>    - Un **`<iframe>`** con `src`, `width`, `height`, `frameborder="0"`, `allowfullscreen`, y estilos mínimos inline.
>    - Y/o el bloque HTML del `index.html` si el formulario acepta HTML directo.
> 4. Imprima el snippet por consola **y** lo guarde en `dist/embed-snippet.html`.
>
> **Esta tarea aparece también como casilla obligatoria en `SUBMISSION_CHECKLIST.md`.**
> **Sin este snippet, el envío NO se considera válido.**

---

## 🧭 Convenciones de código

- **Módulos ES**, nunca CommonJS.
- **TypeScript strict**: `strictNullChecks`, `noImplicitAny`, `exactOptionalPropertyTypes`.
- **Nombres**: `camelCase` para funciones/variables, `PascalCase` para clases/tipos, `SCREAMING_SNAKE` para constantes globales.
- **Imports selectivos de Three**: `import { Scene, OrthographicCamera, WebGLRenderer } from 'three';` — **nunca** `import * as THREE`.
- **Zero magic numbers** en lógica: todo en `src/config/balance.ts`.
- **Comentarios solo donde la intención no es obvia.**

---

## 📍 Estado actual

- ✅ PASO 1: GDD leído y asimilado.
- ✅ PASO 2: 8 archivos de gestión creados.
- ✅ PASO 3: Arquitectura "Zero-Loading" definida.
- ✅ PASO 4: Combate base, granadas y enemigos (soldier/shield/tank).
- ✅ PASO 5: Arsenal completo y sistema de Drops.
- ✅ PASO 6: Acrobacias (Crouch, Aim Up/Down) y remapa de controles.
- ✅ PASO 7: Difficulty Director, Dynamic Drops y Gameplay Polish.
- ✅ PASO 8: Sistema de Obstáculos Procedurales y Terreno Dinámico.
- ✅ PASO 9: Combat Context Layer, Helicópteros (Enemigos Aéreos) y Sistema de Pausa.
- ✅ PASO 10: **Integración de la primera animación del Player** (`player_idle.png`, 6 frames) + pipeline de optimización PNG (`npm run optimize:sprites`).
- ✅ PASO 11: **Limpieza de código y docs** — tipado estricto (cero `any` cruzando módulos), registry de animaciones extensible + fallback a `idle`, índice AD actualizado, file tree sincronizado con realidad.
- ✅ PASO 12: **Sistema de animación layered** (AD-044) — player dividido en legs + torso con state machines independientes, `Group` con 2 Meshes superpuestos, fallback legacy para migración progresiva. Evita explosión combinatoria (N+M vs N×M sheets).
- 🚧 **Work in Progress:** Arte de las capas layered (4 sheets de legs + 6 sheets de torso) — pendiente del usuario. Mientras tanto el juego usa el `player_idle.png` legacy como fallback en la capa legs.
- ⏸️ **Pendiente:** SFX (Web Audio API), sprites pixel-art para enemigos (actualmente generados proceduralmente), menús/HUD finales, deploy a Vercel, snippet para el Google Form.

---

## 🎯 Cómo añadir una nueva animación del player (sistema layered, AD-044)

El sprite del player tiene **dos capas independientes**: legs (piernas) y torso (cuerpo + brazos + arma). Cada animación vive SOLO en una de las dos.

**Decide la capa primero**: si la animación afecta el movimiento del cuerpo (correr, saltar, agacharse) → `legs`. Si afecta pose de brazos/arma (disparar, apuntar, lanzar, cuchillear) → `torso`.

Luego el flujo es **3 pasos**:

1. **Arte**: dibujar el sheet horizontal en el canvas 20×32 (el tamaño del player), con píxeles solo en la mitad que corresponde a la capa y el resto transparente. Guardar como:
   ```
   public/assets/sprites/player/player_<layer>_<state>.png
   ```
   donde `<layer>` es `legs` o `torso` y `<state>` es el nombre del estado (e.g., `run`, `shoot`, `crouch`).

2. **Registry**: añadir una entrada en `LEGS_DEFS` o `TORSO_DEFS` dentro de `src/gfx/playerSprite.ts`:
   ```ts
   // en LEGS_DEFS:
   run: { url: '/assets/sprites/player/player_legs_run.png', frames: 8, fps: 12, loop: true },
   // en TORSO_DEFS:
   shoot: { url: '/assets/sprites/player/player_torso_shoot.png', frames: 4, fps: 16, loop: false },
   ```

3. **Transición**: añadir el caso en `Player.selectLegsAnim()` o `Player.selectTorsoAnim()` en `src/entities/player.ts`. Los three.js one-shot del torso (`shoot`, `melee`, `throw`) ya están wired a los hooks `trigger*Anim(dur)` — main.ts los invoca cuando dispara el arma / da melee / lanza grenade.

Después: `npm run optimize:sprites` para comprimir el PNG antes de commit.

**Fallback durante producción**: si un sheet layered no existe aún, `getLegsAnim()` cae en cascada al `player_idle.png` legacy y `getTorsoAnim()` devuelve null (el torso mesh se oculta). El juego sigue jugable mientras se va construyendo el arte capa por capa.

---

**Última actualización:** 2026-04-15
