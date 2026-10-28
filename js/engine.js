/* Battleship rules engine. Pure functions, JSON-safe state, all randomness from the rng passed in.
   Board: n x n (10 official; 8 and 12 are house-rule sizes), cell index = row*n + col, rows A.., columns 1..
   ("D-4" = row D, column 4). Sources for every rule and number: docs/rules-check.md. */
(function (root) {
  'use strict';
  var N = 10;                 // the official board; every function takes an optional size n (default 10)
  var SIZES = [8, 10, 12];
  var LETTERS = 'ABCDEFGHIJKL';

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
  // House-rule fleets. 12x12 adds two ships so about the same share of the board (17%) holds a ship;
  // 8x8 leaves the carrier out (12 of 64 squares, 19%). "Sea battle" is the pencil-and-paper fleet
  // (one 4, two 3s, three 2s, four 1s), always played with ships apart and hits not named.
  var EXTRA12 = [
    { id: 'frigate', name: 'Frigate', short: 'Frigate', len: 4 },
    { id: 'corvette', name: 'Corvette', short: 'Corvette', len: 3 },
  ];
  var SEA = [
    { id: 'battleship', name: 'Battleship', short: 'Battleship', len: 4 },
    { id: 'cruiser1', name: 'Cruiser', short: 'Cruiser', len: 3 },
    { id: 'cruiser2', name: 'Cruiser', short: 'Cruiser', len: 3 },
    { id: 'destroyer1', name: 'Destroyer', short: 'Destroyer', len: 2 },
    { id: 'destroyer2', name: 'Destroyer', short: 'Destroyer', len: 2 },
    { id: 'destroyer3', name: 'Destroyer', short: 'Destroyer', len: 2 },
    { id: 'boat1', name: 'Boat', short: 'Boat', len: 1 },
    { id: 'boat2', name: 'Boat', short: 'Boat', len: 1 },
    { id: 'boat3', name: 'Boat', short: 'Boat', len: 1 },
    { id: 'boat4', name: 'Boat', short: 'Boat', len: 1 },
  ];
  var FLEET_KINDS = ['standard', 'small', 'sea'];

  var DEFAULTS = {
    edition: 'hasbro',   // 'hasbro' (2002+ names) | 'mb1967' (Milton Bradley 1967 names)
    salvo: false,        // Salvo: one shot per ship you still have afloat
    salvoAll: false,     // Salvo shots called all at once (1967 box) instead of one at a time (Hasbro)
    named: true,         // the defender names the ship that was hit (official); off = harder
    noTouch: false,      // house rule: ships may not touch, not even at the corners
    first: 'random',     // 'random' | 0 | 1
    size: 10,            // house rule: 8 or 12
    fleet: 'standard',   // house rule: 'small' (4,3,2) | 'sea' (10 ships, apart, hits not named)
    again: false,        // house rule: a hit shoots again (one-shot games only)
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
    r.size = SIZES.indexOf(+o.size) >= 0 ? +o.size : 10;
    r.fleet = FLEET_KINDS.indexOf(o.fleet) >= 0 ? o.fleet : 'standard';
    r.again = !!o.again && !r.salvo;
    if (r.fleet === 'sea') { r.noTouch = true; r.named = false; }
    return r;
  }

  /** The ships for a set of options (normalised first). */
  function fleetOf(o) {
    o = normOpts(o);
    var base = FLEETS[o.edition], f;
    if (o.fleet === 'sea') f = SEA;
    else if (o.fleet === 'small') f = [base[1], base[2], base[4]];
    else if (o.size === 8) f = base.slice(1);
    else if (o.size === 12) f = base.concat(EXTRA12);
    else f = base;
    return JSON.parse(JSON.stringify(f));
  }

  // ---- geometry per board size (cached)
  var GEO = {};
  function geo(n) {
    n = SIZES.indexOf(+n) >= 0 ? +n : N;
    if (GEO[n]) return GEO[n];
    var NN = n * n, NB8 = [], NB4 = [];
    for (var i = 0; i < NN; i++) {
      var a = [], r0 = Math.floor(i / n), c0 = i % n;
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        var rr = r0 + dr, cc = c0 + dc;
        if (rr >= 0 && rr < n && cc >= 0 && cc < n) a.push(rr * n + cc);
      }
      NB8.push(a);
      var b = [];
      if (r0 > 0) b.push(i - n);
      if (c0 < n - 1) b.push(i + 1);
      if (r0 < n - 1) b.push(i + n);
      if (c0 > 0) b.push(i - 1);
      NB4.push(b);
    }
    return (GEO[n] = { N: n, NN: NN, NB8: NB8, NB4: NB4, place: {} });
  }
  /** Board size of a state, public view or options object (10 when missing: games saved before sizes existed). */
  function sizeOf(x) { var o = x && (x.opts || x); return o && SIZES.indexOf(+o.size) >= 0 ? +o.size : N; }

  function label(c, n) { n = geo(n).N; return LETTERS[Math.floor(c / n)] + '-' + ((c % n) + 1); }
  function rc(c, n) { n = geo(n).N; return [Math.floor(c / n), c % n]; }

  // cells of a ship of length len with its first square at (r,c), going right (dir 0) or down (dir 1)
  function lineCells(r, c, dir, len, n) {
    n = geo(n).N;
    var out = [];
    for (var i = 0; i < len; i++) {
      var rr = r + (dir ? i : 0), cc = c + (dir ? 0 : i);
      if (rr < 0 || rr >= n || cc < 0 || cc >= n) return null;
      out.push(rr * n + cc);
    }
    return out;
  }

  // every legal position of a ship of each length (cache per size); a one-square ship once per square
  function placements(len, n) {
    var G = geo(n);
    if (G.place[len]) return G.place[len];
    var list = [];
    for (var dir = 0; dir < (len === 1 ? 1 : 2); dir++)
      for (var r = 0; r < G.N; r++)
        for (var c = 0; c < G.N; c++) {
          var cells = lineCells(r, c, dir, len, G.N);
          if (cells) list.push(cells);
        }
    G.place[len] = list;
    return list;
  }

  function isLine(cells, len, n) {
    n = geo(n).N;
    if (!Array.isArray(cells) || cells.length !== len) return false;
    for (var k = 0; k < cells.length; k++) if (!(Number.isInteger(cells[k]) && cells[k] >= 0 && cells[k] < n * n)) return false;
    var s = cells.slice().sort(function (x, y) { return x - y; });
    var horiz = true, vert = true;
    for (k = 1; k < s.length; k++) {
      if (!(s[k] === s[k - 1] + 1 && Math.floor(s[k] / n) === Math.floor(s[0] / n))) horiz = false;
      if (s[k] !== s[k - 1] + n) vert = false;
    }
    return len === 1 || horiz || vert;
  }

  /** null if the fleet is legal, else a plain-English reason. ships[i] = cells of fleet[i]. */
  function fleetError(ships, fleet, noTouch, n) {
    var G = geo(n);
    if (!Array.isArray(ships) || ships.length !== fleet.length) return 'Place all ' + fleet.length + ' ships.';
    var owner = {};
    for (var s = 0; s < fleet.length; s++) {
      if (!isLine(ships[s], fleet[s].len, G.N)) return 'The ' + fleet[s].name + ' must sit in a straight line of ' + fleet[s].len + ' squares.';
      for (var k = 0; k < ships[s].length; k++) {
        if (owner[ships[s][k]] !== undefined) return 'Ships can\'t overlap.';
        owner[ships[s][k]] = s;
      }
    }
    if (noTouch) {
      for (s = 0; s < fleet.length; s++) for (k = 0; k < ships[s].length; k++) {
        var nb = G.NB8[ships[s][k]];
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
    var s = sizeOf(state), unshot = s * s - state.shots[1 - seat].length;
    return Math.max(1, Math.min(n, unshot));
  }

  function newGame(opts, rng) {
    rng = rng || Math.random;
    var o = normOpts(opts);
    var first = o.first === 'random' ? (rng() < 0.5 ? 0 : 1) : o.first;
    return {
      v: 1, opts: o, fleet: fleetOf(o),
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
    var n = sizeOf(st);
    if (action.t === 'place') {
      if (st.phase !== 'place') throw new Error('not placing now');
      if (seat !== 0 && seat !== 1) throw new Error('bad seat');
      if (st.ships[seat]) throw new Error('fleet already placed');
      // a move doc may not hold arrays inside arrays (Firestore), so ships arrive as [{cells:[...]}]
      var ships = Array.isArray(action.ships) ? action.ships.map(function (x) { return Array.isArray(x) ? x : x && x.cells; }) : null;
      var err = fleetError(ships, st.fleet, st.opts.noTouch, n);
      if (err) throw new Error(err);
      st.ships[seat] = ships.map(function (cells) { return cells.slice().sort(function (x, y) { return x - y; }); });
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
      var target = 1 - seat, done = {}, anyHit = false;
      st.shots[target].forEach(function (x) { done[x.c] = 1; });
      cells.forEach(function (c) {
        if (!(Number.isInteger(c) && c >= 0 && c < n * n)) throw new Error('not a square');
        if (done[c]) throw new Error(label(c, n) + ' was already called');
        done[c] = 1;
      });
      for (var k = 0; k < cells.length; k++) {
        var c = cells[k], si = shipAt(st, target, c);
        var rec = { c: c, h: si >= 0 ? 1 : 0, n: st.volley };
        if (si >= 0) {
          anyHit = true;
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
      // house rule "hit = shoot again" (one-shot games): a hit keeps the turn
      if (st.opts.again && !st.opts.salvo && anyHit) return st;
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
  /** The place move for a fleet, in the shape a Firestore move doc accepts. */
  function placeMove(ships) { return { t: 'place', ships: ships.map(function (c) { return { cells: c.slice() }; }) }; }

  var G10 = geo(N);
  var api = {
    N: N, SIZES: SIZES, FLEETS: FLEETS, FLEET_KINDS: FLEET_KINDS, DEFAULTS: DEFAULTS, normOpts: normOpts, fleetOf: fleetOf,
    geo: geo, sizeOf: sizeOf, label: label, rc: rc,
    lineCells: lineCells, placements: placements, NB4: G10.NB4, NB8: G10.NB8, isLine: isLine,
    fleetError: fleetError, newGame: newGame, toAct: toAct, apply: apply, cellsPerAction: cellsPerAction,
    afloat: afloat, shotsFor: shotsFor, publicView: publicView, privateView: privateView, placeMove: placeMove,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BSEngine = api;
})(this);
