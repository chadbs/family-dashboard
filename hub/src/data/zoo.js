/* ============================================================
   Zoo — the characters for the Bible tab's games.

   Animals for the ark, a shepherd for the maze, Noah's ark seen side-on
   with its door and gangplank, and a pointing hand for hints. Drawn in
   the same picture-book style as data/pictures.js: flat warm colour, a
   soft brown outline, rosy cheeks. Every animal faces right on a 100 x
   100 square, standing with its feet near the bottom, so the games can
   flip and stand them all the same way.
   ============================================================ */

function zooEye(x, y, r) {
  const s = r || 2.3;
  return '<circle cx="' + x + '" cy="' + y + '" r="' + s + '" fill="' + PIC_INK + '"/>' +
    '<circle cx="' + (x + s * 0.35) + '" cy="' + (y - s * 0.38) + '" r="' + (s * 0.36) + '" fill="#fff"/>';
}
function zooBlush(x, y, r) {
  return '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 3) + '" fill="#f19a8c" opacity=".55"/>';
}
function zooLeg(x, y, w, h, fill) {
  return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + w / 2 + '" fill="' + fill + '" stroke="' + PIC_INK + '" stroke-width="2.2"/>';
}
function zooRingPath(cx, cy, rx, ry, n, inner) {
  return picPath(picRing(cx, cy, rx, ry, n, inner), true);
}

