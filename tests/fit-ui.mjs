// Fit pass (2026-11-27): in a crowded late game (55 shots each side, 4 ships sunk each side), everything on the
// Play tab fits and reads at phone, sideways and laptop sizes, in Safari's engine (WebKit, Playwright).
// Checks: no page scroll; both grids fully on screen; target squares big enough to tap; grid labels readable;
// every ship name in the fleet tally shown whole (no "P…"); laptop heat numbers >= 12 px; no console errors.
// Run: npm run test:fit   (needs Playwright: ~/.claude/tools/node_modules, or BS_PW=<path to playwright index.mjs>)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const E = require(ROOT + "/js/engine.js"), D = require(ROOT + "/js/density.js"), AI = require(ROOT + "/js/ai.js");
const { makeGame } = await import(pathToFileURL(ROOT + "/js/game.mjs").href);

const pwPath = process.env.BS_PW || path.join(os.homedir(), ".claude/tools/node_modules/playwright/index.mjs");
if (!fs.existsSync(pwPath)) { console.log("fit: SKIPPED (Playwright not found at " + pwPath + ")"); process.exit(0); }
const pw = (await import(pathToFileURL(pwPath).href)).default;

// a real late game: two Hunt & target computers fire until each side is down to its last ship or so
function crowded(size = 10) {
  const game = makeGame(E, D, AI);
  let a = 7; const rng = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let st = game.setup(2, { levels: ["medium", "medium"], first: 0, size }, rng);
  for (const seat of [0, 1]) st = game.apply(st, seat, game.bot({ pub: game.publicView(st), state: st }, seat, rng));
  for (let g = 0; st.phase === "fire" && g < 1000; g++) {
    const left = [0, 1].map((b) => st.fleet.length - st.sunk[b].length);
    if (left[0] <= 1 && left[1] <= 1 && st.turn === 0) break;
    const seat = st.turn, target = 1 - seat;
    let mv = game.bot({ pub: game.publicView(st), state: st }, seat, rng);
    if (left[target] <= 1) { // keep the last ship afloat: a miss somewhere
      const used = new Set(st.shots[target].map((s) => s.c)), ship = new Set(st.ships[target].flat());
      const free = []; for (let c = 0; c < size * size; c++) if (!used.has(c) && !ship.has(c)) free.push(c);
      if (free.length < 8) break;
      mv = { t: "fire", cells: [free[Math.floor(rng() * free.length)]] };
    }
    st = game.apply(st, seat, mv);
  }
  st.turn = 0;
  if (st.phase !== "fire" || st.shots[1].length < 40) throw new Error("crowded game not built");
  return JSON.stringify({ local: { mode: "computer", state: st, study: [], seen: [st.shots[0].length, st.shots[1].length], view: 0, id: 1, helped: false, guided: false, daily: "", level: "hard" },
    settings: { heat: true, heatRated: 1, size } });
}

const T = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json" };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "content-type": T[path.extname(p)] || "application/octet-stream", "cache-control": "no-store" }); r.end(d); });
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const URL0 = process.env.BS_URL || `http://127.0.0.1:${server.address().port}/`;

