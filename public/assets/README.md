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
    ├── player/
    │   ├── player_idle.png   ← 6-frame idle strip (horizontal)
    │   ├── player_run.png    ← (future) run cycle
    │   ├── player_shoot.png  ← (future) aiming/shooting frames
    │   ├── player_crouch.png ← (future) crouch pose(s)
    │   └── player_jump.png   ← (future) jump frame
    ├── enemies/
    │   ├── soldier_walk.png
    │   ├── shield_walk.png
    │   └── tank_crawl.png
    ├── items/
    │   └── grenade.png
    └── ui/
```

## Rules

1. **Horizontal strips only.** All animation sheets are one row of N frames,
   left-to-right. Makes UV math trivial: `offset.x = frame / frameCount`.
2. **Frame count lives in code**, not the filename. Exported as a constant
   from the corresponding loader module (e.g. `PLAYER_IDLE_FRAMES` in
   `src/gfx/playerSprite.ts`). Keep the sheet and the constant in sync.
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
