/* Battleship's guided first game (shared coach kit: js/coach.js) and the computer captains.
 * Plain ES module, no browser globals: node tests import it. All art is original SVG. */

/** The three computers as captains: a face and one line each. The level names (Random / Hunt & target /
 *  Density) stay as they were; the captain is who sits behind that board.
 *  Lines: hello (start), sank (they sink one of yours), ouch (you sink one of theirs), win / lose (game over). */
export const CAPTAINS = {
  easy: { name: "Ensign Pip", cap: "#8d93a8", band: "#5d6378", skin: "#f1c9a0", hello: "I'll just call out whatever square I think of!", sank: "Oh! Did I sink something? Neat!", ouch: "Hey, that was my favourite boat!", win: "Wait... I won? Lucky shots count too!", lose: "Good game! I really had no plan at all." },
  medium: { name: "Lt. Hale", cap: "#f0b354", band: "#b07a1e", skin: "#d9a273", hello: "Once I find a ship, I won't let go of it.", sank: "Got a scent, followed it, sank it.", ouch: "Lucky shot. It won't happen twice.", win: "Found you, then finished you. Standard drill.", lose: "You hid that fleet well. Again?" },
  hard: { name: "Admiral Vane", cap: "#6ea8fe", band: "#2f5fae", skin: "#c98f62", hello: "I play the odds on every single shot.", sank: "Exactly where the numbers said it would be.", ouch: "A loss I had priced in. Carry on.", win: "The numbers never lie, sailor.", lose: "Beat the odds? Impressive. Very impressive." },
};

/** A captain's face: round head, peaked cap in the level's colour. Original drawing. */
export function captainSVG(level, size = 28) {
  const c = CAPTAINS[level] || CAPTAINS.hard;
  const stern = level === "hard", eyes = level === "easy" ? 2.4 : 1.9;
  return `<svg class="capface" viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true">
<circle cx="20" cy="20" r="19" fill="#1a1e2b" stroke="${c.band}" stroke-width="1.5"/>
<ellipse cx="20" cy="24" rx="10.5" ry="11" fill="${c.skin}"/>
<path d="M8 17 Q20 5 32 17 Z" fill="${c.cap}"/><rect x="7" y="16" width="26" height="4" rx="2" fill="${c.band}"/>
<path d="M18 11.5 l2 -2 l2 2 l-2 2 z" fill="#fff" opacity=".9"/>
<circle cx="16" cy="24" r="${eyes}" fill="#1a1e2b"/><circle cx="24" cy="24" r="${eyes}" fill="#1a1e2b"/>
${stern ? `<path d="M13 21 l5 1.4 M27 21 l-5 1.4" stroke="#1a1e2b" stroke-width="1.4" stroke-linecap="round"/><path d="M15.5 30.5 h9" stroke="#1a1e2b" stroke-width="1.6" stroke-linecap="round"/>` : `<path d="M15 29.5 Q20 ${level === "easy" ? 34 : 32} 25 29.5" fill="none" stroke="#1a1e2b" stroke-width="1.6" stroke-linecap="round"/>`}
${level === "medium" ? `<path d="M12 31 Q20 38 28 31 Q26 35.5 20 36 Q14 35.5 12 31 Z" fill="#8a5a33" opacity=".85"/>` : ""}
</svg>`;
}

/** The guided game's computer fleet (Random captain): fixed so the lesson is the same every time. */
export function guidedFleet() {
  // carrier B2-B6, battleship E9-H9, destroyer J3-J5, submarine F3-H3, patrol boat E4-F4
  return [[11, 12, 13, 14, 15], [48, 58, 68, 78], [92, 93, 94], [52, 62, 72], [43, 53]];
}

/** Coach steps. g: { phase(), myShots(), myHits(), sunkByMe() } read from the live game. */
export function tourSteps(g) {
  return [
    { title: "Hide your fleet", text: "This is your ocean. Drag a ship to move it, tap it to turn it, or tap Random. The computer can't see where they are.", target: "#bigWrap", next: true },
    { title: "Ready", text: "Happy with your fleet? Tap Ready to lock it in.", target: '[data-act="ready"]', until: () => g.phase() !== "place" },
    { title: "Fire!", text: "Now the big board is the enemy's. Tap a square to aim, then tap it again (or Fire) to shoot.", target: "#bigWrap", until: () => g.myShots() >= 1 },
    { title: "Pegs", text: "A white peg is a miss, a red one a hit. The computer answers with a shot at your fleet.", target: "#bigWrap", next: true },
    { title: "Your fleet", text: "Their shots land on your fleet down here. Tap it to see it big, tap again to put it back.", target: "#mineBox", next: true },
    { title: "Keep firing", text: "Keep shooting until you hit something. Spread your shots out: every ship is at least 2 squares long.", target: "#bigWrap", until: () => g.myHits() >= 1 },
    { title: "A hit!", text: "Now try the squares right next to it (up, down, left, right) to find which way the ship runs.", target: "#bigWrap", until: () => g.sunkByMe() >= 1 },
    { title: "Sunk!", text: "This tally shows the ships still afloat. Sink all five before they sink yours. The Heatmap switch shows where ships are most likely (games with it on count \"with help\").", target: "#pbar", next: true },
  ];
}
