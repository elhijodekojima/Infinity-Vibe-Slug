# public/assets/ — Conventions for external sprites

Files under `public/` are served **as-is** at the site root by Vite and Vercel.
That means `public/assets/sprites/player/player_idle.png` is fetched from
`/assets/sprites/player/player_idle.png` at runtime, with no hashing and no
bundler processing.

## Folder layout

```
public/assets/
├── README.md                         ← this file
└── sprites/
    ├── player/                       ← THREE-LAYER system (legs + torso + weapon)
    │   │
    │   ├── player_idle.png           ← legacy fallback (full body, 6 frames)
    │   │                               Kept while layered sheets are being authored.
    │   │                               Ignored once the layered set is complete.
    │   │
    │   ├── LEGS LAYER ─ movement animations ─────────────────────
    │   ├── player_legs_idle.png
    │   ├── player_legs_run.png
    │   ├── player_legs_jump.png
    │   ├── player_legs_crouch.png
    │   │
    │   ├── TORSO LAYER ─ body + head + arms, NO weapon ──────────
    │   ├── player_torso_idle.png             (action=idle,  orient=neutral)
    │   ├── player_torso_idle_up.png          (action=idle,  orient=up)
    │   ├── player_torso_idle_down.png        (action=idle,  orient=down)
    │   ├── player_torso_shoot.png            (action=shoot, orient=neutral)
    │   ├── player_torso_shoot_up.png         (action=shoot, orient=up)
    │   ├── player_torso_shoot_down.png       (action=shoot, orient=down)
    │   ├── player_torso_melee.png            (action=melee — neutral only)
    │   ├── player_torso_throw.png            (action=throw — neutral only)
    │   │
    │   └── WEAPON LAYER ─ weapon only ────────────────────────────
    │       ├── player_weapon_pistol_neutral.png
    │       ├── player_weapon_pistol_up.png
    │       ├── player_weapon_pistol_down.png
    │       ├── player_weapon_machinegun_neutral.png
    │       ├── player_weapon_machinegun_up.png
    │       ├── player_weapon_machinegun_down.png
    │       ├── player_weapon_shotgun_neutral.png
    │       ├── player_weapon_shotgun_up.png
    │       ├── player_weapon_shotgun_down.png
    │       ├── player_weapon_rocket_neutral.png
    │       ├── player_weapon_rocket_up.png
    │       └── player_weapon_rocket_down.png
    │
    ├── enemies/              ← SINGLE-sheet system (full-body per animation)
    │   ├── soldier_walk.png
    │   ├── shield_walk.png
    │   └── tank_crawl.png
    ├── items/
    │   └── grenade.png
    └── ui/
```

## The three-layer player system (only the main character)

Full rationale in `MEMORY.md` (AD-044, AD-046, AD-047). Summary:

- Combinatorial explosion of full-body sheets (movement × action × aim ×
  weapon) is avoided by running **three independent layers**, each on a
  20×32 quad at the exact same world position.
- Torso has a **two-dimensional state**: `(action, orientation)`. Action
  = idle/shoot/melee/throw. Orientation = neutral/up/down. The registry
  is sparse: define only the cells that have distinct art, the rest
  fall back via cascade.
- Weapon is an **independent layer**. Same torso art works for every
  weapon; swapping weapons swaps only the weapon sheet.
- All three layers share the SAME 20×32 canvas. Alignment is achieved
  by drawing each layer's pixels at a consistent anchor (feet / waist /
  hand grip). No anchor math in code — the artist's grid is the contract.

### Layer responsibilities

| Layer  | Drives                   | States                                          |
|--------|--------------------------|-------------------------------------------------|
| legs   | physics / movement       | `idle`, `run`, `jump`, `crouch`                 |
| torso  | body + head + arms       | `(action, orientation)` — see above             |
| weapon | weapon asset             | `(weaponType, orientation)` — single-frame each |

### Fallback cascade (makes migration incremental)

Missing sheets never crash the game — each layer cascades gracefully:

| Layer  | Cascade                                                                    |
|--------|----------------------------------------------------------------------------|
| legs   | requested → `legs.idle` → legacy full-body → empty slot                    |
| torso  | `action_orient` → `action_neutral` → `idle_neutral` → legacy full-body     |
| weapon | `type_orient` → `type_neutral` → **null** (weapon mesh hidden)             |

When the torso is using the legacy fallback (because no `torso_*` sheet
has loaded yet), the weapon mesh is **suppressed automatically** — the
legacy sheet already has a weapon drawn on it, so adding the weapon
layer would render two weapons on top of each other.

---

## 🛒 Complete sprite shopping list

All sheets **must be 20 × 32 per frame** (the full character bounding
box), horizontal strip for multi-frame. Rows with pixels belong to the
layer's region; everything else is transparent.

### LEGS LAYER — 4 sheets

| File | Frames | FPS | Loop | Notes |
|---|---|---|---|---|
| `player_legs_idle.png` | 6 | 8 | yes | Breathing micro-animation on the lower body |
| `player_legs_run.png` | 8 | 12 | yes | Full run cycle |
| `player_legs_jump.png` | 1 | – | – | In-air leg pose (knees tucked) |
| `player_legs_crouch.png` | 1 | – | – | Folded legs pose — `TORSO_CROUCH_Y_OFFSET` shifts the torso down |

Anchor: **feet at row 29–30** of the 32-tall canvas. Never move them across frames or the character will jitter.

