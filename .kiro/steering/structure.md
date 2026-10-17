# Project Structure

## Current layout

```
kiro-introduction/
├── assets/              # Game audio and sprites
│   ├── game_over.wav    # Game over sound
│   ├── ghosty.png       # Ghosty player sprite
│   └── jump.wav         # Flap sound
├── img/
│   └── example-ui.png   # Visual reference for the target UI
├── .kiro/
│   ├── specs/           # Feature specs (requirements, design, tasks)
│   └── steering/        # Steering docs (this folder)
├── .gitignore
├── LICENCE.md           # MIT-0
└── README.md
```

## Planned source layout

Game code lives at the root and under `src/` (ES modules), per the spec design:

```
index.html               # Canvas shell; loads src/main.js as a module
src/
├── config.js            # Config object — all tunable constants
├── sim.js               # Pure simulation core: createInitialState, step, reducers, geometry helpers, formatScore
├── input.js             # Input adapter: mouse / touch / Spacebar -> flap
├── render.js            # Renderer adapter: draws state to Canvas 2D
├── audio.js             # Audio adapter: HTMLAudioElement playback
├── storage.js           # Storage adapter: localStorage high-score load/save
└── main.js              # Bootstrap: wires adapters, runs the rAF loop
```

## Conventions

- **Core vs. adapters:** game rules go only in `sim.js`; DOM/canvas/audio/storage live only in their adapter files.
- **Config-driven:** no magic numbers in logic — add tunables to `config.js`.
- **Asset paths** are referenced as `assets/<file>` from code.
- Keep simulation state as plain serializable objects so it stays pure and testable.
