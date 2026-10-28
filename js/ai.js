/* Computer players. Each sees only what a real player would: the public shot record.
   easy   = Random: any square not yet called.
   medium = Hunt & target: random until a hit, then the squares next to the newest unfinished hit.
   hard   = Density: the square the heatmap rates most likely (js/density.js), near-ties picked at random.
   Strength is measured, not guessed: tools/lab-data.js -> js/lab-data.js. */
(function (root) {
  'use strict';
  var node = typeof module !== 'undefined' && module.exports;
  var E = node ? require('./engine.js') : root.BSEngine;
  var D = node ? require('./density.js') : root.BSDensity;
  var LEVELS = ['easy', 'medium', 'hard'];
  var NAMES = { easy: 'Random', medium: 'Hunt & target', hard: 'Density' };

  function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }

  /** A random legal fleet: each ship, biggest first, in a uniformly random legal spot. */
  function randomFleet(fleet, noTouch, rng, n) {
    rng = rng || Math.random;
    var G = E.geo(n), NN = G.NN;
    for (var tries = 0; tries < 500; tries++) {
      var occ = new Array(NN).fill(false), block = new Array(NN).fill(false), out = [], ok = true;
      for (var s = 0; s < fleet.length; s++) {
        var opts = E.placements(fleet[s].len, G.N).filter(function (p) {
          return p.every(function (c) { return !occ[c] && !block[c]; });
        });
        if (!opts.length) { ok = false; break; }
        var p = pick(opts, rng);
        p.forEach(function (c) {
          occ[c] = true;
          if (noTouch) G.NB8[c].forEach(function (n) { block[n] = true; });
        });
        out.push(p.slice());
      }
      if (ok) return out;
    }
    throw new Error('could not place fleet');
  }

  function liveHits(K) {
    var sunk = {};
    K.sunk.forEach(function (id) { sunk[id] = 1; });
    var dead = K.named ? null : D.deadCells(K);
    var out = [];
    for (var i = K.shots.length - 1; i >= 0; i--) {   // newest first
      var x = K.shots[i];
      if (!x.h) continue;
      if (K.named ? !sunk[x.s] : !dead[x.c]) out.push(x.c);
    }
    return out;
  }

  /** Density's pick: the k squares the heatmap rates highest, each chance first nudged up by a random 0-15%.
   *  Without the nudge its opening was the same two checkerboards every game; with it, near-equal squares
   *  are picked at random. Measured over 1,500 games: 44.75 shots to sink before, 44.07 after (no loss). */
  var JITTER = 0.15;
  function densityPick(K, k, rng) {
    var h = D.heat(K), cells = [], NN = K.cell.length;
    for (var c = 0; c < NN; c++) if (!K.cell[c]) cells.push({ c: c, v: h.p[c] * (1 + JITTER * rng()) + rng() * 1e-9 });
    cells.sort(function (a, b) { return b.v - a.v; });
    return cells.slice(0, k).map(function (x) { return x.c; });
  }

  /** k squares to call against the board described by K. */
  function choose(level, K, k, rng) {
    rng = rng || Math.random;
    k = k || 1;
    var NN = K.cell.length, G = E.geo(K.N);
    var taken = K.cell.map(function (v) { return v !== 0; });
    var out = [];
    function randomFree() {
      var free = [];
      for (var c = 0; c < NN; c++) if (!taken[c]) free.push(c);
      return free.length ? pick(free, rng) : -1;
    }
    if (level === 'hard') return densityPick(K, k, rng);
    var live = level === 'medium' ? liveHits(K) : [];
    while (out.length < k) {
      var c = -1;
      for (var i = 0; i < live.length && c < 0; i++) {
        var nb = G.NB4[live[i]].filter(function (n) { return !taken[n]; });
        if (nb.length) c = pick(nb, rng);
      }
      if (c < 0) c = randomFree();
      if (c < 0) break;
      taken[c] = true; out.push(c);
    }
    return out;
  }

  var api = { LEVELS: LEVELS, NAMES: NAMES, randomFleet: randomFleet, choose: choose, liveHits: liveHits };
  if (node) module.exports = api; else root.BSAI = api;
})(this);
