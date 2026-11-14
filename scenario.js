// scenario.js: the steps before CPR (the "decisions" screen), like a game.
// Each step is a question with a timer. The player must find the right
// answer to validate the step and unlock the next one.
// A step only gives a point if it is right on the first try, before the timer ends.

import { game, showScreen } from "./main.js";

// Mascot stickers for each reaction
const STICKERS = {
  thinking: "assets/mascot-stickers/04-confused.png",
  right: "assets/mascot-stickers/13-proud.png",
  wrong: "assets/mascot-stickers/14-unimpressed.png",
  tooSlow: "assets/mascot-stickers/06-shocked.png",
};

const NEXT_STEP_DELAY = 1600; // milliseconds to enjoy the "validated" message

// ============================================================
// PAGE ELEMENTS
// ============================================================
const stepMap = document.getElementById("step-map");
const stepTitle = document.getElementById("step-title");
const stepMascot = document.getElementById("step-mascot");
const stepBubble = document.getElementById("step-bubble");
const stepSpeaker = document.getElementById("step-speaker");
const lineText = document.getElementById("dispatcher-line");
const timerFill = document.getElementById("decision-timer");
const choicesBox = document.getElementById("choices");
const feedbackText = document.getElementById("decision-feedback");
const victimScene = document.getElementById("victim-scene");

// ============================================================
// STATE OF THIS FILE
// ============================================================
let steps = [];             // the steps from script.json
let currentStep = null;
let stepDone = false;       // true once the right answer is clicked
let stepMissed = false;     // true after a wrong answer or when time is up
let timerId = null;         // the countdown (setInterval)
let nextStepId = null;      // the "wait, then next step" (setTimeout)

// ============================================================
// THE INTERFACE
// ============================================================

// Downloads script.json. Returns a Promise with the list of steps.
export async function loadScript() {
  const response = await fetch("script.json");
  steps = await response.json();
  return steps;
}

// Shows one step: the question, the choices and the timer.
export function playStep(id) {
  const step = findStep(id);
  if (step === null) {
    console.error("playStep: there is no step called " + id);
    return;
  }
  stopScenario();
  currentStep = step;
  stepDone = false;
  stepMissed = false;

  drawStepMap();
  stepTitle.textContent = "Step " + (steps.indexOf(step) + 1) + " of " + steps.length + ": " + step.title;
  showSpeaker(step.speaker);
  lineText.textContent = step.line;
  stepMascot.src = STICKERS.thinking;
  showFeedback("", "");
  drawChoices(step);
  startTimer(step.timeLimit);
}

// Stops the timer and the "next step" delay (when the player quits).
export function stopScenario() {
  clearInterval(timerId);
  clearTimeout(nextStepId);
}

// ============================================================
// DRAWING THE STEP
// ============================================================

// The row of checkpoints at the top: done, current, or locked
function drawStepMap() {
  stepMap.innerHTML = "";
  const currentIndex = steps.indexOf(currentStep);
  for (let i = 0; i < steps.length; i++) {
    const item = document.createElement("li");
    item.className = "step-dot";
    if (i < currentIndex) {
      item.classList.add("done");
    } else if (i === currentIndex) {
      item.classList.add("current");
    } else {
      item.classList.add("locked");
    }
    item.textContent = i + 1;
    item.title = steps[i].title;
    stepMap.appendChild(item);
  }
}

// The bubble looks different when the dispatcher speaks
function showSpeaker(speaker) {
  if (speaker === "dispatcher") {
    stepSpeaker.textContent = "Dispatcher";
    stepBubble.classList.add("bubble-blue");
  } else {
    stepSpeaker.textContent = "[MASCOT NAME]";
    stepBubble.classList.remove("bubble-blue");
  }
}

// One button per choice. Keys 1, 2, 3 also work.
function drawChoices(step) {
  choicesBox.innerHTML = "";
  for (let i = 0; i < step.choices.length; i++) {
    const choice = step.choices[i];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";

    const key = document.createElement("span");
    key.className = "choice-key";
    key.textContent = i + 1;
    button.appendChild(key);
    button.appendChild(document.createTextNode(choice.text));

    button.addEventListener("click", function () {
      pickChoice(choice, button);
    });
    choicesBox.appendChild(button);
  }
}

// colorClass is "good", "bad" or "" (see style.css)
function showFeedback(text, colorClass) {
  feedbackText.textContent = text;
  feedbackText.className = colorClass;
}

// ============================================================
// THE PLAYER ANSWERS
// ============================================================
function pickChoice(choice, button) {
  if (stepDone) {
    return;
  }

  if (!choice.correct) {
    // Wrong: the step is missed (no point), but the player must still find the answer
    stepMissed = true;
    button.classList.add("wrong");
    button.disabled = true;
    stepMascot.src = STICKERS.wrong;
    showFeedback(choice.feedback, "bad");
    return;
  }

  // Right: the step is validated
  stepDone = true;
  clearInterval(timerId);
  button.classList.add("correct");
  disableAllChoices();
  stepMascot.src = STICKERS.right;

  game.totalDecisions = game.totalDecisions + 1;
  if (!stepMissed) {
    game.correctDecisions = game.correctDecisions + 1;
  }

  let message = "Step validated! ";
  if (choice.feedback) {
    message = message + choice.feedback;
  }
  showFeedback(message, "good");

  // Mark this checkpoint as done right away
  const dots = stepMap.querySelectorAll(".step-dot");
  dots[steps.indexOf(currentStep)].className = "step-dot done";

  // Update the drawing of the man: for example "after-call" shows the phone
  victimScene.classList.add("after-" + currentStep.id);

  nextStepId = setTimeout(function () {
    if (choice.next === "end") {
      showScreen("tutorial"); // all steps validated: time for compressions
    } else {
      playStep(choice.next);
    }
  }, NEXT_STEP_DELAY);
}

function disableAllChoices() {
  const buttons = choicesBox.querySelectorAll(".choice");
  for (const button of buttons) {
    button.disabled = true;
  }
}

// Keys 1, 2, 3... pick a choice (only on the decisions screen)
document.addEventListener("keydown", function (event) {
  if (document.body.dataset.screen !== "decisions") {
    return;
  }
  const number = parseInt(event.key, 10);
  const buttons = choicesBox.querySelectorAll(".choice");
  if (number >= 1 && number <= buttons.length && !buttons[number - 1].disabled) {
    buttons[number - 1].click();
  }
});

// ============================================================
// THE TIMER
// ============================================================
// We read the real clock each time, because setInterval can run late
// when the computer is busy (the camera tracking runs at the same time).
function startTimer(seconds) {
  const startTime = performance.now() / 1000;
  timerFill.style.width = "100%";
  timerFill.classList.remove("urgent");

  timerId = setInterval(function () {
    const timeLeft = seconds - (performance.now() / 1000 - startTime);
    timerFill.style.width = Math.max(0, (timeLeft / seconds) * 100) + "%";
    if (timeLeft <= 3) {
      timerFill.classList.add("urgent"); // last 3 seconds: red
    }
    if (timeLeft <= 0) {
      timeUp();
    }
  }, 100);
}

// Too slow: the step is missed, but the player must still answer
function timeUp() {
  clearInterval(timerId);
  stepMissed = true;
  stepMascot.src = STICKERS.tooSlow;
  showFeedback("Time's up! Every second counts. Choose now!", "bad");
}

// ============================================================
// SMALL HELPERS
// ============================================================
function findStep(id) {
  for (const step of steps) {
    if (step.id === id) {
      return step;
    }
  }
  return null;
}
