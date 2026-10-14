# Requirements Document

## Introduction

Flappy Kiro is a Flappy Bird-style arcade game. The player controls a white ghost character (Ghosty) that is pulled downward by gravity. By tapping, clicking, or pressing a key, the player makes Ghosty flap upward. The goal is to navigate Ghosty through gaps in a series of horizontally scrolling green pipes without colliding with a pipe, the ground, or the ceiling. The player earns one point for each pipe passed. The game tracks the highest score achieved across play sessions. The game presents a light blue sky background with clouds and a score display showing the current score and the high score.

## Glossary

- **Game**: The Flappy Kiro application that manages state, rendering, input, scoring, and audio.
- **Ghosty**: The player-controlled white ghost character that moves vertically within the play area.
- **Pipe_Pair**: A paired set of a top pipe and a bottom pipe separated by a vertical gap through which Ghosty can pass.
- **Gap**: The vertical opening between the top pipe and bottom pipe of a Pipe_Pair.
- **Play_Area**: The bounded region in which Ghosty moves, bounded by a ceiling (top edge) and ground (bottom edge).
- **Ceiling**: The top boundary of the Play_Area.
- **Ground**: The bottom boundary of the Play_Area.
- **Gravity**: The constant downward acceleration applied to Ghosty.
- **Flap**: The upward velocity impulse applied to Ghosty in response to a player input action.
- **Flap_Input**: A player action consisting of a mouse click, a touch tap, or a designated key press that triggers a Flap.
- **Score**: The count of Pipe_Pairs that Ghosty has successfully passed in the current game session.
- **High_Score**: The highest Score achieved and persisted across game sessions.
- **Collision**: Contact between Ghosty and a pipe, the Ground, or the Ceiling.
- **Ready_State**: The Game state shown before a game session begins, awaiting the first Flap_Input.
- **Playing_State**: The Game state during active play while Ghosty is controllable.
- **Game_Over_State**: The Game state entered after a Collision, during which play is halted.

## Requirements

### Requirement 1: Game Initialization and Ready State

**User Story:** As a player, I want the game to present a ready screen when it loads, so that I can prepare before gameplay begins.

#### Acceptance Criteria

1. WHEN the Game finishes loading, THE Game SHALL enter the Ready_State.
2. WHILE in the Ready_State, THE Game SHALL display Ghosty within the Play_Area at a fixed starting vertical position.
3. WHILE in the Ready_State, THE Game SHALL display the light blue sky background with clouds.
4. WHILE in the Ready_State, THE Game SHALL display the current Score as 0.
5. WHILE in the Ready_State, THE Game SHALL display the High_Score.
6. WHILE in the Ready_State, THE Game SHALL hold Ghosty stationary until the first Flap_Input is received.

### Requirement 2: Starting a Game Session

**User Story:** As a player, I want to start playing by providing an input, so that I can begin controlling Ghosty.

#### Acceptance Criteria

1. WHILE in the Ready_State, WHEN a Flap_Input is received, THE Game SHALL transition to the Playing_State.
2. WHEN the Game transitions to the Playing_State, THE Game SHALL set the Score to 0.
3. WHEN the Game transitions to the Playing_State, THE Game SHALL begin applying Gravity to Ghosty starting on the first frame of the Playing_State.
4. WHEN the Game transitions to the Playing_State, THE Game SHALL apply exactly one Flap to Ghosty.
5. WHEN the Game transitions to the Playing_State, THE Game SHALL generate at least one Pipe_Pair positioned at or beyond the right edge of the Play_Area.
6. WHEN the Game transitions to the Playing_State, THE Game SHALL begin scrolling all Pipe_Pairs horizontally through the Play_Area.

### Requirement 3: Gravity and Falling

**User Story:** As a player, I want Ghosty to fall naturally when I do not act, so that the game presents a continuous challenge.

#### Acceptance Criteria

1. WHILE in the Playing_State, THE Game SHALL apply Gravity to Ghosty on every frame to increase Ghosty's downward velocity.
2. WHILE in the Playing_State, THE Game SHALL update Ghosty's vertical position each frame according to Ghosty's current velocity.

### Requirement 4: Flap Control

**User Story:** As a player, I want to make Ghosty flap upward with an input, so that I can navigate through pipe gaps.

#### Acceptance Criteria

1. WHEN a Flap_Input is received WHILE in the Playing_State, THE Game SHALL set Ghosty's vertical velocity to a fixed upward Flap value.
2. WHEN a Flap is applied, THE Game SHALL play the jump sound from `assets/jump.wav`.
3. THE Game SHALL accept a mouse click, a touch tap, and a Spacebar key press as a Flap_Input.

### Requirement 5: Scrolling Pipes

**User Story:** As a player, I want pipes to scroll toward Ghosty with gaps to fly through, so that I have obstacles to navigate.

#### Acceptance Criteria

