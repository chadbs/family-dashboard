/* ============================================================
   Pictures — the storybook art the Bible tab's games are built on.

   Eleven pictures, drawn by hand in SVG in one flat picture-book style:
   warm colours, a soft brown outline, nothing borrowed. Each one is a
   Bible story with its KJV verse, one plain truth to say out loud, and a
   question for the older girl.

   Every picture is built in three layers on a 100 x 100 square:
     scene    — sky, sea, hills; everything behind
     outline  — the main shape, as a list of points. It is drawn as the
                picture's body, AND it is the dot-to-dot path, so the dots
                always trace exactly the thing that appears.
     details  — eyes, windows, leaves; everything on top

   An outline point is [x, y] or [x, y, 1]; the 1 marks a sharp corner.
   Without it the line bends smoothly through the point.
   ============================================================ */

const PIC_INK = "#3b2f2a";

/* Draw a closed outline, curving through the smooth points and keeping
   the corners sharp (Catmull-Rom, turned into cubic curves). */
function picPath(pts, smooth) {
  const n = pts.length;
  const P = pts.map(function (p) { return { x: p[0], y: p[1], c: !smooth || !!p[2] }; });
  const r = function (v) { return Math.round(v * 100) / 100; };
  let d = "M" + P[0].x + " " + P[0].y;
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    if (p1.c && p2.c) { d += " L" + p2.x + " " + p2.y; continue; }
    const k1 = p1.c ? 0 : 1 / 6, k2 = p2.c ? 0 : 1 / 6;
    d += " C" + r(p1.x + (p2.x - p0.x) * k1) + " " + r(p1.y + (p2.y - p0.y) * k1) +
         " " + r(p2.x - (p3.x - p1.x) * k2) + " " + r(p2.y - (p3.y - p1.y) * k2) +
         " " + p2.x + " " + p2.y;
  }
  return d + " Z";
}

/* Points round an ellipse, alternating between the full radius and a
   smaller one: a scalloped sheep, a lion's mane, a star. */
function picRing(cx, cy, rx, ry, n, inner, corner) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (k / n) * Math.PI * 2;
    const f = k % 2 === 0 ? 1 : inner;
    const p = [Math.round((cx + rx * f * Math.cos(a)) * 10) / 10, Math.round((cy + ry * f * Math.sin(a)) * 10) / 10];
    if (corner) p.push(1);
    out.push(p);
  }
  return out;
}

/* A band of water from `y` to the bottom edge. */
function picWave(y, amp, len, fill) {
  let d = "M0 " + y;
  for (let x = 0; x < 100; x += len) d += " q" + len / 4 + " " + -amp + " " + len / 2 + " 0 t" + len / 2 + " 0";
  return '<path d="' + d + ' L100 100 L0 100 Z" fill="' + fill + '"/>';
}

/* A hill from `y` at the edges, peaking at `top` in the middle. */
function picHill(y, top, fill) {
  return '<path d="M0 ' + y + " Q50 " + (2 * top - y) + " 100 " + y + ' L100 100 L0 100 Z" fill="' + fill + '"/>';
}

function picSparkles(fill, spots) {
  return '<g fill="' + fill + '">' + spots.map(function (s) {
    const x = s[0], y = s[1], r = s[2] || 1.6;
    return '<path d="M' + x + " " + (y - r * 2) + " Q" + x + " " + y + " " + (x + r * 2) + " " + y +
           " Q" + x + " " + y + " " + x + " " + (y + r * 2) + " Q" + x + " " + y + " " + (x - r * 2) + " " + y +
           " Q" + x + " " + y + " " + x + " " + (y - r * 2) + 'Z"/>';
  }).join("") + "</g>";
}


