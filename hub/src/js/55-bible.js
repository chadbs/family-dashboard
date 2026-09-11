/* ============================================================
   Bible — play and learn, for Addison (nearly five) and Sophie (two).

   Three games, all built on the same eleven storybook pictures
   (data/pictures.js):

     Dot to dot  — join the numbers with a finger; the outline becomes
                   the picture.
     Mazes       — drag the character along a winding road to the goal.
     Jigsaws     — real interlocking pieces that snap into place.

   Why these three: at this age the finger *is* the game. Dragging,
   tracing and fitting are things a child does with their whole attention,
   and each one ends in a reveal — the ark appears, the shepherd reaches
   the sheep, the picture comes whole. The old version asked questions and
   waited for taps, which is a worksheet, not a game.

   Nothing is chosen by a difficulty switch. Each child has her own game
   (config.gameLevel): Sophie gets five big dots, a road with barely a turn
   in it, four fat puzzle pieces; Addison gets every number, a real maze,
   nine to sixteen pieces, and a catechism question at the end of each
   picture. Levels grow as she goes.

   Every picture ends the same way: its name, its KJV verse, one plain
   truth said out loud — and for Addison, one question about it.

   The games own their DOM and hand the same nodes back on every repaint,
   so a store poll mid-drag never restarts a puzzle.
   ============================================================ */

