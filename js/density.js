/* Probability-density heatmap: for every square still unknown, the chance it holds a ship,
   estimated by counting every way each remaining ship could still fit the shots so far.
   Official rules (the defender names the ship hit): each hit belongs to a known ship, so every ship's
   possible positions are counted exactly; the chances of different ships are then combined as if they
   were independent (they nearly are, the overlap rule is the only link).
   "Don't name the ship" variant: hits aren't labelled, so positions through live hits are weighted up
   (the classic density method); those numbers are rankings first, chances second (shown with "~"). */
(function (root) {
  'use strict';
  var node = typeof module !== 'undefined' && module.exports;
  var E = node ? require('./engine.js') : root.BSEngine;
  var N = E.N, NN = N * N;

  /** What the shooter knows about board b, built only from the public view. */
  function knowledge(pub, b) {
    var cell = new Array(NN).fill(0), hitShip = new Array(NN).fill(null), sinks = [];
    var shots = pub.shots[b];
    for (var i = 0; i < shots.length; i++) {
      var x = shots[i];
      cell[x.c] = x.h ? 2 : 1;
      if (x.s) hitShip[x.c] = x.s;
      if (x.k) sinks.push({ id: x.k, c: x.c, n: x.n });
    }
    return {
      fleet: pub.fleet, named: !!pub.opts.named, noTouch: !!pub.opts.noTouch,
      cell: cell, hitShip: hitShip, sunk: pub.sunk[b].slice(), sinks: sinks, shots: shots,
    };
  }

  /** Blank knowledge (paper companion / prior map). */
  function blank(fleet, opts) {
    opts = opts || {};
    return { fleet: fleet, named: opts.named !== false, noTouch: !!opts.noTouch,
      cell: new Array(NN).fill(0), hitShip: new Array(NN).fill(null), sunk: [], sinks: [], shots: [] };
  }

  // Unnamed hits: which hit squares surely belong to already-sunk ships?
  function deadCells(K) {
    var dead = new Array(NN).fill(false);
    if (!K.sinks.length) return dead;
    var lens = {};
    K.fleet.forEach(function (f) { lens[f.id] = f.len; });
    var options = K.sinks.map(function (sk) {
      return E.placements(lens[sk.id]).filter(function (p) {
        return p.indexOf(sk.c) >= 0 && p.every(function (q) { return K.cell[q] === 2; });
      });
    });
    var count = new Array(NN).fill(0), sols = 0, used = new Array(NN).fill(false);
    (function go(i) {
      if (sols >= 200) return;
      if (i === options.length) {
        sols++;
        for (var q = 0; q < NN; q++) if (used[q]) count[q]++;
        return;
      }
      for (var j = 0; j < options[i].length; j++) {
        var p = options[i][j];
        if (p.some(function (q) { return used[q]; })) continue;
        p.forEach(function (q) { used[q] = true; });
        go(i + 1);
        p.forEach(function (q) { used[q] = false; });
      }
    })(0);
    if (sols) for (var q = 0; q < NN; q++) dead[q] = count[q] === sols;
    return dead;
  }

  /** Candidate positions of one unsunk ship given K (named rules). */
  function namedCandidates(K, ship) {
    var id = ship.id, need = 0;
    for (var q = 0; q < NN; q++) if (K.cell[q] === 2 && K.hitShip[q] === id) need++;
    return E.placements(ship.len).filter(function (p) {
      var got = 0;
      for (var k = 0; k < p.length; k++) {
        var c = p[k], st = K.cell[c];
        if (st === 1) return false;
        if (st === 2) { if (K.hitShip[c] !== id) return false; got++; }
        if (K.noTouch) {
          var nb = E.NB8[c];
          for (var j = 0; j < nb.length; j++) if (K.cell[nb[j]] === 2 && K.hitShip[nb[j]] !== id) return false;
        }
      }
      return got === need && got < p.length;
    });
  }

  /** p[c] = estimated chance square c holds a ship (0 for squares already called). */
  function heat(K) {
    var p = new Array(NN).fill(0);
    var miss = new Array(NN).fill(1);   // product of (1 - p_ship)
    var sunk = {};
    K.sunk.forEach(function (id) { sunk[id] = 1; });
    var named = K.named;
    var dead = named ? null : deadCells(K);
    var live = [];
    if (!named) for (var q = 0; q < NN; q++) if (K.cell[q] === 2 && !dead[q]) live.push(q);
    K.fleet.forEach(function (ship) {
      if (sunk[ship.id]) return;
      var cand, w;
      if (named) {
        cand = namedCandidates(K, ship);
        w = cand.map(function () { return 1; });
      } else {
        cand = []; w = [];
        E.placements(ship.len).forEach(function (pl) {
          var hits = 0;
          for (var k = 0; k < pl.length; k++) {
            var c = pl[k], st = K.cell[c];
            if (st === 1 || (st === 2 && dead[c])) return;
            if (st === 2) hits++;
            if (K.noTouch) {
              var nb = E.NB8[c];
              for (var j = 0; j < nb.length; j++) if (dead[nb[j]]) return;
            }
          }
          if (hits === pl.length) return;
          cand.push(pl); w.push(hits ? Math.pow(30, hits) : 1);
        });
      }
      var tot = 0, cov = new Array(NN).fill(0);
      for (var i = 0; i < cand.length; i++) {
        tot += w[i];
        for (var k = 0; k < cand[i].length; k++) cov[cand[i][k]] += w[i];
      }
      if (!tot) return;
      for (var c = 0; c < NN; c++) if (cov[c]) miss[c] *= 1 - Math.min(1, cov[c] / tot);
    });
    var best = -1, max = 0;
    for (var c = 0; c < NN; c++) {
      if (K.cell[c]) continue;
      p[c] = 1 - miss[c];
      if (p[c] > max) { max = p[c]; best = c; }
    }
    return { p: p, best: best, max: max, approx: !named && live.length > 0 };
  }

  /** The k best unknown squares (ties broken by rng). */
  function topK(K, k, rng, h) {
    rng = rng || Math.random;
    h = h || heat(K);
    var cells = [];
    for (var c = 0; c < NN; c++) if (!K.cell[c]) cells.push({ c: c, v: h.p[c] + rng() * 1e-9 });
    cells.sort(function (a, b) { return b.v - a.v; });
    return cells.slice(0, k).map(function (x) { return x.c; });
  }

  /** Expected ship squares left per the map (sum of chances) — a sanity number. */
  function mass(h) { return h.p.reduce(function (a, b) { return a + b; }, 0); }

  var api = { knowledge: knowledge, blank: blank, heat: heat, topK: topK, mass: mass, deadCells: deadCells, namedCandidates: namedCandidates };
  if (node) module.exports = api; else root.BSDensity = api;
})(this);
