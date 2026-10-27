# Battleship — progress

## START HERE
Read order: this file → `CLAUDE.md` → `docs/rules-check.md` → `docs/ideas.md`. Last updated: 2026-10-27 (home-screen app v14).
Live: https://timothyhadfield.github.io/battleship/ · repo https://github.com/TimothyHadfield/battleship

## Goal right now
A finished Battleship site in the style of Tim's other game sites: real play (computer / pass-the-phone / online), odds where you aim, measured computers, a study layer, a real-table companion.

## Status
| Part | State |
|---|---|
| Engine (10×10, fleet 5/4/3/3/2, Hasbro + 1967 names, Salvo one-at-a-time + all-at-once, unnamed hits, no-touching) | done, tested |
| Heatmap (`js/density.js`) + best-shot ring on target grid | done; calibration measured (Lab) |
| Computers Random / Hunt & target / Density | done; measured: 95.4 / 62.1 / 44.5 avg shots (4,000 / 4,000 / 2,000 games) |
| Placement: drag, tap-to-turn, Random, live "Findable" score | done |
| Play: vs computer, pass the phone, online (shared `online.js`, gameId `battleship`) | done; online verified on live site with two browsers |
| Paper tab (real-game companion with heatmap) | done |
| Lab: strength, histogram, your-fleet test, calibration, head-to-head, first-player edge, hiding styles, prior map, rule-switch effects | done |
| Rules, Settings | done |
| Sounds, celebrations, animations (`js/fx.js` shared copy + `js/fxgame.js` director), "Sound & effects" in Settings | done v10; `tests/fx.test.mjs`; fx.js 1.0.3 re-copied v11 |
| Real-table look (v11): wood table (`css/table.css` + `js/table.js`, shared kit copies), target grid = upright plastic lid with a peg hole per square, ocean grid = flat base leaning away (CSS 3-D), ships with deck peg holes, real-looking pegs, peg tray that runs down as pegs are used, opponent name plate on the back of their lid; laptop = case in the middle (lid above, base in front) + slim side panel | done v11 |
| Edge pass (v12, 2026-10-20): 50 weird scenarios tested, 11 failed, all fixed (table below) | done v12; `tests/edge.test.js` |
| Home-screen app + offline vs computer (v14, 2026-10-27, shared `_pwa` kit 1.1.0): manifest + icons, network-first service worker, "New version — tap to reload" | done v14; `npm run test:pwa` 3/16 before → 18/18 |
| Visibility pass (v13, 2026-10-21): laptop lid fills the table height (444→632 px at 1280×800, 514→732 at 1440), your base sits beside it (squares 18→24 px), tap "Your fleet ⤢" to see it as big as the lid (phone squares 11→33 px, pegs 4.7→14 px), sideways phone base 10.5→14.6 px, laptop heat numbers 9→13-15 px | done v13 |

### Edge pass v12 (2026-10-20)
Scripts live in the session scratchpad (`edge/battleship/`: taps.mjs, layout.mjs, online.mjs, scenarios.md); only `tests/edge.test.js` is in the repo.
| Scenario | Before | Fix |
|---|---|---|
| Fleet tally at 320/393/landscape/200% zoom | text overlapped | phone shows hit count; ship name hidden once hit |
| Heatmap switch at 320×568 and 320×460 | off screen | tighter info column under 380 px |
| Laptop WebKit (no 3-D lean drawn): base over "Your fleet" | overlapped | base sized to its row (`min(100cqw,126cqh)`) |
| Online Leave at 320 px | under tab bar | smaller, no-wrap row under 380 px |
| Emoji online name | cut mid-emoji | cut by code point (`shortName`) |
| Opponent leaves online | silent | toast "<name> left. A computer plays on for them." |
| Online Fire double tap | 2 moves sent | `P.sending` guard |
| Paper: all ships sunk | still offered ship buttons | "All N ships sunk in X shots" + Undo/New game |
| Paper: answers no fleet can fit | no reason shown | red line "X, Y can't fit anywhere. Check your calls." (`D.unfittable`) |
| Heat colour left after last sinking (WebKit) | 3 cells | paint sets `transparent` explicitly |
| Engine: salvo ends mid-list, bad moves, 3,000 no-touch fleets | already passed | locked in by tests |
Passed untouched: double-tap Ready/Fire/squares, taps on the computer's turn, New game in the 900 ms before the sheet, Back with sheets, Settings mid-turn, rules change mid-battle, reload mid-turn, storage blocked, two tabs, resize, longest/shortest games, Lab empty/left mid-test, long log.

