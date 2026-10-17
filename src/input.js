// Input adapter for Flappy Kiro.
//
// Normalizes the three Flap_Input sources (mouse click, touch tap, Spacebar)
// into a single pending flap that the loop drains once per frame (Req 4.3).
//
// This adapter is phase-agnostic: it only records that a flap was requested.
// What a flap *means* (start / flap / restart / ignored-for-movement) is
// decided by the pure `step` reducer based on `state.phase`. It holds no game
// rules and imports no other adapter or simulation internals.

/**
 * Create an input adapter bound to a target element (the canvas).
 *
 * Listens for `mousedown` and `touchstart` on the target and `keydown` on the
 * window, collapsing all three into one pending flap. `touchstart` and the
 * Spacebar key call `preventDefault` to suppress synthetic mouse events and
 * page scrolling respectively.
 *
 * @param {EventTarget} target - the canvas (or other element) to listen on.
 * @returns {{ drain: () => { flap: boolean } }} input adapter.
 */
export function createInput(target) {
  let flap = false;

  const request = (event) => {
    flap = true;
    if (event.cancelable) {
      event.preventDefault();
    }
  };

  target.addEventListener('mousedown', request);
  target.addEventListener('touchstart', request, { passive: false });
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      request(event);
    }
  });

  return {
    /**
     * Produce a single input descriptor for the current frame and clear the
     * pending flag, so one physical action maps to exactly one logical flap.
     *
     * @returns {{ flap: boolean }}
     */
    drain() {
      const input = { flap };
      flap = false;
      return input;
    },
  };
}
