# Battleship — chat log

## 2026-10-20 — first build (builder under the Classic+Platform manager)
- **Asked:** Battleship site per games-common-brief + games-phase2-brief: 10×10, 5/4/3/3/2, Salvo + 1967 fleet + no-touching setting; heatmap + best shot; Random / Hunt-target / Density computers measured over thousands of games; placement analysis; paper companion; own SVG art; online via shared online.js.
- **Decided:** see progress.md Decisions.
- **Built:** engine, density heatmap, computers, fast simulator, Lab data tool, SVG ships/pegs/icon, Play (computer / pass phone / online), Paper, Lab, Rules, Settings, docs/rules-check.md, docs/ideas.md.
- **Verified:** `npm test` (14 engine + 4 online tests; each seen failing on a broken engine/density/publicView); phone-view WebKit 393 px and 1280 desktop screenshots of every tab, a full game to the end (headless script), no console errors, no overflow; two-browser online game on the live site (create, join, place, secrecy, reload-resume, finish).
- **Open:** NOT verified list in progress.md.

## 2026-10-20 — QA pass + fixes (v8)
- **Found:** live online UI clicks timing out → endless spinning ring + identical-snapshot redraws (fixed); desktop info panel shrank under the log, hiding Best/Fire (fixed). Fresh QA agent: sideways phone unusable; reload wiped computer games; own name instead of "You" online; open-seat dot green; double Ready toast; paper accepted impossible sinking; no-touch Findable skewed. All fixed in 9b36b23.
- **Verified:** npm test 14 + 5 (new resume test seen failing first); full live two-browser online game to the end on v7 (create, join, secrecy, Bob reload resumes with 49 shots, both see the result, no console errors); local full games phone + desktop + 1967 Salvo all-at-once; sideways 659×393 layout + reload resume.

## 2026-10-20 — design pass (v9)
- **Asked:** Tim: "review them again for design improvements especially visually". Polish only; no rule or behaviour changes.
- **Built:** fleet tally icons 10→13 px (18 desktop); sub/ship hulls lighter with a sheen; heatmap amber→red, faint cells clear; blue glow on the target board on your shot; status pill; Fire neutral until armed; win green / loss red sheet title; invisible 40 px hit areas on ?, switches, small/seg/tray buttons; bigger desktop pegs; desktop heat numbers dimmed except best/selected; tray ship icons (laptop); Lab chart height capped; status no longer stuck on "Paper game" in Lab/Rules/Settings.
- **Verified:** npm test 14 + 5; scratchpad `bs-design.mjs` full games phone (WebKit 393×659) + desktop 1280×800, every tab, before/after screenshots, no console errors, no overflow.
