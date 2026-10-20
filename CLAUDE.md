# Battleship — project rules

Static GitHub Pages site: https://timothyhadfield.github.io/battleship/ · repo TimothyHadfield/battleship.
Tim's global rules apply. Read `progress.md` first.

- $0, no build step, no dependencies. Plain UMD scripts (node + `window.BS*`): `engine.js` (rules), `density.js` (heatmap), `ai.js` (computers), `sim.js` (fast simulations), `art.js` (original SVG). UI is one ES module `js/app.mjs`, which imports `js/online.js` + `js/game.mjs`.
- `js/online.js` is a copy of `Board and Card Games/_online/online.js`. Never edit it here; re-copy when the shared one changes. gameId `battleship`. No Firebase project or rules file of our own.
- Ship positions live only in `privateView`; `publicView` is the shot record. `tests/online.test.mjs` proves it.
- Tests: `npm test` (~15 s). Each test was seen failing on a deliberately broken engine.
- Lab numbers: `node tools/lab-data.js 0.4` (~4 min) → `js/lab-data.js`. Rerun after changing any computer or the heatmap.
- Bump `?v=` on the script/css tags in `index.html` and `VERSION` in `app.mjs` on each release (phone caches).
- Commit with explicit paths. Never write inside a `.claude` folder.
