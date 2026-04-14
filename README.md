# 🎮 Infinity Vibe Slug

**Infinity Vibe Slug** es un tributo arcade al legendario *Metal Slug*, diseñado como un **Run'n'Gun de desplazamiento lateral infinito**. El objetivo es simple pero desafiante: sobrevivir a oleadas interminables de enemigos, maximizar tu puntuación y sentir la fluidez y satisfacción del pixel-art clásico de NeoGeo.

---

## 🚀 Características Principales

- **Acción Frenética:** Scroll automático con cámara reactiva.
- **Difficulty Director:** Sistema inteligente de fases (`Pressure`, `Swarm`, `Mixed`) que adapta la intensidad según tu nivel de juego.
- **Drops Contextuales:** El sistema de botín analiza tu estado (munición, peligro) para entregarte el recurso exacto que necesitas.
- **Estética Neogeo:** Gráficos procedurales y animaciones fluidas generadas íntegramente en runtime.
- **Gameplay Pulido:** Salto variable, apuntado multidireccional y ataques aéreos.

---

## 🕹️ Controles

- **A / D**: Moverse a la izquierda / derecha.
- **W / S**: Apuntar arriba / agacharse (o apuntar abajo en el aire).
- **Space**: Saltar (mantener para mayor altura).
- **J**: Disparar (automático con Machinegun).
- **K**: Lanzar Granada.

---

## 👾 Mecánicas de Juego

### El Jugador
- **Muerte de un toque:** Un solo error y estás fuera.
- **Ataque Cuerpo a Cuerpo:** Si disparas cerca de un enemigo, realizarás un ataque con cuchillo automáticamente.
- **Granadas:** Empiezas con 10. Úsalas sabiamente para daño de área (AoE).

### Enemigos
1. **Soldado Raso:** El enemigo estándar. Pueden saltar y atacar cuerpo a cuerpo.
2. **Soldado con Escudo:** Inmunes a las balas frontales. Usa granadas o salta sobre ellos.
3. **Tanqueta:** Resistente y peligrosa. Dispara proyectiles pesados pero otorga grandes recompensas.

### Power-ups (Drops)
- **Machinegun (H):** Automática y rápida (200 balas).
- **Escopeta (S):** Gran daño en cono, atraviesa todo (50 balas).
- **Rocket Launcher (R):** Cohetes de largo alcance con daño explosivo (20 balas).

---

## 📈 Desarrollo (Roadmap)

- [x] Arquitectura Zero-Loading y Core Loop.
- [x] Sistema de Combate y Arsenal Completo.
- [x] Difficulty Director y Performance Coupling.
- [x] Mecánicas de Agachado y Apuntado vertical.
- [ ] Implementación de enemigos voladores (Heli-2).
- [ ] Efectos de sonido procedurales (Web Audio API).
- [ ] Leaderboard arcade (localStorage).

---

*Proyecto desarrollado para la VibeJam 26.*
