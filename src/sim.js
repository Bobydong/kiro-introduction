// Pure simulation core for Flappy Kiro.
//
// This module contains NO side effects: no DOM, canvas, audio, or storage
// access. Every function here is a pure function of its arguments and returns
// plain, serializable data. All simulation state is plain objects (no classes
// with hidden state), and reducers return new objects rather than mutating
// their inputs. Tunable constants are injected via the `config` argument.
//
// Rect convention: rects are { x, y, w, h } with a top-left origin.

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

/**
 * Build a Ready_State GameState.
 *
 * @param {object} config - the Config object (tunable constants).
 * @param {number} highScore - the High_Score loaded from storage.
 * @returns {{phase: string, ghosty: {x: number, y: number, vy: number},
 *            pipes: Array, score: number, highScore: number}} a fresh
 *   Ready_State: phase `'ready'`, Score 0, the given High_Score, Ghosty at the
 *   fixed start position with zero velocity, and an empty pipes array.
 */
export function createInitialState(config, highScore) {
  return {
    phase: 'ready',
    ghosty: {
      x: config.ghostStartX,
      y: config.ghostStartY,
      vy: 0,
    },
    pipes: [],
    score: 0,
    highScore,
  };
}

// ---------------------------------------------------------------------------
// Geometry helpers (pure, derived from state + config at use time)
// ---------------------------------------------------------------------------

/**
 * Top edge (y) of a Pipe_Pair's Gap.
 *
 * @param {number} gapCenterY - vertical center of the Gap.
 * @param {number} gapHeight - fixed Gap height.
 * @returns {number} the y coordinate of the top of the Gap.
 */
export function gapTop(gapCenterY, gapHeight) {
  return gapCenterY - gapHeight / 2;
}

/**
 * Bottom edge (y) of a Pipe_Pair's Gap.
 *
 * @param {number} gapCenterY - vertical center of the Gap.
 * @param {number} gapHeight - fixed Gap height.
 * @returns {number} the y coordinate of the bottom of the Gap.
 */
export function gapBottom(gapCenterY, gapHeight) {
  return gapCenterY + gapHeight / 2;
}

/**
 * Rect for the top pipe of a Pipe_Pair: from the Ceiling (y 0) down to the
 * top of the Gap.
 *
 * @param {{x: number, gapCenterY: number}} pipe - a Pipe_Pair.
 * @param {object} config - the Config object.
 * @returns {{x: number, y: number, w: number, h: number}} the top pipe rect.
 */
export function topPipeRect(pipe, config) {
  return {
    x: pipe.x,
    y: 0,
    w: config.pipeWidth,
    h: gapTop(pipe.gapCenterY, config.gapHeight),
  };
}

/**
 * Rect for the bottom pipe of a Pipe_Pair: from the bottom of the Gap down to
 * the Ground.
 *
 * @param {{x: number, gapCenterY: number}} pipe - a Pipe_Pair.
 * @param {object} config - the Config object.
 * @returns {{x: number, y: number, w: number, h: number}} the bottom pipe rect.
 */
export function bottomPipeRect(pipe, config) {
  const bottom = gapBottom(pipe.gapCenterY, config.gapHeight);
  return {
    x: pipe.x,
    y: bottom,
    w: config.pipeWidth,
    h: config.groundY - bottom,
  };
}

/**
 * Rect for Ghosty's collision bounds.
 *
 * @param {{x: number, y: number}} ghosty - Ghosty's current position.
 * @param {object} config - the Config object.
 * @returns {{x: number, y: number, w: number, h: number}} the Ghosty rect.
 */
export function ghostRect(ghosty, config) {
  return {
    x: ghosty.x,
    y: ghosty.y,
    w: config.ghostWidth,
    h: config.ghostHeight,
  };
}

/**
 * Axis-aligned bounding-box (AABB) overlap test.
 *
 * @param {{x: number, y: number, w: number, h: number}} a - first rect.
 * @param {{x: number, y: number, w: number, h: number}} b - second rect.
 * @returns {boolean} true if the two rects overlap.
 */
