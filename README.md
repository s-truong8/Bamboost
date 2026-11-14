# [APP NAME]

A CPR training game with [MASCOT NAME], a panda.

The player goes through a 2-minute emergency: a man collapses, a dispatcher voice asks them to make decisions (buttons), then they do chest compressions on a cushion in front of the webcam, then the ambulance arrives and they get a grade.

Screens, in order: home, setup (camera check), tutorial, scene, decisions, compressions, ambulance, results.

**Safety:** practice on a firm cushion. Never practice on a real person.

## How to run it

Plain HTML, CSS and JavaScript. No install, no build step.

1. Open this folder in VS Code.
2. Install the "Live Server" extension (by Ritwick Dey).
3. Right-click `index.html` and choose "Open with Live Server".

Opening `index.html` by double-clicking does not work: ES modules and the camera need a local server. You also need internet, because MediaPipe is loaded from a CDN.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The page: one `<section>` per screen. |
| `style.css` | Layout and color theme. |
| `main.js` | Shared `game` state, `showScreen(name)`, temporary Next buttons. |
| `tracking.js` | Webcam and pose detection: counts compressions, rate, pauses, arm straightness. The only file that uses MediaPipe. |
| `camera.js` | Connects `tracking.js` to the setup and compressions screens: camera button, arm check, live feedback. |
| `scenario.js` | Dispatcher conversation: `loadScript()` and `playStep(id)`. Stubs for now. |
| `score.js` | `computeScore(game)`: turns the game state into a grade. Fake values for now. |
| `script.json` | The dispatcher lines and choices. Placeholders for now. |
| `assets/` | Images and sounds. Empty for now. |
| `.gitignore` | Files git should ignore. |

## Team contracts

These are the agreements between files. Don't change one without telling the team.

### showScreen (main.js)

```js
showScreen(name)
```

Shows one screen and hides all the others. `name` is the part after `screen-` in the section id:
`home`, `setup`, `tutorial`, `scene`, `decisions`, `compressions`, `ambulance`, `results`.

Section ids in `index.html`: `screen-home`, `screen-setup`, `screen-tutorial`, `screen-scene`, `screen-decisions`, `screen-compressions`, `screen-ambulance`, `screen-results`.

### The game object (main.js)

```js
game = { startTime, firstCompressionTime, correctDecisions, totalDecisions, compressionStats }
```

| Field | Meaning |
| --- | --- |
| `startTime` | When the emergency scene started. |
| `firstCompressionTime` | When the player did their first compression. |
| `correctDecisions` | How many dispatcher questions were answered right. |
| `totalDecisions` | How many dispatcher questions were asked. |
| `compressionStats` | The object returned by `stopTracking()`. |

Times are in seconds, read with `performance.now() / 1000`. This is the same clock as the `time` given to `onCompression`, so the two can be subtracted.

`main.js` exports `game` and `showScreen`, so another file can write `import { game, showScreen } from "./main.js";`. Only use them inside functions, not at the top level of your file.

### Tracking interface (tracking.js)

```js
initTracking(videoElement, canvasElement)  // loads the model and camera, returns a Promise
startTracking(callbacks)                   // callbacks: onCompression(time), onRate(rate), onPause(), onArmStatus(isStraight), onArmDetected(isDetected), onDepth(isDeepEnough)
stopTracking()                             // returns { count, averageRate, percentInRange, pauses, percentArmsStraight, percentDeepEnough }
```

Callbacks (all optional):

| Callback | When it is called |
| --- | --- |
| `onCompression(time)` | At each compression. `time` is in seconds. |
| `onRate(rate)` | At each compression from the 3rd one. `rate` is in compressions per minute. |
| `onPause()` | Once each time the player stops for more than 2 seconds. |
| `onArmStatus(isStraight)` | When the arm changes between straight (`true`) and bent (`false`). |
| `onArmDetected(isDetected)` | When we start (`true`) or stop (`false`) seeing the arm. |
| `onDepth(isDeepEnough)` | When the last 3 pushes change between deep enough (`true`) and too shallow (`false`). |

What `stopTracking()` returns:

| Field | Meaning |
| --- | --- |
| `count` | Number of compressions. |
| `averageRate` | Average compressions per minute over the session. |
| `percentInRange` | Percent of compressions done at 100 to 120 per minute. |
| `pauses` | Number of pauses. |
| `percentArmsStraight` | Percent of the time the arm was straight. |
| `percentDeepEnough` | Percent of pushes that were deep enough (an estimate: a webcam can't measure centimetres exactly). |

Notes:

- Call `initTracking` once. After it, the camera stays on and the skeleton is drawn on the canvas.
- The canvas must sit exactly on top of the video in CSS (same size) for the skeleton to line up.
- You can call `startTracking` again after `stopTracking` to play again.
- `stopCamera()` turns the webcam off at the end of the game (the results screen). `initTracking` turns it on again; the model is not reloaded.
- Debug only (used by the debug panel on the setup screen): `setSensitivity(value)` changes the minimum dip (default 0.07 forearm length), `setGoodDepth(value)` changes the depth that counts as deep enough (default 0.15 forearm length, about 4 cm), and `getDebugData()` returns the last 5 seconds of the signal and the camera fps. The game itself should not need them.

### script.json format

A list of steps. Each step:

```json
{ "id": "...", "line": "...", "choices": [ { "text": "...", "correct": true, "next": "..." }, { "text": "...", "correct": false, "feedback": "..." } ], "timeLimit": 8 }
```

| Field | Meaning |
| --- | --- |
| `id` | Unique name of the step. |
| `line` | What the dispatcher says. |
| `choices` | The buttons shown to the player. |
| `choices[].text` | The text on the button. |
| `choices[].correct` | `true` for the right answer, `false` otherwise. |
| `choices[].next` | Correct choices only: the `id` of the step to play next. |
| `choices[].feedback` | Wrong choices only: what to tell the player. |
| `timeLimit` | Seconds the player has to answer. |

In the placeholder file, the last step uses `"next": "end"` to mean "the conversation is over". This is only a suggestion: the team still has to agree on it.

All medical content must come from official sources. The current text is placeholder only.