### Event → sound map (js/fxgame.js + app.mjs)
| Event | Sound / effect |
|---|---|
| Ship dropped, moved or turned in placement | `place` (wood clunk) |
| Random fleet | `slide` · Ready (fleet goes down) `place` at pitch 0.7 |
| Illegal: overlap/touch, no room to turn, tapping a used square, tapping while it's not your turn | `error` |
| Pick a square to aim | `click` (quiet ui) |
| Any shot fired (you, computer, friend, online opponent) | `whoosh`, then impact ~300 ms later as the peg lands (salvo-all-at-once: 170 ms apart) |
| Miss | `splash` |
| Your hit | `explosion` + target grid shakes |
| Hit on your fleet | `hit` (thud) + your grid shakes + red flash on the square |
| You sink a ship | + `sink` + star burst (`celebrate big`) at the square |
| Your ship sunk | + `sink` + red flash over your grid |
| Turn passes to you | `turn` chime, after the other side's impact |
| Game over | `celebrate win` (confetti + fanfare) or `lose`, with the result sheet (900 ms) |
| Paper tab answers | miss `splash`, hit `explosion` + shake, sank + `sink` + stars, last ship sunk = `win` |
| Opponent's sounds | same sounds at 0.5–0.8 volume (never louder than yours) |
| Reload / join mid-game | silent (no replay of old shots) |

## Standing instructions (Tim's words)
- "could you really check out the board and card games projects I have going … Base the style off of what I did with the other games with a similar aspect and thought process behind it"
- Phase 2: "build regular play online with a computer or other online players for all the games and their common varients that match exactly the play of the in-person game." · "Brainstorm what additions you can do to the game with data, exploration, theory" · "Really work on the webdesign of the games, aswell as art, fitting it with an iphone and computer" · "make sure that everything works properlly without errors" · "Make sure to get everything right like rules and artwork and specific numbers"
- FX (2026-10-20): "add opptional sounds you can add to the games that reflect what's happening in the game accurately as well as win celebrations, and other fun annimations to go along with everything. Just make sure everything is customizable in the settings so the user can play as preffered."
- Table look (2026-10-20): "make sure that each of the games also have a look to them so that the game (either board or card layout) looks almost identical to how the board or card layout looks like in real life … It should look kind of like you're looking through a camera that is connected to a user's glasses that is playing in real life (not actually, but the layout and style of everything should be similar)."
- Newest: "add risk, clue, battleship, connect four, stratego, clue, checkers, pandemic, splendor, king of tokyo, 7 wonders, and evolution to the list of games."
- Edge pass (2026-10-20): "I've noticed the games often have good user interfaces but could be improved especially when a scenario happens that the game might've not really thought about or whatnot. Could you focus on making each game perfect especially in scenarios that the game doesn't expect or are a little weird."
- Visibility (2026-10-21): "for a lot of the games the cards or board layout is too small to easily see what's going on. … Fix this so the view of what's happening and where everything is is very clear. Consider parts of the board that are dense in what's happening and if the user can reasonably see it."
- Money $0; no copyrighted art or rulebook text; never write in a `.claude` folder.