const PlayKit = (function () {
  const h = UI.h;
  const games = {};

  function register(id, def) {
    games[id] = def;
  }

  /* ---------- sound ---------- */

  let ac = null;
  let muted = false;
  const reduceMotion = (function () {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  })();

  function actx() {
    if (ac) return ac;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; }
    return ac;
  }

  function tone(freq, ms, type, delay, vol) {
    if (muted) return;
    try {
      const c = actx();
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
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      o.start(t);
      o.stop(t + ms / 1000 + 0.03);
    } catch (e) {
      /* no sound is fine */
    }
  }

  /* A major pentatonic scale: any run of notes sounds like a tune, so
     joining dots in order plays something pleasant. */
  const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

  const SFX = {
    tap: function () { tone(560, 60, "sine", 0, 0.08); },
    note: function (i) {
      const f = SCALE[i % SCALE.length] * (i >= SCALE.length ? 2 : 1);
      tone(f, 200, "triangle", 0, 0.11);
      tone(f * 2, 120, "sine", 18, 0.035);
    },
    miss: function () { tone(262, 110, "triangle", 0, 0.07); tone(220, 150, "triangle", 90, 0.06); },
    step: function (i) { tone(i % 2 ? 392 : 440, 45, "sine", 0, 0.045); },
    snap: function () { tone(880, 60, "square", 0, 0.04); tone(1318, 120, "sine", 45, 0.09); },
    chime: function () { [1047, 1319, 1568].forEach(function (f, i) { tone(f, 170, "sine", i * 70, 0.08); }); },
    good: function () { tone(659, 110, "sine", 0, 0.1); tone(988, 170, "sine", 90, 0.1); },
    win: function () {
      [523, 659, 784, 1047, 1319, 1568].forEach(function (f, i) { tone(f, 280, "triangle", i * 105, 0.1); });
    },
  };

  /* Say a line; `onEnd` runs when it has been said (or at once when the
     sound is off), so a finale can walk through its lines in order. */
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
     so the same morning never offers the same picture three times. */
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

  /* ---------- svg ---------- */

  const NS = "http://www.w3.org/2000/svg";
  function svg(viewBox, inner, cls) {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", viewBox);
    if (cls) s.setAttribute("class", cls);
    if (inner) s.innerHTML = inner;
    return s;
  }
  function node(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }
  function svgPoint(el, ev) {
    const m = el.getScreenCTM();
    if (!m) return { x: -999, y: -999 };
    const p = el.createSVGPoint();
    p.x = ev.clientX;
    p.y = ev.clientY;
    return p.matrixTransform(m.inverse());
  }
  const r2 = function (v) { return Math.round(v * 100) / 100; };

  /* ---------- mazes (shared by the maze game and its menu preview) ---------- */

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

  /* The road, as one path: a line between the centres of every pair of
     joined cells. Drawn thick with round ends it becomes a winding lane. */
  function mazeRoad(m, size) {
    let d = "";
    const c = function (i) { return [(i % m.cols) * size + size / 2, ((i / m.cols) | 0) * size + size / 2]; };
    for (let i = 0; i < m.open.length; i++) {
      const a = c(i);
      d += "M" + a[0] + " " + a[1] + "l0 0";
      if (m.open[i] & E) { const b = c(i + 1); d += "M" + a[0] + " " + a[1] + "L" + b[0] + " " + b[1]; }
      if (m.open[i] & S) { const b = c(i + m.cols); d += "M" + a[0] + " " + a[1] + "L" + b[0] + " " + b[1]; }
    }
    return d;
  }

  /* ---------- jigsaw piece outlines (shared by the game and its preview) ---------- */

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

  /* ---------- a burst of confetti over the play area ---------- */

  function confetti(host) {
    if (reduceMotion || !host) return;
    const c = document.createElement("canvas");
    c.className = "pk-confetti";
    host.appendChild(c);
    const w = host.clientWidth, hh = host.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = w * dpr;
    c.height = hh * dpr;
    const g = c.getContext("2d");
    if (!g) { c.remove(); return; }
    g.scale(dpr, dpr);
    const colours = ["#ef6f6c", "#f6a24b", "#ffd166", "#8fd18a", "#6fb6e8", "#9b7fd1", "#ffffff"];
    const bits = [];
    for (let i = 0; i < 110; i++) {
      bits.push({
        x: w / 2 + (Math.random() - 0.5) * w * 0.4,
        y: hh * 0.38,
        vx: (Math.random() - 0.5) * 11,
        vy: -Math.random() * 10 - 4,
        s: 3 + Math.random() * 4,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.35,
        c: colours[(Math.random() * colours.length) | 0],
        round: Math.random() < 0.35,
      });
    }
    const t0 = performance.now();
    (function frame(now) {
      const t = now - t0;
      g.clearRect(0, 0, w, hh);
      bits.forEach(function (p) {
        p.vy += 0.3;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.globalAlpha = Math.max(0, 1 - t / 2400);
        g.fillStyle = p.c;
        if (p.round) { g.beginPath(); g.arc(0, 0, p.s * 0.6, 0, Math.PI * 2); g.fill(); }
        else g.fillRect(-p.s, -p.s / 2.4, p.s * 2, p.s / 1.2);
        g.restore();
      });
      if (t < 2400 && c.isConnected) requestAnimationFrame(frame);
      else c.remove();
    })(t0);
  }

  /* ---------- the frame every game sits in ---------- */

  function muteButton() {
    const b = h("button", { class: "ibtn pk-mute", type: "button" });
    function paint() {
      b.textContent = "";
      b.appendChild(UI.icon(muted ? "mute" : "sound"));
      b.setAttribute("aria-label", muted ? "Turn the sound on" : "Turn the sound off");
      b.setAttribute("aria-pressed", muted ? "true" : "false");
    }
    b.addEventListener("click", function () {
      muted = !muted;
      if (muted) hush();
      paint();
    });
    paint();
    return b;
  }

  function frame(o) {
    const caption = h("div", { class: "pk-caption" });
    const back = h("button", { class: "ibtn pk-back", type: "button", "aria-label": "Back to the games" }, UI.icon("back"));
    back.addEventListener("click", function () { hush(); o.onBack(); });
    const top = h(
      "div",
      { class: "pk-top" },
      back,
      h("div", { class: "pk-titles" }, h("div", { class: "pk-title", text: o.title }), caption),
      muteButton()
    );
    const stage = h("div", { class: "pk-stage" });
    const root = h("div", { class: "pk-game pk-" + o.kind }, top, stage);
    let lastH = 0;

    /* Fill the screen below the header without making the page scroll:
       a drag that scrolls the page is a drag that lost the piece. */
    function fit() {
      const rect = stage.getBoundingClientRect();
      let reserve = 14;
      const bar = document.querySelector(".tabbar");
      if (bar) {
        const b = bar.getBoundingClientRect();
        if (b.top > window.innerHeight / 2) reserve += b.height;
      }
      const hgt = Math.max(400, Math.round(window.innerHeight - Math.max(0, rect.top) - reserve));
      stage.style.height = hgt + "px";
      const changed = hgt !== lastH;
      lastH = hgt;
      return changed;
    }

    return {
      root: root,
      stage: stage,
      caption: function (t) { caption.textContent = t || ""; },
      fit: fit,
    };
  }

  /* ---------- the end of every picture ---------- */

  /* The picture's name, the truth in it, and — for Addison — one question.
     The voice walks through them in order: what it is, what it means, and
     then the question, never talking over itself. */
  function celebrate(stage, o) {
    SFX.win();
    confetti(stage);
    let card = null;
    say(o.pic.said, function () {
      card = finale(stage, o);
      say(o.pic.truth, function () {
        if (card && card.isConnected && card._ask) card._ask();
      });
    });
  }

  function finale(stage, o) {
    const pic = o.pic;
    const card = h("div", { class: "pk-finale", role: "dialog", "aria-label": pic.name });

    const again = h("button", { class: "ibtn pk-hear", type: "button", "aria-label": "Hear it again" }, UI.icon("sound"));
    again.addEventListener("click", function () { say(pic.truth); });

    const next = h("button", { class: "btn btn-primary btn-block pk-next", type: "button" }, o.nextLabel || "Next picture");
    next.addEventListener("click", function () { hush(); SFX.tap(); o.onNext(); });
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
      const q = question(pic.q, function () { body.appendChild(actions); });
      body.appendChild(q.el);
      card._ask = q.ask;
    } else {
      body.appendChild(actions);
    }

    card.appendChild(body);
    stage.appendChild(card);
    return card;
  }

  /* One catechism question about the picture just finished. The wrong
     answers are plainly wrong on purpose; a near miss would teach the
     error. Getting it right is followed by the truth said in full. */
  function question(spec, onDone) {
    const opts = shuffle(spec.options.map(function (x) { return { text: x[0], ok: !!x[1] }; }));
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
          SFX.miss();
          b.classList.add("is-wrong");
          b.disabled = true;
          say("Have another think!");
          return;
        }
        SFX.good();
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
        teach.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
      });
      answers.appendChild(b);
    });
    block.appendChild(answers);

    return { el: block, ask: function () { say(spoken); } };
  }

  return {
    register: register,
    games: games,
    SFX: SFX,
    tone: tone,
    say: say,
    hush: hush,
    prefetch: prefetch,
    muted: function () { return muted; },
    numberWord: numberWord,
    hashStr: hashStr,
    rng: rng,
    shuffle: shuffle,
    rotation: rotation,
    todaysPicture: todaysPicture,
    svg: svg,
    node: node,
    svgPoint: svgPoint,
    maze: { gen: mazeGen, next: mazeNeighbour, distances: mazeDistances, road: mazeRoad, N: N, E: E, S: S, W: W },
    jigsaw: { path: piecePath, edges: jigsawEdges },
    confetti: confetti,
    frame: frame,
    celebrate: celebrate,
    reduceMotion: reduceMotion,
  };
})();

