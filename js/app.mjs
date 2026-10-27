/* Battleship site: Play (computer / pass-the-phone / online), Paper companion, Lab, Rules, Settings.
   Rules live in js/engine.js; this file only draws and routes taps. */
import { createLocal, createOnline } from "./online.js?v=a3d0418b";
import { makeGame } from "./game.mjs?v=14";

const E = window.BSEngine, D = window.BSDensity, AI = window.BSAI, Art = window.BSArt, SIM = window.BSSim, LAB = window.BSLabData;
const game = makeGame(E, D, AI);
const VERSION = "2026-10-27.15";

// sounds + effects (js/fx.js, shared and copied unchanged; js/fxgame.js maps shots to sounds)
const FX = window.FX, BSFx = window.BSFx;
// grid cells are buttons: aiming has its own quiet click, so the automatic button tap skips them
FX.init({ game: "battleship", accent: "#6ea8fe", clickSelector: 'button:not(.cell), [role="button"], .btn' });
// the game's own CSS animations (peg drop, splash ring) follow the Animations / Speed settings too
function fxRootClasses() {
  const s = FX.settings, r = document.documentElement;
  r.classList.toggle("fx-noanim", !s.animations);
  r.classList.toggle("fx-fast", s.animSpeed === "fast");
}
fxRootClasses();
FX.onChange(fxRootClasses);
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (p) => (p >= 0.995 && p < 1 ? ">99" : p > 0 && p < 0.005 ? "<1" : Math.round(p * 100)) + "%";
const LABEL = (c) => E.label(c);

// ------------------------------------------------------------------ storage
const KEY = "battleship:v1";
const DEF = { edition: "hasbro", salvo: false, salvoAll: false, named: true, noTouch: false, first: "random", level: "hard", heat: true, best: true, name: "", opp: "computer" };
let store = {};
try { store = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { store = {}; }
const S = Object.assign({}, DEF, store.settings || {});
function save() { try { store.settings = S; localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
const rulesOpts = () => ({ edition: S.edition, salvo: S.salvo, salvoAll: S.salvoAll, named: S.named, noTouch: S.noTouch, first: S.first });

// ------------------------------------------------------------------ small UI helpers
let toastT = null;
function toast(m) {
  const t = $("#toast"); t.textContent = m; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2600);
}
const TIPS = {
  heat: "Brighter squares fit the ships still afloat in more ways, so they are more likely to hold one. The ring marks the single best square.",
  chance: "Out of every way the remaining ships could still sit, the share that covers this square. Checked over 1,000+ simulated games: when it says 30%, about 30% are hits.",
  find: "We let the Density computer hunt this exact fleet 40 times. More shots needed = better hidden. Compared with 300 random fleets.",
  strong: "Each computer fired at thousands of randomly placed fleets. Fewer shots to sink all five = stronger.",
  duel: "Two computers play full games, taking turns going first. Win rate of the first-named computer.",
  calib: "Every unknown square at every shot of 800 games, grouped by the chance the heatmap showed. If the map is honest, the dots sit on the diagonal.",
  styles: "Thousands of fleets of each kind, hunted by each computer. More shots = harder to find.",
  prior: "With nothing known yet, middle squares can be covered by a ship in more ways than edges and corners.",
  myfleet: "Your last placed fleet, hunted 60 times by each computer, compared with random fleets.",
  paper: "Playing on real paper or the plastic board? Enter each answer your friend gives and the map shows where to shoot next.",
  quality: "The average hit chance of the squares you picked, next to the best square's chance at the time. Luck aside, this is how well you aimed.",
  salvoAll: "Hasbro's box: call your salvo one shot at a time and hear each answer. 1967 box: call the whole salvo, then hear the answers.",
  named: "The official rules say which ship you hit. Off = the box's harder variant: only 'hit', sinkings still announced.",
  noTouch: "A common house rule: ships may not sit side by side or corner to corner.",
  fxsound: "Sounds follow your phone's volume. The iPhone silent switch may mute them.",
  edition: "Same five sizes (5,4,3,3,2). 2002 Hasbro names: Carrier, Battleship, Destroyer, Submarine, Patrol Boat. 1967 Milton Bradley: Aircraft Carrier, Battleship, Cruiser, Submarine, Destroyer.",
};
document.addEventListener("click", (ev) => {
  const q = ev.target.closest(".q");
  const tip = $("#tip");
  if (!q) { tip.hidden = true; return; }
  ev.stopPropagation();
  tip.textContent = TIPS[q.dataset.q] || "";
  tip.hidden = false;
  const r = q.getBoundingClientRect(), w = Math.min(290, innerWidth - 20);
  tip.style.maxWidth = w + "px";
  tip.style.left = Math.max(10, Math.min(innerWidth - w - 10, r.left - w / 2)) + "px";
  const below = r.bottom + 8, h = tip.offsetHeight;
  tip.style.top = (below + h > innerHeight - 10 ? r.top - h - 8 : below) + "px";
}, true);
const qBtn = (k) => `<button class="q" data-q="${k}" aria-label="Why?">?</button>`;
const switchHtml = (key, on, dis) => `<button class="switch${on ? " on" : ""}${dis ? " dis" : ""}" data-set="${key}" role="switch" aria-checked="${on}" aria-label="${key}"></button>`;
// red→green for good/bad numbers; t in 0..1 (1 = good)
const rg = (t) => `hsl(${Math.round(4 + 128 * Math.max(0, Math.min(1, t)))}, 62%, 56%)`;

// ------------------------------------------------------------------ grid widget
function buildGrid(el) {
  const cols = Array.from({ length: 10 }, (_, i) => `<span>${i + 1}</span>`).join("");
  const rows = "ABCDEFGHIJ".split("").map((r) => `<span>${r}</span>`).join("");
  const cells = Array.from({ length: 100 }, (_, c) => `<button class="cell" data-c="${c}" aria-label="${LABEL(c)}"></button>`).join("");
  el.innerHTML = `<div class="cols">${cols}</div><div class="rows">${rows}</div><div class="sea"><svg class="ships" viewBox="0 0 1000 1000" preserveAspectRatio="none"></svg><div class="cells">${cells}</div></div>`;
  return { el, sea: $(".sea", el), svg: $("svg", el), cells: [...el.querySelectorAll(".cell")], st: new Array(100).fill(-1), shipKey: "" };
}
function heatBg(p, max) {
  if (!p || !max) return "";
  const t = Math.min(1, p / max);
  // amber → red; the faint end fades to clear sea instead of a low-alpha brown wash
  const k = Math.pow(t, 2.2);
  if (k < 0.04) return "";
  return `hsla(${Math.round(40 - 38 * k)}, 95%, ${Math.round(58 - 6 * k)}%, ${(0.03 + 0.69 * k).toFixed(3)})`;
}
/* o: { state[100] 0/1/2, heat?, best?, sel?[], last?, fresh?Set, ships?[{id,len,cells,cls}], firing?, pctText? } */
function paint(G, o) {
  const sel = new Set(o.sel || []);
  const max = o.heat ? o.heat.max : 0;
  for (let c = 0; c < 100; c++) {
    const b = G.cells[c], s = o.state[c] || 0;
    if (G.st[c] !== s) {
      b.innerHTML = s === 2 ? `<span class="peg hit${o.fresh && o.fresh.has(c) ? " new" : ""}"></span>` : s === 1 ? `<span class="peg miss${o.fresh && o.fresh.has(c) ? " new" : ""}"></span>` : "";
      if (o.fresh && o.fresh.has(c)) {
        b.classList.add(s === 2 ? "boom" : "splash");
        setTimeout(() => b.classList.remove("boom", "splash"), 750);
      }
      G.st[c] = s;
    }
    const hp = !s && o.heat ? o.heat.p[c] : 0;
    // "transparent", not "": WebKit kept the old heat colour forever when the inline colour was removed mid-transition
    b.style.backgroundColor = (hp && heatBg(hp, max)) || "transparent";
    b.classList.toggle("open", !s);
    b.classList.toggle("sel", sel.has(c));
    b.classList.toggle("best", o.best === c && !s);
    b.classList.toggle("last", o.last === c);
    if (o.pctText && !s && hp >= 0.005) { if (!b.firstChild || b.firstChild.className !== "pct") b.innerHTML = `<span class="pct"></span>`; b.firstChild.textContent = Math.round(hp * 100); }
    else if (!s && b.firstChild && b.firstChild.className === "pct") b.innerHTML = "";
  }
  G.el.classList.toggle("firing", !!o.firing);
  const ships = o.ships || [];
  const key = JSON.stringify(ships);
  if (key !== G.shipKey) {
    G.svg.innerHTML = ships.map((sh) => {
      const pl = Art.cellsToPlacement(sh.cells);
      return Art.shipG(sh.id, sh.len, pl.first, pl.vertical, sh.cls, true);
    }).join("");
    G.shipKey = key;
  }
}
function resetGrid(G) { G.st.fill(-1); G.shipKey = ""; }
function cellFromPoint(G, x, y) {
  const r = G.sea.getBoundingClientRect();
  const col = Math.floor(((x - r.left) / r.width) * 10), row = Math.floor(((y - r.top) / r.height) * 10);
  if (col < 0 || col > 9 || row < 0 || row > 9) return -1;
  return row * 10 + col;
}
const isMobile = () => innerWidth < 900;

// ------------------------------------------------------------------ tabs
let tab = "play";
// Each tab change is a history entry, so the browser's Back returns to the previous tab
// instead of leaving the page mid-game (how: "push" | "replace" | "pop").
let playStatus = "";
function showTab(t, how = "push") {
  const prev = tab;
  if (prev === "play") playStatus = $("#status").innerHTML;
  tab = t;
  // Lab / Rules / Settings show the live game's status, not the Paper tab's
  if (t === "lab" || t === "rules" || t === "settings") $("#status").innerHTML = playStatus;
  document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === t));
  document.querySelectorAll(".tab").forEach((s) => (s.hidden = s.id !== "tab-" + t));
  $("#tip").hidden = true;
  if (t !== "play" && typeof mineZoom === "function") mineZoom(false);
  if (t === "play") renderPlay();
  if (t === "paper") renderPaper();
  if (t === "lab") renderLab();
  if (t === "settings") renderSettings();
  if (how === "pop") return;
  const url = t === "play" ? location.pathname : "#" + t;
  try { if (how === "push" && t !== prev) history.pushState({ tab: t }, "", url); else history.replaceState({ tab: t }, "", url); } catch (e) {}
}
$("#tabs").addEventListener("click", (e) => { const b = e.target.closest("button[data-tab]"); if (b) showTab(b.dataset.tab); });
addEventListener("popstate", (e) => {
  const sh = $("#sheet");
  if (!sh.hidden && sh.dataset.kind !== "lobby") closeSheet();
  const h = (location.hash || "").slice(1);
  const t = (e.state && e.state.tab) || (["paper", "lab", "rules", "settings"].includes(h) ? h : "play");
  showTab(t, "pop");
});

