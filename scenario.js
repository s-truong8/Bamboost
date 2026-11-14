// scenario.js: the dispatcher conversation (the "decisions" screen).
// STUBS ONLY: nothing is implemented yet.

// loadScript() will:
// - download script.json with fetch("script.json")
// - keep the list of steps in a variable of this file
// - return a Promise that finishes when the steps are ready
export function loadScript() {
  // TODO
}

// playStep(id) will:
// - find the step with this id in the loaded script
// - show the dispatcher's line (and later play the voice)
// - create one button per choice
// - start a countdown of step.timeLimit seconds
// - when the player clicks a choice:
//     - add 1 to game.totalDecisions
//     - if the choice is correct: add 1 to game.correctDecisions,
//       then play the step named in choice.next
//     - if the choice is wrong: show choice.feedback
export function playStep(id) {
  // TODO
}
