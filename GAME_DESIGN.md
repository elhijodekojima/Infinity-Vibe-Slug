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
| **Disparo** | Semi-automático con cadencia fija. Machacar el botón dispara rápido, pero **no por encima de la cadencia máxima** (ej: 2 disparos/s aunque haya 3 inputs). |
| **Melee automático** | Si el jugador dispara colisionando con un enemigo, el sprite hace **cuerpo a cuerpo** en lugar de disparar (ahorra munición). |
| **Salto** | Altura ≈ **3× la altura del sprite**. |
| **Movimiento** | Horizontal izquierda/derecha; el sprite **nunca rota** (siempre mira a la derecha). *Tricky*: el mundo se mueve hacia el jugador. |
| **Granada** | Stock inicial: **10**. Trayectoria parabólica, daño AoE, **más daño que una bala**. |
| **Agacharse** *(opcional)* | Esquivar balas / disparar hacia abajo en salto. Evaluar su encaje con el auto-scroll. |

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
- Puede saltar a plataformas.
- Ataque cuerpo a cuerpo en colisión tras breve retardo (margen de escape estrecho).
- **Puntos base:** `X`

#### 2. Soldado con escudo
- Igual que el raso **excepto**:
  - **Inmune a balas frontales** (vulnerable si le disparas desde arriba tras saltarlo).
  - **No** inmune a explosiones y melee.
  - No salta a plataformas.
  - Dispara menos.
  - Más lento.
- Sirve para **proteger** a otros enemigos tras él (cuello de botella satisfactorio al eliminarlo).
- **Puntos base:** `2X`

#### 3. Tanqueta
- Tamaño grande, pero saltable por el jugador.
- **Mata en colisión instantánea.**
- Lenta.
- Dispara una **bola que rueda por el suelo** (se "desparrama" del cañón).
- Aguanta **10–12 balas** o **3–4 explosiones**.
- Menos frecuente.
- **Puntos base:** `5X`

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

### 2. Pity System
- Estilo Hearthstone: garantizar un drop cada `X` bajas sin drop.
- **Thresholds propuestos:**
  - Machinegun: 300 bajas.
  - Escopeta: 150 bajas.
  - Rocket Launcher: 100 bajas.
- **A decidir:** pity **duro** (drop forzado) vs **dinámico** (rampa exponencial de probabilidad).

### 3. Modificadores dinámicos
- Densidad de enemigos en pantalla.
- Velocidad actual del juego.
- Presión de enemigos (cercanía al jugador).
- Peso probabilístico relativo: machinegun (más común) > escopeta > rocket (más raro).

### Nota de balance
> "El sistema debe permitir el dropeo más o menos frecuente sin ser generoso, ayudar cuando se deba y castigar al que desperdicie."

---

## 🧱 Obstáculos y plataformas

- **No muchos** — no es un platformer.
- **No muy frecuentes** — el jugador no debería tocar tierra *nunca* del todo, pero tampoco vivir en plataformas.

### Patrones

1. **Plataforma simple**: altura saltable. A veces encadenada con otra más alta (solo accesible desde la primera).
   - **Regla:** si hay una plataforma alta, debe haber **otra baja a continuación** para que los soldados rasos también puedan subir (cuello de botella para el jugador).
2. **Rampa doble con descansillo**: forma cuellos de botella (se acumulan enemigos detrás).
3. **Valle** (rampa baja y luego sube): inverso del anterior.

---

## 📈 Escalado de dificultad

> El juego es infinito → el jugador **DEBE** perder.

### Factores (por importancia)

1. **Cantidad de enemigos (el más importante)**
   - Escalado **exponencial e infinito**.
   - Comienzo: spawns muy lentos.

2. **Calidad de enemigos**
   - Probabilidades base iniciales: **90% raso / 9% escudo / 1% tanqueta**.
   - Cap final: **70% raso / 20% escudo / 10% tanqueta**.
   - Deslizamiento paulatino.

3. **Velocidad del juego**
   - No característica del Metal Slug original.
   - Aumento muy lento hasta un cap que no sature pero se note.

---

## 💀 Fin del juego

- Muerte de un toque → **pantalla de Game Over**:
  - Mostrar **puntuación**.
  - Opciones: **Retry**, **Salir**, **Registrar puntuación** (ver Leaderboard).
- **High-score** visible en el main menu (objetivo a superar).

---

## 🎨 Misceláneas

### 🕹️ Modo 2 jugadores (opcional)

- Ambos se **atraviesan** entre sí y entre sus balas.
- **Local co-op (2 jugadores, 1 teclado):**
  - **Jugador 1:** `WASD` (mov/salto/crouch) + `Space` (disparo) + `E` (granada).
  - **Jugador 2:** `Flechas` + `NumPad 0` (disparo) + `NumPad .` (granada).
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
