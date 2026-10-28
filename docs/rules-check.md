# Rules check — Battleship

Every rule and number the engine uses, with where it was checked. Tests that assert it are in `tests/engine.test.js`.

Sources:
- **[H]** Hasbro official rules sheet F4527 (current box), downloaded from `https://consumercare.hasbro.com/api/download/F4527_en-us` and read with `pdftotext` (2026-10-20).
- **[W]** Wikipedia, "Battleship (game)" — ship table for the 1990 Milton Bradley rules, the 2002 Hasbro renaming, the Salvo variant history (2026-10-20).
- **[G]** Geeky Hobbies, "How to Play Battleship" — written from the 1967 Milton Bradley rules (says so on the page); includes Salvo and "advanced Salvo" (2026-10-20).
- **[T]** toytales.ca, "Battleship from Milton Bradley (1967)" — 1967 box contents: 10 plastic ships (5 per player): destroyer, submarine, cruiser, battleship, carrier.

| Rule / number | Value used | Sources | Test |
|---|---|---|---|
| Grid | 10×10, rows A–J, columns 1–10, called like "D-4" | H (example "D-4"), W | labels test |
| Fleet, Hasbro 2002+ | Carrier 5, Battleship 4, Destroyer 3, Submarine 3, Patrol Boat 2 | H (ship list with holes), W (2002 table) | fleet test |
| Fleet, 1967 Milton Bradley | Aircraft Carrier 5, Battleship 4, Cruiser 3, Submarine 3, Destroyer 2 | G (1967 rules: 5/4/3/3/2, destroyer 2, cruiser 3), W (1990 MB table, same names and sizes), T (five ship types) | fleet test |
| Total ship squares | 17 | H, W, G (sum) | fleet test |
| Placement | Straight across or down, never diagonal, not off the grid, no overlap | H ("horizontally or vertically, but not diagonally"; not over the letters/numbers), W, G | placement test |
| Touching | Allowed by the official rules (none of H/W/G forbids it). "Ships can't touch" (incl. corners) is a common house rule → Settings switch, off by default | H, W, G (silent = allowed) | no-touch test |
| Turn | One shot per turn, alternate | H ("calling out one shot per turn") | scripted game |
| Who starts | "Decide who will go first" → Settings: Random / You / Other | H | — |
| Hit report | Defender says hit **and names the ship** | H ("Your opponent tells you which ship you hit"), W | scripted game |
| Sinking | When every hole of a ship is hit, its owner announces which ship sank | H, W, G | scripted game |
| Win | Sink all 5 enemy ships first | H, W, G | scripted game |
| Salvo: shot count | One shot per own ship afloat: 5 at start, lose one per own ship sunk (on your next turn) | H ("lose one shot in the salvo on your next turn"), W, G | Salvo test |
| Salvo: Hasbro calling | Shots fired one at a time, each answered before the next | H ("You fire them one at a time, and your opponent announces whether the shot is a hit or a miss") | Salvo test |
| Salvo: 1967 calling | All shots called at once (white pegs as placeholders), then the defender says which hit and which ships | G | Salvo-all test |
| Harder Salvo (Hasbro) | Don't announce which ships are hit → "Name the ship hit" switch off (sinkings still announced) | H ("For a more challenging Salvo game, don't announce which ships are hit.") | unnamed test |

### House rules (2026-10-28, all off by default; not in the official box)
| Rule | Value used | Basis | Test |
|---|---|---|---|
| Hit = shoot again | A hit keeps the turn, a miss passes it; ignored under Salvo | common house rule (our choice of wording) | `tests/variants.test.mjs` §3 |
| Board 8×8 | Fleet without the Carrier: 4, 3, 3, 2 | our choice (keeps the share of the board covered close to 10×10) | §1 |
| Board 12×12 | Standard fleet + Frigate 4 + Corvette 3 (names are ours) | our choice | §1 |
| Small fleet | 4, 3, 2 (Battleship, Destroyer/Cruiser, Patrol Boat/Destroyer) | our choice | §1 |
| Sea battle fleet | one 4, two 3s, three 2s, four 1s; no touching (incl. corners); hits not named | the common pencil-and-paper "Sea Battle" fleet (from memory; no source re-read this pass, NOT verified) | §1, §2 |
| Computer ladder | Density < Hunt & target < Random avg shots on every board/fleet | measured, `node tests/variants.test.mjs` | §6 |

## Not built / not verified
- **1967 "advanced Salvo"** (defender only says how many shots hit, not which) [G]: not built. It makes the heatmap a different, much harder problem; listed in docs/ideas.md.
- **Original 1967 rulebook scan** not found online; the 1967 fleet comes from G (states it follows the 1967 rules) cross-checked with W's 1990 Milton Bradley table and T's box contents. NOT verified against the printed 1967 sheet.
- The 1931 pencil-and-paper "Salvo" fleets (different ship counts) are not included.