// ================================================================== PLAY
const big = buildGrid($("#bigGrid")), small = buildGrid($("#smallGrid"));
// Tap your fleet to see it as big as the lid (it is the busiest board late in a game); tap again to put it back.
// Only the fleet box moves (it lies over the lid); nothing under it shifts.
function mineZoom(on) {
  const tabEl = $("#tab-play"), box = $("#mineBox");
  on = !!on && !tabEl.classList.contains("placing") && !tabEl.hidden;
  if (on) {
    const t = tabEl.getBoundingClientRect(), r = $(".playmain", tabEl).getBoundingClientRect();
    box.style.cssText = `left:${r.left - t.left}px;top:${r.top - t.top}px;width:${r.width}px;height:${r.height}px`;
  } else box.style.cssText = "";
  tabEl.classList.toggle("mine-zoom", on);
  box.setAttribute("aria-expanded", on);
}
$("#mineBox").setAttribute("role", "button");
$("#mineBox").addEventListener("click", () => { mineZoom(!$("#tab-play").classList.contains("mine-zoom")); });
// shots on board b (at seat b's fleet) are drawn on the big grid when b is the opponent
const fxd = BSFx.director(FX, {
  grid: (b) => (b === me() ? small : big).sea,
  cell: (b, c) => (b === me() ? small : big).cells[c],
});
const P = {
  mode: "computer",        // computer | pass | online
  room: null, snap: null, view: 0,
  placing: null,           // { ships:[cells], sel, fleet, noTouch, seat }
  sel: [], study: [], seen: [0, 0], endShown: false, cover: null, passT: null, lastMsg: null,
  find: null, findT: null, online: null, gen: 0,
};

function fleetFor() {
  if (P.snap && P.snap.pub) return { fleet: P.snap.pub.fleet, noTouch: P.snap.pub.opts.noTouch };
  return { fleet: E.FLEETS[S.edition], noTouch: S.noTouch };
}
function newPlacing(seat) {
  const f = fleetFor();
  P.placing = { ships: AI.randomFleet(f.fleet, f.noTouch, Math.random), sel: -1, fleet: f.fleet, noTouch: f.noTouch, seat: seat || 0 };
  P.find = null; scheduleFind();
}
function stopLocal() {
  P.gen++;
  if (P.room && P.room.mode === "local") P.room.close();
  clearTimeout(P.passT);
  P.room = null; P.snap = null;
}
function startNew(mode) {
  stopLocal();
  if (store.local) { delete store.local; save(); }
  P.mode = mode; P.snapKey = null; P.view = 0; P.sending = false; P.sel = []; P.study = []; P.seen = [0, 0]; P.endShown = false; P.cover = null; P.lastMsg = null;
  resetGrid(big); resetGrid(small); fxd.reset();
  newPlacing(0);
  closeSheet();
  renderPlay();
}

// the seat whose eyes we draw for
function me() { return P.mode === "pass" ? P.view : P.snap ? Math.max(0, P.snap.mySeat) : 0; }
function curSnap() {
  if (!P.snap) return null;
  if (P.mode === "pass" && P.room && P.room.mode === "local") return P.room.view(P.view);
  return P.snap;
}
// names over 12 characters are cut with "…"; counted in whole characters so an emoji is never cut in half.
// A player who left is replaced by a computer named "<name> (computer)": the name is cut, the tag kept.
function shortName(n) {
  const tag = / \(computer\)$/.test(n) ? " (computer)" : "";
  const ch = Array.from(tag ? n.slice(0, -tag.length) : n);
  return (ch.length > 12 ? ch.slice(0, 11).join("") + "…" : ch.join("")) + tag;
}
const nameOf = (seat) => {
  const sn = P.snap;
  if (P.mode === "computer") return seat === 0 ? "You" : AI.NAMES[(sn && sn.pub && sn.pub.levels[1]) || S.level];
  if (P.mode === "online" && sn && seat === sn.mySeat) return "You";
  if (sn && sn.seats && sn.seats[seat]) return shortName(sn.seats[seat].name || "Player " + (seat + 1));
  return "Player " + (seat + 1);
};

function onSnap(snap) {
  if (P.mode === "online") {
    // presence heartbeats re-send an unchanged snapshot; redrawing on each one swallowed taps
    const key = JSON.stringify(snap);
    if (key === P.snapKey) return;
    P.snapKey = key;
    // the other player left mid-game: online.js hands their seat to a computer; say so instead of switching silently
    const was = P.snap && P.snap.seats;
    if (was && snap.status === "playing" && snap.seats) snap.seats.forEach((s, i) => {
      if (i !== snap.mySeat && was[i] && was[i].kind === "human" && s.kind === "computer") toast(`${shortName(was[i].name || "Player " + (i + 1))} left. A computer plays on for them.`);
    });
  }
  P.snap = snap;
  if (P.mode === "online") {
    if (["closed", "left", "none"].includes(snap.status)) {
      if (snap.status === "closed") toast("The host closed the room.");
      P.online = null; startNew("computer"); return;
    }
    if (snap.status === "lobby" || snap.status === "joining") { renderLobby(); renderPlay(); return; }
    if ($("#sheet").dataset.kind === "lobby") closeSheet();
  }
  // pass-the-phone: hand over when the other player is due
  if (P.mode === "pass" && snap.pub) {
    const pub = snap.pub;
    if (pub.phase === "place" && pub.placed[P.view] && !pub.placed[1 - P.view]) {
      showCover(1 - P.view, true);
    } else if (pub.phase === "fire" && pub.turn !== P.view && !P.cover) {
      clearTimeout(P.passT);
      const g = P.gen;
      P.passT = setTimeout(() => { if (g === P.gen) showCover(pub.turn, false); }, 1300);
    }
  }
  if (P.mode !== "online") saveLocal();
  renderPlay();
  // sounds come from what changed in the shot record, so every mode (and every online player) hears the same
  const cs = curSnap();
  if (cs && cs.pub) fxd.update(cs.pub, me(), isMyTurn(cs));
}
function isMyTurn(sn) {
  const pub = sn.pub;
  return pub.phase === "fire" && pub.turn === me() && (P.mode !== "pass" || P.cover == null) && (P.mode !== "online" || sn.myTurn);
}

// computer and pass-the-phone games survive a reload (iPhone Safari reloads background tabs)
function saveLocal() {
  if (!P.room || P.room.mode !== "local") return;
  const st = P.room.state;
  if (st.phase === "fire") store.local = { mode: P.mode, state: st, study: P.study, seen: P.seen, view: P.view };
  else if (st.phase === "over" && store.local) delete store.local;
  else return;
  save();
}
function localRoom(seats, names, options) {
  const g = P.gen;
  const room = createLocal({ game, seats, options, names, botDelayMs: 650 });
  room.on("change", (snap) => { if (g === P.gen) onSnap(snap); });
  room.on("error", (e) => toast((e && e.message) || String(e)));
  P.room = room;
  room.start();
  return room;
}
function resumeLocal() {
  const L = store.local;
  if (!L || !L.state || L.state.phase !== "fire" || !["computer", "pass"].includes(L.mode)) return false;
  try {
    stopLocal();
    P.mode = L.mode; P.snapKey = null; P.view = L.view || 0; P.sel = []; P.study = L.study || []; P.seen = L.seen || [0, 0];
    P.endShown = false; P.cover = null; P.lastMsg = null; P.placing = null;
    resetGrid(big); resetGrid(small); closeSheet(); fxd.reset();
    const pass = P.mode === "pass", lv = L.state.levels || ["hard", S.level];
    if (pass) P.cover = L.state.turn; // no hand-over timer while the cover goes up
    localRoom(pass ? ["human", "human"] : ["human", "computer"], pass ? ["Player 1", "Player 2"] : ["You", AI.NAMES[lv[1]]], { resume: L.state });
    if (pass) showCover(L.state.turn, false);
    return true;
  } catch (e) { delete store.local; save(); return false; }
}

