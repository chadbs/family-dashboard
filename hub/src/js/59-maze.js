/* ============================================================
   Mazes.

   Hedges, clouds, riverbanks or desert rocks, drawn with a top light and
   a soft shadow so the walls stand up off the ground. Put a finger down
   and the traveller walks the paths towards it — turning where the path
   turns, never through a wall — kicking up a little dust, leaving a
   coloured trail. Backing up rubs the trail out. Twinkles hide in the
   dead ends, a reason to explore the side paths.

   The story is always the right way round: in the lost-sheep maze it is
   the shepherd who travels, and the sheep waits to be found.

   Sophie (2) gets a three-by-three maze with hardly a turn in it.
   Addison (nearly 5) starts on a real one and each is bigger than the
   last. Stuck for a while, and a line of sparkles runs the way from
   wherever she is standing.

   Mazes are generated, never stored: there is no answer to memorise.
   ============================================================ */

(function () {
  const M = PlayKit.maze;
  const SIZES_BIG = [[5, 7], [6, 8], [7, 9], [8, 10], [8, 11]];
  const SIZES_LITTLE = [[3, 3], [3, 4], [4, 4], [4, 5]];

  const LOOK = {
    sheep: { bg: 0x86c76a, bg2: 0x6fb256, floor: 0xf3e3bb, wall: 0x4f9a45, hi: 0x76bf60, shade: 0x2c6629, trail: 0xef7d57, dust: 0xd8c08a,
      mover: "cast-shepherd", goal: "zoo-sheep" },
    dove: { bg: 0x8fcdf3, bg2: 0x6db7e8, floor: 0xeaf6fd, wall: 0xffffff, hi: 0xffffff, shade: 0x9cc7e4, trail: 0xf39a3d, dust: 0xffffff,
      mover: "subj-dove", goal: "cast-ark" },
    moses: { bg: 0x7fb85e, bg2: 0x6aa64c, floor: 0x74bde6, wall: 0x5d9e45, hi: 0x86c56a, shade: 0x356b2b, trail: 0xffffff, dust: 0xc8ecff,
      mover: "subj-basket", goal: "subj-crown" },
    star: { bg: 0x1d2452, bg2: 0x2c2f6b, floor: 0xe7c992, wall: 0xb38a52, hi: 0xd2ab73, shade: 0x5c4423, trail: 0xffd166, dust: 0xf3dcae,
      mover: "cast-gift", goal: "cast-stable" },
  };

  function prepare(ctx) {
    const themes = PlayKit.rotation(MAZE_THEMES, 1);
    ctx.theme = themes[ctx.level % themes.length];
    const pic = PICTURE_BY_ID[ctx.theme.pic];
    PlayKit.prefetch([ctx.theme.prompt, ctx.theme.little, pic.said, pic.truth, pic.q ? pic.q.teach : "", "Follow the sparkles!"]);
    const look = LOOK[ctx.theme.id];
    const jobs = [Engine.castTexture("hand", 320)];
    [look.mover, look.goal].forEach(function (key) {
      if (key.indexOf("cast-") === 0) jobs.push(Engine.castTexture(key.slice(5), 320));
      else if (key.indexOf("zoo-") === 0) jobs.push(Engine.zooTexture(key.slice(4)));
      else jobs.push(Engine.subjectTexture(key, PICTURE_BY_ID[key.slice(5)], 320));
    });
    return Promise.all(jobs);
  }

  function scene(ctx) {
    const theme = ctx.theme;
    const look = LOOK[theme.id];
    const big = ctx.big;
    let S, K, u, maze, G;
    let wallsG, trailG, floorG, mover, moverBody, goal, dust;
    let start = 0, goalCell = 0, path = [], aim = -1, down = false, pointerId = -1, moving = false, won = false;
    let sparks = {}, steps = 0, idleTimer = null, firstMove = true;

    function dims() {
      const list = big ? SIZES_BIG : SIZES_LITTLE;
      const s = list[Math.min(ctx.level, list.length - 1)];
      return K.W() > K.H() * 1.1 ? [s[1], s[0]] : s;
    }

    function layout() {
      const W = K.W(), H = K.H(), top = K.top();
      const c = Math.min((W - 28 * u) / maze.cols, (H - top - 36 * u) / maze.rows, 130 * u);
      G = { c: c, x: (W - maze.cols * c) / 2, y: top + ((H - top) - maze.rows * c) / 2 + 4 * u };
    }

    function centre(i) {
      return { x: G.x + (i % maze.cols) * G.c + G.c / 2, y: G.y + ((i / maze.cols) | 0) * G.c + G.c / 2 };
    }

    function cellAt(p) {
      const x = Math.floor((p.x - G.x) / G.c), y = Math.floor((p.y - G.y) / G.c);
      if (x < 0 || y < 0 || x >= maze.cols || y >= maze.rows) return -1;
      return y * maze.cols + x;
    }

    /* The walls: every closed edge, drawn three times — a shadow below, the
       wall, a lit top — with round ends, so they read as hedges standing
       up off the path. */
    function drawMaze() {
      const c = G.c, W = maze.cols * c, H = maze.rows * c;
      floorG.clear();
      floorG.fillStyle(0x000000, 0.18);
      floorG.fillRoundedRect(G.x - c * 0.1, G.y - c * 0.02, W + c * 0.2, H + c * 0.2, c * 0.28);
      floorG.fillStyle(look.floor, 1);
      floorG.fillRoundedRect(G.x - c * 0.12, G.y - c * 0.12, W + c * 0.24, H + c * 0.24, c * 0.26);
      /* pebbles on the path */
      const r = PlayKit.rng(maze.open.length * 31 + ctx.level);
      floorG.fillStyle(0x000000, 0.06);
      for (let i = 0; i < maze.open.length * 3; i++) {
        floorG.fillCircle(G.x + r() * W, G.y + r() * H, (0.015 + r() * 0.02) * c);
      }

      const segs = [];
      for (let i = 0; i < maze.open.length; i++) {
        const x = i % maze.cols, y = (i / maze.cols) | 0;
        const x0 = G.x + x * c, y0 = G.y + y * c;
        if (!(maze.open[i] & M.N)) segs.push([x0, y0, x0 + c, y0]);
        if (!(maze.open[i] & M.W)) segs.push([x0, y0, x0, y0 + c]);
        if (y === maze.rows - 1 && !(maze.open[i] & M.S)) segs.push([x0, y0 + c, x0 + c, y0 + c]);
        if (x === maze.cols - 1 && !(maze.open[i] & M.E)) segs.push([x0 + c, y0, x0 + c, y0 + c]);
      }
      const t = c * 0.26;
      wallsG.clear();
      [[look.shade, t, c * 0.07, 1], [look.wall, t, 0, 1], [look.hi, t * 0.42, -c * 0.035, 0.85]].forEach(function (pass) {
        wallsG.lineStyle(pass[1], pass[0], pass[3]);
        wallsG.fillStyle(pass[0], pass[3]);
        segs.forEach(function (s) {
          wallsG.lineBetween(s[0], s[1] + pass[2], s[2], s[3] + pass[2]);
          wallsG.fillCircle(s[0], s[1] + pass[2], pass[1] / 2);
          wallsG.fillCircle(s[2], s[3] + pass[2], pass[1] / 2);
        });
      });
      /* flowers on the hedges, stars in the rocks */
      if (theme.id === "sheep" || theme.id === "star") {
        const fr = PlayKit.rng(segs.length * 17 + ctx.level);
        segs.forEach(function (s) {
          if (fr() > 0.45) return;
          const k = fr();
          wallsG.fillStyle(theme.id === "star" ? 0xffe9a8 : (fr() < 0.5 ? 0xffffff : 0xffd166), 1);
          wallsG.fillCircle(s[0] + (s[2] - s[0]) * k, s[1] + (s[3] - s[1]) * k - c * 0.04, c * 0.035);
        });
      }
    }

    function drawTrail() {
      trailG.clear();
      if (path.length < 2) return;
      trailG.lineStyle(G.c * 0.16, look.trail, 0.85);
      trailG.fillStyle(look.trail, 0.85);
      for (let i = 1; i < path.length; i++) {
        const a = centre(path[i - 1]), b = centre(path[i]);
        trailG.lineBetween(a.x, a.y, b.x, b.y);
        trailG.fillCircle(b.x, b.y, G.c * 0.08);
      }
      const s = centre(path[0]);
      trailG.fillCircle(s.x, s.y, G.c * 0.08);
    }

    function makeActors() {
      const c = G.c;
      const g = centre(goalCell);
      goal = S.add.container(g.x, g.y).setDepth(60);
      const aura = S.add.image(0, 0, "fx-glow").setTint(0xfff3b0).setBlendMode("ADD").setAlpha(0.7).setScale((c * 1.7) / 128);
      const gs = S.add.image(0, c * 0.32, look.goal).setOrigin(0.5, 0.92);
      gs.setScale((c * (look.goal === "cast-ark" ? 1.25 : 0.95)) / (look.goal === "cast-ark" ? 900 : 320));
      goal.add([aura, gs]);
      goal.sprite = gs;
      S.tweens.add({ targets: aura, scale: aura.scale * 1.25, alpha: 0.35, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      S.tweens.add({ targets: gs, y: c * 0.24, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

      const m = centre(start);
      mover = S.add.container(m.x, m.y).setDepth(70);
      const shadow = S.add.image(0, c * 0.3, "fx-shadow").setScale((c * 0.7) / 128, (c * 0.22) / 48);
      moverBody = S.add.container(0, 0);
      const ms = S.add.image(0, c * 0.32, look.mover).setOrigin(0.5, 0.92).setScale((c * 0.92) / 320);
      moverBody.add(ms);
      mover.add([shadow, moverBody]);
      mover.sprite = ms;
      /* an idle breath, so the traveller always looks alive */
      S.tweens.add({ targets: moverBody, scaleY: 1.04, scaleX: 0.97, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      mover.setScale(0);
      S.tweens.add({ targets: mover, scale: 1, duration: 500, delay: 200, ease: "Back.easeOut" });
    }

    /* Twinkles in a few dead ends. */
    function makeSparks() {
      const ends = [];
      for (let i = 0; i < maze.open.length; i++) {
        const o = maze.open[i];
        if (i !== start && i !== goalCell && (o === M.N || o === M.E || o === M.S || o === M.W)) ends.push(i);
      }
      PlayKit.shuffle(ends).slice(0, big ? 3 : 1).forEach(function (i) {
        const p = centre(i);
        const s = S.add.image(p.x, p.y, "fx-spark").setTint(theme.id === "dove" ? 0xffc94a : 0xffffff).setBlendMode(theme.id === "dove" ? "NORMAL" : "ADD").setScale((G.c * 0.45) / 64).setDepth(50);
        S.tweens.add({ targets: s, angle: 45, scale: s.scale * 1.3, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        sparks[i] = s;
      });
    }

    function face(dx) {
      if (!dx) return;
      const flip = look.mover === "subj-dove" ? dx > 0 : dx < 0;
      mover.sprite.setFlipX(flip);
    }

    /* One cell towards the finger: along the path in the direction the
       finger mostly is, or the other way it is, if that way is open. */
    function step() {
      if (moving || won || aim < 0) return;
      const cur = path[path.length - 1];
      if (aim === cur) return;
      const cx = cur % maze.cols, cy = (cur / maze.cols) | 0;
      const ax = aim % maze.cols, ay = (aim / maze.cols) | 0;
      const dx = ax - cx, dy = ay - cy;
      const horiz = Math.abs(dx) >= Math.abs(dy);
      const first = horiz ? (dx > 0 ? M.E : M.W) : (dy > 0 ? M.S : M.N);
      const second = horiz ? (dy ? (dy > 0 ? M.S : M.N) : 0) : (dx ? (dx > 0 ? M.E : M.W) : 0);
      let nb = M.next(maze, cur, first);
      if (nb < 0 && second) nb = M.next(maze, cur, second);
      if (nb >= 0) go(nb);
    }

    function go(nb) {
      const cur = path[path.length - 1];
      if (path.length >= 2 && path[path.length - 2] === nb) path.pop();
      else path.push(nb);
      const p = centre(nb);
      face(p.x - mover.x);
      moving = true;
      K.hideHand();
      armIdle();
      S.tweens.add({
        targets: mover, x: p.x, y: p.y, duration: 135, ease: "Sine.easeInOut",
        onComplete: function () {
          moving = false;
          drawTrail();
          arrive(nb);
          if (down && !won) step();
        },
      });
      S.tweens.add({ targets: moverBody, y: -G.c * 0.12, duration: 67, yoyo: true, ease: "Quad.easeOut" });
      Engine.Sfx.step(steps++);
      dust.emitParticleAt(mover.x, mover.y + G.c * 0.28, 3);
      if (firstMove) { firstMove = false; }
      void cur;
    }

    function arrive(cell) {
      if (sparks[cell]) {
        const s = sparks[cell];
        delete sparks[cell];
        K.burst(s.x, s.y, { count: 14, speed: 220, scale: 0.3 });
        Engine.Sfx.chime();
        S.tweens.add({ targets: s, scale: s.scale * 2.4, alpha: 0, duration: 380, onComplete: function () { s.destroy(); } });
      }
      if (cell === goalCell) win();
    }

    function armIdle() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(showWay, big ? 11000 : 5000);
    }

    /* Stuck? A line of sparkles runs the way, from where she stands. */
    function showWay() {
      if (won || !ctx.alive) return;
      const way = M.way(maze, path[path.length - 1], goalCell);
      way.forEach(function (cell, i) {
        S.time.delayedCall(i * 70, function () {
          if (won) return;
          const p = centre(cell);
          const s = S.add.image(p.x, p.y, "fx-spark").setTint(look.trail).setScale(0).setDepth(55).setBlendMode(theme.id === "dove" || theme.id === "sheep" ? "NORMAL" : "ADD");
          S.tweens.add({ targets: s, scale: (G.c * 0.3) / 64, duration: 200, yoyo: true, hold: 500, onComplete: function () { s.destroy(); } });
        });
      });
      if (way.length > 1) {
        const a = centre(way[0]), b = centre(way[Math.min(2, way.length - 1)]);
        K.showDrag(a, b, { dur: 700, loops: 0 });
      }
      Engine.say(big ? "Follow the sparkles!" : theme.little);
      armIdle();
    }

    function win() {
      won = true;
      down = false;
      clearTimeout(idleTimer);
      K.hideHand();
      const g = centre(goalCell);
      S.tweens.add({ targets: moverBody, y: -G.c * 0.5, duration: 220, yoyo: true, repeat: 1, ease: "Quad.easeOut" });
      S.tweens.add({ targets: goal.sprite, scaleX: goal.sprite.scaleX * 1.15, scaleY: goal.sprite.scaleY * 1.15, duration: 200, yoyo: true, repeat: 1 });
      K.burst(g.x, g.y, { tex: "fx-heart", count: 16, speed: 260, scale: 0.4, tints: [0xef5f67, 0xff8fa3, 0xffffff], blend: "NORMAL" });
      K.ring(g.x, g.y, G.c, 0xffffff);
      Engine.Sfx.chime();
      S.time.delayedCall(700, function () {
        if (!ctx.alive) return;
        Engine.celebrate(ctx, {
          pic: PICTURE_BY_ID[theme.pic],
          nextLabel: "Next maze",
          region: function () {
            return { x: G.x - G.c * 0.2, y: G.y - G.c * 0.2, w: maze.cols * G.c + G.c * 0.4, h: maze.rows * G.c + G.c * 0.4 };
          },
        });
      });
    }

    return {
      create: function () {
        S = this;
        K = Engine.kit(S, ctx);
        u = ctx.u;
        const d = dims();
        maze = M.gen(d[0], d[1], PlayKit.rng((Math.random() * 4294967296) >>> 0));
        const dist = M.distances(maze, 0);
        goalCell = dist.indexOf(Math.max.apply(null, dist));
        path = [start];
        layout();

        K.sky(look.bg, look.bg2);
        if (theme.id === "star") {
          S.add.particles(0, 0, "fx-spark", {
            x: { min: 0, max: K.W() }, y: { min: 0, max: K.H() },
            scale: { onEmit: function () { return 0; }, onUpdate: function (p, k, t) { return Math.sin(t * Math.PI) * 0.08 * u; } },
            lifespan: { min: 1800, max: 3400 }, frequency: 120, tint: 0xffffff, blendMode: "ADD",
          }).setDepth(-60);
        } else {
          K.motes(0xffffff, 0.25);
        }
        floorG = S.add.graphics().setDepth(10);
        trailG = S.add.graphics().setDepth(20);
        wallsG = S.add.graphics().setDepth(30);
        drawMaze();
        makeSparks();
        makeActors();
        dust = S.add.particles(0, 0, "fx-dot", {
          speed: { min: 10 * u, max: 40 * u }, angle: { min: 200, max: 340 }, scale: { start: 0.25 * u, end: 0 }, alpha: { start: 0.7, end: 0 },
          lifespan: 450, tint: look.dust, emitting: false,
        }).setDepth(65);

        ctx.caption(big ? "Level " + (ctx.level + 1) : theme.little);
        S.time.delayedCall(400, function () { Engine.say(big ? theme.prompt : theme.little); });
        S.time.delayedCall(big ? 4500 : 1800, function () {
          if (path.length === 1 && !won) {
            const way = M.way(maze, start, goalCell);
            K.showDrag(centre(way[0]), centre(way[Math.min(2, way.length - 1)]), { dur: 800 });
          }
        });
        armIdle();

        S.input.on("pointerdown", function (p) {
          if (won) return;
          down = true;
          pointerId = p.id;
          aim = cellAt(p);
          step();
        });
        S.input.on("pointermove", function (p) {
          if (!down || p.id !== pointerId) return;
          aim = cellAt(p);
          step();
        });
        const up = function (p) { if (p.id === pointerId) down = false; };
        S.input.on("pointerup", up);
        S.input.on("pointerupoutside", up);
        S.events.once("shutdown", function () { clearTimeout(idleTimer); });

        ctx.onResize = function () {
          layout();
          drawMaze();
          drawTrail();
          const m = centre(path[path.length - 1]), g = centre(goalCell);
          mover.setPosition(m.x, m.y);
          goal.setPosition(g.x, g.y);
          Object.keys(sparks).forEach(function (cell) { const p = centre(+cell); sparks[cell].setPosition(p.x, p.y); });
        };
      },
    };
  }

  /* The menu's picture: a hedge maze with the shepherd setting out. */
  function preview() {
    const m = M.gen(5, 4, PlayKit.rng(20261005));
    const c = 34, ox = 15, oy = 7;
    let walls = "";
    for (let i = 0; i < m.open.length; i++) {
      const x = i % 5, y = (i / 5) | 0, x0 = ox + x * c, y0 = oy + y * c;
      if (!(m.open[i] & M.N)) walls += "M" + x0 + " " + y0 + "h" + c;
      if (!(m.open[i] & M.W)) walls += "M" + x0 + " " + y0 + "v" + c;
      if (y === 3) walls += "M" + x0 + " " + (y0 + c) + "h" + c;
      if (x === 4) walls += "M" + (x0 + c) + " " + y0 + "v" + c;
    }
    const s = '<rect width="200" height="150" fill="#86c76a"/>' +
      '<rect x="' + (ox - 4) + '" y="' + (oy - 4) + '" width="' + (5 * c + 8) + '" height="' + (4 * c + 8) + '" rx="10" fill="#f3e3bb"/>' +
      '<path d="' + walls + '" stroke="#2c6629" stroke-width="10" stroke-linecap="round" transform="translate(0 2.5)"/>' +
      '<path d="' + walls + '" stroke="#4f9a45" stroke-width="10" stroke-linecap="round"/>' +
      '<path d="' + walls + '" stroke="#76bf60" stroke-width="4" stroke-linecap="round" transform="translate(0 -1)"/>' +
      '<svg x="' + (ox + 1) + '" y="' + (oy - 2) + '" width="32" height="32" viewBox="0 0 100 100">' + CAST.shepherd + "</svg>" +
      '<svg x="' + (ox + 4 * c - 2) + '" y="' + (oy + 3 * c - 2) + '" width="36" height="36" viewBox="0 0 100 100">' + ZOO.sheep.svg + "</svg>";
    return PlayKit.svg("0 0 200 150", s, "pk-tile-svg");
  }

  PlayKit.register("maze", {
    id: "maze",
    title: "Mazes",
    background: "#7fbf63",
    blurbBig: "Help the shepherd find his lost sheep",
    blurbLittle: "Take the shepherd to the sheep",
    preview: preview,
    prepare: prepare,
    scene: scene,
  });
})();
