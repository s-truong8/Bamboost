// score.js: turns the game state into a grade for the results screen.
// STUB ONLY: it returns fake values for now.

// computeScore(game) will read the game object from main.js and give:
// - speed:     points for how fast the first compression started
//              (game.firstCompressionTime - game.startTime)
// - decisions: points for game.correctDecisions out of game.totalDecisions
// - rate:      points for game.compressionStats.percentInRange
// - pauses:    points lost for game.compressionStats.pauses
// - total:     the sum of the points above
// - grade:     a letter from the total
// - tip:       one sentence about the weakest part
export function computeScore(game) {
  // FAKE VALUES: replace with real calculations.
  return {
    speed: 20,
    decisions: 20,
    rate: 20,
    pauses: 20,
    total: 80,
    grade: "B",
    tip: "FAKE TIP: keep a steady rhythm of 100 to 120 compressions per minute.",
  };
}
