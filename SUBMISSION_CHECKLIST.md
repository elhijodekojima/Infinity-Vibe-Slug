# SUBMISSION_CHECKLIST.md — Checklist de Envío

> Verificación final antes de pulsar "Submit" en el Google Form de la Vibe Jam 2026.
> Cada casilla debe estar **marcada y probada** antes del envío.

---

## 🚨 Criterios de Descalificación (hard-fail)

| ✓ | Criterio | Métrica objetivo | Cómo se verifica |
|---|----------|------------------|------------------|
| ☐ | **Tiempo de carga < 1s** | First Interactive < 1000 ms en red Fast 3G | Chrome DevTools → Performance → Throttling: Fast 3G → Lighthouse |
| ☐ | **Cero loading screens** | Ningún spinner / progress bar / "Loading..." visible | Inspección visual + review del código |
| ☐ | **Cero logins / signups** | Solo prompt de Username (localStorage) | Revisión de flujo de entrada |
| ☐ | **Jugable en navegador web** | Funciona en Chrome, Firefox, Safari, Edge (últimas versiones) | Test manual cross-browser |
| ☐ | **Desplegado en Vercel** | URL pública accesible | Acceso a la URL desde red externa |
| ☐ | **≥ 90% código IA-generated** | `PROMPTS.md` documenta todo lo generado | Auditoría manual de `PROMPTS.md` |
| ☐ | **Bundle total < 300 KB gzipped** | `dist/` auditado post-build | `vite build` + `gzip -9` del output |

---

## 🎯 Criterios Positivos (bonus / calidad)

| ✓ | Ítem | Notas |
|---|------|-------|
| ☐ | Controles responsivos (sin lag perceptible) | Target: 60 FPS estables |
| ☐ | SFX funcionales (disparo, explosión, muerte) | Web Audio API procedural |
| ☐ | High-score persistente en localStorage | Accesible desde main menu |
| ☐ | Game Over con opción de reintentar | Reset instantáneo (sin reload) |
| ☐ | Escalado de dificultad funcional | Spawn rate, tipos de enemigo, velocidad |
| ☐ | Drops de armas funcionales (3 armas) | Machinegun, Shotgun, Rocket |
| ☐ | HUD: score, armas, granadas, lives visibles | HTML/CSS sobre canvas |
| ☐ | Mobile-friendly (controles touch) | Bonus, no bloqueante |

---

## 📤 Pre-envío (pasos finales)

| ✓ | Paso |
|---|------|
| ☐ | `vite build` ejecutado sin errores ni warnings |
| ☐ | `dist/` desplegado a Vercel y URL probada |
| ☐ | Lighthouse ejecutado → Performance ≥ 95 |
| ☐ | Probado en incógnito (sin caché) desde red externa |
| ☐ | `BUILD_LOG.md` actualizado con hito final |
| ☐ | `ERROR_LOG.md` revisado — sin bugs críticos abiertos |
| ☐ | README del repo actualizado con URL final y stack |
| ☐ | **⚠️ OBLIGATORIO — Generar snippet de código HTML para el Google Form** (iframe/embed limpio listo para pegar) |

---

## ⚠️ Casilla obligatoria — Snippet del Google Form

> **Este paso es CRÍTICO.** La Vibe Jam exige pegar un snippet HTML (normalmente un `<iframe>` o embed) en el Google Form de inscripción. Sin esto, el envío no se considera válido.

- [ ] **Generar snippet de código HTML para el Google Form**
  - Ruta del script de extracción: `scripts/extract-embed-snippet.(ts|js)` (a crear en el PASO final del build).
  - Output esperado: bloque `<iframe src="https://<vercel-url>" width="..." height="..." frameborder="0" allowfullscreen></iframe>` ya formateado para copiar/pegar.
  - Verificación: el iframe debe renderizar el juego **sin fricción** en una página externa (test en un `.html` dummy).

---

**Deadline del envío:** 🗓️ **1 de mayo de 2026 — 13:37 UTC**