## Traps
- **Firestore refuses arrays inside arrays in a move doc.** Place moves are `{t:'place', ships:[{cells:[…]}]}` (`E.placeMove`). `tests/online.test.mjs` checks every bot move for nesting. Found live 2026-10-20.
- `js/online.js` is a verbatim copy of `_online/online.js`; never edit here.
- Lab numbers are baked into `js/lab-data.js`; rerun `node tools/lab-data.js 0.4` after changing a computer or the heatmap.
- Port 8731 on this laptop is taken by another server; serve locally with `python -m http.server <port> --directory <folder>`.
- **Never use an endless CSS animation over the grid** (the old spinning best-ring made every frame repaint the heatmap: seconds per frame in headless WebKit, clicks timed out).
- online.js re-sends identical snapshots on every presence heartbeat; `onSnap` skips them (key = JSON of the snapshot). Without that, the panel redrew under the finger.
- Headless clicks on a busy laptop: Playwright's "stable" wait times out; test scripts use `{force:true}` + explicit waits (scratchpad `bs-full.mjs`, `bs-two.mjs`).
- Bump `?v=N` in index.html AND the two imports in app.mjs AND `VERSION` together.
- `js/fx.js` is a verbatim copy of `Board and Card Games/_fx/fx.js`; never edit here. Game-specific sounds/timing live in `js/fxgame.js`; the Settings look is matched by `.set .fx-set …` rules at the end of style.css (fx.js renders `<label class="switch"><input><span>`; we hide the span and let our `.switch.on` draw the knob). Its `?` gets `data-q="fxsound"` so our own tip handler (which stops the click) shows the text.
- The FX Animations/Speed switches also drive our CSS peg/ring animations via `html.fx-noanim` / `html.fx-fast`.
- `css/table.css` + `js/table.js` are verbatim copies of `Board and Card Games/_table/`; never edit here. table.css loads BEFORE style.css (its `.tbl-surface {position:relative}` must lose to `.tab {position:absolute}`).
- Headless WebKit on Windows does not draw CSS 3-D perspective: the ocean grid looks flat there; Chrome (and iOS Safari) show it leaning away. Check the tilt with `--engine chrome`.
- Some screenshot runs on this laptop wrote 0-byte PNGs for one whole mode; check file sizes before trusting a set.
- Headless WebKit on Windows draws the ocean base's rotateX as a flat squash (×0.788, no perspective); layout must be right without the lean (base sized `126cqh` on laptop fits both engines).
- Heat cells: set `backgroundColor = "transparent"`, never `""` (WebKit kept the old colour). Tests that look for heat colour must ignore "transparent".
- `.gitattributes` marks `js/fx.js`, `js/table.js`, `css/table.css` `-text` so the shared copies stay byte-identical.
- Fleet zoom (`mineZoom` in app.mjs): `#mineBox` goes `position:absolute` over `.playmain`. On laptop `.mine` is a grid item, so the zoom rule must reset `grid-column/row: auto` (else its containing block is its own grid column and it lands off screen). On phone `.info` is pinned to grid column 2 so nothing moves when the box leaves the grid. Don't put a CSS fade on it (headless WebKit left it at opacity 0).
- Laptop base column width = `calc(100% - 208px - 100dvh)` (what the lid leaves); change it if the top bar, tab bar or lid padding changes height.
- **Home-screen app / offline (v14, 2026-10-27):** `sw.js` + `js/pwa.js` + `tools/pwa-check.mjs` + `tools/make-icons.mjs` are verbatim copies of `Board and Card Games/_pwa` (repo game-pwa); never edit here. `pwa.js` loads (defer) just before `app.mjs`; its `data-version` = the `?v=` build, bump together. `PWA.safeToReload` is at the end of app.mjs: true only when not online, no sheet/cover, no focused field, and game over or a saved game while on Rules/Settings. Test: `npm run test:pwa` (~1 min, WebKit; `--engine chromium`). `tests/pwa-check.json` drives the play.
- Computer / pass-the-phone games are saved in localStorage `battleship:v1` → `local` during firing and resumed on load (`game.setup` with `options.resume`).

