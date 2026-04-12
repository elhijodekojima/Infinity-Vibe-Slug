# STACK.md — Infinity Vibe Slug

> Stack técnico y manifiesto de assets. Optimizado a muerte para cumplir la regla **Zero-Loading**.

---

## 🧱 Stack principal

| Capa | Tecnología | Motivo |
|------|-----------|--------|
| **Build tool** | **Vite** | HMR instantáneo, tree-shaking agresivo, bundles ES2020+ mínimos, soporte nativo TS. |
| **Lenguaje** | **TypeScript (strict mode)** | Seguridad de tipos para colisiones, pools de entidades, shaders, sistema de drops. |
| **Render** | **Three.js (imports selectivos)** | Scene + Camera ortográfica + Mesh + ShaderMaterial. **Nunca** `import * as THREE`. |
| **Estado** | **Plain TS modules + singletons** | Sin Redux/Zustand. Game state como módulos explícitos. |
| **UI HUD** | **HTML + CSS puro** (no React) | DOM ligero superpuesto al `<canvas>`. Zero framework overhead. |
| **Audio** | **Web Audio API directa** | Osciladores + envolventes para SFX 16-bit procedurales. Cero archivos `.mp3`/`.wav` externos si es viable. |
| **Persistencia** | **localStorage** | High-score, username. Sin backend. |
| **Deploy** | **Vercel (static)** | `vercel.json` con headers cache agresivos, edge delivery. |

---

## 📦 Dependencias permitidas (whitelist)

```
three         (import selectivo: Scene, OrthographicCamera, WebGLRenderer, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3, Clock)
vite          (dev only)
typescript    (dev only)
```

**Cualquier dependencia adicional requiere justificación escrita en `BUILD_LOG.md`.**

---

## 🎨 MANIFIESTO DE ASSETS — "Procedural over Imported"

> Esta es la **regla de oro** para evitar descalificación por pesadez de descarga.

### ✅ Priorizamos (en este orden):

1. **Geometrías primitivas** — `PlaneGeometry`, `BoxGeometry`, `InstancedMesh` para multitudes de enemigos.
2. **Shaders GLSL** — para pixel-art look, scrolling parallax, explosiones, distorsiones CRT, gradientes.
3. **Matemáticas procedurales** — ruido (hash), curvas Bezier, easings para animaciones.
4. **Canvas 2D offscreen** — generar sprites pixel-art en tiempo de carga (dentro del primer frame) desde código (patrones de píxeles en arrays) y subirlos a textura WebGL.
5. **Audio sintetizado** — Web Audio API (osciladores square/noise) para SFX estilo NeoGeo.

### ❌ Prohibido (salvo justificación en `BUILD_LOG.md`):

- Modelos 3D externos (`.glb`, `.gltf`, `.fbx`, `.obj`).
- Sprite atlases PNG/JPG pesados (>20 KB).
- Archivos de audio externos (`.mp3`, `.ogg`) salvo que se demuestre <30 KB total.
- Fuentes web (`@font-face`) — usar **system fonts** o shader de bitmap font procedural.
- CDN runtime loads (jQuery, Bootstrap, etc.).

### 📏 Presupuesto de bundle (hard cap)

| Recurso | Límite |
|---------|--------|
| `index.html` | < 3 KB |
| JS + TS bundle (gzipped) | **< 150 KB** |
| Texturas (si las hubiera) | < 50 KB totales |
| Audio (si existe) | < 50 KB totales |
| **TOTAL PRIMER PAINT** | **< 300 KB gzipped** |

---

## 🏗️ Arquitectura de alto nivel

```
┌─────────────────────────────────────────────┐
│  index.html  (3 KB — UI instantánea)        │
│  ┌─────────────┐   ┌──────────────────┐    │
│  │ HTML/CSS UI │   │ <canvas> Three.js │    │
│  │ (HUD/Menu)  │   │  (game render)    │    │
│  └─────────────┘   └──────────────────┘    │
└─────────────────────────────────────────────┘
          │                    │
          └─── main.ts ────────┘
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
  core/     entities/    systems/
 (engine)   (player,     (spawn,
            enemies,      drops,
            grenades)     scoring)
```

Estructura de carpetas detallada: ver **`MEMORY.md` → Decisiones Arquitectónicas**.

---

**Última actualización:** 2026-04-12
