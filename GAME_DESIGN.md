# GAME_DESIGN.md — Infinity Vibe Slug

> Transcripción estructurada del `gdd.txt` original.
> Fuente de verdad para todo el diseño de juego, mecánicas y balance.

---

## 🎮 Identidad

- **Título provisional:** Infinity Vibe Slug
- **Género:** Run'n'Gun en scroll automático (modo survival)
- **Inspiración:** Metal Slug (NeoGeo) — rip-off declarado; **debe sentirse igual** (fluido y satisfactorio) y **parecerse** (estética pixel).
- **Diferencia clave vs. original:** modo survival infinito (sin niveles).
- **Objetivo del jugador:** aguantar oleadas infinitas de enemigos y hacer el máximo de puntos eliminándolos.

---

## 🎥 Cámara y escenario

- **Perspectiva:** 2D lateral (auto-scroll).
- **Suelo:** bajo, sin plataformas verticales pesadas (no es un platformer).
- **Fondo:** JPG cíclico / parallax procedural (preferimos **shader**).
- **Jugador:** spawnea en el extremo izquierdo, avanza automáticamente si no se hace nada.
- **Enemigos:** spawnean en el extremo derecho.

---

## 🧍 Jugador

- **Regla crítica:** **muere de un toque**.

### Mecánicas

| Mecánica | Detalle |
|----------|---------|
| **Disparo** | Semi-automático con cadencia fija. `J` para disparar. Durante un salto, si se aguanta `S`, el disparo es vertical hacia abajo. |
| **Melee automático** | Si el jugador dispara colisionando con un enemigo, el sprite hace **cuerpo a cuerpo** en lugar de disparar. |
| **Salto** | Altura ≈ **4.5× la altura del sprite**. `Space` para saltar. |
| **Movimiento** | `A`/`D` para horizontal. `S` para **agacharse** en suelo (hitbox reducida, velocidad 50%). |
| **Apuntado** | `W` para apuntar arriba (transición gradual). `S` en aire para apuntar abajo (instantáneo). |
| **Granada** | `K` para lanzar. Parabólica por defecto, recta hacia abajo si se apunta al suelo en salto. |
| **Pausa** | `ESC` congela completamente el juego para permitir descansos durante partidas largas. |

---

## 👾 Enemigos

### Consideraciones generales

- **No colisionan entre sí** (se aglomeran y atraviesan, igual que sus balas).
- **Retardo previo a cada acción** (animación de sorpresa, saca arma, apunta, etc.). Esto aporta personalidad al combate.
- **Movimiento pausado**: reaccionan al jugador, retroceden, no avanzan recto en línea.

### Tipos

#### 1. Soldado raso — **85–90%** del spawn
- Muere de **un toque**.
- Dispara ocasionalmente.
- **Salto Tactico**: Puede saltar a plataformas para perseguir al jugador tras un breve retardo (0.3s-0.7s).
- **Caída Inteligente**: Se deja caer de plataformas si el jugador está debajo.
- Ataque cuerpo a cuerpo en colisión tras breve retardo (margen de escape estrecho).
- **Puntos base:** `X`

#### 2. Soldado con escudo
- Igual que el raso **excepto**:
  - **Inmune a balas frontales** (vulnerable si le disparas desde arriba tras saltarlo).
  - **No salta a plataformas**: Se queda en el nivel donde spawneó.
  - **Edge Stopping**: Se detiene al llegar al borde de una plataforma o precipicio.
  - Dispara menos.
  - Más lento.
- Sirve para **proteger** a otros enemigos tras él (cuello de botella satisfactorio al eliminarlo).
- **Puntos base:** `2X`

#### 3. Tanqueta
- Tamaño grande, pero saltable por el jugador.
- **Mata en colisión instantánea.**
- Lenta.
- **No salta**: Su peso le impide subir a plataformas.
- **Edge Stopping**: Se detiene al llegar a un borde para evitar caer (compensando el auto-scroll de la pantalla).
- Aguanta **12 balas** o **3 explosiones**.
- Sus proyectiles rastrean y siguen las pendientes del terreno.
- **Puntos base:** `5X`

#### 4. Helicóptero
- Unidad aérea pesada.
- Lanza bombas verticales hacia abajo.
- **Paridad Vertical**: Sus bombas ignoran las plataformas horizontales hasta chocar con el mismo plano de altura exacto en el que se encuentra el jugador, evitando que el terreno actúe como escudo gratuito.
- **Puntos base:** `3X`

### Balas enemigas
- **Parpadean** en dos colores.
- **Más lentas** que las del jugador.

---

## 🔫 Power-ups (armas) y drops