const ZOO = {
  lion: {
    name: "lion", plural: "lions", faces: 1,
    svg:
      '<path d="M24 60 Q12 56 12 44" stroke="#d98a3d" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="12" cy="42" r="5" fill="#a85f25" stroke="' + PIC_INK + '" stroke-width="2"/>' +
      zooLeg(28, 70, 9, 23, "#e3a04f") + zooLeg(40, 70, 9, 23, "#e3a04f") +
      '<ellipse cx="48" cy="64" rx="28" ry="17" fill="#f0b45c" stroke="' + PIC_INK + '" stroke-width="2.4"/>' +
      zooLeg(56, 70, 9, 23, "#f0b45c") + zooLeg(68, 70, 9, 23, "#f0b45c") +
      '<path d="' + zooRingPath(72, 40, 23, 23, 16, 0.84) + '" fill="#c9772f" stroke="' + PIC_INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<circle cx="63" cy="28" r="5" fill="#f6c56a" stroke="' + PIC_INK + '" stroke-width="2"/>' +
      '<circle cx="82" cy="28" r="5" fill="#f6c56a" stroke="' + PIC_INK + '" stroke-width="2"/>' +
      '<circle cx="73" cy="42" r="14.5" fill="#f6c56a" stroke="' + PIC_INK + '" stroke-width="2.4"/>' +
      zooEye(67.5, 39.5) + zooEye(79, 39.5) +
      '<ellipse cx="74" cy="48.5" rx="6.4" ry="4.6" fill="#fbe3b0"/>' +
      '<path d="M71.4 45.6 L76.6 45.6 L74 48.4 Z" fill="#7a4a2a" stroke="#7a4a2a" stroke-width="1" stroke-linejoin="round"/>' +
      '<path d="M74 48.4 L74 50.4 M74 50.4 Q71.6 52.6 69.8 50.6 M74 50.4 Q76.4 52.6 78.2 50.6" stroke="' + PIC_INK + '" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
      zooBlush(64.5, 47) + zooBlush(83.5, 47),
  },

  giraffe: {
    name: "giraffe", plural: "giraffes", faces: 1,
    svg:
      '<path d="M30 56 Q24 62 24 70" stroke="#e0a83e" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="24" cy="71" r="2.6" fill="#7a4a2a"/>' +
      zooLeg(31, 60, 7, 34, "#ecb94c") + zooLeg(41, 60, 7, 34, "#ecb94c") +
      '<ellipse cx="48" cy="58" rx="21" ry="12" fill="#f6c75a" stroke="' + PIC_INK + '" stroke-width="2.4"/>' +
      zooLeg(53, 60, 7, 34, "#f6c75a") + zooLeg(62, 60, 7, 34, "#f6c75a") +
      '<path d="M56 52 L69 16 L79 19 L68 56 Z" fill="#f6c75a" stroke="' + PIC_INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M58 51 L66 54" stroke="#f6c75a" stroke-width="4"/>' +
      '<g fill="#c98a3a"><circle cx="40" cy="55" r="4.2"/><circle cx="52" cy="61" r="3.6"/><circle cx="57" cy="53" r="3"/><circle cx="33" cy="61" r="2.8"/>' +
      '<circle cx="70" cy="30" r="2.8"/><circle cx="66" cy="42" r="3"/><circle cx="73" cy="22" r="2.2"/></g>' +
      '<path d="M74 9 L72.6 3 M80 8.6 L81 2.6" stroke="' + PIC_INK + '" stroke-width="2.2" stroke-linecap="round"/>' +
      '<circle cx="72.4" cy="2.8" r="2.4" fill="#a85f25"/><circle cx="81.2" cy="2.4" r="2.4" fill="#a85f25"/>' +
      '<ellipse cx="69" cy="12" rx="4" ry="2.2" transform="rotate(-25 69 12)" fill="#f6c75a" stroke="' + PIC_INK + '" stroke-width="1.6"/>' +
      '<ellipse cx="80" cy="14" rx="9.5" ry="7" transform="rotate(12 80 14)" fill="#f6c75a" stroke="' + PIC_INK + '" stroke-width="2.4"/>' +
      '<ellipse cx="87.4" cy="17.4" rx="5" ry="4" fill="#fbe3b0" stroke="' + PIC_INK + '" stroke-width="1.6"/>' +
      '<circle cx="88.6" cy="16.6" r=".9" fill="' + PIC_INK + '"/>' +
      zooEye(79, 12, 2) + zooBlush(83, 18, 2.2),
  },

  elephant: {
    name: "elephant", plural: "elephants", faces: 1,
    svg:
      '<path d="M21 56 Q15 60 16 68" stroke="#8d9aa8" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      zooLeg(26, 66, 12, 27, "#97a4b2") + zooLeg(40, 66, 12, 27, "#97a4b2") +
      '<ellipse cx="48" cy="57" rx="30" ry="21" fill="#aab6c2" stroke="' + PIC_INK + '" stroke-width="2.4"/>' +
      zooLeg(56, 66, 12, 27, "#aab6c2") + zooLeg(68, 66, 12, 27, "#aab6c2") +
      '<path d="M28 92 q2 -2 4 0 M42 92 q2 -2 4 0 M58 92 q2 -2 4 0 M70 92 q2 -2 4 0" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M86 52 Q94 62 92 74 Q91 81 85 79" stroke="' + PIC_INK + '" stroke-width="11.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M86 52 Q94 62 92 74 Q91 81 85 79" stroke="#aab6c2" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<path d="M89.6 66 l3 -.4 M90.4 71 l3 .2" stroke="#8d9aa8" stroke-width="1.2" stroke-linecap="round"/>' +
      '<circle cx="78" cy="44" r="16" fill="#aab6c2" stroke="' + PIC_INK + '" stroke-width="2.4"/>' +
      '<ellipse cx="67" cy="46" rx="11" ry="14.5" fill="#c4ced8" stroke="' + PIC_INK + '" stroke-width="2.4"/>' +
      '<ellipse cx="67" cy="46" rx="6.5" ry="9.5" fill="#f0c2c6" opacity=".6"/>' +
      '<path d="M84 58 Q87 63 92 62" stroke="#fffaf0" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      zooEye(82, 40, 2.2) + zooBlush(84.5, 47, 2.6),
  },

  sheep: {
    name: "sheep", plural: "sheep", faces: -1,
    svg:
      '<g fill="#4a3b35"><rect x="36" y="60" width="4.4" height="30" rx="2.2"/><rect x="45" y="61" width="4.4" height="30" rx="2.2"/>' +
      '<rect x="60" y="61" width="4.4" height="30" rx="2.2"/><rect x="69" y="60" width="4.4" height="30" rx="2.2"/></g>' +
      '<path d="' + zooRingPath(54, 50, 28, 19, 16, 0.86) + '" fill="#fbf8f1" stroke="' + PIC_INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M42 44 q3 -3 6 0 M58 40 q3 -3 6 0 M64 53 q3 -3 6 0 M47 56 q3 -3 6 0" stroke="#ded6c4" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="16.5" cy="44" rx="4.2" ry="2.2" transform="rotate(-25 16.5 44)" fill="#4a3b35"/>' +
      '<ellipse cx="24.5" cy="51" rx="8.6" ry="10.4" fill="#4a3b35" stroke="' + PIC_INK + '" stroke-width="1.6"/>' +
      '<ellipse cx="32.5" cy="43" rx="4" ry="2" transform="rotate(25 32.5 43)" fill="#4a3b35"/>' +
      '<g fill="#fbf8f1" stroke="' + PIC_INK + '" stroke-width="1.2"><circle cx="20" cy="41.5" r="3.4"/><circle cx="29" cy="41.5" r="3.4"/><circle cx="24.5" cy="39.4" r="3.8"/></g>' +
      '<circle cx="21.5" cy="50" r="2" fill="#fff"/><circle cx="27.5" cy="50" r="2" fill="#fff"/>' +
      '<circle cx="21.9" cy="50.4" r="1" fill="' + PIC_INK + '"/><circle cx="27.9" cy="50.4" r="1" fill="' + PIC_INK + '"/>' +
      '<path d="M22.5 57 Q24.5 59 26.5 57" stroke="#1f1814" stroke-width="1.2" fill="none" stroke-linecap="round"/>',
  },

  bunny: {
    name: "bunny", plural: "bunnies", faces: 1,
    svg:
      '<circle cx="23" cy="70" r="7" fill="#fff" stroke="' + PIC_INK + '" stroke-width="2"/>' +
      '<ellipse cx="43" cy="69" rx="22" ry="20" fill="#f4efe8" stroke="' + PIC_INK + '" stroke-width="2.4"/>' +
      '<ellipse cx="38" cy="88" rx="15" ry="5.4" fill="#f4efe8" stroke="' + PIC_INK + '" stroke-width="2.2"/>' +
      '<ellipse cx="59" cy="23" rx="5.6" ry="17" transform="rotate(-12 59 23)" fill="#f4efe8" stroke="' + PIC_INK + '" stroke-width="2.2"/>' +
      '<ellipse cx="59" cy="24" rx="2.4" ry="11" transform="rotate(-12 59 24)" fill="#f6b8bf"/>' +
      '<ellipse cx="71" cy="22" rx="5.6" ry="17" transform="rotate(10 71 22)" fill="#f4efe8" stroke="' + PIC_INK + '" stroke-width="2.2"/>' +
      '<ellipse cx="71" cy="23" rx="2.4" ry="11" transform="rotate(10 71 23)" fill="#f6b8bf"/>' +
      '<circle cx="67" cy="50" r="15" fill="#f4efe8" stroke="' + PIC_INK + '" stroke-width="2.4"/>' +
      '<ellipse cx="62" cy="88" rx="7" ry="4.4" fill="#f4efe8" stroke="' + PIC_INK + '" stroke-width="2"/>' +
      zooEye(72, 47, 2.3) +
      '<ellipse cx="80.6" cy="52.4" rx="2" ry="1.5" fill="#ef8f9c"/>' +
      '<path d="M80.6 54 L80.6 56 M80.6 56 Q78.6 58 77 56.6" stroke="' + PIC_INK + '" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
      '<path d="M83 53 L91 51 M83 55 L91 56" stroke="#b9ab9c" stroke-width="1" stroke-linecap="round"/>' +
      zooBlush(73, 55, 2.8),
  },

  turtle: {
    name: "turtle", plural: "turtles", faces: 1,
    svg:
      zooLeg(27, 70, 10, 16, "#86bf55") + zooLeg(38, 71, 10, 16, "#86bf55") +
      zooLeg(60, 71, 10, 16, "#94cb62") + zooLeg(71, 70, 10, 16, "#94cb62") +
      '<path d="M17 72 L11 75 L18 76 Z" fill="#94cb62" stroke="' + PIC_INK + '" stroke-width="1.8" stroke-linejoin="round"/>' +
      '<path d="M74 66 Q80 60 84 58" stroke="' + PIC_INK + '" stroke-width="13.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M74 66 Q80 60 84 58" stroke="#94cb62" stroke-width="9" fill="none" stroke-linecap="round"/>' +
      '<circle cx="87" cy="55" r="9.5" fill="#94cb62" stroke="' + PIC_INK + '" stroke-width="2.4"/>' +
      zooEye(89.6, 52.6, 2) +
      '<path d="M86 59.6 Q89 61.6 92.4 59.2" stroke="' + PIC_INK + '" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
      zooBlush(92.6, 57, 1.8) +
      '<path d="M16 73 Q16 34 47 33 Q78 34 80 73 Z" fill="#5aa04a" stroke="' + PIC_INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M37 41 L47 37 L57 41 L56 52 L47 56 L38 52 Z M38 52 L28 58 M56 52 L67 58 M47 56 L47 70 M37 41 L28 46 M57 41 L67 46" stroke="#86c56d" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<rect x="13" y="69" width="70" height="8" rx="4" fill="#e3c06c" stroke="' + PIC_INK + '" stroke-width="2.2"/>',
  },
};

