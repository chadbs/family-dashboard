/* ============================================================
   Bible — a little game for Addison (4) and Sophie (2).

   Each day has a story: Creation, Noah, David, Jonah, the Good Shepherd,
   Daniel, the loaves and fishes, baby Moses, the fruit of the Spirit,
   Jesus and the children. Five quick rounds, all touch: tap the right
   picture, find the one that is hiding, tap them all, count them out,
   match the pairs, or choose where a creature belongs. Every prompt is
   read aloud, because one of the players cannot read yet.

   Design rules, in the order they matter for a two-year-old:
     - nothing is ever a dead end: a miss wobbles, says "try again", and
       the right tile starts to nudge if nobody finds it for a while;
     - every hit is loud and bright: a burst, a chime, a word of praise;
     - rounds are short and the board changes shape each time, so five
       rounds feel like five different games;
     - no stars, no scores, no timers. Finishing the story is the prize,
       and tomorrow there is a new one.

   The day's story and its rounds come from the date, so the wall and
   both phones agree on what "today's game" is.
   ============================================================ */

const BibleGame = (function () {
  /* ---------- the animals, so the prompts can say their names ---------- */

  const NAMES = {
    "\u{1F430}": "bunny", "\u{1F422}": "turtle", "\u{1F992}": "giraffe", "\u{1F418}": "elephant",
    "\u{1F981}": "lion", "\u{1F42F}": "tiger", "\u{1F43B}": "bear", "\u{1F411}": "sheep",
    "\u{1F410}": "goat", "\u{1F415}": "dog", "\u{1F431}": "cat", "\u{1F438}": "frog",
    "\u{1F986}": "duck", "\u{1F426}": "bird", "\u{1F54A}️": "dove", "\u{1F41F}": "fish",
    "\u{1F40B}": "whale", "\u{1F419}": "octopus", "\u{1F420}": "fish", "\u{1F980}": "crab",
    "\u{1F41D}": "bee", "\u{1F98B}": "butterfly", "\u{1F41C}": "ant", "\u{1F401}": "mouse",
    "\u{1F42E}": "cow", "\u{1F437}": "pig", "\u{1F414}": "chicken", "\u{1F434}": "horse",
    "\u{1F427}": "penguin", "\u{1F98C}": "deer", "\u{1F9A9}": "flamingo", "\u{1F40C}": "snail",
  };

  /* ---------- the stories ---------- */

  const STORIES = [
    {
      id: "creation",
      name: "God Made Everything",
      ref: "Genesis 1:1",
      verse: "In the beginning God created the heaven and the earth.",
      icon: "\u{1F30D}",
      sky: "day",
      rounds: [
        { type: "pick", prompt: "God made the sun to light the day. Tap the sun!", answer: "☀️", others: ["\u{1F31A}", "\u{1F41F}", "\u{1F333}"] },
        { type: "pick", prompt: "God made the moon to shine at night. Tap the moon!", answer: "\u{1F319}", others: ["☀️", "\u{1F41D}", "\u{1F338}"] },
        { type: "tapall", prompt: "God made all the stars. Tap every star!", target: "⭐", filler: ["☁️", "\u{1F319}"], count: 5, total: 9 },
        { type: "pick", prompt: "God made the turtle, slow and steady. Tap the turtle!", answer: "\u{1F422}", others: ["\u{1F430}", "\u{1F992}", "\u{1F33B}"] },
        { type: "pick", prompt: "God made the bunny with long ears. Tap the bunny!", answer: "\u{1F430}", others: ["\u{1F422}", "\u{1F418}", "\u{1F33A}"] },
        { type: "pick", prompt: "God made the giraffe with a long neck. Tap the giraffe!", answer: "\u{1F992}", others: ["\u{1F430}", "\u{1F438}", "\u{1F41F}"] },
        { type: "sort", prompt: "Where does the whale live?", item: "\u{1F40B}", answer: "sea" },
        { type: "sort", prompt: "Where does the bunny live?", item: "\u{1F430}", answer: "land" },
        { type: "count", prompt: "God rested on day seven. Tap seven flowers!", item: "\u{1F33C}", n: 7 },
        { type: "pairs", prompt: "Match the animals God made!", items: ["\u{1F430}", "\u{1F422}", "\u{1F992}"] },
      ],
    },
    {
      id: "noah",
      name: "Noah's Ark",
      ref: "Genesis 7:9",
      verse: "There went in two and two unto Noah into the ark.",
      icon: "\u{1F6A2}",
      sky: "rain",
      rounds: [
        { type: "pairs", prompt: "The animals came two by two. Match the pairs!", items: ["\u{1F992}", "\u{1F422}", "\u{1F430}"] },
        { type: "pick", prompt: "Noah built a big boat. Tap the boat!", answer: "\u{1F6A2}", others: ["\u{1F697}", "\u{1F3E0}", "\u{1F6B2}"] },
        { type: "count", prompt: "Two giraffes walked on. Tap two giraffes!", item: "\u{1F992}", n: 2 },
        { type: "count", prompt: "Two turtles crawled on. Tap two turtles!", item: "\u{1F422}", n: 2 },
        { type: "pick", prompt: "After the rain God sent a rainbow. Tap the rainbow!", answer: "\u{1F308}", others: ["☁️", "⛈️", "❄️"] },
        { type: "tapall", prompt: "It rained and rained. Tap every raindrop!", target: "\u{1F4A7}", filler: ["☀️", "\u{1F33B}"], count: 5, total: 9 },
        { type: "find", prompt: "A dove brought back a leaf. Find the dove!", target: "\u{1F54A}️", filler: "☁️", size: 9 },
        { type: "pairs", prompt: "Two of every kind! Match them up!", items: ["\u{1F42F}", "\u{1F43B}", "\u{1F418}"] },
      ],
    },
    {
      id: "david",
      name: "David and Goliath",
      ref: "1 Samuel 17:45",
      verse: "I come to thee in the name of the LORD of hosts.",
      icon: "\u{1F411}",
      sky: "day",
      rounds: [
        { type: "count", prompt: "David picked five smooth stones. Tap five stones!", item: "\u{1FAA8}", n: 5 },
        { type: "pick", prompt: "David was a shepherd boy. Tap the sheep!", answer: "\u{1F411}", others: ["\u{1F437}", "\u{1F414}", "\u{1F431}"] },
        { type: "find", prompt: "One little sheep wandered off. Find the sheep!", target: "\u{1F411}", filler: "\u{1F33F}", size: 9 },
        { type: "pick", prompt: "Goliath was very tall, like a giraffe. Tap the giraffe!", answer: "\u{1F992}", others: ["\u{1F430}", "\u{1F422}", "\u{1F401}"] },
        { type: "pick", prompt: "David was small, like a little mouse. Tap the mouse!", answer: "\u{1F401}", others: ["\u{1F992}", "\u{1F418}", "\u{1F40B}"] },
        { type: "tapall", prompt: "David trusted God. Tap every heart!", target: "❤️", filler: ["\u{1FAA8}", "\u{1F33F}"], count: 4, total: 9 },
        { type: "pick", prompt: "David played the harp for the king. Tap the harp!", answer: "\u{1FA95}", others: ["\u{1F941}", "\u{1F3BA}", "\u{1F3B8}"] },
        { type: "sort", prompt: "Who is bigger?", item: "\u{1F992}", answer: "land", labels: { sea: "Bunny \u{1F430}", land: "Giraffe \u{1F992}" } },
      ],
    },
    {
      id: "jonah",
      name: "Jonah and the Big Fish",
      ref: "Jonah 2:2",
      verse: "I cried by reason of mine affliction unto the LORD, and he heard me.",
      icon: "\u{1F40B}",
      sky: "sea",
      rounds: [
        { type: "pick", prompt: "A big fish swallowed Jonah. Tap the big fish!", answer: "\u{1F40B}", others: ["\u{1F41F}", "\u{1F980}", "\u{1F422}"] },
        { type: "sort", prompt: "Where does the big fish live?", item: "\u{1F40B}", answer: "sea" },
        { type: "find", prompt: "Jonah got on a boat. Find the boat!", target: "⛵", filler: "\u{1F30A}", size: 9 },
        { type: "count", prompt: "Jonah was inside three days. Tap three fish!", item: "\u{1F41F}", n: 3 },
        { type: "tapall", prompt: "The sea was stormy. Tap every wave!", target: "\u{1F30A}", filler: ["⛵", "\u{1F41F}"], count: 5, total: 9 },
        { type: "pick", prompt: "Jonah prayed, and God heard him. Tap the praying hands!", answer: "\u{1F64F}", others: ["\u{1F44B}", "\u{1F44F}", "✌️"] },
        { type: "sort", prompt: "Where does a sea turtle swim?", item: "\u{1F422}", answer: "sea" },
        { type: "pairs", prompt: "Match the sea creatures!", items: ["\u{1F40B}", "\u{1F419}", "\u{1F422}"] },
      ],
    },
    {
      id: "shepherd",
      name: "The Good Shepherd",
      ref: "Psalm 23:1",
      verse: "The LORD is my shepherd; I shall not want.",
      icon: "\u{1F411}",
      sky: "meadow",
      rounds: [
        { type: "find", prompt: "One sheep is lost. Find the sheep!", target: "\u{1F411}", filler: "\u{1F33F}", size: 9 },
        { type: "count", prompt: "The shepherd counts his sheep. Tap four sheep!", item: "\u{1F411}", n: 4 },
        { type: "tapall", prompt: "Bring every sheep home. Tap all the sheep!", target: "\u{1F411}", filler: ["\u{1F33F}", "\u{1F332}"], count: 5, total: 9 },
        { type: "pick", prompt: "The shepherd leads them to water. Tap the water!", answer: "\u{1F4A7}", others: ["\u{1F525}", "\u{1FAA8}", "\u{1F335}"] },
        { type: "pick", prompt: "A bunny hopped by the flock. Tap the bunny!", answer: "\u{1F430}", others: ["\u{1F411}", "\u{1F410}", "\u{1F415}"] },
        { type: "sort", prompt: "Is a sheep gentle or scary?", item: "\u{1F411}", answer: "land", labels: { sea: "Scary \u{1F43A}", land: "Gentle \u{1F411}" } },
        { type: "pairs", prompt: "Match the meadow friends!", items: ["\u{1F411}", "\u{1F430}", "\u{1F98C}"] },
      ],
    },
    {
      id: "children",
      name: "Jesus Loves the Children",
      ref: "Mark 10:14",
      verse: "Suffer the little children to come unto me, and forbid them not.",
      icon: "\u{1F476}",
      sky: "day",
      rounds: [
        { type: "tapall", prompt: "Jesus loves every child. Tap all the children!", target: "\u{1F467}", filler: ["\u{1F333}", "\u{1F33C}"], count: 5, total: 9 },
        { type: "pick", prompt: "Jesus loves you! Tap the heart!", answer: "❤️", others: ["⭐", "\u{1F338}", "\u{1F31E}"] },
        { type: "count", prompt: "Tap three hearts for Jesus!", item: "\u{1F49B}", n: 3 },
        { type: "find", prompt: "One child is hiding. Find the little one!", target: "\u{1F476}", filler: "\u{1F33B}", size: 9 },
        { type: "pick", prompt: "We can talk to Jesus in prayer. Tap the praying hands!", answer: "\u{1F64F}", others: ["\u{1F44B}", "\u{1F91D}", "\u{1F44D}"] },
        { type: "sort", prompt: "Does Jesus love little ones?", item: "\u{1F476}", answer: "land", labels: { sea: "No \u{1F614}", land: "Yes! ❤️" } },
        { type: "pairs", prompt: "Match the happy faces!", items: ["\u{1F600}", "\u{1F60A}", "\u{1F970}"] },
      ],
    },
    {
      id: "daniel",
      name: "Daniel and the Lions",
      ref: "Daniel 6:22",
      verse: "My God hath sent his angel, and hath shut the lions' mouths.",
      icon: "\u{1F981}",
      sky: "night",
      rounds: [
        { type: "pick", prompt: "Daniel was put in with the lions. Tap the lion!", answer: "\u{1F981}", others: ["\u{1F42E}", "\u{1F430}", "\u{1F437}"] },
        { type: "count", prompt: "The lions stayed quiet. Tap three lions!", item: "\u{1F981}", n: 3 },
        { type: "find", prompt: "God sent an angel. Find the angel!", target: "\u{1F47C}", filler: "\u{1F981}", size: 9 },
        { type: "pick", prompt: "Daniel prayed three times a day. Tap the praying hands!", answer: "\u{1F64F}", others: ["\u{1F44F}", "\u{1F919}", "\u{1F44B}"] },
        { type: "tapall", prompt: "Daniel was safe all night. Tap every star!", target: "⭐", filler: ["\u{1F981}", "\u{1F319}"], count: 4, total: 9 },
        { type: "sort", prompt: "Where does a lion live?", item: "\u{1F981}", answer: "land" },
        { type: "pairs", prompt: "Match the big cats!", items: ["\u{1F981}", "\u{1F42F}", "\u{1F406}"] },
      ],
    },
    {
      id: "loaves",
      name: "Five Loaves and Two Fish",
      ref: "Matthew 14:20",
      verse: "And they did all eat, and were filled.",
      icon: "\u{1F35E}",
      sky: "meadow",
      rounds: [
        { type: "count", prompt: "A boy had five loaves of bread. Tap five!", item: "\u{1F35E}", n: 5 },
        { type: "count", prompt: "And two little fish. Tap two fish!", item: "\u{1F41F}", n: 2 },
        { type: "pick", prompt: "Jesus gave thanks and shared it. Tap the basket!", answer: "\u{1F9FA}", others: ["\u{1F392}", "\u{1F4E6}", "\u{1F6D2}"] },
        { type: "tapall", prompt: "Everyone was full! Tap all the bread!", target: "\u{1F35E}", filler: ["\u{1F41F}", "\u{1F9FA}"], count: 5, total: 9 },
        { type: "find", prompt: "Find the boy who shared his lunch!", target: "\u{1F466}", filler: "\u{1F35E}", size: 9 },
        { type: "sort", prompt: "Where does a fish live?", item: "\u{1F41F}", answer: "sea" },
        { type: "pairs", prompt: "Match the food!", items: ["\u{1F35E}", "\u{1F41F}", "\u{1F347}"] },
      ],
    },
    {
      id: "moses",
      name: "Baby Moses",
      ref: "Exodus 2:3",
      verse: "She took for him an ark of bulrushes, and laid it in the flags by the river's brink.",
      icon: "\u{1F476}",
      sky: "sea",
      rounds: [
        { type: "find", prompt: "Baby Moses floated in a basket. Find the basket!", target: "\u{1F9FA}", filler: "\u{1F33E}", size: 9 },
        { type: "pick", prompt: "The basket floated on the river. Tap the water!", answer: "\u{1F4A7}", others: ["\u{1F525}", "\u{1F33B}", "\u{1FAA8}"] },
        { type: "pick", prompt: "A princess found the baby. Tap the baby!", answer: "\u{1F476}", others: ["\u{1F418}", "\u{1F431}", "\u{1F338}"] },
        { type: "count", prompt: "Tap three reeds by the river!", item: "\u{1F33E}", n: 3 },
        { type: "sort", prompt: "Where does a frog live?", item: "\u{1F438}", answer: "sea", labels: { sea: "River \u{1F4A7}", land: "Desert \u{1F335}" } },
        { type: "tapall", prompt: "God kept Moses safe. Tap every heart!", target: "❤️", filler: ["\u{1F33E}", "\u{1F4A7}"], count: 4, total: 9 },
        { type: "pairs", prompt: "Match the river friends!", items: ["\u{1F438}", "\u{1F986}", "\u{1F422}"] },
      ],
    },
    {
      id: "fruit",
      name: "The Fruit of the Spirit",
      ref: "Galatians 5:22",
      verse: "But the fruit of the Spirit is love, joy, peace.",
      icon: "\u{1F34E}",
      sky: "meadow",
      rounds: [
        { type: "pick", prompt: "Love is a fruit of the Spirit. Tap the heart!", answer: "❤️", others: ["\u{1F34E}", "\u{1F34C}", "\u{1F347}"] },
        { type: "pick", prompt: "Joy is a fruit of the Spirit. Tap the happy face!", answer: "\u{1F600}", others: ["\u{1F622}", "\u{1F620}", "\u{1F634}"] },
        { type: "tapall", prompt: "Good fruit grows! Tap all the apples!", target: "\u{1F34E}", filler: ["\u{1F33F}", "\u{1F333}"], count: 5, total: 9 },
        { type: "count", prompt: "Tap four bananas!", item: "\u{1F34C}", n: 4 },
        { type: "pairs", prompt: "Match the fruit!", items: ["\u{1F34E}", "\u{1F34C}", "\u{1F347}"] },
        { type: "pick", prompt: "Peace is a fruit of the Spirit. Tap the dove!", answer: "\u{1F54A}️", others: ["\u{1F981}", "\u{1F40A}", "\u{1F98A}"] },
        { type: "pick", prompt: "Gentleness, like a bunny. Tap the bunny!", answer: "\u{1F430}", others: ["\u{1F40A}", "\u{1F981}", "\u{1F988}"] },
        { type: "sort", prompt: "Is being kind good or bad?", item: "\u{1F91D}", answer: "land", labels: { sea: "Bad \u{1F614}", land: "Good \u{1F31F}" } },
      ],
    },
  ];

  const ROUNDS_PER_GAME = 5;
  const HINT_AFTER_MS = 7000;

  const PRAISE = ["Yes!", "You found it!", "Great job!", "Wonderful!", "That's right!", "Hooray!", "Well done!", "Good looking!"];
  const NUDGE = ["Try again!", "Almost! Look again.", "Not that one. Keep looking!", "Hmm, try another one."];

  /* ---------- tiny helpers ---------- */

  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* mulberry32: small, good enough, deterministic per seed. */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, r) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function pickOne(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function storyForDay(date) {
    const d = date || new Date();
    return STORIES[(Word.dayOfYear(d) + d.getFullYear()) % STORIES.length];
  }

  function nameOf(glyph) {
    return NAMES[glyph] || "";
  }

  /* ---------- sound ---------- */

  let audio = null;
  let muted = false;
  function ctx() {
    if (audio) return audio;
    try {
      audio = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      audio = null;
    }
    return audio;
  }
  function tone(freq, ms, type, delay, vol) {
    if (muted) return;
    try {
      const c = ctx();
      if (!c) return;
      if (c.state === "suspended") c.resume();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || "sine";
      o.frequency.value = freq;
      o.connect(g);
      g.connect(c.destination);
      const t = c.currentTime + (delay || 0) / 1000;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.16, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      o.start(t);
      o.stop(t + ms / 1000 + 0.03);
    } catch (e) {
      /* no sound is fine */
    }
  }
  const SFX = {
    good: function () { tone(659, 120); tone(880, 160, "sine", 100); tone(1175, 220, "sine", 200, 0.12); },
    miss: function () { tone(260, 140, "triangle", 0, 0.1); tone(220, 200, "triangle", 120, 0.1); },
    tap: function () { tone(540, 60, "sine", 0, 0.1); },
    flip: function () { tone(700, 50, "sine", 0, 0.08); },
    start: function () { [523, 659, 784].forEach(function (f, i) { tone(f, 180, "sine", i * 110, 0.12); }); },
    win: function () { [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { tone(f, 240, "sine", i * 110, 0.14); }); },
  };

  function say(text) {
    if (muted) return;
    Voice.speak(text, { rate: 0.95, pitch: 1.08 });
  }
  function hush() {
    Voice.hush();
  }

  /* ---------- the sky: a WebGL particle field behind the board ----------
     three.js is fetched the first time the tab opens and never blocks the
     game; until it lands (or if it never does) the CSS scene stands in.
     One renderer for the life of the page, re-attached to whichever card
     is on screen, because the view is rebuilt on every tap. */

  const Backdrop = (function () {
    const SRC = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    const N = 150;
    let state = "idle"; /* idle | loading | ready | failed */
    let renderer = null, scene = null, camera = null, points = null, geo = null, mat = null;
    let canvas = null, mode = "", w = 0, h = 0, raf = null, idle = 0;
    let vel = null, phase = null, base = null;
    const reduce = (function () {
      try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
    })();

    function load() {
      if (state !== "idle" || reduce) return;
      state = "loading";
      const s = document.createElement("script");
      s.src = SRC;
      s.async = true;
      s.onload = function () { state = "ready"; Router.refresh(); };
      s.onerror = function () { state = "failed"; };
      document.head.appendChild(s);
    }

    function isDark() {
      const t = document.documentElement.getAttribute("data-theme");
      if (t === "dark") return true;
      if (t === "light") return false;
      try { return window.matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) { return false; }
    }

    function softDot() {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d");
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.35, "rgba(255,255,255,0.7)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      const t = new THREE.CanvasTexture(c);
      return t;
    }

    /* Colour and motion per sky. Colours are the house palette's delft,
       amber and leaf, lightened for dark mode. */
    const LOOKS = {
      day:    { light: 0x2f5d8a, dark: 0xdfe9f5, size: [3, 8],  drift: [0.06, -0.10], wobble: 0.35, twinkle: 0.4 },
      meadow: { light: 0xb8860b, dark: 0xffe08a, size: [2, 6],  drift: [0.12, -0.14], wobble: 0.6,  twinkle: 0.5 },
      sea:    { light: 0x2f5d8a, dark: 0xbfe3ff, size: [3, 10], drift: [0.0,  -0.32], wobble: 0.9,  twinkle: 0.3 },
      rain:   { light: 0x4b6b86, dark: 0xb9d0e6, size: [2, 4],  drift: [-0.08, 1.6],  wobble: 0.05, twinkle: 0.1 },
      night:  { light: 0x2f5d8a, dark: 0xfff4c2, size: [2, 7],  drift: [0.02, -0.02], wobble: 0.1,  twinkle: 1.0 },
      party:  { light: 0xd39a12, dark: 0xffd76a, size: [4, 12], drift: [0.0,  -1.1],  wobble: 1.4,  twinkle: 0.9 },
    };

    function build() {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setClearColor(0x000000, 0);
      canvas = renderer.domElement;
      canvas.className = "bg-gl";
      canvas.setAttribute("aria-hidden", "true");
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);

      geo = new THREE.BufferGeometry();
      const pos = new Float32Array(N * 3);
      const size = new Float32Array(N);
      const alpha = new Float32Array(N);
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("size", new THREE.BufferAttribute(size, 1));
      geo.setAttribute("alpha", new THREE.BufferAttribute(alpha, 1));
      vel = new Float32Array(N * 2);
      phase = new Float32Array(N);
      base = new Float32Array(N);

      mat = new THREE.ShaderMaterial({
        uniforms: { color: { value: new THREE.Color(0xffffff) }, map: { value: softDot() }, ratio: { value: renderer.getPixelRatio() } },
        vertexShader:
          "attribute float size; attribute float alpha; varying float vA; uniform float ratio;" +
          "void main(){ vA = alpha; gl_PointSize = size * ratio; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader:
          "uniform vec3 color; uniform sampler2D map; varying float vA;" +
          "void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(color, t.a * vA); }",
        transparent: true,
        depthWrite: false,
        depthTest: false,
      });
      points = new THREE.Points(geo, mat);
      scene.add(points);
    }

    function seed(look) {
      const pos = geo.attributes.position.array;
      const size = geo.attributes.size.array;
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * w;
        pos[i * 3 + 1] = (Math.random() - 0.5) * h;
        pos[i * 3 + 2] = 0;
        size[i] = look.size[0] + Math.random() * (look.size[1] - look.size[0]);
        const spd = 0.6 + Math.random() * 0.9;
        vel[i * 2] = look.drift[0] * spd;
        vel[i * 2 + 1] = look.drift[1] * spd;
        phase[i] = Math.random() * Math.PI * 2;
        base[i] = 0.25 + Math.random() * 0.5;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.size.needsUpdate = true;
    }

    function fit(container) {
      const cw = container.clientWidth, ch = container.clientHeight;
      if (!cw || !ch || (cw === w && ch === h)) return false;
      w = cw; h = ch;
      renderer.setSize(w, h, false);
      camera.left = -w / 2; camera.right = w / 2; camera.top = h / 2; camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      return true;
    }

    function tick() {
      raf = null;
      if (!canvas.isConnected) {
        if (++idle < 90) { raf = requestAnimationFrame(tick); }
        return;
      }
      idle = 0;
      if (document.hidden) { raf = requestAnimationFrame(tick); return; }
      const container = canvas.parentNode;
      if (fit(container)) seed(LOOKS[mode] || LOOKS.day);
      const look = LOOKS[mode] || LOOKS.day;
      const pos = geo.attributes.position.array;
      const alpha = geo.attributes.alpha.array;
      const t = performance.now() / 1000;
      for (let i = 0; i < N; i++) {
        let x = pos[i * 3] + vel[i * 2] + Math.sin(t * 0.8 + phase[i]) * look.wobble * 0.3;
        let y = pos[i * 3 + 1] - vel[i * 2 + 1];
        if (y > h / 2 + 10) y = -h / 2 - 10;
        if (y < -h / 2 - 10) y = h / 2 + 10;
        if (x > w / 2 + 10) x = -w / 2 - 10;
        if (x < -w / 2 - 10) x = w / 2 + 10;
        pos[i * 3] = x;
        pos[i * 3 + 1] = y;
        alpha[i] = base[i] * (1 - look.twinkle * 0.5 + look.twinkle * 0.5 * Math.sin(t * 2.2 + phase[i] * 3));
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.alpha.needsUpdate = true;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }

    /* Put the sky behind this card. Safe to call on every render. */
    function attach(container, sky) {
      if (state !== "ready") { load(); return false; }
      try {
        if (!renderer) build();
      } catch (e) {
        state = "failed";
        return false;
      }
      const look = LOOKS[sky] || LOOKS.day;
      const dark = isDark();
      mat.uniforms.color.value.setHex(dark ? look.dark : look.light);
      mat.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
      mat.needsUpdate = true;
      container.classList.add("has-gl");
      container.insertBefore(canvas, container.firstChild);
      if (sky !== mode) {
        mode = sky;
        w = 0; h = 0; /* force a refit + reseed for the new look */
      }
      if (!raf) raf = requestAnimationFrame(tick);
      return true;
    }

    return { attach: attach, load: load };
  })();

  /* ---------- game state (ephemeral, per screen) ---------- */

  function S() {
    if (!UI.state.bible) UI.state.bible = { phase: "kid" };
    return UI.state.bible;
  }

  function startGame(kid, fresh) {
    const st = S();
    const story = storyForDay(new Date());
    const seedStr = fresh ? String(Math.random()) : Fmt.dayKey() + ":" + story.id;
    const r = rng(hashStr(seedStr));
    const rounds = shuffle(story.rounds, r).slice(0, ROUNDS_PER_GAME).map(function (spec) {
      return buildRound(spec, r);
    });
    st.phase = "play";
    st.kid = kid;
    st.story = story;
    st.rounds = rounds;
    st.idx = 0;
    st.roundState = null;
    st.enter = true;
    SFX.start();
    Router.refresh();
    setTimeout(function () { say(rounds[0].prompt); }, 400);
    armHint();
  }

  /* Lay out a round's tiles from its spec, using the shared RNG so a day's
     board is the same on every device. */
  function buildRound(spec, r) {
    const round = Object.assign({}, spec);
    if (spec.type === "pick") {
      round.tiles = shuffle([spec.answer].concat(spec.others), r);
    } else if (spec.type === "tapall") {
      const tiles = [];
      for (let i = 0; i < spec.count; i++) tiles.push(spec.target);
      while (tiles.length < spec.total) tiles.push(spec.filler[Math.floor(r() * spec.filler.length)]);
      round.tiles = shuffle(tiles, r);
    } else if (spec.type === "find") {
      const tiles = [];
      for (let i = 0; i < spec.size; i++) tiles.push(spec.filler);
      tiles[Math.floor(r() * spec.size)] = spec.target;
      round.tiles = tiles;
    } else if (spec.type === "count") {
      round.tiles = [];
      const total = Math.max(spec.n + 2, 6);
      for (let i = 0; i < total; i++) round.tiles.push(spec.item);
    } else if (spec.type === "pairs") {
      round.tiles = shuffle(spec.items.concat(spec.items), r);
    }
    return round;
  }

  function currentRound() {
    const st = S();
    return st.rounds ? st.rounds[st.idx] : null;
  }

  function roundState() {
    const st = S();
    if (!st.roundState) st.roundState = { done: [], picked: [], count: 0, wrong: null, solved: false, hint: false };
    return st.roundState;
  }

  /* The idle nudge. If nothing right has happened for a while, the tile
     they need starts to bob. Any correct tap resets the clock. */
  let hintTimer = null;
  function armHint() {
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () {
      const st = S();
      if (st.phase !== "play" || Router.current() !== "bible") return;
      const rs = roundState();
      if (rs.solved) return;
      rs.hint = true;
      Router.refresh();
    }, HINT_AFTER_MS);
  }
  function disarmHint() {
    clearTimeout(hintTimer);
    hintTimer = null;
  }

  function advance() {
    const st = S();
    st.roundState = null;
    if (st.idx + 1 >= st.rounds.length) {
      st.phase = "done";
      disarmHint();
      SFX.win();
      Router.refresh();
      setTimeout(function () {
        say("You did it" + (st.kid ? ", " + st.kid : "") + "! " + st.story.verse);
      }, 500);
      return;
    }
    st.idx++;
    st.enter = true;
    Router.refresh();
    const next = st.rounds[st.idx];
    setTimeout(function () { say(next.prompt); }, 350);
    armHint();
  }

  function good(el) {
    SFX.good();
    disarmHint();
    const rs = roundState();
    rs.solved = true;
    rs.hint = false;
    if (el) burst(el);
    say(pickOne(PRAISE));
    Router.refresh();
    setTimeout(advance, 900);
  }

  function miss(key) {
    SFX.miss();
    const rs = roundState();
    rs.wrong = key;
    Router.refresh();
    setTimeout(function () {
      const r2 = roundState();
      if (r2.wrong === key) {
        r2.wrong = null;
        Router.refresh();
      }
    }, 500);
    say(pickOne(NUDGE));
  }

  /* A little burst of sparks out of a tile. Pure decoration, removed
     after it plays. */
  function burst(el, glyphs) {
    try {
      const rect = el.getBoundingClientRect();
      const host = UI.h("div", { class: "bg-burst", "aria-hidden": "true" });
      host.style.left = rect.left + rect.width / 2 + "px";
      host.style.top = rect.top + rect.height / 2 + "px";
      const set = glyphs || ["✨", "⭐", "\u{1F31F}", "\u{1F49B}", "✨"];
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 60 + Math.random() * 50;
        const s = UI.h("span", { class: "bg-spark", text: set[i % set.length] });
        s.style.setProperty("--dx", Math.cos(ang) * dist + "px");
        s.style.setProperty("--dy", Math.sin(ang) * dist + "px");
        s.style.animationDelay = Math.random() * 60 + "ms";
        host.appendChild(s);
      }
      document.body.appendChild(host);
      setTimeout(function () { host.remove(); }, 900);
    } catch (e) {
      /* decoration only */
    }
  }

  /* ---------- rendering ---------- */

  function tile(glyph, opts) {
    const o = opts || {};
    const b = UI.h(
      "button",
      {
        class: "bg-tile" + (o.cls ? " " + o.cls : ""),
        type: "button",
        "aria-label": o.label || nameOf(glyph) || glyph,
        disabled: o.disabled ? true : null,
        style: { "--i": String(o.index || 0) },
      },
      UI.h("span", { class: "bg-glyph", text: o.hidden ? "❓" : glyph })
    );
    /* CSS custom properties don't go through Object.assign on style. */
    b.style.setProperty("--i", String(o.index || 0));
    if (o.onTap) {
      b.addEventListener("click", function (ev) {
        o.onTap(ev.currentTarget);
      });
    }
    return b;
  }

  function muteButton() {
    const b = UI.h(
      "button",
      { class: "ibtn bg-mute", type: "button", "aria-label": muted ? "Turn sound on" : "Turn sound off", title: muted ? "Sound is off" : "Sound is on" },
      UI.icon(muted ? "x" : "sound")
    );
    b.addEventListener("click", function () {
      muted = !muted;
      if (muted) hush();
      Router.refresh();
    });
    return b;
  }

  function tomorrowStory(now) {
    return storyForDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  }

  function renderKidPicker(root) {
    const shop = typeof Rewards !== "undefined" ? Rewards.shop() || {} : {};
    const kids = shop.kids || [];
    const now = new Date();
    const story = storyForDay(now);
    const tomorrow = tomorrowStory(now);

    root.appendChild(
      UI.h(
        "div",
        { class: "page-head bg-head" },
        UI.h("div", {}, UI.h("div", { class: "eyebrow", text: "Today's Bible game" }), UI.h("div", { class: "title", text: story.name })),
        muteButton()
      )
    );

    const players = kids.map(function (k) {
      const b = UI.h(
        "button",
        { class: "bg-kid", type: "button" },
        UI.h("span", { class: "bg-kid-emoji", text: k.emoji || "⭐" }),
        UI.h("span", { class: "bg-kid-name", text: k.name }),
        UI.h("span", { class: "bg-kid-sub", text: "Tap to play" })
      );
      b.addEventListener("click", function () { startGame(k.name, false); });
      return b;
    });
    const anyone = UI.h(
      "button",
      { class: "bg-kid bg-kid-anyone", type: "button" },
      UI.h("span", { class: "bg-kid-emoji", text: story.icon }),
      UI.h("span", { class: "bg-kid-name", text: kids.length ? "Together" : "Play" }),
      UI.h("span", { class: "bg-kid-sub", text: "Tap to play" })
    );
    anyone.addEventListener("click", function () { startGame("", false); });
    players.push(anyone);

    const intro = UI.h(
        "div",
        { class: "card bg-intro bg-sky", "data-sky": story.sky },
        UI.h("div", { class: "bg-scene", "aria-hidden": "true" }, sceneBits(story.sky)),
        UI.h("div", { class: "bg-intro-icon", text: story.icon }),
        UI.h("p", { class: "bg-intro-verse", text: "“" + story.verse + "”" }),
        UI.h("div", { class: "word-ref", text: story.ref + " (KJV)" }),
        UI.h("div", { class: "bg-intro-text", text: "Five quick rounds. Everything is read out loud, so just listen and tap." }),
        UI.h("div", { class: "eyebrow", text: "Who's playing?" }),
        UI.h("div", { class: "bg-kids", "data-n": String(players.length) }, players)
    );
    root.appendChild(intro);
    Backdrop.attach(intro, story.sky);

    root.appendChild(
      UI.h(
        "div",
        { class: "bg-trail" },
        UI.h("div", { class: "eyebrow", text: "Story trail" }),
        UI.h(
          "div",
          { class: "bg-trail-row" },
          STORIES.map(function (s) {
            const isToday = s.id === story.id;
            const isNext = s.id === tomorrow.id;
            return UI.h(
              "div",
              { class: "bg-trail-stop" + (isToday ? " is-today" : "") + (isNext ? " is-next" : ""), title: s.name },
              UI.h("span", { class: "bg-trail-icon", text: s.icon }),
              isToday ? UI.h("span", { class: "bg-trail-tag", text: "Today" }) : isNext ? UI.h("span", { class: "bg-trail-tag", text: "Tomorrow" }) : null
            );
          })
        )
      )
    );
  }

  /* Soft scenery behind the board — clouds, waves, hills — as text so it
     costs nothing and matches the tiles. */
  function sceneBits(sky) {
    const bits = {
      day: ["☁️", "☁️", "\u{1F33F}", "\u{1F33C}", "\u{1F33F}"],
      rain: ["\u{1F327}️", "☁️", "\u{1F4A7}", "\u{1F4A7}", "\u{1F30A}"],
      sea: ["\u{1F30A}", "\u{1F30A}", "\u{1F41F}", "\u{1F30A}", "\u{1F41A}"],
      meadow: ["\u{1F33C}", "\u{1F33F}", "\u{1F98B}", "\u{1F33C}", "\u{1F33F}"],
      night: ["⭐", "\u{1F319}", "⭐", "✨", "⭐"],
    }[sky] || [];
    return bits.map(function (g, i) {
      const s = UI.h("span", { class: "bg-scene-bit", text: g });
      s.style.setProperty("--i", String(i));
      return s;
    });
  }

  function renderPrompt(round) {
    const btn = UI.h("button", { class: "ibtn bg-say", type: "button", "aria-label": "Say it again" }, UI.icon("sound"));
    btn.addEventListener("click", function () { say(round.prompt); });
    return UI.h(
      "div",
      { class: "bg-prompt" },
      UI.h("div", { class: "bg-prompt-row" }, UI.h("p", { class: "bg-prompt-text", text: round.prompt }), btn)
    );
  }

  function renderProgress() {
    const st = S();
    return UI.h(
      "div",
      { class: "bg-progress", "aria-label": "Round " + (st.idx + 1) + " of " + st.rounds.length },
      st.rounds.map(function (_, i) {
        const on = i < st.idx ? "done" : i === st.idx ? "now" : "";
        return UI.h("span", { class: "bg-dot", "data-on": on }, on === "done" ? UI.icon("check") : null);
      })
    );
  }

  function hintCls(rs, isTarget) {
    return rs.hint && isTarget && !rs.solved ? " bg-hint" : "";
  }

  function renderPick(round) {
    const rs = roundState();
    return UI.h(
      "div",
      { class: "bg-grid bg-grid-2" },
      round.tiles.map(function (g, i) {
        const key = "t" + i;
        const isAns = g === round.answer;
        return tile(g, {
          index: i,
          cls: (rs.solved && isAns ? "bg-hit" : rs.wrong === key ? "bg-miss" : "") + hintCls(rs, isAns),
          disabled: rs.solved,
          onTap: function (el) {
            if (isAns) good(el);
            else miss(key);
          },
        });
      })
    );
  }

  function renderFind(round) {
    const rs = roundState();
    return UI.h(
      "div",
      { class: "bg-grid bg-grid-3" },
      round.tiles.map(function (g, i) {
        const key = "t" + i;
        const isAns = g === round.target;
        return tile(g, {
          index: i,
          cls: (rs.solved && isAns ? "bg-hit" : rs.wrong === key ? "bg-miss" : "") + hintCls(rs, isAns),
          disabled: rs.solved,
          onTap: function (el) {
            if (isAns) good(el);
            else miss(key);
          },
        });
      })
    );
  }

  function renderTapAll(round) {
    const rs = roundState();
    const need = round.count;
    let hinted = false;
    return UI.h(
      "div",
      { class: "bg-stack" },
      UI.h(
        "div",
        { class: "bg-counter" },
        UI.h("span", { class: "nums", text: String(rs.done.length) }),
        UI.h("span", { class: "bg-counter-of", text: " of " + need })
      ),
      UI.h(
        "div",
        { class: "bg-grid bg-grid-3" },
        round.tiles.map(function (g, i) {
          const key = "t" + i;
          const gone = rs.done.indexOf(key) >= 0;
          const isTarget = g === round.target && !gone;
          const showHint = isTarget && !hinted;
          if (showHint) hinted = true;
          return tile(g, {
            index: i,
            cls: (gone ? "bg-gone" : rs.wrong === key ? "bg-miss" : "") + hintCls(rs, showHint),
            disabled: gone || rs.solved,
            onTap: function (el) {
              if (g !== round.target) return miss(key);
              SFX.tap();
              armHint();
              burst(el, ["✨"]);
              rs.done.push(key);
              rs.hint = false;
              if (rs.done.length >= need) good(null);
              else Router.refresh();
            },
          });
        })
      )
    );
  }

  function renderCount(round) {
    const rs = roundState();
    let hinted = false;
    return UI.h(
      "div",
      { class: "bg-stack" },
      UI.h("div", { class: "bg-bignum nums", text: String(rs.count) }),
      UI.h(
        "div",
        { class: "bg-grid bg-grid-3" },
        round.tiles.map(function (g, i) {
          const key = "t" + i;
          const gone = rs.done.indexOf(key) >= 0;
          const showHint = !gone && !hinted;
          if (showHint) hinted = true;
          return tile(g, {
            index: i,
            cls: (gone ? "bg-counted" : "") + hintCls(rs, showHint),
            disabled: gone || rs.solved,
            onTap: function (el) {
              rs.done.push(key);
              rs.count++;
              rs.hint = false;
              armHint();
              tone(440 + rs.count * 60, 110, "sine", 0, 0.12);
              burst(el, ["✨"]);
              say(String(rs.count));
              if (rs.count >= round.n) good(null);
              else Router.refresh();
            },
          });
        })
      )
    );
  }

  function firstDown(round, rs) {
    for (let i = 0; i < round.tiles.length; i++) {
      if (rs.done.indexOf("t" + i) < 0) return i;
    }
    return -1;
  }

  function renderPairs(round) {
    const rs = roundState();
    const hintAt = rs.picked.length === 0 ? firstDown(round, rs) : -1;
    return UI.h(
      "div",
      { class: "bg-grid bg-grid-3" },
      round.tiles.map(function (g, i) {
        const key = "t" + i;
        const matched = rs.done.indexOf(key) >= 0;
        const faceUp = matched || rs.picked.indexOf(key) >= 0;
        return tile(g, {
          index: i,
          hidden: !faceUp,
          label: faceUp ? nameOf(g) || g : "Hidden card",
          cls: (matched ? "bg-hit" : faceUp ? "bg-up" : "bg-down") + hintCls(rs, i === hintAt),
          disabled: matched || rs.solved || rs.picked.length >= 2,
          onTap: function () {
            if (rs.picked.indexOf(key) >= 0) return;
            SFX.flip();
            armHint();
            rs.hint = false;
            rs.picked.push(key);
            Router.refresh();
            if (rs.picked.length === 2) {
              const a = rs.picked[0], b = rs.picked[1];
              const ga = round.tiles[Number(a.slice(1))], gb = round.tiles[Number(b.slice(1))];
              setTimeout(function () {
                const r2 = roundState();
                if (ga === gb) {
                  r2.done.push(a, b);
                  r2.picked = [];
                  if (r2.done.length >= round.tiles.length) return good(null);
                  SFX.good();
                  say(pickOne(["A pair!", "They match!", nameOf(ga) ? "Two " + nameOf(ga) + "s!" : "Two of a kind!"]));
                } else {
                  SFX.miss();
                  r2.picked = [];
                }
                Router.refresh();
              }, 750);
            }
          },
        });
      })
    );
  }

  function renderSort(round) {
    const rs = roundState();
    const labels = round.labels || { sea: "Sea \u{1F30A}", land: "Land \u{1F333}" };
    const answer = round.answer;
    return UI.h(
      "div",
      { class: "bg-stack" },
      UI.h("div", { class: "bg-sort-item" + (rs.solved ? " bg-sort-go" : ""), text: round.item, "data-to": answer }),
      UI.h(
        "div",
        { class: "bg-grid bg-grid-2" },
        ["sea", "land"].map(function (k, i) {
          const b = UI.h(
            "button",
            {
              class: "bg-tile bg-choice" + (rs.solved && k === answer ? " bg-hit" : rs.wrong === k ? " bg-miss" : "") + hintCls(rs, k === answer),
              type: "button",
              disabled: rs.solved ? true : null,
            },
            UI.h("span", { class: "bg-choice-text", text: labels[k] })
          );
          b.style.setProperty("--i", String(i));
          b.addEventListener("click", function (ev) {
            if (k === answer) good(ev.currentTarget);
            else miss(k);
          });
          return b;
        })
      )
    );
  }

  function renderPlay(root) {
    const st = S();
    const round = currentRound();
    if (!round) {
      st.phase = "kid";
      return renderKidPicker(root);
    }
    const quit = UI.h("button", { class: "ibtn", type: "button", "aria-label": "Stop playing", title: "Stop playing" }, UI.icon("x"));
    quit.addEventListener("click", function () {
      st.phase = "kid";
      st.roundState = null;
      disarmHint();
      hush();
      Router.refresh();
    });

    root.appendChild(
      UI.h(
        "div",
        { class: "bg-top" },
        UI.h("div", { class: "bg-who" }, UI.h("span", { class: "bg-story-icon", text: st.story.icon }), UI.h("span", { text: st.story.name + (st.kid ? " · " + st.kid : "") })),
        UI.h("div", { class: "bg-top-actions" }, muteButton(), quit)
      )
    );
    root.appendChild(renderProgress());

    let board;
    if (round.type === "pick") board = renderPick(round);
    else if (round.type === "find") board = renderFind(round);
    else if (round.type === "tapall") board = renderTapAll(round);
    else if (round.type === "count") board = renderCount(round);
    else if (round.type === "pairs") board = renderPairs(round);
    else board = renderSort(round);

    const card = UI.h(
      "div",
      { class: "card bg-board bg-sky" + (st.enter ? " bg-enter" : ""), "data-sky": st.story.sky },
      UI.h("div", { class: "bg-scene", "aria-hidden": "true" }, sceneBits(st.story.sky)),
      renderPrompt(round),
      board
    );
    st.enter = false;
    root.appendChild(card);
    Backdrop.attach(card, st.story.sky);
  }

  function renderDone(root) {
    const st = S();
    const tomorrow = tomorrowStory(new Date());

    const again = UI.h("button", { class: "btn btn-primary btn-block bg-big-btn", type: "button" }, "Play again");
    again.addEventListener("click", function () { startGame(st.kid, true); });
    const other = UI.h("button", { class: "btn btn-block", type: "button" }, "All done");
    other.addEventListener("click", function () { st.phase = "kid"; hush(); Router.refresh(); });
    const read = UI.h("button", { class: "btn btn-sm", type: "button" }, UI.icon("sound"), "Read the verse");
    read.addEventListener("click", function () { say(st.story.verse + ". " + st.story.ref); });

    const confetti = ["⭐", "✨", "\u{1F31F}", "\u{1F49B}", "⭐", "✨", "\u{1F31F}", "\u{1F49B}", "⭐", "✨", "\u{1F31F}", "\u{1F49B}"];
    const done = UI.h(
        "div",
        { class: "card bg-done bg-sky", "data-sky": st.story.sky },
        UI.h("div", { class: "bg-confetti", "aria-hidden": "true" }, confetti.map(function (g, i) {
          return UI.h("span", { class: "bg-conf", text: g, style: { left: (4 + i * 8) + "%", animationDelay: (i * 0.09) + "s", animationDuration: (2.2 + (i % 3) * 0.4) + "s" } });
        })),
        UI.h("div", { class: "bg-done-icon", text: st.story.icon }),
        UI.h("div", { class: "bg-done-title", text: "You did it" + (st.kid ? ", " + st.kid : "") + "!" }),
        UI.h("p", { class: "bg-done-verse", text: "“" + st.story.verse + "”" }),
        UI.h("div", { class: "word-ref", text: st.story.ref + " (KJV)" }),
        read,
        UI.h("div", { class: "stack bg-done-actions" }, again, other),
        UI.h("div", { class: "bg-tomorrow" }, UI.h("span", { text: tomorrow.icon }), UI.h("span", { text: "Tomorrow: " + tomorrow.name }))
    );
    root.appendChild(done);
    Backdrop.attach(done, "party");
  }

  function renderBible(root) {
    root.classList.add("bg-view");
    Backdrop.load();
    const st = S();
    if (st.phase === "play") return renderPlay(root);
    if (st.phase === "done") return renderDone(root);
    return renderKidPicker(root);
  }

  Router.on("bible", renderBible);

  return { storyForDay: storyForDay, stories: STORIES };
})();
