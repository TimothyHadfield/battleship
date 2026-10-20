// Sounds + effects: the shot record -> sound names, the Settings switches, and the end-of-game celebration.
// (a) a scripted full game between two computers drives the director; we spy on FX.play / celebrate.
// (b) the real js/fx.js with a fake AudioContext: Sound off = 0 sounds, Animations off = 0 animations.
// (c) game over celebrates 'win' for the winner's seat and 'lose' for the other.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { makeGame } from "../js/game.mjs";
const require = createRequire(import.meta.url);
const E = require("../js/engine.js"), D = require("../js/density.js"), AI = require("../js/ai.js");
const BSFx = require("../js/fxgame.js");
const game = makeGame(E, D, AI);
let pass = 0;
const ok = (m) => { pass++; console.log("  PASS  " + m); };
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const now = (fn) => fn(); // run scheduled steps at once

// One full game, two computers, every snapshot (one per move) fed to a director that sees through `my`'s eyes.
function playGame(seed, opts, my, FX) {
  const rng = mulberry(seed);
  const d = BSFx.director(FX, { grid: () => null, cell: () => null }, now);
  let s = game.setup(2, Object.assign({ levels: ["hard", "medium"] }, opts), rng);
  const myTurn = (pub) => pub.phase === "fire" && pub.turn === my;
  const look = () => { const pub = game.publicView(s); return d.update(pub, my, myTurn(pub)); };
  look(); // first look: quiet
  let guard = 0;
  while (!game.isOver(s) && guard++ < 600) {
    for (const seat of game.toAct(s)) {
      const a = game.bot({ pub: game.publicView(s), mine: game.privateView(s, seat), state: s }, seat, rng);
      s = game.apply(JSON.parse(JSON.stringify(s)), seat, a);
      look();
    }
  }
  return s;
}
function spyFX(settings) {
  const log = [], cel = [], anim = [];
  return {
    log, cel, anim,
    settings: Object.assign({ animSpeed: "normal" }, settings || {}),
    play: (n, o) => { log.push({ n, vol: (o && o.vol) == null ? 1 : o.vol }); return true; },
    celebrate: (o) => { cel.push(o.kind); return Promise.resolve(); },
    shake: (el) => { anim.push("shake"); return Promise.resolve(); },
    flash: (el) => { anim.push("flash"); return Promise.resolve(); },
    pop: (el) => { anim.push("pop"); return Promise.resolve(); },
  };
}

// ---------------- (a) event -> sound map over a whole game
for (const [seed, opts] of [[3, {}], [11, { salvo: true }], [17, { salvo: true, salvoAll: true }]]) {
  const FX = spyFX();
  const s = playGame(seed, opts, 0, FX);
  const names = FX.log.map((x) => x.n);
  const count = (n) => names.filter((x) => x === n).length;
  const pub = game.publicView(s);
  const myShots = pub.shots[1], theirShots = pub.shots[0];
  const all = myShots.length + theirShots.length;
  assert.equal(count("whoosh"), all, "one fire whoosh per shot");
  assert.equal(count("splash"), myShots.filter((x) => !x.h).length + theirShots.filter((x) => !x.h).length, "one splash per miss");
  assert.equal(count("explosion"), myShots.filter((x) => x.h).length, "my hits explode");
  assert.equal(count("hit"), theirShots.filter((x) => x.h).length, "hits on my fleet thud");
  assert.equal(count("sink"), pub.sunk[0].length + pub.sunk[1].length, "one sink per sunk ship");
  assert.equal(FX.cel.filter((k) => k === "big").length, pub.sunk[1].length, "a big moment for each ship I sink");
  // the computer's sounds are never louder than mine
  assert.ok(FX.log.every((x) => x.vol <= 1), "nothing louder than normal");
  const theirWhoosh = FX.log.filter((x) => x.n === "whoosh" && x.vol < 0.7).length;
  assert.equal(theirWhoosh, theirShots.length, "their shots are quieter");
  // your-turn chime: only when the turn comes to me, not on every shot
  const turns = count("turn");
  assert.ok(turns >= 1 && turns <= theirShots.length + 1, "turn chime count " + turns);
  assert.equal(FX.anim.filter((a) => a === "shake").length, myShots.filter((x) => x.h).length + theirShots.filter((x) => x.h).length, "every hit shakes the grid that was hit");
  ok(`game ${seed} ${JSON.stringify(opts)}: ${all} shots -> ${count("whoosh")} whoosh, ${count("splash")} splash, ${count("explosion")} explosion, ${count("hit")} hit, ${count("sink")} sink, ${turns} turn chimes`);
}