const ZOO_ORDER = ["giraffe", "lion", "elephant", "bunny", "turtle", "sheep"];

/* ---------- the other characters ---------- */

const CAST = {
  /* A shepherd boy, front-on, with his crook. */
  shepherd:
    '<path d="M76 94 L76 30 Q76 17 65 17 Q56 17 56 26" stroke="' + PIC_INK + '" stroke-width="7.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M76 94 L76 30 Q76 17 65 17 Q56 17 56 26" stroke="#a8743d" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M30 94 Q31 56 50 51 Q69 56 70 94 Z" fill="#5d9bd5" stroke="' + PIC_INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M44 52 L50 70 L56 52" stroke="#4a86c0" stroke-width="2" fill="none"/>' +
    '<rect x="31" y="70" width="38" height="6" rx="3" fill="#d9534f" stroke="' + PIC_INK + '" stroke-width="1.8"/>' +
    '<ellipse cx="72" cy="66" rx="5" ry="6.5" fill="#f5cfa8" stroke="' + PIC_INK + '" stroke-width="2"/>' +
    '<ellipse cx="30" cy="66" rx="5" ry="6.5" fill="#f5cfa8" stroke="' + PIC_INK + '" stroke-width="2"/>' +
    '<circle cx="50" cy="36" r="14" fill="#f5cfa8" stroke="' + PIC_INK + '" stroke-width="2.4"/>' +
    '<path d="M35 40 Q34 18 50 18 Q66 18 65 40 L67 55 Q60 48 59 34 Q50 27 41 34 Q40 48 33 55 Z" fill="#f6e6c6" stroke="' + PIC_INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M37 28 Q50 22 63 28" stroke="#a8743d" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    zooEye(45, 38, 2) + zooEye(55, 38, 2) +
    '<path d="M46 44 Q50 47 54 44" stroke="' + PIC_INK + '" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
    zooBlush(42, 43, 2.4) + zooBlush(58, 43, 2.4),

  /* A stable with the star above it. */
  stable:
    '<rect x="20" y="48" width="60" height="44" fill="#b5793f" stroke="' + PIC_INK + '" stroke-width="2.6"/>' +
    '<path d="M24 58 L76 58 M24 70 L76 70 M24 82 L76 82" stroke="#9c6a36" stroke-width="1.4"/>' +
    '<polygon points="10,52 50,24 90,52" fill="#8a4b2b" stroke="' + PIC_INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M38 92 L38 70 Q50 58 62 70 L62 92 Z" fill="#ffd166" stroke="' + PIC_INK + '" stroke-width="2.2"/>' +
    '<path d="M44 92 L44 80 Q50 75 56 80 L56 92 Z" fill="#f6a24b"/>' +
    '<polygon points="' + picRing(50, 11, 9, 9, 10, 0.45).map(function (p) { return p[0] + "," + p[1]; }).join(" ") + '" fill="#ffd166" stroke="' + PIC_INK + '" stroke-width="2" stroke-linejoin="round"/>',

  /* The wise man's gift. */
  gift:
    '<rect x="22" y="44" width="56" height="44" rx="4" fill="#e74c3c" stroke="' + PIC_INK + '" stroke-width="2.6"/>' +
    '<rect x="17" y="32" width="66" height="14" rx="4" fill="#ef6f6c" stroke="' + PIC_INK + '" stroke-width="2.6"/>' +
    '<rect x="45" y="32" width="10" height="56" fill="#ffd166" stroke="' + PIC_INK + '" stroke-width="1.6"/>' +
    '<path d="M50 32 Q34 12 27 24 Q31 34 50 32 Q69 34 73 24 Q66 12 50 32" fill="#ffd166" stroke="' + PIC_INK + '" stroke-width="2.4" stroke-linejoin="round"/>',

  /* A pointing hand, for "do it like this". Fingertip at (37, 7). */
  hand:
    '<rect x="29" y="5" width="16" height="48" rx="8" fill="#fff" stroke="' + PIC_INK + '" stroke-width="3"/>' +
    '<rect x="27" y="40" width="48" height="40" rx="17" fill="#fff" stroke="' + PIC_INK + '" stroke-width="3"/>' +
    '<rect x="29" y="5" width="16" height="44" rx="8" fill="#fff"/>' +
    '<path d="M47 44 Q51 38 56 43 M57 46 Q61 40 66 45 M66 49 Q70 44 74 50" stroke="' + PIC_INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="27" cy="60" rx="7.4" ry="13" transform="rotate(-28 27 60)" fill="#fff" stroke="' + PIC_INK + '" stroke-width="3"/>' +
    '<rect x="33" y="78" width="38" height="15" rx="4" fill="#5d9bd5" stroke="' + PIC_INK + '" stroke-width="3"/>',

  /* Noah's ark, side-on, on a 200 x 130 sheet. The doorway is on the hull
     at the left; the gangplank is drawn separately so it can be raised. */
  ark:
    '<path d="' + picPath([[6, 64, 1], [194, 64, 1], [180, 104], [100, 118], [20, 104]], true) + '" fill="#b5793f" stroke="' + PIC_INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M12 76 Q100 84 188 76 M18 90 Q100 99 182 90 M30 102 Q100 111 170 102" stroke="#8a5a2b" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<rect x="52" y="32" width="96" height="32" fill="#d9a066" stroke="' + PIC_INK + '" stroke-width="2.6"/>' +
    '<path d="M52 42 L148 42 M52 53 L148 53" stroke="#c48a52" stroke-width="1.4"/>' +
    '<polygon points="42,34 100,8 158,34" fill="#8a4b2b" stroke="' + PIC_INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M60 30 L100 13 L140 30" stroke="#a65f37" stroke-width="2" fill="none"/>' +
    '<rect x="62" y="38" width="16" height="16" rx="3" fill="#4a3220" stroke="' + PIC_INK + '" stroke-width="2"/>' +
    '<rect x="122" y="38" width="16" height="16" rx="3" fill="#4a3220" stroke="' + PIC_INK + '" stroke-width="2"/>' +
    '<rect x="88" y="36" width="24" height="22" rx="4" fill="#4a3220" stroke="' + PIC_INK + '" stroke-width="2"/>' +
    /* Noah at the window */
    '<circle cx="100" cy="47" r="8" fill="#f5cfa8"/>' +
    '<path d="M93 48 Q93 58 100 59 Q107 58 107 48 Q104 52 100 52 Q96 52 93 48 Z" fill="#f4f1ea"/>' +
    '<path d="M92 44 Q100 36 108 44" stroke="#f4f1ea" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="97.2" cy="46" r="1.2" fill="' + PIC_INK + '"/><circle cx="102.8" cy="46" r="1.2" fill="' + PIC_INK + '"/>' +
    '<path d="M98.4 50 Q100 51.2 101.6 50" stroke="' + PIC_INK + '" stroke-width="1" fill="none" stroke-linecap="round"/>' +
    /* the doorway */
    '<path d="M30 102 L30 80 Q30 70 41 70 Q52 70 52 80 L52 103 Z" fill="#3a2718" stroke="' + PIC_INK + '" stroke-width="2.4" stroke-linejoin="round"/>',

  /* The door / gangplank: 100 x 24. Lowered it is a ramp; raised it closes
     the doorway. */
  plank:
    '<rect x="2" y="3" width="96" height="18" rx="4" fill="#a8743d" stroke="' + PIC_INK + '" stroke-width="2.6"/>' +
    '<path d="M18 4 L18 20 M38 4 L38 20 M58 4 L58 20 M78 4 L78 20" stroke="#8a5a2b" stroke-width="2"/>' +
    '<path d="M6 8 L94 8" stroke="#c8935a" stroke-width="1.4"/>',

  cloud:
    '<g fill="#ffffff" stroke="#dfe9f2" stroke-width="2"><circle cx="30" cy="58" r="18"/><circle cx="52" cy="46" r="24"/><circle cx="74" cy="58" r="17"/>' +
    '<rect x="28" y="56" width="48" height="20" rx="10"/></g>' +
    '<g fill="#ffffff"><circle cx="30" cy="58" r="16.6"/><circle cx="52" cy="46" r="22.6"/><circle cx="74" cy="58" r="15.6"/><rect x="29" y="57" width="46" height="18" rx="9"/></g>',
};

/* The question at the end of the ark game. Genesis 7:16 is the whole of
   the gospel in one line: Noah did not shut himself in. */
const ARK_STORY = {
  id: "two-by-two",
  name: "Two by Two",
  said: "Everyone is safe in the ark!",
  verse: "And they that went in, went in male and female of all flesh, as God had commanded him: and the LORD shut him in.",
  ref: "Genesis 7:16",
  truth: "Noah did not shut the door himself. The LORD shut him in, and kept him safe.",
  q: {
    q: "Who shut the door of the ark?",
    options: [["The LORD did", 1], ["Noah did", 0], ["The animals did", 0]],
    teach: "And the LORD shut him in. God is the one who saves, and he keeps his people safe.",
    ref: "Genesis 7:16",
  },
};
