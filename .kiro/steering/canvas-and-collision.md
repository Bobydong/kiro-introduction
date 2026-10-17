# Canvas, Animation Loop & Collision

Technical patterns for Flappy Kiro's rendering and physics. Builds on `tech.md` (pure core vs. adapters) and `coding-standards.md` (performance). All drawing lives in `render.js`; the loop lives in `main.js`; collision geometry lives in pure helpers in `sim.js`.

## Canvas setup

- Size the canvas to the Play_Area via its `width`/`height` **attributes** (the backing store), not just CSS. CSS only scales the already-rendered bitmap and causes blur.
- Grab the 2D context once at bootstrap and reuse it; never call `getContext` inside the loop.
- For crisp output on high-DPI screens, scale the backing store by `devicePixelRatio` and set CSS size separately:

```js
const dpr = window.devicePixelRatio || 1;
canvas.width = config.width * dpr;
canvas.height = config.height * dpr;
canvas.style.width = `${config.width}px`;
canvas.style.height = `${config.height}px`;
const ctx = canvas.getContext('2d');
ctx.scale(dpr, dpr); // draw in CSS pixels thereafter
```

## Canvas drawing patterns

- `render(ctx, state)` is a pure read of `state` (plus preloaded images). It draws, never mutates state.
- Each frame: clear once, then draw back-to-front — sky, clouds, pipes, Ghosty, score bar, then any prompt.

```js
function render(ctx, state) {
  ctx.clearRect(0, 0, config.width, config.height);

  // sky
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(0, 0, config.width, config.height);

  // pipes — one fillStyle set, many rects
  ctx.fillStyle = '#2e8b2e';
  for (const p of state.pipes) {
    const gapTop = p.gapCenterY - config.gapHeight / 2;
    const gapBottom = p.gapCenterY + config.gapHeight / 2;
    ctx.fillRect(p.x, 0, config.pipeWidth, gapTop);
    ctx.fillRect(p.x, gapBottom, config.pipeWidth, config.groundY - gapBottom);
  }

  // sprite — guard on readiness, round to integer pixels
  if (ghostImg.complete && ghostImg.naturalWidth > 0) {
    ctx.drawImage(ghostImg, Math.round(state.ghosty.x), Math.round(state.ghosty.y));
  }
}
```

Rules:
- **Batch state changes:** set `fillStyle`/`font` once, draw all shapes sharing it, then switch. State changes are the costly part.
- **Round at draw time:** draw sprites at integer pixel coordinates to avoid sub-pixel blur. Round in the renderer only — keep floats in the simulation.
- **Minimize save/restore and path churn:** avoid `save()`/`restore()` and per-shape `beginPath()` in hot loops when a plain `fillRect` works.
- **Preload images/audio once** at bootstrap; never construct `Image`/`Audio` in the loop. Guard every `drawImage` on `complete && naturalWidth > 0`.
- **Text:** set `font`, `textAlign`, `textBaseline` once; draw the score bar from `formatScore(state.score, state.highScore)`.

## requestAnimationFrame loop

The loop lives in `main.js` and is the only place that advances state and renders. One rAF loop, variable `dt`, clamped.

```js
let last = performance.now();

function frame(now) {
  let dt = (now - last) / 1000;      // seconds
  last = now;
  dt = Math.min(dt, config.maxDt);   // clamp so a backgrounded tab can't tunnel

  const input = drainInput();        // pending flap collected since last frame
  const result = step(state, input, dt);
  state = result.state;
  for (const effect of result.effects) dispatchEffect(effect); // audio/storage

  render(ctx, state);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
```

Rules:
- Use the `now` timestamp rAF passes in; derive `dt` from it. Don't use `Date.now()` or `setInterval`.
- **Always clamp `dt` to `config.maxDt`.** Large gaps (backgrounded tab) otherwise jump Ghosty across the screen and skip collisions.
- Keep ordering fixed: drain input, `step`, dispatch effects, render. Never render stale state.
- Run exactly one rAF loop; it keeps running across all phases (`ready`/`playing`/`gameover`) so the game stays interactive.
- Do effects (audio, storage) via the adapters from the returned effects list — never from inside `step`.
- `drainInput` consumes queued events so one physical input maps to exactly one logical flap.

## Collision detection

Flappy Kiro uses **axis-aligned bounding-box (AABB)** overlap — the right choice here because every entity is an upright rectangle. No rotation, so no need for circle, SAT, or spatial-partition structures.

```js
// Pure helper in sim.js. Rects are { x, y, w, h } with origin top-left.
function overlaps(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

function detectCollision(ghosty, pipes, config) {
  const g = { x: ghosty.x, y: ghosty.y, w: config.ghostWidth, h: config.ghostHeight };

  // ceiling / ground first — cheapest checks
  if (g.y <= 0) return true;
  if (g.y + g.h >= config.groundY) return true;

  for (const p of pipes) {
    const gapTop = p.gapCenterY - config.gapHeight / 2;
    const gapBottom = p.gapCenterY + config.gapHeight / 2;
    const top = { x: p.x, y: 0, w: config.pipeWidth, h: gapTop };
    const bottom = { x: p.x, y: gapBottom, w: config.pipeWidth, h: config.groundY - gapBottom };
    if (overlaps(g, top) || overlaps(g, bottom)) return true;
  }
  return false;
}
```

Rules:
- Keep collision **pure** — a function of `state` + `config`, no canvas reads. The rendered bounds and the collision bounds must come from the same values so what the player sees matches what collides.
- **Order checks cheap-first:** ground/ceiling scalar comparisons before the pipe loop; short-circuit on the first hit.
- **Cull early:** only test pipes near Ghosty's fixed x. Since Ghosty's x is constant, a pipe is only relevant while `p.x + pipeWidth >= ghosty.x && p.x <= ghosty.x + ghostWidth`; skip the rest.
- Don't over-engineer: a handful of on-screen pipes means a linear scan is faster and simpler than any spatial index. No quadtrees here.
- **Collision takes precedence over scoring** on a frame where both could occur — no point is awarded on the crash frame.
- Keep the clamped `dt` (above) as the guard against tunneling; AABB is a discrete test and assumes per-frame movement stays smaller than entity size.