const PICTURES = [
  {
    id: "ark",
    name: "Noah's Ark",
    said: "It's Noah's ark!",
    verse: "I do set my bow in the cloud, and it shall be for a token of a covenant.",
    ref: "Genesis 9:13",
    truth: "God made a promise, and God always keeps his promises.",
    q: {
      q: "Does God keep his promises?",
      options: [["Always", 1], ["Only sometimes", 0], ["Never", 0]],
      teach: "God keeps every promise he makes. The rainbow is his sign that he will.",
      ref: "Genesis 9:13",
    },
    fill: "#b5793f",
    smooth: true,
    outline: [[10, 56, 1], [32, 58, 1], [32, 43, 1], [27, 43, 1], [50, 28, 1], [73, 43, 1], [68, 43, 1], [68, 58, 1], [90, 56, 1], [78, 74], [50, 79], [22, 74]],
    scene:
      '<rect width="100" height="100" fill="#cfe7f7"/>' +
      [["#ef6f6c", 46], ["#f6a24b", 40], ["#ffd166", 34], ["#8fd18a", 28], ["#6fb6e8", 22]].map(function (b) {
        return '<path d="M' + (50 - b[1]) + " 72 A" + b[1] + " " + b[1] + " 0 0 1 " + (50 + b[1]) + ' 72" fill="none" stroke="' + b[0] + '" stroke-width="6.2"/>';
      }).join("") +
      '<g fill="#fff"><circle cx="5" cy="70" r="7"/><circle cx="13" cy="72" r="6"/><circle cx="95" cy="70" r="7"/><circle cx="87" cy="72" r="6"/></g>' +
      picWave(72, 2.4, 20, "#5fa8d3"),
    details:
      '<polygon points="27,43 50,28 73,43" fill="#8a4b2b" stroke="' + PIC_INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<rect x="32" y="43" width="36" height="15" fill="#d9a066" stroke="' + PIC_INK + '" stroke-width="1.8"/>' +
      '<rect x="45" y="46.5" width="10" height="7" rx="1.6" fill="' + PIC_INK + '"/>' +
      '<circle cx="48.2" cy="50.4" r="1.1" fill="#fff"/><circle cx="51.8" cy="50.4" r="1.1" fill="#fff"/>' +
      '<rect x="36" y="49" width="6" height="9" rx="1" fill="#8a5a2b" stroke="' + PIC_INK + '" stroke-width="1.2"/>' +
      '<path d="M15 62 Q50 66 85 62 M20 68.5 Q50 72.5 80 68.5" stroke="#8a5a2b" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
      picWave(80, 2.6, 16, "#7cc0e6"),
    tokenBox: [6, 24, 88, 58],
    tokenDrop: 1,
  },
  {
    id: "dove",
    name: "The Dove",
    said: "It's the dove, with an olive leaf!",
    verse: "And, lo, in her mouth was an olive leaf pluckt off.",
    ref: "Genesis 8:11",
    truth: "God did not forget Noah. He never forgets his people.",
    q: {
      q: "Did God forget Noah on the ark?",
      options: [["No, never", 1], ["Yes, for a while", 0], ["Maybe", 0]],
      teach: "And God remembered Noah. He never forgets the people he loves.",
      ref: "Genesis 8:1",
    },
    fill: "#ffffff",
    smooth: true,
    outline: [[14, 42, 1], [22, 33], [31, 34], [40, 40], [50, 22], [62, 10, 1], [66, 26], [70, 38], [86, 42], [95, 49, 1], [86, 55, 1], [64, 60], [40, 58], [26, 50], [16, 45, 1]],
    scene:
      '<rect width="100" height="100" fill="#d6ecfb"/>' +
      '<circle cx="82" cy="20" r="9" fill="#ffe08a"/>' +
      '<g fill="#fff"><circle cx="16" cy="82" r="8"/><circle cx="27" cy="77" r="10"/><circle cx="38" cy="82" r="8"/><rect x="16" y="82" width="22" height="8"/>' +
      '<circle cx="66" cy="88" r="7"/><circle cx="76" cy="84" r="9"/><circle cx="86" cy="88" r="7"/><rect x="66" y="88" width="20" height="7"/></g>',
    details:
      '<polygon points="15,41 7.5,43.5 15,46" fill="#f6a24b" stroke="' + PIC_INK + '" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<circle cx="23" cy="38" r="1.7" fill="' + PIC_INK + '"/>' +
      '<path d="M47 33 Q54 32 58 22 M52 39 Q60 37 64 29 M58 44 Q66 42 70 36" stroke="#c9d6e2" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M80 46 L90 50 M80 51 L88 53" stroke="#c9d6e2" stroke-width="1.3" stroke-linecap="round"/>' +
      '<path d="M9 44 Q5 51 7 58" stroke="#5d7f22" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
      '<g fill="#8fbf4a" stroke="#4d6b1a" stroke-width=".8">' +
      '<ellipse cx="4.8" cy="49" rx="3.4" ry="1.7" transform="rotate(-50 4.8 49)"/>' +
      '<ellipse cx="9.4" cy="52.5" rx="3.4" ry="1.7" transform="rotate(35 9.4 52.5)"/>' +
      '<ellipse cx="5.4" cy="56" rx="3.2" ry="1.6" transform="rotate(-40 5.4 56)"/></g>',
    tokenBox: [0, 6, 98, 58],
  },
  {
    id: "whale",
    name: "Jonah's Big Fish",
    said: "It's Jonah's big fish!",
    verse: "Salvation is of the LORD.",
    ref: "Jonah 2:9",
    truth: "Jonah could not save himself. Salvation is of the LORD.",
    q: {
      q: "Who saved Jonah?",
      options: [["The LORD did", 1], ["Jonah saved himself", 0], ["The sailors", 0]],
      teach: "Salvation is of the LORD. Not of Jonah, and not of us. God does the saving.",
      ref: "Jonah 2:9",
    },
    fill: "#5b8fc9",
    smooth: true,
    outline: [[12, 52], [18, 38], [36, 29], [56, 29], [70, 37], [78, 46, 1], [92, 32, 1], [87, 52, 1], [92, 70, 1], [78, 58, 1], [66, 68], [46, 74], [26, 72], [15, 63]],
    scene:
      '<rect width="100" height="100" fill="#cdeafc"/>' +
      '<circle cx="85" cy="14" r="7" fill="#ffe08a"/>' +
      picWave(56, 2.4, 20, "#4f97cf") +
      picWave(82, 2, 25, "#3f86bd") +
      '<g fill="#bfe3f7" opacity=".8"><circle cx="8" cy="88" r="1.6"/><circle cx="12" cy="80" r="1.1"/><circle cx="94" cy="84" r="1.4"/></g>',
    details:
      '<path d="M22 63 Q42 73 66 66" stroke="#cfe0f2" stroke-width="4.4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="26" cy="45" r="2.1" fill="' + PIC_INK + '"/><circle cx="26.7" cy="44.3" r=".65" fill="#fff"/>' +
      '<path d="M16 55 Q24 60 32 56" stroke="' + PIC_INK + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      '<path d="M36 28 Q35 20 30 16 M36 28 Q37 19 42 15 M36 28 L36 13" stroke="#7cc4f0" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<g fill="#7cc4f0"><circle cx="28" cy="13" r="1.4"/><circle cx="44" cy="12" r="1.4"/><circle cx="36" cy="9.5" r="1.4"/></g>',
  },
  {
    id: "sheep",
    name: "The Lost Sheep",
    said: "It's the lost sheep!",
    verse: "Rejoice with me; for I have found my sheep which was lost.",
    ref: "Luke 15:6",
    truth: "The sheep did not find its own way home. The shepherd came and found it. That is what Jesus does.",
    q: {
      q: "Who found the lost sheep?",
      options: [["The shepherd found it", 1], ["It found its own way", 0], ["It got lucky", 0]],
      teach: "The sheep could not find its way home, so the shepherd went looking. The Son of man is come to seek and to save that which was lost.",
      ref: "Luke 19:10",
    },
    fill: "#fbf8f1",
    smooth: true,
    outline: picRing(54, 50, 28, 19, 16, 0.86),
    scene:
      '<rect width="100" height="100" fill="#d8eefc"/>' +
      '<circle cx="84" cy="16" r="8" fill="#ffe08a"/>' +
      picHill(76, 66, "#9ccc65") +
      '<g fill="#4a3b35"><rect x="36" y="60" width="4.4" height="19" rx="2.2"/><rect x="45" y="61" width="4.4" height="19" rx="2.2"/>' +
      '<rect x="60" y="61" width="4.4" height="19" rx="2.2"/><rect x="69" y="60" width="4.4" height="19" rx="2.2"/></g>' +
      '<g fill="#fff"><circle cx="12" cy="86" r="1.6"/><circle cx="88" cy="90" r="1.6"/><circle cx="24" cy="94" r="1.4"/></g>' +
      '<g fill="#ffd166"><circle cx="12" cy="86" r=".7"/><circle cx="88" cy="90" r=".7"/><circle cx="24" cy="94" r=".6"/></g>',
    details:
      '<path d="M42 44 q3 -3 6 0 M58 40 q3 -3 6 0 M64 53 q3 -3 6 0 M47 56 q3 -3 6 0" stroke="#ded6c4" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="16.5" cy="44" rx="4.2" ry="2.2" transform="rotate(-25 16.5 44)" fill="#4a3b35"/>' +
      '<ellipse cx="24.5" cy="51" rx="8.6" ry="10.4" fill="#4a3b35" stroke="' + PIC_INK + '" stroke-width="1.6"/>' +
      '<ellipse cx="32.5" cy="43" rx="4" ry="2" transform="rotate(25 32.5 43)" fill="#4a3b35"/>' +
      '<g fill="#fbf8f1" stroke="' + PIC_INK + '" stroke-width="1.2"><circle cx="20" cy="41.5" r="3.4"/><circle cx="29" cy="41.5" r="3.4"/><circle cx="24.5" cy="39.4" r="3.8"/></g>' +
      '<circle cx="21.5" cy="50" r="2" fill="#fff"/><circle cx="27.5" cy="50" r="2" fill="#fff"/>' +
      '<circle cx="21.9" cy="50.4" r="1" fill="' + PIC_INK + '"/><circle cx="27.9" cy="50.4" r="1" fill="' + PIC_INK + '"/>' +
      '<path d="M22.5 57 Q24.5 59 26.5 57" stroke="#1f1814" stroke-width="1.2" fill="none" stroke-linecap="round"/>',
    tokenBox: [10, 28, 76, 54],
    tokenExtra:
      '<g fill="#4a3b35"><rect x="36" y="60" width="4.4" height="16" rx="2.2"/><rect x="45" y="61" width="4.4" height="16" rx="2.2"/>' +
      '<rect x="60" y="61" width="4.4" height="16" rx="2.2"/><rect x="69" y="60" width="4.4" height="16" rx="2.2"/></g>',
  },
  {
    id: "lion",
    name: "Daniel's Lion",
    said: "It's one of Daniel's lions, fast asleep!",
    verse: "My God hath sent his angel, and hath shut the lions' mouths.",
    ref: "Daniel 6:22",
    truth: "God kept Daniel safe all night long. Nothing is too hard for God.",
    q: {
      q: "Who kept Daniel safe from the lions?",
      options: [["God did", 1], ["The lions were being nice", 0], ["Daniel was too strong", 0]],
      teach: "Daniel trusted God, and God shut the lions' mouths. Nothing is too hard for the LORD.",
      ref: "Daniel 6:22",
    },
    fill: "#d98a3d",
    smooth: true,
    outline: picRing(50, 52, 38, 38, 16, 0.84),
    scene:
      '<rect width="100" height="100" fill="#f6e3b8"/>' +
      '<path d="M4 100 L4 52 Q50 0 96 52 L96 100 Z" fill="#ead0a0"/>' +
      '<rect y="90" width="100" height="10" fill="#dcbd84"/>',
    details:
      '<g fill="#f6c56a" stroke="' + PIC_INK + '" stroke-width="2"><circle cx="33" cy="36" r="6"/><circle cx="67" cy="36" r="6"/></g>' +
      '<g fill="#e8a24a"><circle cx="33" cy="36" r="3"/><circle cx="67" cy="36" r="3"/></g>' +
      '<circle cx="50" cy="54" r="22" fill="#f6c56a" stroke="' + PIC_INK + '" stroke-width="2"/>' +
      '<path d="M38 50 Q42 53.5 46 50 M54 50 Q58 53.5 62 50" stroke="' + PIC_INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="50" cy="62" rx="9" ry="6" fill="#fbe3b0"/>' +
      '<path d="M46 57 L54 57 L50 61 Z" fill="#7a4a2a" stroke="#7a4a2a" stroke-width="1" stroke-linejoin="round"/>' +
      '<path d="M50 61 L50 64 M50 64 Q46 67 43 64 M50 64 Q54 67 57 64" stroke="' + PIC_INK + '" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
      '<g fill="#f19a8c" opacity=".55"><circle cx="39" cy="60" r="3"/><circle cx="61" cy="60" r="3"/></g>' +
      '<g fill="#7a5aa8" font-family="system-ui, sans-serif" font-weight="800"><text x="76" y="24" font-size="9">z</text><text x="83" y="16" font-size="6.5">z</text></g>',
  },
  {
    id: "basket",
    name: "Baby Moses",
    said: "It's baby Moses, safe in his basket!",
    verse: "And she called his name Moses: and she said, Because I drew him out of the water.",
    ref: "Exodus 2:10",
    truth: "Even when nobody could see, God was taking care of baby Moses.",
    q: {
      q: "Who was taking care of baby Moses?",
      options: [["God was", 1], ["Nobody", 0], ["The river", 0]],
      teach: "No one could see it, but God was watching over Moses the whole time. He watches over you too.",
      ref: "Psalm 121:3",
    },
    fill: "#c98f4e",
    smooth: true,
    outline: [[16, 50, 1], [34, 48], [50, 47], [66, 48], [84, 50, 1], [82, 60], [72, 71], [50, 76], [28, 71], [18, 60]],
    scene:
      '<rect width="100" height="100" fill="#d9f0f7"/>' +
      '<circle cx="84" cy="16" r="8" fill="#ffe08a"/>' +
      picWave(58, 1.8, 14, "#69b3d8") +
      '<g stroke="#5d8a2e" stroke-width="2" stroke-linecap="round" fill="none">' +
      '<path d="M6 100 Q5 70 8 38"/><path d="M11 100 Q12 72 10 46"/><path d="M3 100 Q2 80 4 58"/>' +
      '<path d="M92 100 Q93 72 90 40"/><path d="M96 100 Q95 76 97 50"/></g>' +
      '<g fill="#8a5a2b"><ellipse cx="8" cy="38" rx="2" ry="5"/><ellipse cx="10" cy="46" rx="2" ry="4.6"/><ellipse cx="90" cy="40" rx="2" ry="5"/><ellipse cx="97" cy="50" rx="2" ry="4.6"/></g>' +
      '<path d="M34 50 Q50 40 66 50 Z" fill="#8ec5ea" stroke="' + PIC_INK + '" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<circle cx="50" cy="40" r="8" fill="#f5cfa8" stroke="' + PIC_INK + '" stroke-width="1.8"/>' +
      '<path d="M47 33 q3 -3 5 1" stroke="' + PIC_INK + '" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M45.5 40 q1.8 1.6 3.6 0 M50.9 40 q1.8 1.6 3.6 0" stroke="' + PIC_INK + '" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
      '<g fill="#f3a3a3" opacity=".7"><circle cx="45.4" cy="43.4" r="1.5"/><circle cx="54.6" cy="43.4" r="1.5"/></g>',
    details:
      '<path d="M17 50 Q50 44 83 50" stroke="#8f5f2c" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
      '<path d="M21 58 Q50 63 79 58 M26 65.5 Q50 71 74 65.5" stroke="#9c6a36" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
      '<g stroke="#9c6a36" stroke-width="1.3" stroke-linecap="round"><path d="M31 52.6 L30 58"/><path d="M42 51.8 L41.6 59.4"/><path d="M58 51.8 L58.4 59.4"/><path d="M69 52.6 L70 58"/>' +
      '<path d="M36 61 L35.6 66.4"/><path d="M50 61.6 L50 67.6"/><path d="M64 61 L64.4 66.4"/></g>' +
      '<path d="M10 78 q5 -2.5 10 0 t10 0 M64 82 q5 -2.5 10 0 t10 0" stroke="#bfe3f3" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
    tokenBox: [12, 28, 76, 52],
    tokenDrop: 1,
    /* the baby is part of the scene in the full picture; the token needs him */
    tokenExtra:
      '<path d="M34 50 Q50 40 66 50 Z" fill="#8ec5ea" stroke="' + PIC_INK + '" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<circle cx="50" cy="40" r="8" fill="#f5cfa8" stroke="' + PIC_INK + '" stroke-width="1.8"/>' +
      '<path d="M45.5 40 q1.8 1.6 3.6 0 M50.9 40 q1.8 1.6 3.6 0" stroke="' + PIC_INK + '" stroke-width="1.2" fill="none" stroke-linecap="round"/>',
  },
  {
    id: "star",
    name: "The Star",
    said: "It's the star of Bethlehem!",
    verse: "When they saw the star, they rejoiced with exceeding great joy.",
    ref: "Matthew 2:10",
    truth: "The star led the wise men to Jesus, the Saviour of the world.",
    q: {
      q: "Why did the wise men follow the star?",
      options: [["To find Jesus", 1], ["To get presents", 0], ["To go on holiday", 0]],
      teach: "They came to worship Jesus, the King who was born. He is the one worth finding.",
      ref: "Matthew 2:2",
    },
    fill: "#ffd166",
    smooth: false,
    outline: picRing(50, 44, 36, 36, 10, 0.42, true),
    scene:
      '<rect width="100" height="100" fill="#27315e"/>' +
      '<circle cx="50" cy="44" r="42" fill="#303c72"/><circle cx="50" cy="44" r="30" fill="#394789"/>' +
      '<g fill="#fff" opacity=".85"><circle cx="10" cy="12" r=".9"/><circle cx="22" cy="28" r=".7"/><circle cx="88" cy="10" r="1"/><circle cx="82" cy="30" r=".7"/><circle cx="6" cy="46" r=".8"/><circle cx="94" cy="54" r=".9"/><circle cx="16" cy="64" r=".6"/></g>' +
      '<polygon points="46,62 54,62 72,100 28,100" fill="#fff3c4" opacity=".16"/>' +
      '<path d="M0 100 L0 90 L10 90 L10 85 L18 85 L18 90 L26 90 L26 84 L32 80 L38 84 L38 100 Z M62 100 L62 86 L70 86 L70 82 L78 82 L78 88 L86 88 L86 84 L92 80 L100 84 L100 100 Z" fill="#1b2447"/>' +
      '<polygon points="40,88 50,80 60,88" fill="#1b2447"/><rect x="42" y="88" width="16" height="12" fill="#1b2447"/>' +
      '<rect x="48" y="91" width="4" height="5" rx=".6" fill="#ffd166"/>',
    details:
      '<polygon points="' + picRing(50, 44, 19, 19, 10, 0.42).map(function (p) { return p[0] + "," + p[1]; }).join(" ") + '" fill="#ffe8a3"/>',
  },
  {
    id: "crown",
    name: "The King's Crown",
    said: "It's a crown for the King of kings!",
    verse: "And he hath on his vesture and on his thigh a name written, KING OF KINGS, AND LORD OF LORDS.",
    ref: "Revelation 19:16",
    truth: "Jesus is the King of kings. He rules over everything.",
    q: {
      q: "Who is King over everything?",
      options: [["Jesus is", 1], ["Whoever is biggest", 0], ["Nobody", 0]],
      teach: "The LORD reigneth. Jesus is King over the whole world, and over every day of your life.",
      ref: "Psalm 93:1",
    },
    fill: "#f4c542",
    smooth: false,
    outline: [[18, 78], [82, 78], [85, 33], [70, 52], [65, 25], [57, 48], [50, 17], [43, 48], [35, 25], [30, 52], [15, 33]],
    scene:
      '<rect width="100" height="100" fill="#6c4fa0"/>' +
      picSparkles("#ffffff", [[12, 16], [86, 14, 1.3], [8, 52, 1.2], [92, 48], [22, 90, 1.1], [80, 92, 1.2]]) +
      '<ellipse cx="50" cy="86" rx="41" ry="10" fill="#c0392b" stroke="' + PIC_INK + '" stroke-width="2"/>' +
      '<ellipse cx="50" cy="83" rx="34" ry="5" fill="#d9534f"/>' +
      '<g fill="#f4c542" stroke="' + PIC_INK + '" stroke-width="1.2"><circle cx="10" cy="88" r="3"/><circle cx="90" cy="88" r="3"/></g>',
    details:
      '<path d="M18 64 L82 64" stroke="#c99a1c" stroke-width="2"/>' +
      '<g stroke="' + PIC_INK + '" stroke-width="1.2"><circle cx="32" cy="71" r="3.2" fill="#e74c3c"/><circle cx="50" cy="71" r="3.6" fill="#3b82f6"/><circle cx="68" cy="71" r="3.2" fill="#2ecc71"/></g>' +
      '<g fill="#fff3c4" stroke="' + PIC_INK + '" stroke-width="1.4"><circle cx="15" cy="33" r="3"/><circle cx="35" cy="25" r="3"/><circle cx="50" cy="17" r="3"/><circle cx="65" cy="25" r="3"/><circle cx="85" cy="33" r="3"/></g>' +
      '<path d="M24 58 L28 42" stroke="#fff3c4" stroke-width="2" stroke-linecap="round" opacity=".7"/>',
    tokenBox: [10, 12, 80, 70],
  },
  {
    id: "cross",
    name: "The Cross",
    said: "It's the cross.",
    verse: "Christ died for our sins according to the scriptures.",
    ref: "1 Corinthians 15:3",
    truth: "Jesus died for our sins. He paid what we never could.",
    q: {
      q: "Can we pay for our own sins?",
      options: [["No, Jesus paid for them", 1], ["Yes, by being good", 0], ["By saying sorry enough", 0]],
      teach: "We could never pay for our sins. Christ died for them, and he paid it all.",
      ref: "1 Corinthians 15:3",
    },
    fill: "#9a6234",
    smooth: false,
    outline: [[43, 12], [57, 12], [57, 30], [76, 30], [76, 43], [57, 43], [57, 86], [43, 86], [43, 43], [24, 43], [24, 30], [43, 30]],
    scene:
      '<rect width="100" height="100" fill="#ffe3bf"/><rect width="100" height="34" fill="#ffd3a1"/>' +
      '<circle cx="50" cy="80" r="30" fill="#ffc46b"/><circle cx="50" cy="80" r="21" fill="#ffd98a"/>' +
      '<g stroke="#ffcf7e" stroke-width="2.4" stroke-linecap="round"><path d="M50 44 L50 34"/><path d="M28 52 L20 46"/><path d="M72 52 L80 46"/><path d="M18 70 L8 68"/><path d="M82 70 L92 68"/></g>' +
      picHill(86, 70, "#8fbf6a"),
    details:
      '<path d="M50 16 L50 27 M50 47 L50 78 M29 36.5 L39 36.5 M61 36.5 L72 36.5" stroke="#7a4a24" stroke-width="1.2" stroke-linecap="round"/>' +
      picHill(92, 76, "#7fb35c") +
      '<g fill="#fff"><circle cx="22" cy="92" r="1.6"/><circle cx="78" cy="94" r="1.6"/><circle cx="64" cy="90" r="1.3"/></g>' +
      '<g fill="#f6a24b"><circle cx="22" cy="92" r=".7"/><circle cx="78" cy="94" r=".7"/><circle cx="64" cy="90" r=".6"/></g>',
  },
  {
    id: "tomb",
    name: "The Empty Tomb",
    said: "It's the empty tomb! He is risen!",
    verse: "He is not here: for he is risen, as he said.",
    ref: "Matthew 28:6",
    truth: "Jesus died, and on the third day he rose again. Death could not keep him.",
    q: {
      q: "What happened on the third day?",
      options: [["Jesus rose again", 1], ["Nothing happened", 0], ["He stayed in the tomb", 0]],
      teach: "He is not here: for he is risen, as he said. Jesus is alive!",
      ref: "Matthew 28:6",
    },
    fill: "#b8a58e",
    smooth: true,
    outline: [[12, 84, 1], [14, 64], [22, 46], [36, 34], [52, 30], [68, 34], [80, 44], [87, 62], [88, 84, 1]],
    scene:
      '<rect width="100" height="100" fill="#ffe0b0"/><rect width="100" height="30" fill="#ffd29a"/>' +
      '<circle cx="80" cy="22" r="11" fill="#fff1b0"/>' +
      '<g stroke="#fff1b0" stroke-width="2" stroke-linecap="round"><path d="M80 6 L80 2"/><path d="M94 22 L98 22"/><path d="M90 12 L93 9"/><path d="M90 32 L93 35"/></g>' +
      '<rect y="82" width="100" height="18" fill="#9ccc65"/>',
    details:
      '<path d="M38 84 L38 66 Q38 54 50 54 Q62 54 62 66 L62 84 Z" fill="#4a3b35"/>' +
      '<g stroke="#ffd166" stroke-width="1.6" stroke-linecap="round"><path d="M50 50 L50 45"/><path d="M40 53 L37 49"/><path d="M60 53 L63 49"/></g>' +
      '<path d="M24 60 q3 -2 6 0 M66 46 q3 -2 6 0 M28 74 q3 -2 6 0" stroke="#9c8a74" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
      '<circle cx="80" cy="74" r="11" fill="#a8957c" stroke="' + PIC_INK + '" stroke-width="2"/>' +
      '<path d="M74 70 q3 -2 6 0" stroke="#8f7c64" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
      '<g fill="#fff"><circle cx="18" cy="90" r="1.8"/><circle cx="30" cy="94" r="1.6"/><circle cx="68" cy="92" r="1.6"/></g>' +
      '<g fill="#ef6f6c"><circle cx="18" cy="90" r=".8"/><circle cx="30" cy="94" r=".7"/><circle cx="68" cy="92" r=".7"/></g>',
  },
  {
    id: "heart",
    name: "God's Love",
    said: "It's a heart. God loves you!",
    verse: "We love him, because he first loved us.",
    ref: "1 John 4:19",
    truth: "God loved us first, before we ever loved him.",
    q: {
      q: "Who loved first, God or us?",
      options: [["God loved us first", 1], ["We loved God first", 0], ["Nobody did", 0]],
      teach: "We love him, because he first loved us. His love always comes first.",
      ref: "1 John 4:19",
    },
    fill: "#ef5f67",
    smooth: true,
    outline: [[50, 86, 1], [73, 67], [86, 47], [84, 29], [72, 20], [60, 22], [50, 32, 1], [40, 22], [28, 20], [16, 29], [14, 47], [27, 67]],
    scene:
      '<rect width="100" height="100" fill="#fde2e4"/>' +
      '<g fill="#f9c6cc">' + [[10, 12], [88, 16], [8, 84], [90, 82], [50, 94]].map(function (p) {
        return '<path transform="translate(' + p[0] + " " + p[1] + ') scale(.09) translate(-50 -50)" d="' + picPath([[50, 86, 1], [73, 67], [86, 47], [84, 29], [72, 20], [60, 22], [50, 32, 1], [40, 22], [28, 20], [16, 29], [14, 47], [27, 67]], true) + '"/>';
      }).join("") + "</g>",
    details:
      '<path d="M25 36 Q27 27 36 25" stroke="#ffb3b8" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M50 44 L50 64 M43 51 L57 51" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>',
  },
];

