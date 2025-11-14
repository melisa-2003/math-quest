© 2025 Melisa Lai. All Rights Reserved.
# Math Quest

A lightweight browser-based math practice game (Chinese Traditional UI). Open [index.html](index.html) in a modern browser to run the app locally.

## Quick Start

1. Open [index.html](index.html) in your browser.
2. Press the **Start Game** button.
3. Answer questions in the numeric input and press **Submit** or press Enter. Use **Skip** to skip a question.

Files:
- [index.html](index.html)
- [styles.css](styles.css)
- [script.js](script.js)

## Features

- Multiple modes: Ramp, Mixed, Advanced (configured in the UI)
- Question types: basic arithmetic, division, two-step, three-step, sequence, simple equations
- Per-question time limits and point values (see [`TIME_LIMITS`](script.js) and [`POINTS`](script.js))
- Local leaderboard stored in localStorage
- Sound feedback for correct/wrong/urgent (`playCorrect`, `playWrong`, `playUrgent` in [script.js](script.js))

## How it works (overview)

- Questions are generated in [script.js](script.js) using generator functions such as [`genOne`](script.js), [`genBasic`](script.js), [`genDivision`](script.js), [`genTwoStep`](script.js) and [`genThreeStep`](script.js).
- The set of questions is built by [`buildQuestions`](script.js) according to the selected mode and total count.
- Game flow is managed by functions like [`startGame`](script.js), [`submitAnswer`](script.js) and `nextQuestion` in [script.js](script.js).
- Timer and UI updates are handled by `startTimer` and `showQuestion` in [script.js](script.js).

## Configuration & UI

- Number of questions: select element with id `totalSelect` in [index.html](index.html)
- Mode: select element with id `modeSelect` in [index.html](index.html)
- Styling: modify [styles.css](styles.css)

## Development notes

- The app binds on `DOMContentLoaded` in [script.js](script.js). Ensure element IDs in [index.html](index.html) are not renamed unless updating the script.
- Leaderboard and best score are persisted via `localStorage` keys `mathQuestBoard` and `mathQuestBest` (see [script.js](script.js)).
- Audio uses WebAudio; some browsers require user interaction to enable playback.

## Deployment

- Static site hosting (GitHub Pages / Netlify / Vercel / CodeSandbox) works by publishing the project folder as-is.

## License

MIT
