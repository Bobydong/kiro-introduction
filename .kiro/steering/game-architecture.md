# Game Architecture

Architecture standards for Flappy Kiro. Extends `tech.md` (pure core vs. adapters), `coding-standards.md`, and `canvas-and-collision.md`. This file defines how the modules fit together, how input events flow, and how game state is owned and transitioned.

## Guiding principle

One source of truth: the `GameState` object. It is advanced only by the pure reducer `step(state, input, dt)`. Everything else either feeds input into `step` or reads state out of it. Rules never live in adapters; I/O never lives in the core.

```
events ──> input queue ──> [ loop ] ──> step(state, input, dt) ──> { state, effects }
                            |                                         |
                            |<───────────── new state ────────────>
                            ├──> render(ctx, state)
                            └──> dispatch(effects) ──> audio / storage adapters
```

## Modular systems

Each module has one responsibility and a narrow interface. Modules depend inward toward the pure core, never sideways between adapters.

| Module | Kind | Responsibility | May touch |
| --- | --- | --- | --- |
| `config.js` | data | All tunable constants (`Config`) | nothing |
| `sim.js` | pure core | `createInitialState`, `step`, reducers, geometry, `formatScore` | nothing but its args |
| `input.js` | adapter | Normalize mouse/touch/Spacebar into a flap input | DOM events |
| `render.js` | adapter | Draw `state` to the canvas | Canvas 2D, loaded images |
| `audio.js` | adapter | Play flap / game-over sounds | `HTMLAudioElement` |
| `storage.js` | adapter | Load/save high score | `localStorage` |
| `main.js` | bootstrap | Wire adapters, own the loop, route effects | all adapters |

Rules:
- Adapters never import `sim.js` internals beyond the data they are handed, and never import each other.
- The core imports nothing but `config` shape (passed in) — it must be runnable in a plain Node test with no DOM.
- `main.js` is the only module that knows about every other module.

## Event handling

Browser events are asynchronous and bursty; the simulation is a synchronous per-frame reducer. The input adapter bridges the two by **collecting events into a queue** that the loop drains once per frame.

- `input.js` listens for `mousedown`, `touchstart`, and `keydown` (`code === 'Space'`) and sets a pending `flap` for the next frame. It calls `preventDefault` on `touchstart` and Spacebar to suppress synthetic clicks and page scroll.
- The adapter is **phase-agnostic**: it only knows "a flap was requested." What a flap *means* (start / flap / restart / ignored-for-movement) is decided by `step` based on `state.phase`.
- The loop calls `drainInput()` once per frame to produce a single `input` descriptor (`{ flap: boolean }`), so one physical action maps to exactly one logical flap. Clear the pending flag after draining.
- Never run game logic in an event handler. Handlers only record intent.

```js
// input.js
export function createInput(target) {
  let flap = false;
  const request = (e) => { flap = true; if (e.cancelable) e.preventDefault(); };
  target.addEventListener('mousedown', request);
  target.addEventListener('touchstart', request, { passive: false });
  window.addEventListener('keydown', (e) => { if (e.code === 'Space') request(e); });
  return {
    drain() { const i = { flap }; flap = false; return i; }
  };
}
```

## State management

`GameState` is a plain, serializable object — no classes, no hidden state, no methods. This keeps `step` pure and lets tests construct any state directly.

```text
GameState { phase, ghosty, pipes, score, highScore }
```

Rules:
- **Single owner:** `main.js` holds the current `state` and replaces it with the result of each `step`. No other module stores game state.
- **Immutable updates:** reducers return new state; they do not mutate their arguments. This keeps frames independent and transitions easy to reason about.
- **Derived values are computed, not stored:** gap top/bottom, pipe rects, and Ghosty's rect are derived from state + config at use time, so they can never drift from the stored fields.
- **High score** flows in from `storage.loadHighScore()` at bootstrap and back out via a `saveHighScore` effect — the core treats it as data and never writes storage itself.

### State machine

Three phases drive all behavior. Transitions happen only inside `step`.

```
          Flap_Input                 Collision
 ready ──────────────> playing ──────────────> gameover
   ^                                        |
   └────────────────────────────────────────────────┘
                      Flap_Input (restart)
```

- **ready** → **playing** on flap: score 0, apply one flap, gravity on, spawn initial pipes, emit `playFlap`.
- **playing** → **gameover** on collision: update high score to the max, emit `playGameOver`, emit `saveHighScore` only if the final score beat the previous high score. Transition fires exactly once per crash.
- **gameover** → **ready** on flap: clear pipes, reset Ghosty to start, score 0. World is frozen (no gravity, no scroll, flap ignored for movement) until that restart.

### Effects

Side effects leave the core as plain descriptors so the core stays pure and testable:

```text
Effect = { type: 'playFlap' }
       | { type: 'playGameOver' }
       | { type: 'saveHighScore', value: number }
```

`main.js` interprets each effect, routing it to the audio or storage adapter. Adapters fail soft (swallow errors) so an effect can never crash the loop. Property tests assert on the emitted effects list directly, without any DOM.
