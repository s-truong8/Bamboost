# Pandaid CPR

A CPR training game with Pandaid, a red panda.

The home page presents the project. The player clicks "Start the simulation", checks the camera, then a man collapses. Like a game, the player must validate each step before CPR (is it safe, does he respond, is he breathing, the call, talking to the dispatcher), against a timer. Then they do chest compressions on a cushion in front of the webcam, the ambulance arrives and they get a grade.

Screens, in order: home (presentation page), setup (camera check), scene (the collapse), decisions (the steps before CPR), tutorial (how to push), compressions, ambulance, results.

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
| `main.js` | Shared `game` state, `showScreen(name)`, the start / quit / next buttons. |
| `tracking.js` | Webcam and pose detection: counts compressions, rate, pauses, arm straightness. The only file that uses MediaPipe. |
| `camera.js` | Connects `tracking.js` to the setup and compressions screens: camera button, arm check, live feedback. |
| `scenario.js` | The steps before CPR, like a game: `loadScript()`, `playStep(id)`, `stopScenario()`. |
| `score.js` | `computeScore(game)`: turns the game into a grade out of 100 and the evaluation grid. All the numbers to tune are at the top of the file. |
| `script.json` | The steps, questions and choices. Draft text, to check with official sources. |
| `assets/` | Images and sounds. `assets/mascot-stickers/` has the 20 red panda stickers. |
| `.gitignore` | Files git should ignore. |

## Team contracts

These are the agreements between files. Don't change one without telling the team.

### showScreen (main.js)

```js
showScreen(name)
```

Shows one screen and hides all the others. `name` is the part after `screen-` in the section id:
`home`, `setup`, `scene`, `decisions`, `tutorial`, `compressions`, `ambulance`, `results` (the order of the game).

Section ids in `index.html`: `screen-home`, `screen-setup`, `screen-scene`, `screen-decisions`, `screen-tutorial`, `screen-compressions`, `screen-ambulance`, `screen-results`.

What `showScreen` also does:
- entering `scene` sets `game.startTime` (the emergency starts);
- entering `decisions` loads `script.json` and plays the first step;
- the setup "Continue" button stays locked until the camera works.

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

### UI hooks (index.html)

The design is in `style.css` (colors at the top, in `:root`). `showScreen` sets `<body data-screen="...">`, and the CSS uses it to show the right top bar and fill the progress bar.

**Game mode.** On the emergency screens (`scene`, `decisions`, `tutorial`, `compressions`, `ambulance`), `showScreen` adds the class `game-mode` to `<body>`. The drawing `#victim-scene` (a street with the collapsed man) then fills the whole screen, and each screen is a dialogue box at the bottom (`.dialogue`: portrait, name, text, actions). During compressions the camera is a small window in the corner. The drawing changes with classes on `#victim-scene`: `after-<step id>` (added by `scenario.js` when a step is validated: `after-call` shows the phone) and `press` (added by `camera.js` at each compression).

**Zoom circle.** On the same two screens, a round window (`#hands-lens`, top-left) shows a close-up of the chest from above: hands stacked, fingers interlaced, the heel of the hand on the center of the chest. Its hands dip at each compression. It is hidden on screens narrower than 1000 px. The hand placement follows the centre-of-the-chest guidance in the references below.

**Sound effects (sfx.js).** No sound files: each effect is a few notes made with the Web Audio API. `sfx("correct")` plays one (list: the `EFFECTS` object). They are called from `main.js` (screens, ambulance countdown, results grade), `scenario.js` (right and wrong answers, the step timer ticks) and `camera.js` (one soft thump per counted compression). The speaker button at the top right (`#mute-button`) mutes the effects and the panda's voice, and the choice is remembered. Browsers only allow sound after a click, so the audio starts at the first click.

**Metronome (sfx.js).** On the compressions screen a steady beat at 110 per minute (`METRONOME_BPM`, the middle of the 100 to 120 target) plays a wooden metronome "tok" (a little higher and louder on the first of every four beats; the countdown to the ambulance has no tick, so nothing covers the beat), and the red dot of the HUD pulses on each beat. It starts when the screen opens (`startMetronome()` in `main.js`) and stops when it closes. The beats are scheduled on the audio clock, so the timing stays exact even when the camera tracking is busy. The mute button silences the clicks, but the dot keeps pulsing.

**The panda in the scene (panda.js).** On the game screens the panda coach is a big character (`#scene-panda`) standing behind the dialogue box, on the right, his feet hidden by the box. The small pictures inside the boxes (`.dialogue-portrait`, `#live-panda`) are hidden by CSS: they only tell `panda.js` which face to show (it copies their `src`, and their `speaking` class when the voice plays). So to change his face, keep changing those pictures as before.

