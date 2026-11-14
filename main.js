// main.js: the conductor of the app.
// It owns the shared game state, shows one screen at a time,
// and (later) will call the other files at the right moment.

// These imports are not used yet. They are here so that a mistake in one
// of these files shows up in the console as soon as the page opens.
import { initTracking, startTracking, stopTracking } from "./tracking.js";
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
export function showScreen(name) {
  const allScreens = document.querySelectorAll(".screen");
  for (const screen of allScreens) {
    screen.classList.remove("active");
  }

  const screenToShow = document.getElementById("screen-" + name);
  if (screenToShow === null) {
    console.error("showScreen: there is no screen called " + name);
    return;
  }
  screenToShow.classList.add("active");
}

// ============================================================
// TEMPORARY: "Next" buttons to click through all the screens
// ============================================================
// Each button has data-next="..." in index.html: the screen it goes to.
// Remove this once the real game flow exists.
const nextButtons = document.querySelectorAll(".next-button");
for (const button of nextButtons) {
  button.addEventListener("click", function () {
    showScreen(button.dataset.next);
  });
}
