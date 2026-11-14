// camera.js: connects tracking.js to the two screens that use the webcam.
// - setup screen: turn on the camera and check that we can see the player's arm
// - compressions screen: live feedback while the player does compressions
//
// main.js calls the 4 functions at the bottom when the player enters or
// leaves one of these screens.

import { initTracking, startTracking, stopTracking, setSensitivity, getDebugData } from "./tracking.js";

// Same target as in tracking.js: 100 to 120 compressions per minute
const TARGET_MIN = 100;
const TARGET_MAX = 120;

// ============================================================
// PAGE ELEMENTS
// ============================================================
const cameraBox = document.getElementById("camera-box");
const video = document.getElementById("camera-video");
const canvas = document.getElementById("camera-canvas");

// Setup screen
const cameraButton = document.getElementById("camera-button");
const setupStatus = document.getElementById("setup-status");
const setupArm = document.getElementById("setup-arm");
const setupCount = document.getElementById("setup-count");

// Debug panel (setup screen)
const debugPanel = document.getElementById("debug-panel");
const debugCanvas = document.getElementById("debug-canvas");
const debugContext = debugCanvas.getContext("2d");
const debugInfo = document.getElementById("debug-info");
const debugSlider = document.getElementById("debug-slider");
const debugSliderValue = document.getElementById("debug-slider-value");

// Compressions screen
const liveRate = document.getElementById("live-rate");
const liveFeedback = document.getElementById("live-feedback");
const liveCount = document.getElementById("live-count");
const livePauses = document.getElementById("live-pauses");
const liveArms = document.getElementById("live-arms");

// ============================================================
// STATE OF THIS FILE
// ============================================================
let cameraReady = false;     // true once initTracking has finished
let cameraLoading = false;   // true while initTracking is working
let isCounting = false;      // true between startTracking and stopTracking
let currentScreen = "";      // "setup", "compressions" or "" (another screen)
let compressionCount = 0;
let pauseCount = 0;

// ============================================================
// TURNING ON THE CAMERA (setup screen)
// ============================================================
cameraButton.addEventListener("click", turnOnCamera);

async function turnOnCamera() {
  if (cameraReady || cameraLoading) {
    return;
  }
  cameraLoading = true;
  cameraButton.disabled = true;
  setupStatus.textContent = "Loading the pose model and the camera… (allow camera access if the browser asks)";

  try {
    await initTracking(video, canvas);
  } catch (error) {
    // Most common reasons: the player refused the camera, or there is no internet
    console.error(error);
    setupStatus.textContent = "The camera could not start: " + error.message;
    cameraLoading = false;
    cameraButton.disabled = false;
    return;
  }

  cameraLoading = false;
  cameraReady = true;
  cameraButton.textContent = "Camera is on";
  setupStatus.textContent = "Camera ready. Kneel beside your cushion, with your side to the camera, and try a few compressions.";

  // The player may have moved to another screen while the model was loading
  if (currentScreen === "setup") {
    startSetupCheck();
  }
  if (currentScreen === "compressions") {
    startLiveFeedback(gameForCompressions);
  }
}

// ============================================================
// SETUP SCREEN: check that the arm is visible and compressions are counted
// ============================================================
function startSetupCheck() {
  compressionCount = 0;
  setupCount.textContent = "0";
  setupArm.textContent = "Looking for your arm…";
  setupArm.className = "";

  startTracking({
    onArmDetected: function (isDetected) {
      if (isDetected) {
        setupArm.textContent = "I can see your arm.";
        setupArm.className = "good";
      } else {
        setupArm.textContent = "I can't see your arm. Turn your side to the camera.";
        setupArm.className = "warn";
      }
    },
    onCompression: function () {
      compressionCount = compressionCount + 1;
      setupCount.textContent = compressionCount;
    },
  });
  isCounting = true;
}

// ============================================================
// DEBUG PANEL: the arm height wave, like in the prototype
// ============================================================
// Blue line = arm height. Green dot = a counted compression.
// Grey bar on the left = the minimum dip needed to count one.
// If the dips are smaller than the grey bar, lower the slider.
// If dots appear while you are still, raise it.
debugSlider.addEventListener("input", function () {
  const value = parseFloat(debugSlider.value);
  setSensitivity(value);
  debugSliderValue.textContent = value.toFixed(2);
});

function drawDebugLoop() {
  if (currentScreen !== "setup") {
    return; // stop drawing when we leave the setup screen
  }
  if (debugPanel.open && cameraReady) {
    drawDebugGraph(getDebugData());
  }
  requestAnimationFrame(drawDebugLoop);
}