function showCover(seat, placing) {
  P.cover = seat;
  mineZoom(false); // the next player never finds the last one's fleet blown up
  const el = $("#cover");
  el.innerHTML = `<div class="big">Pass to ${esc(nameOf(seat))}</div><div class="muted">${placing ? "Time to hide your fleet." : "Your turn to fire."} No peeking, ${esc(nameOf(1 - seat))}.</div><button class="btn primary" id="coverGo">I'm ${esc(nameOf(seat))}</button>`;
  el.hidden = false;
  $("#coverGo").onclick = () => {
    el.hidden = true; P.cover = null; P.view = seat; P.sel = [];
    resetGrid(big); resetGrid(small);
    if (placing) newPlacing(seat);
    renderPlay();
  };
}

function shotLog(pub) {
  // chronological: each round, the first player's shots then the other's
  const out = [];
  const maxN = Math.max(0, ...pub.shots[0].map((x) => x.n), ...pub.shots[1].map((x) => x.n));
  for (let n = 1; n <= maxN; n++) for (const seat of [pub.first, 1 - pub.first]) {
    pub.shots[1 - seat].forEach((x) => { if (x.n === n) out.push({ seat, x }); });
  }
  return out;
}
function shipName(fleet, id) { const f = fleet.find((s) => s.id === id); return f ? f.name : id; }
function describe(pub, ent) {
  const who = nameOf(ent.seat), x = ent.x;
  if (!x.h) return { cls: "miss", text: `${who}: ${LABEL(x.c)} miss` };
  if (x.k) return { cls: "sunk", text: `${who}: ${LABEL(x.c)} sank the ${shipName(pub.fleet, x.k)}!` };
  return { cls: "hit", text: `${who}: ${LABEL(x.c)} hit${x.s ? " · " + shipName(pub.fleet, x.s) : ""}` };
}

function renderPlay() {
  if (tab !== "play") return;
  const sn = curSnap();
  const pub = sn && sn.pub;
  if (!pub || (pub.phase === "place" && !pub.placed[me()])) return renderPlacing(sn);
  if (pub.phase === "place") return renderWaiting(sn);
  renderBattle(sn);
}

function oppLine() {
  if (P.mode === "online") return `<span class="grow">Online${P.snap && P.snap.code ? " · <b>" + esc(P.snap.code) + "</b>" : ""}</span>`;
  const who = P.mode === "pass" ? "a friend on this phone" : "the " + AI.NAMES[S.level] + " computer";
  return `<span class="grow">vs <b>${esc(who)}</b></span><button class="btn small" data-act="newsheet">Change</button>`;
}

// ---------------- placing
function renderPlacing(sn) {
  if (!P.placing || (P.mode === "online" && sn && sn.pub && P.placing.fleet !== sn.pub.fleet && JSON.stringify(P.placing.fleet) !== JSON.stringify(sn.pub.fleet))) newPlacing(me());
  const pl = P.placing;
  mineZoom(false);
  $("#tab-play").classList.add("placing");
  $("#status").innerHTML = P.mode === "pass" ? `<b>${esc(nameOf(P.view))}</b> hides a fleet` : "Hide your fleet";
  $("#pbar").innerHTML = `<span class="muted" style="white-space:nowrap">Place ships</span>` + oppLine();
  const err = E.fleetError(pl.ships, pl.fleet, pl.noTouch);
  const ships = pl.ships.map((cells, i) => ({ id: pl.fleet[i].id, len: pl.fleet[i].len, cells, cls: (i === pl.sel ? "pick" : "") + (P.drag && P.drag.i === i && P.drag.bad ? " bad" : "") }));
  big.el.classList.add("placing");
  paint(big, { state: new Array(100).fill(0), ships });
  // the small grid shows the fleet chips on phone; keep it quiet while placing
  $("#mineHead").textContent = "Fleet";
  paint(small, { state: new Array(100).fill(0), ships: pl.ships.map((cells, i) => ({ id: pl.fleet[i].id, len: pl.fleet[i].len, cells })) });
  const f = P.find;
  const findHtml = f ? `<span class="chip" style="background:${rg(f.pct)}">${f.mean.toFixed(0)} shots</span> <span class="muted" style="font-size:12px">better hidden than ${Math.round(f.pct * 100)}%</span>` : `<span class="muted" style="font-size:12px">measuring…</span>`;
  $("#info").innerHTML = `
    <div class="row" style="font-size:12px;color:var(--muted)">Drag a ship, or tap it to turn it.</div>
    <div class="tray">${pl.fleet.map((s, i) => `<button data-pick="${i}" class="${i === pl.sel ? "on" : ""}">${Art.shipIcon(s.id, s.len)}<span>${esc(s.short)}</span></button>`).join("")}</div>
    <div class="row" style="gap:6px"><span style="font-size:12px;font-weight:650">Findable</span>${qBtn("find")}${findHtml}</div>
    <div class="row"><button class="btn small" data-act="rotate">Turn</button><button class="btn small" data-act="random">Random</button><button class="btn primary grow" data-act="ready" ${err ? "disabled" : ""}>Ready</button></div>`;
  $("#log").innerHTML = "";
  pegTray(null);
}

function scheduleFind() {
  clearTimeout(P.findT);
  const g = P.gen;
  P.findT = setTimeout(() => {
    if (g !== P.gen || !P.placing) return;
    const pl = P.placing;
    if (E.fleetError(pl.ships, pl.fleet, pl.noTouch)) return;
    const opts = { named: S.named, noTouch: pl.noTouch };
    let tot = 0; const G = 40;
    for (let i = 0; i < G; i++) tot += SIM.shotsToSink("hard", pl.fleet, pl.ships, opts, Math.random);
    let ref = LAB.fleetMeans.hard.means;
    if (pl.noTouch && LAB.variants && LAB.variants.noTouch) {
      // the reference fleets were measured with touching allowed; rescale them to the no-touch average
      const avg = ref.reduce((x, y) => x + y, 0) / ref.length, k = LAB.variants.noTouch.hard.mean / avg;
      ref = ref.map((x) => x * k);
    }
    const mean = tot / G;
    const below = ref.filter((x) => x < mean).length + ref.filter((x) => x === mean).length / 2;
    P.find = { mean, pct: below / ref.length };
    if (tab === "play" && P.placing === pl) renderPlay();
  }, 260);
}

function shiftInto(len, vertical, r, c) {
  r = Math.max(0, Math.min(r, vertical ? 10 - len : 9));
  c = Math.max(0, Math.min(c, vertical ? 9 : 10 - len));
  return E.lineCells(r, c, vertical ? 1 : 0, len);
}
function tryShip(i, cells) {
  const pl = P.placing, next = pl.ships.slice();
  next[i] = cells;
  return E.fleetError(next, pl.fleet, pl.noTouch) ? null : next;
}
function rotateSel() {
  const pl = P.placing;
  if (pl.sel < 0) pl.sel = 0;
  const i = pl.sel, cells = pl.ships[i], len = cells.length, p = Art.cellsToPlacement(cells);
  const [r, c] = E.rc(p.first), v = !p.vertical;
  for (let d = 0; d < len; d++) for (const s of [1, -1]) {
    const rr = v ? r - d * s : r, cc = v ? c : c - d * s;
    const cand = shiftInto(len, v, rr, cc);
    const next = cand && tryShip(i, cand);
    if (next) { pl.ships = next; P.find = null; scheduleFind(); FX.play("place"); renderPlay(); return; }
  }
  FX.play("error");
  toast("No room to turn it there.");
}
function moveSelTo(cell) {
  const pl = P.placing, i = pl.sel, cells = pl.ships[i], p = Art.cellsToPlacement(cells);
  const [r, c] = E.rc(cell);
  const cand = shiftInto(cells.length, p.vertical, r, c);
  const next = cand && tryShip(i, cand);
  if (next) { pl.ships = next; P.find = null; scheduleFind(); FX.play("place"); renderPlay(); }
  else { FX.play("error"); toast(pl.noTouch ? "Ships can't overlap or touch." : "Ships can't overlap."); }
}

// drag ships with the finger (pointer events)
big.sea.addEventListener("pointerdown", (ev) => {
  if (!big.el.classList.contains("placing") || !P.placing) return;
  const c = cellFromPoint(big, ev.clientX, ev.clientY);
  if (c < 0) return;
  const pl = P.placing, i = pl.ships.findIndex((s) => s.includes(c));
  if (i < 0) { P.drag = null; return; }
  const p = Art.cellsToPlacement(pl.ships[i]);
  P.drag = { i, off: pl.ships[i].slice().sort((a, b) => a - b).indexOf(c), start: c, cur: c, moved: false, orig: pl.ships[i], vertical: p.vertical, bad: false };
  try { big.sea.setPointerCapture(ev.pointerId); } catch (e) {}
  ev.preventDefault();
});
big.sea.addEventListener("pointermove", (ev) => {
  const d = P.drag;
  if (!d) return;
  const c = cellFromPoint(big, ev.clientX, ev.clientY);
  if (c < 0 || c === d.cur) return;
  d.cur = c; d.moved = true;
  const pl = P.placing, len = d.orig.length, [r, cc] = E.rc(c);
  const cand = shiftInto(len, d.vertical, d.vertical ? r - d.off : r, d.vertical ? cc : cc - d.off);
  if (!cand) return;
  pl.ships[d.i] = cand; pl.sel = d.i;
  d.bad = !!E.fleetError(pl.ships, pl.fleet, pl.noTouch);
  renderPlay();
});
function endDrag() {
  const d = P.drag;
  if (!d) return;
  P.drag = null;
  const pl = P.placing;
  if (d.moved) {
    if (E.fleetError(pl.ships, pl.fleet, pl.noTouch)) { pl.ships[d.i] = d.orig; FX.play("error"); toast(pl.noTouch ? "Ships can't overlap or touch." : "Ships can't overlap."); }
    else { P.find = null; scheduleFind(); FX.play("place"); }
  } else if (pl.sel === d.i) rotateSel();
  else pl.sel = d.i;
  renderPlay();
}
big.sea.addEventListener("pointerup", endDrag);
big.sea.addEventListener("pointercancel", () => { if (P.drag) { P.placing.ships[P.drag.i] = P.drag.orig; P.drag = null; renderPlay(); } });

