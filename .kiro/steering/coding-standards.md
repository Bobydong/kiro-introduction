# Coding Standards

Standards for Flappy Kiro: vanilla JS (ES modules), HTML5 Canvas, no build step. These extend the architecture rules in `tech.md` (pure simulation core vs. side-effect adapters).

## JavaScript style

- Use ES modules (`import`/`export`); one clear responsibility per file.
- `const` by default; `let` only when reassigning; never `var`.
- Prefer pure functions and early returns over deep nesting.
- Use strict equality (`===` / `!==`).
- Terminate statements with semicolons; use single quotes for strings.
- Access `localStorage`, `HTMLAudioElement`, and DOM APIs only inside adapters, never in `sim.js`.

## Naming conventions

- **Files:** lowercase, short, one word where possible — `sim.js`, `render.js`, `config.js`.
- **Functions & variables:** `camelCase`. Functions are verbs (`spawnPipePair`, `detectCollision`, `applyGravity`); booleans read as predicates (`passed`, `isReady`).
- **Reducers:** name after the action they perform (`startGame`, `applyFlap`, `advancePipes`, `restart`).
- **Constants:** the single tunable config lives in a `Config` object (`PascalCase` type name, `camelCase` keys). True module-level constants use `UPPER_SNAKE_CASE`.
- **Effects:** `type` values are `camelCase` verbs (`playFlap`, `playGameOver`, `saveHighScore`).
- **State phases:** lowercase string literals — `'ready'`, `'playing'`, `'gameover'`.

## Class naming conventions

This codebase favors plain, serializable objects and pure functions over classes — simulation state (`GameState`, `Ghosty`, `PipePair`, `Config`) is plain data, not class instances. Keep it that way so `step` stays pure and testable.

When a class is genuinely warranted (e.g. wrapping a stateful browser resource in an adapter):

- Use `PascalCase` for class names, nouns describing the thing (`AudioManager`, `InputHandler`).
- Methods are `camelCase` verbs (`playFlap`, `preventDefault`).
- Prefix intentionally private fields with `#` (true private) rather than a leading underscore convention.
- Do not put game rules in a class — classes belong in adapters only.

## Game patterns

- **Pure reducer core:** advance state only through `step(state, input, dt)`, which returns a new state plus an effects array. Treat state as immutable — return new objects, don't mutate inputs.
- **Effects as data:** emit side effects (`playFlap`, `playGameOver`, `saveHighScore`) as plain descriptors; the loop interprets them. Never call audio/storage directly from the core.
- **Variable-dt loop:** integrate physics with the frame `dt` (seconds), clamped to `config.maxDt` so a backgrounded tab can't tunnel Ghosty through a pipe.
- **Injected randomness:** pass `rng: () => number` into spawn logic (`Math.random` in production, a seeded generator in tests) so spawning is deterministic under test.
- **Config-driven:** no magic numbers in logic — every tunable (gravity, flap velocity, scroll speed, gap size, spacing) comes from `config.js`.
- **Fail-soft adapters:** audio and storage swallow their own errors (rejected `play()`, `localStorage` throwing) so play never halts; the pure core already holds the authoritative state.
- **AABB collision:** use axis-aligned bounding-box overlap plus ground/ceiling boundary checks; keep geometry in pure helpers.

## Performance

- **Minimize per-frame allocation:** the loop runs ~60fps. Avoid creating throwaway arrays/objects/closures in hot paths; reuse where it doesn't compromise core purity.
- **Despawn promptly:** remove pipe pairs once fully past the left edge so arrays stay small.
- **Load assets once:** preload the sprite and audio elements at bootstrap; never construct `Image`/`Audio` inside the loop.
- **Guard on asset readiness:** check an image is loaded before drawing; a missing asset must not throw inside the loop.
- **Canvas drawing:**
  - Cache the 2D context once; don't re-query it each frame.
  - Batch state changes (`fillStyle`, `font`) — set a style once, draw all shapes of that style, then switch.
  - Draw sprites at integer pixel coordinates to avoid sub-pixel blur and extra work; round positions at render time, not in the simulation.
  - Only redraw what the frame needs; avoid redundant full-canvas work beyond the single clear-and-draw pass.
- **No premature micro-optimization:** keep the simulation readable and pure first; optimize a hot path only when it measurably matters.