### Reglas generales

- Los enemigos **dropean armas** que alteran el ataque del jugador.
- Las armas tienen **munición finita** — al agotarse, vuelta a la pistola.
- Si se coge un arma nueva teniendo otra: **se pierde** la anterior.
- Si se coge la misma arma: **se suma** la munición base a la actual.
- Factor estratégico: a veces conviene **evitar** un drop nuevo.

### Arsenal

| Arma | Cadencia | Balas | Propiedades |
|------|----------|-------|-------------|
| **Pistola** (base) | Semi-automática, cadencia fija | ∞ | Arma por defecto. |
| **Machinegun** | Alta, **automática** (mantener botón) | 200 | Hermana mayor de la pistola. |
| **Escopeta** | Más lenta que pistola, no automática | 50 | Daño en cono corto, **atraviesa todo** (incluido escudo). Tanqueta en 5–6 disparos. |
| **Rocket Launcher** | Velocidad de vuelo diferente a bala | 20 | Cohetes explosivos con AoE. Mismo daño que granada, más alcance. |

### Drops de granadas
- Pack de **5–10** granadas.
- Máximo que el jugador puede llevar: **30**.

---

## 🎲 Drop rates (probabilidad de aparición de armas)

> La IA debe llevar la batuta matemática aquí — el usuario confía en los cálculos.

### 1. Probabilidad base
- **Machinegun:** ≈ `1/150` por baja (0.667%) — economía cero neta de balas.
- **Escopeta:** ≈ `1/150` (ajustable).
- **Rocket Launcher:** ≈ `1/150` (más raro en práctica por pity).

### 2. Progressive Pity System
- Se ha implementado un sistema de **Pity dinámico** que aumenta la probabilidad base linealmente con cada baja sin drop.
- **Progressive Pity**: `p_final = (base + kills_since_last * pity_boost) * difficulty_mult`.
- **Hard Pity**: Al alcanzar las 25 bajas sin drop (`PITY_THRESHOLD`), el sistema garantiza un drop en la siguiente baja.

### 3. Modificadores dinámicos (Context-Aware)
El Director de Dificultad ajusta los pesos de aparición según el estado del jugador:
- **Baja Munición**: Incrementa drásticamente el peso de las armas frente a las granadas.
- **Weapon Holding**: Si el jugador ya tiene un arma especial, se incrementa el peso de las granadas para fomentar el uso de estas.
- **Alta Densidad de Enemigos**: Aumenta el peso de la **Escopeta** para facilitar el control de masas.
- **Presencia de Tanques**: Incrementa el peso del **Rocket Launcher** para ayudar con objetivos blindados.

### Nota de balance
> "El sistema ayuda de forma invisible pero orgánica, potenciando la fantasía de poder en momentos de caos y asegurando que el jugador nunca se quede sin recursos críticos si juega agresivamente."

---

## 🧱 Obstáculos y plataformas

- **No muchos** — no es un platformer.
- **No muy frecuentes** — el jugador no debería tocar tierra *nunca* del todo, pero tampoco vivir en plataformas.

### Patrones (Chunks Procedurales)

El sistema genera obstáculos en "chunks" ponderados que se desplazan con el scroll:

1. **Plataforma Simple**: Una superficie horizontal única a altura saltable.
2. **Escalera (Stairs)**: Secuencia de 3 plataformas escalonadas que permiten subir y bajar con fluidez.
3. **Enjambre (Swarm)**: 8-10 pequeñas plataformas aleatorias que requieren saltos encadenados (parkour).
4. **Colina (Hill)**: Elevación del terreno sólido con pendientes suaves (walkable).
5. **Valle (Valley)**: Depresión del terreno sólido; crea una zona de riesgo bajo.

### Reglas de Diseño
- **One-Way Platforms**: Las plataformas se pueden atravesar saltando desde abajo.
- **Smooth Slopes**: El terreno sólido nunca tiene bordes afilados que bloqueen el movimiento.
- **Spawn Awareness**: Los enemigos pueden spawnear sobre plataformas y colinas fuera de pantalla detectando las "Spawn Zones".
- **Combat Context Layer (Terrain Intent)**: Todo obstáculo emite una "Intención" táctica (`flat`, `vertical`, `choke_low`, `high_ground`, `chaotic`). Esto es recogido por el Director de Juego cada 0.25s para mutar la partida (ej. si hay un embudo, multiplica spawns de tanquetas e inyecta Rocket Launchers en los drops).

---

## 📈 Escalado de dificultad

> El juego es infinito → el jugador **DEBE** perder.

