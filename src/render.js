// Renderer adapter for Flappy Kiro.
//
// This module is a side-effect adapter: it draws `state` to a Canvas 2D
// context and holds no game rules. It is a *pure read* of the simulation
// state (plus preloaded images) — it never mutates `state`. All geometry it
// needs is derived from `state` + `config` via the pure helpers imported from
// `sim.js`, so the rendered bounds can never drift from the collision bounds.
//
// Per the "load assets once at bootstrap" rule, this module never constructs
// an `Image`/`Audio`. `main.js` preloads the Ghosty sprite and hands the
// loaded element in. `render` guards every `drawImage` on image readiness.
//
// Public API (chosen for task 13.1 to wire in `main.js`):
//
//   import { createRenderer } from './render.js';
//   const render = createRenderer(config, ghostImage);
//   // ...each frame, after step():
//   render(ctx, state);
//
// `createRenderer(config, ghostImage)` captures the immutable `Config` and the
// (possibly still-loading) Ghosty `HTMLImageElement`, and returns a
// `render(ctx, state)` closure the loop calls once per frame. `ghostImage` may
// be `null`/`undefined` or not-yet-loaded; drawing is skipped until it is
// ready, so a missing sprite never throws inside the loop.

import { gapTop, gapBottom, formatScore } from './sim.js';

// Palette — matches img/example-ui.png.
const SKY_COLOR = '#87CEEB'; // light blue sky
const CLOUD_COLOR = '#ffffff'; // white clouds
const PIPE_COLOR = '#2e8b2e'; // green pipes
const PIPE_CAP_COLOR = '#246b24'; // slightly darker green pipe cap
const SCORE_BAR_COLOR = '#3a4049'; // dark bottom score bar
const SCORE_TEXT_COLOR = '#ffffff'; // white score text
const PROMPT_TEXT_COLOR = '#ffffff'; // white restart prompt
const PROMPT_SHADOW_COLOR = 'rgba(0, 0, 0, 0.45)';

// Fixed presentation constants (true module-level constants, not simulation
// tunables — they describe how the world is drawn, not how it behaves).
const SCORE_BAR_HEIGHT = 40; // height of the bottom score bar
const SCORE_FONT = 'bold 22px system-ui, sans-serif';
const PROMPT_FONT = 'bold 20px system-ui, sans-serif';
const PIPE_CAP_HEIGHT = 18; // visual cap drawn at the Gap-facing pipe end
const PIPE_CAP_OVERHANG = 4; // cap sticks out past the pipe body on each side

// Decorative clouds. Positions are fixed in Play_Area pixels and sizes are in
// pixels; they are purely cosmetic (not part of the simulation).
const CLOUDS = [
  { x: 70, y: 70, w: 70, h: 44 },
  { x: 300, y: 180, w: 90, h: 50 },
  { x: 40, y: 250, w: 60, h: 38 },
  { x: 330, y: 70, w: 80, h: 46 },
];

/**
 * Build the renderer closure for the game loop.
 *
 * @param {object} config - the Config object (dimensions, pipeWidth, groundY,
 *   gapHeight, etc.). Captured once; never mutated.
 * @param {HTMLImageElement|null} [ghostImage] - the preloaded Ghosty sprite.
 *   May be null or still loading; drawing is guarded on readiness.
 * @returns {(ctx: CanvasRenderingContext2D, state: object) => void} a
 *   `render(ctx, state)` function to call once per frame.
 */
export function createRenderer(config, ghostImage) {
  /**
   * Draw a single frame. Pure read of `state`: never mutates it.
   *
   * Draw order (back-to-front): sky, clouds, pipes, Ghosty, score bar, then
   * the restart prompt (gameover only).
   *
   * @param {CanvasRenderingContext2D} ctx - the 2D context.
   * @param {object} state - the current GameState.
   */
  return function render(ctx, state) {
    const { width, height, groundY, gapHeight, pipeWidth } = config;

    // Clear once per frame, then redraw everything.
    ctx.clearRect(0, 0, width, height);

    drawSky(ctx, width, height);
    drawClouds(ctx);
    drawPipes(ctx, state.pipes, gapHeight, pipeWidth, groundY);
    drawGhosty(ctx, state.ghosty, ghostImage);
    drawScoreBar(ctx, state, width, height);

    if (state.phase === 'gameover') {
      drawRestartPrompt(ctx, width, height);
    }
  };
}

/**
 * Fill the full Play_Area with the light blue sky. (Req 1.3, 10.2)
 */
