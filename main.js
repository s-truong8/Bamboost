// main.js: the conductor of the app.
// It owns the shared game state, shows one screen at a time,
// and (later) will call the other files at the right moment.

import { enterSetupScreen, leaveSetupScreen, enterCompressionsScreen, leaveCompressionsScreen, isCameraReady, turnOffCamera } from "./camera.js";

import { loadScript, playStep, stopScenario } from "./scenario.js";
import { computeScore } from "./score.js";

// ============================================================
// SHARED GAME STATE
// ============================================================
// Times are in seconds, read with: performance.now() / 1000
// (the same clock that tracking.js uses for onCompression).
export const game = {
  startTime: null,             // when the emergency scene started
  firstCompressionTime: null,  // when the player did their first compression
  correctDecisions: 0,         // how many dispatcher questions were answered right
  totalDecisions: 0,           // how many dispatcher questions were asked
  compressionStats: null,      // the object returned by stopTracking()
  compressionSeconds: null,    // how long the compressions last (set when they start)
  decisionLog: [],             // one line per dispatcher step: { id, title, wrongAnswers, timedOut, seconds }
};

// Put the game state back to zero before a new game
function resetGame() {
  document.getElementById("victim-scene").className = ""; // no phone
  game.startTime = null;
  game.firstCompressionTime = null;
  game.correctDecisions = 0;
  game.totalDecisions = 0;
  game.compressionStats = null;
  game.compressionSeconds = null;
  game.decisionLog = [];
}

// ============================================================
// SCREENS
// ============================================================
// Show one screen and hide all the others.
// name is the part after "screen-". Order of the game:
// "home", "setup", "scene", "decisions", "tutorial", "compressions", "ambulance", "results".
let currentScreenName = "home";

export function showScreen(name) {
  const screenToShow = document.getElementById("screen-" + name);
  if (screenToShow === null) {
    console.error("showScreen: there is no screen called " + name);
    return;
  }

  // Tell camera.js when we leave one of its screens
  if (currentScreenName === "setup") {
    leaveSetupScreen();
  }
  if (currentScreenName === "compressions") {
    stopAmbulanceTimer();
    leaveCompressionsScreen(game);
  }
  // Stop the step timer if the player quits during the steps
  if (currentScreenName === "decisions") {
    stopScenario();
  }

  const allScreens = document.querySelectorAll(".screen");
  for (const screen of allScreens) {
    screen.classList.remove("active");
  }

  screenToShow.classList.add("active");
  currentScreenName = name;
  window.scrollTo(0, 0);

  // style.css reads this to pick the top bar and fill the progress bar
  document.body.dataset.screen = name;

  // The emergency screens are shown like a game: the scene fills the
  // screen and the screen itself is a dialogue box at the bottom
  const gameScreens = ["scene", "decisions", "tutorial", "compressions", "ambulance"];
  if (gameScreens.includes(name)) {
    document.body.classList.add("game-mode");
  } else {
    document.body.classList.remove("game-mode");
  }

  // Tell camera.js when we enter one of its screens
  if (name === "setup") {
    enterSetupScreen();
  }
  // The emergency starts: the "fast start" score counts from here
  if (name === "scene") {
    game.startTime = performance.now() / 1000;
  }
  if (name === "decisions") {
    startSteps();
  }
  if (name === "compressions") {
    enterCompressionsScreen(game);
    startAmbulanceTimer();
  }
  if (name === "results") {
    // The camera stays on from the setup screen until the end of the game
    turnOffCamera();
    showResults();
  }
}

// ============================================================
// AMBULANCE TIMER: 30 seconds of compressions, then the ambulance arrives
// ============================================================
const AMBULANCE_DELAY = 30; // seconds
let ambulanceTimerId = null;

function stopAmbulanceTimer() {
  clearInterval(ambulanceTimerId);
  ambulanceTimerId = null;
}