// ---------------- waiting for the other fleet
function renderWaiting(sn) {
  big.el.classList.remove("placing"); $("#tab-play").classList.remove("placing");
  const mine = sn.mine && sn.mine.ships;
  const fleet = sn.pub.fleet;
  $("#status").textContent = "Waiting…";
  $("#pbar").innerHTML = `<span class="grow">Waiting for <b>${esc(nameOf(1 - me()))}</b> to hide a fleet</span>`;
  paint(big, { state: new Array(100).fill(0), ships: (mine || []).map((cells, i) => ({ id: fleet[i].id, len: fleet[i].len, cells })) });
  paint(small, { state: new Array(100).fill(0) });
  pegTray(null);
  $("#info").innerHTML = `<div class="msg">Fleet hidden.</div><div class="muted" style="font-size:13px">The game starts when both fleets are in.</div>${P.mode === "online" ? `<div class="row"><button class="btn small" data-act="leave">Leave room</button></div>` : ""}`;
}

// ---------------- peg tray (front of the case): loose red and white pegs that run down as the game goes on.
// One case holds 84 white + 42 red pegs (half the classic box); every shot either side marks takes one.
let trayKey = "";
function pegTray(pub, my) {
  let w = 84, r = 42;
  if (pub) for (const b of [0, 1]) for (const x of pub.shots[b]) { if (x.h) r--; else w--; }
  const nw = w > 0 ? Math.max(1, Math.round((w / 84) * 22)) : 0, nr = r > 0 ? Math.max(1, Math.round((r / 42) * 14)) : 0;
  const key = nw + "/" + nr;
  if (key === trayKey) return;
  trayKey = key;
  const T = window.TABLE, rnd = T.rng(T.hash("pegtray"));
  const pegs = (n, cls) => Array.from({ length: n }, () => `<i class="${cls}" style="left:${(4 + rnd() * 84).toFixed(1)}%;top:${(8 + rnd() * 56).toFixed(1)}%"></i>`).join("");
  $("#pegTray").innerHTML = `<div class="comp">${pegs(nw, "w")}</div><div class="comp">${pegs(nr, "r")}</div>`;
}

// ---------------- battle
function fleetChips(pub, board) {
  const hits = (id) => pub.shots[board].filter((x) => x.s === id).length;
  return `<div class="fleet">${pub.fleet.map((s) => tallyChip(s, pub.sunk[board].includes(s.id), hits(s.id))).join("")}</div>`;
}
// one ship in the tally: icon, name, hits so far. On a phone a hit ship shows its count under the icon instead of
// its name (the icon says which ship), so five counts fit on a 320px lid without running into each other.
function tallyChip(s, sunk, h) {
  const n = !sunk && h ? h : 0;
  return `<div class="fchip${sunk ? " sunk" : ""}${n ? " hashit" : ""}" title="${esc(s.name)}">${Art.shipIcon(s.id, s.len)}<span><i class="nm">${esc(s.short)}</i>${n ? ` <b class="hitn">${n}/${s.len}</b>` : ""}</span></div>`;
}
function renderBattle(sn) {
  big.el.classList.remove("placing"); $("#tab-play").classList.remove("placing");
  const pub = sn.pub, my = me(), opp = 1 - my;
  const K = D.knowledge(pub, opp), h = D.heat(K);
  const myTurn = pub.phase === "fire" && pub.turn === my && (P.mode !== "pass" || P.cover == null) && (P.mode !== "online" || sn.myTurn);
  const need = pub.need || 1;
  P.sel = P.sel.filter((c) => !K.cell[c]).slice(0, need);
  // fresh shots (animate once)
  const fresh = [new Set(), new Set()];
  for (const b of [0, 1]) {
    const arr = pub.shots[b];
    if (arr.length < P.seen[b]) P.seen[b] = 0;
    for (let i = P.seen[b]; i < arr.length; i++) fresh[b].add(arr[i].c);
    P.seen[b] = arr.length;
  }
  // target grid: sunk ships drawn where they were (named hits tell exactly which squares)
  const wrecks = [];
  if (pub.opts.named) pub.sunk[opp].forEach((id) => {
    const f = pub.fleet.find((s) => s.id === id);
    const cells = K.shots.filter((x) => x.s === id).map((x) => x.c);
    if (cells.length === f.len) wrecks.push({ id, len: f.len, cells, cls: "wreck fadein" });
  });
  if (pub.phase === "over" && P.mode !== "online" && P.room && P.room.state) {
    const all = P.room.state.ships[opp];
    pub.fleet.forEach((f, i) => { if (!pub.sunk[opp].includes(f.id)) wrecks.push({ id: f.id, len: f.len, cells: all[i], cls: "reveal fadein" }); });
  }
  const lastMine = pub.shots[opp].length ? pub.shots[opp][pub.shots[opp].length - 1].c : -1;
  const showHeat = S.heat && pub.phase === "fire";
  paint(big, {
    state: K.cell, heat: showHeat ? h : null, best: S.best && myTurn ? h.best : -1, sel: P.sel, last: lastMine,
    fresh: fresh[opp], ships: wrecks, firing: myTurn, pctText: showHeat && !isMobile(),
  });
  // my fleet grid
  const myShips = (sn.mine && sn.mine.ships) || [];
  const myK = D.knowledge(pub, my);
  const lastTheirs = pub.shots[my].length ? pub.shots[my][pub.shots[my].length - 1].c : -1;
  paint(small, { state: myK.cell, last: lastTheirs, fresh: fresh[my], ships: myShips.map((cells, i) => ({ id: pub.fleet[i].id, len: pub.fleet[i].len, cells, cls: pub.sunk[my].includes(pub.fleet[i].id) ? "sunk" : "" })) });
  $("#mineHead").textContent = P.mode === "pass" ? nameOf(my) + "'s fleet" : "Your fleet";

  // top bar
  const myShots = pub.shots[opp].length;
  // far side of the table: the opponent's seat (name plate) behind the back of their raised lid
  const theirTurn = pub.phase === "fire" && pub.turn === opp;
  $("#pbar").innerHTML = `<span class="oppseat tbl-seat${theirTurn ? " is-turn" : ""}"><span class="tbl-plate">${esc(nameOf(opp))}</span></span>` + fleetChips(pub, opp) + `<span style="white-space:nowrap">Shots <b>${myShots}</b></span>`;
  pegTray(pub, my);
  // status
  const st = $("#status");
  if (pub.phase === "over") st.innerHTML = pub.winner === my ? "<b>You win</b>" : esc(nameOf(pub.winner)) + " wins";
  else if (myTurn) st.innerHTML = `<b>Your turn</b>${pub.opts.salvo ? ` · ${pub.shotsLeft} shot${pub.shotsLeft > 1 ? "s" : ""}` : ""}`;
  else st.textContent = `${nameOf(pub.turn)} is aiming…`;

  // info panel
  const log = shotLog(pub);
  const lastStudy = P.study.length ? P.study[P.study.length - 1] : null;
  const mineLast = [...log].reverse().find((e) => e.seat === my), theirLast = [...log].reverse().find((e) => e.seat === opp);
  const dm = mineLast && describe(pub, mineLast), dt = theirLast && describe(pub, theirLast);
  let msg = dm ? `<div class="msg ${dm.cls}">${esc(dm.text)}</div>` : `<div class="msg">${myTurn ? "Pick a square to fire at." : esc(nameOf(pub.turn)) + " fires first."}</div>`;
  if (dt) msg += `<div class="msg sub ${dt.cls}" style="font-size:12px;margin-top:-4px">${esc(dt.text)}</div>`;
  let aim = "";
  if (pub.phase === "fire" && myTurn) {
    if (P.sel.length) {
      const tot = P.sel.reduce((a, c) => a + h.p[c], 0);
      const label = P.sel.length === 1 ? LABEL(P.sel[0]) : P.sel.length + "/" + need;
      const bestSum = need > 1 ? D.topK(K, need).reduce((a, c) => a + h.p[c], 0) : h.max;
      const t = bestSum ? tot / bestSum : 0;
      aim = `<div class="aim"><span class="cellname">${label}</span><span class="chance" style="color:${rg(t)}">${need > 1 ? (tot).toFixed(1) + " hits" : pct(h.p[P.sel[0]])}</span><span class="of">${need > 1 ? "expected" : "hit chance"} ${qBtn("chance")}</span></div>`;
    } else {
      aim = `<div class="aim"><span class="of">Best: <b style="color:var(--text)">${h.best >= 0 ? LABEL(h.best) : "-"}</b> · ${pct(h.max)} ${qBtn("chance")}</span></div>`;
    }
  } else if (pub.phase === "fire") {
    aim = lastStudy ? `<div class="aim"><span class="of">Your last shot: ${pct(lastStudy.got)} · best was ${pct(lastStudy.best)}</span></div>` : `<div class="aim"></div>`;
  } else {
    aim = `<div class="aim"><span class="of">Game over</span></div>`;
  }
  const canFire = myTurn && P.sel.length === need;
  const buttons = pub.phase === "over"
    ? `<div class="row"><button class="btn small" data-act="endsheet">Result</button><button class="btn primary grow" data-act="again">New game</button></div>`
    : `<div class="row"><button class="btn small" data-act="best" ${myTurn ? "" : "disabled"}>Best</button><button class="btn fire grow" data-act="fire" ${canFire ? "" : "disabled"}>Fire${need > 1 ? " " + P.sel.length + "/" + need : ""}</button></div>`;
  $("#info").innerHTML = msg + aim + buttons +
    `<div class="row"><span class="tog">${switchHtml("heat", S.heat)} Heatmap ${qBtn("heat")}</span>${P.mode === "online" ? `<button class="btn small" data-act="leave" style="margin-left:auto">Leave</button>` : ""}</div>`;
  $("#log").innerHTML = log.slice().reverse().map((e) => {
    const d = describe(pub, e);
    return `<li class="${d.cls}">${esc(d.text).replace(/(hit[^<]*|sank[^<]*)$/, (m) => `<span class="${d.cls === "sunk" ? "k" : "h"}">${m}</span>`)}</li>`;
  }).join("");
  if (pub.phase === "over" && !P.endShown) { P.endShown = true; setTimeout(() => showEnd(), 900); }
}

