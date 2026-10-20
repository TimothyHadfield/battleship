/* Original SVG art: top-down ships, pegs, small fleet icons. Drawn for this site, not copied.
   Ships are drawn horizontal, bow to the right, in a len*100 x 100 box; vertical ones are rotated. */
(function (root) {
  'use strict';
  var uid = 0;

  function hull(W, kind) {
    if (kind === 'submarine') {
      return 'M10,50 C10,30 30,26 60,26 L' + (W - 60) + ',26 C' + (W - 18) + ',26 ' + (W - 8) + ',40 ' + (W - 8) + ',50 C' + (W - 8) + ',60 ' + (W - 18) + ',74 ' + (W - 60) + ',74 L60,74 C30,74 10,70 10,50 Z';
    }
    var y0 = kind === 'carrier' ? 10 : 16, y1 = 100 - y0;
    return 'M10,' + (y0 + 8) + ' Q10,' + y0 + ' 24,' + y0 + ' L' + (W - 70) + ',' + y0 + ' Q' + (W - 14) + ',' + (y0 + 6) + ' ' + (W - 5) + ',50 Q' + (W - 14) + ',' + (y1 - 6) + ' ' + (W - 70) + ',' + y1 + ' L24,' + y1 + ' Q10,' + y1 + ' 10,' + (y1 - 8) + ' Z';
  }

  function turret(x, dir) {
    // a gun turret: round base, two barrels pointing toward the bow (+1) or stern (-1)
    var b = dir > 0 ? x + 8 : x - 30;
    return '<rect x="' + b + '" y="44" width="22" height="3.5" rx="1.5" fill="#2b3242"/>' +
      '<rect x="' + b + '" y="52.5" width="22" height="3.5" rx="1.5" fill="#2b3242"/>' +
      '<circle cx="' + x + '" cy="50" r="13" fill="#8a94a7" stroke="#2b3242" stroke-width="2.5"/>' +
      '<circle cx="' + x + '" cy="50" r="5" fill="#69728a"/>';
  }

  function details(kind, W) {
    var s = '';
    if (kind === 'carrier') {
      s += '<rect x="30" y="20" width="' + (W - 120) + '" height="60" rx="4" fill="#5b6478"/>';
      s += '<line x1="40" y1="50" x2="' + (W - 100) + '" y2="50" stroke="#e8eaf0" stroke-width="2" stroke-dasharray="14 10" opacity=".75"/>';
      s += '<line x1="60" y1="70" x2="' + (W * 0.55) + '" y2="30" stroke="#e8eaf0" stroke-width="1.6" stroke-dasharray="8 8" opacity=".5"/>';
      s += '<rect x="' + (W * 0.55) + '" y="12" width="60" height="16" rx="3" fill="#9aa3b5" stroke="#2b3242" stroke-width="2"/>';
      s += '<rect x="' + (W * 0.55 + 38) + '" y="15" width="10" height="10" rx="2" fill="#2b3242"/>';
      // three small parked planes
      for (var i = 0; i < 3; i++) {
        var px = 70 + i * 70;
        s += '<path d="M' + px + ',62 l16,0 l6,-4 l2,0 l-3,6 l3,6 l-2,0 l-6,-4 l-16,0 z M' + (px + 6) + ',62 l-3,-10 l4,0 l7,10 z M' + (px + 6) + ',62 l-3,10 l4,0 l7,-10 z" fill="#c9cfdc" opacity=".8"/>';
      }
    } else if (kind === 'battleship') {
      s += turret(70, -1) + turret(W - 110, 1) + turret(W - 160, 1);
      s += '<rect x="' + (W * 0.36) + '" y="34" width="' + (W * 0.2) + '" height="32" rx="5" fill="#9aa3b5" stroke="#2b3242" stroke-width="2.5"/>';
      s += '<ellipse cx="' + (W * 0.46) + '" cy="50" rx="10" ry="8" fill="#3a4152"/>';
    } else if (kind === 'destroyer' || kind === 'cruiser') {
      s += turret(56, -1) + turret(W - 80, 1);
      s += '<rect x="' + (W * 0.36) + '" y="36" width="' + (W * 0.24) + '" height="28" rx="5" fill="#9aa3b5" stroke="#2b3242" stroke-width="2.5"/>';
      s += '<ellipse cx="' + (W * 0.5) + '" cy="50" rx="8" ry="7" fill="#3a4152"/>';
    } else if (kind === 'submarine') {
      s += '<ellipse cx="' + (W * 0.55) + '" cy="50" rx="34" ry="11" fill="#3b4354" stroke="#1d222d" stroke-width="2.5"/>';
      s += '<rect x="' + (W * 0.55 - 2) + '" y="36" width="4" height="10" fill="#1d222d"/>';
      s += '<path d="M14,50 l-6,-14 l8,0 z M14,50 l-6,14 l8,0 z" fill="#3a4152"/>';
    } else { // patrol boat
      s += '<rect x="56" y="33" width="58" height="34" rx="7" fill="#9aa3b5" stroke="#2b3242" stroke-width="2.5"/>';
      s += '<rect x="96" y="38" width="12" height="24" rx="3" fill="#3e5a7a"/>';
      s += '<circle cx="146" cy="50" r="7" fill="#8a94a7" stroke="#2b3242" stroke-width="2"/><rect x="150" y="48" width="18" height="4" rx="1.5" fill="#2b3242"/>';
    }
    return s;
  }

  function kindOf(id, len) {
    if (id === 'carrier' || len === 5) return 'carrier';
    if (id === 'battleship' || len === 4) return 'battleship';
    if (id === 'submarine') return 'submarine';
    if (len === 2) return 'patrol';
    return 'destroyer';
  }

  /** <g> for a ship of `len` covering cells; x,y,w,h in grid units of 100. */
  function shipG(id, len, firstCell, vertical, cls) {
    var r = Math.floor(firstCell / 10), c = firstCell % 10, W = len * 100, k = kindOf(id, len), g = 'hg' + (uid++);
    var t = vertical ? 'translate(' + (c * 100 + 100) + ',' + (r * 100) + ') rotate(90)' : 'translate(' + (c * 100) + ',' + (r * 100) + ')';
    // [sheen on the upper edge, hull, keel shadow]; the sub is darker but still stands off the navy sea
    var fill = k === 'submarine' ? ['#98a3b8', '#6a758b', '#434c5f'] : ['#b4bccb', '#8791a5', '#5a6376'];
    return '<g class="ship ' + (cls || '') + '" data-ship="' + id + '" transform="' + t + '">' +
      '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + fill[0] + '"/><stop offset=".3" stop-color="' + fill[1] + '"/><stop offset="1" stop-color="' + fill[2] + '"/></linearGradient></defs>' +
      '<g transform="translate(4,4) scale(' + ((W - 8) / W) + ',.92)">' +
      '<path d="' + hull(W, k) + '" fill="rgba(0,0,0,.35)" transform="translate(3,5)"/>' +
      '<path d="' + hull(W, k) + '" fill="url(#' + g + ')" stroke="#20252f" stroke-width="3"/>' +
      details(k, W) + '</g></g>';
  }

  /** Small standalone ship icon (fleet chips). */
  function shipIcon(id, len, cls) {
    return '<svg class="shipicon ' + (cls || '') + '" viewBox="0 0 ' + len * 100 + ' 100" aria-hidden="true">' + shipG(id, len, 0, false) + '</svg>';
  }

  function cellsToPlacement(cells) {
    var s = cells.slice().sort(function (a, b) { return a - b; });
    return { first: s[0], vertical: s.length > 1 && s[1] - s[0] === 10 };
  }

  var ICON = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="14" fill="#0f1117"/>' +
    '<rect x="6" y="6" width="52" height="52" rx="8" fill="#13283d"/>' +
    '<path d="M6 19.3h52M6 32h52M6 44.7h52M19.3 6v52M32 6v52M44.7 6v52" stroke="#24476a" stroke-width="1.5"/>' +
    '<path d="M11 38 L44 38 Q55 39 57 44 Q55 49 44 50 L13 50 Q9 50 9 46 L9 42 Q9 38 11 38Z" fill="#8791a5" stroke="#20252f" stroke-width="1.5"/>' +
    '<circle cx="24" cy="44" r="3.5" fill="#5d6679"/><rect x="31" y="40.5" width="9" height="7" rx="1.5" fill="#c9cfdc"/>' +
    '<circle cx="38.5" cy="19" r="7.5" fill="#ef6461" stroke="#7a1d22" stroke-width="1.5"/><circle cx="36" cy="16.5" r="2.4" fill="#ffd0cc"/></svg>';

  root.BSArt = { shipG: shipG, shipIcon: shipIcon, cellsToPlacement: cellsToPlacement, kindOf: kindOf, ICON: ICON };
})(this);
