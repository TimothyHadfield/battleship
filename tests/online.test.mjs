// Online adapter tests: the game wrapper online.js runs, secrecy of what gets published, local rooms.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createLocal } from "../js/online.js";
import { makeGame } from "../js/game.mjs";
const require = createRequire(import.meta.url);
const E = require("../js/engine.js"), D = require("../js/density.js"), AI = require("../js/ai.js");
const game = makeGame(E, D, AI);
let pass = 0;
const ok = (m) => { pass++; console.log("  PASS  " + m); };
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const VARIANTS = [
  {}, { edition: "mb1967" }, { salvo: true }, { salvo: true, salvoAll: true }, { edition: "mb1967", salvo: true, salvoAll: true },
  { named: false }, { noTouch: true }, { salvo: true, named: false, noTouch: true },
];
const LV = ["easy", "medium", "hard"];
// Firestore refuses arrays directly inside arrays in a move doc (found live 2026-10-20)
const nested = (x) => Array.isArray(x) ? x.some((y) => Array.isArray(y) || nested(y)) : x && typeof x === "object" ? Object.values(x).some(nested) : false;
let nestedMoves = 0;

// 1. Bot-only games through the wrapper, every variant.
let games = 0, moves = 0, bad = 0, notJson = 0, empty = 0;
for (let g = 0; g < 48; g++) {
  const rng = mulberry(g + 1);
  const opt = Object.assign({ levels: [LV[g % 3], LV[(g + 1) % 3]] }, VARIANTS[g % VARIANTS.length]);
  let s = game.setup(2, opt, rng, []);
  let guard = 0;
  while (!game.isOver(s) && guard++ < 500) {
    const ta = game.toAct(s);
    if (!ta.length) { empty++; break; }
    for (const seat of ta) {
      try { const a = game.bot({ pub: game.publicView(s), mine: game.privateView(s, seat), state: s }, seat, rng); if (nested(a)) nestedMoves++; s = game.apply(JSON.parse(JSON.stringify(s)), seat, a); moves++; }
      catch (e) { bad++; console.log("  bot move failed:", e.message, JSON.stringify(opt)); guard = 1e9; break; }
    }
    if (JSON.stringify(JSON.parse(JSON.stringify(s))) !== JSON.stringify(s)) notJson++;
  }
  if (game.isOver(s)) { games++; assert.equal(s.sunk[1 - s.winner].length, 5); }
}
assert.equal(bad, 0, "bot moves are always legal");
assert.equal(nestedMoves, 0, "a move has an array inside an array (Firestore rejects it)");
assert.equal(games, 48); assert.equal(empty, 0); assert.equal(notJson, 0);
ok(`48 bot-only games over 8 variants reach the end (${moves} moves); someone always due to act; state is JSON-safe`);

// 2. Secrecy: ship positions never reach publicView or the other seat's privateView.
let checked = 0;
for (let g = 0; g < 40; g++) {
  const rng = mulberry(900 + g);
  let s = game.setup(2, Object.assign({ levels: ["hard", "medium"] }, VARIANTS[g % VARIANTS.length]), rng, []);
  const steps = g * 2;
  for (let k = 0; k < steps && !game.isOver(s); k++) {
    const seat = game.toAct(s)[0];
    s = game.apply(s, seat, game.bot({ pub: game.publicView(s), mine: game.privateView(s, seat) }, seat, rng));
  }
  if (game.isOver(s)) continue;
  for (let i = 0; i < 2; i++) {
    if (!s.ships[i]) continue;
    const pubText = JSON.stringify(game.publicView(s));
    assert.ok(!/ships/.test(pubText), "public view has no ships field");
    // move seat i's fleet somewhere else (keeping the shot record): public view and seat j's view must not change
    const s2 = JSON.parse(JSON.stringify(s));
    s2.ships[i] = AI.randomFleet(s.fleet, s.opts.noTouch, rng);
    assert.notDeepEqual(s2.ships[i], s.ships[i]);
    assert.equal(JSON.stringify(game.publicView(s2)), pubText, "public view depends on ship positions");
    assert.deepEqual(game.privateView(s2, 1 - i), game.privateView(s, 1 - i));
    assert.deepEqual(game.privateView(s, i).ships, s.ships[i]);
    checked++;
  }
}
assert.ok(checked > 40, "checked " + checked);
ok(`secrecy: in ${checked} mid-game positions, moving a hidden fleet changes nothing anyone else is sent`);

// 3. Illegal moves throw.
{
  const rng = mulberry(3);
  let s = game.setup(2, { first: 0 }, rng, []);
  assert.throws(() => game.apply(s, 0, { t: "fire", cells: [0] }));
  assert.throws(() => game.apply(s, 0, { t: "place", ships: [[0, 1, 2, 3, 4]] }));
  s = game.apply(s, 0, { t: "place", ships: AI.randomFleet(s.fleet, false, rng) });
  assert.throws(() => game.apply(s, 0, { t: "place", ships: AI.randomFleet(s.fleet, false, rng) }), /already/);
  s = game.apply(s, 1, { t: "place", ships: AI.randomFleet(s.fleet, false, rng) });
  assert.throws(() => game.apply(s, 1, { t: "fire", cells: [0] }), /turn/);
  assert.throws(() => game.apply(s, 0, { t: "fire", cells: [100] }));
  assert.throws(() => game.apply(s, 0, { t: "fire", cells: [1, 2] }));
  ok("apply refuses moves out of turn, off the board, wrong shot counts and re-placing");
}

// 4. createLocal: you + a computer play to the end (your moves chosen by the bot code).
{
  const room = createLocal({ game, seats: ["human", "computer"], names: ["You"], botDelayMs: 1, rng: mulberry(11), options: { levels: ["hard", "hard"], salvo: true } });
  let last = null, errors = 0;
  room.on("change", (snap) => { last = snap; });
  room.on("error", () => errors++);
  room.start();
  assert.equal(last.mode, "local");
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 2000 && last.status !== "finished"; i++) {
    if (last.myTurn) room.act(game.bot({ pub: last.pub, mine: last.mine }, 0, Math.random));
    else await wait(2);
  }
  assert.equal(last.status, "finished"); assert.equal(errors, 0);
  assert.ok(last.pub.winner === 0 || last.pub.winner === 1);
  ok("local room (you + computer, Salvo) plays to the finish with no errors");
}
console.log(pass + " online tests passed");
