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

## 2026-10-20 — sounds, celebrations, animations (v10)
- **Asked:** Tim: "add opptional sounds … win celebrations, and other fun annimations … customizable in the settings". Brief: shared `_fx/fx.js`, ideas clunk / whoosh / splash / explosion + shake / sink + big / fleet hit / win-lose.
- **Built:** `js/fx.js` (verbatim copy), `js/fxgame.js` (snapshot-diff director + paper helper), hooks in app.mjs (placement, errors, aim click, onSnap, paper), "Sound & effects" block in Settings dressed as our rows, CSS peg/ring animations follow Animations/Speed. Map in progress.md.
- **Verified:** `npm test` 14 + 5 + 6 fx (fx test seen failing with no director, and failing on a win/lose swap and a replay-on-resume mutant); headless WebKit 393×659 + 1280×800 full games (win vs Random, loss vs Density): FX.play spy counts match shots, celebrate win/lose once, confetti canvas present, Settings switches toggle, `?` tip works, no console errors, no overflow. Screenshots in the manager's scratchpad `design/battleship-fx/`.
- **Open:** see NOT verified (real audio on iPhone).

## 2026-10-20 — real-table look (v11)
- **Asked:** Tim: games should look "almost identical to how the board or card layout looks like in real life … like you're looking through a camera … connected to a user's glasses". Brief: shared `_table` kit, re-copy fx.js 1.0.3, no rule changes.
- **Built:** wood table surface; plastic case look on every grid (moulded labels, peg hole per square, dark target lid, lighter wave-textured ocean base leaning away); ships with deck peg holes; real-looking pegs pressed in; peg tray running down with use; opponent name plate on the back of their lid; laptop layout = lid above, base in front, helpers in a slim side panel; placing shows the big board as the ocean base; sunk enemy ships faint on the lid. fx.js 1.0.3 re-copied (Battleship has no own Speed setting, so no workaround to remove).
- **Verified:** `npm test` green; scratchpad `table/battleship/shots.mjs` full games at 393×659, 1280×800, 320×560, 659×393 (WebKit): no console errors, no page scroll, no horizontal overflow; Chrome check of the 3-D base; one read-only reviewer pass, fixes applied.
- **Open:** NOT verified list.

## 2026-10-20 — edge pass (v12)
- **Asked:** Tim: "focus on making each game perfect especially in scenarios that the game doesn't expect or are a little weird." Brief also named the WebKit base-over-"Your fleet" overlap and the 320 px tally overlap; re-copy `_table` 1.0.1.
- **Built:** 50 scenarios, 11 failed, all fixed (table in progress.md): tally fit, laptop base size, 320 px controls + online Leave, emoji name cut, opponent-left toast, online double-Fire guard, paper all-sunk + can't-fit lines, stale heat colour; `D.unfittable`; `.gitattributes`; table.css/table.js re-copied; v12.
- **Verified:** `npm test` 14 + 5 + 6 + 7 edge (edge test seen failing first); scratchpad scripts each failing on the unfixed v11 copy and passing after: layout 28/28 WebKit + 28/28 Chromium (7 sizes), taps 30/30, online 14/14 (320/393/1280).
- **Open:** NOT verified list.

## 2026-10-20 — design pass (v9)
- **Asked:** Tim: "review them again for design improvements especially visually". Polish only; no rule or behaviour changes.
- **Built:** fleet tally icons 10→13 px (18 desktop); sub/ship hulls lighter with a sheen; heatmap amber→red, faint cells clear; blue glow on the target board on your shot; status pill; Fire neutral until armed; win green / loss red sheet title; invisible 40 px hit areas on ?, switches, small/seg/tray buttons; bigger desktop pegs; desktop heat numbers dimmed except best/selected; tray ship icons (laptop); Lab chart height capped; status no longer stuck on "Paper game" in Lab/Rules/Settings.
- **Verified:** npm test 14 + 5; scratchpad `bs-design.mjs` full games phone (WebKit 393×659) + desktop 1280×800, every tab, before/after screenshots, no console errors, no overflow.

## 2026-10-21 — visibility pass (v13)
- **Asked:** Tim: boards "too small to easily see what's going on … Consider parts of the board that are dense". Brief: audit every play screen at 393/320/landscape/1280/1440, fix, reviewer pass.
- **Found:** laptop lid only 19-20% of the screen (half its column empty wood); your fleet base tiny everywhere (phone squares 11 px, pegs 4.7 px, labels 7 px; laptop 18 px); sideways phone base 10.5 px with an empty band; laptop heat numbers 9 px.
- **Built:** laptop lid fills the table height with the base beside it; tap "Your fleet" to see it as big as the lid; sideways phone lid column fits the lid, base gets the rest; heat numbers scale; v13.
- **Verified:** scratchpad `vis/battleship/check.mjs` 16 fails on v12 → 0 on v13 in WebKit and Chrome (5 sizes × 5 states + zoom); edge layout 28/28 WebKit + Chromium, taps 29/29; `npm test` green; one read-only reviewer pass.

## 2026-10-27 — home-screen app + offline (v14, `_pwa` kit pilot, builder for the portfolio manager)
- **Asked:** Tim: "start building every single improvement you can think of after your competitor analysis." Plan item 3: installable on the iPhone home screen + offline play vs computer, never a stale build.
- **Built:** copied `sw.js`, `js/pwa.js`, `tools/pwa-check.mjs`, `tools/make-icons.mjs` from `_pwa` 1.1.0; `manifest.webmanifest`, `icons/` (192/512/maskable from icon.svg; apple-touch-icon kept); head tags; `PWA.safeToReload` in app.mjs; v14.
- **Verified:** `npm run test:pwa` 3/16 on v13 → 18/18 on v14 (WebKit and Chromium 393×659): offline reload/cold open, a shot answered by the computer offline, weak signal opens in seconds, next open after a deploy shows it in one load, mid-game pill (no reload), safe-point auto-reload. `npm test` green.
- **Open:** real iPhone home-screen app; Tim's look at the pill.