export function overlaps(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/**
 * Detect a Collision between Ghosty and the world (Requirements 7.1, 7.2,
 * 7.3).
 *
 * Pure predicate — a function of `ghosty` + `pipes` + `config` only, with no
 * canvas reads. Because the collision bounds are derived from the same state
 * and config the renderer draws from, what the player sees is exactly what
 * collides.
 *
 * Checks are ordered cheap-first and short-circuit on the first hit:
 *
 *   1. Ceiling (Req 7.3): a Collision when Ghosty's top edge reaches or crosses
 *      the Ceiling (`ghosty.y <= 0`).
 *   2. Ground (Req 7.2): a Collision when Ghosty's bottom edge reaches or
 *      crosses the Ground (`ghosty.y + config.ghostHeight >= config.groundY`).
 *   3. Pipes (Req 7.1): AABB overlap between Ghosty's rect and either pipe rect
 *      of any Pipe_Pair. Ghosty's x is fixed, so pairs whose horizontal span
 *      does not reach Ghosty's x range are culled before the overlap test —
 *      a pair is only relevant while `pipe.x + pipeWidth >= ghosty.x` and
 *      `pipe.x <= ghosty.x + ghostWidth`.
 *
 * @param {{x: number, y: number}} ghosty - Ghosty's current position.
 * @param {Array<{x: number, gapCenterY: number}>} pipes - the current
 *   Pipe_Pairs.
 * @param {object} config - the Config object.
 * @returns {boolean} true if a Collision is registered this frame.
 */
export function detectCollision(ghosty, pipes, config) {
  // 1 + 2. Ceiling / Ground — cheap scalar comparisons before the pipe loop.
  if (ghosty.y <= 0) {
    return true;
  }
  if (ghosty.y + config.ghostHeight >= config.groundY) {
    return true;
  }

  // 3. Pipes — AABB overlap, culling pairs not near Ghosty's fixed x.
  const g = ghostRect(ghosty, config);
  const gRight = g.x + g.w;
  for (const pipe of pipes) {
    // Cull: skip pairs whose horizontal span can't reach Ghosty's x range.
    if (pipe.x + config.pipeWidth < g.x || pipe.x > gRight) {
      continue;
    }
    if (
      overlaps(g, topPipeRect(pipe, config)) ||
      overlaps(g, bottomPipeRect(pipe, config))
    ) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Reducers (pure state transitions)
// ---------------------------------------------------------------------------

/**
 * Spawn a single Pipe_Pair at the right edge of the Play_Area.
 *
 * Produces a Pipe_Pair with a randomized `gapCenterY`, a fixed `gapHeight`
 * (applied at render/collision time via config, not stored), a `passed: false`
 * flag, and `x` at the right edge of the Play_Area. Used both for the initial
 * Pipe_Pair spawned by `startGame` (Requirement 2.5) and — with an overridden
 * `x` — as the template for subsequent pairs spawned by `advancePipes`.
 *
 * The gap center is drawn from the injected `rng` so spawning is deterministic
 * under test (Requirement 5.2). The usable range for the center keeps the
 * whole Gap inside the Play_Area with at least `gapMargin` from the Ceiling and
 * the Ground; `gapCenterY` lies in
 * `[gapMargin + gapHeight/2, groundY - gapMargin - gapHeight/2]`.
 *
 * @param {object} config - the Config object.
 * @param {() => number} rng - returns a value in [0, 1).
 * @returns {{x: number, gapCenterY: number, passed: boolean}} a new Pipe_Pair.
 */
export function spawnPipePair(config, rng) {
  const minCenter = config.gapMargin + config.gapHeight / 2;
  const maxCenter = config.groundY - config.gapMargin - config.gapHeight / 2;
  const gapCenterY = minCenter + rng() * (maxCenter - minCenter);
  return {
    x: config.width,
    gapCenterY,
    passed: false,
  };
}

/**
 * Advance all Pipe_Pairs for one Playing_State frame (Requirements 5.1, 5.5,
 * 5.6).
 *
 * Three steps, all pure (returns a new array; never mutates its input):
 *
 *   1. Scroll (Req 5.1): every surviving pair's `x` decreases by exactly
 *      `scrollSpeed * dt`. The decrease is identical for all pairs because the
 *      scroll speed is fixed for the whole session.
 *   2. Despawn (Req 5.5): any pair whose right edge (`x + pipeWidth`) has moved
 *      completely past the left edge of the Play_Area (`< 0`) is removed.
 *   3. Spawn (Req 5.6): while the rightmost (most recently spawned) pair's
 *      leading edge has moved far enough left that a new pair placed one
 *      `pipeSpacing` to its right would still be at or beyond the right edge of
 *      the Play_Area, a new pair is appended at exactly
 *      `rightmostX + pipeSpacing`. Spawning relative to the previous leading
 *      edge (rather than snapping to `config.width`) keeps the horizontal
 *      distance between the leading edges of consecutive pairs exactly
 *      `pipeSpacing`, and because it only spawns when
 *      `rightmostX + pipeSpacing >= config.width`, the new pair always enters
 *      at or beyond the right edge.
 *
 * The loop in step 3 handles multiple spawns in a single frame should a large
 * (clamped) `dt` scroll the field far enough to open more than one spacing
 * interval, so spacing stays uniform regardless of frame length.
 *
 * @param {Array<{x: number, gapCenterY: number, passed: boolean}>} pipes - the
 *   current Pipe_Pairs.
 * @param {number} dt - elapsed time this frame, in seconds (already clamped).
 * @param {object} config - the Config object.
 * @param {() => number} rng - returns a value in [0, 1); used for gap spawning.
 * @returns {Array<{x: number, gapCenterY: number, passed: boolean}>} the new
 *   Pipe_Pairs after scrolling, despawning, and spawning.
 */
export function advancePipes(pipes, dt, config, rng) {
  const dx = config.scrollSpeed * dt;

  // 1. Scroll + 2. despawn in one pass: move every pair left by the same dx,
  //    then drop pairs whose right edge is fully past the left edge.
  const next = [];
  for (const pipe of pipes) {
    const x = pipe.x - dx;
    if (x + config.pipeWidth < 0) {
      continue; // fully off-screen to the left — despawn (Req 5.5)
    }
    next.push({ ...pipe, x });
  }

  // 3. Spawn new pairs to maintain fixed spacing between leading edges. The
  //    rightmost pair is the last one appended; new pairs always go to its
  //    right at exactly `pipeSpacing`, so the array stays ordered by `x`.
  let rightmostX =
    next.length > 0 ? next[next.length - 1].x : -Infinity;
  while (rightmostX + config.pipeSpacing >= config.width) {
    const pair = spawnPipePair(config, rng);
    pair.x = rightmostX + config.pipeSpacing;
    next.push(pair);
    rightmostX = pair.x;
  }

  return next;
}

/**
 * Score any Pipe_Pairs Ghosty has newly passed this frame (Requirements 6.1,
 * 6.2, 6.3).
 *
 * A Pipe_Pair is "passed" the first frame its trailing edge (`x + pipeWidth`)
 * has moved completely to the left of Ghosty's left edge (`ghosty.x`), i.e.
 * `pipe.x + config.pipeWidth < ghosty.x`. On that frame the pair contributes
 * exactly +1 to the Score and is marked `passed: true` so it can never score
 * again (Property 11 — a pipe scores exactly once). A pair already flagged
 * `passed` is skipped and does not score again.
 *
 * Pure: returns a new state with an updated `score` and a new `pipes` array
 * carrying updated `passed` flags; never mutates its input. Ghosty's x is fixed
 * at `config.ghostStartX`, so the crossing test is a simple scalar comparison.
 *
 * Scoring ordering note for the collision task (7.1): Requirement 6.3 and the
 * design require that Collision takes precedence over scoring on a frame where
 * both could occur — no point is awarded on the crash frame. Collision/
 * game-over handling is implemented in a later task; when it is wired in, it
 * must run such that this scoring is skipped (or its score increment discarded)
 * on a frame that transitions to game-over, so a crash frame never scores.
 *
 * @param {object} state - the current Playing_State GameState.
 * @param {object} config - the Config object.
 * @returns {object} a new state with the updated Score and pipes.
 */
export function scorePassedPipes(state, config) {
  const ghostX = state.ghosty.x;
  let gained = 0;
  const pipes = state.pipes.map((pipe) => {
    if (!pipe.passed && pipe.x + config.pipeWidth < ghostX) {
      gained += 1;
      return { ...pipe, passed: true };
    }
    return pipe;
  });

  if (gained === 0) {
    // No new pairs passed this frame — keep the original state/pipes refs.
    return state;
  }

  return {
    ...state,
    score: state.score + gained,
    pipes,
  };
}

/**
 * Apply Gravity to Ghosty for one frame (Requirements 3.1, 3.2).
 *
 * Increases Ghosty's downward velocity by `gravity * dt`, then advances the
 * vertical position by the (updated) velocity. Pure: returns a new Ghosty
 * object and does not mutate its input. `x` is left unchanged — Ghosty's
 * horizontal position is fixed; only `y`/`vy` vary.
 *
 * @param {{x: number, y: number, vy: number}} ghosty - current Ghosty.
 * @param {number} dt - elapsed time this frame, in seconds (already clamped).
 * @param {object} config - the Config object.
 * @returns {{x: number, y: number, vy: number}} a new Ghosty with gravity
 *   integrated for this frame.
 */
export function applyGravity(ghosty, dt, config) {
  const vy = ghosty.vy + config.gravity * dt;
  return {
    ...ghosty,
    vy,
    y: ghosty.y + vy * dt,
  };
}

/**
 * Apply a Flap to Ghosty (Requirement 4.1).
 *
 * Sets Ghosty's vertical velocity to the fixed upward `flapVelocity`,
 * replacing whatever the prior velocity was. Pure: returns a new Ghosty object
 * and does not mutate its input. Position is left unchanged; the frame's
 * position integration is handled by `applyGravity`.
 *
 * @param {{x: number, y: number, vy: number}} ghosty - current Ghosty.
 * @param {object} config - the Config object.
 * @returns {{x: number, y: number, vy: number}} a new Ghosty whose `vy` is
 *   exactly `config.flapVelocity`.
 */
export function applyFlap(ghosty, config) {
  return {
    ...ghosty,
    vy: config.flapVelocity,
  };
}

/**
 * Start a game session from the Ready_State (Requirement 2).
 *
 * Produces the first Playing_State frame: Score reset to 0, exactly one Flap
 * applied (`vy = flapVelocity`), gravity will take effect from the first
 * playing frame onward, and at least one Pipe_Pair spawned at the right edge.
 * Emits exactly one `playFlap` effect. Pure: returns a new state and does not
 * mutate its input.
 *
 * @param {object} state - the current Ready_State GameState.
 * @param {object} config - the Config object.
 * @param {() => number} rng - returns a value in [0, 1); used for gap spawning.
 * @returns {{state: object, effects: Array<{type: string}>}} the first
 *   Playing_State and the emitted effects.
 */
export function startGame(state, config, rng) {
  return {
    state: {
      ...state,
      phase: 'playing',
      score: 0,
      ghosty: {
        ...state.ghosty,
        vy: config.flapVelocity,
      },
      pipes: [spawnPipePair(config, rng)],
    },
    effects: [{ type: 'playFlap' }],
  };
}

/**
 * Restart from the Game_Over_State back to a clean Ready_State (Requirements
 * 9.2, 9.3, 9.4).
 *
 * Produces a fresh Ready_State: phase `'ready'`, all Pipe_Pairs cleared (empty
 * array, Req 9.3), Ghosty reset to the fixed start position
 * (`config.ghostStartX`/`config.ghostStartY`) with zero velocity (Req 9.4), and
 * Score reset to 0. The High_Score carries over unchanged so the player's best
 * is preserved across restarts. Pure: returns a new state and does not mutate
 * its input.
 *
 * Delegates to `createInitialState(config, state.highScore)` so the restarted
 * Ready_State is byte-for-byte the same shape the Game first loaded with
 * (Property 20 — restart returns a clean Ready screen).
 *
 * @param {object} state - the current Game_Over_State GameState.
 * @param {object} config - the Config object.
 * @returns {object} a fresh Ready_State carrying the prior High_Score.
 */
export function restart(state, config) {
  return createInitialState(config, state.highScore);
}

// ---------------------------------------------------------------------------
// Step — the single pure reducer that advances the simulation
// ---------------------------------------------------------------------------

/**
 * Advance the simulation by one frame.
 *
 * `step` is the only entry point that moves the GameState forward. It is pure:
 * it returns a new state plus a list of plain effect descriptors
 * (`{ type: 'playFlap' }`, `{ type: 'playGameOver' }`,
 * `{ type: 'saveHighScore', value }`) and never performs side effects or
 * mutates its arguments. The loop in `main.js` interprets the effects.
 *
 * Signature convention: `step(state, input, dt, config, rng)`. The architecture
 * describes the reducer conceptually as `step(state, input, dt)`, but the core
 * must stay pure, so `config` (tunable constants) and `rng` (injected
 * randomness) are threaded as explicit trailing arguments rather than captured
 * from module scope. `rng` defaults to `Math.random` for production use;
 * tests pass a seeded generator. All later phase logic (gravity, pipe
 * spawning/scrolling, scoring, collision) will build on this same signature.
 *
 * @param {object} state - the current GameState.
 * @param {{flap: boolean}} input - the drained input descriptor for this frame.
 * @param {number} dt - elapsed time this frame, in seconds (already clamped).
 * @param {object} config - the Config object.
 * @param {() => number} [rng=Math.random] - returns a value in [0, 1).
 * @returns {{state: object, effects: Array<{type: string}>}} the next state and
 *   the effects emitted this frame.
 */
export function step(state, input, dt, config, rng = Math.random) {
  if (state.phase === 'ready') {
    // Ready_State: hold Ghosty stationary until the first Flap_Input. With no
    // flap, nothing changes (Requirement 1.6). A flap starts the game.
    if (input.flap) {
      return startGame(state, config, rng);
    }
    return { state, effects: [] };
  }

  if (state.phase === 'playing') {
    // Playing_State frame. Order within the frame:
    //   1. Integrate gravity (Req 3.1, 3.2) every frame — this updates vy and
    //      advances y by the new velocity.
    //   2. If a Flap_Input is present, apply the Flap (Req 4.1), which
    //      overrides vy to exactly `flapVelocity`, and emit one `playFlap`.
    //
    // Gravity-before-flap is the order the design properties require:
    //   - Property 4 (no flap): vy increases by gravity*dt and y moves by vy.
    //   - Property 5 (flap): vy ends at exactly `flapVelocity`. Doing gravity
    //     first then overriding with the flap leaves vy at exactly
    //     `flapVelocity`; the reverse order (flap then gravity) would leave
    //     vy at `flapVelocity + gravity*dt`, violating Property 5.
    //
    // Order within a playing frame:
    //   1. Integrate gravity + optional flap (physics).
    //   2. Scroll / despawn / spawn pipes.
    //   3. Detect a Collision against the post-physics, post-advance world.
    //   4a. On Collision: transition to game-over (Req 7.4) — scoring is
    //       discarded this frame so a crash frame never scores (Req 6.3).
    //   4b. Otherwise: apply scoring and stay in the playing phase.
    const effects = [];

    let ghosty = applyGravity(state.ghosty, dt, config);

    if (input.flap) {
      ghosty = applyFlap(ghosty, config);
      effects.push({ type: 'playFlap' });
    }

    // Pipe scrolling / despawn / spawn runs after the physics integration
    // (Req 5.1, 5.5, 5.6).
    const pipes = advancePipes(state.pipes, dt, config, rng);

    // Collision detection (Req 7.1-7.3) runs against the post-physics,
    // post-advance Ghosty and pipes — the same values the renderer draws, so
    // what collides is what the player sees.
    const collided = detectCollision(ghosty, pipes, config);

    if (collided) {
      // Playing → Game_Over transition (Req 7.4). This fires exactly once: the
      // phase flips to 'gameover' here, and the gameover branch (task 7.4)
      // never re-enters this collision path, so no further Collision this frame
      // or in later frames can re-trigger the transition.
      //
      // Collision takes precedence over scoring (Req 6.3): we build the
      // game-over state from `state.score` directly, discarding any point this
      // frame's pass-crossing would have awarded. The crash frame never scores.
      const prevHighScore = state.highScore;
      const highScore = Math.max(prevHighScore, state.score);

      // Game over sound plays once per transition (Req 7.5).
      effects.push({ type: 'playGameOver' });

      // Persist the High_Score only when this session strictly beat the stored
      // High_Score (Req 8.1, 8.2). A tie or a lower score writes nothing.
      if (state.score > prevHighScore) {
        effects.push({ type: 'saveHighScore', value: highScore });
      }

      return {
        state: {
          ...state,
          phase: 'gameover',
          ghosty,
          pipes,
          highScore,
        },
        effects,
      };
    }

    // No Collision this frame — apply scoring (Req 6.1-6.3): award a point for
    // each Pipe_Pair whose trailing edge crossed Ghosty's x this frame, after
    // the pipes have moved.
    const scored = scorePassedPipes({ ...state, ghosty, pipes }, config);

    return {
      state: {
        ...scored,
        ghosty,
        pipes: scored.pipes,
      },
      effects,
    };
  }

  if (state.phase === 'gameover') {
    // Game_Over_State: the world is frozen (Req 7.7, 7.8). Pipe positions and
    // Ghosty's position/velocity are left untouched — we return the exact same
    // state object on a frozen frame, so no pipe `x` and no Ghosty field can
    // drift across frames (Property 15).
    //
    // A Flap_Input here does NOT move Ghosty and emits NO `playFlap` effect
    // (Req 7.9, Property 16); it is interpreted only as a restart request,
    // transitioning back to a clean Ready_State (Req 9.2-9.4, Property 20).
    if (input.flap) {
      return { state: restart(state, config), effects: [] };
    }
    return { state, effects: [] };
  }

  // Defensive fallthrough for any unknown phase: return state unchanged.
  return { state, effects: [] };
}

// ---------------------------------------------------------------------------
// Presentation helpers (pure string formatting)
// ---------------------------------------------------------------------------

/**
 * Format the score bar text for display.
 *
 * Returns exactly the string `Score: {score} | High: {highScore}` so the
 * renderer can draw the bottom bar without embedding any formatting logic.
 *
 * @param {number} score - the current Score.
 * @param {number} highScore - the current High_Score.
 * @returns {string} the formatted score bar text.
 */
export function formatScore(score, highScore) {
  return `Score: ${score} | High: ${highScore}`;
}