function heatNow() {
  const sn = curSnap(); const K = D.knowledge(sn.pub, 1 - me()); return { K, h: D.heat(K) };
}
async function fire() {
  const sn = curSnap(); const pub = sn.pub, need = pub.need || 1;
  if (P.sel.length !== need || (P.mode === "online" && P.sending)) return;
  const { K, h } = heatNow();
  const got = P.sel.reduce((a, c) => a + h.p[c], 0);
  const best = need > 1 ? D.topK(K, need).reduce((a, c) => a + h.p[c], 0) : h.max;
  P.study.push({ got, best, n: need });
  const a = { t: "fire", cells: P.sel.slice() };
  P.sel = [];
  if (P.mode === "online") {
    // one move on the wire at a time: a second Fire while the first is still sending would be refused as "not your turn"
    P.sending = true;
    try { const r = await P.room.act(a); if (!r.ok) toast(r.message || "Move not sent."); }
    finally { P.sending = false; }
  } else P.room.act(a, me());
}

$("#bigGrid").addEventListener("click", (ev) => {
  const b = ev.target.closest(".cell"); if (!b) return;
  const sn = curSnap(); if (!sn || !sn.pub || sn.pub.phase !== "fire") {
    if (P.placing && big.el.classList.contains("placing") && P.placing.sel >= 0) {
      const c = +b.dataset.c;
      if (!P.placing.ships.some((s) => s.includes(c))) moveSelTo(c);
    }
    return;
  }
  if (!big.el.classList.contains("firing")) return void FX.play("error");
  const c = +b.dataset.c, need = sn.pub.need || 1;
  if (!b.classList.contains("open")) return void FX.play("error");
  if (need !== 1 || P.sel[0] !== c) FX.play("click");
  if (need === 1) {
    if (P.sel[0] === c) return fire();
    P.sel = [c];
  } else {
    const i = P.sel.indexOf(c);
    if (i >= 0) P.sel.splice(i, 1); else if (P.sel.length < need) P.sel.push(c); else { P.sel.shift(); P.sel.push(c); }
  }
  renderPlay();
});

async function ready() {
  const pl = P.placing;
  if (E.fleetError(pl.ships, pl.fleet, pl.noTouch)) return;
  store.lastFleet = { edition: S.edition, ships: pl.ships }; save();
  const a = E.placeMove(pl.ships);
  if (P.mode === "online") {
    if (P.readySent) return;
    P.readySent = true;
    const r = await P.room.act(a); P.readySent = false;
    if (!r.ok) toast(r.message || "Not sent."); return;
  }
  if (!P.room) {
    const opts = Object.assign(rulesOpts(), { levels: ["hard", S.level] });
    const seats = P.mode === "pass" ? ["human", "human"] : ["human", "computer"];
    const names = P.mode === "pass" ? ["Player 1", "Player 2"] : ["You", AI.NAMES[S.level]];
    localRoom(seats, names, opts);
  }
  P.placing = null;
  FX.play("place", { pitch: 0.7 }); // the fleet goes down: a heavier clunk
  P.room.act(a, P.mode === "pass" ? P.view : 0);
}

// ---------------- sheets
function openSheet(kind, html) {
  const sh = $("#sheet"); sh.dataset.kind = kind; sh.innerHTML = `<div class="panel">${html}</div>`; sh.hidden = false;
}
function closeSheet() { const sh = $("#sheet"); sh.hidden = true; sh.dataset.kind = ""; sh.innerHTML = ""; }
$("#sheet").addEventListener("click", (e) => { if (e.target.id === "sheet" && $("#sheet").dataset.kind !== "lobby") closeSheet(); });

let pickOpp = null;
function newGameSheet() {
  pickOpp = pickOpp || P.mode;
  const lv = AI.LEVELS.map((l) => `<button data-level="${l}" class="${S.level === l ? "on" : ""}">${AI.NAMES[l]}</button>`).join("");
  const ruleBits = [S.edition === "mb1967" ? "1967 fleet" : "Hasbro fleet", S.salvo ? (S.salvoAll ? "Salvo (all at once)" : "Salvo") : "One shot a turn", S.named ? null : "unnamed hits", S.noTouch ? "no touching" : null].filter(Boolean).join(" · ");
  openSheet("new", `<h2>New game</h2>
    <div class="opp3"><button data-opp="computer" class="${pickOpp === "computer" ? "on" : ""}">Computer</button><button data-opp="pass" class="${pickOpp === "pass" ? "on" : ""}">Pass phone</button><button data-opp="online" class="${pickOpp === "online" ? "on" : ""}">Online</button></div>
    ${pickOpp === "computer" ? `<h3>Computer ${qBtn("strong")}</h3><div class="seg">${lv}</div><div class="muted" style="font-size:12px;margin-top:6px">Sinks a fleet in about ${LAB.shots[S.level].mean.toFixed(0)} shots on average.</div>` : ""}
    ${pickOpp === "online" ? `<h3>Your name</h3><input type="text" id="netName" maxlength="20" value="${esc(S.name)}" placeholder="Name">
       <div class="actions"><button class="btn primary" data-act="create">Create room</button></div>
       <h3>Join a friend</h3><div class="row"><input type="text" class="codein" id="netCode" maxlength="5" placeholder="CODE" autocapitalize="characters" autocomplete="off"><button class="btn" data-act="join">Join</button></div>` : ""}
    <h3>Rules</h3><div class="row" style="font-size:13px"><span class="muted">${esc(ruleBits)}</span><button class="btn small" data-act="gosettings">Change</button></div>
    ${pickOpp !== "online" ? `<div class="actions"><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="start">Start</button></div>` : `<div class="actions"><button class="btn" data-act="close">Cancel</button></div>`}`);
}

function showEnd() {
  const sn = curSnap(); if (!sn || !sn.pub) return;
  const pub = sn.pub, my = me(), opp = 1 - my;
  const mine = pub.shots[opp], theirs = pub.shots[my];
  const hits = mine.filter((x) => x.h).length;
  const won = pub.winner === my;
  const title = P.mode === "pass" ? `${esc(nameOf(pub.winner))} wins!` : won ? "You win!" : `${esc(nameOf(pub.winner))} wins`;
  let quality = "";
  if (P.study.length) {
    const g = P.study.reduce((a, s) => a + s.got / s.n, 0) / P.study.length, b = P.study.reduce((a, s) => a + s.best / s.n, 0) / P.study.length;
    quality = `<span>Your aim ${qBtn("quality")}</span><b style="color:${rg(b ? g / b : 0)}">${pct(g)} <span class="muted" style="font-weight:500">vs best ${pct(b)}</span></b>`;
  }
  openSheet("end", `<h2 class="${P.mode === "pass" ? "wintitle" : won ? "wintitle" : "losetitle"}">${title}</h2>
    <div class="stats">
      <span>Your shots</span><b>${mine.length}</b>
      <span>Hits</span><b>${hits} of ${mine.length} (${mine.length ? Math.round((hits / mine.length) * 100) : 0}%)</b>
      <span>${esc(nameOf(opp))}'s shots</span><b>${theirs.length}</b>
      ${quality}
      <span>Density computer</span><b>${LAB.shots.hard.mean.toFixed(0)} shots avg</b>
    </div>
    <div class="actions"><button class="btn" data-act="close">See boards</button>${P.mode === "online" ? `<button class="btn primary" data-act="leave">Leave room</button>` : `<button class="btn primary" data-act="again">New game</button>`}</div>`);
}

