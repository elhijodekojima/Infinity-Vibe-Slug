# RULES.md — 2026 Cursor Vibe Coding Game Jam

> Reglas ESTRICTAS de la Jam. Cualquier incumplimiento = descalificación directa.
> Este archivo es la **fuente de verdad** — ante cualquier duda, se consulta aquí.

---

## 🚨 Reglas de Descalificación (NO negociables)

| # | Regla | Descripción | Estado |
|---|-------|-------------|--------|
| 1 | **NO loading screens** | El juego debe cargar **INSTANTÁNEAMENTE**. Cero barras de progreso, cero splash de "cargando assets". Tiempo objetivo: **< 1 segundo hasta jugable** en 3G. | 🔒 |
| 2 | **NO heavy downloads** | Bundle total agresivamente pequeño. Meta dura: **< 300 KB gzipped**. Prohibido: modelos 3D externos pesados, librerías infladas. **Excepción (Nueva):** Se permiten atlas de sprites 2D en baja resolución para maximizar la competitividad estética. | 🔒 |
| 3 | **NO login / NO signup** | Acceso libre. Máximo permitido: una pantalla instantánea pidiendo Username (sin validación de servidor). Nada de OAuth, email, registro. | 🔒 |
| 4 | **Accessible on web** | Debe jugarse directamente desde navegador moderno (Chrome/Firefox/Safari/Edge). Desktop y móvil viable. Despliegue en Vercel. | 🔒 |
| 5 | **90% IA-generated** | Mínimo 90% del código escrito por IA (Claude / Cursor). Documentar cada prompt en `PROMPTS.md`. | 🔒 |

---

## 📅 Deadline

- **Fecha límite:** **1 de mayo de 2026 — 13:37 UTC**
- **Hoy:** 2026-04-12 → **quedan ~19 días**.
- Congelación de features recomendada: **28 abril 2026** (solo bugfix y pulido los últimos 3 días).

---

## ✅ Criterios Positivos (lo que sí queremos)

- **Instant boot**: pantalla jugable en el primer frame útil.
- **Zero friction**: el jugador abre URL → juega en 1 click.
- **Mobile-friendly** (bonus): controles touch si el tiempo lo permite.
- **Vercel-optimized**: deploy estático, edge cache, headers correctos.
- **Procedural over imported**: shaders, geometrías primitivas, matemáticas > assets externos (A excepción de pixel-art 2D vistoso).

---

## ❌ Anti-patrones (prohibidos)

- ❌ `<Loading...>` screens de cualquier tipo.
- ❌ `import * as THREE from 'three'` completo → usar imports selectivos.
- ❌ Descarga lazy de assets críticos durante gameplay.
- ❌ Analytics / tracking / telemetría bloqueante.
- ❌ Registro, verificación email, captchas.
- ❌ Dependencias >100KB sin justificación arquitectónica.
- ❌ Modelos GLTF/FBX/OBJ externos para entidades principales.

---

## 🎯 Submission Requirements

- [ ] URL pública en Vercel funcional.
- [ ] Snippet HTML / embed iframe generado para pegar en el Google Form (**ver `SUBMISSION_CHECKLIST.md`**).
- [ ] Video de gameplay de 30–60s (bonus, no obligatorio).
- [ ] `index.html` auto-contenido sin recursos externos bloqueantes.

---

**Última actualización:** 2026-04-15