// first look after a resume / join stays quiet (no replay of 40 old shots)
{
  const FX = spyFX();
  const rng = mulberry(5);
  let s = game.setup(2, { levels: ["hard", "hard"] }, rng);
  for (let i = 0; i < 60; i++) for (const seat of game.toAct(s)) s = game.apply(s, seat, game.bot({ pub: game.publicView(s), state: s }, seat, rng));
  const d = BSFx.director(FX, { grid: () => null, cell: () => null }, now);
  d.update(game.publicView(s), 0, false);
  assert.equal(FX.log.length + FX.cel.length, 0);
  ok("a resumed game makes no sound for shots already fired");
}

// ---------------- (c) game over celebrates the right kind
for (const seed of [3, 4, 5, 6]) {
  for (const my of [0, 1]) {
    const FX = spyFX();
    const s = playGame(seed, {}, my, FX);
    const ends = FX.cel.filter((k) => k !== "big");
    assert.deepEqual(ends, [s.winner === my ? "win" : "lose"], `seed ${seed} seat ${my}`);
  }
}
ok("game over: winner's seat gets 'win', the other 'lose' (8 games)");

// ---------------- (b) the real fx.js: switches gate everything
let nodes = 0, animCalls = 0;
class FakeParam { setValueAtTime() {} linearRampToValueAtTime() {} exponentialRampToValueAtTime() {} setTargetAtTime() {} }
const node = () => ({ connect() {}, start() {}, stop() {}, gain: new FakeParam(), frequency: new FakeParam(), Q: new FakeParam(), pan: new FakeParam() });
// currentTime moves on 0.1 s per read, so fx.js's throttle (3 copies within 80 ms) never trips in this test
globalThis.AudioContext = class { get currentTime() { return (this._t = (this._t || 0) + 0.1); } constructor() { this.state = "running"; this.sampleRate = 8000; this.destination = {}; }
  createGain() { nodes++; return node(); } createOscillator() { nodes++; return node(); } createBiquadFilter() { nodes++; return node(); }
  createBufferSource() { nodes++; return node(); } createDynamicsCompressor() { return node(); } createStereoPanner() { return node(); }
  createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; } resume() { return Promise.resolve(); } };
const fakeEl = () => ({ style: { cssText: "" }, animate() { animCalls++; return {}; }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 40, height: 40 }), remove() {}, cloneNode() { return fakeEl(); }, setAttribute() {}, removeAttribute() {}, getContext: () => null });
globalThis.document = { addEventListener() {}, createElement: fakeEl, body: { appendChild() {} }, getElementById: () => null };
globalThis.getComputedStyle = () => ({ borderRadius: "0" });
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 0);
await import("../js/fx.js");
const FX = globalThis.FX;
FX.init({ game: "battleship-test", clicks: false });
FX.unlock();
const ui = { grid: () => fakeEl(), cell: () => fakeEl() };
function realGame(seed) { // a game through the real library, counting plays and animations
  const p0 = FX.stats.plays; animCalls = 0;
  const rng = mulberry(seed);
  const d = BSFx.director(FX, ui, now);
  let s = game.setup(2, { levels: ["hard", "hard"] }, rng);
  d.update(game.publicView(s), 0, false);
  while (!game.isOver(s)) for (const seat of game.toAct(s)) { s = game.apply(s, seat, game.bot({ pub: game.publicView(s), state: s }, seat, rng)); const pub = game.publicView(s); d.update(pub, 0, pub.phase === "fire" && pub.turn === 0); }
  return { plays: FX.stats.plays - p0, anims: animCalls };
}
const on = realGame(21);
assert.ok(on.plays > 50 && on.anims > 10, "with everything on, sounds and animations run: " + JSON.stringify(on));
FX.set("sound", false);
const offSound = realGame(21);
assert.equal(offSound.plays, 0, "Sound off: no sound at all");
assert.ok(offSound.anims > 10, "Sound off still animates");
FX.set("sound", true); FX.set("animations", false);
const offAnim = realGame(21);
assert.equal(offAnim.anims, 0, "Animations off: no animation runs");
assert.ok(offAnim.plays > 50, "Animations off still plays sounds");
FX.set("animations", true); FX.set("moves", false);
const offMoves = realGame(21);
assert.ok(offMoves.plays < on.plays && offMoves.plays > 0, "Game sounds off leaves only alerts/celebrations: " + offMoves.plays);
FX.set("moves", true); FX.set("celebrations", false);
const p0 = FX.stats.plays; await FX.celebrate({ kind: "win" });
assert.equal(FX.stats.plays - p0, 0, "Celebrations off: no fanfare");
ok(`real fx.js: on ${on.plays} sounds/${on.anims} anims; Sound off 0 sounds; Animations off 0 anims; Game sounds off ${offMoves.plays} (alerts only)`);

console.log(`fx: ${pass} passed`);
process.exit(0);
