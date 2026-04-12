# PROMPTS.md — Registro de Prompts IA

> Registro cronológico de los prompts utilizados para generar código, shaders, balance y assets procedurales.
> **Regla de la Jam:** ≥ 90% del código debe ser IA-generated. Este archivo es la prueba.

---

## Formato de entrada

```
### [YYYY-MM-DD HH:MM] — <Título corto>
**Objetivo:** <qué se busca>
**Modelo:** <Claude Opus 4.6 | Sonnet | Cursor | etc.>
**Archivo(s) afectado(s):** <rutas>
**Prompt:**
> <texto del prompt>
**Resultado:** <✅ merged / 🔄 iterado / ❌ descartado>
**Notas:** <ajustes posteriores, bugs detectados>
```

---

## Registro

### [2026-04-12] — P01 · Sistema de archivos de gestión + arquitectura Zero-Loading
**Objetivo:** Asimilar el `gdd.txt`, crear los 8 archivos de gestión (RULES, STACK, PROMPTS, BUILD_LOG, SUBMISSION_CHECKLIST, GAME_DESIGN, MEMORY, ERROR_LOG) y proponer la estructura de carpetas de la arquitectura Zero-Loading.
**Modelo:** Claude Opus 4.6 (1M context)
**Archivo(s) afectado(s):** `RULES.md`, `STACK.md`, `PROMPTS.md`, `BUILD_LOG.md`, `SUBMISSION_CHECKLIST.md`, `GAME_DESIGN.md`, `MEMORY.md`, `ERROR_LOG.md`
**Prompt:**
> Actúa como Lead Game Developer [...] crea los 8 archivos de gestión en la raíz [...] propón una estructura de carpetas en MEMORY.md que separe lógica de inicio rápido, motor y entidades.
**Resultado:** ✅ merged
**Notas:** Casilla obligatoria "Generar snippet de código HTML para el Google Form" añadida en `SUBMISSION_CHECKLIST.md` y como directiva de build en `MEMORY.md`.

---

### [2026-04-12] — P03 · Combate básico: soldado raso + pistola + spawn exponencial
**Objetivo:** Primer loop de combate jugable: enemigos con personalidad (hesitación), pistola con cadencia-cap, colisiones AABB bala-enemigo y player-enemigo, game over funcional.
**Modelo:** Claude Opus 4.6 (1M context)
**Archivo(s) afectado(s):**
- Nuevos: `src/systems/collisions.ts`, `src/systems/spawnSystem.ts`, `src/entities/bullets.ts`, `src/entities/enemies/soldier.ts`, `src/entities/weapons/pistol.ts`
- Modificados: `src/config/balance.ts` (+ENEMY/BULLET/WEAPON/SPAWN/SCORE), `src/config/colors.ts` (+4 colores), `src/entities/player.ts` (getters `x/y/aabb/muzzleX/muzzleY`, fix TS2322), `src/main.ts` (rewire completo con colisiones y game over)

**Prompt:**
> Ya hemos visto que funciona y sale la pantalla de Insert Coin, sigue con el siguiente hito.

**Resultado:** ✅ merged (`tsc --noEmit` limpio)
**Notas:**
- Pools con `InstancedMesh` + data array paralelo (AD-012). Un draw call por tipo, pack-on-sync de slots activos.
- Curva de spawn exponencial tabulada en `balance.ts` con valores concretos a t=0/60s/120s/180s/240s.
- Pistola semi-auto con cooldown 0.5s: inputs durante cooldown se consumen silenciosamente (feel arcade).
- Hesitación del soldado raso: `thinkTimer` + `hesitatingFor` con 35% de chance de pausa 0.25-0.8s por tick — cumple la directiva del GDD de "movimiento pausado, no cargan en línea recta".
- `endGame()` guardada con early-return para ser idempotente ante múltiples colisiones en el mismo frame.
- Bug TS2322 encontrado con `npx tsc --noEmit`: `private _x = PLAYER.START_X` con `as const` infería literal `80`. Fix: anotación explícita `: number`.

---

### [2026-04-12] — P02 · Scaffolding Zero-Loading (Vite + TS + Three.js)
**Objetivo:** Crear el esqueleto mínimo jugable con HUD visible en primer frame, canvas pintando con fondo procedural y player placeholder que responde a WASD + jump. **Sin enemigos ni drops todavía.**
**Modelo:** Claude Opus 4.6 (1M context)
**Archivo(s) afectado(s):**
- Config: `package.json`, `tsconfig.json`, `vite.config.ts`, `vercel.json`, `.gitignore`
- Entry: `index.html`, `src/main.ts`
- Core: `src/core/{renderer,loop,input,clock,persistence}.ts`
- UI: `src/ui/{menu,hud,gameover}.ts`
- Gfx: `src/gfx/background.ts`
- Entities: `src/entities/player.ts`
- Config: `src/config/{balance,colors}.ts`

**Prompt:**
> Adelante — arranca con el esqueleto mínimo jugable (canvas pintando y HUD visible en el primer frame) sin tocar aún lógica de enemigos ni drops.

**Resultado:** ✅ merged
**Notas:**
- Critical CSS inline en `index.html` → primer paint antes de que TS compile.
- Imports selectivos de Three (Scene, OrthographicCamera, WebGLRenderer, Mesh, PlaneGeometry, ShaderMaterial, MeshBasicMaterial, Color, Vector3) — cero `import * as THREE`.
- Shader del fondo 100% procedural (hash noise) — **ningún asset externo**.
- Fixed-step 60 Hz + rAF render con clamp anti spiral-of-death.
- `window.__game` expuesto en DEV para pruebas manuales del game-over.

---