// ---------------- online
async function openOnline() {
  if (P.online) return P.online;
  const g = ++P.gen;
  stopLocal();
  const room = createOnline({ game, gameId: "battleship", botDelayMs: 800 });
  room.on("change", (snap) => { if (P.online === room) onSnap(snap); });
  room.on("error", (m) => toast(m));
  P.online = room; P.room = room; P.mode = "online"; P.snapKey = null; P.sending = false;
  P.sel = []; P.study = []; P.seen = [0, 0]; P.endShown = false; P.placing = null;
  resetGrid(big); resetGrid(small); fxd.reset();
  return room;
}
function renderLobby() {
  const sn = P.snap;
  if (!sn) return;
  if (sn.status === "joining") { openSheet("lobby", `<h2>Joining…</h2><div class="muted">Waiting for the host to seat you.</div><div class="actions"><button class="btn" data-act="leave">Cancel</button></div>`); return; }
  const seats = (sn.seats || []).map((s, i) => `<div class="seatrow"><span class="dot${s.kind === "computer" || (s.kind === "human" && s.online) ? " on" : ""}"></span><span style="flex:1">${s.kind === "empty" ? '<span class="muted">Open seat</span>' : esc(s.name || "Player " + (i + 1))}${i === sn.mySeat ? " (you)" : ""}${s.isHost ? ' <span class="muted">host</span>' : ""}</span>${sn.isHost && i !== sn.mySeat ? (s.kind === "empty" ? `<button class="btn small" data-seat="${i}" data-kind="computer">Computer</button>` : s.kind === "computer" ? `<button class="btn small" data-seat="${i}" data-kind="empty">Open</button>` : "") : ""}</div>`).join("");
  const o = sn.options || {};
  const ruleBits = [o.edition === "mb1967" ? "1967 fleet" : "Hasbro fleet", o.salvo ? (o.salvoAll ? "Salvo (all at once)" : "Salvo") : "One shot a turn", o.named === false ? "unnamed hits" : null, o.noTouch ? "no touching" : null].filter(Boolean).join(" · ");
  openSheet("lobby", `<h2>Room</h2><div class="code">${esc(sn.code || "")}</div>
    <div class="muted" style="font-size:13px;margin:4px 0 10px">Your friend opens this page, taps Play → Change → Online, and types this code.</div>
    ${seats}<div class="muted" style="font-size:12px;margin-top:8px">${esc(ruleBits)}</div>
    <div class="actions"><button class="btn" data-act="leave">Leave</button>${sn.isHost ? `<button class="btn primary" data-act="ostart">Start</button>` : `<span class="muted" style="align-self:center;font-size:13px">Host starts the game</span>`}</div>`);
}

// ---------------- one click handler for the play tab and sheet
document.addEventListener("click", async (ev) => {
  const t = ev.target.closest("[data-act],[data-pick],[data-opp],[data-level],[data-seat],[data-set]");
  if (!t) return;
  if (t.dataset.set) return; // settings handler below
  if (t.dataset.pick != null && P.placing) { P.placing.sel = +t.dataset.pick; return renderPlay(); }
  if (t.dataset.opp) { pickOpp = t.dataset.opp; return newGameSheet(); }
  if (t.dataset.level) { S.level = t.dataset.level; save(); return newGameSheet(); }
  if (t.dataset.seat) { const r = await P.room.setSeat(+t.dataset.seat, t.dataset.kind); if (!r.ok) toast(r.message || "Couldn't change seat."); return; }
  const act = t.dataset.act;
  if (act === "newsheet") { pickOpp = null; return newGameSheet(); }
  if (act === "close") return closeSheet();
  if (act === "gosettings") { closeSheet(); return showTab("settings"); }
  if (act === "start") { S.opp = pickOpp; save(); return startNew(pickOpp); }
  if (act === "again") { closeSheet(); return startNew(P.mode === "online" ? "computer" : P.mode); }
  if (act === "endsheet") return showEnd();
  if (act === "rotate") return rotateSel();
  if (act === "random") { newPlacing(P.placing ? P.placing.seat : 0); FX.play("slide"); return renderPlay(); }
  if (act === "ready") return ready();
  if (act === "best") { const sn = curSnap(); const { K } = heatNow(); P.sel = D.topK(K, sn.pub.need || 1); return renderPlay(); }
  if (act === "fire") return fire();
  if (act === "create" || act === "join") {
    const name = ($("#netName") && $("#netName").value.trim()) || S.name || "Player";
    S.name = name; save();
    t.disabled = true;
    if (act === "create") {
      const room = await openOnline();
      const opts = Object.assign(rulesOpts(), { levels: ["hard", S.level] });
      const r = await room.createRoom({ name, seats: ["human", "empty"], options: opts });
      if (!r.ok) { toast(r.message || "Couldn't create a room."); P.online = null; startNew("computer"); }
    } else {
      const code = (($("#netCode") && $("#netCode").value) || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length !== 5) { t.disabled = false; return toast("Codes are 5 letters/numbers."); }
      const room = await openOnline();
      const r = await room.joinRoom(code, name);
      if (!r.ok) { toast(r.message || "Couldn't join."); P.online = null; startNew("computer"); }
    }
    return;
  }
  if (act === "ostart") { const r = await P.room.start(); if (!r.ok) toast(r.message || "Couldn't start."); return; }
  if (act === "leave") {
    const room = P.online; P.online = null;
    closeSheet();
    if (room) { if (P.snap && P.snap.isHost && P.snap.status !== "playing") await room.close(); else await room.leave(); }
    return startNew("computer");
  }
});

// ================================================================== PAPER (real-table companion)
const paperGrid = buildGrid($("#paperGrid"));
function paperNew() {
  store.paper = { opts: { edition: S.edition, named: S.named, noTouch: S.noTouch }, shots: [] };
  save();
}
if (!store.paper || !store.paper.opts) paperNew();
let paperSel = -1, paperConfirm = false;
function paperK() {
  const pp = store.paper, fleet = E.FLEETS[pp.opts.edition];
  const pub = { fleet, opts: pp.opts, shots: [pp.shots], sunk: [pp.shots.filter((x) => x.k).map((x) => x.k)] };
  return D.knowledge(pub, 0);
}
function renderPaper() {
  if (tab !== "paper") return;
  const pp = store.paper, fleet = E.FLEETS[pp.opts.edition];
  const K = paperK(), h = D.heat(K);
  const wrecks = [];
  if (pp.opts.named) K.sunk.forEach((id) => {
    const f = fleet.find((s) => s.id === id), cells = pp.shots.filter((x) => x.s === id).map((x) => x.c);
    if (f && cells.length === f.len) wrecks.push({ id, len: f.len, cells, cls: "wreck" });
  });
  paint(paperGrid, { state: K.cell, heat: S.heat ? h : null, best: h.best, sel: paperSel >= 0 ? [paperSel] : [], ships: wrecks, firing: true, pctText: S.heat && !isMobile() });
  const hitsOf = (id) => pp.shots.filter((x) => x.s === id).length;
  $("#ppbar").innerHTML = `<div class="fleet">${fleet.map((s) => tallyChip(s, K.sunk.includes(s.id), pp.opts.named ? hitsOf(s.id) : 0)).join("")}</div><span style="white-space:nowrap">Shots <b>${pp.shots.length}</b></span>`;
  $("#status").innerHTML = "Paper game " + qBtn("paper");
  const pin = $("#pinfo");
  const allSunk = K.sunk.length >= fleet.length;
  // answers that leave a ship nowhere to sit can't all be true: say so instead of a map that quietly ignores that ship
  const lost = allSunk ? [] : D.unfittable(K).map((id) => fleet.find((s) => s.id === id).name);
  const lostHtml = lost.length ? `<div class="msg hit" style="font-size:13px;white-space:normal">${esc(lost.join(", "))} can't fit anywhere. Check your calls.</div>` : "";
  if (allSunk) {
    // the game on the table is over: no more answers to enter
    paperSel = -1;
    pin.innerHTML = `<div class="msg sunk">All ${fleet.length} ships sunk in ${pp.shots.length} shots</div>
      <div class="row"><button class="btn small" data-pp="undo">Undo</button><button class="btn small" data-pp="new">${paperConfirm ? "Sure? Tap again" : "New game"}</button></div>`;
    return;
  }
  if (paperSel < 0) {
    pin.innerHTML = `<div class="aim"><span class="of">Best shot</span><span class="cellname">${h.best >= 0 ? LABEL(h.best) : "-"}</span><span class="chance" style="color:var(--good)">${h.best >= 0 ? pct(h.max) : ""}</span>${qBtn("chance")}</div>
      ${lostHtml || `<div class="muted" style="font-size:13px">Tap the square you called, then the answer you got.</div>`}
      <div class="row"><button class="btn small" data-pp="undo" ${pp.shots.length ? "" : "disabled"}>Undo</button><button class="btn small" data-pp="new">${paperConfirm ? "Sure? Tap again" : "New game"}</button><span class="tog" style="margin-left:auto">${switchHtml("heat", S.heat)} Heatmap</span></div>
      <div class="muted" style="font-size:12px">${esc(fleet.map((s) => s.name).join(", "))}${pp.opts.named ? "" : " · hits not named"}${pp.opts.noTouch ? " · no touching" : ""}</div>`;
    return;
  }
  const marked = pp.shots.find((x) => x.c === paperSel);
  const open = fleet.filter((s) => !K.sunk.includes(s.id));
  const shipBtns = (kind) => open.map((s) => `<button class="btn small" data-pp="${kind}" data-id="${s.id}">${esc(s.short)}</button>`).join("");
  pin.innerHTML = `<div class="aim"><span class="cellname">${LABEL(paperSel)}</span><span class="chance">${marked ? (marked.h ? "hit" : "miss") : pct(h.p[paperSel])}</span><span class="of">${marked ? "already marked" : "hit chance"}</span></div>
    ${marked ? `<div class="row"><button class="btn" data-pp="clear">Clear this square</button><button class="btn" data-pp="cancel">Cancel</button></div>` : `
    <div class="row"><button class="btn" data-pp="miss">Miss</button>${pp.opts.named ? "" : `<button class="btn" data-pp="hit">Hit</button>`}<button class="btn small" data-pp="cancel" style="margin-left:auto">Cancel</button></div>
    <div class="row"><span class="muted" style="font-size:12px">${pp.opts.named ? "Hit:" : "Hit and sank:"}</span>${shipBtns(pp.opts.named ? "hitship" : "sank")}</div>`}`;
}
$("#paperGrid").addEventListener("click", (ev) => {
  const b = ev.target.closest(".cell"); if (!b) return;
  if (paperK().sunk.length >= E.FLEETS[store.paper.opts.edition].length) return void FX.play("error"); // all sunk: nothing left to answer
  paperSel = +b.dataset.c; paperConfirm = false; renderPaper();
});
$("#pinfo").addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-pp]"); if (!b) return;
  const pp = store.paper, fleet = E.FLEETS[pp.opts.edition], k = b.dataset.pp;
  if (k === "new") { if (!paperConfirm) { paperConfirm = true; return renderPaper(); } paperConfirm = false; paperNew(); paperSel = -1; resetGrid(paperGrid); return renderPaper(); }
  paperConfirm = false;
  if (k === "undo") { pp.shots.pop(); resetGrid(paperGrid); }
  if (k === "cancel") paperSel = -1;
  if (k === "clear") { pp.shots = pp.shots.filter((x) => x.c !== paperSel); paperSel = -1; resetGrid(paperGrid); }
  const cellAt = paperSel >= 0 ? paperGrid.cells[paperSel] : null;
  if (k === "miss") { pp.shots.push({ c: paperSel, h: 0, n: pp.shots.length + 1 }); paperSel = -1; BSFx.paper(FX, "miss"); }
  if (k === "hit") { pp.shots.push({ c: paperSel, h: 1, n: pp.shots.length + 1 }); paperSel = -1; BSFx.paper(FX, "hit", cellAt, paperGrid.sea); }
  if (k === "hitship" || k === "sank") {
    const id = b.dataset.id, f = fleet.find((s) => s.id === id);
    const rec = { c: paperSel, h: 1, n: pp.shots.length + 1 };
    if (k === "hitship") {
      rec.s = id;
      if (pp.shots.filter((x) => x.s === id).length + 1 >= f.len) rec.k = id;
    } else rec.k = id;
    pp.shots.push(rec); paperSel = -1;
    BSFx.paper(FX, rec.k ? "sank" : "hit", cellAt, paperGrid.sea, new Set(pp.shots.filter((x) => x.k).map((x) => x.k)).size >= fleet.length);
    if (pp.opts.named && !rec.k) {
      const K = paperK();
      if (!D.namedCandidates(K, f).length) toast(`The ${f.name} can't fit those hits. Check the last call.`);
    }
    const own = pp.shots.filter((x) => x.s === id).map((x) => x.c);
    if (rec.k && rec.s && !E.isLine(own, f.len)) toast(`Those ${f.name} hits aren't in one straight row. Check your calls.`);
    else if (rec.k) toast(`${f.name} sunk.`);
  }
  save(); renderPaper();
});

