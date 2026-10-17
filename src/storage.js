// Storage adapter: the only module that touches localStorage.
// It holds no game rules — just load/save of the persisted High_Score.
// Both functions fail soft so storage problems never interrupt play.

const HIGH_SCORE_KEY = 'flappyKiro.highScore';

// loadHighScore reads the persisted High_Score from localStorage.
// Returns the parsed non-negative integer, or 0 when the value is
// absent, negative, non-numeric, or NaN (Req 8.4). Reads are wrapped
// in try/catch so a disabled or throwing storage never halts the game.
export function loadHighScore() {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    if (raw === null) {
      return 0;
    }
    const value = Number.parseInt(raw, 10);
    if (!Number.isInteger(value) || value < 0) {
      return 0;
    }
    return value;
  } catch {
    return 0;
  }
}

// saveHighScore persists the High_Score to localStorage (Req 8.2).
// The write is wrapped in try/catch so a storage failure (quota exceeded,
// storage disabled, private mode) is swallowed and play continues with
// the in-session value (Req 8.3).
export function saveHighScore(value) {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(value));
  } catch {
    // Fail soft: the in-session High_Score is already held by the core.
  }
}