const PICTURE_BY_ID = {};
PICTURES.forEach(function (p) { PICTURE_BY_ID[p.id] = p; });

/* The whole picture, or any of its layers, as SVG markup for a 100 x 100
   viewBox. */
function picMarkup(p, parts) {
  const o = parts || { scene: true, body: true, details: true };
  let s = "";
  if (o.scene) s += p.scene;
  if (o.body) s += '<path d="' + picPath(p.outline, p.smooth) + '" fill="' + p.fill + '" stroke="' + PIC_INK + '" stroke-width="2.2" stroke-linejoin="round"/>';
  if (o.details) {
    /* A token has no sky or sea behind it, so a picture whose last detail
       is water in the foreground leaves that off (tokenDrop). */
    s += o.token && p.tokenDrop ? p.details.replace(/<path [^>]*\/>$/, "") : p.details;
  }
  return s;
}

/* ---------- maze pieces: who walks, and where to ---------- */

function picBadge(inner) {
  return '<circle cx="50" cy="50" r="46" fill="#fffdf7" stroke="' + PIC_INK + '" stroke-width="4"/>' + inner;
}

const PIC_TOKENS = {
  crook: picBadge(
    '<path d="M54 88 L54 38 Q54 18 38 18 Q24 18 24 32" stroke="#8a5a2b" stroke-width="8" fill="none" stroke-linecap="round"/>' +
    '<path d="M54 88 L54 38 Q54 18 38 18 Q24 18 24 32" stroke="#b5793f" stroke-width="3.4" fill="none" stroke-linecap="round"/>'
  ),
  gift: picBadge(
    '<rect x="24" y="44" width="52" height="38" rx="3" fill="#e74c3c" stroke="' + PIC_INK + '" stroke-width="3"/>' +
    '<rect x="20" y="34" width="60" height="12" rx="3" fill="#ef6f6c" stroke="' + PIC_INK + '" stroke-width="3"/>' +
    '<rect x="45" y="34" width="10" height="48" fill="#ffd166"/>' +
    '<path d="M50 34 Q36 18 30 28 Q34 36 50 34 Q64 36 70 28 Q64 18 50 34" fill="#ffd166" stroke="' + PIC_INK + '" stroke-width="2.4" stroke-linejoin="round"/>'
  ),
  stable: picBadge(
    '<rect x="26" y="50" width="48" height="32" fill="#b5793f" stroke="' + PIC_INK + '" stroke-width="3"/>' +
    '<polygon points="18,54 50,26 82,54" fill="#8a4b2b" stroke="' + PIC_INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M42 82 L42 66 Q50 58 58 66 L58 82 Z" fill="#ffd166" stroke="' + PIC_INK + '" stroke-width="2.4"/>' +
    '<polygon points="' + picRing(50, 14, 8, 8, 10, 0.45).map(function (p) { return p[0] + "," + p[1]; }).join(" ") + '" fill="#ffd166" stroke="' + PIC_INK + '" stroke-width="1.8" stroke-linejoin="round"/>'
  ),
};

