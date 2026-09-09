/* ============================================================
   Bible — a little game for Addison (4) and Sophie (2).

   Each day has a story: Creation, Noah, David, Jonah, the Good Shepherd,
   Daniel, the loaves and fishes, baby Moses, the fruit of the Spirit,
   Jesus and the children. Five quick rounds, all touch: tap the right
   picture, find the one that is hiding, tap them all, count them out,
   or say where a creature lives. Every prompt is read aloud, because
   one of the players cannot read yet. Nothing is ever wrong for long -
   a miss wobbles and says "try again"; a hit pops and dings.

   Finishing the day's story earns that child a star in their jar, once
   a day. After that they can play the same story again, or a fresh
   shuffle of it, just for fun.

   The day's story and its rounds come from the date, so the wall and
   both phones agree on what "today's game" is.
   ============================================================ */

const BibleGame = (function () {
  /* ---------- the stories ---------- */

  const STORIES = [
    {
      id: "creation",
      name: "God Made Everything",
      ref: "Genesis 1:1",
      verse: "In the beginning God created the heaven and the earth.",
      icon: "\u{1F30D}",
      rounds: [
        { type: "pick", prompt: "God made the sun to light the day. Tap the sun!", answer: "☀️", others: ["\u{1F31A}", "\u{1F41F}", "\u{1F333}"] },
        { type: "pick", prompt: "God made the moon to shine at night. Tap the moon!", answer: "\u{1F319}", others: ["☀️", "\u{1F41D}", "\u{1F338}"] },
        { type: "tapall", prompt: "God made all the stars. Tap every star!", target: "⭐", filler: ["☁️", "\u{1F319}"], count: 5, total: 9 },
        { type: "pick", prompt: "God made the fish to swim. Tap the fish!", answer: "\u{1F41F}", others: ["\u{1F426}", "\u{1F33B}", "\u{1F98B}"] },
        { type: "pick", prompt: "God made the birds to fly. Tap the bird!", answer: "\u{1F426}", others: ["\u{1F41F}", "\u{1F422}", "\u{1F33A}"] },
        { type: "sort", prompt: "Where does the whale live?", item: "\u{1F40B}", answer: "sea" },
        { type: "sort", prompt: "Where does the lion live?", item: "\u{1F981}", answer: "land" },
        { type: "count", prompt: "God rested on day seven. Tap seven flowers!", item: "\u{1F33C}", n: 7 },
        { type: "pairs", prompt: "Match the animals God made!", items: ["\u{1F418}", "\u{1F992}", "\u{1F438}"] },
      ],
    },
    {
      id: "noah",
      name: "Noah's Ark",
      ref: "Genesis 7:9",
      verse: "There went in two and two unto Noah into the ark.",
      icon: "\u{1F6A2}",
      rounds: [
        { type: "pairs", prompt: "The animals came two by two. Match the pairs!", items: ["\u{1F418}", "\u{1F992}", "\u{1F981}"] },
        { type: "pick", prompt: "Noah built a big boat. Tap the boat!", answer: "\u{1F6A2}", others: ["\u{1F697}", "\u{1F3E0}", "\u{1F6B2}"] },
        { type: "count", prompt: "Two elephants walked on. Tap two elephants!", item: "\u{1F418}", n: 2 },
        { type: "pick", prompt: "After the rain God sent a rainbow. Tap the rainbow!", answer: "\u{1F308}", others: ["☁️", "⛈️", "❄️"] },
        { type: "tapall", prompt: "It rained and rained. Tap every raindrop!", target: "\u{1F4A7}", filler: ["☀️", "\u{1F33B}"], count: 5, total: 9 },
        { type: "find", prompt: "A dove brought back a leaf. Find the dove!", target: "\u{1F54A}️", filler: "☁️", size: 9 },
        { type: "sort", prompt: "Where does the dove go?", item: "\u{1F54A}️", answer: "land", labels: { sea: "Sky ☁️", land: "Ark \u{1F6A2}" }, answerKey: "land" },
        { type: "pairs", prompt: "Two of every kind! Match them up!", items: ["\u{1F42F}", "\u{1F43B}", "\u{1F407}"] },
      ],
    },
    {
      id: "david",
      name: "David and Goliath",
      ref: "1 Samuel 17:45",
      verse: "I come to thee in the name of the LORD of hosts.",
      icon: "\u{1F411}",
      rounds: [
        { type: "count", prompt: "David picked five smooth stones. Tap five stones!", item: "\u{1FAA8}", n: 5 },
        { type: "pick", prompt: "David was a shepherd boy. Tap the sheep!", answer: "\u{1F411}", others: ["\u{1F437}", "\u{1F414}", "\u{1F408}"] },
        { type: "find", prompt: "One little sheep wandered off. Find the sheep!", target: "\u{1F411}", filler: "\u{1F33F}", size: 9 },
        { type: "pick", prompt: "Goliath was a giant. Which one is big?", answer: "\u{1F9CD}", others: ["\u{1F41C}", "\u{1F401}", "\u{1F41B}"] },
        { type: "tapall", prompt: "David trusted God. Tap every heart!", target: "❤️", filler: ["\u{1FAA8}", "\u{1F33F}"], count: 4, total: 9 },
        { type: "pick", prompt: "David played the harp for the king. Tap the harp!", answer: "\u{1FA95}", others: ["\u{1F941}", "\u{1F3BA}", "\u{1F3B8}"] },
        { type: "sort", prompt: "Was David big or small?", item: "\u{1F466}", answer: "land", labels: { sea: "Big \u{1F9CD}", land: "Small \u{1F466}" }, answerKey: "land" },
      ],
    },
    {
      id: "jonah",
      name: "Jonah and the Big Fish",
      ref: "Jonah 2:2",
      verse: "I cried by reason of mine affliction unto the LORD, and he heard me.",
      icon: "\u{1F40B}",
      rounds: [
        { type: "pick", prompt: "A big fish swallowed Jonah. Tap the big fish!", answer: "\u{1F40B}", others: ["\u{1F41F}", "\u{1F980}", "\u{1F422}"] },
        { type: "sort", prompt: "Where does the big fish live?", item: "\u{1F40B}", answer: "sea" },
        { type: "find", prompt: "Jonah got on a boat. Find the boat!", target: "⛵", filler: "\u{1F30A}", size: 9 },
        { type: "count", prompt: "Jonah was inside three days. Tap three fish!", item: "\u{1F41F}", n: 3 },
        { type: "tapall", prompt: "The sea was stormy. Tap every wave!", target: "\u{1F30A}", filler: ["⛵", "\u{1F41F}"], count: 5, total: 9 },
        { type: "pick", prompt: "Jonah prayed, and God heard him. Tap the praying hands!", answer: "\u{1F64F}", others: ["\u{1F44B}", "\u{1F44F}", "✌️"] },
        { type: "sort", prompt: "Where does a crab live?", item: "\u{1F980}", answer: "sea" },
        { type: "pairs", prompt: "Match the sea creatures!", items: ["\u{1F40B}", "\u{1F419}", "\u{1F420}"] },
      ],
    },
    {
      id: "shepherd",
      name: "The Good Shepherd",
      ref: "Psalm 23:1",
      verse: "The LORD is my shepherd; I shall not want.",
      icon: "\u{1F411}",
      rounds: [
        { type: "find", prompt: "One sheep is lost. Find the sheep!", target: "\u{1F411}", filler: "\u{1F33F}", size: 9 },
        { type: "count", prompt: "The shepherd counts his sheep. Tap four sheep!", item: "\u{1F411}", n: 4 },
        { type: "tapall", prompt: "Bring every sheep home. Tap all the sheep!", target: "\u{1F411}", filler: ["\u{1F33F}", "\u{1F332}"], count: 5, total: 9 },
        { type: "pick", prompt: "The shepherd leads them to water. Tap the water!", answer: "\u{1F4A7}", others: ["\u{1F525}", "\u{1FAA8}", "\u{1F335}"] },
        { type: "pick", prompt: "The shepherd carries a staff. Tap the staff!", answer: "\u{1F9AF}", others: ["\u{1F3BE}", "\u{1F4D6}", "\u{1F3AF}"] },
        { type: "sort", prompt: "Is a sheep gentle or scary?", item: "\u{1F411}", answer: "land", labels: { sea: "Scary \u{1F43A}", land: "Gentle \u{1F411}" }, answerKey: "land" },
        { type: "pairs", prompt: "Match the sheep with their friends!", items: ["\u{1F411}", "\u{1F410}", "\u{1F415}"] },
      ],
    },
    {
      id: "children",
      name: "Jesus Loves the Children",
      ref: "Mark 10:14",
      verse: "Suffer the little children to come unto me, and forbid them not.",
      icon: "\u{1F476}",
      rounds: [
        { type: "tapall", prompt: "Jesus loves every child. Tap all the children!", target: "\u{1F467}", filler: ["\u{1F333}", "\u{1F33C}"], count: 5, total: 9 },
        { type: "pick", prompt: "Jesus loves you! Tap the heart!", answer: "❤️", others: ["⭐", "\u{1F338}", "\u{1F31E}"] },
        { type: "count", prompt: "Tap three hearts for Jesus!", item: "\u{1F49B}", n: 3 },
        { type: "find", prompt: "One child is hiding. Find the little one!", target: "\u{1F476}", filler: "\u{1F33B}", size: 9 },
        { type: "pick", prompt: "We can talk to Jesus in prayer. Tap the praying hands!", answer: "\u{1F64F}", others: ["\u{1F44B}", "\u{1F91D}", "\u{1F44D}"] },
        { type: "sort", prompt: "Does Jesus love little ones?", item: "\u{1F476}", answer: "land", labels: { sea: "No \u{1F614}", land: "Yes! ❤️" }, answerKey: "land" },
        { type: "pairs", prompt: "Match the happy faces!", items: ["\u{1F600}", "\u{1F60A}", "\u{1F970}"] },
      ],
    },
    {
      id: "daniel",
      name: "Daniel and the Lions",
      ref: "Daniel 6:22",
      verse: "My God hath sent his angel, and hath shut the lions' mouths.",
      icon: "\u{1F981}",
      rounds: [
        { type: "pick", prompt: "Daniel was thrown in with the lions. Tap the lion!", answer: "\u{1F981}", others: ["\u{1F42E}", "\u{1F407}", "\u{1F437}"] },
        { type: "count", prompt: "The lions were quiet. Tap three lions!", item: "\u{1F981}", n: 3 },
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
      rounds: [
        { type: "find", prompt: "Baby Moses floated in a basket. Find the basket!", target: "\u{1F9FA}", filler: "\u{1F33E}", size: 9 },
        { type: "pick", prompt: "The basket floated on the river. Tap the water!", answer: "\u{1F4A7}", others: ["\u{1F525}", "\u{1F33B}", "\u{1FAA8}"] },
        { type: "pick", prompt: "A princess found the baby. Tap the baby!", answer: "\u{1F476}", others: ["\u{1F418}", "\u{1F431}", "\u{1F338}"] },
        { type: "count", prompt: "Tap three reeds by the river!", item: "\u{1F33E}", n: 3 },
        { type: "sort", prompt: "Where does a frog live?", item: "\u{1F438}", answer: "sea", labels: { sea: "River \u{1F4A7}", land: "Desert \u{1F335}" }, answerKey: "sea" },
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
      rounds: [
        { type: "pick", prompt: "Love is a fruit of the Spirit. Tap the heart!", answer: "❤️", others: ["\u{1F34E}", "\u{1F34C}", "\u{1F347}"] },
        { type: "pick", prompt: "Joy is a fruit of the Spirit. Tap the happy face!", answer: "\u{1F600}", others: ["\u{1F622}", "\u{1F620}", "\u{1F634}"] },
        { type: "tapall", prompt: "Good fruit grows! Tap all the apples!", target: "\u{1F34E}", filler: ["\u{1F33F}", "\u{1F333}"], count: 5, total: 9 },
        { type: "count", prompt: "Tap four bananas!", item: "\u{1F34C}", n: 4 },
        { type: "pairs", prompt: "Match the fruit!", items: ["\u{1F34E}", "\u{1F34C}", "\u{1F347}"] },
        { type: "pick", prompt: "Peace is a fruit of the Spirit. Tap the dove!", answer: "\u{1F54A}️", others: ["\u{1F981}", "\u{1F40A}", "\u{1F98A}"] },
        { type: "sort", prompt: "Is being kind good or bad?", item: "\u{1F91D}", answer: "land", labels: { sea: "Bad \u{1F614}", land: "Good \u{1F31F}" }, answerKey: "land" },
      ],
    },
  ];

  const ROUNDS_PER_GAME = 5;

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

  function dayOfYear(d) {
    const start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000);
  }

  function storyForDay(date) {
    const d = date || new Date();
    return STORIES[(dayOfYear(d) + d.getFullYear()) % STORIES.length];
  }

  /* ---------- sound ---------- */

  let audio = null;
  function ctx() {
    if (audio) return audio;
    try {
      audio = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      audio = null;
    }
    return audio;
  }
  function tone(freq, ms, type, delay) {
    try {
      const c = ctx();
      if (!c) return;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || "sine";
      o.frequency.value = freq;
      o.connect(g);
      g.connect(c.destination);
      const t = c.currentTime + (delay || 0) / 1000;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      o.start(t);
      o.stop(t + ms / 1000 + 0.03);
    } catch (e) {
      /* no sound is fine */
    }
  }
  const SFX = {
    good: function () { tone(660, 130); tone(880, 180, "sine", 110); },
    miss: function () { tone(220, 160, "triangle"); },
    tap: function () { tone(520, 60, "sine"); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 220, "sine", i * 120); }); },
  };

  let muted = false;
  function say(text) {
    if (muted) return;
    try {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.9;
      u.pitch = 1.05;
      window.speechSynthesis.speak(u);
    } catch (e) {
      /* fine */
    }
  }

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
    st.hits = 0;
    st.roundState = null;
    Router.refresh();
    setTimeout(function () { say(rounds[0].prompt); }, 250);
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
    if (!st.roundState) st.roundState = { done: [], picked: [], count: 0, wrong: null, solved: false };
    return st.roundState;
  }

  function advance() {
    const st = S();
    st.hits++;
    st.roundState = null;
    if (st.idx + 1 >= st.rounds.length) {
      st.phase = "done";
      award();
      SFX.win();
      Router.refresh();
      setTimeout(function () { say("You did it, " + st.kid + "! " + st.story.verse); }, 300);
      return;
    }
    st.idx++;
    Router.refresh();
    const next = st.rounds[st.idx];
    setTimeout(function () { say(next.prompt); }, 300);
  }

  function good(then) {
    SFX.good();
    const rs = roundState();
    rs.solved = true;
    Router.refresh();
    setTimeout(then || advance, 650);
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
    say("Try again!");
  }

  /* One star per child per day, tracked in the same dated checks doc the
     cleaning list uses, under its own key. */
  function earnedKey(kid) {
    return "game:bible:" + kid;
  }
  function earnedToday(kid) {
    const c = Store.get("checks") || {};
    const day = c[Fmt.dayKey()] || {};
    return !!day[earnedKey(kid)];
  }
  function award() {
    const st = S();
    if (!st.kid || earnedToday(st.kid)) {
      st.earned = false;
      return;
    }
    const patch = {};
    patch[Fmt.dayKey()] = {};
    patch[Fmt.dayKey()][earnedKey(st.kid)] = true;
    Store.mergeDoc("checks", patch);
    if (typeof Rewards !== "undefined") Rewards.give(st.kid, 1, "Played the Bible game: " + st.story.name);
    st.earned = true;
  }

  /* ---------- rendering ---------- */

  function tile(glyph, opts) {
    const o = opts || {};
    const b = UI.h(
      "button",
      {
        class: "bg-tile" + (o.cls ? " " + o.cls : ""),
        type: "button",
        "aria-label": o.label || glyph,
        disabled: o.disabled ? true : null,
      },
      UI.h("span", { class: "bg-glyph", text: o.hidden ? "❓" : glyph })
    );
    if (o.onTap) b.addEventListener("click", o.onTap);
    return b;
  }

  function renderKidPicker(root) {
    const shop = typeof Rewards !== "undefined" ? Rewards.shop() || {} : {};
    const kids = shop.kids || [];
    const story = storyForDay(new Date());

    root.appendChild(
      UI.h(
        "div",
        { class: "page-head" },
        UI.h("div", { class: "eyebrow", text: "Today's Bible game" }),
        UI.h("div", { class: "title", text: story.name }),
        UI.h("div", { class: "sub", text: "“" + story.verse + "” — " + story.ref })
      )
    );

    root.appendChild(
      UI.h(
        "div",
        { class: "card bg-intro" },
        UI.h("div", { class: "bg-intro-icon", text: story.icon }),
        UI.h("div", { class: "bg-intro-text", text: "Five quick rounds. Every one is read out loud, so just listen and tap." }),
        UI.h("div", { class: "eyebrow", text: "Who's playing?" }),
        UI.h(
          "div",
          { class: "bg-kids" },
          kids.length
            ? kids.map(function (k) {
                const done = earnedToday(k.name);
                const b = UI.h(
                  "button",
                  { class: "bg-kid", type: "button" },
                  UI.h("span", { class: "bg-kid-emoji", text: k.emoji || "⭐" }),
                  UI.h("span", { class: "bg-kid-name", text: k.name }),
                  UI.h("span", { class: "bg-kid-sub", text: done ? "Star earned today ⭐" : "Earn a star ⭐" })
                );
                b.addEventListener("click", function () {
                  SFX.tap();
                  startGame(k.name, false);
                });
                return b;
              })
            : UI.h("p", { class: "muted", text: "Add the kids on the Stars tab first." })
        )
      )
    );
  }

  function renderPrompt(round) {
    const st = S();
    const total = st.rounds.length;
    const btn = UI.h("button", { class: "ibtn bg-say", type: "button", "aria-label": "Say it again" }, UI.icon("sound"));
    btn.addEventListener("click", function () { say(round.prompt); });
    return UI.h(
      "div",
      { class: "bg-prompt" },
      UI.h(
        "div",
        { class: "bg-progress", "aria-hidden": "true" },
        st.rounds.map(function (_, i) {
          return UI.h("span", { class: "bg-dot", "data-on": i < st.idx ? "done" : i === st.idx ? "now" : "" });
        })
      ),
      UI.h("div", { class: "bg-prompt-row" }, UI.h("p", { class: "bg-prompt-text", text: round.prompt }), btn),
      UI.h("div", { class: "tiny muted", text: "Round " + (st.idx + 1) + " of " + total })
    );
  }

  function renderPick(round) {
    const rs = roundState();
    return UI.h(
      "div",
      { class: "bg-grid bg-grid-2" },
      round.tiles.map(function (g, i) {
        const key = "t" + i;
        return tile(g, {
          cls: rs.solved && g === round.answer ? "bg-hit" : rs.wrong === key ? "bg-miss" : "",
          disabled: rs.solved,
          onTap: function () {
            if (g === round.answer) good();
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
        return tile(g, {
          cls: rs.solved && g === round.target ? "bg-hit" : rs.wrong === key ? "bg-miss" : "",
          disabled: rs.solved,
          onTap: function () {
            if (g === round.target) good();
            else miss(key);
          },
        });
      })
    );
  }

  function renderTapAll(round) {
    const rs = roundState();
    const need = round.count;
    return UI.h(
      "div",
      { class: "bg-stack" },
      UI.h("div", { class: "bg-counter nums", text: rs.done.length + " / " + need }),
      UI.h(
        "div",
        { class: "bg-grid bg-grid-3" },
        round.tiles.map(function (g, i) {
          const key = "t" + i;
          const gone = rs.done.indexOf(key) >= 0;
          return tile(g, {
            cls: gone ? "bg-gone" : rs.wrong === key ? "bg-miss" : "",
            disabled: gone || rs.solved,
            onTap: function () {
              if (g !== round.target) return miss(key);
              SFX.tap();
              rs.done.push(key);
              if (rs.done.length >= need) good();
              else Router.refresh();
            },
          });
        })
      )
    );
  }

  function renderCount(round) {
    const rs = roundState();
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
          return tile(g, {
            cls: gone ? "bg-counted" : "",
            disabled: gone || rs.solved,
            onTap: function () {
              rs.done.push(key);
              rs.count++;
              tone(440 + rs.count * 60, 90);
              say(String(rs.count));
              if (rs.count >= round.n) good();
              else Router.refresh();
            },
          });
        })
      )
    );
  }

  function renderPairs(round) {
    const rs = roundState();
    return UI.h(
      "div",
      { class: "bg-grid bg-grid-3" },
      round.tiles.map(function (g, i) {
        const key = "t" + i;
        const matched = rs.done.indexOf(key) >= 0;
        const faceUp = matched || rs.picked.indexOf(key) >= 0;
        return tile(g, {
          hidden: !faceUp,
          cls: matched ? "bg-hit" : faceUp ? "bg-up" : "bg-down",
          disabled: matched || rs.solved || (rs.picked.length >= 2),
          onTap: function () {
            if (rs.picked.indexOf(key) >= 0) return;
            SFX.tap();
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
                  if (r2.done.length >= round.tiles.length) return good();
                  SFX.good();
                } else {
                  SFX.miss();
                  r2.picked = [];
                }
                Router.refresh();
              }, 700);
            }
          },
        });
      })
    );
  }

  function renderSort(round) {
    const rs = roundState();
    const labels = round.labels || { sea: "Sea \u{1F30A}", land: "Land \u{1F333}" };
    const answer = round.answerKey || round.answer;
    return UI.h(
      "div",
      { class: "bg-stack" },
      UI.h("div", { class: "bg-sort-item", text: round.item }),
      UI.h(
        "div",
        { class: "bg-grid bg-grid-2" },
        ["sea", "land"].map(function (k) {
          const b = UI.h(
            "button",
            {
              class: "bg-tile bg-choice" + (rs.solved && k === answer ? " bg-hit" : rs.wrong === k ? " bg-miss" : ""),
              type: "button",
              disabled: rs.solved ? true : null,
            },
            UI.h("span", { class: "bg-choice-text", text: labels[k] })
          );
          b.addEventListener("click", function () {
            if (k === answer) good();
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
    const quit = UI.h("button", { class: "btn btn-sm", type: "button" }, "Done for now");
    quit.addEventListener("click", function () {
      st.phase = "kid";
      st.roundState = null;
      Router.refresh();
    });

    root.appendChild(
      UI.h(
        "div",
        { class: "bg-top" },
        UI.h("div", { class: "bg-who" }, UI.h("span", { class: "bg-story-icon", text: st.story.icon }), UI.h("span", { text: st.story.name + " · " + st.kid })),
        quit
      )
    );
    root.appendChild(renderPrompt(round));

    let board;
    if (round.type === "pick") board = renderPick(round);
    else if (round.type === "find") board = renderFind(round);
    else if (round.type === "tapall") board = renderTapAll(round);
    else if (round.type === "count") board = renderCount(round);
    else if (round.type === "pairs") board = renderPairs(round);
    else board = renderSort(round);
    root.appendChild(UI.h("div", { class: "card bg-board" }, board));
  }

  function renderDone(root) {
    const st = S();
    const again = UI.h("button", { class: "btn btn-primary btn-block", type: "button" }, "Play it again");
    again.addEventListener("click", function () { SFX.tap(); startGame(st.kid, true); });
    const other = UI.h("button", { class: "btn btn-block", type: "button" }, "Someone else's turn");
    other.addEventListener("click", function () { st.phase = "kid"; Router.refresh(); });
    const read = UI.h("button", { class: "btn btn-sm", type: "button" }, UI.icon("sound"), "Read the verse");
    read.addEventListener("click", function () { say(st.story.verse + ". " + st.story.ref); });

    root.appendChild(
      UI.h(
        "div",
        { class: "card bg-done" },
        UI.h("div", { class: "bg-confetti", "aria-hidden": "true" }, ["⭐", "✨", "\u{1F31F}", "⭐", "✨", "\u{1F31F}", "⭐", "✨"].map(function (g, i) {
          return UI.h("span", { class: "bg-conf", text: g, style: { left: (8 + i * 11.5) + "%", animationDelay: (i * 0.12) + "s" } });
        })),
        UI.h("div", { class: "bg-done-icon", text: st.story.icon }),
        UI.h("div", { class: "bg-done-title", text: "You did it, " + st.kid + "!" }),
        UI.h("div", {
          class: "bg-done-sub",
          text: st.earned ? "A star is in your jar ⭐" : "You already earned today's star — that was just for fun!",
        }),
        UI.h("p", { class: "bg-done-verse", text: "“" + st.story.verse + "”" }),
        UI.h("div", { class: "word-ref", text: st.story.ref + " (KJV)" }),
        read,
        UI.h("div", { class: "stack bg-done-actions" }, again, other)
      )
    );
  }

  function renderBible(root) {
    root.classList.add("bg-view");
    const st = S();
    if (st.phase === "play") return renderPlay(root);
    if (st.phase === "done") return renderDone(root);
    return renderKidPicker(root);
  }

  Router.on("bible", renderBible);

  return { storyForDay: storyForDay, stories: STORIES };
})();
