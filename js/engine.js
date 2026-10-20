/* Battleship rules engine. Pure functions, JSON-safe state, all randomness from the rng passed in.
   Board: 10x10, cell index = row*10 + col, rows A-J, columns 1-10 ("D-4" = row D, column 4).
   Sources for every rule and number: docs/rules-check.md. */
(function (root) {
  'use strict';
  var N = 10;

  // Same five sizes in both editions (5,4,3,3,2 = 17 squares); Hasbro renamed them in 2002.
  var FLEETS = {
    hasbro: [
      { id: 'carrier', name: 'Carrier', short: 'Carrier', len: 5 },
      { id: 'battleship', name: 'Battleship', short: 'Battleship', len: 4 },
      { id: 'destroyer', name: 'Destroyer', short: 'Destroyer', len: 3 },
      { id: 'submarine', name: 'Submarine', short: 'Sub', len: 3 },
      { id: 'patrol', name: 'Patrol Boat', short: 'Patrol', len: 2 },
    ],
    mb1967: [
      { id: 'carrier', name: 'Aircraft Carrier', short: 'Carrier', len: 5 },
      { id: 'battleship', name: 'Battleship', short: 'Battleship', len: 4 },
      { id: 'cruiser', name: 'Cruiser', short: 'Cruiser', len: 3 },
      { id: 'submarine', name: 'Submarine', short: 'Sub', len: 3 },
      { id: 'destroyer', name: 'Destroyer', short: 'Destroyer', len: 2 },
    ],
  };

  var DEFAULTS = {
    edition: 'hasbro',   // 'hasbro' (2002+ names) | 'mb1967' (Milton Bradley 1967 names)
    salvo: false,        // Salvo: one shot per ship you still have afloat
    salvoAll: false,     // Salvo shots called all at once (1967 box) instead of one at a time (Hasbro)
    named: true,         // the defender names the ship that was hit (official); off = harder
    noTouch: false,      // house rule: ships may not touch, not even at the corners
    first: 'random',     // 'random' | 0 | 1
  };

  function normOpts(o) {
    o = o || {};
    var r = {};
    r.edition = FLEETS[o.edition] ? o.edition : DEFAULTS.edition;
    r.salvo = !!o.salvo;
    r.salvoAll = !!o.salvoAll;
    r.named = o.named === undefined ? true : !!o.named;
    r.noTouch = !!o.noTouch;
    r.first = o.first === 0 || o.first === 1 ? o.first : 'random';
    return r;
  }

  function label(c) { return 'ABCDEFGHIJ'[Math.floor(c / N)] + '-' + ((c % N) + 1); }
  function rc(c) { return [Math.floor(c / N), c % N]; }

  // cells of a ship of length len with its first square at (r,c), going right (dir 0) or down (dir 1)
  function lineCells(r, c, dir, len) {
    var out = [];
    for (var i = 0; i < len; i++) {
      var rr = r + (dir ? i : 0), cc = c + (dir ? 0 : i);
      if (rr < 0 || rr >= N || cc < 0 || cc >= N) return null;
      out.push(rr * N + cc);
    }
    return out;
  }

  // every legal position of a ship of each length (cache)
  var PLACE = {};
  function placements(len) {
    if (PLACE[len]) return PLACE[len];
    var list = [];
    for (var dir = 0; dir < 2; dir++)
      for (var r = 0; r < N; r++)
        for (var c = 0; c < N; c++) {
          var cells = lineCells(r, c, dir, len);
          if (cells) list.push(cells);
        }
    PLACE[len] = list;
    return list;
  }

  var NB8 = [];
  for (var i = 0; i < N * N; i++) {
    var a = [], r0 = Math.floor(i / N), c0 = i % N;
    for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      var rr = r0 + dr, cc = c0 + dc;
      if (rr >= 0 && rr < N && cc >= 0 && cc < N) a.push(rr * N + cc);
    }
    NB8.push(a);
  }
  var NB4 = [];
  for (i = 0; i < N * N; i++) {
    var b = [], r1 = Math.floor(i / N), c1 = i % N;
    if (r1 > 0) b.push(i - N);
    if (c1 < N - 1) b.push(i + 1);
    if (r1 < N - 1) b.push(i + N);
    if (c1 > 0) b.push(i - 1);
    NB4.push(b);
  }

  function isLine(cells, len) {
    if (!Array.isArray(cells) || cells.length !== len) return false;
    for (var k = 0; k < cells.length; k++) if (!(Number.isInteger(cells[k]) && cells[k] >= 0 && cells[k] < N * N)) return false;
    var s = cells.slice().sort(function (x, y) { return x - y; });
    var horiz = true, vert = true;
    for (k = 1; k < s.length; k++) {
      if (!(s[k] === s[k - 1] + 1 && Math.floor(s[k] / N) === Math.floor(s[0] / N))) horiz = false;
      if (s[k] !== s[k - 1] + N) vert = false;
    }
    return len === 1 || horiz || vert;
  }

  /** null if the fleet is legal, else a plain-English reason. ships[i] = cells of fleet[i]. */
  function fleetError(ships, fleet, noTouch) {
    if (!Array.isArray(ships) || ships.length !== fleet.length) return 'Place all ' + fleet.length + ' ships.';
    var owner = {};
    for (var s = 0; s < fleet.length; s++) {
      if (!isLine(ships[s], fleet[s].len)) return 'The ' + fleet[s].name + ' must sit in a straight line of ' + fleet[s].len + ' squares.';
      for (var k = 0; k < ships[s].length; k++) {
        if (owner[ships[s][k]] !== undefined) return 'Ships can\'t overlap.';
        owner[ships[s][k]] = s;
      }
    }
    if (noTouch) {
      for (s = 0; s < fleet.length; s++) for (k = 0; k < ships[s].length; k++) {
        var nb = NB8[ships[s][k]];
        for (var j = 0; j < nb.length; j++) if (owner[nb[j]] !== undefined && owner[nb[j]] !== s) return 'Ships can\'t touch (house rule is on).';
      }
    }
    return null;
  }

  function afloat(state, seat) {
    return state.fleet.length - state.sunk[seat].length;
  }

  function shotsFor(state, seat) {
    // seat fires at the other board; salvo = one shot per own ship still afloat
    var n = state.opts.salvo ? afloat(state, seat) : 1;
    var unshot = N * N - state.shots[1 - seat].length;
    return Math.max(1, Math.min(n, unshot));
  }

  function newGame(opts, rng) {
    rng = rng || Math.random;
    var o = normOpts(opts);
    var first = o.first === 'random' ? (rng() < 0.5 ? 0 : 1) : o.first;
    return {
      v: 1, opts: o, fleet: JSON.parse(JSON.stringify(FLEETS[o.edition])),
      phase: 'place', ships: [null, null],
      shots: [[], []],   // shots[b] = shots fired AT board b: {c, h:0|1, s?:shipId (named), k?:shipId sunk by this shot, n:volley}
      sunk: [[], []],    // sunk[b] = ship ids of board b that are sunk, in order
      first: first, turn: first, shotsLeft: 0, volley: 0, winner: -1,
    };
  }

  function toAct(state) {
    if (state.phase === 'place') {
      var out = [];
      for (var s = 0; s < 2; s++) if (!state.ships[s]) out.push(s);
      return out;
    }
    if (state.phase === 'fire') return [state.turn];
    return [];
  }

  /** How many cells the current fire action must name. */
  function cellsPerAction(state) {
    return state.opts.salvo && state.opts.salvoAll ? state.shotsLeft : 1;
  }

  function shipAt(state, board, c) {
    var ships = state.ships[board];
    for (var s = 0; s < ships.length; s++) if (ships[s].indexOf(c) >= 0) return s;
    return -1;
  }

  function apply(state, seat, action) {
    if (!action || typeof action.t !== 'string') throw new Error('bad move');
    var st = JSON.parse(JSON.stringify(state));
    if (action.t === 'place') {
      if (st.phase !== 'place') throw new Error('not placing now');
      if (seat !== 0 && seat !== 1) throw new Error('bad seat');
      if (st.ships[seat]) throw new Error('fleet already placed');
      var err = fleetError(action.ships, st.fleet, st.opts.noTouch);
      if (err) throw new Error(err);
      st.ships[seat] = action.ships.map(function (cells) { return cells.slice().sort(function (x, y) { return x - y; }); });
      if (st.ships[0] && st.ships[1]) {
        st.phase = 'fire'; st.turn = st.first; st.volley = 1;
        st.shotsLeft = shotsFor(st, st.turn);
      }
      return st;
    }
    if (action.t === 'fire') {
      if (st.phase !== 'fire') throw new Error('not firing now');
      if (seat !== st.turn) throw new Error('not your turn');
      var cells = action.cells;
      var need = cellsPerAction(st);
      if (!Array.isArray(cells) || cells.length !== need) throw new Error('call ' + need + ' shot' + (need > 1 ? 's' : ''));
      var target = 1 - seat, done = {};
      st.shots[target].forEach(function (x) { done[x.c] = 1; });
      cells.forEach(function (c) {
        if (!(Number.isInteger(c) && c >= 0 && c < N * N)) throw new Error('not a square');
        if (done[c]) throw new Error(label(c) + ' was already called');
        done[c] = 1;
      });
      for (var k = 0; k < cells.length; k++) {
        var c = cells[k], si = shipAt(st, target, c);
        var rec = { c: c, h: si >= 0 ? 1 : 0, n: st.volley };
        if (si >= 0) {
          var id = st.fleet[si].id;
          if (st.opts.named) rec.s = id;
          var hitSet = {};
          st.shots[target].forEach(function (x) { if (x.h) hitSet[x.c] = 1; });
          hitSet[c] = 1;
          if (st.ships[target][si].every(function (q) { return hitSet[q]; })) {
            rec.k = id; st.sunk[target].push(id);
          }
        }
        st.shots[target].push(rec);
        if (st.sunk[target].length === st.fleet.length) {
          st.phase = 'over'; st.winner = seat; st.shotsLeft = 0;
          return st;
        }
      }
      st.shotsLeft -= cells.length;
      if (st.shotsLeft <= 0) {
        st.turn = target;
        if (target === st.first) st.volley++;
        st.shotsLeft = shotsFor(st, st.turn);
      }
      return st;
    }
    throw new Error('unknown move');
  }

  function publicView(st) {
    return {
      opts: st.opts, fleet: st.fleet, phase: st.phase,
      placed: [!!st.ships[0], !!st.ships[1]],
      shots: st.shots, sunk: st.sunk,
      first: st.first, turn: st.turn, shotsLeft: st.shotsLeft, volley: st.volley, winner: st.winner,
      need: st.phase === 'fire' ? cellsPerAction(st) : 0,
    };
  }
  function privateView(st, seat) { return { ships: st.ships[seat] || null }; }

  var api = {
    N: N, FLEETS: FLEETS, DEFAULTS: DEFAULTS, normOpts: normOpts, label: label, rc: rc,
    lineCells: lineCells, placements: placements, NB4: NB4, NB8: NB8, isLine: isLine,
    fleetError: fleetError, newGame: newGame, toAct: toAct, apply: apply, cellsPerAction: cellsPerAction,
    afloat: afloat, shotsFor: shotsFor, publicView: publicView, privateView: privateView,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BSEngine = api;
})(this);
