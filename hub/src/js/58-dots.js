/* ============================================================
   Join the dots — drawing with starlight.

   A night sky, and the numbers glowing in it. Sweep a finger through them
   (or tap them one by one) and a golden line follows, each star chiming
   the next note of a little tune, sparks trailing behind the finger. When
   the shape closes the night lifts and the picture blooms where the line
   was — and then comes alive: the whale spouts, the lion snores, hearts
   float up from the lost sheep.

   Sophie (2) gets five big stars, and the next one always glows. Addison
   (nearly 5) gets every number on the picture's outline and finds the
   next one herself; it only glows if she has been looking a while.
   ============================================================ */

(function () {
  /* Pick `m` of the outline's points, spread evenly round it. */
  function sample(points, m) {
    if (points.length <= m) return points.slice();
    const out = [];
    for (let i = 0; i < m; i++) out.push(points[Math.round((i * points.length) / m) % points.length]);
    return out;
  }

  function roundedPicture(pic) {
    return '<defs><clipPath id="rr"><rect width="100" height="100" rx="5"/></clipPath></defs><g clip-path="url(#rr)">' + picMarkup(pic) + "</g>";
  }

  function prepare(ctx) {
    const order = PlayKit.rotation(PICTURES, 0);
    ctx.pic = order[ctx.level % order.length];
    const p = ctx.pic;
    PlayKit.prefetch([p.said, p.truth, p.q ? p.q.teach : "", "Touch the shining star!",
      "Join the dots, from one to " + PlayKit.numberWord(p.outline.length) + ". What will it be?"]);
    return Promise.all([
      Engine.svgTexture("picr-" + p.id, roundedPicture(p), "0 0 100 100", 1024, 1024),
      Engine.castTexture("hand", 320),
    ]);
  }

  function scene(ctx) {
    const pic = ctx.pic;
    const big = ctx.big;
    let S, K, u, B;
    let board, lines, rope, picImg, frameG, trail, hero;
    let dots = [], glows = [], cores = [], labels = [];
    let next = 0, done = false, down = false, pointerId = -1;
    let hintTimer = null, lastNudge = 0, lastP = null;

    /* sizes in CSS pixels, turned into board units */
    function bu(css) { return (css * u * 1000) / B.s; }

    function layout() {
      const W = K.W(), H = K.H(), top = K.top();
      const s = Math.min(W * 0.9, (H - top) * 0.8, 900 * u);
      B = { x: (W - s) / 2, y: top + ((H - top) - s) * 0.4, s: s };
    }

    function placeBoard() {
      board.setPosition(B.x, B.y).setScale(B.s / 1000);
      frameG.clear();
      frameG.fillStyle(0xffffff, 0.05);
      frameG.fillRoundedRect(B.x - 10 * u, B.y - 10 * u, B.s + 20 * u, B.s + 20 * u, 26 * u);
      frameG.lineStyle(1.5 * u, 0xffffff, 0.14);
      frameG.strokeRoundedRect(B.x - 10 * u, B.y - 10 * u, B.s + 20 * u, B.s + 20 * u, 26 * u);
    }

    function toBoard(p) {
      return { x: (p.x - board.x) / board.scaleX, y: (p.y - board.y) / board.scaleY };
    }
    function toScreen(i) {
      return { x: board.x + dots[i][0] * 10 * board.scaleX, y: board.y + dots[i][1] * 10 * board.scaleY };
    }

    function build() {
      dots = big ? pic.outline.map(function (p) { return [p[0], p[1]]; }) : sample(pic.outline, 5);
      let cx = 0, cy = 0;
      dots.forEach(function (d) { cx += d[0]; cy += d[1]; });
      cx /= dots.length; cy /= dots.length;

      const coreR = bu(big ? 7 : 11), glowD = bu(big ? 46 : 70), font = bu(big ? 17 : 24);
      dots.forEach(function (d, i) {
        const x = d[0] * 10, y = d[1] * 10;
        /* Each star is its own little group, and it is the group that pops
           in. Under Phaser 4 a Text or Shape whose own scale or alpha starts
           at zero stays undrawn when tweened back up; a container doesn't. */
        const star = S.add.container(x, y);
        const g = S.add.image(0, 0, "fx-glow").setTint(0xffd36b).setAlpha(0.45).setBlendMode("ADD").setScale(glowD / 128);
        const c = S.add.circle(0, 0, coreR, 0xffffff).setStrokeStyle(bu(2.4), 0xffc94a);
        const vx = d[0] - cx, vy = d[1] - cy, len = Math.hypot(vx, vy) || 1;
        const off = bu(big ? 18 : 26);
        const t = S.add.text((vx / len) * off, (vy / len) * off, String(i + 1), {
          fontFamily: "Public Sans, system-ui, sans-serif", fontSize: font + "px", fontStyle: "800",
          color: "#ffffff", stroke: "#1b1f4a", strokeThickness: bu(5),
        }).setOrigin(0.5);
        star.add([g, c, t]);
        board.add(star);
        glows.push(g); cores.push(c); labels.push(t);
        star.setScale(0);
        S.tweens.add({ targets: star, scale: 1, duration: 380, delay: 200 + i * 70, ease: "Back.easeOut" });
      });
      target();
    }

    function targetIndex() { return next < dots.length ? next : 0; }

    /* The star wanted now pulses. Sophie's always does; Addison's only at
       the start, for the jump back to one, or when she is stuck. */
    let pulse = null;
    function target() {
      if (pulse) { pulse.stop(); pulse = null; }
      glows.forEach(function (g, i) {
        g.setScale((bu(big ? 46 : 70)) / 128);
        g.setTint(i < next ? 0xffe9a8 : 0xffd36b);
      });
      if (done) return;
      if (!big || next === 0 || next === dots.length) shine();
      else armHint();
    }
    function shine() {
      const g = glows[targetIndex()];
      if (!g || done) return;
      if (pulse) pulse.stop();
      g.setTint(0xffffff);
      pulse = S.tweens.add({ targets: g, scale: g.scale * 1.7, alpha: 0.9, duration: 650, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    function armHint() {
      clearTimeout(hintTimer);
      hintTimer = setTimeout(function () {
        if (!ctx.alive || done) return;
        shine();
        const to = toScreen(targetIndex());
        const from = next > 0 ? toScreen(next - 1) : { x: to.x - 60 * u, y: to.y + 60 * u };
        if (next === 0) K.showTap(to);
        else K.showDrag(from, to, { dur: 800 });
      }, big ? 7000 : 4000);
    }

    function drawLines() {
      lines.clear();
      const n = Math.min(next, dots.length);
      const seg = [];
      for (let i = 1; i < n; i++) seg.push([dots[i - 1], dots[i]]);
      if (done) seg.push([dots[dots.length - 1], dots[0]]);
      [[bu(14), 0xffd36b, 0.22], [bu(5), 0xfff1c2, 1]].forEach(function (st) {
        lines.lineStyle(st[0], st[1], st[2]);
        seg.forEach(function (s) { lines.lineBetween(s[0][0] * 10, s[0][1] * 10, s[1][0] * 10, s[1][1] * 10); });
        lines.fillStyle(st[1], st[2]);
        for (let i = 0; i < n; i++) lines.fillCircle(dots[i][0] * 10, dots[i][1] * 10, st[0] / 2);
      });
    }

    function drawRope(p) {
      rope.clear();
      if (!down || done || next === 0 || !p) return;
      const a = dots[next - 1];
      const b = toBoard(p);
      rope.lineStyle(bu(12), 0xffd36b, 0.16);
      rope.lineBetween(a[0] * 10, a[1] * 10, b.x, b.y);
      rope.lineStyle(bu(3.5), 0xfff1c2, 0.75);
      rope.lineBetween(a[0] * 10, a[1] * 10, b.x, b.y);
    }

    function light(i) {
      const c = cores[i];
      c.setFillStyle(0xffd36b);
      S.tweens.add({ targets: c, scale: 1.7, duration: 120, yoyo: true, ease: "Quad.easeOut" });
      S.tweens.add({ targets: labels[i], scale: 1.25, duration: 120, yoyo: true });
      labels[i].setColor("#ffe08a");
      const p = toScreen(i);
      K.burst(p.x, p.y, { count: 10, speed: 170, scale: 0.28 });
    }

    function connect() {
      K.hideHand();
      if (next === 0) {
        light(0);
        next = 1;
        Engine.Sfx.note(0);
        Engine.say("one");
      } else if (next < dots.length) {
        light(next);
        Engine.Sfx.note(next);
        next++;
        Engine.say(next === dots.length && big ? PlayKit.numberWord(next) + "! Now back to one." : PlayKit.numberWord(next));
      } else {
        Engine.Sfx.note(dots.length);
        finish();
        return;
      }
      Engine.buzz(8);
      drawLines();
      target();
    }

    function nudge(i) {
      const t = labels[i];
      S.tweens.add({ targets: [cores[i], t], x: "+=" + bu(5), duration: 50, yoyo: true, repeat: 2 });
      Engine.Sfx.miss();
      const now = Date.now();
      if (now - lastNudge > 1800) {
        lastNudge = now;
        Engine.say(big ? "Find number " + PlayKit.numberWord(targetIndex() + 1) + "." : "Touch the shining star!");
      }
      shine();
    }

    function hit(p, isDown) {
      if (done) return;
      const b = toBoard(p);
      const reach = bu(big ? 26 : 40);
      const t = dots[targetIndex()];
      if (Math.hypot(t[0] * 10 - b.x, t[1] * 10 - b.y) <= reach) return connect();
      if (!isDown) return;
      for (let i = 0; i < dots.length; i++) {
        if (i === targetIndex() || (next > 0 && i === next - 1)) continue;
        if (Math.hypot(dots[i][0] * 10 - b.x, dots[i][1] * 10 - b.y) <= reach * 0.75) return nudge(i);
      }
    }

    /* The shape closes: the night lifts and the picture blooms. */
    function finish() {
      done = true;
      down = false;
      clearTimeout(hintTimer);
      K.hideHand();
      if (pulse) pulse.stop();
      trail.stop();
      drawLines();
      rope.clear();
      S.tweens.add({ targets: lines, alpha: 1.6, duration: 200, yoyo: true });
      K.burst(B.x + B.s / 2, B.y + B.s / 2, { count: 40, speed: 520, scale: 0.45, life: 1200 });
      Engine.Sfx.whoosh();
      picImg.setVisible(true).setAlpha(0).setScale(0.9 * (1000 / 1024));
      S.tweens.add({ targets: picImg, alpha: 1, scale: 1000 / 1024, duration: 900, delay: 250, ease: "Back.easeOut" });
      S.tweens.add({ targets: glows.concat(cores, labels), alpha: 0, duration: 500, delay: 300 });
      S.tweens.add({ targets: lines, alpha: 0, duration: 700, delay: 900 });
      S.time.delayedCall(1100, function () {
        if (!ctx.alive) return;
        K.alive(pic.id, hero, 1000);
        K.breathe(picImg, 0.015);
      });
      S.time.delayedCall(1400, function () {
        if (!ctx.alive) return;
        Engine.celebrate(ctx, {
          pic: pic,
          nextLabel: "Next picture",
          region: function () { return { x: B.x - 10 * u, y: B.y - 10 * u, w: B.s + 20 * u, h: B.s + 20 * u }; },
        });
      });
    }

    return {
      create: function () {
        S = this;
        K = Engine.kit(S, ctx);
        u = ctx.u;
        layout();
        K.sky(0x141a42, 0x3b2c70);
        /* a field of tiny twinkling stars behind everything */
        S.add.particles(0, 0, "fx-spark", {
          x: { min: 0, max: K.W() }, y: { min: 0, max: K.H() },
          scale: { onEmit: function () { return 0; }, onUpdate: function (p, k, t) { return Math.sin(t * Math.PI) * 0.09 * u; } },
          lifespan: { min: 1800, max: 3600 }, frequency: 90, tint: [0xffffff, 0xd8d4ff, 0xfff1c2], blendMode: "ADD",
        }).setDepth(-60);
        K.motes(0xb9b2ff, 0.25);
        frameG = S.add.graphics().setDepth(-10);
        board = S.add.container(0, 0);
        hero = S.add.container(0, 0);
        board.add(hero);
        picImg = S.add.image(500, 500, "picr-" + pic.id).setVisible(false).setScale(1000 / 1024);
        hero.add(picImg);
        lines = S.add.graphics();
        rope = S.add.graphics();
        board.add([lines, rope]);
        placeBoard();
        build();

        trail = S.add.particles(0, 0, "fx-spark", {
          speed: { min: 10 * u, max: 50 * u }, scale: { start: 0.22 * u, end: 0 }, alpha: { start: 1, end: 0 },
          lifespan: 520, frequency: 22, tint: [0xffffff, 0xffe08a, 0xffc94a], blendMode: "ADD", emitting: false,
        }).setDepth(500);

        ctx.caption(big ? "Picture " + (ctx.level + 1) + " · " + dots.length + " dots" : "Touch the shining star");
        S.time.delayedCall(400, function () {
          Engine.say(big ? "Join the dots, from one to " + PlayKit.numberWord(dots.length) + ". What will it be?" : "Touch the shining star!");
        });
        if (!big) S.time.delayedCall(1800, function () { if (next === 0 && !done) K.showTap(toScreen(0)); });

        S.input.on("pointerdown", function (p) {
          if (done) return;
          down = true;
          pointerId = p.id;
          lastP = p;
          trail.setPosition(p.x, p.y);
          trail.start();
          hit(p, true);
          drawRope(p);
        });
        S.input.on("pointermove", function (p) {
          if (!down || p.id !== pointerId) return;
          lastP = p;
          trail.setPosition(p.x, p.y);
          hit(p, false);
          drawRope(p);
        });
        const up = function (p) {
          if (p.id !== pointerId) return;
          down = false;
          trail.stop();
          drawRope(null);
        };
        S.input.on("pointerup", up);
        S.input.on("pointerupoutside", up);
        S.events.once("shutdown", function () { clearTimeout(hintTimer); });

        ctx.onResize = function () {
          layout();
          placeBoard();
        };
      },
    };
  }

  /* The menu's picture: a constellation half drawn. */
  function preview() {
    const star = PICTURE_BY_ID.star.outline;
    const pts = star.map(function (p) { return [p[0] * 1.6 + 20, p[1] * 1.15 + 14]; });
    let s = '<defs><linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1d4c"/><stop offset="1" stop-color="#46307a"/></linearGradient>' +
      '<radialGradient id="dgl"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#ffd36b" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="200" height="150" fill="url(#dg)"/>';
    const r = PlayKit.rng(7);
    for (let i = 0; i < 26; i++) s += '<circle cx="' + (r() * 200).toFixed(1) + '" cy="' + (r() * 150).toFixed(1) + '" r="' + (0.4 + r() * 0.9).toFixed(2) + '" fill="#fff" opacity=".7"/>';
    s += '<polyline points="' + pts.slice(0, 7).map(function (p) { return p.join(","); }).join(" ") + '" fill="none" stroke="#ffd36b" stroke-width="5" opacity=".35" stroke-linecap="round" stroke-linejoin="round"/>';
    s += '<polyline points="' + pts.slice(0, 7).map(function (p) { return p.join(","); }).join(" ") + '" fill="none" stroke="#fff1c2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    pts.forEach(function (p, i) {
      s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i === 7 ? 11 : 7) + '" fill="url(#dgl)"/>';
      s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.6" fill="' + (i < 7 ? "#ffd36b" : "#fff") + '"/>';
    });
    return PlayKit.svg("0 0 200 150", s, "pk-tile-svg");
  }

  PlayKit.register("dots", {
    id: "dots",
    title: "Join the Dots",
    background: "#1a1c46",
    blurbBig: "Draw with starlight and see what God made",
    blurbLittle: "Touch the shining stars",
    preview: preview,
    prepare: prepare,
    scene: scene,
  });
})();
