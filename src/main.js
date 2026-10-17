// Bootstrap entry point for Flappy Kiro.
//
// main.js is the single bootstrap module — the only place that knows about
// every other module. It wires the pure simulation core (sim.js) to the
// side-effect adapters (input, audio, storage, render), owns the one source of
// truth (`state`), and drives the single requestAnimationFrame loop.
//
// Data flow each frame (see canvas-and-collision.md):
//   events ─> input queue ─> drainInput() ─> step(state, input, dt, config, rng)
//     ─> { state, effects } ─> dispatch effects to audio/storage ─> render(ctx, state)
//
// The core never touches the DOM/canvas/audio/storage; those live only in the
// adapters. Effects leave the core as plain descriptors and are interpreted
// here. Adapters fail soft, so an effect can never crash the loop.

import { Config as config } from './config.js';
import { createInitialState, step } from './sim.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { loadHighScore, saveHighScore } from './storage.js';
import { createRenderer } from './render.js';

// ---------------------------------------------------------------------------
// Canvas + context setup (grabbed once; reused every frame).
// ---------------------------------------------------------------------------

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// High-DPI handling: size the backing store by devicePixelRatio for crisp
// output, keep the CSS size at the logical Play_Area dimensions, and scale the
// context so all drawing is done in CSS (logical) pixels thereafter.
const dpr = window.devicePixelRatio || 1;
canvas.width = config.width * dpr;
canvas.height = config.height * dpr;
canvas.style.width = `${config.width}px`;
canvas.style.height = `${config.height}px`;
ctx.scale(dpr, dpr);

// ---------------------------------------------------------------------------
// Adapters + preloaded assets (constructed once at bootstrap).
// ---------------------------------------------------------------------------

// Load the persisted High_Score once; it flows into the core as data. The core
// never reads storage itself — it only emits saveHighScore effects back out.
const highScore = loadHighScore();

// Preload the Ghosty sprite once here (never inside the loop). The renderer
// guards drawImage on readiness, so it is safe to pass a still-loading image.
const ghostImage = new Image();
ghostImage.src = 'assets/ghosty.png';

const input = createInput(canvas);
const audio = createAudio();
const render = createRenderer(config, ghostImage);

// Production randomness. A seeded generator is injected instead in tests.
const rng = Math.random;

// ---------------------------------------------------------------------------
// Single source of truth: the current GameState.
// ---------------------------------------------------------------------------

// main.js is the sole owner of `state`; every frame replaces it with the
// result of step(). No other module stores game state.
let state = createInitialState(config, highScore);

// ---------------------------------------------------------------------------
// Effect dispatch: route plain effect descriptors to the right adapter.
// ---------------------------------------------------------------------------

function dispatchEffect(effect) {
  switch (effect.type) {
    case 'playFlap':
      audio.playFlap();
      break;
    case 'playGameOver':
      audio.playGameOver();
      break;
    case 'saveHighScore':
      saveHighScore(effect.value);
      break;
    default:
      // Unknown effect — ignore so the loop can never crash on new effect
      // types that an older bootstrap doesn't understand.
      break;
  }
}

// ---------------------------------------------------------------------------
// The requestAnimationFrame loop — the only place state is advanced + drawn.
// ---------------------------------------------------------------------------

// Initialized on the first frame from the rAF timestamp so the first dt is ~0
// rather than a huge jump from an arbitrary epoch.
let last = null;

function frame(now) {
  // Derive dt (seconds) from the rAF-supplied timestamp delta.
  if (last === null) {
    last = now;
  }
  let dt = (now - last) / 1000;
  last = now;

  // Clamp so a backgrounded tab (large gap) can't tunnel Ghosty through a pipe
  // or skip collisions.
  dt = Math.min(dt, config.maxDt);

  // Fixed per-frame order: drain input, step, dispatch effects, render.
  const frameInput = input.drain();
  const result = step(state, frameInput, dt, config, rng);
  state = result.state;
  for (const effect of result.effects) {
    dispatchEffect(effect);
  }
  render(ctx, state);

  requestAnimationFrame(frame);
}

// Kick off the single loop; it keeps running across all phases
// (ready / playing / gameover) so the game stays interactive throughout.
requestAnimationFrame(frame);