/* A picture shrunk onto a round badge. Each picture names the part of
   itself worth showing (tokenBox), so a small subject fills the badge
   instead of floating in the middle of it. */
function picToken(id) {
  if (PIC_TOKENS[id]) return PIC_TOKENS[id];
  const p = PICTURE_BY_ID[id];
  if (!p) return picBadge("");
  const box = (p.tokenBox || [0, 0, 100, 100]).join(" ");
  return picBadge(
    '<svg x="12" y="12" width="76" height="76" viewBox="' + box + '" preserveAspectRatio="xMidYMid meet" overflow="visible">' +
    (p.tokenExtra || "") + picMarkup(p, { body: true, details: true, token: true }) + "</svg>"
  );
}

/* The four mazes. The theology is the right way round: in the lost-sheep
   maze it is the shepherd who travels, looking for the sheep. */
const MAZE_THEMES = [
  {
    id: "sheep", mover: "crook", goal: "sheep", pic: "sheep",
    prompt: "Help the shepherd find his lost sheep!",
    little: "Take the shepherd to the sheep!",
    colors: { bg: "#9ccc65", fleck: "#8cbf57", edge: "#c9a66a", road: "#f3deb0", trail: "#ef7d57" },
  },
  {
    id: "dove", mover: "dove", goal: "ark", pic: "dove",
    prompt: "Help the dove fly home to the ark!",
    little: "Take the dove to the ark!",
    colors: { bg: "#bfe3f7", fleck: "#aed9f2", edge: "#dff0fa", road: "#ffffff", trail: "#f6a24b" },
  },
  {
    id: "moses", mover: "basket", goal: "crown", pic: "basket",
    prompt: "Float baby Moses down the river to the princess!",
    little: "Take baby Moses to the princess!",
    colors: { bg: "#8fbf6a", fleck: "#80b05c", edge: "#3f86b8", road: "#74bde6", trail: "#ffffff" },
  },
  {
    id: "star", mover: "gift", goal: "stable", pic: "star",
    prompt: "Follow the star, and bring the gift to baby Jesus!",
    little: "Bring the present to baby Jesus!",
    colors: { bg: "#2f3a6b", fleck: "#3a477d", edge: "#b8925a", road: "#ecd09a", trail: "#ffd166" },
  },
];
