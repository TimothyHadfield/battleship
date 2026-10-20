/* Battleship sounds and effects. The director compares each new public view with the last one it saw
   and turns the new shots into sounds + short animations, so the computer, pass-the-phone and online
   games all sound the same (online: every player hears the other's shots from the shared record).
   Uses the shared FX library (js/fx.js, copied unchanged). UMD: node tests + window.BSFx. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.BSFx = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const IMPACT = 300;   // ms after the fire whoosh: the peg's drop (pegIn .45s) lands about here
  const STAGGER = 170;  // a salvo called all at once lands one shot after another
  const SINK_AFTER = 380;
  const WIN_COLORS = ["#6ea8fe", "#4cc38a", "#f0b354", "#e8eaf0", "#ef6461"];
  const BLAST = ["#ffd678", "#f0b354", "#ef6461", "#ffffff"];
  const BAD = "rgba(239,100,97,.85)";

  // ui: { grid(board) -> element of the grid showing that board, cell(board, c) -> its cell }
  // later(fn, ms): scheduler (tests pass one that runs at once)
  function director(FX, ui, later) {
    later = later || ((fn, ms) => setTimeout(fn, ms));
    let seen = null;
    const speed = () => (FX.settings && FX.settings.animSpeed === "fast" ? 0.55 : 1);

    function shot(e, t0) {
      const k = speed(), hitAt = t0 + IMPACT * k;
      later(() => FX.play("whoosh", { vol: e.mine ? 0.7 : 0.5 }), t0);
      later(() => {
        if (!e.h) { FX.play("splash", { vol: e.mine ? 1 : 0.7 }); return; }
        const grid = ui.grid(e.board);
        if (e.mine) FX.play("explosion");
        else { FX.play("hit", { vol: 0.8 }); FX.flash(ui.cell(e.board, e.c), BAD); }
        FX.shake(grid);
      }, hitAt);
      if (e.k) later(() => {
        FX.play("sink", { vol: e.mine ? 1 : 0.8 });
        if (e.mine) FX.celebrate({ kind: "big", at: ui.cell(e.board, e.c), colors: BLAST });
        else FX.flash(ui.grid(e.board), BAD);
      }, hitAt + SINK_AFTER * k);
      return hitAt + (e.k ? SINK_AFTER * k : 0);
    }

    // pub: public view; my: the seat we see for; myTurn: it is our turn to fire right now
    function update(pub, my, myTurn) {
      if (!pub || !pub.shots) return [];
      const cur = { n: [pub.shots[0].length, pub.shots[1].length], phase: pub.phase, myTurn: !!myTurn };
      const prev = seen; seen = cur;
      // first look (new game, reload, joining online): stay quiet, don't replay old shots
      if (!prev || cur.n[0] < prev.n[0] || cur.n[1] < prev.n[1]) return [];
      const ev = [];
      for (const board of [1 - my, my]) {
        for (let i = prev.n[board]; i < cur.n[board]; i++) {
          const x = pub.shots[board][i];
          ev.push({ type: "shot", mine: board !== my, board, c: x.c, h: !!x.h, k: x.k || null });
        }
      }
      let t = 0, end = 0;
      ev.forEach((e) => { end = Math.max(end, shot(e, t)); t += STAGGER * speed(); });
      if (prev.phase !== "over" && cur.phase === "over") {
        const win = pub.winner === my;
        ev.push({ type: "over", win });
        later(() => FX.celebrate({ kind: win ? "win" : "lose", colors: WIN_COLORS }), 900); // with the result sheet
      } else if (!prev.myTurn && cur.myTurn && cur.phase === "fire") {
        ev.push({ type: "turn" });
        later(() => FX.play("turn"), end ? end + 450 : 0);
      }
      return ev;
    }
    return { update, reset() { seen = null; } };
  }

  // Paper tab (a real game at the table): the answer you entered
  function paper(FX, kind, cellEl, gridEl, allSunk) {
    if (kind === "miss") return FX.play("splash");
    FX.play("explosion"); FX.shake(gridEl);
    if (kind === "sank") setTimeout(() => {
      FX.play("sink");
      FX.celebrate({ kind: allSunk ? "win" : "big", at: cellEl, colors: allSunk ? WIN_COLORS : BLAST });
    }, SINK_AFTER);
  }

  return { director, paper, WIN_COLORS };
});
