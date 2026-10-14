# Implementation Plan: Flappy Kiro

## Overview

This plan builds Flappy Kiro as HTML5 Canvas + vanilla JavaScript (ES modules) with no build step. It implements the **pure simulation core first** (`src/sim.js` with `step`, reducers, geometry helpers, and the `formatScore` helper), validating it with property-based tests (fast-check, ≥100 iterations, seeded rng, tagged `Feature: flappy-kiro-game, Property {n}`). It then builds the side-effect adapters (storage, audio, input, renderer), and finally wires everything together through the bootstrap (`index.html`, `src/main.js`). Each step builds on the previous ones and ends integrated into the running loop, with no orphaned code.

## Tasks

- [ ] 1. Set up project structure, config, and test tooling
  - Create `index.html` shell with a single `<canvas>` sized to the Play_Area and a `<script type="module" src="src/main.js">` tag (stub `main.js` acceptable for now)
  - Create `src/config.js` exporting a `Config` object with all tunable constants: `width`, `height`, `groundY`, `gravity`, `flapVelocity`, `scrollSpeed`, `gapHeight`, `gapMargin`, `pipeWidth`, `pipeSpacing`, `ghostStartX`, `ghostStartY`, `ghostWidth`, `ghostHeight`, `maxDt`
  - Add `package.json` with a dev dependency on a test runner (Vitest or Jest) and `fast-check`, plus a `test` script using the `--run` (single-execution) flag
  - Define a seeded rng helper for tests so spawn logic is reproducible
  - _Requirements: 5.1, 5.3, 5.6, 1.2_

- [ ] 2. Implement simulation data model and geometry helpers (`src/sim.js`)
  - [ ] 2.1 Implement initial state and geometry helpers
    - Implement `createInitialState(config, highScore)` returning a Ready_State `GameState` (`phase: 'ready'`, `score: 0`, given `highScore`, Ghosty at `ghostStartX`/`ghostStartY` with zero velocity)
    - Implement pure geometry helpers: Gap top/bottom from `gapCenterY` and `gapHeight`; top/bottom pipe rects; Ghosty rect; AABB overlap helper
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 5.4, 7.1_

  - [ ]* 2.2 Write property test for initial state
    - **Property 1: Initial state is a Ready screen**
    - **Validates: Requirements 1.1, 1.2, 1.4, 1.5, 8.5**

  - [ ] 2.3 Implement `formatScore` helper
    - Implement `formatScore(score, highScore)` returning exactly `Score: {score} | High: {highScore}`
    - _Requirements: 10.3_

  - [ ]* 2.4 Write property test and example tests for `formatScore`
    - **Property 21: Score display formatting**
    - **Validates: Requirements 10.3**
    - Also add example tests asserting `formatScore(0, 0)` and `formatScore(2, 2)` match the reference-UI strings

- [ ] 3. Implement Ready and physics reducers
  - [ ] 3.1 Implement Ready phase stepping and `startGame`
    - In `step`, for `ready` phase: no Flap_Input holds Ghosty stationary; a Flap_Input calls `startGame`
    - Implement `startGame(state)`: Score→0, apply exactly one Flap (`vy = flapVelocity`), enable gravity from the first playing frame, spawn initial Pipe_Pair(s) at/beyond the right edge, emit exactly one `playFlap` effect
    - _Requirements: 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 3.2 Write property test for Ready holding Ghosty stationary
    - **Property 2: Ready holds Ghosty stationary**
    - **Validates: Requirements 1.6**

  - [ ]* 3.3 Write property test for Flap starting the game
    - **Property 3: Flap starts the game**
    - **Validates: Requirements 2.1, 2.2, 2.4, 2.5**

  - [ ] 3.4 Implement gravity integration and flap reducers
    - Implement `applyGravity(ghosty, dt, config)` increasing downward velocity by `gravity * dt` and updating position by velocity
    - Implement `applyFlap(ghosty, config)` setting `vy = flapVelocity`
    - In `step` playing phase, apply gravity each frame; apply flap and emit exactly one `playFlap` effect when a Flap_Input is present
    - _Requirements: 3.1, 3.2, 4.1, 4.2_

  - [ ]* 3.5 Write property test for gravity integration
    - **Property 4: Gravity integration while playing**
    - **Validates: Requirements 2.3, 3.1, 3.2**

  - [ ]* 3.6 Write property test for flap setting fixed upward velocity
    - **Property 5: Flap sets a fixed upward velocity**
    - **Validates: Requirements 4.1, 4.2**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement pipe spawning, scrolling, and despawning
  - [ ] 5.1 Implement `spawnPipePair` and `advancePipes`
    - Implement `spawnPipePair(config, rng)`: randomized `gapCenterY` so the full Gap stays within the Play_Area with at least `gapMargin` from Ceiling and Ground; fixed `gapHeight`; `passed: false`
    - Implement `advancePipes(pipes, dt, config)`: move each pair left by `scrollSpeed * dt` (identical for all pairs); despawn pairs fully past the left edge; spawn new pairs to maintain fixed `pipeSpacing` between leading edges
    - Wire pipe advancement into `step` playing phase
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6_

  - [ ]* 5.2 Write property test for pipe scroll speed uniformity
    - **Property 6: Pipes scroll at a fixed, uniform speed**
    - **Validates: Requirements 2.6, 5.1**

  - [ ]* 5.3 Write property test for spawned Gap staying within Play_Area
    - **Property 7: Spawned Gap stays within the Play_Area with margin**
    - **Validates: Requirements 5.2**

  - [ ]* 5.4 Write property test for fixed uniform Gap height
    - **Property 8: Gap height is fixed and uniform**
    - **Validates: Requirements 5.3**

  - [ ]* 5.5 Write property test for off-screen pipe removal
    - **Property 9: Off-screen pipes are removed**
    - **Validates: Requirements 5.5**

  - [ ]* 5.6 Write property test for consecutive pipe spacing
    - **Property 10: Consecutive pipes keep fixed equal spacing**
    - **Validates: Requirements 5.6**

