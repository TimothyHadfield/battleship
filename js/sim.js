/* Fast simulations (no state copying) for the Lab: shots a computer needs to sink a fleet,
   head-to-head games, and heatmap calibration. Uses the same knowledge/heat/choose code as play. */
(function (root) {
  'use strict';
  var node = typeof module !== 'undefined' && module.exports;
  var E = node ? require('./engine.js') : root.BSEngine;
  var D = node ? require('./density.js') : root.BSDensity;
  var AI = node ? require('./ai.js') : root.BSAI;
  var NN = E.N * E.N;

  function Target(fleet, ships, opts) {
    this.fleet = fleet; this.ships = ships; this.opts = opts;
    this.owner = new Array(NN).fill(-1);
    for (var s = 0; s < ships.length; s++) for (var k = 0; k < ships[s].length; k++) this.owner[ships[s][k]] = s;
    this.left = ships.map(function (p) { return p.length; });
    this.K = D.blank(fleet, opts);
    this.n = 0; this.volley = 1;
  }
  Target.prototype.fire = function (c) {
    var K = this.K, s = this.owner[c], rec = { c: c, h: s >= 0 ? 1 : 0, n: this.volley };
    K.cell[c] = s >= 0 ? 2 : 1;
    if (s >= 0) {
      var id = this.fleet[s].id;
      if (this.opts.named !== false) { rec.s = id; K.hitShip[c] = id; }
      if (--this.left[s] === 0) { rec.k = id; K.sunk.push(id); K.sinks.push({ id: id, c: c, n: this.volley }); }
    }
    K.shots.push(rec);
    this.n++;
    return rec;
  };
  Target.prototype.done = function () { return this.K.sunk.length === this.fleet.length; };

  /** Shots `level` needs to sink `ships` (one shot at a time). onShot(K, c, hit) optional. */
  function shotsToSink(level, fleet, ships, opts, rng, onShot) {
    var T = new Target(fleet, ships, opts || {});
    while (!T.done() && T.n < NN) {
      var c = AI.choose(level, T.K, 1, rng)[0];
      if (onShot) onShot(T.K, c, T.owner[c] >= 0, T);
      T.fire(c);
    }
    return T.n;
  }

  /** Full game between two computers; returns { winner, volleys }. Seat `first` fires first. */
  function duel(levelA, levelB, opts, rng, first) {
    opts = E.normOpts(opts);
    var fleet = E.FLEETS[opts.edition];
    var lv = [levelA, levelB];
    var T = [new Target(fleet, AI.randomFleet(fleet, opts.noTouch, rng), opts),
             new Target(fleet, AI.randomFleet(fleet, opts.noTouch, rng), opts)];
    var turn = first || 0, volleys = 0;
    for (var guard = 0; guard < 400; guard++) {
      var tgt = T[1 - turn];
      var shots = opts.salvo ? fleet.length - T[turn].K.sunk.length : 1;
      if (opts.salvo && opts.salvoAll) {
        AI.choose(lv[turn], tgt.K, shots, rng).forEach(function (c) { if (!tgt.done()) tgt.fire(c); });
      } else {
        for (var i = 0; i < shots && !tgt.done(); i++) tgt.fire(AI.choose(lv[turn], tgt.K, 1, rng)[0]);
      }
      if (turn !== (first || 0)) volleys++;
      if (tgt.done()) return { winner: turn, volleys: volleys + (turn === (first || 0) ? 1 : 0) };
      turn = 1 - turn;
      tgt.volley++;
    }
    return { winner: -1, volleys: volleys };
  }

  function stats(arr) {
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var q = function (f) { return a[Math.min(a.length - 1, Math.floor(f * a.length))]; };
    var mean = a.reduce(function (s, x) { return s + x; }, 0) / a.length;
    return { n: a.length, mean: mean, median: q(0.5), p10: q(0.1), p90: q(0.9), min: a[0], max: a[a.length - 1] };
  }

  var api = { Target: Target, shotsToSink: shotsToSink, duel: duel, stats: stats };
  if (node) module.exports = api; else root.BSSim = api;
})(this);