/* ============================================================
   The tab itself: who is playing, which game, and the game.
   ============================================================ */

(function () {
  const h = UI.h;
  const ORDER = ["dots", "maze", "jigsaw"];

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

  function toMenu() {
    const st = S();
    if (st.inst && st.inst.destroy) st.inst.destroy();
    st.inst = null;
    st.phase = "menu";
    PlayKit.hush();
    Router.refresh();
  }

  function startGame(id) {
    const st = S();
    const def = PlayKit.games[id];
    if (!def) return;
    if (st.inst && st.inst.destroy) st.inst.destroy();
    st.inst = def.create({ kid: st.kid, big: isBig(st.kid), onExit: toMenu });
    st.gameId = id;
    st.phase = "game";
    Voice.unlock();
    window.scrollTo(0, 0);
    Router.refresh();
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

    const list = kids();
    root.appendChild(
      h("div", { class: "pk-kids", "data-n": String(list.length) },
        list.map(function (k) {
          const big = isBig(k.name);
          const b = h("button", { class: "pk-kid", type: "button", "data-big": big ? "1" : "0" },
            h("span", { class: "pk-kid-face", text: k.emoji || "\u{2B50}" }),
            h("span", { class: "pk-kid-name", text: k.name }),
            h("span", { class: "pk-kid-sub", text: "Tap to play" }));
          b.addEventListener("click", function () {
            Voice.unlock();
            PlayKit.SFX.tap();
            st.kid = k.name;
            st.phase = "menu";
            window.scrollTo(0, 0);
            Router.refresh();
          });
          return b;
        }))
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
      h("div", { class: "pk-doors" },
        ORDER.filter(function (id) { return PlayKit.games[id]; }).map(function (id) {
          const def = PlayKit.games[id];
          const b = h("button", { class: "pk-door pk-door-" + id, type: "button" },
            h("span", { class: "pk-door-art" }, def.preview()),
            h("span", { class: "pk-door-body" },
              h("span", { class: "pk-door-title", text: def.title }),
              h("span", { class: "pk-door-sub", text: big ? def.blurbBig : def.blurbLittle })),
            UI.icon("chevron"));
          b.addEventListener("click", function () { PlayKit.SFX.tap(); startGame(id); });
          return b;
        }))
    );
  }

  /* ---------- the game ---------- */

  function renderGame(root) {
    const st = S();
    if (!st.inst) { st.phase = "menu"; return renderMenu(root); }
    root.classList.add("pk-view-game");
    const host = h("div", { class: "pk-host" });
    root.appendChild(host);
    st.inst.mount(host);
  }

  function render(root) {
    root.classList.add("pk-view");
    const st = S();
    if (st.phase === "game") return renderGame(root);
    if (st.phase === "menu" && st.kid) return renderMenu(root);
    return renderKids(root);
  }

  Router.on("bible", render);
})();
