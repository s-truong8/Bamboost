# Pandaid CPR

A browser game that teaches hands-only CPR. A man collapses on the sidewalk, and Pandaid the red panda guides you through the steps: check the scene, check for a response and breathing, call 911, then do chest compressions.

Your webcam watches you do the compressions (pose tracking with MediaPipe, all in the browser). It measures your rhythm, depth and arm position live, and you get a graded evaluation at the end.

## Run it

Plain HTML, CSS and JavaScript, with no build step. Open the folder with VS Code Live Server (or any local web server) and allow camera access.

## Files

- `index.html`, `style.css`: the pages and the look
- `main.js`: game flow and screens
- `scenario.js`, `script.json`: the questions before CPR
- `tracking.js`, `camera.js`: camera and compression tracking
- `score.js`: the final grade
- `assets/`: mascot stickers and sounds

This is a training game, not a substitute for a certified first-aid course.
