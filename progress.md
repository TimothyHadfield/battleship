# Battleship — progress

## START HERE
Read order: this file → `CLAUDE.md` → `docs/rules-check.md` → `docs/ideas.md`. Last updated: 2026-10-20.
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

## Standing instructions (Tim's words)
- "could you really check out the board and card games projects I have going … Base the style off of what I did with the other games with a similar aspect and thought process behind it"
- Phase 2: "build regular play online with a computer or other online players for all the games and their common varients that match exactly the play of the in-person game." · "Brainstorm what additions you can do to the game with data, exploration, theory" · "Really work on the webdesign of the games, aswell as art, fitting it with an iphone and computer" · "make sure that everything works properlly without errors" · "Make sure to get everything right like rules and artwork and specific numbers"
- Newest: "add risk, clue, battleship, connect four, stratego, clue, checkers, pandemic, splendor, king of tokyo, 7 wonders, and evolution to the list of games."
- Money $0; no copyrighted art or rulebook text; never write in a `.claude` folder.

## Traps
- **Firestore refuses arrays inside arrays in a move doc.** Place moves are `{t:'place', ships:[{cells:[…]}]}` (`E.placeMove`). `tests/online.test.mjs` checks every bot move for nesting. Found live 2026-10-20.
- `js/online.js` is a verbatim copy of `_online/online.js`; never edit here.
- Lab numbers are baked into `js/lab-data.js`; rerun `node tools/lab-data.js 0.4` after changing a computer or the heatmap.
- Port 8731 on this laptop is taken by another server; serve locally with `python -m http.server <port> --directory <folder>`.

## Decisions
- 1967 "variant" = Milton Bradley names (Aircraft Carrier, Battleship, Cruiser, Submarine, Destroyer) + Salvo called all at once; sizes are the same 5/4/3/3/2 (sources agree).
- Hits name the ship by default (Hasbro rule); "Name the ship hit" off = Hasbro's harder Salvo.
- Heatmap = per-ship placement counts combined as independent; calibration over 800 games sits on the diagonal, so no joint sampler.
- Computer levels named by method (Random / Hunt & target / Density), not Easy/Medium/Hard.
- Placement starts pre-randomised so Ready works on the first tap.
- Ship positions never in `publicView`, even after the game; local games reveal the computer's fleet at the end from the local state.

## NOT verified
- The printed 1967 rule sheet itself (no scan found); 1967 facts come from secondary sources (see rules-check).
- Real iPhone (only WebKit headless at 393 px). Drag on a real touch screen not tried.
- 1967 "advanced Salvo" (only the number of hits announced) not built.
