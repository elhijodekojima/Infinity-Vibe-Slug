# public/assets/ — Conventions for external sprites

Files under `public/` are served **as-is** at the site root by Vite and Vercel.
That means `public/assets/sprites/player/player_idle.png` is fetched from
`/assets/sprites/player/player_idle.png` at runtime, with no hashing and no
bundler processing.

## Folder layout

```
public/assets/
├── README.md                 ← this file
└── sprites/
    ├── player/               ← LAYERED system (2 concurrent layers, see below)
    │   │
    │   ├── player_idle.png             ← legacy fallback (full body, 6 frames)
    │   │
    │   ├── player_legs_idle.png        ← LEGS layer — movement states
    │   ├── player_legs_run.png
    │   ├── player_legs_jump.png
    │   ├── player_legs_crouch.png
    │   │
    │   ├── player_torso_idle.png       ← TORSO layer — action states
    │   ├── player_torso_shoot.png
    │   ├── player_torso_aimup.png
    │   ├── player_torso_aimdown.png
    │   ├── player_torso_throw.png
    │   └── player_torso_melee.png
    │
    ├── enemies/              ← SINGLE-sheet system (full-body per animation)
    │   ├── soldier_walk.png
    │   ├── shield_walk.png
    │   └── tank_crawl.png
    ├── items/
    │   └── grenade.png
    └── ui/
```

## Player layered animation (only the main character)

To avoid the combinatorial explosion of full-body sheets for every
movement × action combination (run+shoot, jump+shoot, crouch+aimUp...),
the player is split into **two independent layers** that animate
concurrently: **legs** (movement) + **torso** (actions/weapon).

### Layer responsibilities

| Layer | Drives | States |
|---|---|---|
| `legs` | physics / movement | `idle`, `run`, `jump`, `crouch` |
| `torso` | action / weapon pose | `idle`, `shoot`, `aimUp`, `aimDown`, `throw`, `melee` |

Both layers animate with their own timer; a single state machine per
layer decides the current frame.

### Authoring rules for the player

1. **Same canvas for both layers.** Every frame of every layer is drawn
   on the full 20×32 character bounding box. The legs sheet shows pixels
   only for legs + lower hip (the top half is transparent); the torso
   sheet shows pixels only for torso + arms + weapon (the bottom half is
   transparent). Both meshes overlay at the same world position →
   alignment is automatic, zero anchor math.

2. **Consistent anchor.** Keep the feet at the same row of every `legs_*`
   frame (e.g., row 30 of a 32-tall sheet). Keep the waist/hip line at
   the same row of every `torso_*` frame. Then crouching works via a
   single `PLAYER.TORSO_CROUCH_Y_OFFSET` shift in code.

3. **Horizontal strips, same resolution.** All frames in a sheet are the
   same size, laid out left to right. Frame count + FPS + loop flag live
   in `src/gfx/playerSprite.ts` in the `LEGS_DEFS` / `TORSO_DEFS` maps.

4. **Progressive migration.** Drop sheets one at a time — the player
   falls back to the legacy `player_idle.png` until at least one layered
   sheet is available. Specifically:
   - If `player_legs_<state>.png` is missing → legs layer uses
     `player_idle.png`.
   - If `player_torso_<state>.png` is missing → torso layer is invisible.
   - Effect: until any torso sheet loads, the character renders exactly
     as with the single-layer idle sheet.

### Adding a new player animation

```
1. Draw   → save to public/assets/sprites/player/player_<layer>_<state>.png
2. Entry  → add { url, frames, fps, loop } in LEGS_DEFS or TORSO_DEFS
3. Wire   → if new state, add it to the selector in player.ts
            (selectLegsAnim / selectTorsoAnim).
4. Optim  → npm run optimize:sprites
```

Trigger-based torso states (shoot/melee/throw) are already wired — main.ts
calls `player.triggerShootAnim(dur)`, `triggerMeleeAnim(dur)`,
`triggerThrowAnim(dur)` when the corresponding event fires.

## Rules

1. **Horizontal strips only.** All animation sheets are one row of N frames,
   left-to-right. Makes UV math trivial: `offset.x = frame / frameCount`.
2. **Frame count lives in code**, not the filename. Declared in the
   relevant registry (e.g. `LEGS_DEFS.run.frames = 8` in
   `src/gfx/playerSprite.ts`). Keep the sheet and the registry in sync —
   a mismatch causes the animation to tear or freeze.
3. **Power-of-two width is NOT required** — we disable mipmaps and use
   nearest-neighbor filtering. The PNG can be any size.
4. **Optimize before committing.** Any PNG going into `public/` should be
   run through `pngquant` lossy compression (negligible visual loss on
   pixel art, 50–70% size reduction). We ship a repo-local tool:
   ```
   npm run optimize:sprites
   ```
   This walks every PNG under `public/assets/sprites/**`, applies
   `pngquant --quality 65-80 --force --skip-if-larger --strip`, and is
   idempotent (already-optimal files are skipped, not failed). Measured
   result on `player/player_idle.png`: 232 KB → 68 KB (-70.9%).
5. **Budget**: the Jam disqualifies games with heavy downloads. Keep the
   **total** of all sprites + audio + JS bundle under ~**300 KB gzipped**.
   Individual PNGs bigger than 50 KB should be a deliberate decision
   (document in `BUILD_LOG.md`).

## Why `public/` and not `src/assets/`?

- `public/` paths are stable and predictable — we can reference them by
  literal URL strings without running through the bundler.
- Trade-off: no automatic inlining of small assets as data URIs. If a
  sprite is tiny (<4 KB) and we want it inlined, put it in `src/assets/`
  and `import` it (Vite handles the conversion via `assetsInlineLimit`).
- For sprite sheets that are always >4 KB, `public/` is the simpler path.

## Pixel-art authoring tips (if creating sprites)

- Integer sprite dimensions: 32×32, 48×48, 64×64 per frame work well at
  the game's internal 480×270 resolution.
- Authorial canvas color doesn't matter — transparent background only.
- Export as PNG-8 with alpha when possible; pngquant enforces this.
- Keep the character's "anchor" (feet / pivot) at a fixed position across
  all frames so the mesh doesn't jitter during animation swaps.
- For the **player layered system specifically**: keep the **feet** fixed
  across all `legs_*` sheets AND the **waist** fixed across all `torso_*`
  sheets. Mismatched anchors across frames within one layer cause the
  mesh to jitter; mismatched anchors across layers cause the torso to
  "float" or "sink" relative to the legs.
