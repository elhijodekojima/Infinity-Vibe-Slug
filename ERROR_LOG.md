# ERROR_LOG.md — Registro de Bugs Críticos

> Documentación de bugs bloqueantes, regresiones importantes y post-mortems rápidos.
> **No para TODOs** — eso va en `BUILD_LOG.md`. Aquí solo lo que rompe el juego o compromete la submission.

---

## Formato de entrada

```
### [YYYY-MM-DD] BUG-### — <Título>

**Severidad:** 🔴 crítico / 🟠 alto / 🟡 medio
**Estado:** 🐞 abierto / 🔧 en progreso / ✅ resuelto
**Descubierto por:** <humano / IA / testing>
**Versión / commit:** <sha o tag>

#### Descripción
<qué pasa>

#### Pasos para reproducir
1. ...
2. ...

#### Impacto
<cómo afecta a la jugabilidad o a las reglas de la Jam>

#### Causa raíz
<análisis>

#### Fix
<commit sha, cambios aplicados>

#### Prevención
<test, assertion, regla en CI para que no vuelva>
```

---

## 📋 Registro

<!-- Vacío al inicio. Registrar bugs críticos a partir del PASO 3. -->
