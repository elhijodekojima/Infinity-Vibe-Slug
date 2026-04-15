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

---

## 📁 Estructura de carpetas propuesta (Zero-Loading)

```
infinity-vibe-slug/
├── index.html                    # ⚡ ≤3KB — UI instantánea, primer paint
├── public/
│   └── favicon.svg               # inline SVG <1KB
├── src/
│   ├── main.ts                   # 🚀 entry point, arranca core + UI bindings
│   │
│   ├── ui/                       # 🪶 HTML/CSS UI SÚPER LIGERO (primer frame)
│   │   ├── hud.ts                # contadores de score, armas, granadas
│   │   ├── menu.ts               # pantalla inicial (username)
│   │   ├── gameover.ts           # pantalla de game over
│   │   └── styles.css            # estilos inline en index.html si es posible
│   │
│   ├── core/                     # ⚙️ MOTOR (Three.js base, loop, resize)
│   │   ├── renderer.ts           # WebGLRenderer + scene + camera ortográfica
│   │   ├── loop.ts               # fixed-step sim + rAF render loop
│   │   ├── input.ts              # teclado (P1/P2) + touch (bonus móvil)
│   │   ├── resize.ts             # handler responsive de canvas
│   │   ├── clock.ts              # delta time, tiempo de juego global
│   │   └── audio.ts              # Web Audio API — SFX procedurales 16-bit
│   │
│   ├── gfx/                      # 🎨 GENERACIÓN PROCEDURAL DE GRÁFICOS
│   │   ├── pixelGen.ts           # pixel-art sprites en canvas offscreen → textura
│   │   ├── palette.ts            # paleta NeoGeo / Metal Slug
│   │   ├── shaders/
│   │   │   ├── parallaxBG.glsl   # fondo desplazándose
│   │   │   ├── crt.glsl          # filtro CRT/scanlines (bonus)
│   │   │   └── explosion.glsl    # efecto de explosión AoE
│   │   └── instancedMesh.ts      # wrapper para pools de instanced rendering
│   │
│   ├── entities/                 # 👥 ENTIDADES DEL JUEGO (geometrías ligeras)
│   │   ├── player.ts             # jugador: mov, salto, disparo, granada, melee
│   │   ├── enemies/
│   │   │   ├── soldier.ts        # raso — 85-90%
│   │   │   ├── shieldSoldier.ts  # escudo — 9%
│   │   │   └── tank.ts           # tanqueta — 1% inicial
│   │   ├── bullets.ts            # balas jugador + enemigas (pooled)
│   │   ├── grenades.ts           # parábola + AoE
│   │   ├── weapons/
│   │   │   ├── pistol.ts
│   │   │   ├── machinegun.ts
│   │   │   ├── shotgun.ts
│   │   │   └── rocket.ts
│   │   ├── drops.ts              # pickups de armas + granadas
│   │   └── platforms.ts          # obstáculos y rampas procedurales
│   │
│   ├── systems/                  # 🧮 LÓGICA DE JUEGO GLOBAL
│   │   ├── spawnSystem.ts        # escalado exponencial de oleadas
│   │   ├── dropSystem.ts         # probabilidad base + pity + modificadores
│   │   ├── collisionSystem.ts    # AABB simplificado, no físicas reales
│   │   ├── scoreSystem.ts        # X / 2X / 5X + high-score
│   │   ├── difficultyCurve.ts    # curva de escalado (tipo de enemigo, velocidad)
│   │   └── persistence.ts        # localStorage (username, highscore)
│   │
│   └── config/                   # ⚙️ Constantes balanceables
│       ├── balance.ts            # cadencias, daños, probabilidades, pity
│       └── colors.ts             # paleta global
│
├── RULES.md                      # reglas de la Jam
├── STACK.md                      # stack + manifiesto assets
├── GAME_DESIGN.md                # GDD estructurado
├── MEMORY.md                     # ← este archivo
├── BUILD_LOG.md                  # diario
├── PROMPTS.md                    # registro de prompts IA
├── SUBMISSION_CHECKLIST.md       # checklist de envío
├── ERROR_LOG.md                  # bugs críticos
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vercel.json                   # headers cache, rewrites
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
- 🚧 **Stand-by (Work in Progress):** Integración de Spritesheets PNG de alta fidelidad para Player (Diego) y entidades (a la espera de arte por parte del usuario).
- ⏸️ **Pendiente:** Efectos de sonido (Web Audio API) y menús/HUD finales.

---

**Última actualización:** 2026-04-15
