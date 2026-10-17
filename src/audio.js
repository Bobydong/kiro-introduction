// Audio adapter for Flappy Kiro.
//
// This is a side-effect adapter: it holds no game rules, only wraps the
// stateful HTMLAudioElement browser resource. The pure simulation core
// (sim.js) emits `playFlap` / `playGameOver` effects as plain data; main.js
// routes those effects here.
//
// Fail-soft contract (Req 4.2, 7.6): `play()` returns a promise that can
// reject (autoplay policy, decode failure, missing asset). We swallow those
// rejections so a sound that cannot play never halts the game.

const FLAP_SOUND_SRC = 'assets/jump.wav';
const GAME_OVER_SOUND_SRC = 'assets/game_over.wav';

// Reset a clip to the start and play it, swallowing any rejected play()
// promise so audio failure never propagates into the loop.
function playClip(audio) {
  try {
    audio.currentTime = 0;
    const result = audio.play();
    // Modern browsers return a promise; older ones return undefined.
    if (result && typeof result.catch === 'function') {
      result.catch(() => {});
    }
  } catch {
    // Swallow synchronous failures (e.g. element in a bad state) too.
  }
}

// Create the audio manager. Preloads both clips once at setup; it never
// constructs an Audio element inside playFlap/playGameOver.
export function createAudio() {
  const flapSound = new Audio(FLAP_SOUND_SRC);
  const gameOverSound = new Audio(GAME_OVER_SOUND_SRC);

  return {
    playFlap() {
      playClip(flapSound);
    },
    playGameOver() {
      playClip(gameOverSound);
    },
  };
}

export default createAudio;
