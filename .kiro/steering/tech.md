# Tech Stack

## Runtime

- **HTML5 Canvas 2D** for all rendering.
- **Vanilla JavaScript (ES modules)** — no runtime framework.
- **No build step.** The game runs by opening `index.html` directly in a browser.
- `requestAnimationFrame` drives the game loop (variable `dt`, clamped to `config.maxDt`).
- `HTMLAudioElement` plays the `.wav` sound assets.
- `localStorage` persists the high score (key: `flappyKiro.highScore`).

## Architecture rule

Keep the **pure simulation core separate from side-effect adapters**.

- The core advances via a pure `step(state, input, dt)` that returns a new state plus a list of effects (`playFlap`, `playGameOver`, `saveHighScore`). It never touches the DOM, canvas, audio, or storage.
- Adapters (render, input, audio, storage) carry no game rules.
- All simulation state is plain, serializable objects (no classes with hidden state).
- Tunable constants live in a single `Config` object. Randomness is injected as `rng: () => number` so spawning is deterministic under test (`Math.random` in production, a seeded generator in tests).
- Effects are returned as data and interpreted by the loop, so the core stays testable.

## Testing

- **Property-based tests** with [`fast-check`](https://github.com/dubzzz/fast-check), run via a test runner (Vitest or Jest).
- Minimum 100 generated cases per property (`fc.assert(..., { numRuns: 100 })`).
- Inject a seeded `rng` for reproducible spawning.
- Tag each property test: `// Feature: flappy-kiro-game, Property {n}: {text}`.
- Add example/edge-case unit tests and adapter/integration tests for DOM, audio, and storage wiring.
- Visual criteria are verified manually against `img/example-ui.png`.

## Common commands

No tooling exists in the repo yet; add it in task 1 of the spec. Expected commands once `package.json` is in place:

```bash
# install dev dependencies (test runner + fast-check)
npm install

# run tests once (single execution, not watch mode)
npm test
```

Run the game by opening `index.html` in a browser. Do not start a long-running dev server; there is no build or bundler.