function drawDebugGraph(data) {
  const width = debugCanvas.width;
  const height = debugCanvas.height;
  debugContext.clearRect(0, 0, width, height);
  debugInfo.textContent = "Camera: " + data.fps + " images per second (below 15, counting gets harder)";

  const history = data.history;
  if (history.length < 2) {
    return;
  }

  // Vertical scale: from the lowest to the highest value of the last 5 s.
  // The range is at least 2 thresholds, so camera jitter doesn't fill the whole graph.
  let lowest = Infinity;
  let highest = -Infinity;
  for (const point of history) {
    lowest = Math.min(lowest, point.height);
    highest = Math.max(highest, point.height);
  }
  const range = Math.max(highest - lowest, 2 * data.threshold, 0.001);
  const lastTime = history[history.length - 1].time;

  function toX(time) {
    return width - ((lastTime - time) / 5) * width;
  }
  function toY(value) {
    return height - 10 - ((value - lowest) / range) * (height - 20);
  }

  // Grey bar: the size of the minimum dip
  const barHeight = (data.threshold / range) * (height - 20);
  debugContext.fillStyle = "#c8c8c8";
  debugContext.fillRect(4, height - 10 - barHeight, 8, barHeight);

  // Blue line: the arm height
  debugContext.strokeStyle = "#2f6fdb";
  debugContext.lineWidth = 2;
  debugContext.beginPath();
  for (let i = 0; i < history.length; i++) {
    const point = history[i];
    if (i === 0) {
      debugContext.moveTo(toX(point.time), toY(point.height));
    } else {
      debugContext.lineTo(toX(point.time), toY(point.height));
    }
  }
  debugContext.stroke();

  // Green dots: counted compressions
  debugContext.fillStyle = "#2e7d32";
  for (const point of history) {
    if (point.compression) {
      debugContext.beginPath();
      debugContext.arc(toX(point.time), toY(point.height), 5, 0, Math.PI * 2);
      debugContext.fill();
    }
  }
}

// ============================================================
// COMPRESSIONS SCREEN: live feedback
// ============================================================
// The game object of main.js, kept while the compressions screen is open
let gameForCompressions = null;

function startLiveFeedback(game) {
  compressionCount = 0;
  pauseCount = 0;
  liveCount.textContent = "0";
  livePauses.textContent = "0";
  liveRate.textContent = "–";
  liveArms.textContent = "–";
  liveArms.className = "";
  showFeedback("Push hard and fast in the center of the cushion.", "");

  startTracking({
    onCompression: function (time) {
      compressionCount = compressionCount + 1;
      liveCount.textContent = compressionCount;
      // Remember when the very first compression happened (used for the score)
      if (game.firstCompressionTime === null) {
        game.firstCompressionTime = time;
      }
    },
    onRate: function (rate) {
      liveRate.textContent = Math.round(rate);
      if (rate < TARGET_MIN) {
        showFeedback("Faster", "warn");
      } else if (rate > TARGET_MAX) {
        showFeedback("Slower", "warn");
      } else {
        showFeedback("Good rhythm", "good");
      }
    },
    onPause: function () {
      pauseCount = pauseCount + 1;
      livePauses.textContent = pauseCount;
      showFeedback("Keep going!", "bad");
    },
    onArmStatus: function (isStraight) {
      if (isStraight) {
        liveArms.textContent = "Straight";
        liveArms.className = "good";
      } else {
        liveArms.textContent = "Bent";
        liveArms.className = "warn";
      }
    },
    onArmDetected: function (isDetected) {
      if (!isDetected) {
        showFeedback("I can't see your arm. Turn your side to the camera.", "warn");
      }
    },
  });
  isCounting = true;
}

// colorClass is "good", "warn", "bad" or "" (see style.css)
function showFeedback(text, colorClass) {
  liveFeedback.textContent = text;
  liveFeedback.className = colorClass;
}

// ============================================================
// CALLED BY main.js WHEN THE PLAYER ENTERS OR LEAVES A CAMERA SCREEN
// ============================================================
export function enterSetupScreen() {
  currentScreen = "setup";
  cameraBox.classList.add("visible");
  if (cameraReady) {
    startSetupCheck();
  }
  requestAnimationFrame(drawDebugLoop);
}

export function leaveSetupScreen() {
  currentScreen = "";
  cameraBox.classList.remove("visible");
  if (isCounting) {
    stopTracking(); // the test compressions are not kept
    isCounting = false;
  }
}

export function enterCompressionsScreen(game) {
  currentScreen = "compressions";
  gameForCompressions = game;
  cameraBox.classList.add("visible");
  if (cameraReady) {
    startLiveFeedback(game);
  } else {
    showFeedback("The camera is not on. Go back to the setup screen first.", "bad");
  }
}

// Stops the tracking and saves the statistics in game.compressionStats
export function leaveCompressionsScreen(game) {
  currentScreen = "";
  cameraBox.classList.remove("visible");
  if (isCounting) {
    game.compressionStats = stopTracking();
    isCounting = false;
  }
}