// ================================================================== LAB
let labFleetRes = null, labBusy = false;
function histSvg() {
  const colors = { easy: "#8d93a8", medium: "#f0b354", hard: "#6ea8fe" };
  const W = 600, H = 170, x0 = 30, x1 = W - 10, y0 = H - 22, xs = (n) => x0 + ((n - 17) / 83) * (x1 - x0);
  let maxY = 0; for (const lv of AI.LEVELS) for (let n = 17; n <= 100; n++) maxY = Math.max(maxY, LAB.hist[lv][n]);
  const ys = (v) => y0 - (v / maxY) * (y0 - 12);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="How many shots each computer needs">`;
  for (const n of [17, 30, 40, 50, 60, 70, 80, 90, 100]) s += `<line x1="${xs(n)}" x2="${xs(n)}" y1="10" y2="${y0}" stroke="#2a3042" stroke-width="1"/><text x="${xs(n)}" y="${H - 6}" fill="#969db4" font-size="11" text-anchor="middle">${n}</text>`;
  for (const lv of AI.LEVELS) {
    let d = "";
    for (let n = 17; n <= 100; n++) d += (n === 17 ? "M" : "L") + xs(n).toFixed(1) + "," + ys(LAB.hist[lv][n]).toFixed(1);
    s += `<path d="${d}" fill="none" stroke="${colors[lv]}" stroke-width="2" stroke-linejoin="round"><title>${AI.NAMES[lv]}</title></path>`;
    const m = LAB.shots[lv].median;
    s += `<text x="${Math.min(x1 - 50, xs(m))}" y="${Math.max(12, ys(LAB.hist[lv][m]) - 6)}" fill="#e8eaf0" font-size="12" text-anchor="middle">${AI.NAMES[lv]}</text>`;
  }
  return s + `</svg>`;
}
function calibSvg() {
  const W = 320, H = 220, p = 30, pl = 46, sz = (v) => pl + v * (W - pl - 10), sy = (v) => H - p - v * (H - p - 10);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Heatmap chance vs real hit rate">`;
  for (const v of [0, 0.25, 0.5, 0.75, 1]) s += `<line x1="${sz(0)}" x2="${sz(1)}" y1="${sy(v)}" y2="${sy(v)}" stroke="#2a3042"/><text x="${pl - 4}" y="${sy(v) + 4}" fill="#969db4" font-size="10" text-anchor="end">${v * 100}%</text><text x="${sz(v)}" y="${H - p + 14}" fill="#969db4" font-size="10" text-anchor="middle">${v * 100}%</text>`;
  s += `<line x1="${sz(0)}" y1="${sy(0)}" x2="${sz(1)}" y2="${sy(1)}" stroke="#969db4" stroke-dasharray="4 4"/>`;
  LAB.calib.forEach((b) => { if (b.n > 50) s += `<circle cx="${sz(b.said)}" cy="${sy(b.was)}" r="6" fill="#6ea8fe" stroke="#1a1e2b" stroke-width="2"><title>Map said ${pct(b.said)} · was ${pct(b.was)} (${b.n.toLocaleString()} squares)</title></circle>`; });
  s += `<text x="${sz(0.5)}" y="${H - 2}" fill="#969db4" font-size="11" text-anchor="middle">map said</text><text x="10" y="${sy(0.5)}" fill="#969db4" font-size="11" text-anchor="middle" transform="rotate(-90 10 ${sy(0.5)})">really hit</text>`;
  return s + `</svg>`;
}
function renderLab() {
  const L = LAB, nm = AI.NAMES;
  const strong = AI.LEVELS.slice().reverse().map((lv) => `<tr><td>${nm[lv]}</td><td class="n"><b>${L.shots[lv].mean.toFixed(1)}</b></td><td class="n">${L.shots[lv].p10}–${L.shots[lv].p90}</td><td class="n">${L.shots[lv].n.toLocaleString()}</td></tr>`).join("");
  const modeName = { standard: "One shot", salvo: "Salvo", salvoAll: "Salvo, all at once" };
  const duels = L.duels.filter((d) => d.a !== d.b).map((d) => `<tr><td>${nm[d.a]} vs ${nm[d.b]}</td><td>${modeName[d.mode]}</td><td class="n" style="color:${rg(d.aWin)}">${Math.round(d.aWin * 100)}%</td></tr>`).join("");
  const firsts = L.duels.filter((d) => d.a === d.b).map((d) => `<tr><td>${modeName[d.mode]}</td><td class="n">${Math.round(d.firstWin * 100)}%</td></tr>`).join("");
  const styles = L.styles.map((r) => `<tr><td>${esc(r.label)}</td>${AI.LEVELS.slice().reverse().map((lv) => `<td class="n">${r[lv].toFixed(1)}</td>`).join("")}</tr>`).join("");
  const v = L.variants;
  const fleetBox = store.lastFleet && store.lastFleet.ships ? `<div class="gbox"><div class="grid small" id="labGrid"></div></div>` : `<div class="muted" style="font-size:13px">Place a fleet in Play first.</div>`;
  const res = labFleetRes ? AI.LEVELS.slice().reverse().map((lv) => {
    const r = labFleetRes[lv]; return `<div style="margin:6px 0"><div class="row" style="justify-content:space-between;font-size:13px"><span>${nm[lv]}</span><span><b>${r.mean.toFixed(1)}</b> shots · better hidden than <b style="color:${rg(r.pct)}">${Math.round(r.pct * 100)}%</b></span></div><div class="bar2"><i style="width:${Math.round(r.pct * 100)}%;background:${rg(r.pct)}"></i></div></div>`;
  }).join("") : "";
  $("#lab").innerHTML = `<div class="lab">
    <section class="wide"><h2>How strong? ${qBtn("strong")}</h2>
      <table class="ftab"><thead><tr><th>Computer</th><th class="n">Avg shots</th><th class="n">Middle 80%</th><th class="n">Games</th></tr></thead><tbody>${strong}</tbody></table>
      ${histSvg()}<p class="note">Shots needed to sink all five ships of a random fleet. Fewer is stronger. Perfect play still needs 17.</p></section>
    <section><h2>Your fleet ${qBtn("myfleet")}</h2><div class="mini">${fleetBox}<div>${res || ""}${store.lastFleet ? `<button class="btn small" id="labTest" ${labBusy ? "disabled" : ""}>${labBusy ? "Testing…" : labFleetRes ? "Test again" : "Test it"}</button>` : ""}</div></div></section>
    <section><h2>Is the heatmap honest? ${qBtn("calib")}</h2>${calibSvg()}<p class="note">Dots on the dashed line = the chance shown is the real hit rate.</p></section>
    <section><h2>Head to head ${qBtn("duel")}</h2><table class="ftab"><thead><tr><th>Match</th><th>Rules</th><th class="n">Wins</th></tr></thead><tbody>${duels}</tbody></table>
      <h2 style="margin-top:12px">Going first</h2><table class="ftab"><thead><tr><th>Equal computers</th><th class="n">First player wins</th></tr></thead><tbody>${firsts}</tbody></table>
      <p class="note">In Salvo, firing first matters a lot: you sink ships before they can shoot back with them.</p></section>
    <section><h2>Hiding styles ${qBtn("styles")}</h2><table class="ftab"><thead><tr><th>Fleet</th><th class="n">Density</th><th class="n">Hunt</th><th class="n">Random</th></tr></thead><tbody>${styles}</tbody></table>
      <p class="note">Average shots to sink. Edges fool the Density computer a little; side-by-side ships fool Hunt & target.</p></section>
    <section><h2>Where ships hide ${qBtn("prior")}</h2><div class="mini"><div class="gbox"><div class="grid small" id="priorGrid"></div></div><div class="note">Before any shot, a middle square is about ${pct(D.heat(D.blank(E.FLEETS.hasbro)).p[44])} likely to hold a ship, a corner only ${pct(D.heat(D.blank(E.FLEETS.hasbro)).p[0])}.</div></div></section>
    <section><h2>Rule switches</h2><table class="ftab"><thead><tr><th>Rules</th><th class="n">Density</th><th class="n">Hunt</th></tr></thead><tbody>
      <tr><td>Official</td><td class="n">${L.shots.hard.mean.toFixed(1)}</td><td class="n">${L.shots.medium.mean.toFixed(1)}</td></tr>
      <tr><td>Hits not named</td><td class="n">${v.unnamed.hard.mean.toFixed(1)}</td><td class="n">${v.unnamed.medium.mean.toFixed(1)}</td></tr>
      <tr><td>Ships can't touch</td><td class="n">${v.noTouch.hard.mean.toFixed(1)}</td><td class="n">${v.noTouch.medium.mean.toFixed(1)}</td></tr></tbody></table>
      <p class="note">No-touching makes fleets easier for a smart shooter: every sunk ship clears its whole border.</p></section>
  </div><p class="ver">Measured ${esc(L.made)} with tools/lab-data.js.</p>`;
  const pg = buildGrid($("#priorGrid"));
  const ph = D.heat(D.blank(E.FLEETS.hasbro));
  paint(pg, { state: new Array(100).fill(0), heat: ph });
  if (store.lastFleet && store.lastFleet.ships) {
    const lg = buildGrid($("#labGrid")), fl = E.FLEETS[store.lastFleet.edition] || E.FLEETS.hasbro;
    paint(lg, { state: new Array(100).fill(0), ships: store.lastFleet.ships.map((cells, i) => ({ id: fl[i].id, len: fl[i].len, cells })) });
  }
  const bt = $("#labTest");
  if (bt) bt.onclick = testFleet;
}
function testFleet() {
  if (labBusy || !store.lastFleet) return;
  labBusy = true; renderLab();
  const fl = E.FLEETS[store.lastFleet.edition] || E.FLEETS.hasbro, ships = store.lastFleet.ships;
  const res = {}, G = 60; let li = 0, g = 0, tot = 0;
  const step = () => {
    const lv = AI.LEVELS[li], until = performance.now() + 30;
    while (performance.now() < until && g < G) { tot += SIM.shotsToSink(lv, fl, ships, {}, Math.random); g++; }
    if (g >= G) {
      const mean = tot / G, ref = LAB.fleetMeans[lv].means;
      res[lv] = { mean, pct: (ref.filter((x) => x < mean).length + ref.filter((x) => x === mean).length / 2) / ref.length };
      li++; g = 0; tot = 0;
    }
    if (li < AI.LEVELS.length) setTimeout(step, 0);
    else { labFleetRes = res; labBusy = false; if (tab === "lab") renderLab(); }
  };
  step();
}

