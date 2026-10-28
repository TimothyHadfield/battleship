// Improvement pass (v17): what reaches the player profile, the fixed computer fleets (Daily, guided game),
// and that a fixed fleet never leaks to the other player.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { makeGame } from "../js/game.mjs";
import { profileResult, quitResult, dailyFleet, BS_LEVELS, BS_ACHIEVEMENTS } from "../js/profile-bs.mjs";
import { guidedFleet, tourSteps, CAPTAINS } from "../js/guide.mjs";
const require = createRequire(import.meta.url);
const E = require("../js/engine.js"), D = require("../js/density.js"), AI = require("../js/ai.js");
const game = makeGame(E, D, AI);
let pass = 0;
const ok = (m) => { pass++; console.log("  PASS  " + m); };
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// a real full game, two computers, standard rules; returns the host state
function play(seed, opts) {
  const rng = mulberry(seed);
  let s = game.setup(2, opts, rng);
  for (let guard = 0; guard < 2000 && !game.isOver(s); guard++) {
    const seat = game.toAct(s)[0];
    const pub = game.publicView(s);
    s = game.apply(s, seat, game.bot({ pub, mine: game.privateView(s, seat), state: s }, seat, rng));
  }
  return s;
}
const sortFleet = (f) => f.map((c) => c.slice().sort((a, b) => a - b).join(",")).join("|");

// 1. a fixed fleet is what the computer places, every time
const G = guidedFleet();
for (let seed = 1; seed <= 5; seed++) {
  const s = play(seed, { levels: ["easy", "easy"], fixed: [null, G] });
  assert.equal(sortFleet(s.ships[1]), sortFleet(G), "seat 1 placed the guided fleet");
  assert.ok(game.isOver(s));
}
ok("guided fleet: the computer places exactly that fleet (5 full games)");
{
  const s = play(9, { levels: ["easy", "easy"], fixed: [null, [[0, 1, 2, 3, 4]]] }); // not a legal fleet -> random one
  assert.equal(s.ships[1].length, 5);
  ok("an illegal fixed fleet falls back to a random legal one");
}
{
  const s = game.setup(2, { fixed: [null, G] }, mulberry(3));
  const v = JSON.stringify(game.publicView(s)) + JSON.stringify(game.privateView(s, 0));
  assert.ok(!v.includes('"fixed"'), "fixed fleet is host-only");
  ok("the fixed fleet is not in the public view or the other player's view");
}

// 2. Daily fleet: same day = same fleet, other day = other fleet, always legal
{
  const std = E.newGame({}, mulberry(1)).fleet || game.publicView(game.setup(2, {}, mulberry(1))).fleet;
  const a = dailyFleet(AI, std, mulberry(20261027)), b = dailyFleet(AI, std, mulberry(20261027)), c = dailyFleet(AI, std, mulberry(20261028));
  assert.equal(sortFleet(a), sortFleet(b));
  assert.notEqual(sortFleet(a), sortFleet(c));
  assert.ok(!E.fleetError(a, std, false));
  ok("Daily fleet: same seed same fleet, next day differs, legal");
}

// 3. profile results from real finished games
{
  const s = play(4, { levels: ["hard", "medium"] });
  const pub = game.publicView(s);
  const you = 0, won = pub.winner === you;
  const r = profileResult({ mode: "computer", level: "medium", pub, you });
  assert.equal(r.mode, "computer"); assert.equal(r.level, "medium"); assert.equal(r.won, won);
  assert.equal(r.extra.shots, pub.shots[1].length);
  assert.equal(r.score, won ? pub.shots[1].length : null);
  const h = profileResult({ mode: "computer", level: "medium", pub, you, helped: true });
  assert.equal(h.mode, "help"); assert.equal(h.level, null);
  const d = profileResult({ mode: "computer", level: "hard", pub, you, daily: true, helped: true });
  assert.equal(d.mode, "computer"); assert.equal(d.daily, true);
  assert.equal(profileResult({ mode: "pass", level: "hard", pub, you: -1 }).mode, "pass");
  ok("finished game: rated / with help / Daily / pass-the-phone records");
}

// 4. quitting: a loss only after your first shot, never in a guided game
{
  let s = game.setup(2, { levels: ["easy", "easy"], first: 0 }, mulberry(5));
  const rng = mulberry(6);
  while (game.publicView(s).phase === "place") { const seat = game.toAct(s)[0]; s = game.apply(s, seat, game.bot({ pub: game.publicView(s), state: s }, seat, rng)); }
  let pub = game.publicView(s);
  assert.equal(quitResult({ mode: "computer", level: "easy", pub }), null, "no shot yet: nothing");
  s = game.apply(s, game.toAct(s)[0], game.bot({ pub, state: s }, game.toAct(s)[0], rng));
  pub = game.publicView(s);
  const anyShot = pub.shots[1].length > 0;
  assert.ok(anyShot, "you fired once");
  const q = quitResult({ mode: "computer", level: "easy", pub });
  assert.equal(q.won, false); assert.equal(q.mode, "computer"); assert.equal(q.quit, true);
  assert.equal(quitResult({ mode: "computer", level: "easy", pub, guided: true }), null);
  assert.equal(quitResult({ mode: "computer", level: "easy", pub, helped: true }).mode, "help");
  assert.equal(quitResult({ mode: "pass", level: "easy", pub }), null);
  ok("quit: nothing before your first shot, a loss after it, never in a guided game");
}

// 5. ladder ratings in order, achievements and captains complete
assert.ok(BS_LEVELS[0].rating < BS_LEVELS[1].rating && BS_LEVELS[1].rating < BS_LEVELS[2].rating);
assert.equal(new Set(BS_ACHIEVEMENTS.map((a) => a.id)).size, BS_ACHIEVEMENTS.length);
for (const lv of AI.LEVELS) for (const k of ["name", "hello", "sank", "ouch", "win", "lose"]) assert.ok(CAPTAINS[lv] && CAPTAINS[lv][k], lv + "." + k);
assert.equal(tourSteps({ phase: () => "place", myShots: () => 0, myHits: () => 0, sunkByMe: () => 0 }).length, 8);
ok("ratings ordered, achievement ids unique, every captain has all lines, 8 guided steps");

console.log(`profile: ${pass} passed`);