function startAmbulanceTimer() {
  stopAmbulanceTimer();
  game.compressionSeconds = AMBULANCE_DELAY; // score.js needs it to judge "enough compressions"
  const display = document.getElementById("ambulance-countdown");
  const endTime = performance.now() + AMBULANCE_DELAY * 1000;
  display.textContent = AMBULANCE_DELAY;
  display.classList.remove("timer-low");
  // We read the real clock each time, because setInterval can run late
  ambulanceTimerId = setInterval(function () {
    const left = Math.max(0, Math.ceil((endTime - performance.now()) / 1000));
    display.textContent = left;
    display.classList.toggle("timer-low", left <= 5);
    if (left === 0) {
      showScreen("ambulance");
    }
  }, 200);
}

// ============================================================
// THE STEPS BEFORE CPR (scenario.js does the work)
// ============================================================
async function startSteps() {
  try {
    const steps = await loadScript();
    playStep(steps[0].id);
  } catch (error) {
    console.error("Could not load script.json", error);
  }
}

// ============================================================
// RESULTS SCREEN
// ============================================================
// Writes the score from score.js into the results screen.
function showResults() {
  const score = computeScore(game);
  document.getElementById("result-grade").textContent = score.grade;
  document.getElementById("result-total").textContent = score.total;
  document.getElementById("result-grade-label").textContent = score.gradeLabel;
  document.getElementById("result-tip").textContent = score.tip;
  drawGrid(score);
}

// The evaluation grid: one line per criterion, and under "The calls"
// one small line per dispatcher step.
function drawGrid(score) {
  const body = document.getElementById("eval-body");
  body.innerHTML = "";

  for (const row of score.rows) {
    body.appendChild(makeGridRow(row, false));
    if (row.id === "calls") {
      for (const step of score.steps) {
        body.appendChild(makeGridRow({
          label: step.label,
          measured: "",
          target: "",
          result: step.result,
          points: step.points,
          max: step.max,
          status: step.status,
        }, true));
      }
    }
  }

  document.getElementById("eval-total").textContent = score.total + " / 100";
}

// What the player reads in the last column, next to the colored mark
const STATUS_WORDS = { good: "Good", warn: "Almost", bad: "Work on it" };

function makeGridRow(row, isSub) {
  const tr = document.createElement("tr");
  if (isSub) {
    tr.className = "eval-sub";
  }

  // Criterion (and what is measured, in small letters)
  const nameCell = document.createElement("th");
  nameCell.scope = "row";
  nameCell.textContent = row.label;
  if (row.measured) {
    const small = document.createElement("span");
    small.className = "eval-measured";
    small.textContent = row.measured;
    nameCell.appendChild(small);
  }
  tr.appendChild(nameCell);

  // Target
  const targetCell = document.createElement("td");
  targetCell.className = "eval-target";
  targetCell.textContent = row.target;
  tr.appendChild(targetCell);

  // Your result
  const resultCell = document.createElement("td");
  resultCell.textContent = row.result;
  tr.appendChild(resultCell);

  // Points
  const pointsCell = document.createElement("td");
  pointsCell.className = "eval-points";
  pointsCell.textContent = row.points + " / " + row.max;
  tr.appendChild(pointsCell);

  // Status: a colored word (never color alone)
  const statusCell = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = "eval-badge " + row.status;
  badge.textContent = STATUS_WORDS[row.status];
  statusCell.appendChild(badge);
  tr.appendChild(statusCell);

  return tr;
}

// ============================================================
// BUTTONS
// ============================================================
// "Start the simulation" (there are two on the home page)
const startButtons = document.querySelectorAll(".start-button");
for (const button of startButtons) {
  button.addEventListener("click", function () {
    resetGame();
    // The setup screen is the check before each game:
    // if the camera already works, it is not needed.
    if (isCameraReady()) {
      showScreen("scene");
    } else {
      showScreen("setup");
    }
  });
}

// The X in the top bar: quit the game
document.getElementById("quit-button").addEventListener("click", function () {
  turnOffCamera();
  showScreen("home");
});

// The simple "go to the next screen" buttons.
// Each one has data-next="..." in index.html: the screen it goes to.
const nextButtons = document.querySelectorAll(".next-button");
for (const button of nextButtons) {
  button.addEventListener("click", function () {
    showScreen(button.dataset.next);
  });
}

// For the team: open index.html?screen=results (or any screen name)
// to jump straight to that screen while working on its design.
const screenFromAddress = new URLSearchParams(window.location.search).get("screen");
if (screenFromAddress !== null) {
  showScreen(screenFromAddress);
}