- [ ] 6. Implement scoring and collision detection
  - [ ] 6.1 Implement `scorePassedPipes`
    - Increment Score by exactly 1 the first frame a Pipe_Pair's trailing edge crosses Ghosty's x; mark `passed` so it never scores again; do not score on a frame where a Collision occurs
    - Wire scoring into `step` playing phase before/with collision resolution
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 6.2 Write property test for scoring exactly once per pipe
    - **Property 11: Passing a pipe scores exactly once**
    - **Validates: Requirements 6.1**

  - [ ] 6.3 Implement `detectCollision`
    - Report a Collision when Ghosty's rect overlaps either pipe rect (AABB), or when Ghosty reaches/crosses the Ground (`y + ghostHeight >= groundY`) or Ceiling (`y <= 0`)
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 6.4 Write property test for bounding-box collision
    - **Property 12: Collision detection matches bounding-box overlap**
    - **Validates: Requirements 7.1**

  - [ ]* 6.5 Write property test for Ground/Ceiling collision
    - **Property 13: Hitting Ground or Ceiling is a Collision**
    - **Validates: Requirements 7.2, 7.3**

- [ ] 7. Implement Game Over transition and restart
  - [ ] 7.1 Implement Playing→GameOver transition
    - On Collision during a playing frame, transition to `gameover` exactly once (ignore further collisions that frame); update High_Score to `max(highScore, score)`; emit exactly one `playGameOver` effect; emit a `saveHighScore` effect only when the final Score exceeds the previous High_Score
    - _Requirements: 7.4, 7.5, 8.1, 8.2, 8.6_

  - [ ]* 7.2 Write property test for game over firing once per crash
    - **Property 14: Game over fires exactly once per crash**
    - **Validates: Requirements 7.4, 7.5**

  - [ ]* 7.3 Write property test for High_Score update on game over
    - **Property 17: High_Score updates to the maximum on game over**
    - **Validates: Requirements 8.1, 8.2**

  - [ ] 7.4 Implement GameOver freeze, ignored flap, and `restart`
    - In `step` for `gameover`: leave all pipe `x` and Ghosty position/velocity unchanged; ignore Flap_Input for movement (no movement flap, no `playFlap` effect)
    - Implement `restart(state)`: on Flap_Input in `gameover`, transition to `ready`, clear all pipes, reset Ghosty to start position with zero velocity, Score→0
    - _Requirements: 7.7, 7.8, 7.9, 9.2, 9.3, 9.4_

  - [ ]* 7.5 Write property test for Game Over freezing the world
    - **Property 15: Game Over freezes the world**
    - **Validates: Requirements 7.7, 7.8**

  - [ ]* 7.6 Write property test for Game Over ignoring Flap movement
    - **Property 16: Game Over ignores Flap for movement**
    - **Validates: Requirements 7.9**

  - [ ]* 7.7 Write property test for restart returning a clean Ready screen
    - **Property 20: Restart returns a clean Ready screen**
    - **Validates: Requirements 9.2, 9.3, 9.4**

- [ ] 8. Checkpoint - Ensure all simulation-core tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement Storage adapter (`src/storage.js`)
  - [ ] 9.1 Implement `loadHighScore` and `saveHighScore`
    - `loadHighScore()` reads key `flappyKiro.highScore` from `localStorage`; returns the parsed non-negative integer, or `0` when absent, negative, non-numeric, or `NaN`
    - `saveHighScore(value)` writes the value wrapped in try/catch so a storage failure is swallowed and play continues
    - _Requirements: 8.2, 8.3, 8.4_

  - [ ]* 9.2 Write property test for High_Score round-trip
    - **Property 18: High_Score persistence round-trips**
    - **Validates: Requirements 8.2**

  - [ ]* 9.3 Write property test for safe load defaults
    - **Property 19: High_Score load defaults safely**
    - **Validates: Requirements 8.4**

  - [ ]* 9.4 Write adapter tests for storage failure handling
    - Stub `localStorage.setItem` to throw; assert `saveHighScore` swallows it and the in-session high score is retained
    - Stub reads for absent/corrupt values complementing Property 19
    - _Requirements: 8.3_