function drawSky(ctx, width, height) {
  ctx.fillStyle = SKY_COLOR;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Draw the decorative white cloud blobs as rounded rectangles. One fillStyle
 * is set, then every cloud is drawn with it. (Req 1.3, 10.2)
 */
function drawClouds(ctx) {
  ctx.fillStyle = CLOUD_COLOR;
  for (const c of CLOUDS) {
    const r = Math.min(c.w, c.h) / 2;
    fillRoundedRect(ctx, c.x, c.y, c.w, c.h, r);
  }
}

/**
 * Draw every Pipe_Pair: a green top pipe from the Ceiling (y 0) to the top of
 * the Gap, and a green bottom pipe from the bottom of the Gap to the Ground.
 * The rendered rects derive from the same gap geometry the collision core
 * uses, so visuals and collisions stay in sync. (Req 5.4, 10.4)
 *
 * fillStyle is batched: the pipe bodies are all drawn, then the caps, to
 * minimize costly state changes.
 */
function drawPipes(ctx, pipes, gapHeight, pipeWidth, groundY) {
  // Bodies — one fillStyle, many rects.
  ctx.fillStyle = PIPE_COLOR;
  for (const p of pipes) {
    const top = gapTop(p.gapCenterY, gapHeight);
    const bottom = gapBottom(p.gapCenterY, gapHeight);
    // Top pipe: Ceiling -> Gap top.
    ctx.fillRect(Math.round(p.x), 0, pipeWidth, Math.round(top));
    // Bottom pipe: Gap bottom -> Ground.
    ctx.fillRect(
      Math.round(p.x),
      Math.round(bottom),
      pipeWidth,
      Math.round(groundY - bottom)
    );
  }

  // Caps — a slightly darker green lip at each Gap-facing pipe end, matching
  // the reference UI. Batched after the bodies.
  ctx.fillStyle = PIPE_CAP_COLOR;
  for (const p of pipes) {
    const top = gapTop(p.gapCenterY, gapHeight);
    const bottom = gapBottom(p.gapCenterY, gapHeight);
    const capX = Math.round(p.x) - PIPE_CAP_OVERHANG;
    const capW = pipeWidth + PIPE_CAP_OVERHANG * 2;
    // Cap on the top pipe (hangs just above the Gap top).
    ctx.fillRect(capX, Math.round(top) - PIPE_CAP_HEIGHT, capW, PIPE_CAP_HEIGHT);
    // Cap on the bottom pipe (hangs just below the Gap bottom).
    ctx.fillRect(capX, Math.round(bottom), capW, PIPE_CAP_HEIGHT);
  }
}

/**
 * Draw the Ghosty sprite at its current position. Coordinates are rounded to
 * integer pixels at draw time to avoid sub-pixel blur (floats stay in the
 * simulation). Guards on image readiness so a missing/loading sprite never
 * throws inside the loop. (Req 10.1, 10.4)
 */
function drawGhosty(ctx, ghosty, ghostImage) {
  if (!ghostImage || !ghostImage.complete || ghostImage.naturalWidth === 0) {
    return;
  }
  ctx.drawImage(ghostImage, Math.round(ghosty.x), Math.round(ghosty.y));
}

/**
 * Draw the bottom score bar: a dark strip across the Play_Area bottom with the
 * centered text `Score: {score} | High: {highScore}`. Score and High_Score are
 * read straight from `state` so the display always reflects the same frame as
 * the simulation. (Req 6.2, 6.3, 8.6, 10.3)
 */
function drawScoreBar(ctx, state, width, height) {
  const barY = height - SCORE_BAR_HEIGHT;

  ctx.fillStyle = SCORE_BAR_COLOR;
  ctx.fillRect(0, barY, width, SCORE_BAR_HEIGHT);

  // Text style set once.
  ctx.fillStyle = SCORE_TEXT_COLOR;
  ctx.font = SCORE_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    formatScore(state.score, state.highScore),
    Math.round(width / 2),
    Math.round(barY + SCORE_BAR_HEIGHT / 2)
  );
}

/**
 * Draw the restart prompt shown in the Game_Over_State. (Req 9.1)
 */
function drawRestartPrompt(ctx, width, height) {
  const cx = Math.round(width / 2);
  const cy = Math.round(height / 2);

  ctx.font = PROMPT_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // A soft shadow for legibility over the frozen scene, then the white text.
  ctx.fillStyle = PROMPT_SHADOW_COLOR;
  ctx.fillText('Tap to restart', cx + 1, cy + 1);
  ctx.fillStyle = PROMPT_TEXT_COLOR;
  ctx.fillText('Tap to restart', cx, cy);
}

/**
 * Fill a rounded rectangle. Small local helper for the cloud blobs; kept
 * render-only (no simulation geometry). Uses a single path + fill.
 */
function fillRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  ctx.fill();
}

export default createRenderer;
