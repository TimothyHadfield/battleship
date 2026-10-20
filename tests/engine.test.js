// Engine, density and computer tests. Run: node tests/engine.test.js
'use strict';
const assert = require('node:assert/strict');
const E = require('../js/engine.js'), D = require('../js/density.js'), AI = require('../js/ai.js'), S = require('../js/sim.js');
let pass = 0;
const ok = (m) => { pass++; console.log('  PASS  ' + m); };
function mul(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const cell = (s) => { const m = /^([A-J])-?(\d+)$/.exec(s); return 'ABCDEFGHIJ'.indexOf(m[1]) * 10 + (+m[2] - 1); };
const cells = (...a) => a.map(cell);

// ---- fleet facts (docs/rules-check.md)
for (const ed of ['hasbro', 'mb1967']) {
  const f = E.FLEETS[ed];
  assert.deepEqual(f.map((s) => s.len), [5, 4, 3, 3, 2]);
  assert.equal(f.reduce((a, s) => a + s.len, 0), 17);
}
assert.deepEqual(E.FLEETS.hasbro.map((s) => s.name), ['Carrier', 'Battleship', 'Destroyer', 'Submarine', 'Patrol Boat']);
assert.deepEqual(E.FLEETS.mb1967.map((s) => s.name), ['Aircraft Carrier', 'Battleship', 'Cruiser', 'Submarine', 'Destroyer']);
ok('both fleets are 5 ships of 5,4,3,3,2 = 17 squares, with each edition\'s names');

for (let L = 1; L <= 5; L++) assert.equal(E.placements(L).length, L === 1 ? 200 : 2 * 10 * (11 - L));
assert.equal(E.label(cell('D-4')), 'D-4'); assert.equal(cell('J-10'), 99);
ok('a ship of length L fits 2x10x(11-L) ways on 10x10 (120 for the carrier); labels A-1..J-10');

// ---- placement legality
const F = E.FLEETS.hasbro;
const good = [cells('A-1', 'A-2', 'A-3', 'A-4', 'A-5'), cells('C-1', 'D-1', 'E-1', 'F-1'), cells('J-8', 'J-9', 'J-10'), cells('E-5', 'E-6', 'E-7'), cells('H-3', 'I-3')];
assert.equal(E.fleetError(good, F, false), null);
assert.equal(E.fleetError(good, F, true), null);
const bad = (ships, re, nt) => assert.match(E.fleetError(ships, F, !!nt) || '', re);
bad([cells('A-1', 'B-2', 'C-3', 'D-4', 'E-5'), ...good.slice(1)], /straight/);           // diagonal
bad([cells('A-1', 'A-2', 'A-3', 'A-5', 'A-6'), ...good.slice(1)], /straight/);           // gap
bad([cells('A-7', 'A-8', 'A-9', 'A-10', 'B-1'), ...good.slice(1)], /straight/);          // wraps a row
bad([good[0], cells('A-5', 'B-5', 'C-5', 'D-5'), ...good.slice(2)], /overlap/);
bad(good.slice(0, 4), /all 5/);
bad([good[0], good[1], good[2], good[3], cells('B-6', 'B-7')], /touch/, true);         // corner-touches carrier A-5
assert.equal(E.fleetError([good[0], good[1], good[2], good[3], cells('B-6', 'B-7')], F, false), null);
ok('placement: no diagonals, gaps, wrapping or overlap; no-touching house rule includes corners');

// ---- a scripted game
function placed(opts) {
  let s = E.newGame(Object.assign({ first: 0 }, opts), mul(1));
  s = E.apply(s, 0, { t: 'place', ships: good });
  assert.deepEqual(E.toAct(s), [1]);
  s = E.apply(s, 1, { t: 'place', ships: good });
  return s;
}
{
  let s = placed();
  assert.equal(s.phase, 'fire'); assert.deepEqual(E.toAct(s), [0]);
  assert.throws(() => E.apply(s, 1, { t: 'fire', cells: [0] }), /turn/);
  s = E.apply(s, 0, { t: 'fire', cells: [cell('A-1')] });
  assert.deepEqual(s.shots[1][0], { c: 0, h: 1, n: 1, s: 'carrier' });
  assert.deepEqual(E.toAct(s), [1]);
  s = E.apply(s, 1, { t: 'fire', cells: [cell('J-1')] });
  assert.equal(s.shots[0][0].h, 0);
  assert.throws(() => E.apply(s, 0, { t: 'fire', cells: [cell('A-1')] }), /already/);
  // sink the patrol boat
  s = E.apply(s, 0, { t: 'fire', cells: [cell('H-3')] }); s = E.apply(s, 1, { t: 'fire', cells: [cell('J-2')] });
  s = E.apply(s, 0, { t: 'fire', cells: [cell('I-3')] });
  assert.equal(s.shots[1].at(-1).k, 'patrol'); assert.deepEqual(s.sunk[1], ['patrol']);
  ok('turns alternate one shot each; hits name the ship; repeat calls refused; sinking is announced');
  // finish: seat 0 shoots all remaining squares, seat 1 keeps missing
  const rest = good.flat().filter((c) => !s.shots[1].some((x) => x.c === c));
  const misses = []; for (let c = 20; c < 100 && misses.length < 30; c++) if (!s.shots[0].some((x) => x.c === c) && c !== 99) misses.push(c);
  for (const c of rest) {
    if (s.turn === 1) s = E.apply(s, 1, { t: 'fire', cells: [misses.shift()] });
    s = E.apply(s, 0, { t: 'fire', cells: [c] });
  }
  assert.equal(s.phase, 'over'); assert.equal(s.winner, 0); assert.deepEqual(E.toAct(s), []);
  assert.throws(() => E.apply(s, 1, { t: 'fire', cells: [5] }));
  ok('sinking all five ships wins and ends the game');
}
{ // unnamed hits
  let s = placed({ named: false });
  s = E.apply(s, 0, { t: 'fire', cells: [cell('H-3')] }); s = E.apply(s, 1, { t: 'fire', cells: [cell('J-1')] });
  assert.equal(s.shots[1][0].s, undefined);
  s = E.apply(s, 0, { t: 'fire', cells: [cell('I-3')] });
  assert.equal(s.shots[1][1].k, 'patrol');
  ok('"don\'t name the ship" variant: hits are anonymous, sinkings still announced');
}
{ // salvo, one at a time
  let s = placed({ salvo: true });
  assert.equal(s.shotsLeft, 5); assert.equal(E.cellsPerAction(s), 1);
  for (let i = 0; i < 4; i++) { s = E.apply(s, 0, { t: 'fire', cells: [cell('J-' + (i + 1))] }); assert.equal(s.turn, 0); }
  s = E.apply(s, 0, { t: 'fire', cells: [cell('J-5')] });
  assert.equal(s.turn, 1); assert.equal(s.shotsLeft, 5);
  // seat 1 sinks seat 0's patrol boat inside its salvo
  s = E.apply(s, 1, { t: 'fire', cells: [cell('H-3')] }); s = E.apply(s, 1, { t: 'fire', cells: [cell('I-3')] });
  for (let i = 0; i < 3; i++) s = E.apply(s, 1, { t: 'fire', cells: [cell('G-' + (i + 6))] });
  assert.equal(s.turn, 0); assert.equal(s.shotsLeft, 4);
  ok('Salvo: 5 shots per turn, one fewer for each of your own ships sunk');
}
{ // salvo, all at once
  let s = placed({ salvo: true, salvoAll: true });
  assert.equal(E.cellsPerAction(s), 5);
  assert.throws(() => E.apply(s, 0, { t: 'fire', cells: [1] }), /5 shots/);
  assert.throws(() => E.apply(s, 0, { t: 'fire', cells: [50, 51, 52, 53, 53] }), /already/);
  s = E.apply(s, 0, { t: 'fire', cells: cells('A-1', 'A-2', 'J-1', 'J-2', 'J-3') });
  assert.equal(s.shots[1].length, 5); assert.equal(s.turn, 1);
  assert.deepEqual(s.shots[1].map((x) => x.h), [1, 1, 0, 0, 0]);
  ok('Salvo all at once (1967 box): every shot called together, each result announced');
}

// ---- density
{
  const K = D.blank(F, {});
  const h = D.heat(K);
  const at = (s) => h.p[cell(s)];
  assert.ok(Math.abs(at('A-1') - at('J-10')) < 1e-12 && Math.abs(at('A-10') - at('J-1')) < 1e-12, 'corner symmetry');
  assert.ok(at('E-5') > at('A-1') * 2, 'centre beats corner');
  // hand-worked: patrol boat covers A-1 in 2 of 180 spots
  const pat = D.heat(Object.assign(D.blank([F[4]], {})));
  assert.ok(Math.abs(pat.p[0] - 2 / 180) < 1e-12);
  // hand-worked: patrol boat covers E-5 in 4 of 180 spots
  assert.ok(Math.abs(pat.p[cell('E-5')] - 4 / 180) < 1e-12);
  ok('empty-board heatmap: symmetric, centre > corner, patrol boat at A-1 = 2/180 and E-5 = 4/180 (hand count)');
}
{
  // named hit on carrier at A-1: carrier can only be A-1..A-5 or A-1..E-1 -> A-2 is 1/2 for the carrier
  const K = D.blank([F[0]], {});
  K.cell[0] = 2; K.hitShip[0] = 'carrier'; K.shots.push({ c: 0, h: 1, s: 'carrier', n: 1 });
  assert.equal(D.namedCandidates(K, F[0]).length, 2);
  const h = D.heat(K);
  assert.ok(Math.abs(h.p[1] - 0.5) < 1e-12 && Math.abs(h.p[10] - 0.5) < 1e-12 && h.p[11] === 0);
  // brute force: the patrol boat alone with misses around E-5 except E-6 -> must be E-5/E-6? check vs enumeration
  const K2 = D.blank([F[4]], {});
  for (const m of cells('D-5', 'F-5', 'E-4')) { K2.cell[m] = 1; K2.shots.push({ c: m, h: 0, n: 1 }); }
  K2.cell[cell('E-5')] = 2; K2.hitShip[cell('E-5')] = 'patrol'; K2.shots.push({ c: cell('E-5'), h: 1, s: 'patrol', n: 1 });
  assert.equal(D.heat(K2).p[cell('E-6')], 1);
  ok('target mode: a named carrier hit in the corner splits 50/50; a boxed-in hit points to the only open side');
}
{
  // unnamed sunk resolution: hits A-1,A-2 sunk patrol (sinking shot A-2), live hit C-5
  const K = D.blank(F, { named: false });
  for (const [c, k] of [[cell('A-1')], [cell('A-2'), 'patrol'], [cell('C-5')]]) { K.cell[c] = 2; K.shots.push({ c, h: 1, n: 1 }); if (k) { K.sunk.push(k); K.sinks.push({ id: k, c, n: 1 }); } }
  const dead = D.deadCells(K);
  assert.ok(dead[0] && dead[1] && !dead[cell('C-5')]);
  ok('unnamed hits: squares that surely belong to a sunk ship are worked out');
}

// ---- computers
{
  const rng = mul(9);
  for (let i = 0; i < 1000; i++) {
    for (const nt of [false, true]) {
      const fl = AI.randomFleet(F, nt, rng);
      assert.equal(E.fleetError(fl, F, nt), null);
    }
  }
  ok('2,000 random fleets are all legal (with and without the no-touching rule)');
  for (const lv of AI.LEVELS) {
    for (let g = 0; g < 30; g++) {
      const T = new S.Target(F, AI.randomFleet(F, false, rng), { named: g % 2 === 0 });
      const seen = new Set();
      while (!T.done()) { const c = AI.choose(lv, T.K, 1, rng)[0]; assert.ok(!seen.has(c), lv + ' repeated'); seen.add(c); T.fire(c); }
      assert.ok(T.n <= 100);
    }
  }
  ok('every computer finishes a fleet without ever calling a square twice');
  const rngB = mul(77), avg = {};
  for (const lv of AI.LEVELS) {
    const r = []; for (let g = 0; g < 150; g++) r.push(S.shotsToSink(lv, F, AI.randomFleet(F, false, rngB), {}, rngB));
    avg[lv] = S.stats(r).mean;
  }
  assert.ok(avg.easy > 90 && avg.medium < 70 && avg.medium > 55 && avg.hard < 48, JSON.stringify(avg));
  ok('strength order holds: Random ~95, Hunt & target ~63, Density ~44 shots (150 games each: ' + Object.values(avg).map((x) => x.toFixed(1)).join(' / ') + ')');
}
console.log(pass + ' engine tests passed');
