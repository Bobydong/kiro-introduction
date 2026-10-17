# Product

Flappy Kiro is a browser-based, Flappy Bird-style arcade game.

The player controls a white ghost character (Ghosty) that is pulled down by gravity. Tapping, clicking, or pressing Spacebar makes Ghosty flap upward. The goal is to steer Ghosty through gaps in horizontally scrolling green pipes without hitting a pipe, the ground, or the ceiling.

## Core rules

- One point is scored per pipe pair passed.
- The high score persists across sessions (stored on the player's device).
- Presentation: light blue sky with clouds, green pipes, and a bottom score bar reading `Score: {score} | High: {highScore}`.

## Game states

- **Ready** — shown on load; Ghosty held stationary until the first input.
- **Playing** — gravity, scrolling, scoring, and collision checks run each frame.
- **Game Over** — world freezes on collision; an input restarts back to Ready.

The game is fully client-side with no server. The visual target is `img/example-ui.png`.
