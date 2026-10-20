# Battleship — chat log

## 2026-10-20 — first build (builder under the Classic+Platform manager)
- **Asked:** Battleship site per games-common-brief + games-phase2-brief: 10×10, 5/4/3/3/2, Salvo + 1967 fleet + no-touching setting; heatmap + best shot; Random / Hunt-target / Density computers measured over thousands of games; placement analysis; paper companion; own SVG art; online via shared online.js.
- **Decided:** see progress.md Decisions.
- **Built:** engine, density heatmap, computers, fast simulator, Lab data tool, SVG ships/pegs/icon, Play (computer / pass phone / online), Paper, Lab, Rules, Settings, docs/rules-check.md, docs/ideas.md.
- **Verified:** `npm test` (14 engine + 4 online tests; each seen failing on a broken engine/density/publicView); phone-view WebKit 393 px and 1280 desktop screenshots of every tab, a full game to the end (headless script), no console errors, no overflow; two-browser online game on the live site (create, join, place, secrecy, reload-resume, finish).
- **Open:** NOT verified list in progress.md.
