// main.js: the conductor of the app.
// It owns the shared game state, shows one screen at a time,
// and (later) will call the other files at the right moment.

import { enterSetupScreen, leaveSetupScreen, enterCompressionsScreen, leaveCompressionsScreen, isCameraReady, turnOffCamera } from "./camera.js";

// These imports are not used yet. They are here so that a mistake in one
// of these files shows up in the console as soon as the page opens.
import { loadScript, playStep } from "./scenario.js";
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
};

// ============================================================
// SCREENS
// ============================================================
// Show one screen and hide all the others.
// name is the part after "screen-": "home", "setup", "tutorial", "scene",
// "decisions", "compressions", "ambulance" or "results".
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
    leaveCompressionsScreen(game);
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

  // Tell camera.js when we enter one of its screens
  if (name === "setup") {
    enterSetupScreen();
  }
  if (name === "compressions") {
    enterCompressionsScreen(game);
  }
  if (name === "results") {
    // The camera stays on from the setup screen until the end of the game
    turnOffCamera();
    showResults();
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
  document.getElementById("result-speed").textContent = score.speed;
  document.getElementById("result-decisions").textContent = score.decisions;
  document.getElementById("result-rate").textContent = score.rate;
  document.getElementById("result-pauses").textContent = score.pauses;
  document.getElementById("result-tip").textContent = score.tip;
}

// ============================================================
// TEMPORARY: "Next" buttons to click through all the screens
// ============================================================
// Each button has data-next="..." in index.html: the screen it goes to.
// Remove this once the real game flow exists.
const nextButtons = document.querySelectorAll(".next-button");
for (const button of nextButtons) {
  button.addEventListener("click", function () {
    let nextScreen = button.dataset.next;
    // The setup screen is the check before each game:
    // if the camera already works, it is not needed.
    if (nextScreen === "setup" && isCameraReady()) {
      nextScreen = "tutorial";
    }
    showScreen(nextScreen);
  });
}

// For the team: open index.html?screen=results (or any screen name)
// to jump straight to that screen while working on its design.
const screenFromAddress = new URLSearchParams(window.location.search).get("screen");
if (screenFromAddress !== null) {
  showScreen(screenFromAddress);
}
