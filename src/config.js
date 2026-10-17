// Config holds all tunable simulation constants for Flappy Kiro.
// Keeping them in one place keeps the pure simulation core deterministic
// and easy to exercise from tests. Values are chosen to be internally
// consistent (see the invariant note below).
//
// Invariant: gapHeight + 2 * gapMargin < groundY, so a valid range of
// gap-center Y positions exists (160 + 2*60 = 280 < 600). ✓
export const Config = Object.freeze({
  // Play_Area pixel size (Ceiling = y 0, Ground = groundY).
  width: 480,
  height: 640,
  groundY: 600,

  // Vertical physics (pixels / second, and px/s^2 for gravity).
  gravity: 1200, // downward acceleration applied each frame while playing
  flapVelocity: -400, // upward velocity set on a Flap (negative = up)

  // Pipe scrolling + layout.
  scrollSpeed: 150, // horizontal pipe speed, fixed for the whole session
  gapHeight: 160, // fixed Gap height, identical for every Pipe_Pair
  gapMargin: 60, // min margin from the Gap to the Ceiling and the Ground
  pipeWidth: 60, // horizontal thickness of a pipe column
  pipeSpacing: 220, // fixed horizontal spacing between leading edges

  // Ghosty fixed start position + collision bounds.
  ghostStartX: 100,
  ghostStartY: 288, // roughly vertically centered in the Play_Area
  ghostWidth: 34,
  ghostHeight: 24,

  // Frame-time clamp (seconds) to avoid large physics jumps when the
  // tab is backgrounded. 1/30s matches the design note.
  maxDt: 1 / 30,
});

export default Config;
