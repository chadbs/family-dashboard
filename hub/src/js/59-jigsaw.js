/* ============================================================
   Jigsaws.

   A Bible picture cut into real interlocking pieces — knobs and sockets
   — with a cardboard bevel and a drop shadow, scattered on a wooden table
   beside the tray. Pick one up and it lifts towards you, grows to full
   size, straightens, and swings a little with the finger's momentum; put
   it near where it belongs and it snaps home with a click and a ring of
   light. Finished, the seams melt away, a shine sweeps across, and the
   picture comes alive.

   The tray shows a faint copy of the picture, so nobody is guessing:
   clearer for Sophie, with every piece's outline drawn in its place;
   fainter for Addison, whose outlines go after her first puzzle. Sophie
   starts with four pieces, Addison with nine, and each finished puzzle
   makes the next one a little bigger.
   ============================================================ */

(function () {
  const GRIDS_BIG = [[3, 3], [3, 4], [4, 4], [4, 5]];
  const GRIDS_LITTLE = [[2, 2], [2, 3], [3, 3]];
  const RES = 1024;               /* texture pixels across the whole picture */

  function prepare(ctx) {
    const order = PlayKit.rotation(PICTURES, 5);
    /* don't open on the picture the dots or the maze is showing today */
    const taken = [PlayKit.rotation(PICTURES, 0)[0].id, PlayKit.rotation(MAZE_THEMES, 1)[0].pic];
    for (let i = 0; i < order.length && taken.indexOf(order[0].id) >= 0; i++) order.push(order.shift());
    ctx.pic = order[ctx.level % order.length];
    const p = ctx.pic;
    PlayKit.prefetch([p.said, p.truth, p.q ? p.q.teach : "", "Put the picture back together!", "Drag the pieces into the picture!"]);
    return Promise.all([Engine.pictureTexture(p, RES), Engine.castTexture("hand", 320)]);
  }

  function scene(ctx) {
    const pic = ctx.pic;
    const big = ctx.big;
    let S, K, u, G, cols, rows;
    let tableG, trayG, ghost, slots, full, hero;
    let pieces = [], done = false, z = 100, hintTimer = null;

    function grid() {
      const list = big ? GRIDS_BIG : GRIDS_LITTLE;
      return list[Math.min(ctx.level, list.length - 1)];
    }

    /* Where the tray and the heap go for the space there is; and how small
       pieces wait in the heap so they all fit. */
    function layout() {
      const W = K.W(), H = K.H(), top = K.top();
      const wide = W > H * 1.1;
      let s, bx, by, heap;
      if (wide) {
        s = Math.min(H - top - 24 * u, W * 0.52);
        bx = Math.max(16 * u, W * 0.29 - s / 2);
        by = top + (H - top - s) / 2;
        heap = { x: bx + s + 24 * u, y: top + 8 * u, w: W - (bx + s + 24 * u) - 16 * u, h: H - top - 24 * u };
      } else {
        s = Math.min(W - 28 * u, (H - top) * 0.56);
        bx = (W - s) / 2;
        by = top + 6 * u;
        heap = { x: 12 * u, y: by + s + 18 * u, w: W - 24 * u, h: H - (by + s + 18 * u) - 12 * u };
      }
      const n = cols * rows, bw = s / cols, bh = s / rows;
      let best = { k: 0.2, c: 1 };
      /* a piece is ~1.5x its body with the knobs, more when tilted */
      for (let c = 1; c <= n; c++) {
        const r = Math.ceil(n / c);
        const k = Math.min(heap.w / (c * bw * 1.75), heap.h / (r * bh * 1.75));
        if (k > best.k) best = { k: k, c: c };
      }
      G = { s: s, bx: bx, by: by, heap: heap, k: Math.min(1, best.k), c: best.c, scale: s / RES };
    }

    /* ---------- the table and the tray ---------- */

    function drawTable() {
      const W = K.W(), H = K.H();
      tableG.clear();
      const r = PlayKit.rng(77);
      for (let i = 0; i < 46; i++) {
        const y = r() * H;
        tableG.lineStyle((0.6 + r() * 1.6) * u, 0x7a4f2c, 0.06 + r() * 0.06);
        tableG.beginPath();
        tableG.moveTo(-W, y);
        for (let x = -W; x <= W * 2; x += 40 * u) tableG.lineTo(x, y + Math.sin(x / (120 * u) + i) * 6 * u);
        tableG.strokePath();
      }
      trayG.clear();
      const pad = 10 * u;
      trayG.fillStyle(0x000000, 0.22);
      trayG.fillRoundedRect(G.bx - pad + 2 * u, G.by - pad + 5 * u, G.s + pad * 2, G.s + pad * 2, 18 * u);
      trayG.fillStyle(0x5c3d22, 1);
      trayG.fillRoundedRect(G.bx - pad, G.by - pad, G.s + pad * 2, G.s + pad * 2, 18 * u);
      trayG.fillStyle(0xf1e6d3, 1);
      trayG.fillRoundedRect(G.bx, G.by, G.s, G.s, 6 * u);
      ghost.setPosition(G.bx, G.by).setScale(G.scale);
      slots.setPosition(G.bx, G.by).setScale(G.scale);
      full.setPosition(G.bx, G.by).setScale(G.scale);
      hero.setPosition(G.bx, G.by);
    }

    /* ---------- cutting the pieces ---------- */

    function cut() {
      const art = Engine.canvas("pic-" + pic.id);
      const edges = PlayKit.jigsaw.edges(cols, rows, PlayKit.rng((Math.random() * 4294967296) >>> 0));
      const pw = 100 / cols, ph = 100 / rows, T = Math.min(pw, ph) * 0.24;
      const k = RES / 100;
      const tag = "pc" + ctx.level + "-" + Date.now().toString(36);

      /* the outlines drawn in the tray (Sophie's, and Addison's first) */
      const slotC = document.createElement("canvas");
      slotC.width = slotC.height = RES;
      const sg = slotC.getContext("2d");
      sg.scale(k, k);
      sg.setLineDash([1.6, 1.2]);
      sg.lineWidth = 0.45;
      sg.strokeStyle = "rgba(59,47,42,0.45)";

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const x0 = x * pw, y0 = y * ph;
          const d = PlayKit.jigsaw.path(x0, y0, pw, ph, edges(x, y), T);
          const path = new Path2D(d);
          sg.stroke(path);

          const w = Math.ceil((pw + 2 * T) * k), hh = Math.ceil((ph + 2 * T) * k);
          /* the piece: the picture, clipped, with a cardboard bevel */
          const c = document.createElement("canvas");
          c.width = w; c.height = hh;
          const g = c.getContext("2d");
          g.scale(k, k);
          g.translate(-(x0 - T), -(y0 - T));
          g.save();
          g.clip(path);
          g.drawImage(art, 0, 0, 100, 100);
          g.restore();
          g.lineJoin = "round";
          g.save(); g.translate(0.22, 0.22); g.strokeStyle = "rgba(0,0,0,0.32)"; g.lineWidth = 0.55; g.stroke(path); g.restore();
          g.save(); g.translate(-0.18, -0.18); g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineWidth = 0.4; g.stroke(path); g.restore();
          g.strokeStyle = "rgba(59,47,42,0.6)"; g.lineWidth = 0.32; g.stroke(path);
          const key = tag + "-" + x + "-" + y;
          S.textures.addCanvas(key, c);

          /* and its shadow, soft */
          const sc = document.createElement("canvas");
          const pad = 12;
          sc.width = w + pad * 2; sc.height = hh + pad * 2;
          const s2 = sc.getContext("2d");
          s2.filter = "blur(6px)";
          s2.translate(pad, pad);
          s2.scale(k, k);
          s2.translate(-(x0 - T), -(y0 - T));
          s2.fillStyle = "rgba(0,0,0,0.5)";
          s2.fill(path);
          S.textures.addCanvas(key + "-s", sc);

          pieces.push({
            key: key, x0: x0, y0: y0, pw: pw, ph: ph, T: T,
            /* where its centre belongs, in board units (0-100) */
            hx: x0 + pw / 2, hy: y0 + ph / 2,
            locked: false, held: false, full: false,
          });
        }
      }
      S.textures.addCanvas(tag + "-slots", slotC);
      slots.setTexture(tag + "-slots");
    }

    function home(p) {
      return { x: G.bx + p.hx * G.s / 100, y: G.by + p.hy * G.s / 100 };
    }

    function makeSprites() {
      pieces.forEach(function (p) {
        p.shadow = S.add.image(0, 0, p.key + "-s").setAlpha(0.55);
        p.img = S.add.image(0, 0, p.key).setInteractive({ pixelPerfect: true, alphaTolerance: 8, draggable: true, useHandCursor: true });
        p.img.piece = p;
        p.rot = big ? (Math.random() - 0.5) * 0.55 : (Math.random() - 0.5) * 0.2;
      });
      scatter(true);
    }

    /* Deal the pieces into the heap: a loose grid, shuffled, each a little
       askew, so they read as a pile and not a list. */
    function scatter(fresh) {
      const t = G.heap;
      const c = G.c, r = Math.ceil(pieces.length / c);
      const cw = t.w / c, ch = t.h / r;
      const loose = pieces.filter(function (p) { return !p.locked; });
      PlayKit.shuffle(loose).forEach(function (p, i) {
        p.x = t.x + (i % c) * cw + cw / 2 + (Math.random() - 0.5) * cw * 0.16;
        p.y = t.y + Math.floor(i / c) * ch + ch / 2 + (Math.random() - 0.5) * ch * 0.16;
        p.full = false;
        place(p);
        if (fresh) {
          p.img.setScale(0); p.shadow.setScale(0);
          S.tweens.add({ targets: [p.img, p.shadow], scale: G.scale * G.k, duration: 380, delay: 150 + i * 60, ease: "Back.easeOut" });
          if (i < 6) S.time.delayedCall(150 + i * 60, function () { Engine.Sfx.drop(); });
        }
      });
      pieces.filter(function (p) { return p.locked; }).forEach(function (p) {
        const hp = home(p);
        p.x = hp.x; p.y = hp.y;
        place(p);
      });
    }

    function scaleOf(p) {
      return G.scale * (p.locked || p.full || p.held ? 1 : G.k) * (p.held ? 1.06 : 1);
    }

    function place(p) {
      const s = scaleOf(p);
      p.img.setPosition(p.x, p.y).setScale(s).setRotation(p.locked ? 0 : p.rot + (p.tilt || 0));
      const lift = p.held ? 16 * u : p.locked ? 0 : 5 * u;
      p.shadow.setPosition(p.x + lift * 0.4, p.y + lift).setScale(s).setRotation(p.img.rotation).setVisible(!p.locked);
    }

    /* ---------- dragging ---------- */

    function onDragStart(pointer, obj) {
      const p = obj.piece;
      if (!p || p.locked || done) return;
      p.held = true;
      p.full = true;
      /* hold the piece by exactly the point she touched */
      p.gx = pointer.downX - p.x;
      p.gy = pointer.downY - p.y;
      p.tx = p.x; p.ty = p.y;
      p.vx = 0;
      obj.setDepth(++z);
      p.shadow.setDepth(z - 0.5);
      S.tweens.add({ targets: p, rot: 0, duration: 200, ease: "Quad.easeOut" });
      Engine.Sfx.lift();
      Engine.buzz(8);
      K.hideHand();
      armHint();
    }
    function onDrag(pointer, obj, dragX, dragY) {
      const p = obj.piece;
      if (!p || !p.held) return;
      p.tx = Math.max(0, Math.min(K.W(), pointer.x - p.gx));
      p.ty = Math.max(K.top() * 0.6, Math.min(K.H(), pointer.y - p.gy));
    }
    function onDragEnd(pointer, obj) {
      const p = obj.piece;
      if (!p || !p.held) return;
      p.held = false;
      p.tilt = 0;
      const hp = home(p);
      const body = Math.min(p.pw, p.ph) * G.s / 100;
      if (Math.hypot(p.x - hp.x, p.y - hp.y) <= body * (big ? 0.34 : 0.55)) return snap(p);
      /* left on the tray it stays full size; back in the heap it shrinks */
      p.full = p.x > G.bx && p.x < G.bx + G.s && p.y > G.by && p.y < G.by + G.s;
      S.tweens.add({ targets: p.img, scale: scaleOf(p), duration: 160, ease: "Quad.easeOut" });
      Engine.Sfx.drop();
    }

    function snap(p) {
      const hp = home(p);
      p.locked = true;
      p.img.disableInteractive();
      p.img.setDepth(5);
      p.shadow.setVisible(false);
      S.tweens.add({
        targets: p, x: hp.x, y: hp.y, rot: 0, duration: 200, ease: "Back.easeOut",
        onUpdate: function () { place(p); },
        onComplete: function () {
          place(p);
          S.tweens.add({ targets: p.img, scale: G.scale * 1.04, duration: 90, yoyo: true });
        },
      });
      Engine.Sfx.snap();
      Engine.buzz(15);
      K.ring(hp.x, hp.y, Math.min(p.pw, p.ph) * G.s / 100, 0xffffff);
      K.burst(hp.x, hp.y, { count: 10, speed: 200, scale: 0.28 });
      if (pieces.every(function (q) { return q.locked; })) S.time.delayedCall(350, finish);
    }

    /* ---------- hints ---------- */

    function armHint() {
      clearTimeout(hintTimer);
      hintTimer = setTimeout(hint, big ? 12000 : 6000);
    }
    function hint() {
      if (done || !ctx.alive) return;
      const loose = pieces.filter(function (p) { return !p.locked && !p.held; });
      if (loose.length) {
        const p = loose[0];
        const hp = home(p);
        K.showDrag({ x: p.x, y: p.y }, hp, { dur: 1000 });
        S.tweens.add({ targets: p.img, scale: p.img.scale * 1.12, duration: 220, yoyo: true, repeat: 1 });
      }
      armHint();
    }

    /* ---------- whole again ---------- */

    function finish() {
      done = true;
      clearTimeout(hintTimer);
      K.hideHand();
      full.setVisible(true).setAlpha(0).setDepth(20);
      S.tweens.add({ targets: full, alpha: 1, duration: 600, ease: "Sine.easeOut" });
      S.tweens.add({ targets: slots, alpha: 0, duration: 400 });
      /* a shine across the finished picture */
      const shine = S.add.image(G.bx - 80 * u, G.by + G.s / 2, "fx-shine").setDepth(30).setBlendMode("ADD").setAlpha(0.8).setRotation(0.35);
      shine.setScale((G.s * 0.4) / 128, (G.s * 1.6) / 512);
      try {
        const mg = S.make.graphics({}, false);
        mg.fillStyle(0xffffff);
        mg.fillRect(G.bx, G.by, G.s, G.s);
        shine.setMask(mg.createGeometryMask());
      } catch (e) {
        shine.setVisible(false);   /* no mask, no shine: better than one across the table */
      }
      S.tweens.add({ targets: shine, x: G.bx + G.s + 80 * u, duration: 900, delay: 300, ease: "Sine.easeInOut", onComplete: function () { shine.destroy(); } });
      Engine.Sfx.whoosh();
      K.burst(G.bx + G.s / 2, G.by + G.s / 2, { count: 36, speed: 480, scale: 0.42, life: 1200 });
      S.time.delayedCall(900, function () {
        if (!ctx.alive) return;
        K.alive(pic.id, hero, G.s);
      });
      S.time.delayedCall(1200, function () {
        if (!ctx.alive) return;
        Engine.celebrate(ctx, {
          pic: pic,
          nextLabel: "Next puzzle",
          region: function () { return { x: G.bx - 12 * u, y: G.by - 12 * u, w: G.s + 24 * u, h: G.s + 24 * u }; },
        });
      });
    }

    return {
      create: function () {
        S = this;
        K = Engine.kit(S, ctx);
        u = ctx.u;
        const g = grid();
        cols = g[0]; rows = g[1];
        layout();
        K.sky(0xd2a06c, 0xa9733f);
        tableG = S.add.graphics().setDepth(-40);
        trayG = S.add.graphics().setDepth(-5);
        ghost = S.add.image(0, 0, "pic-" + pic.id).setOrigin(0, 0).setAlpha(big ? 0.2 : 0.36).setDepth(-4);
        slots = S.add.image(0, 0, "fx-dot").setOrigin(0, 0).setDepth(-3).setVisible(!big || ctx.level === 0);
        full = S.add.image(0, 0, "pic-" + pic.id).setOrigin(0, 0).setVisible(false);
        hero = S.add.container(0, 0).setDepth(25);
        drawTable();
        cut();
        drawTable();
        makeSprites();

        ctx.caption((big ? "Puzzle " + (ctx.level + 1) + " · " : "") + cols * rows + " pieces");
        S.time.delayedCall(500, function () {
          Engine.say(big ? "Put the picture back together!" : "Drag the pieces into the picture!");
        });
        S.time.delayedCall(big ? 6000 : 2600, function () { if (!pieces.some(function (p) { return p.locked || p.held; })) hint(); });
        armHint();

        S.input.on("dragstart", onDragStart);
        S.input.on("drag", onDrag);
        S.input.on("dragend", onDragEnd);
        S.events.once("shutdown", function () { clearTimeout(hintTimer); });

        ctx.onResize = function () {
          layout();
          drawTable();
          scatter(false);
        };
      },

      update: function (time, dt) {
        const k = Math.min(1, dt / 16.7);
        pieces.forEach(function (p) {
          if (!p.held) return;
          const nx = p.x + (p.tx - p.x) * 0.42 * k;
          p.vx = nx - p.x;
          p.x = nx;
          p.y += (p.ty - p.y) * 0.42 * k;
          /* swing a little with the finger's momentum */
          p.tilt = (p.tilt || 0) * 0.8 + Math.max(-0.22, Math.min(0.22, (p.vx / u) * 0.012)) * 0.2;
          place(p);
        });
      },
    };
  }

  /* The menu's picture: the heart puzzle with its last piece lifted out. */
  function preview() {
    const pic = PICTURE_BY_ID.heart;
    const edges = PlayKit.jigsaw.edges(2, 2, PlayKit.rng(11));
    const T = 12;
    const ps = [];
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) ps.push(PlayKit.jigsaw.path(x * 50, y * 50, 50, 50, edges(x, y), T));
    const art = picMarkup(pic);
    const s = '<rect width="200" height="150" fill="#c8945f"/>' +
      '<defs><clipPath id="jpa"><path d="' + ps[0] + " " + ps[1] + " " + ps[2] + '"/></clipPath><clipPath id="jpb"><path d="' + ps[3] + '"/></clipPath></defs>' +
      '<g transform="translate(30 14) scale(1.12)"><rect x="-5" y="-5" width="110" height="110" rx="8" fill="#5c3d22"/><rect width="100" height="100" rx="3" fill="#f1e6d3"/>' +
      '<g clip-path="url(#jpa)">' + art + "</g>" +
      ps.slice(0, 3).map(function (d) { return '<path d="' + d + '" fill="none" stroke="#3b2f2a" stroke-opacity=".5" stroke-width="1"/>'; }).join("") +
      '<g transform="translate(18 16) rotate(8 75 75)"><path d="' + ps[3] + '" fill="#000" opacity=".25" transform="translate(3 5)"/>' +
      '<g clip-path="url(#jpb)">' + art + '</g><path d="' + ps[3] + '" fill="none" stroke="#3b2f2a" stroke-opacity=".6" stroke-width="1.1"/></g></g>';
    return PlayKit.svg("0 0 200 150", s, "pk-tile-svg");
  }

  PlayKit.register("jigsaw", {
    id: "jigsaw",
    title: "Jigsaws",
    background: "#b98556",
    blurbBig: "Real puzzle pieces that snap into place",
    blurbLittle: "Big pieces that snap into place",
    preview: preview,
    prepare: prepare,
    scene: scene,
  });
})();
