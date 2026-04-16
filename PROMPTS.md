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

### [2026-04-16] — P08 · Sistema de animación layered (legs + torso) para el Player
**Objetivo:** Diseñar e implementar un sistema modular de animación por capas para el personaje principal que evite la explosión combinatoria de sheets full-body (N×M → N+M). Dos capas independientes (`legs` para movimiento, `torso` para acciones) con state machines separadas y un Group de Three.js que las superpone. Solo aplica al Player; enemigos siguen con sheets tradicionales.
**Modelo:** Claude Opus 4.6 (1M context)
**Archivo(s) afectado(s):**
- Rewrite: `src/gfx/playerSprite.ts` (`LegsAnim`/`TorsoAnim` unions + `LEGS_DEFS`/`TORSO_DEFS` records + `getLegsAnim`/`getTorsoAnim` API + legacy fallback).
- Rewrite: `src/entities/player.ts` (`Group` + `legsMesh` + `torsoMesh` + dual state machines + `selectLegsAnim`/`selectTorsoAnim` + hooks `triggerShootAnim`/`triggerMeleeAnim`/`triggerThrowAnim`).
- Modified: `src/config/balance.ts` (+`PLAYER.TORSO_CROUCH_Y_OFFSET`).
- Docs: `public/assets/README.md` (layout + reglas de autoría layered), `MEMORY.md` (+AD-044, +AD-045, PASO 12 en estado actual, sección "cómo añadir animación" reescrita para 2 capas), `BUILD_LOG.md` (entry 2026-04-16).

**Prompt:**
> Necesito que diseñes e implementes un sistema de animación para el personaje principal de un videojuego 2D tipo run'n'gun inspirado en Metal Slug, con un enfoque modular por capas. [...] separación del personaje en al menos dos partes independientes: parte inferior del cuerpo (piernas) y parte superior (torso y brazos). [...] Aplicar exclusivamente al personaje principal.

**Resultado:** ✅ merged (`tsc --noEmit` limpio).
**Notas:**
- **Cero cambios de comportamiento observables** respecto al estado previo: fallback legacy mantiene el player visible con el `player_idle.png` existente hasta que se drops sheets layered. Typecheck + render visual confirman.
- 10 sheets totales vs 24 de la aproximación combinatoria. 4 × legs + 6 × torso vs 4 × 6.
- Canvas 20×32 full-body con padding transparente → alineación automática (sin anchor math). Convención crítica para el artista: **feet fijos en legs, waist fija en torso**.
- Crouch sync: UNA constante (`TORSO_CROUCH_Y_OFFSET = -8`) cubre crouch+idle, crouch+shoot, crouch+aimUp, crouch+melee, etc. Eliminé el problema del "crouch torso combinatorial" con un shift Y.
- Hooks `trigger*Anim(dur)` desacoplan el "qué pasó" (main.ts sabe cuando dispara un arma) del "cómo animar" (player.ts decide el frame).
- Backward-compat: `player.mesh` ahora es un `Group` en lugar de un `Mesh`. `scene.add(player.mesh)` sigue funcionando (Group es un Object3D). Main.ts no requiere cambios.

---

### [2026-04-15] — P07 · Cleanup session: type safety, animation registry, collision helpers, docs
**Objetivo:** Limpiar el código sin cambiar comportamiento antes de continuar añadiendo animaciones. 4 fases ejecutadas en orden: (1) eliminar `any` en fronteras de módulo, (2) registry de animaciones extensible en `playerSprite.ts` + state machine en `player.ts`, (3) extraer helpers de colisión en `main.ts` para deduplicar las 4 variantes (bullet/rocket × ground/helicopter), (4) consolidación documental.
**Modelo:** Claude Opus 4.6 (1M context)
**Archivo(s) afectado(s):**
- Types (Fase 1): `src/entities/player.ts`, `src/entities/enemies/enemyPool.ts`, `src/systems/spawnSystem.ts` (rewrite limpio con tipos formales + eliminación de `lerp` dead code).
- Animation registry (Fase 2): `src/gfx/playerSprite.ts` (rewrite completo con `PlayerAnim` union + `DEFS` record + fallback cascada), `src/entities/player.ts` (state machine `selectAnim()` + `triggerShootAnim()` hook).
- Collision helpers (Fase 3): `src/main.ts` (5 funciones nuevas extraídas: `bulletVsGroundPool`, `bulletVsHelicopters`, `rocketVsGroundPool`, `rocketVsHelicopters`, `detonateRocket`; 2 AABBs reutilizables nuevas: `heliBox`, `enemyBulletBox`).
- Docs (Fase 4): `MEMORY.md` (+185 líneas: 6 ADs nuevos, file tree actualizado, guía "Cómo añadir una animación"), `BUILD_LOG.md` (+74 entrada), `PROMPTS.md` (este registro).