## Decisions
- 1967 "variant" = Milton Bradley names (Aircraft Carrier, Battleship, Cruiser, Submarine, Destroyer) + Salvo called all at once; sizes are the same 5/4/3/3/2 (sources agree).
- Hits name the ship by default (Hasbro rule); "Name the ship hit" off = Hasbro's harder Salvo.
- Heatmap = per-ship placement counts combined as independent; calibration over 800 games sits on the diagonal, so no joint sampler.
- Computer levels named by method (Random / Hunt & target / Density), not Easy/Medium/Hard.
- Placement starts pre-randomised so Ready works on the first tap.
- Best-shot ring animates in once (no endless spin). Sideways phone gets grid-left / controls-right.
- Online message lines say "You" for your own seat; names over 12 characters are cut with "…".
- Ship positions never in `publicView`, even after the game; local games reveal the computer's fleet at the end from the local state.
- Browser Back goes to the previous tab (79be9f1), not off the page.
- FX v10: your hits `explosion`, hits on your fleet a duller `hit` thud (so you can tell by ear); no extra "your turn" pulse (the existing blue board glow does it); grid cells skip the automatic button tap (aiming has its own `click`).
- Table look v11: dark wood table; grey plastic case; your ships are placed on the big board drawn as the ocean base (real game: ships go in the base), then the big board is the upright target lid; sunk enemy ships on the lid are a faint outline under the red pegs; peg tray = 84 white + 42 red per case, shown in proportion; opponent name plate hidden under 380 px (tally needs the room); heatmap colours and selection rings kept as they were (helpers, Tim's v9 look).
- Edge pass v12 (Tim didn't pick these, plainest matching choice): phone tally drops the ship name once hit (count only); paper "can't fit" and "All N sunk" lines; leave toast wording; laptop base 1.26× its row height; smaller Leave button on phones.
- Visibility v13 (Tim didn't pick these, plainest matching choice): laptop base moved from under the lid to beside it; tap-to-enlarge your fleet (⤢ after "Your fleet", ✕ while big; closes on tap, resize, tab change, new game, pass-the-phone cover); laptop heat numbers scale with the squares (still dimmed); sideways phone lid column only as wide as the lid.
- Design pass v9: heatmap amber→red with the faintest cells left clear; target board glows blue on your shot; status is a pill; Fire is neutral until a square is picked; small controls get invisible 40px hit areas; Lab/Rules/Settings show the Play status (not Paper's); tray ship icons on laptop only (phone tray stays one row).

## NOT verified
- The printed 1967 rule sheet itself (no scan found); 1967 facts come from secondary sources (see rules-check).
- Real iPhone (only WebKit headless at 393 px). Drag on a real touch screen not tried.
- 1967 "advanced Salvo" (only the number of hits announced) not built.
- Design pass (v9, 2026-10-20) checked only in headless WebKit 393 px + 1280 desktop; heatmap colours, fleet-tally size, turn glow not seen on a real iPhone.
- Firestore logs "access control checks" errors in Safari when a page reloads/leaves mid-request (inside online.js/Firebase; harmless). online.js marks empty seats `online:true` (worked around in our lobby; reported, not edited).
- Sounds never heard: headless WebKit on Windows has no Web Audio. Sound calls verified by spying `FX.play` in the browser and by node tests with a fake AudioContext; real loudness/feel on iPhone untested. Shake/stars/confetti seen only in headless screenshots (low frame rate). Online FX not run with two browsers (same code path as local: snapshot diff).
- Table look v11: the ocean grid's 3-D lean seen only in headless Chrome, not in WebKit/iOS. No real iPhone look. Pegs/tray/lid are original CSS/SVG.
- Edge pass v12: opponent-leave toast and double-Fire guard checked with fake online snapshots, not two real browsers; no real iPhone; a browser that draws no transform at all would still be fine for layout but untested.
- Visibility v13: headless WebKit + Chrome only (393, 320, 659×393, 1280, 1440); tap-to-enlarge not tried on a real iPhone. In Chrome/iOS the laptop base's 3-D lean leaves a gap under "Your fleet" and shrinks its far rows. Scripts: session scratchpad `vis/battleship/` (shoot.mjs, check.mjs).
- Home-screen app v14: never added to a real iPhone home screen; offline + new-build pickup checked only in headless WebKit/Chromium against a Pages-like local server (and the live service worker in headless WebKit). The "New version — tap to reload" pill (dark, top centre) is the kit's plain look; Tim hasn't seen it.
- "Findable" under no-touch compares against the touching-allowed reference rescaled to the no-touch average (reasoned approximation).