1. WHILE in the Playing_State, THE Game SHALL move each Pipe_Pair horizontally toward Ghosty from the right edge to the left edge of the Play_Area at a fixed scroll speed that remains the same for every Pipe_Pair throughout the game session.
2. WHILE in the Playing_State, THE Game SHALL generate each new Pipe_Pair with a Gap whose vertical center position is randomized such that the entire Gap, including its full height, falls within the Play_Area with at least a fixed minimum margin between the Gap and both the Ceiling and the Ground.
3. WHILE in the Playing_State, THE Game SHALL set the vertical height of each Gap to a fixed value that is at least large enough for Ghosty to pass through without contacting either pipe, and SHALL keep this Gap height identical across all Pipe_Pairs.
4. THE Game SHALL render each Pipe_Pair as a green top pipe extending from the Ceiling down to the top of the Gap and a green bottom pipe extending from the bottom of the Gap down to the Ground.
5. WHEN a Pipe_Pair's right edge moves completely past the left edge of the Play_Area, THE Game SHALL remove that Pipe_Pair from the Play_Area.
6. WHILE in the Playing_State, THE Game SHALL maintain a fixed, equal horizontal spacing between the leading edges of consecutive Pipe_Pairs that remains the same throughout the game session.

### Requirement 6: Scoring

**User Story:** As a player, I want to earn points for passing pipes, so that I can measure my performance.

#### Acceptance Criteria

1. WHEN Ghosty passes a Pipe_Pair without a Collision, THE Game SHALL increase the Score by 1.
2. WHILE in the Playing_State, THE Game SHALL display the current Score.
3. WHEN the Score increases, THE Game SHALL display the updated Score within the same frame the increase is applied.

### Requirement 7: Collision and Game Over

**User Story:** As a player, I want the game to end when Ghosty crashes, so that the challenge has consequences.

#### Acceptance Criteria

1. WHEN Ghosty's rendered bounds overlap the rendered bounds of either pipe of any Pipe_Pair WHILE in the Playing_State, THE Game SHALL register a Collision.
2. WHEN Ghosty's rendered bounds reach or cross the Ground WHILE in the Playing_State, THE Game SHALL register a Collision.
3. WHEN Ghosty's rendered bounds reach or cross the Ceiling WHILE in the Playing_State, THE Game SHALL register a Collision.
4. WHEN a Collision is registered WHILE in the Playing_State, THE Game SHALL transition to the Game_Over_State exactly once, ignoring any further Collisions registered in the same frame.
5. WHEN the Game transitions to the Game_Over_State, THE Game SHALL play the game over sound from `assets/game_over.wav` one time.
6. IF the game over sound from `assets/game_over.wav` cannot be played when the Game transitions to the Game_Over_State, THEN THE Game SHALL continue the transition to the Game_Over_State without halting.
7. WHILE in the Game_Over_State, THE Game SHALL stop scrolling Pipe_Pairs so that each Pipe_Pair's horizontal position remains unchanged across frames.
8. WHILE in the Game_Over_State, THE Game SHALL stop applying Gravity to Ghosty and hold Ghosty's vertical position unchanged across frames.
9. WHILE in the Game_Over_State, THE Game SHALL ignore Flap_Input for Ghosty movement so that no Flap is applied to Ghosty.

### Requirement 8: High Score Tracking

**User Story:** As a player, I want my best score remembered, so that I can try to beat it.

#### Acceptance Criteria

1. WHEN the Game transitions to the Game_Over_State, IF the Score is greater than the High_Score, THEN THE Game SHALL set the High_Score to the Score before displaying the Game_Over_State values.
2. WHEN the High_Score is set to a new value, THE Game SHALL persist the High_Score to the player's device so that the persisted High_Score is loaded and available after the Game is reloaded.
3. IF persisting the High_Score fails, THEN THE Game SHALL retain the current in-session High_Score value and continue operating without interrupting play.
4. WHEN the Game finishes loading, THE Game SHALL load the High_Score from persistent storage, and IF no High_Score has been previously persisted, THEN THE Game SHALL initialize the High_Score to 0.
5. WHILE in the Ready_State, THE Game SHALL display the loaded High_Score.
6. WHILE in the Game_Over_State, THE Game SHALL display the final Score of the completed session and the current High_Score, where the displayed High_Score reflects any update applied in criterion 1.

### Requirement 9: Restarting the Game

**User Story:** As a player, I want to restart after a game over, so that I can play again without reloading.

#### Acceptance Criteria

1. WHILE in the Game_Over_State, THE Game SHALL display a prompt indicating how to restart.
2. WHEN a Flap_Input is received WHILE in the Game_Over_State, THE Game SHALL transition to the Ready_State.
3. WHEN the Game transitions to the Ready_State from the Game_Over_State, THE Game SHALL remove all existing Pipe_Pairs from the Play_Area.
4. WHEN the Game transitions to the Ready_State from the Game_Over_State, THE Game SHALL reset Ghosty to the fixed starting vertical position.

### Requirement 10: Rendering and Presentation

**User Story:** As a player, I want a clear visual presentation, so that I can see Ghosty, the obstacles, and my progress.

#### Acceptance Criteria

1. THE Game SHALL render Ghosty using the sprite from `assets/ghosty.png`.
2. THE Game SHALL render the light blue sky background with cloud shapes.
3. THE Game SHALL display the Score and High_Score in the format `Score: {score} | High: {highScore}`.
4. WHILE in the Playing_State, THE Game SHALL redraw the Play_Area each frame to reflect the current positions of Ghosty and all Pipe_Pairs.
