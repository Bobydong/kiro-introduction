// Deterministic seeded RNG helper for tests.
//
// `spawnPipePair` takes an injected `rng: () => number` returning values in
// [0, 1). Production passes `Math.random`; tests pass `makeSeededRng(seed)`
// so randomized spawning (Requirement 5.2) is reproducible.
//
// Implementation: Mulberry32 — a tiny, fast, well-distributed 32-bit PRNG.
// Given the same seed it always produces the same sequence of values in
// [0, 1), which is exactly what deterministic property tests need.
export function makeSeededRng(seed = 1) {
  // Coerce to a 32-bit unsigned integer state.
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default makeSeededRng;
