/* ============================================================
   Two by Two — Noah's ark.

   The animals mill about in the meadow in front of the ark. Pick one up
   (it says its name), carry it to the gangplank, and it trots up and in.
   Sophie (2) can bring them in any order. Addison (nearly 5) has Noah
   calling for them two by two: a speech bubble shows which animals he
   wants next, and anyone else hops back to the meadow.

   When the last one is aboard the story carries on by itself, because the
   point of the story is that Noah didn't do this part: "and the LORD shut
   him in." The gangplank swings up and closes the door, the sky darkens,
   the rain comes, the water rises and the ark floats. Then the rain stops,
   the dove flies in and the rainbow comes out — God's promise.

   Every level is a new set of animals, and there are more of them.
   ============================================================ */

(function () {
  const ANIM_MAX = 6;

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function lines(ctx) {
    const out = ["Help the animals into Noah's ark!", "Noah needs the animals, two by two!", "And the LORD shut him in."];
    ctx.kinds.forEach(function (k) {
      const z = ZOO[k];
      out.push(cap(z.name) + "!", "In goes the " + z.name + "!", "Two " + z.plural + ", please!",
        "One " + z.name + ". Where is the other " + z.name + "?", "Two " + z.plural + "! Well done!");
    });
    return out;
  }

  function prepare(ctx) {
    const pairs = ctx.big ? Math.min(3 + ctx.level, ANIM_MAX) : Math.min(2 + ctx.level, 4);
    ctx.kinds = PlayKit.shuffle(ZOO_ORDER).slice(0, pairs);
    const jobs = [
      Engine.castTexture("ark"), Engine.castTexture("plank"), Engine.castTexture("cloud", 256), Engine.castTexture("hand", 320),
      Engine.subjectTexture("subj-dove", PICTURE_BY_ID.dove, 256),
    ];
    ctx.kinds.forEach(function (k) { jobs.push(Engine.zooTexture(k)); });
    PlayKit.prefetch(lines(ctx).concat([ARK_STORY.said, ARK_STORY.truth, ARK_STORY.q.teach]));
    return Promise.all(jobs);
  }

  function scene(ctx) {
    let S, K, u;
    let L = null;                 /* layout, in game pixels */
    let sky, sun, sunRays, clouds = [], stormClouds = [], hills, ground, arkC, arkImg, plank, blocks, water, rain = null, rainbow = null;
    let animals = [];
    let held = null;
    let bubble = null, order = [], pairIdx = 0, inThisPair = 0;
    let boarded = 0, total = 0, phase = "play";
    let waterLevel = 0, waterTarget = 0, floatT = 0;
    let idleTimer = null, hintTimer = null, stepN = 0;

    /* ---------- layout ---------- */

    function layout() {
      const W = K.W(), H = K.H();
      const portrait = H > W * 1.05;
      const groundY = Math.round(H * (portrait ? 0.56 : 0.6));
      const arkW = Math.min(W * (portrait ? 0.66 : 0.42), H * (portrait ? 0.36 : 0.5) * (200 / 130));
      const arkH = arkW * 0.65;
      const arkX = W - arkW - W * 0.03;
      const lift = arkH * 0.12;                         /* on its blocks */
      const arkY = groundY - lift - arkH * (118 / 130);
      const doorX = arkX + (41 / 200) * arkW, doorY = arkY + (102 / 130) * arkH;
      const doorH = (32 / 130) * arkH, doorW = (22 / 200) * arkW;
      const ang = 0.42;
      const drop = Math.max(10, groundY + arkH * 0.04 - doorY);
      const plankL = drop / Math.sin(ang);
      const footX = doorX - plankL * Math.cos(ang), footY = doorY + drop;
      const size = Math.min(W * (portrait ? 0.21 : 0.12), H * (portrait ? 0.13 : 0.17));
      L = {
        W: W, H: H, portrait: portrait, groundY: groundY,
        arkX: arkX, arkY: arkY, arkW: arkW, arkH: arkH, lift: lift,
        doorX: doorX, doorY: doorY, doorH: doorH, doorW: doorW,
        ang: ang, plankL: plankL, footX: footX, footY: footY,
        size: size,
        meadow: portrait
          ? { x0: W * 0.06 + size * 0.4, x1: W * 0.94 - size * 0.4, y0: groundY + size * 1.15, y1: H - size * 0.25 }
          : { x0: W * 0.05 + size * 0.4, x1: footX - size * 0.9, y0: groundY + size * 0.75, y1: H - size * 0.25 },
      };
    }

    /* ---------- the world ---------- */

    function drawLand() {
      const W = L.W, H = L.H;
      hills.clear();
      hills.fillStyle(0xa9d98a, 1);
      hills.fillEllipse(W * 0.2, L.groundY + 6 * u, W * 0.9, H * 0.14);
      hills.fillStyle(0x98cf78, 1);
      hills.fillEllipse(W * 0.78, L.groundY + 8 * u, W * 1.0, H * 0.12);
      ground.clear();
      ground.fillGradientStyle(0x8cc964, 0x8cc964, 0x6fb24e, 0x6fb24e, 1);
      ground.fillRect(-W, L.groundY, W * 3, H - L.groundY);
      ground.fillStyle(0x6fb24e, 1);
      ground.fillRect(-W, H, W * 3, H);
      /* tufts and little flowers, scattered the same way every time */
      const r = PlayKit.rng(4242);
      for (let i = 0; i < 70; i++) {
        const x = r() * W, y = L.groundY + 8 * u + r() * (H - L.groundY);
        ground.fillStyle(0x5f9f42, 0.7);
        ground.fillTriangle(x, y, x + 3 * u, y - 7 * u, x + 6 * u, y);
        if (i % 6 === 0) {
          ground.fillStyle(i % 12 === 0 ? 0xffffff : 0xffd166, 1);
          ground.fillCircle(x + 9 * u, y - 2 * u, 2.6 * u);
        }
      }
      blocks.clear();
      blocks.fillStyle(0x8a5a2b, 1);
      blocks.lineStyle(2 * u, 0x3b2f2a, 1);
      [0.3, 0.68].forEach(function (f) {
        const bx = L.arkX + L.arkW * f - L.arkW * 0.05, by = L.groundY - L.lift - 2 * u;
        blocks.fillRect(bx, by, L.arkW * 0.1, L.lift + 4 * u);
        blocks.strokeRect(bx, by, L.arkW * 0.1, L.lift + 4 * u);
      });
    }

    function placeArk() {
      arkC.setPosition(L.arkX, L.arkY);
      arkImg.setDisplaySize(L.arkW, L.arkH);
      plank.setPosition(L.doorX - L.arkX, L.doorY - L.arkY);
      plank.setScale(L.plankL / 400, (L.arkH * 0.085) / 96);
      if (phase === "play") plank.setRotation(-L.ang);
      sun.setPosition(L.W * 0.18, L.H * 0.16).setScale((L.W * 0.5) / 128);
      sunRays.setPosition(L.W * 0.18, L.H * 0.16).setScale((L.W * 0.7) / 256);
      if (bubble) placeBubble();
    }

    function makeClouds() {
      for (let i = 0; i < 4; i++) {
        const c = S.add.image(0, 0, "cast-cloud").setDepth(-80).setAlpha(0.95);
        c.setScale(((0.22 + Math.random() * 0.14) * Math.max(L.W, L.H) * 0.7) / 256);
        c.setPosition(Math.random() * L.W, L.H * (0.12 + Math.random() * 0.28));
        c.speed = (6 + Math.random() * 10) * u;
        clouds.push(c);
      }
    }

    /* ---------- the animals ---------- */

    function spawnAnimals() {
      const kinds = [];
      ctx.kinds.forEach(function (k) { kinds.push(k, k); });
      total = kinds.length;
      const m = L.meadow;
      const cols = L.portrait ? 3 : 4;
      const rows = Math.ceil(total / cols);
      const slots = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          slots.push({
            x: m.x0 + ((c + 0.5) / cols) * (m.x1 - m.x0) + (Math.random() - 0.5) * (m.x1 - m.x0) / cols * 0.4,
            y: m.y0 + ((r + 0.5) / rows) * (m.y1 - m.y0) + (Math.random() - 0.5) * (m.y1 - m.y0) / rows * 0.3,
          });
        }
      }
      const spots = PlayKit.shuffle(slots).slice(0, total);
      PlayKit.shuffle(kinds).forEach(function (kind, i) {
        const c = S.add.container(spots[i].x, spots[i].y);
        const shadow = S.add.image(0, 2 * u, "fx-shadow").setScale((L.size * 0.85) / 128, (L.size * 0.28) / 48);
        const body = S.add.container(0, 0);
        const sprite = S.add.image(0, 0, "zoo-" + kind).setOrigin(0.5, 0.94).setScale(L.size / 320);
        body.add(sprite);
        c.add([shadow, body]);
        const a = { c: c, body: body, sprite: sprite, shadow: shadow, kind: kind, state: "idle", home: { x: c.x, y: c.y }, tx: c.x, ty: c.y, vx: 0 };
        face(a, Math.random() < 0.5 ? 1 : -1);
        animals.push(a);
        /* pop in, one after another */
        c.setScale(0);
        S.tweens.add({ targets: c, scale: 1, duration: 420, delay: 120 + i * 90, ease: "Back.easeOut" });
      });
      sortDepth();
    }

    function face(a, dir) {
      a.dir = dir;
      a.sprite.setFlipX((dir < 0) === (ZOO[a.kind].faces > 0));
    }

    function sortDepth() {
      animals.forEach(function (a) { if (a.state !== "held") a.c.setDepth(100 + a.c.y / 10); });
    }

    function hop(a, height, dur) {
      S.tweens.add({ targets: a.body, y: -(height || 10) * u, duration: (dur || 180), yoyo: true, ease: "Quad.easeOut" });
      S.tweens.add({ targets: a.body, scaleY: 0.9, scaleX: 1.08, duration: 80, yoyo: true, delay: (dur || 180) * 2 - 40 });
    }

    /* Every few seconds somebody does something: a hop, a turn. */
    function fidget() {
      const free = animals.filter(function (a) { return a.state === "idle"; });
      if (free.length) {
        const a = free[Math.floor(Math.random() * free.length)];
        if (Math.random() < 0.5) hop(a, 6 + Math.random() * 8);
        else face(a, -a.dir);
      }
    }

    /* Walk an animal through a list of points, hopping as it goes. */
    function walk(a, points, speed, done) {
      const tweens = [];
      let px = a.c.x, py = a.c.y;
      points.forEach(function (p) {
        const d = Math.hypot(p.x - px, p.y - py);
        tweens.push({
          x: p.x, y: p.y, duration: Math.max(120, (d / (speed * u)) * 1000), ease: "Linear",
          onStart: (function (tx) { return function () { face(a, tx >= a.c.x ? 1 : -1); }; })(p.x),
        });
        px = p.x; py = p.y;
      });
      const bob = S.tweens.add({
        targets: a.body, y: -7 * u, duration: 150, yoyo: true, repeat: -1, ease: "Quad.easeOut",
        onYoyo: function () { Engine.Sfx.step(stepN++); },
      });
      S.tweens.chain({
        targets: a.c, tweens: tweens,
        onComplete: function () { bob.stop(); a.body.y = 0; if (done) done(); },
      });
    }

    /* ---------- Noah's speech bubble (Addison) ---------- */

    function makeBubble() {
      bubble = S.add.container(0, 0).setDepth(600);
      bubble.bg = S.add.graphics();
      bubble.icons = [S.add.image(0, 0, "zoo-" + order[0]), S.add.image(0, 0, "zoo-" + order[0])];
      bubble.add([bubble.bg].concat(bubble.icons));
      placeBubble();
      paintBubble();
    }

    function placeBubble() {
      const bw = Math.min(L.W * 0.42, 150 * u), bh = bw * 0.5;
      bubble.w = bw; bubble.h = bh;
      bubble.setPosition(L.arkX + L.arkW * 0.5 - bw * 0.15, L.arkY - bh - 4 * u);
      bubble.bg.clear();
      bubble.bg.fillStyle(0x000000, 0.12);
      bubble.bg.fillRoundedRect(-bw / 2 + 3 * u, 4 * u, bw, bh, bh * 0.4);
      bubble.bg.fillStyle(0xffffff, 1);
      bubble.bg.lineStyle(2.4 * u, 0x3b2f2a, 1);
      bubble.bg.fillRoundedRect(-bw / 2, 0, bw, bh, bh * 0.4);
      bubble.bg.strokeRoundedRect(-bw / 2, 0, bw, bh, bh * 0.4);
      bubble.bg.fillTriangle(bw * 0.05, bh - 1 * u, bw * 0.22, bh - 1 * u, bw * 0.16, bh + bh * 0.32);
      bubble.bg.lineBetween(bw * 0.05, bh, bw * 0.16, bh + bh * 0.32);
      bubble.bg.lineBetween(bw * 0.22, bh, bw * 0.16, bh + bh * 0.32);
      bubble.icons.forEach(function (ic, i) {
        ic.setScale((bh * 0.92) / 320).setOrigin(0.5, 0.94);
        ic.setPosition((i ? 1 : -1) * bw * 0.22, bh * 0.94);
      });
    }

    function paintBubble() {
      const want = order[pairIdx];
      bubble.icons.forEach(function (ic, i) {
        ic.setTexture("zoo-" + want);
        ic.setAlpha(i < inThisPair ? 0.3 : 1);
      });
    }

    function popBubble() {
      S.tweens.add({ targets: bubble, scale: 1.15, duration: 120, yoyo: true, ease: "Quad.easeOut" });
    }

    /* ---------- dragging ---------- */

    function pickAt(p) {
      let best = null, bestD = Infinity;
      animals.forEach(function (a) {
        if (a.state !== "idle") return;
        const cx = a.c.x, cy = a.c.y - L.size * 0.45;
        const d = Math.hypot(p.x - cx, p.y - cy);
        if (d < L.size * 0.62 && (d < bestD || (best && a.c.depth > best.c.depth && d < bestD + L.size * 0.2))) { best = a; bestD = d; }
      });
      return best;
    }

    function onDown(p) {
      if (phase !== "play" || held) return;
      const a = pickAt(p);
      if (!a) return;
      K.hideHand();
      armHint();
      held = a;
      a.state = "held";
      a.pointer = p.id;
      a.ox = a.c.x - p.x;
      a.oy = a.c.y - p.y + L.size * 0.25;
      a.tx = a.c.x; a.ty = a.c.y - L.size * 0.25;
      a.c.setDepth(800);
      S.tweens.add({ targets: a.c, scale: 1.14, duration: 140, ease: "Back.easeOut" });
      S.tweens.add({ targets: a.shadow, alpha: 0.45, duration: 140 });
      Engine.Sfx.lift();
      Engine.buzz(10);
      Engine.say(cap(ZOO[a.kind].name) + "!");
    }

    function onMove(p) {
      if (!held || held.pointer !== p.id) return;
      held.tx = Math.max(L.size * 0.3, Math.min(L.W - L.size * 0.3, p.x + held.ox));
      held.ty = Math.max(K.top() + L.size, Math.min(L.H - 4 * u, p.y + held.oy));
    }

    function onUp(p) {
      if (!held || held.pointer !== p.id) return;
      const a = held;
      held = null;
      S.tweens.add({ targets: a.c, scale: 1, duration: 160, ease: "Quad.easeOut" });
      S.tweens.add({ targets: a.shadow, alpha: 1, duration: 160 });
      a.body.angle = 0;
      if (nearArk(a.c.x, a.c.y)) return offer(a);
      /* Put down in the meadow: it stays where it was put. */
      const m = L.meadow;
      const x = Math.max(m.x0, Math.min(m.x1, a.c.x)), y = Math.max(m.y0 * 0.98, Math.min(m.y1, a.c.y));
      a.state = "busy";
      S.tweens.add({
        targets: a.c, x: x, y: y, duration: 180, ease: "Quad.easeOut",
        onComplete: function () { a.state = "idle"; a.home = { x: x, y: y }; sortDepth(); },
      });
      S.tweens.add({ targets: a.body, scaleY: 0.86, scaleX: 1.1, duration: 90, yoyo: true, delay: 140 });
      Engine.Sfx.drop();
    }

    function nearArk(x, y) {
      /* anywhere along the gangplank, or at the door, counts */
      const ax = L.footX, ay = L.footY, bx = L.doorX, by = L.doorY;
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
      const d = Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay)));
      const atDoor = x > L.doorX - L.doorW * 1.4 && x < L.doorX + L.doorW * 1.6 && y > L.doorY - L.doorH * 1.4 && y < L.doorY + L.size * 0.8;
      return d < L.size * 0.85 || atDoor;
    }

    /* The animal is at the gangplank: up it goes — or, if it isn't the
       one Noah asked for, back it hops. */
    function offer(a) {
      if (ctx.big) {
        const want = order[pairIdx];
        if (a.kind !== want) {
          a.state = "busy";
          Engine.Sfx.boing();
          Engine.buzz(25);
          Engine.say("That's the " + ZOO[a.kind].name + "! Noah wants the " + ZOO[want].plural + ".");
          popBubble();
          hop(a, 16, 200);
          S.time.delayedCall(300, function () {
            walk(a, [a.home], 320, function () { a.state = "idle"; sortDepth(); });
          });
          return;
        }
      }
      board(a);
    }

    function board(a) {
      a.state = "boarding";
      a.c.setDepth(500);
      const up = [];
      if (Math.hypot(a.c.x - L.footX, a.c.y - L.footY) > L.size * 0.4 && a.c.x < L.footX + L.size * 0.2) up.push({ x: L.footX, y: L.footY });
      up.push({ x: (L.footX + L.doorX) / 2, y: (L.footY + L.doorY) / 2 }, { x: L.doorX, y: L.doorY });
      walk(a, up, 260, function () {
        face(a, 1);
        S.tweens.add({
          targets: a.c, x: L.doorX + L.doorW * 0.3, scale: 0.55, alpha: 0, duration: 260, ease: "Quad.easeIn",
          onComplete: function () { a.c.setVisible(false); aboard(a); },
        });
      });
      if (ctx.big && a.kind === order[pairIdx]) { inThisPair++; paintBubble(); }
    }

    function aboard(a) {
      boarded++;
      a.state = "aboard";
      K.burst(L.doorX, L.doorY - L.doorH * 0.5, { count: 14, speed: 200, depth: 700 });
      Engine.Sfx.sparkle();
      const z = ZOO[a.kind];
      if (ctx.big) {
        if (inThisPair >= 2) {
          Engine.say("Two " + z.plural + "! Well done!");
          Engine.Sfx.chime();
          K.ring(L.doorX, L.doorY - L.doorH * 0.5, L.size, 0xffe08a);
          pairIdx++;
          inThisPair = 0;
          if (pairIdx < order.length) {
            S.time.delayedCall(1700, function () {
              if (phase !== "play") return;
              paintBubble();
              popBubble();
              Engine.say("Two " + ZOO[order[pairIdx]].plural + ", please!");
            });
          } else if (bubble) {
            S.tweens.add({ targets: bubble, scale: 0, alpha: 0, duration: 260 });
          }
        } else {
          Engine.say("One " + z.name + ". Where is the other " + z.name + "?");
        }
      } else {
        Engine.say("In goes the " + z.name + "!");
      }
      if (boarded >= total) S.time.delayedCall(1400, storm);
    }

    /* ---------- hints ---------- */

    function armHint() {
      clearTimeout(hintTimer);
      hintTimer = setTimeout(hint, ctx.big ? 12000 : 6000);
    }
    function hint() {
      if (!ctx.alive || phase !== "play" || held) return armHint();
      let a = null;
      const idle = animals.filter(function (x) { return x.state === "idle"; });
      if (ctx.big) a = idle.filter(function (x) { return x.kind === order[pairIdx]; })[0];
      a = a || idle[0];
      if (a) K.showDrag({ x: a.c.x, y: a.c.y - L.size * 0.4 }, { x: L.footX + (L.doorX - L.footX) * 0.4, y: L.footY + (L.doorY - L.footY) * 0.4 }, { dur: 1100 });
      armHint();
    }

    /* ---------- and the LORD shut him in ---------- */

    function storm() {
      if (!ctx.alive) return;
      phase = "storm";
      clearTimeout(hintTimer);
      K.hideHand();
      Engine.say("And the LORD shut him in.");
      /* the gangplank swings up and becomes the door */
      S.tweens.add({ targets: plank, rotation: Math.PI / 2, scaleX: (L.doorH * 1.05) / 400, duration: 1300, delay: 300, ease: "Cubic.easeInOut",
        onComplete: function () {
          plank.x = (L.doorX - L.arkX) + L.doorW * 0.02;
          Engine.Sfx.thud();
          Engine.buzz(60);
          S.cameras.main.shake(260, 0.004);
        } });

      /* the sky darkens and the rain comes */
      S.time.delayedCall(2000, function () {
        if (!ctx.alive) return;
        tweenSky(0x5d7286, 0x9fb1c2, 1600);
        S.tweens.add({ targets: [sun, sunRays], alpha: 0, duration: 1400 });
        clouds.forEach(function (c) { c.setTint(0xa9b6c4); });
        for (let i = 0; i < 4; i++) {
          const c = S.add.image(-200 * u - Math.random() * 300 * u, L.H * (0.08 + Math.random() * 0.25), "cast-cloud").setDepth(-79).setTint(0x8796a6);
          stormClouds.push(c);
          c.setScale((0.5 * Math.max(L.W, L.H) * 0.7) / 256);
          S.tweens.add({ targets: c, x: L.W * (0.1 + i * 0.27), duration: 1800 + i * 200, ease: "Cubic.easeOut" });
        }
        rain = S.add.particles(0, 0, "fx-drop", {
          x: { min: -L.W * 0.1, max: L.W * 1.1 }, y: -40 * u,
          speedY: { min: 900 * u, max: 1300 * u }, speedX: -120 * u,
          scale: { min: 0.35 * u, max: 0.6 * u }, alpha: { min: 0.35, max: 0.7 },
          lifespan: 1800, quantity: 4, frequency: 16, tint: 0xdcecff, rotate: 7,
        }).setDepth(700);
        Engine.Sfx.rain(true);
        waterTarget = L.H - (L.groundY - L.arkH * 0.18);
        /* the blocks the ark sat on are gone under the water */
        S.tweens.add({ targets: blocks, alpha: 0, duration: 2500, delay: 1200 });
      });

      /* then it stops, and the dove, and the rainbow */
      S.time.delayedCall(8200, function () {
        if (!ctx.alive) return;
        if (rain) rain.stop();
        Engine.Sfx.rain(false);
        tweenSky(0x7cc4f2, 0xe9f7ff, 2200);
        S.tweens.add({ targets: [sun, sunRays], alpha: 1, duration: 2000 });
        clouds.forEach(function (c) { c.clearTint(); });
        stormClouds.forEach(function (c) { S.tweens.add({ targets: c, x: L.W + 400 * u, alpha: 0, duration: 2600, ease: "Cubic.easeIn" }); });
        drawRainbow();
        S.time.delayedCall(1200, flyDove);
      });

      S.time.delayedCall(12200, function () {
        if (!ctx.alive) return;
        phase = "done";
        Engine.celebrate(ctx, {
          pic: ARK_STORY,
          nextLabel: "More animals!",
          region: function () {
            const R = L.rbR;
            const x0 = Math.min(L.rbX - R, L.arkX), x1 = Math.max(L.rbX + R, L.arkX + L.arkW);
            const y0 = L.rbY - R - 10 * u, y1 = arkC.y + L.arkH;
            return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
          },
        });
      });
    }

    function tweenSky(top, bottom, dur) {
      const from = { a: sky.a || 0x8fd0f6, b: sky.b || 0xe6f6ff };
      const o = { t: 0 };
      S.tweens.add({
        targets: o, t: 1, duration: dur,
        onUpdate: function () {
          const ca = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(from.a), Phaser.Display.Color.ValueToColor(top), 100, o.t * 100);
          const cb = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(from.b), Phaser.Display.Color.ValueToColor(bottom), 100, o.t * 100);
          sky.set(Phaser.Display.Color.GetColor(ca.r, ca.g, ca.b), Phaser.Display.Color.GetColor(cb.r, cb.g, cb.b));
        },
        onComplete: function () { sky.a = top; sky.b = bottom; },
      });
    }

    function drawRainbow() {
      L.rbR = Math.min(L.W * 0.46, L.H * 0.3);
      L.rbX = L.W * (L.portrait ? 0.5 : 0.55);
      L.rbY = L.groundY;
      rainbow = S.add.graphics().setDepth(-60).setAlpha(0);
      const bands = [0xef6f6c, 0xf6a24b, 0xffd166, 0x8fd18a, 0x6fb6e8, 0x9b7fd1];
      const o = { p: 0 };
      S.tweens.add({
        targets: o, p: 1, duration: 1800, ease: "Cubic.easeOut",
        onStart: function () { rainbow.setAlpha(0.92); Engine.Sfx.sparkle(); },
        onUpdate: function () {
          rainbow.clear();
          const w = L.rbR * 0.07;
          bands.forEach(function (c, i) {
            rainbow.lineStyle(w, c, 1);
            rainbow.beginPath();
            rainbow.arc(L.rbX, L.rbY, L.rbR - i * w, Math.PI, Math.PI + Math.PI * o.p, false);
            rainbow.strokePath();
          });
        },
      });
    }

    function flyDove() {
      const d = S.add.image(-60 * u, L.H * 0.22, "subj-dove").setDepth(650).setScale((L.size * 1.1) / 256);
      const tx = L.arkX + L.arkW * 0.5, ty = arkC.y - L.size * 0.4;
      S.tweens.add({ targets: d, scaleY: d.scaleY * 0.75, duration: 160, yoyo: true, repeat: 9, ease: "Sine.easeInOut" });
      S.tweens.add({ targets: d, x: tx, duration: 3000, ease: "Sine.easeOut" });
      S.tweens.add({ targets: d, y: ty, duration: 3000, ease: "Sine.easeInOut",
        onComplete: function () { Engine.Sfx.chirp(); K.burst(tx, ty, { tex: "fx-heart", count: 8, speed: 120, tints: [0xffffff, 0xffd6dd], blend: "NORMAL", scale: 0.25 }); } });
      Engine.Sfx.chirp();
    }

    function drawWater() {
      if (waterLevel <= 0.5) { water.clear(); return; }
      const top = L.H - waterLevel;
      const t = S.time.now / 1000;
      water.clear();
      /* drawn a screen-width past each side, for when the camera pulls back */
      const x0 = -L.W, x1 = L.W * 2;
      water.fillStyle(0x3f86bd, 0.92);
      water.beginPath();
      water.moveTo(x0, L.H * 2);
      for (let x = x0; x <= x1; x += 20 * u) water.lineTo(x, top + Math.sin(x / (60 * u) + t * 2) * 5 * u);
      water.lineTo(x1, L.H * 2);
      water.closePath();
      water.fillPath();
      water.fillStyle(0x6fb6e8, 0.9);
      water.beginPath();
      water.moveTo(x0, top + 14 * u);
      for (let x = x0; x <= x1; x += 20 * u) water.lineTo(x, top + Math.sin(x / (60 * u) + t * 2) * 5 * u);
      for (let x = x1; x >= x0; x -= 20 * u) water.lineTo(x, top + 12 * u + Math.sin(x / (50 * u) + t * 2.4) * 3 * u);
      water.closePath();
      water.fillPath();
    }

    /* ---------- the scene ---------- */

    return {
      create: function () {
        S = this;
        K = Engine.kit(S, ctx);
        u = ctx.u;
        layout();
        sky = K.sky(0x8fd0f6, 0xe6f6ff);
        sky.a = 0x8fd0f6; sky.b = 0xe6f6ff;
        sunRays = S.add.image(0, 0, "fx-rays").setTint(0xfff7cf).setAlpha(0.4).setBlendMode("ADD").setDepth(-92);
        sun = S.add.image(0, 0, "fx-glow").setTint(0xffe9a0).setDepth(-91);
        S.tweens.add({ targets: sunRays, angle: 360, duration: 60000, repeat: -1 });
        makeClouds();
        hills = S.add.graphics().setDepth(-70);
        ground = S.add.graphics().setDepth(-65);
        blocks = S.add.graphics().setDepth(40);
        arkC = S.add.container(0, 0).setDepth(50);
        arkImg = S.add.image(0, 0, "cast-ark").setOrigin(0, 0);
        plank = S.add.image(0, 0, "cast-plank").setOrigin(1, 0.5);
        arkC.add([arkImg, plank]);
        water = S.add.graphics().setDepth(690);
        drawLand();
        placeArk();
        K.motes(0xffffff, 0.3);

        order = PlayKit.shuffle(ctx.kinds);
        spawnAnimals();
        if (ctx.big) makeBubble();

        ctx.caption(ctx.big ? total / 2 + " pairs of animals" : total + " animals");
        S.time.delayedCall(500, function () {
          Engine.say(ctx.big ? "Noah needs the animals, two by two!" : "Help the animals into Noah's ark!", function () {
            if (ctx.big && phase === "play") Engine.say("Two " + ZOO[order[0]].plural + ", please!");
          });
        });
        S.time.delayedCall(ctx.big ? 4200 : 2200, function () { if (phase === "play" && !held && boarded === 0) hint(); });
        armHint();
        idleTimer = S.time.addEvent({ delay: 1400, loop: true, callback: fidget });

        S.input.on("pointerdown", onDown);
        S.input.on("pointermove", onMove);
        S.input.on("pointerup", onUp);
        S.input.on("pointerupoutside", onUp);
        S.events.once("shutdown", function () { clearTimeout(hintTimer); Engine.Sfx.rain(false); });

        ctx.onResize = function () {
          const old = L;
          layout();
          sky.draw();
          drawLand();
          placeArk();
          animals.forEach(function (a) {
            if (a.state === "aboard") return;
            a.c.x = (a.c.x / old.W) * L.W;
            a.c.y = L.meadow.y0 + ((a.c.y - old.meadow.y0) / Math.max(1, old.meadow.y1 - old.meadow.y0)) * (L.meadow.y1 - L.meadow.y0);
            a.home = { x: a.c.x, y: a.c.y };
            a.sprite.setScale(L.size / 320);
          });
        };
      },

      update: function (time, dt) {
        const k = Math.min(1, dt / 16.7);
        clouds.forEach(function (c) {
          c.x += c.speed * dt / 1000;
          if (c.x > L.W + 160 * u) c.x = -160 * u;
        });
        if (held) {
          const a = held;
          const nx = a.c.x + (a.tx - a.c.x) * 0.38 * k;
          a.vx = nx - a.c.x;
          a.c.x = nx;
          a.c.y += (a.ty - a.c.y) * 0.38 * k;
          a.body.angle = Math.max(-16, Math.min(16, a.vx * 1.4 / u)) + Math.sin(time / 120) * 4;
          if (Math.abs(a.vx) > 0.5 * u) face(a, a.vx > 0 ? 1 : -1);
          a.shadow.y = 18 * u;
          a.shadow.setScale((L.size * 0.6) / 128, (L.size * 0.2) / 48);
        } else {
          animals.forEach(function (a) {
            if (a.state === "idle" && a.shadow.y !== 2 * u) {
              a.shadow.y = 2 * u;
              a.shadow.setScale((L.size * 0.85) / 128, (L.size * 0.28) / 48);
            }
          });
        }
        if (phase !== "play") {
          if (waterLevel < waterTarget) waterLevel = Math.min(waterTarget, waterLevel + (waterTarget / 4200) * dt);
          drawWater();
          /* the ark lifts with the water once it reaches the hull */
          const hullY = L.groundY - L.lift;
          const top = L.H - waterLevel;
          floatT += dt / 1000;
          const rise = Math.max(0, hullY - top + L.arkH * 0.1);
          if (rise > 0) {
            arkC.y = L.arkY - rise + Math.sin(floatT * 1.6) * 4 * u;
            arkC.rotation = Math.sin(floatT * 1.1) * 0.025;
          }
        }
      },
    };
  }

  /* The menu's picture: the ark, with a giraffe on its way. */
  function preview() {
    const s =
      '<rect width="200" height="150" fill="#9fd3f5"/>' +
      '<circle cx="36" cy="30" r="16" fill="#ffe08a"/>' +
      '<ellipse cx="60" cy="112" rx="110" ry="22" fill="#a9d98a"/><rect y="112" width="200" height="40" fill="#8cc964"/>' +
      '<svg x="70" y="44" width="124" height="81" viewBox="0 0 200 130">' + CAST.ark + "</svg>" +
      '<svg x="8" y="66" width="56" height="56" viewBox="0 0 100 100">' + ZOO.giraffe.svg + "</svg>" +
      '<svg x="40" y="94" width="34" height="34" viewBox="0 0 100 100">' + ZOO.bunny.svg + "</svg>";
    return PlayKit.svg("0 0 200 150", s, "pk-tile-svg");
  }

  PlayKit.register("ark", {
    id: "ark",
    title: "Two by Two",
    background: "#9fd3f5",
    blurbBig: "Noah needs the animals, two by two",
    blurbLittle: "Help the animals into Noah's ark",
    preview: preview,
    prepare: prepare,
    scene: scene,
  });
})();