### 1. Difficulty Director (Fases de Intensidad)
El juego ya no escala de forma lineal, sino que utiliza un **Director de Dificultad** que alterna entre fases para crear picos de tensión:
- **Swarm Phase**: Alta densidad de soldados rasos.
- **Pressure Phase**: Aumenta la frecuencia de escudos y tanquetas.
- **Mixed Phase**: Combinación equilibrada de todos los tipos.
- **Fake Breather**: Breve periodo de calma aparente antes de una oleada masiva.

### 2. Performance Coupling (Pressure Score)
La dificultad reacciona al rendimiento del jugador mediante un **Pressure Score**:
- **Jugador Dominando** (Bajo Pressure): Aumenta drásticamente el spawn rate y reduce los drops para forzar errores.
- **Jugador Agobiado** (Alto Pressure): Reduce el spawn rate y aumenta la probabilidad de drops útiles para permitir reequilibrio.
- Factores de presión: Densidad de enemigos cercanos, falta de munición, tiempo sin drops y peligro reciente.

---

## 💀 Fin del juego

- Muerte de un toque → **pantalla de Game Over**:
  - Mostrar **puntuación**.
  - Opciones: **Retry**, **Salir**, **Registrar puntuación** (ver Leaderboard).
- **High-score** visible en el main menu (objetivo a superar).

---

## 🎨 Gráficos y Animación (Directivas Estéticas)

> *Inspirado en el estándar de la saga original.*

1. **Timing no uniforme:** Para generar impacto visual y sensación de peso, las animaciones no tendrán duraciones constantes por frame. Un salto, ataque o reacción tendrá una *anticipación lenta* y una *ejecución ultrarrápida*. Nuestro parseador de spritesheet debe soportar arrays de duraciones (ms) por frame.
2. **Reacciones al Daño (Hit Reactions):** Es crítico para el "game feel" que todo enemigo exprese daño visualmente. Se aplicará un ligero **Knockback** físico y un **Hit Flash** (parpadeo blanco/rojo mediante *ShaderMaterial* sobre el InstancedMesh) sin interrumpir la hitbox lógica subyacente.
3. **Partículas Discretas:** Los VFX (humo, fogonazos, explosiones y escombros) serán gestionados por un Object Pool de partículas. Cada una es un quad independiente con físicas básicas (`vx`, `vy`, gravedad) y ciclo de vida corto, pero animadas puramente con sprite sheets.
4. **Hitboxes Desacopladas:** La caja de colisión (AABB) está completamente disociada del asset visual. Se ajusta por estado (ej. al agacharse la caja se reduce a la mitad), pero siempre será más pequeña e indulgente que el tamaño en píxeles del PNG para favorecer la jugabilidad.
5. **Micro-animaciones Vivas:** Los *Idles* no deben ser estáticos, implementaremos respiraciones o *squash & stretch* constantes para emular el "cartoon militar".

---

## 🧩 Misceláneas

### 🕹️ Modo 2 jugadores (opcional)

- Ambos se **atraviesan** entre sí y entre sus balas.
- **Local co-op (2 jugadores, 1 teclado):**
  - **Jugador 1:** `AD` (move) + `Space` (jump) + `W` (up) + `S` (down) + `J` (fire) + `K` (grenade).
  - **Jugador 2:** `Flechas` + `NumPad 0` (jump) + `NumPad 1` (fire) + `NumPad 2` (grenade) + `NumPad 5/8` (up/down).
- No requiere retocar escalado (la cantidad de enemigos compensa).
- **Sí** requiere ajustar drop rates para 2P.

### 🏆 Leaderboard (opcional)

- Registrar puntuación con **3 letras** estilo arcade.

### 🎖️ Logros (opcional)

- Aguantar X minutos.
- X bajas con un arma.
- X bajas seguidas con granada.
- Etc.

---

## 🎵 Audio

- **Estilo:** 16 bits puro, rollete militar, directo a la nostalgia.
- **SFX requeridos (basados en el original):**
  - Salto
  - Caminar
  - Disparo (por arma)
  - Recoger arma
  - Recibir disparo (player)
  - Enemigo recibe impacto
  - Tanqueta explota
  - Granada explota
  - Muerte (player / enemigo)

---

## 📌 Resumen ejecutivo (TL;DR)

> **Run'n'Gun de scroll automático tipo Metal Slug, survival infinito.** El jugador muere de un toque, escala exponencialmente en dificultad, usa 4 armas (pistola + 3 drops) y granadas, enfrenta 3 tipos de enemigos con drop rates balanceados por pity system + modificadores dinámicos. Estética pixel 16-bit, SFX procedurales. Arcade puro.
