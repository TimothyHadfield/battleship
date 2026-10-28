// House rules added 2026-10-28: board size (8x8 / 10x10 / 12x12), other fleets (small, sea battle),
// "hit = shoot again". Engine facts, full computer games under each, and the computer ladder under each.
// Run: node tests/variants.test.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { makeGame } from "../js/game.mjs";
const require = createRequire(import.meta.url);
const E = require("../js/engine.js"), D = require("../js/density.js"), AI = require("../js/ai.js"), S = require("../js/sim.js");
const game = makeGame(E, D, AI);
let pass = 0;
const ok = (m) => { pass++; console.log("  PASS  " + m); };
function mul(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const lens = (o) => E.fleetOf(o).map((s) => s.len);

// ---- 1. fleets and boards
assert.deepEqual(lens({}), [5, 4, 3, 3, 2]);
assert.deepEqual(lens({ size: 8 }), [4, 3, 3, 2]);
assert.deepEqual(lens({ size: 12 }), [5, 4, 3, 3, 2, 4, 3]);
assert.deepEqual(lens({ fleet: "small" }), [4, 3, 2]);
assert.deepEqual(lens({ fleet: "sea" }), [4, 3, 3, 2, 2, 2, 1, 1, 1, 1]);
for (const size of [8, 10, 12]) for (const fleet of ["standard", "small", "sea"]) for (const edition of ["hasbro", "mb1967"]) {
  const f = E.fleetOf({ size, fleet, edition });
  assert.equal(new Set(f.map((s) => s.id)).size, f.length, "ship ids unique " + size + fleet);
}
assert.deepEqual(E.fleetOf({ size: 12, edition: "mb1967" }).slice(0, 5).map((s) => s.name), ["Aircraft Carrier", "Battleship", "Cruiser", "Submarine", "Destroyer"]);
const so = E.normOpts({ fleet: "sea", named: true, noTouch: false });
assert.equal(so.noTouch, true); assert.equal(so.named, false);
assert.equal(E.normOpts({ size: 9 }).size, 10); assert.equal(E.normOpts({ size: 12 }).size, 12);
assert.equal(E.normOpts({ again: true, salvo: true }).again, false);
assert.equal(E.normOpts({ again: true }).again, true);
ok("fleets: 8x8 drops the carrier (4,3,3,2), 12x12 adds 4+3, small 4,3,2, sea battle 4,3,3,2,2,2,1,1,1,1 (no touching, unnamed hits)");

for (const n of [8, 12]) for (let L = 2; L <= 5; L++) assert.equal(E.placements(L, n).length, 2 * n * (n + 1 - L));
assert.equal(E.placements(1, 10).length, 100);
assert.equal(E.label(143, 12), "L-12"); assert.equal(E.label(63, 8), "H-8"); assert.equal(E.label(99), "J-10");
assert.deepEqual(E.rc(13, 12), [1, 1]);
ok("geometry: L-long ship fits 2n(n+1-L) ways on n x n, one-square ships once per square; labels A-1..L-12");

// ---- 2. placing on other boards
{
  const f8 = E.fleetOf({ size: 8 });
  const fl = AI.randomFleet(f8, false, mul(3), 8);
  assert.equal(E.fleetError(fl, f8, false, 8), null);
  assert.ok(fl.flat().every((c) => c < 64));
  const off = fl.slice(); off[0] = [60, 61, 62, 63].map((c) => c + 8); // row I does not exist on 8x8
  assert.match(E.fleetError(off, f8, false, 8) || "", /straight/);
  const wrap = fl.slice(); wrap[0] = [6, 7, 8, 9]; // wraps to the next row on 8x8
  assert.match(E.fleetError(wrap, f8, false, 8) || "", /straight|overlap/);
  for (const size of [8, 10, 12]) for (let t = 0; t < 200; t++) {
    const f = E.fleetOf({ size, fleet: "sea" });
    const s = AI.randomFleet(f, true, mul(t + 1), size);
    assert.equal(E.fleetError(s, f, true, size), null);
  }
}
ok("placement on 8x8 refuses squares off the board and row wraps; 600 random sea-battle fleets (no touching) are legal on every size");

// ---- 3. hit = shoot again
{
  const f = E.fleetOf({});
  const ships = [[0, 1, 2, 3, 4], [20, 30, 40, 50], [97, 98, 99], [44, 45, 46], [72, 82]];
  let s = E.newGame({ first: 0, again: true }, mul(1));
  s = E.apply(s, 0, E.placeMove(ships)); s = E.apply(s, 1, E.placeMove(ships));
  s = E.apply(s, 0, { t: "fire", cells: [0] });          // hit: shoot again
  assert.deepEqual(E.toAct(s), [0]); assert.equal(s.shotsLeft, 1);
  s = E.apply(s, 0, { t: "fire", cells: [1] });          // hit again
  assert.deepEqual(E.toAct(s), [0]);
  s = E.apply(s, 0, { t: "fire", cells: [10] });         // miss: turn passes
  assert.deepEqual(E.toAct(s), [1]);
  assert.deepEqual(s.shots[1].map((x) => x.n), [1, 1, 1]);
  let t = E.newGame({ first: 0 }, mul(1));
  t = E.apply(t, 0, E.placeMove(ships)); t = E.apply(t, 1, E.placeMove(ships));
  t = E.apply(t, 0, { t: "fire", cells: [0] });
  assert.deepEqual(E.toAct(t), [1], "official rules: a hit still passes the turn");
  let u = E.newGame({ first: 0, again: true, salvo: true }, mul(1));
  u = E.apply(u, 0, E.placeMove(ships)); u = E.apply(u, 1, E.placeMove(ships));
  for (const c of [0, 1, 2, 3, 4]) u = E.apply(u, 0, { t: "fire", cells: [c] });
  assert.deepEqual(E.toAct(u), [1], "Salvo ignores shoot-again");
}
ok("hit = shoot again: a hit keeps the turn, a miss passes it; off = official; Salvo ignores it");

// ---- 4. whole computer games under every new rule, through the online.js wrapper
const VAR = [{ size: 8 }, { size: 12 }, { fleet: "small" }, { fleet: "sea" }, { again: true }, { size: 8, fleet: "sea" }, { size: 12, fleet: "sea", salvo: true },
  { size: 8, again: true, named: false }, { fleet: "small", salvo: true, salvoAll: true }, { size: 12, noTouch: true, again: true }];
const LV = AI.LEVELS;
let done = 0;
for (let g = 0; g < VAR.length * 3; g++) {
  const rng = mul(g + 7), o = VAR[g % VAR.length];
  let s = game.setup(2, Object.assign({ levels: [LV[g % 3], LV[(g + 1) % 3]] }, o), rng);
  const n = s.opts.size, F = s.fleet;
  let guard = 0;
  while (!game.isOver(s) && guard++ < 600) for (const seat of game.toAct(s)) {
    const a = game.bot({ pub: game.publicView(s), mine: game.privateView(s, seat), state: s }, seat, rng);
    if (a.t === "fire") assert.ok(a.cells.every((c) => c >= 0 && c < n * n));
    s = game.apply(JSON.parse(JSON.stringify(s)), seat, a);
  }
  assert.ok(game.isOver(s), "game ends " + JSON.stringify(o));
  assert.equal(s.sunk[1 - s.winner].length, F.length);
  assert.equal(game.publicView(s).opts.size, n);
  done++;
}
ok(done + " computer-vs-computer games finish legally under 8x8, 12x12, small, sea battle, shoot-again and mixes");

// ---- 5. the heatmap on other boards: honest totals before any shot
for (const o of [{ size: 8 }, { size: 12 }, { fleet: "sea" }]) {
  const opts = E.normOpts(o), f = E.fleetOf(opts);
  const h = D.heat(D.blank(f, opts));
  assert.equal(h.p.length, opts.size * opts.size);
  const sq = f.reduce((a, s) => a + s.len, 0), m = D.mass(h);
  assert.ok(Math.abs(m - sq) / sq < 0.12, "mass " + m.toFixed(1) + " vs " + sq);
}
ok("blank heatmap on 8x8 / 12x12 / sea battle sums to about the fleet's squares");

// ---- 6. the ladder holds under every new rule: Density < Hunt & target < Random (shots to sink the same fleets)
for (const o of [{ size: 8 }, { size: 12 }, { fleet: "small" }, { fleet: "sea" }]) {
  const opts = E.normOpts(o), f = E.fleetOf(opts), rng = mul(99), G = o.size === 12 ? 24 : 40, tot = { easy: 0, medium: 0, hard: 0 };
  for (let g = 0; g < G; g++) {
    const fl = AI.randomFleet(f, opts.noTouch, rng, opts.size);
    for (const lv of LV) tot[lv] += S.shotsToSink(lv, f, fl, opts, rng);
  }
  const m = (lv) => tot[lv] / G;
  assert.ok(m("hard") < m("medium") && m("medium") < m("easy"), JSON.stringify(o) + " " + LV.map(m).join(" / "));
  console.log("        " + JSON.stringify(o) + "  Random " + m("easy").toFixed(1) + " · Hunt " + m("medium").toFixed(1) + " · Density " + m("hard").toFixed(1));
}
{
  const rng = mul(5); let w = 0; const G = 120;
  for (let g = 0; g < G; g++) if (S.duel("hard", "medium", { again: true }, rng, g % 2).winner === 0) w++;
  assert.ok(w / G > 0.6, "Density beats Hunt with shoot-again " + w + "/" + G);
  console.log("        shoot-again: Density beats Hunt & target " + w + "/" + G);
}
ok("ladder: Density needs fewer shots than Hunt & target, which needs fewer than Random, on every new board and fleet; Density wins head-to-head with shoot-again");

// ---- 7. My stats: the "Win in 40 shots" achievement only counts on the official board and fleet
{
  const { profileResult, BS_ACHIEVEMENTS } = await import("../js/profile-bs.mjs");
  const sharp = BS_ACHIEVEMENTS.find((a) => a.id === "sharp");
  const pubOf = (opts) => ({ opts: E.normOpts(opts), winner: 0, shots: [[], Array.from({ length: 30 }, (_, c) => ({ c, h: c < 12 ? 1 : 0 }))], sunk: [[], []] });
  const ctx = (r) => ({ stats: { wins: 1 }, last: { won: true, level: "hard", extra: r.extra }, daily: { streak: 0 } });
  assert.equal(sharp.test(ctx(profileResult({ mode: "computer", level: "hard", pub: pubOf({}), you: 0 }))), true);
  for (const o of [{ size: 8 }, { fleet: "small" }, { again: true }])
    assert.equal(sharp.test(ctx(profileResult({ mode: "computer", level: "hard", pub: pubOf(o), you: 0 }))), false, JSON.stringify(o));
}
ok("Sharpshooter (win in 40 shots) only on the official board and fleet without shoot-again");

console.log("variants: " + pass + " passed");

