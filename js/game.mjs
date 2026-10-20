/* Battleship as an online.js game (see Board and Card Games/_online/README.md).
   makeGame(E, D, AI) so the same file runs in the browser (window.BS*) and in node tests.
   Ship positions live only in privateView; publicView is the shot record everyone may see. */
export function makeGame(E, D, AI) {
  const game = {
    id: "battleship",
    minSeats: 2, maxSeats: 2,
    setup(n, options = {}, rng = Math.random) {
      if (options.resume) return JSON.parse(JSON.stringify(options.resume)); // a saved local game, picked up after a reload
      const st = E.newGame(options, rng);
      const lv = options.levels || [];
      st.levels = [0, 1].map((i) => (AI.LEVELS.includes(lv[i]) ? lv[i] : "hard"));
      return st;
    },
    toAct(s) { return E.toAct(s); },
    apply(s, seat, action) { return E.apply(s, seat, action); },
    publicView(s) { const v = E.publicView(s); v.levels = s.levels; return v; },
    privateView(s, seat) { return E.privateView(s, seat); },
    bot(ctx, seat, rng = Math.random) {
      const pub = ctx.pub;
      if (pub.phase === "place") return E.placeMove(AI.randomFleet(pub.fleet, pub.opts.noTouch, rng));
      const K = D.knowledge(pub, 1 - seat);
      const level = (pub.levels && pub.levels[seat]) || "hard";
      return { t: "fire", cells: AI.choose(level, K, pub.need || 1, rng) };
    },
    isOver(s) { return s.phase === "over"; },
  };
  return game;
}
