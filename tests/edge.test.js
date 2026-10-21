// Weird-but-legal rules moments (edge pass 2026-10-20). Run: node tests/edge.test.js
'use strict';
const assert = require('node:assert/strict');
const E = require('../js/engine.js'), D = require('../js/density.js'), AI = require('../js/ai.js');
let pass = 0;
const ok = (m) => { pass++; console.log('  PASS  ' + m); };
function mul(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const cell = (s) => { const m = /^([A-J])-?(\d+)$/.exec(s); return 'ABCDEFGHIJ'.indexOf(m[1]) * 10 + (+m[2] - 1); };
const cells = (...a) => a.map(cell);
const F = E.FLEETS.hasbro;
// fleet 0: rows A..E from column 1; fleet 1: same shape
const fleetA = [cells('A-1', 'A-2', 'A-3', 'A-4', 'A-5'), cells('C-1', 'C-2', 'C-3', 'C-4'), cells('E-1', 'E-2', 'E-3'), cells('G-1', 'G-2', 'G-3'), cells('I-1', 'I-2')];
const all17 = [].concat(...fleetA);
const start = (opts) => {
  let s = E.newGame(Object.assign({ first: 0 }, opts));
  s = E.apply(s, 0, E.placeMove(fleetA));
  s = E.apply(s, 1, E.placeMove(fleetA));
  return s;
};
const throws = (fn, re) => assert.throws(fn, re);

// 1. Salvo one-at-a-time: the last ship sinks on an early shot of a salvo -> over at once, nothing more accepted
{
  let s = start({ salvo: true });
  // seat 0 fires 5 per volley; seat 1 always misses in the far corner squares
  const misses = []; for (let c = 99; misses.length < 60; c--) if (!all17.includes(c)) misses.push(c);
  let mi = 0, ti = 0;
  while (s.phase === 'fire') {
    if (s.turn === 0) s = E.apply(s, 0, { t: 'fire', cells: [all17[ti++]] });
    else s = E.apply(s, 1, { t: 'fire', cells: [misses[mi++]] });
  }
  assert.equal(s.winner, 0); assert.equal(s.shots[1].length, 17);
  assert.equal(s.shotsLeft, 0);
  assert.ok(17 % 5 !== 0, 'the winning shot falls mid-salvo');
  throws(() => E.apply(s, 0, { t: 'fire', cells: [misses[0]] }), /not firing/);
  throws(() => E.apply(s, 1, { t: 'fire', cells: [misses[0]] }), /not firing/);
  ok('Salvo: the last ship sinking mid-salvo ends the game at once; any further shot from either side is refused');
}
// 2. Salvo all at once: the winning hit sits in the middle of the called list -> the rest are not recorded
{
  let s = start({ salvo: true, salvoAll: true });
  const misses = []; for (let c = 99; misses.length < 60; c--) if (!all17.includes(c)) misses.push(c);
  let mi = 0;
  // seat 0 sinks everything but the patrol boat's last square over three volleys
  const plan = all17.slice(0, 16);
  let pi = 0;
  while (pi < plan.length) {
    if (s.turn === 0) { const n = s.shotsLeft; const take = plan.slice(pi, pi + n); while (take.length < n) take.push(misses[mi++]); pi += n; s = E.apply(s, 0, { t: 'fire', cells: take }); }
    else s = E.apply(s, 1, { t: 'fire', cells: misses.slice(mi, mi += s.shotsLeft) });
  }
  while (s.turn !== 0) s = E.apply(s, 1, { t: 'fire', cells: misses.slice(mi, mi += s.shotsLeft) });
  const n = s.shotsLeft; assert.ok(n >= 2);
  const call = [misses[mi++], all17[16]]; while (call.length < n) call.push(misses[mi++]);
  const before = s.shots[1].length;
  s = E.apply(s, 0, { t: 'fire', cells: call });
  assert.equal(s.phase, 'over'); assert.equal(s.winner, 0);
  assert.equal(s.shots[1].length, before + 2, 'shots after the winning one are not recorded');
  ok('Salvo all at once: a winning hit in the middle of the call ends the game; later squares in the call are not recorded');
}
// 3. Salvo near a full board: shots owed never exceed the open squares
{
  let s = start({ salvo: true });
  // seat 1 calls every non-ship square (83) so seat 0's board has only 17 open squares, all ships... use seat 0 firing at empties instead
  const empties = []; for (let c = 0; c < 100; c++) if (!all17.includes(c)) empties.push(c);
  let e0 = 0, e1 = 0;
  while (e0 < empties.length - 2) {
    if (s.turn === 0) s = E.apply(s, 0, { t: 'fire', cells: [empties[e0++]] });
    else s = E.apply(s, 1, { t: 'fire', cells: [empties[e1++ % empties.length]] });
  }
  assert.ok(E.shotsFor(s, 0) <= 100 - s.shots[1].length);
  const st = JSON.parse(JSON.stringify(s)); st.shots[1] = Array.from({ length: 99 }, (_, c) => ({ c, h: 0, n: 1 })); // 1 open square left
  assert.equal(E.shotsFor(st, 0), 1);
  ok('Salvo: the shots you owe never exceed the squares still open (' + E.shotsFor(s, 0) + ' with ' + (100 - s.shots[1].length) + ' open)');
}
// 5. bad fire actions
{
  const s = start({});
  for (const bad of [[5, 5], [5.5], ['5'], [-1], [100], [null], []]) throws(() => E.apply(s, 0, { t: 'fire', cells: bad }));
  throws(() => E.apply(s, 0, { t: 'fire' }));
  throws(() => E.apply(s, 0, null), /bad move/);
  const s2 = start({ salvo: true, salvoAll: true });
  throws(() => E.apply(s2, 0, { t: 'fire', cells: [50, 51, 52, 53, 53] }), /already called/);
  ok('fire: duplicate, fractional, text, off-board, missing and short calls are all refused');
}
// 6. bad place actions
{
  const s = E.newGame({});
  const dup = fleetA.slice(); dup[4] = fleetA[3].slice(0, 2);
  throws(() => E.apply(s, 0, E.placeMove(dup)), /overlap/);
  throws(() => E.apply(s, 0, { t: 'place', ships: fleetA.map((c) => ({ cells: c.map(String) })) }), /straight/);
  throws(() => E.apply(s, 0, E.placeMove(fleetA.concat([cells('J-9', 'J-10')])) ), /all 5/);
  throws(() => E.apply(s, 0, { t: 'place', ships: null }));
  throws(() => E.apply(s, 0, { t: 'place', ships: [null, null, null, null, null] }));
  throws(() => E.apply(s, 2, E.placeMove(fleetA)), /bad seat/);
  ok('place: overlapping, text, extra, empty and wrong-seat fleets are refused');
}
// 7. no-touch random fleets never fail and never touch
{
  const rng = mul(7);
  for (const ed of ['hasbro', 'mb1967']) for (let i = 0; i < 1500; i++) {
    const f = AI.randomFleet(E.FLEETS[ed], true, rng);
    assert.equal(E.fleetError(f, E.FLEETS[ed], true), null);
  }
  ok('3,000 random no-touch fleets (both editions) are all legal');
}
// 12. heatmap on answers that can't be true: no NaN, best = -1, max 0
{
  const K = D.blank(F, { named: true });
  // misses on every square of rows A-J columns 1-4 and 6-10 except column 5 -> carrier only fits column 5 vertically; also miss E-5
  for (let c = 0; c < 100; c++) if (c % 10 !== 4 || c >= 40) K.cell[c] = 1; // only A-5..D-5 open: no room for the carrier
  const h = D.heat(K);
  assert.ok(h.p.every((x) => Number.isFinite(x)));
  assert.deepEqual(D.unfittable(K), ['carrier']);
  assert.deepEqual(D.unfittable(D.blank(F)), []);
  const K2 = D.blank(F, { named: false }); for (let c = 0; c < 100; c++) if (c >= 3) K2.cell[c] = 1; // three squares left
  assert.deepEqual(D.unfittable(K2), ['carrier', 'battleship']);
  for (let c = 0; c < 100; c++) K.cell[c] = 1;
  const h2 = D.heat(K); assert.equal(h2.best, -1); assert.equal(h2.max, 0);
  ok('heatmap: answers no fleet can fit give no NaN, and the ships with no room left are named');
}
console.log(pass + ' edge tests passed');