**Prompt:**
> vale procede con las 4 fases en orden

**Resultado:** ✅ merged (`tsc --noEmit` limpio tras cada fase).
**Notas:**
- **Cero cambios de comportamiento observables** en gameplay. El refactor es isomorfo.
- TypeScript atrapó un bug durante Fase 3 (`RocketData` vs `BulletData` structural mismatch) antes de llegar a runtime. Fix: importar `type RocketData` y helpers específicos que no leen los campos de bala.
- La Fase 2 introduce `player.triggerShootAnim(dur)` como hook público para cuando main.ts lo conecte al fire event del arma. Hasta entonces, el estado 'shoot' no se activa pero el registry ya lo espera con fallback a 'idle'.
- La Fase 3 no redujo LOC de `main.ts` (+29 netos), pero reorganiza la lógica en helpers nombrados: añadir una 5ª arma/enemigo ahora es 1 función, no 50 líneas de copy-paste.

---

### [2026-04-15] — P06 · Player idle sprite integration + PNG optimization pipeline
**Objetivo:** Conectar el PNG del sprite idle (6 frames, horizontal strip) al juego, arreglar el bug de UV donde `tex.repeat` y `map.offset` usaban divisores distintos, y establecer un pipeline reproducible de optimización PNG con pngquant.
**Modelo:** Claude Opus 4.6 (1M context)
**Archivo(s) afectado(s):**
- Rewrite: `src/gfx/playerSprite.ts` (API `getPlayerTexture()` + `preloadPlayerSprite()`, constantes `PLAYER_IDLE_FRAMES`/`PLAYER_IDLE_FPS`).
- Edit: `src/entities/player.ts` (eliminar `tex.repeat.set(1/17, 1)` bug, usar constantes compartidas, hide-until-loaded).
- Nuevo: `scripts/optimize-sprites.mjs` (batch pngquant idempotente).
- Nuevo: `public/assets/README.md` (convención de sprites + comando de build).
- Edit: `package.json` (+`pngquant-bin` devDep, +`optimize:sprites` script).
- Asset: `public/assets/sprites/player/player_idle.png` optimizado 232 KB → 68 KB (-70.9%).

**Prompt:**
> Optimizalo y añadelo que quiero probarlo in game y despues seguimos con las demas animaciones, actualiza tambien los .md necesarios.

**Resultado:** ✅ merged (`tsc --noEmit` limpio, script `optimize:sprites` verificado idempotente).
**Notas:**
- Bug raíz: el constructor de Player hacía `tex.repeat.set(1/17, 1)` (comentario mencionaba un sheet consolidado futuro de 17 frames) pero `syncMesh()` calculaba offsets como `frame * (1/6)`. Divisor incorrecto → recortes de frame desfasados. Regla nueva en AD-037: UV config SOLO en el módulo del sprite.
- Fail-open en preload: si el PNG da 404, el mesh se muestra igual con log de error en vez de quedarse invisible para siempre.
- Pngquant exit codes 98 (no quality improvement) y 99 (skip-if-larger matched) tratados como "skip, no failure" — hace el script idempotente.
- Performance check: 68 KB de PNG es el asset más pesado del proyecto; presupuesto total de la Jam ~300 KB gzipped, hay margen para ~3-4 animaciones más del player + sprites de enemigos antes de saturar.

---

