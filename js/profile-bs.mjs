/* Battleship's part of the player profile (shared kit: js/profile.js, never edit that one here).
 * Level ratings, the achievement list, the Daily fleet and turning a finished game into a result.
 * Plain ES module with no browser globals, so node tests import it directly. */

/* Elo of each computer level from measured head-to-head games (tools/lab-data.js + 3,000-game runs, 2026-10-27):
 * Density beats Hunt & target 85% (+301), Hunt & target beats Random 98.5% (+727). Random anchored at 700,
 * rounded to 50. */
export const BS_LEVELS = [
  { id: "easy", name: "Random", rating: 700 },
  { id: "medium", name: "Hunt & target", rating: 1450 },
  { id: "hard", name: "Density", rating: 1750 },
];
const RANK = { easy: 0, medium: 1, hard: 2 };
const beat = (id) => (c) => !!(c.last && c.last.won && c.last.level && RANK[c.last.level] >= RANK[id]);
const lastX = (c) => (c.last && c.last.won && c.last.extra) || null;

export const BS_ACHIEVEMENTS = [
  { id: "first", title: "First win", desc: "Win a game", test: (c) => c.stats.wins >= 1 },
  { id: "hunter", title: "Out-hunted", desc: "Beat Hunt & target", test: beat("medium") },
  { id: "density", title: "Beat the odds", desc: "Beat Density", test: beat("hard") },
  { id: "sharp", title: "Sharpshooter", desc: "Win in 40 shots or fewer", test: (c) => { const x = lastX(c); return !!(x && !x.salvo && x.shots <= 40); } },
  { id: "untouched", title: "Untouched", desc: "Win without losing a ship", test: (c) => { const x = lastX(c); return !!(x && x.lost === 0); } },
  { id: "salvo", title: "Full broadside", desc: "Win a Salvo game", test: (c) => { const x = lastX(c); return !!(x && x.salvo); } },
  { id: "streak", title: "Hat trick", desc: "Win 3 in a row", test: (c) => c.stats.bestStreak >= 3 },
  { id: "daily", title: "Daily habit", desc: "3-day Daily streak", test: (c) => c.daily.streak >= 3 },
];

/** Today's computer fleet for the Daily game: the same for every player that day (rng = Profile.daily.rng(day)). */
export function dailyFleet(AI, fleet, rng) {
  return AI.randomFleet(fleet, false, rng);
}

/** What a finished (or abandoned) game looks like to the record. */
function extraOf(pub, you) {
  const mine = pub.shots[1 - you] || [];
  return { shots: mine.length, hits: mine.filter((x) => x.h).length, lost: (pub.sunk[you] || []).length, salvo: !!(pub.opts && pub.opts.salvo) };
}

/** A finished game -> Profile.recordResult input. you = your seat (-1: two players on one phone).
 *  helped: the heatmap was on, Best or Undo was used -> counted under "with help", not rated. */
export function profileResult({ mode, level, pub, you, daily = false, helped = false }) {
  const extra = extraOf(pub, Math.max(0, you));
  if (mode === "pass" || you < 0) return { mode: "pass", won: null, extra };
  const m = mode === "computer" && helped && !daily ? "help" : mode;
  const won = pub.winner === you;
  return { mode: m, level: m === "computer" ? level : null, won, draw: false, daily: !!daily, score: won ? extra.shots : null, extra };
}

/** Leaving an unfinished game vs the computer after your first shot counts as a loss.
 *  Before your first shot, a guided game, pass-the-phone or online: null (nothing recorded).
 *  The Daily has its own rule (always a loss once started), handled by the caller. */
export function quitResult({ mode, level, pub, you = 0, helped = false, guided = false, daily = false }) {
  if (mode !== "computer" || guided || daily || !pub || pub.phase !== "fire") return null;
  if (!(pub.shots[1 - you] || []).length) return null;
  const m = helped ? "help" : "computer";
  return { mode: m, level: m === "computer" ? level : null, won: false, draw: false, quit: true, extra: extraOf(pub, you) };
}