// [name, width, height, phone, min target square, min label px (target, fleet)]
const SIZES = [
  ["393x659", 393, 659, true, 30, 10, 8],
  ["320x568", 320, 568, true, 24, 10, 8],
  ["659x393 sideways", 659, 393, true, 28, 10, 8],
  ["1280x800", 1280, 800, false, 50, 12, 10],
  ["1440x900", 1440, 900, false, 50, 12, 10],
];
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const store = crowded();
const browser = await pw.webkit.launch({ headless: true });
let fails = 0, passes = 0;
const check = (ok, msg) => { if (ok) passes++; else { fails++; console.log("  FAIL  " + msg); } };
try {
  for (const [name, w, h, phone, minCell, minLbl, minSmallLbl] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: phone, hasTouch: phone, userAgent: phone ? UA : undefined });
    await ctx.addInitScript((s) => { try { localStorage.setItem("coach-offer:bs-first", "true"); localStorage.setItem("battleship:v1", s); } catch (e) {} }, store);
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    await page.goto(URL0 + "#play", { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelectorAll("#bigGrid .peg").length > 40, null, { timeout: 15000 });
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => {
      const vw = innerWidth, vh = innerHeight, r = (el) => el.getBoundingClientRect(), fs = (el) => parseFloat(getComputedStyle(el).fontSize);
      const on = (b) => b.width > 0 && b.top >= -1 && b.left >= -1 && b.bottom <= vh + 1 && b.right <= vw + 1;
      const shown = (e) => e && getComputedStyle(e).display !== "none" && r(e).width > 0;
      const big = [...document.querySelectorAll("#bigGrid .cell")].map(r), small = [...document.querySelectorAll("#smallGrid .cell")].map(r);
      const names = [...document.querySelectorAll("#pbar .fchip .nm")].filter(shown);
      const tally = [...document.querySelectorAll("#pbar .fchip, #pbar > span:last-child")].map(r);
      const fire = document.querySelector('[data-act="fire"]');
      return {
        scrollW: document.documentElement.scrollWidth - vw, scrollH: document.documentElement.scrollHeight - vh,
        bigCell: Math.min(...big.map((b) => Math.min(b.width, b.height))), bigOn: big.every(on), smallOn: small.length > 0 && small.every(on),
        bigLbl: Math.min(...[...document.querySelectorAll("#bigGrid .cols span, #bigGrid .rows span")].map(fs)),
        smallLbl: Math.min(...[...document.querySelectorAll("#smallGrid .cols span, #smallGrid .rows span")].map(fs)),
        cut: names.filter((n) => n.scrollWidth > n.clientWidth + 0.5 || r(n).right > r(n.closest(".fchip")).right + 0.5).map((n) => n.textContent),
        nameN: names.length, nameMin: names.length ? Math.min(...names.map(fs)) : 0,
        tallyOn: tally.every(on) && tally.every((b) => b.right <= r(document.querySelector("#pbar")).right + 0.5),
        overlap: tally.some((a, i) => tally.some((b, j) => j > i && a.right > b.left + 0.5 && b.right > a.left + 0.5 && a.bottom > b.top && b.bottom > a.top)),
        pct: [...document.querySelectorAll("#bigGrid .pct")].map(fs), fireOn: !!fire && on(r(fire)),
      };
    });
    console.log(`  ${name}: target ${m.bigCell.toFixed(1)}px, labels ${m.bigLbl}/${m.smallLbl}px, names ${m.nameN} at ${m.nameMin}px cut [${m.cut}], heat ${m.pct.length ? Math.min(...m.pct).toFixed(1) : "-"}px`);
    check(m.scrollW <= 0 && m.scrollH <= 0, `${name}: page scrolls (${m.scrollW} x ${m.scrollH})`);
    check(m.bigOn && m.smallOn && m.fireOn, `${name}: target grid / fleet grid / Fire not all on screen`);
    check(m.bigCell >= minCell, `${name}: target squares ${m.bigCell.toFixed(1)} px < ${minCell}`);
    check(m.bigLbl >= minLbl && m.smallLbl >= minSmallLbl, `${name}: grid labels ${m.bigLbl}/${m.smallLbl} px < ${minLbl}/${minSmallLbl}`);
    check(m.nameN === 5 && m.cut.length === 0 && m.nameMin >= 10, `${name}: fleet tally names cut or small: ${m.nameN} shown, cut [${m.cut}], ${m.nameMin}px`);
    check(m.tallyOn && !m.overlap, `${name}: fleet tally off the lid or chips overlap`);
    if (!phone) check(m.pct.length > 0 && Math.min(...m.pct) >= 12, `${name}: heat numbers ${m.pct.length ? Math.min(...m.pct) : "none"} px < 12`);
    check(errs.length === 0, `${name}: console errors ${errs.join(" | ")}`);
    await ctx.close();
  }
} finally { await browser.close(); server.close(); }
console.log(fails ? `fit: ${fails} FAILED, ${passes} passed` : `fit: all ${passes} checks passed`);
process.exit(fails ? 1 : 0);