### TORSO LAYER — 8 sheets (action × orientation, sparse)

| File | Frames | FPS | Loop | Action / orientation |
|---|---|---|---|---|
| `player_torso_idle.png` | 4 | 6 | yes | idle × neutral — breathing torso |
| `player_torso_idle_up.png` | 1 | – | – | idle × up — aimed upward at rest |
| `player_torso_idle_down.png` | 1 | – | – | idle × down — aimed downward (air only) |
| `player_torso_shoot.png` | 4 | 16 | no | shoot × neutral — fire recoil |
| `player_torso_shoot_up.png` | 4 | 16 | no | shoot × up — fire while aimed up |
| `player_torso_shoot_down.png` | 4 | 16 | no | shoot × down — fire while aimed down |
| `player_torso_melee.png` | 3 | 16 | no | Knife swing (neutral only) |
| `player_torso_throw.png` | 3 | 12 | no | Overhand grenade throw (neutral only) |

Anchor: **waist at row 13–14**. The torso quad is the SAME size as the
legs quad (20 × 32); only the top half has pixels. The waist line must
match the `legs_*` sheets' hip line exactly. Draw head + shoulders +
arms INCLUDING the hand where the weapon will attach — but **do NOT
draw the weapon itself**. That's the weapon layer's job.

### WEAPON LAYER — 12 sheets (4 weapons × 3 orientations)

All single-frame static sheets (no per-weapon animation for now):

| Weapon | neutral | up | down |
|---|---|---|---|
| pistol | `player_weapon_pistol_neutral.png` | `player_weapon_pistol_up.png` | `player_weapon_pistol_down.png` |
| machinegun | `player_weapon_machinegun_neutral.png` | `player_weapon_machinegun_up.png` | `player_weapon_machinegun_down.png` |
| shotgun | `player_weapon_shotgun_neutral.png` | `player_weapon_shotgun_up.png` | `player_weapon_shotgun_down.png` |
| rocket | `player_weapon_rocket_neutral.png` | `player_weapon_rocket_up.png` | `player_weapon_rocket_down.png` |

Anchor: the **weapon grip** is painted at the exact (x, y) pixel where
the character's hand is on the corresponding `player_torso_<action>_<orientation>.png`
sheet. The weapon mesh is the SAME 20 × 32 quad at the SAME world
position as the torso — pixel-perfect alignment is achieved by painting
at the correct coordinates, not by code transforms.

### Grand total: **24 layered sheets** (+ 1 legacy full-body to keep)

Compared to the combinatorial alternative (4 legs × 4 actions × 3 orientations × 4 weapons = 192 sheets), this is a ~**8× reduction** in artwork cost.

---

## 🎯 Authoring priority (what to draw first for fastest validation)

1. **`player_legs_idle.png`** + **`player_torso_idle.png`** + **`player_weapon_pistol_neutral.png`**
   → MVP static character with pistol. Validates that all three layers
     align and render correctly. Torso layer activates on first load of
     `torso_idle`, which also enables the weapon layer.

2. **`player_legs_run.png`**
   → unlocks the "running" feel.

3. **`player_torso_shoot.png`**
   → fire feedback. Main.ts already calls `player.triggerShootAnim(0.2)` on
     every successful shot.

4. **`player_torso_idle_up.png`** + **`player_weapon_pistol_up.png`**
   → first aim-up pose. Validates the (action, orientation) matrix and
     weapon rotation.

5. Progressive fill-in: remaining torso sheets, remaining weapon orientations,
   then alternate weapon sprites (MG / shotgun / rocket).

---

## Universal rules (all sprites, not just player)

1. **Horizontal strips only.** One row of N frames left-to-right. UV math
   is trivial: `offset.x = frame / frameCount`.
2. **Frame count lives in code**, not the filename. Declared in the
   relevant registry (e.g. `LEGS_DEFS.run.frames = 8` in
   `src/gfx/playerSprite.ts`). Sheet and registry must stay in sync.
3. **Power-of-two width is NOT required** — we disable mipmaps and use
   nearest-neighbor filtering. Any dimensions work.
4. **Optimize before committing**:
   ```
   npm run optimize:sprites
   ```
   Idempotent, lossy pngquant at quality 65–80 (visually lossless on
   pixel art). Measured on `player_idle.png`: 232 KB → 68 KB (-70.9%).
5. **Budget**: the Jam disqualifies games with heavy downloads. Total
   (sprites + audio + JS gzipped) must stay under ~**300 KB**.
   Individual PNGs >50 KB need a justification note in `BUILD_LOG.md`.

## Why `public/` and not `src/assets/`?

- Stable URL paths without bundler processing, ideal for runtime loaders.
- Trade-off: no auto-inline as data URIs. Small (<4 KB) sprites can go to
  `src/assets/` + `import` to get inlined instead.
- For sheets that are always >4 KB (i.e., all of ours), `public/` wins.

## Pixel-art authoring tips

- Integer sprite dimensions. Our standard is **20 × 32 per frame** for
  all player layers.
- Authorial canvas color: transparent only.
- Export as PNG-8 with alpha where possible; pngquant will enforce this.
- **Keep anchors fixed**:
  - Across all frames of one sheet (feet in legs, waist in torso, grip
    in weapon) — otherwise mesh jitters.
  - Across layers for the SAME orientation (legs hip row ≡ torso waist
    row; torso hand pixel ≡ weapon grip pixel) — otherwise the character
    falls apart visually.
