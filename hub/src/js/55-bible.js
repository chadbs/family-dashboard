/* ============================================================
   Bible — play & learn, for Addison (nearly five) and Sophie (two).

   Four games, played full-screen on a real game engine (Phaser, loaded
   only when a game opens — see 56-engine.js):

     Two by Two  — lead the animals up the gangplank into Noah's ark;
                   then the LORD shuts the door, the rain comes, the ark
                   floats, the dove flies and the rainbow comes out.
     Join the dots — draw a glowing line through the stars and the
                   picture blooms out of the night.
     Mazes       — walk the shepherd through the hedges to his lost sheep.
     Jigsaws     — real cardboard pieces that lift, tilt and snap home.

   Every game ends on a Bible picture: its name and KJV verse, one plain
   truth said out loud, and for Addison a catechism question — saved by
   grace not works, God chose first, the shepherd seeks the sheep.

   No stars, no score, no difficulty switch. Each child simply has her own
   version (config.gameLevel); the games get bigger as she goes.

   This file is the tab itself (who's playing, which game) and the kit the
   games share: the voice, the catechism card, and the geometry for mazes
   and jigsaw pieces.
   ============================================================ */

const PlayKit = (function () {
  const h = UI.h;
  const games = {};

  function register(id, def) {
    games[id] = def;
  }

  const reduceMotion = (function () {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  })();

  /* ---------- the voice ---------- */

  let muted = false;
  try { muted = localStorage.getItem("pk-muted") === "1"; } catch (e) { /* fine */ }

  function setMuted(v) {
    muted = !!v;
    try { localStorage.setItem("pk-muted", muted ? "1" : "0"); } catch (e) { /* fine */ }
    if (muted) Voice.hush();
  }

  /* Say a line; `onEnd` runs when it has been said (or at once when the
     sound is off), so a sequence of lines never talks over itself. */
  function say(text, onEnd) {
    if (muted || !text) {
      if (onEnd) setTimeout(onEnd, 250);
      return;
    }
    Voice.speak(text, { rate: 1, onEnd: onEnd });
  }
  function hush() { Voice.hush(); }
  function prefetch(lines) {
    if (muted) return;
    (lines || []).forEach(function (t) { if (t) Voice.prefetch(t); });
  }

  /* ---------- numbers and chance ---------- */

  const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
  function numberWord(n) { return NUMBER_WORDS[n] || String(n); }

  function hashStr(s) {
    let x = 2166136261;
    for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }
  /* mulberry32: small, good enough, repeatable from a seed. */
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
    const rand = r || Math.random;
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* Today's place in the rotation. Each game starts somewhere different,
     so one morning never offers the same picture three times. */
  function dayIndex() {
    const d = new Date();
    return Word.dayOfYear(d) + d.getFullYear() * 3;
  }
  function rotation(list, offset) {
    const n = list.length;
    const start = (((dayIndex() + (offset || 0)) % n) + n) % n;
    return list.slice(start).concat(list.slice(0, start));
  }
  function todaysPicture() {
    return rotation(PICTURES, 0)[0];
  }

  function svg(viewBox, inner, cls) {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", viewBox);
    /* game art fills its tile edge to edge */
    if (cls === "pk-tile-svg") s.setAttribute("preserveAspectRatio", "xMidYMid slice");
    if (cls) s.setAttribute("class", cls);
    if (inner) s.innerHTML = inner;
    return s;
  }
  const r2 = function (v) { return Math.round(v * 100) / 100; };

  /* ---------- mazes ---------- */

  const N = 1, E = 2, S = 4, W = 8;

  /* A perfect maze — exactly one road between any two places — by the
     depth-first "backtracker", which gives long winding corridors rather
     than a field of short stubs. */
  function mazeGen(cols, rows, rand) {
    const total = cols * rows;
    const open = new Array(total).fill(0);
    const seen = new Array(total).fill(false);
    const first = Math.floor(rand() * total);
    const stack = [first];
    seen[first] = true;
    while (stack.length) {
      const cur = stack[stack.length - 1];
      const x = cur % cols, y = (cur / cols) | 0;
      const next = [];
      if (y > 0 && !seen[cur - cols]) next.push([cur - cols, N, S]);
      if (x < cols - 1 && !seen[cur + 1]) next.push([cur + 1, E, W]);
      if (y < rows - 1 && !seen[cur + cols]) next.push([cur + cols, S, N]);
      if (x > 0 && !seen[cur - 1]) next.push([cur - 1, W, E]);
      if (!next.length) { stack.pop(); continue; }
      const o = next[Math.floor(rand() * next.length)];
      open[cur] |= o[1];
      open[o[0]] |= o[2];
      seen[o[0]] = true;
      stack.push(o[0]);
    }
    return { cols: cols, rows: rows, open: open };
  }

  function mazeNeighbour(m, cell, dir) {
    if (!(m.open[cell] & dir)) return -1;
    if (dir === N) return cell - m.cols;
    if (dir === S) return cell + m.cols;
    if (dir === E) return cell + 1;
    return cell - 1;
  }

  function mazeDistances(m, from) {
    const dist = new Array(m.open.length).fill(-1);
    const q = [from];
    dist[from] = 0;
    while (q.length) {
      const c = q.shift();
      [N, E, S, W].forEach(function (d) {
        const nb = mazeNeighbour(m, c, d);
        if (nb >= 0 && dist[nb] < 0) { dist[nb] = dist[c] + 1; q.push(nb); }
      });
    }
    return dist;
  }

  /* The way from one cell to another, cell by cell. */
  function mazeWay(m, from, to) {
    const prev = new Array(m.open.length).fill(-1);
    const q = [from];
    prev[from] = from;
    while (q.length) {
      const c = q.shift();
      if (c === to) break;
      [N, E, S, W].forEach(function (d) {
        const nb = mazeNeighbour(m, c, d);
        if (nb >= 0 && prev[nb] < 0) { prev[nb] = c; q.push(nb); }
      });
    }
    const way = [];
    for (let c = to; c !== from && c >= 0; c = prev[c]) way.push(c);
    way.push(from);
    return way.reverse();
  }

  /* ---------- jigsaw piece outlines ---------- */

  /* One edge of a piece, from (x0,y0) to (x1,y1). s = +1 puts a knob
     outward, -1 a socket inward, 0 leaves it flat. The knob is symmetric,
     so the two pieces sharing a seam draw exactly the same curve. */
  function edgePath(x0, y0, x1, y1, s, H) {
    if (!s) return " L" + r2(x1) + " " + r2(y1);
    const L = Math.hypot(x1 - x0, y1 - y0);
    const dx = (x1 - x0) / L, dy = (y1 - y0) / L;
    const nx = dy, ny = -dx;
    const P = function (u, v) {
      return r2(x0 + dx * u * L + nx * v * H * s) + " " + r2(y0 + dy * u * L + ny * v * H * s);
    };
    return " L" + P(0.36, 0) +
      " C" + P(0.4, 0) + " " + P(0.42, 0.25) + " " + P(0.39, 0.45) +
      " C" + P(0.34, 0.75) + " " + P(0.42, 1) + " " + P(0.5, 1) +
      " C" + P(0.58, 1) + " " + P(0.66, 0.75) + " " + P(0.61, 0.45) +
      " C" + P(0.58, 0.25) + " " + P(0.6, 0) + " " + P(0.64, 0) +
      " L" + r2(x1) + " " + r2(y1);
  }

  function piecePath(x0, y0, w, hgt, e, H) {
    return "M" + r2(x0) + " " + r2(y0) +
      edgePath(x0, y0, x0 + w, y0, e.t, H) +
      edgePath(x0 + w, y0, x0 + w, y0 + hgt, e.r, H) +
      edgePath(x0 + w, y0 + hgt, x0, y0 + hgt, e.b, H) +
      edgePath(x0, y0 + hgt, x0, y0, e.l, H) + " Z";
  }

  /* Which way every seam's knob points, for a cols x rows cut. */
  function jigsawEdges(cols, rows, rand) {
    const hs = [], vs = [];
    for (let y = 0; y < rows; y++) {
      hs.push([]); vs.push([]);
      for (let x = 0; x < cols; x++) {
        hs[y].push(rand() < 0.5 ? 1 : -1);
        vs[y].push(rand() < 0.5 ? 1 : -1);
      }
    }
    return function (x, y) {
      return {
        t: y === 0 ? 0 : -hs[y - 1][x],
        b: y === rows - 1 ? 0 : hs[y][x],
        l: x === 0 ? 0 : -vs[y][x - 1],
        r: x === cols - 1 ? 0 : vs[y][x],
      };
    };
  }

  /* ---------- the card at the end of every picture ---------- */

  /* The picture's name, the verse, the truth in it — and for Addison one
     question about it. Built in the page rather than the game, so the
     words are real text: crisp, selectable, read by a screen reader. */
  function finale(host, o) {
    const pic = o.pic;
    const card = h("div", { class: "pk-finale", role: "dialog", "aria-label": pic.name });

    const again = h("button", { class: "ibtn pk-hear", type: "button", "aria-label": "Hear it again" }, UI.icon("sound"));
    again.addEventListener("click", function () { say(pic.truth); });

    const next = h("button", { class: "btn btn-primary btn-block pk-next", type: "button" }, o.nextLabel || "Play again");
    next.addEventListener("click", function () { hush(); o.onNext(); });
    const menu = h("button", { class: "btn btn-block pk-other", type: "button" }, "Choose another game");
    menu.addEventListener("click", function () { hush(); o.onMenu(); });
    const actions = h("div", { class: "pk-fin-actions" }, next, menu);

    const body = h(
      "div",
      { class: "pk-fin-body" },
      h("div", { class: "pk-fin-head" }, h("div", { class: "pk-fin-name", text: pic.name }), again),
      h("p", { class: "pk-fin-verse", text: "“" + pic.verse + "”" }),
      h("div", { class: "word-ref", text: pic.ref + " (KJV)" }),
      h("p", { class: "pk-fin-truth", text: pic.truth })
    );

    if (o.big && pic.q) {
      const q = question(pic.q, o, function () { body.appendChild(actions); });
      body.appendChild(q.el);
      card._ask = q.ask;
    } else {
      body.appendChild(actions);
    }

    card.appendChild(body);
    host.appendChild(card);
    return card;
  }

  /* One catechism question about the picture just finished. The wrong
     answers are plainly wrong on purpose; a near miss would teach the
     error. Getting it right is followed by the truth said in full.

     The order is shuffled but the same every time for a given question,
     so the voice and the buttons always agree and each question is one
     voice clip, synthesised (and paid for) once. */
  function question(spec, o, onDone) {
    const opts = shuffle(spec.options.map(function (x) { return { text: x[0], ok: !!x[1] }; }), rng(hashStr(spec.q)));
    const block = h("div", { class: "pk-q" });
    const spoken = spec.q + " Is it: " + opts.map(function (x) { return x.text; }).join("? Or: ") + "?";

    const replay = h("button", { class: "ibtn pk-hear", type: "button", "aria-label": "Say the question again" }, UI.icon("sound"));
    replay.addEventListener("click", function () { say(spoken); });

    block.appendChild(h("div", { class: "pk-q-head" }, h("div", { class: "pk-q-label", text: "A question" }), replay));
    block.appendChild(h("div", { class: "pk-q-text", text: spec.q }));

    const answers = h("div", { class: "pk-q-answers" });
    opts.forEach(function (x) {
      const b = h("button", { class: "pk-q-answer", type: "button" }, x.text);
      b.addEventListener("click", function () {
        if (!x.ok) {
          if (o.onWrong) o.onWrong();
          b.classList.add("is-wrong");
          b.disabled = true;
          say("Have another think!");
          return;
        }
        if (o.onRight) o.onRight();
        answers.querySelectorAll("button").forEach(function (y) { y.disabled = true; });
        b.classList.add("is-right");
        const teach = h(
          "div",
          { class: "pk-q-teach" },
          h("p", { text: spec.teach }),
          spec.ref ? h("div", { class: "word-ref", text: spec.ref }) : null
        );
        block.appendChild(teach);
        say(spec.teach);
        onDone();
        scrollDown(block.closest(".pk-finale"));
      });
      answers.appendChild(b);
    });
    block.appendChild(answers);

    return {
      el: block,
      /* By the time the question is asked, the name and verse have been
         said; roll the card up so every answer is in reach without her
         having to know that a card can scroll. */
      ask: function () {
        scrollDown(block.closest(".pk-finale"));
        say(spoken);
      },
    };
  }

  function scrollDown(card) {
    if (!card) return;
    card.scrollTo({ top: card.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
    /* A smooth scroll can be cut short (a hidden tab never animates it at
       all); make sure it arrives. */
    setTimeout(function () {
      if (card.scrollTop < card.scrollHeight - card.clientHeight - 2) card.scrollTop = card.scrollHeight;
    }, 700);
  }

  return {
    register: register,
    games: games,
    say: say,
    hush: hush,
    prefetch: prefetch,
    muted: function () { return muted; },
    setMuted: setMuted,
    numberWord: numberWord,
    hashStr: hashStr,
    rng: rng,
    shuffle: shuffle,
    rotation: rotation,
    todaysPicture: todaysPicture,
    svg: svg,
    maze: { gen: mazeGen, next: mazeNeighbour, distances: mazeDistances, way: mazeWay, N: N, E: E, S: S, W: W },
    jigsaw: { path: piecePath, edges: jigsawEdges },
    finale: finale,
    reduceMotion: reduceMotion,
  };
})();

/* ============================================================
   The tab itself: who is playing, then which game.
   ============================================================ */

(function () {
  const h = UI.h;
  const ORDER = ["ark", "dots", "maze", "jigsaw"];

  function S() {
    if (!UI.state.play) UI.state.play = { phase: "kid" };
    return UI.state.play;
  }

  /* Addison is nearly five and gets the older game; Sophie is two. The
     setting lives in config so it can change when they grow, with no
     switch on the screen for anyone to get wrong. */
  function isBig(name) {
    const cfg = Store.get("config") || {};
    const set = (cfg.gameLevel || {})[name];
    if (set === "big") return true;
    if (set === "little") return false;
    const age = (cfg.kidAges || {})[name];
    return typeof age === "number" ? age >= 4 : false;
  }

  function kids() {
    const shop = typeof Rewards !== "undefined" ? Rewards.shop() || {} : {};
    const list = (shop.kids || []).filter(function (k) { return k && k.name; });
    return list.length ? list : [{ name: "Addison", emoji: "\u{1F430}" }, { name: "Sophie", emoji: "\u{1F422}" }];
  }

  function startGame(id) {
    const st = S();
    const def = PlayKit.games[id];
    if (!def || typeof Engine === "undefined") return;
    Voice.unlock();
    Engine.open(def, { kid: st.kid, big: isBig(st.kid) });
  }

  /* ---------- who's playing ---------- */

  function renderKids(root) {
    const st = S();
    const pic = PlayKit.todaysPicture();

    root.appendChild(
      h("div", { class: "page-head" },
        h("div", { class: "eyebrow", text: "Play & learn" }),
        h("div", { class: "title", text: "Who's playing?" }))
    );

    const list = kids();
    root.appendChild(
      h("div", { class: "pk-kids", "data-n": String(list.length) },
        list.map(function (k, i) {
          const b = h("button", { class: "pk-kid pk-kid-" + (i % 4), type: "button" },
            h("span", { class: "pk-kid-face", text: k.emoji || "\u{2B50}" }),
            h("span", { class: "pk-kid-name", text: k.name }),
            h("span", { class: "pk-kid-sub", text: "Let's play!" }));
          b.addEventListener("click", function () {
            Voice.unlock();
            st.kid = k.name;
            st.phase = "menu";
            window.scrollTo(0, 0);
            Router.refresh();
          });
          return b;
        }))
    );

    const art = PlayKit.svg("0 0 100 100", picMarkup(pic), "pk-hero-art");
    const hear = h("button", { class: "ibtn pk-hear", type: "button", "aria-label": "Hear today's verse" }, UI.icon("sound"));
    hear.addEventListener("click", function () { PlayKit.say(pic.verse + " " + pic.ref.replace(/(\d+):(\d+)/, "$1 verse $2") + "."); });
    root.appendChild(
      h("div", { class: "card pk-hero" },
        h("div", { class: "pk-hero-frame" }, art),
        h("div", { class: "pk-hero-text" },
          h("div", { class: "pk-hero-head" }, h("div", { class: "eyebrow", text: "Today's picture" }), hear),
          h("div", { class: "pk-hero-name", text: pic.name }),
          h("p", { class: "pk-hero-verse", text: "“" + pic.verse + "”" }),
          h("div", { class: "word-ref", text: pic.ref + " (KJV)" })))
    );
  }

  /* ---------- which game ---------- */

  function renderMenu(root) {
    const st = S();
    const big = isBig(st.kid);
    const back = h("button", { class: "ibtn", type: "button", "aria-label": "Back" }, UI.icon("back"));
    back.addEventListener("click", function () { st.phase = "kid"; Router.refresh(); });

    root.appendChild(
      h("div", { class: "pk-menu-head" },
        back,
        h("div", {},
          h("div", { class: "eyebrow", text: st.kid + " is playing" }),
          h("div", { class: "title", text: "Pick a game" })))
    );

    root.appendChild(
      h("div", { class: "pk-tiles" },
        ORDER.filter(function (id) { return PlayKit.games[id]; }).map(function (id, i) {
          const def = PlayKit.games[id];
          const b = h("button", { class: "pk-tile pk-tile-" + id + (i === 0 ? " is-hero" : ""), type: "button" },
            h("span", { class: "pk-tile-art" }, def.preview()),
            h("span", { class: "pk-tile-body" },
              h("span", { class: "pk-tile-title", text: def.title }),
              h("span", { class: "pk-tile-sub", text: big ? def.blurbBig : def.blurbLittle })),
            h("span", { class: "pk-tile-play", "aria-hidden": "true" }, UI.icon("chevron")));
          b.addEventListener("click", function () { startGame(id); });
          return b;
        }))
    );
  }

  function render(root) {
    root.classList.add("pk-view");
    const st = S();
    if (st.phase === "menu" && st.kid) return renderMenu(root);
    return renderKids(root);
  }

  Router.on("bible", render);
})();
