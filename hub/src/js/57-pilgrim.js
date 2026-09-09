/* ============================================================
   The Pilgrim's Walk — Addison's game.

   A first-person walk down the road of Bunyan's Pilgrim's Progress, in
   three lanes, steered by swiping left and right. She is nearly five, so
   it is a real game: it moves, it has stations, and it can be finished.

   THE MECHANIC IS THE DOCTRINE. Christian starts out carrying a burden.
   Nothing she collects will take it off, and the game never offers her a
   way to earn it off — because there isn't one. At the Cross it falls
   from his back by itself, and only then does the walk change: from that
   point she is gathering fruit, not paying a debt. Bunyan put it exactly
   that way, and it is the whole of Reformed soteriology in a thing a
   child can feel with her thumb.

   Nothing here can be failed. Stumbling costs a moment and a wobble; the
   road always goes on. Between stations a gate asks a catechism question
   from the same set the rest of the tab uses.

   The module owns its canvas and its HUD and hands the same nodes back
   every time it is mounted, so the app repainting around it (a store
   poll, a route refresh) never restarts the walk.
   ============================================================ */

const Pilgrim = (function () {
  const THREE_SRC = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
  const LANES = [-2.5, 0, 2.5];
  const SPEED = 9.5;          /* units a second, a comfortable walk */
  const STUMBLE_MS = 700;

  /* ---------- the road ---------- */

  const STAGES = [
    {
      id: "slough",
      name: "The Slough of Despond",
      line: "Christian set out with a heavy burden on his back. And he fell into the bog called Despond, and could not get out by trying.",
      hint: "Swipe to keep out of the pits!",
      avoid: ["\u{1F573}️"], collect: [],
      ground: "#4e5f52", sky: 0x8fa199, length: 165,
    },
    {
      id: "gate",
      name: "The Wicket Gate",
      line: "A shining one told him: go to the narrow gate, and the light of the Word will show you the way.",
      hint: "Gather the Word!",
      avoid: ["\u{1F573}️"], collect: ["\u{1F4D6}"],
      ground: "#5b6a80", sky: 0xa3b4cc, length: 165,
    },
    {
      id: "hill",
      name: "The Hill Difficulty",
      line: "The way went up, and it was steep. Christian went up on his hands and knees, and prayed as he climbed.",
      hint: "Gather prayers as you climb!",
      avoid: ["\u{1FAA8}"], collect: ["\u{1F64F}"],
      ground: "#8a7355", sky: 0xd9c49c, length: 175,
    },
    {
      id: "vanity",
      name: "Vanity Fair",
      line: "The road went straight through a fair, where they sold every glittering thing. Christian would not buy any of it.",
      hint: "Don't take the shiny things!",
      avoid: ["\u{1F4B0}", "\u{1F451}", "\u{1F48E}"], collect: ["\u{1F4D6}"],
      ground: "#6d5480", sky: 0xae90bf, length: 175,
    },
    {
      id: "mountains",
      name: "The Delectable Mountains",
      line: "At last he came to green mountains, with gardens and orchards, and there the shepherds fed their flocks.",
      hint: "Gather the fruit of the Spirit!",
      avoid: [], collect: ["\u{1F34E}", "\u{1F347}", "\u{1F34A}"],
      ground: "#4f8a58", sky: 0xaedab4, length: 175,
    },
  ];

  /* Bunyan's own moment, and the question that belongs to it. */
  const CROSS = {
    line:
      "He came up to a cross, and his burden loosed from off his shoulders, and fell, and he saw it no more. " +
      "He had not taken it off. He could not.",
    q: "Who took your burden away?",
    options: [
      ["✝️", "Jesus did", 1],
      ["\u{1F4AA}", "I did, by trying hard", 0],
      ["\u{1F340}", "It just fell off by luck", 0],
    ],
    teach:
      "Christian did not work his burden off, and neither do we. It fell at the cross. " +
      "By grace are ye saved through faith; it is the gift of God.",
    ref: "Ephesians 2:8",
  };

  const CITY = {
    name: "The Celestial City",
    line: "And the gates were opened to him, and all the bells of the city rang for joy.",
    verse: "And God shall wipe away all tears from their eyes.",
    ref: "Revelation 21:4",
  };

  /* ---------- module-wide handles, made once ---------- */

  let three = "idle";          /* idle | loading | ready | failed */
  let host = null, canvas = null, hud = null, opts = {};
  let renderer = null, scene = null, camera = null;
  let ground = null, groundTex = null, burdenSprite = null;
  let items = [], scenery = [];
  let raf = null, last = 0, muted = false;
  let S = null;                /* the run */
  let els = {};                /* HUD element handles */

  /* ---------- sound ---------- */

  let ac = null;
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
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || "sine";
      o.frequency.value = freq;
      o.connect(g); g.connect(c.destination);
      const t = c.currentTime + (delay || 0) / 1000;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.14, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      o.start(t); o.stop(t + ms / 1000 + 0.03);
    } catch (e) { /* silence is fine */ }
  }
  const SFX = {
    take: function () { tone(760, 90, "sine", 0, 0.12); tone(1010, 120, "sine", 70, 0.1); },
    trip: function () { tone(190, 200, "triangle", 0, 0.12); },
    step: function () { tone(120, 40, "sine", 0, 0.05); },
    gate: function () { [523, 659, 784].forEach(function (f, i) { tone(f, 200, "sine", i * 110, 0.11); }); },
    cross: function () { [392, 523, 659, 784, 1047].forEach(function (f, i) { tone(f, 420, "sine", i * 150, 0.12); }); },
    win: function () { [523, 659, 784, 1047, 1319, 1047, 1319].forEach(function (f, i) { tone(f, 300, "sine", i * 140, 0.13); }); },
  };
  function say(text) {
    if (muted) return;
    Voice.speak(text, { rate: 1 });
  }

  /* ---------- textures ---------- */

  const glyphCache = {};
  function glyphTexture(ch) {
    if (glyphCache[ch]) return glyphCache[ch];
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = '96px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif';
    g.fillText(ch, 64, 70);
    const t = new THREE.CanvasTexture(c);
    glyphCache[ch] = t;
    return t;
  }

  /* The road, painted across the width of the plane: grass verges, a lighter
     track, and dashed dividers so the three lanes are obvious at a glance —
     she has to see which lane a thing is in before she can swipe to it.
     The plane is 16 wide and the lanes sit at -2.5 / 0 / +2.5, so the track
     runs from u=14/64 to u=50/64 and the dividers land at 27 and 37. */
  function makeGroundTexture(colour) {
    const c = document.createElement("canvas");
    c.width = 64; c.height = 128;
    const g = c.getContext("2d");

    g.fillStyle = shade(colour, -0.22);          /* verge */
    g.fillRect(0, 0, 64, 128);
    g.fillStyle = colour;                         /* the track */
    g.fillRect(14, 0, 36, 128);
    g.fillStyle = shade(colour, 0.10);            /* worn middle */
    g.fillRect(16, 0, 32, 128);

    /* cross-grain, so the speed reads */
    g.fillStyle = "rgba(0,0,0,0.07)";
    g.fillRect(14, 0, 36, 8);
    g.fillStyle = "rgba(255,255,255,0.05)";
    g.fillRect(14, 64, 36, 6);

    /* lane dividers */
    g.fillStyle = "rgba(255,255,255,0.34)";
    [27, 37].forEach(function (x) {
      g.fillRect(x, 10, 2, 44);
      g.fillRect(x, 74, 2, 44);
    });
    /* road edges */
    g.fillStyle = "rgba(255,255,255,0.22)";
    g.fillRect(14, 0, 2, 128);
    g.fillRect(48, 0, 2, 128);

    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 18);
    return t;
  }

  /* Lighten or darken a #rrggbb by a fraction. */
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = function (v) { return Math.max(0, Math.min(255, Math.round(v + 255 * amt))); };
    return "rgb(" + f((n >> 16) & 255) + "," + f((n >> 8) & 255) + "," + f(n & 255) + ")";
  }

  function sprite(ch, size) {
    const m = new THREE.SpriteMaterial({ map: glyphTexture(ch), transparent: true, depthWrite: false });
    const s = new THREE.Sprite(m);
    s.scale.set(size, size, 1);
    return s;
  }

  /* ---------- the scene ---------- */

  function build() {
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    canvas = renderer.domElement;
    canvas.className = "pw-canvas";

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(72, 1, 0.1, 70);
    camera.position.set(0, 1.55, 0);
    scene.add(camera);

    groundTex = makeGroundTexture("#3d4a42");
    ground = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 140),
      new THREE.MeshBasicMaterial({ map: groundTex })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, -60);
    scene.add(ground);

    /* Trees down both verges, recycled forever, purely to sell the speed. */
    for (let i = 0; i < 18; i++) {
      const s = sprite(i % 3 === 0 ? "\u{1F332}" : "\u{1F333}", 3.4);
      s.position.set((i % 2 ? 1 : -1) * (5.5 + Math.random() * 2), 1.7, -i * 7 - Math.random() * 4);
      scene.add(s);
      scenery.push(s);
    }

    /* The burden rides on the camera, low and to the right, the way a pack
       sits in the corner of your eye. */
    burdenSprite = sprite("\u{1F392}", 1.15);
    burdenSprite.position.set(0.95, -0.72, -1.6);
    camera.add(burdenSprite);

    bindInput();
  }

  function resize() {
    if (!renderer || !host) return;
    const w = host.clientWidth || 360;
    const h = host.clientHeight || 480;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ---------- input: swipe, tap, arrow keys ---------- */

  let touchX = 0, touchY = 0, touching = false;

  function bindInput() {
    canvas.addEventListener("touchstart", function (e) {
      touching = true;
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    }, { passive: true });

    canvas.addEventListener("touchend", function (e) {
      if (!touching) return;
      touching = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchX;
      const dy = t.clientY - touchY;
      /* A five-year-old's swipe is not a straight line. Be generous, and
         treat a plain tap on one side as a step that way too. */
      if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy) * 0.7) {
        step(dx > 0 ? 1 : -1);
      } else if (Math.abs(dx) < 24 && Math.abs(dy) < 24) {
        const r = canvas.getBoundingClientRect();
        step(t.clientX - r.left < r.width / 2 ? -1 : 1);
      }
    }, { passive: true });

    let mouseX = null;
    canvas.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") return;
      mouseX = e.clientX;
    });
    canvas.addEventListener("pointerup", function (e) {
      if (e.pointerType === "touch" || mouseX === null) return;
      const dx = e.clientX - mouseX;
      mouseX = null;
      if (Math.abs(dx) > 20) step(dx > 0 ? 1 : -1);
      else {
        const r = canvas.getBoundingClientRect();
        step(e.clientX - r.left < r.width / 2 ? -1 : 1);
      }
    });

    document.addEventListener("keydown", onKey);
  }

  function onKey(e) {
    if (!S || !running()) return;
    if (e.key === "ArrowLeft") { step(-1); e.preventDefault(); }
    else if (e.key === "ArrowRight") { step(1); e.preventDefault(); }
  }

  function step(dir) {
    if (!S || S.paused || S.over) return;
    const next = Math.max(0, Math.min(LANES.length - 1, S.lane + dir));
    if (next === S.lane) return;
    S.lane = next;
    SFX.step();
  }

  /* ---------- the run ---------- */

  function reset() {
    S = {
      stage: 0,
      travelled: 0,
      lane: 1,
      x: 0,
      burden: true,
      gathered: 0,
      stumbles: 0,
      paused: true,
      over: false,
      nextSpawn: 14,
      stumbleUntil: 0,
      bob: 0,
      questions: shuffled(BibleGame.doctrine || []),
      asked: 0,
      startedAt: Date.now(),
    };
    items.forEach(function (it) { scene.remove(it.sprite); });
    items = [];
    applyStage(STAGES[0]);
    if (burdenSprite) { burdenSprite.visible = true; burdenSprite.material.opacity = 1; }
  }

  function shuffled(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* Sky and haze are the same colour, so the road simply fades into the
     horizon instead of ending at a hard edge. */
  function applyStage(stage) {
    scene.fog = new THREE.Fog(stage.sky, 16, 46);
    renderer.setClearColor(stage.sky, 1);
    ground.material.map = makeGroundTexture(stage.ground);
    ground.material.needsUpdate = true;
    groundTex = ground.material.map;
  }

  function stage() {
    return STAGES[Math.min(S.stage, STAGES.length - 1)];
  }

  function spawn() {
    const st = stage();
    const pool = [];
    st.collect.forEach(function (g) { pool.push({ g: g, good: true }); });
    st.avoid.forEach(function (g) { pool.push({ g: g, good: false }); });
    if (!pool.length) return;
    /* Rows of two are the interesting ones: she has to pick a lane rather
       than drift. Only once she has had a few singles to warm up. */
    const lanes = [0, 1, 2];
    const count = S.travelled > 40 && Math.random() < 0.45 ? 2 : 1;
    for (let n = 0; n < count; n++) {
      const li = Math.floor(Math.random() * lanes.length);
      const lane = lanes.splice(li, 1)[0];
      const pick = pool[Math.floor(Math.random() * pool.length)];
      const s = sprite(pick.g, pick.good ? 1.25 : 1.45);
      s.position.set(LANES[lane], pick.good ? 1.25 : 0.95, -48);
      scene.add(s);
      items.push({ sprite: s, lane: lane, good: pick.good, glyph: pick.g, hit: false });
    }
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (!canvas.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    if (!S) return;

    if (!S.paused && !S.over) {
      const slow = now < S.stumbleUntil ? 0.35 : 1;
      const dist = SPEED * slow * dt;
      S.travelled += dist;

      groundTex.offset.y -= dist * 0.045;

      /* scenery recycles behind the walker */
      scenery.forEach(function (s) {
        s.position.z += dist;
        if (s.position.z > 6) s.position.z -= 126;
      });

      /* items approach, and are judged as they pass the shoulder */
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.sprite.position.z += dist;
        if (!it.hit && it.sprite.position.z > -1.1 && it.sprite.position.z < 0.9 && it.lane === S.lane) {
          it.hit = true;
          if (it.good) {
            S.gathered++;
            SFX.take();
            flash("good");
          } else {
            S.stumbles++;
            S.stumbleUntil = now + STUMBLE_MS;
            SFX.trip();
            flash("trip");
            say("Keep going!");
          }
          scene.remove(it.sprite);
          items.splice(i, 1);
          hudCount();
          continue;
        }
        if (it.sprite.position.z > 4) {
          scene.remove(it.sprite);
          items.splice(i, 1);
        }
      }

      if (S.travelled > S.nextSpawn) {
        spawn();
        S.nextSpawn = S.travelled + 7 + Math.random() * 5;
      }

      if (S.travelled >= stage().length) arriveAtStation();
    }

    /* walking feel: lane glide, head bob, a little lean into the turn */
    const targetX = LANES[S.lane];
    S.x += (targetX - S.x) * Math.min(1, dt * 9);
    camera.position.x = S.x;
    camera.rotation.z = (targetX - S.x) * 0.05;
    if (!S.paused && !S.over) {
      S.bob += dt * (now < S.stumbleUntil ? 4 : 9);
      camera.position.y = 1.55 + Math.sin(S.bob) * 0.035;
    }
    if (burdenSprite && S.burden) {
      burdenSprite.position.y = -0.72 + Math.sin(S.bob * 0.5) * 0.02;
    }

    hudBar();
    renderer.render(scene, camera);
  }

  /* ---------- HUD ---------- */

  function buildHud() {
    hud = UI.h("div", { class: "pw-hud" });

    const back = UI.h("button", { class: "pw-icon", type: "button", "aria-label": "Stop walking" }, UI.icon("x"));
    back.addEventListener("click", function () { exit(); });

    const mute = UI.h("button", { class: "pw-icon", type: "button", "aria-label": "Sound" }, UI.icon("sound"));
    mute.addEventListener("click", function () {
      muted = !muted;
      if (muted) Voice.hush();
      mute.textContent = "";
      mute.appendChild(UI.icon(muted ? "x" : "sound"));
    });

    els.stage = UI.h("div", { class: "pw-stage" });
    els.fill = UI.h("i");
    els.count = UI.h("div", { class: "pw-count" });
    els.hint = UI.h("div", { class: "pw-hint" });
    els.flash = UI.h("div", { class: "pw-flash", "aria-hidden": "true" });
    els.overlay = UI.h("div", { class: "pw-overlay", hidden: true });

    hud.appendChild(UI.h("div", { class: "pw-top" }, back, els.stage, mute));
    hud.appendChild(UI.h("div", { class: "pw-bar" }, els.fill));
    hud.appendChild(els.count);
    hud.appendChild(els.hint);
    hud.appendChild(els.flash);
    hud.appendChild(els.overlay);
    return hud;
  }

  function hudBar() {
    if (!els.fill || !S) return;
    const pct = Math.max(0, Math.min(100, (S.travelled / stage().length) * 100));
    els.fill.style.width = pct.toFixed(1) + "%";
  }

  function hudCount() {
    if (!els.count || !S) return;
    els.count.textContent = "";
    if (S.burden) {
      els.count.appendChild(UI.h("span", { class: "pw-burden", text: "\u{1F392} the burden" }));
    } else {
      els.count.appendChild(UI.h("span", { text: "\u{1F33F} " + S.gathered }));
    }
  }

  function hudStage() {
    if (!els.stage || !S) return;
    els.stage.textContent = stage().name;
    els.hint.textContent = stage().hint;
    els.hint.classList.remove("is-gone");
    setTimeout(function () { if (els.hint) els.hint.classList.add("is-gone"); }, 4200);
    hudCount();
  }

  function flash(kind) {
    if (!els.flash) return;
    els.flash.className = "pw-flash is-" + kind;
    setTimeout(function () { if (els.flash) els.flash.className = "pw-flash"; }, 340);
  }

  /* ---------- overlays: the stations ---------- */

  function overlay(nodes, cls) {
    els.overlay.textContent = "";
    els.overlay.className = "pw-overlay" + (cls ? " " + cls : "");
    els.overlay.hidden = false;
    const card = UI.h("div", { class: "pw-card" }, nodes);
    els.overlay.appendChild(card);
    S.paused = true;
  }

  function closeOverlay() {
    els.overlay.hidden = true;
    els.overlay.textContent = "";
    S.paused = false;
    last = performance.now();
  }

  /* The story beat at the top of each stage. */
  function openStage() {
    const st = stage();
    applyStage(st);
    hudStage();
    const go = UI.h("button", { class: "btn btn-primary btn-block pw-go", type: "button" }, "Walk on");
    go.addEventListener("click", function () {
      closeOverlay();
      S.travelled = 0;
      S.nextSpawn = 14;
    });
    const again = UI.h("button", { class: "pw-icon", type: "button", "aria-label": "Say it again" }, UI.icon("sound"));
    again.addEventListener("click", function () { say(st.line); });
    overlay([
      UI.h("div", { class: "pw-eyebrow" }, UI.h("span", { text: "Station " + (S.stage + 1) + " of " + STAGES.length }), again),
      UI.h("div", { class: "pw-title", text: st.name }),
      UI.h("p", { class: "pw-line", text: st.line }),
      go,
    ], "is-story");
    SFX.gate();
    say(st.line);
  }

  /* End of a stage: a question at the gate, then on to the next. */
  function arriveAtStation() {
    S.paused = true;
    /* The Cross comes after the second stage, exactly where Bunyan has it. */
    if (S.burden && S.stage === 1) return openCross();
    const q = S.questions[S.asked % Math.max(1, S.questions.length)];
    S.asked++;
    if (!q) return nextStage();
    askQuestion(q.q, q.options.map(function (o) { return [o[0], o[1], o[2]]; }), q.teach, q.ref, nextStage);
  }

  /* The moment the whole game is built around. */
  function openCross() {
    SFX.cross();
    const go = UI.h("button", { class: "btn btn-primary btn-block pw-go", type: "button" }, "Come to the cross");
    go.addEventListener("click", function () {
      dropBurden();
      askQuestion(CROSS.q, CROSS.options, CROSS.teach, CROSS.ref, nextStage);
    });
    overlay([
      UI.h("div", { class: "pw-cross", text: "✝️" }),
      UI.h("div", { class: "pw-title", text: "The Cross" }),
      UI.h("p", { class: "pw-line", text: CROSS.line }),
      go,
    ], "is-cross");
    say(CROSS.line);
  }

  /* The burden is not put down. It falls. */
  function dropBurden() {
    S.burden = false;
    hudCount();
    if (!burdenSprite) return;
    camera.remove(burdenSprite);
    burdenSprite.position.set(S.x + 0.9, 0.9, -2.4);
    scene.add(burdenSprite);
    const startedAt = performance.now();
    (function fall() {
      const t = (performance.now() - startedAt) / 1200;
      if (t >= 1) { scene.remove(burdenSprite); return; }
      burdenSprite.position.y = 0.9 - t * t * 2.4;
      burdenSprite.position.z = -2.4 + t * 1.2;
      burdenSprite.material.opacity = 1 - t;
      burdenSprite.material.transparent = true;
      requestAnimationFrame(fall);
    })();
    tone(300, 500, "sine", 0, 0.1);
  }

  /* A catechism question, in the same shape as the rest of the tab. */
  function askQuestion(q, options, teach, ref, then) {
    const opts2 = shuffled(options.map(function (o) { return { glyph: o[0], text: o[1], ok: !!o[2] }; }));
    const rows = opts2.map(function (o) {
      const b = UI.h(
        "button",
        { class: "bg-tile bg-truth pw-truth", type: "button" },
        UI.h("span", { class: "bg-truth-glyph", text: o.glyph }),
        UI.h("span", { class: "bg-truth-text", text: o.text })
      );
      b.addEventListener("click", function () {
        if (!o.ok) {
          b.classList.add("bg-miss");
          b.disabled = true;
          SFX.trip();
          say("Try again!");
          return;
        }
        b.classList.add("bg-hit");
        SFX.gate();
        teachThen(teach, ref, then);
      });
      return b;
    });
    overlay([
      UI.h("div", { class: "pw-title pw-q", text: q }),
      UI.h("div", { class: "bg-answers" }, rows),
    ], "is-question");
    say(q + " Is it: " + opts2.map(function (o) { return o.text; }).join("? Or: ") + "?");
  }

  function teachThen(teach, ref, then) {
    const go = UI.h("button", { class: "btn btn-primary btn-block pw-go", type: "button" }, "Amen");
    go.addEventListener("click", then);
    overlay([
      UI.h("div", { class: "pw-cross", text: "✝️" }),
      UI.h("p", { class: "pw-line pw-teach", text: teach }),
      ref ? UI.h("div", { class: "word-ref", text: ref }) : null,
      go,
    ], "is-teach");
    say(teach);
  }

  function nextStage() {
    S.stage++;
    if (S.stage >= STAGES.length) return finish();
    openStage();
  }

  function finish() {
    S.over = true;
    SFX.win();
    const again = UI.h("button", { class: "btn btn-primary btn-block pw-go", type: "button" }, "Walk it again");
    again.addEventListener("click", function () { reset(); openStage(); });
    const done = UI.h("button", { class: "btn btn-block", type: "button" }, "All done");
    done.addEventListener("click", exit);
    const mins = Math.max(1, Math.round((Date.now() - S.startedAt) / 60000));
    overlay([
      UI.h("div", { class: "pw-city", text: "\u{1F307}" }),
      UI.h("div", { class: "pw-title", text: CITY.name }),
      UI.h("p", { class: "pw-line", text: CITY.line }),
      UI.h("p", { class: "pw-verse", text: "“" + CITY.verse + "”" }),
      UI.h("div", { class: "word-ref", text: CITY.ref + " (KJV)" }),
      UI.h(
        "div",
        { class: "pw-tally" },
        UI.h("span", { text: "\u{1F33F} " + S.gathered + " gathered" }),
        UI.h("span", { text: "\u{1F6E4}️ " + mins + " min walk" })
      ),
      UI.h("div", { class: "stack pw-actions" }, again, done),
    ], "is-finish");
    say("You walked the whole way" + (opts.kid ? ", " + opts.kid : "") + "! " + CITY.line);
  }

  function exit() {
    Voice.hush();
    if (opts && opts.onExit) opts.onExit();
  }

  /* ---------- mounting ---------- */

  function running() {
    return !!(S && canvas && canvas.isConnected);
  }

  function loadThree(then) {
    if (three === "ready") return then();
    if (three === "failed") return then(true);
    if (three === "loading") return;
    three = "loading";
    const s = document.createElement("script");
    s.src = THREE_SRC;
    s.async = true;
    s.onload = function () { three = "ready"; then(); };
    s.onerror = function () { three = "failed"; then(true); };
    document.head.appendChild(s);
  }

  /* Called on every repaint of the Bible tab. The first call builds the
     walk; later ones just put the same canvas back where it belongs. */
  function mount(container, options) {
    host = container;
    opts = options || {};
    if (typeof opts.muted === "boolean") muted = opts.muted;

    if (canvas && hud) {
      host.appendChild(canvas);
      host.appendChild(hud);
      resize();
      return;
    }

    const loading = UI.h("div", { class: "pw-loading" }, UI.h("div", { class: "pw-loading-mark", text: "\u{1F6E4}️" }), UI.h("div", { text: "Getting the road ready…" }));
    host.appendChild(loading);

    loadThree(function (failed) {
      loading.remove();
      if (failed) {
        const b = UI.h("button", { class: "btn btn-primary", type: "button" }, "Back");
        b.addEventListener("click", exit);
        host.appendChild(UI.h("div", { class: "pw-loading" }, UI.h("p", { text: "The walk needs a connection the first time. Try again in a moment." }), b));
        return;
      }
      try {
        build();
      } catch (e) {
        const b = UI.h("button", { class: "btn btn-primary", type: "button" }, "Back");
        b.addEventListener("click", exit);
        host.appendChild(UI.h("div", { class: "pw-loading" }, UI.h("p", { text: "This screen cannot run the walk." }), b));
        return;
      }
      host.appendChild(canvas);
      host.appendChild(buildHud());
      resize();
      reset();
      openStage();
      last = performance.now();
      if (!raf) raf = requestAnimationFrame(tick);
    });
  }

  window.addEventListener("resize", resize);

  return { mount: mount, running: running, stages: STAGES };
})();