- [ ] 10. Implement Audio adapter (`src/audio.js`)
  - [ ] 10.1 Implement audio manager
    - Preload two `HTMLAudioElement`s for `assets/jump.wav` and `assets/game_over.wav`
    - Implement `playFlap()` and `playGameOver()` that reset `currentTime` to 0, call `play()`, and swallow rejected `play()` promises so audio never halts the game
    - _Requirements: 4.2, 7.5, 7.6_

  - [ ]* 10.2 Write adapter tests for audio robustness
    - Stub `HTMLAudioElement.play` to resolve and to reject; assert the manager never throws and that `playGameOver` plays exactly once per game-over transition
    - _Requirements: 4.2, 7.5, 7.6_

- [ ] 11. Implement Input adapter (`src/input.js`)
  - [ ] 11.1 Implement Flap_Input normalization
    - Listen for `mousedown`, `touchstart`, and `keydown` with `code === 'Space'` on canvas/window; normalize all three into a single `flap: true` on the next frame's input descriptor
    - Call `preventDefault` on `touchstart` and Spacebar to suppress synthetic events and page scroll
    - _Requirements: 4.3_

  - [ ]* 11.2 Write adapter tests for input normalization
    - Dispatch `mousedown`, `touchstart`, and `keydown` (`code: 'Space'`); assert a Flap_Input is queued for the next frame and that `touchstart`/Space call `preventDefault`
    - _Requirements: 4.3_

- [ ] 12. Implement Renderer adapter (`src/render.js`)
  - [ ] 12.1 Implement `render(ctx, state)`
    - Draw light blue sky fill and cloud shapes; draw each Pipe_Pair as green top pipe (Ceiling→Gap top) and green bottom pipe (Gap bottom→Ground); draw Ghosty sprite from `assets/ghosty.png` at its position (guarding on image readiness)
    - Draw the bottom score bar using `formatScore(state.score, state.highScore)`, reading values straight from `state`; draw the restart prompt in `gameover` phase
    - Keep `render` a pure read of `state` (plus loaded images), redrawing each frame
    - _Requirements: 1.3, 5.4, 6.2, 6.3, 8.6, 9.1, 10.1, 10.2, 10.3, 10.4_

- [ ] 13. Bootstrap and wire the game loop (`src/main.js`, `index.html`)
  - [ ] 13.1 Wire adapters and start the loop
    - In `main.js`: call `loadHighScore()`, build the initial state with `createInitialState(config, highScore)`, wire the input/audio/storage adapters, and load the Ghosty image
    - Implement the `requestAnimationFrame` loop: compute `dt` clamped to `config.maxDt`, drain pending input into an `input` descriptor, call `step(state, input, dt)`, execute returned effects through the audio/storage adapters, then call `render(ctx, state)`
    - Finalize `index.html` to load `main.js` as a module
    - _Requirements: 1.1, 1.3, 1.5, 2.3, 7.6, 8.4, 10.4_

  - [ ]* 13.2 Write integration test for the loop effect dispatch
    - Drive a short sequence of frames through `step` + effect dispatch with stubbed adapters; assert `playFlap`/`playGameOver`/`saveHighScore` effects are routed to the correct adapters and that `dt` is clamped to `maxDt`
    - _Requirements: 2.3, 7.6, 10.4_

- [ ] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional (property, unit/example, adapter, and integration tests) and can be skipped for a faster MVP.
- Each task references specific requirements for traceability; property-test sub-tasks reference the exact design property number and the requirements it validates.
- Property-based tests use `fast-check` with a minimum of 100 iterations (`numRuns: 100`), a seeded rng for deterministic spawning, and the `// Feature: flappy-kiro-game, Property {n}` tag.
- Visual criteria (sky, clouds, sprite, pipe colors, restart prompt) are confirmed manually against `img/example-ui.png` by opening `index.html`; those are not coding tasks and are not listed here.
- Checkpoints ensure incremental validation as the core and adapters come together.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.3"] },
    { "id": 2, "tasks": ["2.2", "2.4", "3.1", "3.4"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.5", "3.6", "5.1", "6.1", "6.3", "9.1", "10.1", "11.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.4", "5.5", "5.6", "6.2", "6.4", "6.5", "7.1", "7.4", "9.2", "9.3", "9.4", "10.2", "11.2", "12.1"] },
    { "id": 5, "tasks": ["7.2", "7.3", "7.5", "7.6", "7.7", "13.1"] },
    { "id": 6, "tasks": ["13.2"] }
  ]
}
```