### [2026-04-12] — P05 · Enemy pool genérico (soldier / shield / tank) + type distribution deslizante
**Objetivo:** Reemplazar el `SoldierPool` específico por un `EnemyPool` config-driven que soporta los 3 tipos del GDD (raso, escudo, tanqueta) con stats distintos. Añadir HP/damage para la tanqueta, `blocksFrontalBullets` para el escudo, y distribución de tipos que desliza de 90/9/1 a 70/20/10 sobre 180 s.
**Modelo:** Claude Opus 4.6 (1M context)
**Archivo(s) afectado(s):**
- Nuevo: `src/entities/enemies/enemyPool.ts` (reemplaza `soldier.ts`)
- Eliminado: `src/entities/enemies/soldier.ts`
- Modificados: `src/config/balance.ts` (+SHIELD, +TANK, +BULLET_DAMAGE, +EXPLOSION_DAMAGE, +SPAWN.TYPE_*, -SCORE.SOLDIER), `src/systems/spawnSystem.ts` (3 pools + pickPool weighted), `src/main.ts` (3 configs + enemyPools array + colisión genérica sobre los 3 pools + resetAllPools helper)

**Prompt:**
> Me gusta el orden que me has presentado.

**Resultado:** ✅ merged (`tsc --noEmit` limpio)
**Notas:**
- Una clase, 3 instancias, config inyectada. El comportamiento (walk + hesitate) es el mismo para los 3; solo los parámetros difieren.
- `damageAt(i, amount)` unifica kill instantáneo y multi-hit. Soldiers/shields HP=1, tank HP=12, explosiones daño 4 → tanqueta muere en 3 grenades, exactamente como pide el GDD.
- Shield inmunidad frontal: la bala se consume (`killAt(bi)`) pero **no** se llama `damageAt`. El flag vive en config, la lógica en `main.ts`.
- `enemyPools: readonly EnemyPool[] = [soldiers, shields, tanks]` habilita las 3 pasadas de colisión con un solo `for-of`. Score se atribuye por `pool.config.score` → cliente no conoce puntuaciones hardcodeadas.
- Selección de tipo en spawn: `lerp(START, CAP, elapsed/RAMP_TIME)` sobre `p_soldier` y `p_shield`, p_tank implícito. Random uniforme, acumulado.

---

### [2026-04-12] — P04 · Git identity local + sprite procedural player + granadas AoE
**Objetivo:** 3 tareas en una sesión: (1) configurar identidad git per-repo a `elhijodekojima` sin tocar el global, (2) sprite procedural pixel-art del player (Camino B, sin PNG externo), (3) mecánica de granadas parabólicas con explosión AoE.
**Modelo:** Claude Opus 4.6 (1M context)
**Archivo(s) afectado(s):**
- Nuevos: `src/gfx/pixelGen.ts`, `src/gfx/playerSprite.ts`, `src/entities/grenades.ts`, `src/entities/explosions.ts`
- Modificados: `src/config/balance.ts` (+PLAYER.SPRITE_W/H, +GRENADE, +EXPLOSION), `src/config/colors.ts` (+GRENADE, +EXPLOSION), `src/entities/player.ts` (uso de `getPlayerTexture()` + geometría SPRITE_W×SPRITE_H), `src/main.ts` (wire grenades+explosions+AoE damage), `.gitignore` (+`.claude/`)
- Infra: commit `d4ee74e` firmado como elhijodekojima, config local con `credential.username` hint a GCM.

**Prompt:**
> No hemos creado el token todavia, no hagas push y en cuanto al sprite nos gusta mas el camino B y continua con el siguiente hito de gameplay, por ejemplo implementa las granadas.

**Resultado:** ✅ merged (`tsc --noEmit` limpio)
**Notas:**
- Git identity solo cambia local config, global intact. Push queda pendiente (GCM cachea `RuFFuS4`, usuario resolverá con PAT).
- Sprite helper `makePixelTexture()` genérico y reutilizable para enemigos futuros. Autoría en string arrays con palette lookup, transparent chars (`.`, ` `), auto-pad para rows cortas.
- Player sprite 20×32 hand-authored: gorra olive + accent yellow, barba, 3 tonos de verde, fusil metal gray. Collision box 14×28 sigue más pequeña (AD-017).
- Granadas: arco documentado en balance.ts con cálculos específicos (apex 36u, landing 94u, vuelo 0.78s).
- Explosion pool separa visual de daño (AD-018) — el daño es instantáneo en `applyExplosionDamage()`, la animación half-sine dura 0.35s aparte.
- Callback `onExplode` preferido sobre array out-param (AD-019) — zero alloc, código más lineal.

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