**Voice (audio.js).** During the compressions, Pandaid speaks with the files in `assets/audio` (names match the lines: `faster.mp3`, `slower.mp3`, `good-rhythm.mp3`, `push-deeper.mp3`, `good-depth.mp3`, `keep-going.mp3`, `straighten-arms.mp3`, `cant-see-arm.mp3`, `ringing-phone.mp3` (the phone ringing when you call: only its first beep is played, `stopAfter` in `scenario.js`), `dispatcher.mp3` (the dispatcher's "911, what is your emergency?", played by `scenario.js` about 0.9 s after the dispatcher step appears), `doing-great-1..3.mp3`, `start-compressions.mp3`). `camera.js` calls `say("name")` when the tracking reports a change. `audio.js` plays one line at a time, never repeats the same line within 6 s, and `camera.js` adds an encouragement after 15 s of good work.

**Chest zoom.** On the `tutorial` and `compressions` screens, `style.css` zooms the whole drawing (the group `.victim-world`) 2.4x onto the man's chest, with a pulsing ring and the label "Hands here". The numbers are in the `translate(...) scale(2.4)` rule: to move the chest on the screen, change the two `translate` values; to zoom more or less, change the `2.4`.

Elements filled by `scenario.js` (decisions screen):

| Id | What goes there |
| --- | --- |
| `step-map` | One numbered dot per step: `done`, `current` or `locked`. |
| `step-title` | "Step 2 of 6: Does he respond?" |
| `step-mascot` | The red panda sticker: thinking, right, wrong or too slow. |
| `step-speaker` | "Pandaid" or "Dispatcher" (blue bubble). |
| `dispatcher-line` | The question. |
| `choices` | One `<button class="choice">` per choice. Keys 1, 2, 3 also work. |
| `decision-timer` | The countdown bar (red for the last 3 seconds). |
| `decision-feedback` | Why a choice is wrong, or "Step validated!". |

Rules of the steps game: the player must find the right answer to validate a step and unlock the next one. A step counts in `game.correctDecisions` only if it's right on the first try, before the timer ends.

The results screen is filled by `main.js` with `computeScore(game)`: `result-grade`, `result-total`, `result-speed`, `result-decisions`, `result-rate`, `result-pauses`, `result-tip`.

To work on one screen's design, open `index.html?screen=results` (or any screen name): it jumps straight there.

### Grading (score.js)

The grade is out of 100. Wrong answers, time-outs and doing the wrong thing for a long time all cost points. The results screen shows the whole calculation as a grid.

| Criterion | Points | Rule |
| --- | --- | --- |
| The calls | 30 | Split equally between the dispatcher steps. Each step has ONE answer: right and in time = full, right but after the timer = half, wrong = 0 (the game then shows the right answer and moves on). |
| Fast start | 15 | Time from the collapse to the first compression: full up to 60 s, a straight line down to 0 at 150 s. |
| Rhythm | 20 | % of compressions done at 100 to 120 per minute. |
| Depth | 15 | % of compressions that were deep enough. |
| Straight arms | 10 | % of the time the arms were straight. |
| Keep going | 10 | Enough compressions (80% of 100 per minute), minus 3 points per pause over 2 s. |

Grades: A 90+, B 75+, C 60+, D 40+, F below 40. The tip is about the criterion where the player lost the most points.

To record the steps, `scenario.js` fills `game.decisionLog` (one `{ id, title, wrongAnswers, timedOut, seconds }` per step) and `main.js` sets `game.compressionSeconds`.

### script.json format

A list of steps. Each step:

```json
{ "id": "...", "title": "...", "speaker": "coach", "source": "...", "line": "...", "choices": [ { "text": "...", "correct": true, "next": "...", "feedback": "..." }, { "text": "...", "correct": false, "feedback": "..." } ], "timeLimit": 8 }
```

| Field | Meaning |
| --- | --- |
| `id` | Unique name of the step. |
| `title` | Short name shown above the question ("Is it safe?"). |
| `speaker` | `"coach"` (the red panda) or `"dispatcher"` (blue bubble). |
| `source` | Where the content comes from. Not shown in the game. |
| `line` | The question. |
| `choices` | The buttons shown to the player. |
| `choices[].text` | The text on the button. |
| `choices[].correct` | `true` for the right answer, `false` otherwise. |
| `choices[].next` | Correct choices only: the `id` of the step to play next. |
| `choices[].feedback` | Why the choice is wrong. Optional on the right choice: shown after "Step validated!". |
| `timeLimit` | Seconds the player has to answer. |

`"next": "end"` on the last step means "all steps are validated": the game goes to the tutorial, then the compressions. The first step of the file is the first step of the game.

All medical content must come from official sources. The current steps are a DRAFT: check every line, and the emergency number of your country (the draft uses 911), against official guidelines (for example ERC or AHA Basic Life Support).

## References (Canada)

The advice in the game follows Canadian first-aid guidance. The facts below were checked against these documents in November 2026 (the same list is in the "Sources" pop-up of the game, `#sources` in `index.html`, and the `source` field of each step in `script.json`):

| What the game says | Source |
| --- | --- |
| Phone 9-1-1 and get or shout for an AED; speaker mode if alone | [Heart & Stroke, Hands-Only CPR poster](https://www.heartandstroke.ca/-/media/pdf-files/cpr/hands-only-cpr-poster-en.pdf); [Canadian Red Cross, First Aid & CPR learner guide (2025)](https://cdn.redcross.ca/prodmedia/crc/azure/documents/first-aid-program-2025/fa_cpr_learner_guide_en.pdf) |
| Push hard and fast in the centre of the chest, 100 to 120 per minute | Both documents above |
| At least 5 cm deep for an adult, let the chest recoil | Red Cross learner guide, "CPR Compression Depth" |
| Hands-only CPR is acceptable for adults (dispatchers coach it) | Red Cross learner guide; [Heart & Stroke, 2025 Highlights, Canadian edition](https://cpr.heartandstroke.ca/resource/GuidelinesHighlightsEN2025) |
| Check the scene, check if the person responds, check breathing for 5 to 10 s; gasping is not normal breathing | Red Cross learner guide, "Check, Call, Care" |

Not in the game on purpose: rescue breaths (the game teaches the hands-only method) and the AED steps. The 2025 Canadian guidelines are summarized in the Heart & Stroke Highlights above; the full text is the American Heart Association 2025 Guidelines. Pandaid CPR is not affiliated with or endorsed by these organizations. Check the latest edition before the demo.
