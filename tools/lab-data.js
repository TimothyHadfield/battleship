// Measures the computers and writes js/lab-data.js.  node tools/lab-data.js [scale]   (scale 1 = full run)
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../js/engine.js'), D = require('../js/density.js'), AI = require('../js/ai.js'), S = require('../js/sim.js');
const scale = +(process.argv[2] || 1);
function mul(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rng = mul(20261020);
const F = E.FLEETS.hasbro, LV = AI.LEVELS;
const n = (x) => Math.max(20, Math.round(x * scale));
const t0 = Date.now();
const log = (m) => console.log(((Date.now() - t0) / 1000).toFixed(0) + 's  ' + m);
const r1 = (x) => Math.round(x * 10) / 10;
const pack = (st) => ({ n: st.n, mean: r1(st.mean), median: st.median, p10: st.p10, p90: st.p90, min: st.min, max: st.max });

const out = { made: new Date().toISOString().slice(0, 10), shots: {}, hist: {}, variants: {}, duels: [], calib: null, fleetMeans: {}, styles: [] };

// 1. Shots to sink a random fleet (official rules)
for (const lv of LV) {
  const G = n(lv === 'hard' ? 5000 : 10000), r = [];
  for (let g = 0; g < G; g++) r.push(S.shotsToSink(lv, F, AI.randomFleet(F, false, rng), {}, rng));
  out.shots[lv] = pack(S.stats(r));
  const h = new Array(101).fill(0); r.forEach((x) => h[x]++);
  out.hist[lv] = h.map((x) => +(x / G).toFixed(5));
  log(lv + ' ' + JSON.stringify(out.shots[lv]));
}

// 2. Same, under the variants that change what a shooter learns
for (const [key, opts] of [['unnamed', { named: false }], ['noTouch', { noTouch: true }]]) {
  out.variants[key] = {};
  for (const lv of LV) {
    const G = n(lv === 'hard' ? 2000 : 4000), r = [];
    for (let g = 0; g < G; g++) r.push(S.shotsToSink(lv, F, AI.randomFleet(F, !!opts.noTouch, rng), opts, rng));
    out.variants[key][lv] = pack(S.stats(r));
  }
  log(key + ' ' + JSON.stringify(out.variants[key]));
}

// 3. Head-to-head (first shooter alternates), standard / Salvo one-at-a-time / Salvo all-at-once
const PAIRS = [['hard', 'medium'], ['hard', 'easy'], ['medium', 'easy'], ['hard', 'hard']];
for (const [mode, opts] of [['standard', {}], ['salvo', { salvo: true }], ['salvoAll', { salvo: true, salvoAll: true }]]) {
  for (const [a, b] of PAIRS) {
    const G = n(2000); let wa = 0, firstWins = 0, volleys = 0;
    for (let g = 0; g < G; g++) {
      const first = g % 2, res = S.duel(a, b, opts, rng, first);
      if (res.winner === 0) wa++;
      if (res.winner === first) firstWins++;
      volleys += res.volleys;
    }
    out.duels.push({ mode, a, b, n: G, aWin: +(wa / G).toFixed(4), firstWin: +(firstWins / G).toFixed(4), turns: r1(volleys / G) });
  }
  log(mode + ' duels done');
}

// 4. Is the heatmap honest? Every unknown square at every shot, binned by its shown chance.
{
  const bins = Array.from({ length: 10 }, () => ({ n: 0, hit: 0, sumP: 0 }));
  for (const lv of ['hard', 'medium']) {
    const G = n(400);
    for (let g = 0; g < G; g++) {
      S.shotsToSink(lv, F, AI.randomFleet(F, false, rng), {}, rng, (K, c, hit, T) => {
        const h = D.heat(K);
        for (let q = 0; q < 100; q++) {
          if (K.cell[q]) continue;
          const b = bins[Math.min(9, Math.floor(h.p[q] * 10))];
          b.n++; b.sumP += h.p[q]; if (T.owner[q] >= 0) b.hit++;
        }
      });
    }
  }
  out.calib = bins.map((b, i) => ({ lo: i / 10, n: b.n, said: b.n ? +(b.sumP / b.n).toFixed(4) : null, was: b.n ? +(b.hit / b.n).toFixed(4) : null }));
  log('calibration ' + JSON.stringify(out.calib.map((b) => [b.said, b.was, b.n])));
}

// 5. Per-fleet average shots (for "how findable is your fleet": percentile of your fleet vs random fleets)
for (const lv of LV) {
  const fleets = n(lv === 'hard' ? 300 : 200), per = lv === 'hard' ? 40 : 40, means = [];
  for (let f = 0; f < fleets; f++) {
    const fl = AI.randomFleet(F, false, rng);
    let s = 0; for (let g = 0; g < per; g++) s += S.shotsToSink(lv, F, fl, {}, rng);
    means.push(r1(s / per));
  }
  out.fleetMeans[lv] = { per, means: means.sort((x, y) => x - y) };
  log('fleet means ' + lv);
}

// 6. Placement styles vs each computer
function styled(kind) {
  for (let t = 0; t < 5000; t++) {
    const fl = AI.randomFleet(F, kind === 'spread', rng);
    const cells = fl.flat();
    const edge = (c) => c < 10 || c >= 90 || c % 10 === 0 || c % 10 === 9;
    const touches = (i) => fl[i].some((c) => E.NB4[c].some((q) => !fl[i].includes(q) && cells.includes(q)));
    if (kind === 'edge' && !fl.every((p) => p.some(edge))) continue;
    if (kind === 'middle' && fl.some((p) => p.some(edge))) continue;
    if (kind === 'cluster' && !fl.every((p, i) => touches(i))) continue;
    return fl;
  }
  throw new Error('no ' + kind);
}
for (const [kind, label] of [['random', 'Anywhere'], ['edge', 'Every ship on an edge'], ['middle', 'No ship on an edge'], ['cluster', 'Ships side by side'], ['spread', 'No ships touching']]) {
  const row = { kind, label };
  for (const lv of LV) {
    const G = n(lv === 'hard' ? 1500 : 3000), r = [];
    for (let g = 0; g < G; g++) r.push(S.shotsToSink(lv, F, kind === 'random' ? AI.randomFleet(F, false, rng) : styled(kind), {}, rng));
    row[lv] = r1(S.stats(r).mean);
  }
  out.styles.push(row);
  log('style ' + JSON.stringify(row));
}

const file = path.join(__dirname, '..', 'js', 'lab-data.js');
fs.writeFileSync(file, '/* Generated by tools/lab-data.js on ' + out.made + ' — do not edit by hand. */\nwindow.BSLabData = ' + JSON.stringify(out) + ';\n');
log('wrote ' + file);