// ================================================================== SETTINGS
function renderSettings() {
  const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button data-set="${key}" data-v="${v}" class="${String(S[key]) === String(v) ? "on" : ""}">${l}</button>`).join("")}</div>`;
  $("#settings").innerHTML = `<div class="set">
    <h2>Settings</h2>
    <h3>Rules (next game)</h3>
    <div class="setrow"><span class="lbl">Fleet names ${qBtn("edition")}</span>${seg("edition", [["hasbro", "Hasbro 2002+"], ["mb1967", "1967"]])}</div>
    <div class="setrow"><span class="lbl">Salvo</span>${switchHtml("salvo", S.salvo)}</div>
    <div class="setrow"><span class="lbl">Salvo shots ${qBtn("salvoAll")}</span><div class="seg${S.salvo ? "" : " dis"}">${[[false, "One at a time"], [true, "All at once"]].map(([v, l]) => `<button data-set="salvoAll" data-v="${v}" class="${S.salvoAll === v ? "on" : ""}">${l}</button>`).join("")}</div></div>
    <div class="setrow"><span class="lbl">Name the ship hit ${qBtn("named")}</span>${switchHtml("named", S.named)}</div>
    <div class="setrow"><span class="lbl">Ships can't touch ${qBtn("noTouch")}</span>${switchHtml("noTouch", S.noTouch)}</div>
    <div class="setrow"><span class="lbl">Goes first</span>${seg("first", [["random", "Random"], ["0", "You"], ["1", "Other"]])}</div>
    <h3>Computer</h3>
    <div class="setrow"><span class="lbl">Strength ${qBtn("strong")}</span>${seg("level", AI.LEVELS.map((l) => [l, AI.NAMES[l]]))}</div>
    <h3>Help while playing</h3>
    <div class="setrow"><span class="lbl">Heatmap ${qBtn("heat")}</span>${switchHtml("heat", S.heat)}</div>
    <div class="setrow"><span class="lbl">Best-shot ring</span>${switchHtml("best", S.best)}</div>
    <h3>Sound &amp; effects</h3><div id="fxSet"></div>
    <p class="ver">Version ${VERSION}</p></div>`;
  const fx = FX.renderSettings($("#fxSet"));
  if (fx) {
    // the shared block, dressed in this page's own pieces: ? opens our tip, Test is our small button
    const q = $(".q", fx); if (q) q.dataset.q = "fxsound";
    const t = $(".fx-test", fx); if (t) t.classList.add("btn", "small");
  }
}
document.addEventListener("click", (ev) => {
  const t = ev.target.closest("[data-set]"); if (!t) return;
  const k = t.dataset.set;
  if (t.dataset.v != null) {
    let v = t.dataset.v;
    if (k === "salvoAll") v = v === "true";
    if (k === "first") v = v === "random" ? "random" : +v;
    S[k] = v;
  } else S[k] = !S[k];
  save();
  // a fleet not yet committed follows rule changes right away
  if (["edition", "noTouch"].includes(k) && P.placing && !P.room) newPlacing(0);
  if (tab === "settings") renderSettings();
  if (tab === "play") renderPlay();
  if (tab === "paper") renderPaper();
});

// ================================================================== boot
let resizeT = null;
addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(() => { mineZoom(false); if (tab === "play") { resetGrid(big); resetGrid(small); renderPlay(); } if (tab === "paper") { resetGrid(paperGrid); renderPaper(); } }, 150); });
let resumed = false;
try { const v = JSON.parse(localStorage.getItem("online.battleship")); resumed = !!(v && v.code); } catch (e) {}
if (resumed) {
  openOnline().then((room) => room.resume()).then((back) => { if (!back) { P.online = null; startNew("computer"); } }).catch(() => { P.online = null; startNew("computer"); });
} else if (!resumeLocal()) startNew(S.opp === "pass" ? "pass" : "computer");
const start = (location.hash || "").slice(1);
showTab(["paper", "lab", "rules", "settings"].includes(start) ? start : "play", "replace");
// Home-screen app (js/pwa.js, shared _pwa kit): a new build may reload the page by itself only when nothing
// would be lost: not online, no sheet or pass-the-phone cover up, no text field in use, and either the game
// is over or a saved computer / pass-the-phone game waits while you read Rules or Settings (not Lab: its
// simulations would be lost).
// Any other time the kit shows "New version — tap to reload" instead.
if (window.PWA) window.PWA.safeToReload = () => {
  if (P.mode === "online" || P.online) return false;
  if (!$("#sheet").hidden || !$("#cover").hidden || P.cover != null) return false;
  const f = document.activeElement;
  if (f && /^(INPUT|TEXTAREA|SELECT)$/.test(f.tagName)) return false;
  const ph = P.room && P.room.state && P.room.state.phase;
  return ph === "over" || (ph === "fire" && ["rules", "settings"].includes(tab));
};
window.BSApp = { P, S, version: VERSION, shortName, onSnap }; // onSnap + shortName: used by the edge-case browser checks
