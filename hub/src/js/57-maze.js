/* ============================================================
   Mazes.

   A winding road across a meadow, the sky, a riverbank or a night desert.
   Put a finger down and drag: the traveller walks the road towards the
   finger, turning where the road turns, and leaves a coloured trail so
   she can see the way she came. Backing up rubs the trail out.

   The story is always the right way round. In the lost-sheep maze it is
   the shepherd who does the travelling; the sheep waits to be found.

   Sophie (2) gets a three-by-three road with barely a turn in it and a
   hint that comes quickly. Addison (nearly 5) starts on a real maze and
   each one she finishes is bigger than the last. Stuck for a while, and
   the way to the goal shimmers briefly, from wherever she is standing.

   Every maze is new — they are generated, not stored — so there is no
   answer to memorise and no maze she has "done".
   ============================================================ */

(function () {
  const M = PlayKit.maze;
  const CELL = 10;
  let uid = 0;

  /* Columns by rows, for a screen taller than it is wide. Turned sideways
     on the wall. */
  const SIZES_BIG = [[5, 7], [6, 8], [7, 9], [8, 10], [8, 11]];
  const SIZES_LITTLE = [[3, 3], [3, 4], [4, 4], [4, 5]];

  function Maze(opts) {
    const big = opts.big;
    const themes = PlayKit.rotation(MAZE_THEMES, 1);
    const f = PlayKit.frame({ title: "Mazes", kind: "maze", onBack: opts.onExit });
    const id = "mz" + ++uid;

    let lvl = 0, theme = null, maze = null, start = 0, goal = 0;
    let svg = null, trail = null, mover = null, hintPath = null, sparks = {};
    let path = [], aim = -1, down = false, moving = false, won = false;
    let loop = null, idleTimer = null, steps = 0, started = false;

    function dims() {
      const list = big ? SIZES_BIG : SIZES_LITTLE;
      const s = list[Math.min(lvl, list.length - 1)];
      const wide = f.stage.clientWidth > f.stage.clientHeight * 1.15;
      return wide ? [s[1], s[0]] : s;
    }

    function level() {
      stopLoop();
      clearTimeout(idleTimer);
      PlayKit.hush();
      theme = themes[lvl % themes.length];
      const d = dims();
      maze = M.gen(d[0], d[1], PlayKit.rng((Math.random() * 4294967296) >>> 0));
      start = 0;
      const dist = M.distances(maze, start);
      goal = dist.indexOf(Math.max.apply(null, dist));
      path = [start];
      aim = -1;
      won = false;
      steps = 0;
      f.caption(big ? "Level " + (lvl + 1) : theme.little);
      f.clear();
      build();
      size();
      PlayKit.say(big ? theme.prompt : theme.little);
      const pic = PICTURE_BY_ID[theme.pic];
      PlayKit.prefetch([pic.said, pic.truth, pic.q ? pic.q.teach : ""]);
      armIdle();
    }

    function centre(i) {
      return [(i % maze.cols) * CELL + CELL / 2, ((i / maze.cols) | 0) * CELL + CELL / 2];
    }

    /* A margin round the maze, so the traveller and the goal can stand
       in an edge cell without being cut off by the board's edge. */
    const PAD = 1.8;

    function build() {
      const N = PlayKit.node;
      const W = maze.cols * CELL, H = maze.rows * CELL;
      const col = theme.colors;
      /* Roads a little over half a cell wide: wide enough for a finger to
         follow, narrow enough that the hedges between them read clearly. */
      const roadW = big ? 5.6 : 7;
      const wrap = UI.h("div", { class: "mz-wrap" });
      svg = PlayKit.svg((-PAD) + " " + (-PAD) + " " + (W + 2 * PAD) + " " + (H + 2 * PAD), "", "mz-board mz-" + theme.id);

      N("defs", {}, svg).innerHTML = '<clipPath id="' + id + '-c"><rect x="' + -PAD + '" y="' + -PAD + '" width="' + (W + 2 * PAD) + '" height="' + (H + 2 * PAD) + '" rx="4"/></clipPath>';
      const g = N("g", { "clip-path": "url(#" + id + "-c)" }, svg);
      N("rect", { x: -PAD, y: -PAD, width: W + 2 * PAD, height: H + 2 * PAD, fill: col.bg }, g);

      /* A little texture across the ground: grass, cloud wisps, stars. */
      const fr = PlayKit.rng(maze.open.length * 7919 + lvl);
      let flecks = "";
      for (let i = 0; i < maze.open.length; i++) {
        const c = centre(i);
        const x = c[0] + (fr() - 0.5) * 8, y = c[1] + (fr() - 0.5) * 8;
        flecks += theme.id === "star"
          ? '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (0.25 + fr() * 0.35).toFixed(2) + '" fill="#fff" opacity=".7"/>'
          : '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (0.6 + fr() * 0.9).toFixed(2) + '" fill="' + col.fleck + '"/>';
      }
      g.insertAdjacentHTML("beforeend", flecks);

      const road = M.road(maze, CELL);
      N("path", { d: road, fill: "none", stroke: col.edge, "stroke-width": roadW + 1.6, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
      N("path", { d: road, fill: "none", stroke: col.road, "stroke-width": roadW, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);

      hintPath = N("path", { class: "mz-hint", d: "", fill: "none", stroke: col.trail, "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": "0.1 3.2" }, g);
      trail = N("path", { class: "mz-trail", d: "", fill: "none", stroke: col.trail, "stroke-width": big ? 2.4 : 3.2, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);

      /* A few twinkles in dead ends: nothing to score, just a reason to go
         and look down the side roads. */
      sparks = {};
      const ends = [];
      for (let i = 0; i < maze.open.length; i++) {
        const o = maze.open[i];
        if (i !== start && i !== goal && (o === 1 || o === 2 || o === 4 || o === 8)) ends.push(i);
      }
      PlayKit.shuffle(ends).slice(0, big ? 3 : 1).forEach(function (i) {
        const c = centre(i);
        /* The animation lives on an inner group: a CSS animation on the
           outer one would replace its translate and send it to the corner. */
        const s = N("g", { class: "mz-spark", transform: "translate(" + c[0] + " " + c[1] + ")" }, g);
        s.innerHTML = '<g class="mz-spark-in">' + picSparkles(theme.id === "star" ? "#ffd166" : "#ffffff", [[0, 0, 1.5]]) +
          '<circle r="3.6" fill="none" stroke="' + (theme.id === "star" ? "#ffd166" : "#ffffff") + '" stroke-width=".5" opacity=".6"/></g>';
        sparks[i] = s;
      });

      const gc = centre(goal);
      const gs = N("svg", { class: "mz-goal", x: gc[0] - 6.4, y: gc[1] - 6.4, width: 12.8, height: 12.8, viewBox: "-3 -3 106 106", overflow: "visible" }, g);
      gs.innerHTML = '<g class="mz-goal-in">' + picToken(theme.goal) + "</g>";

      mover = N("g", { class: "mz-mover" }, g);
      const ms = N("svg", { x: -5.9, y: -5.9, width: 11.8, height: 11.8, viewBox: "-3 -3 106 106", overflow: "visible" }, mover);
      ms.innerHTML = '<g class="mz-mover-in">' + picToken(theme.mover) + "</g>";
      place(start, false);
      drawTrail();

      svg.addEventListener("pointerdown", onDown);
      svg.addEventListener("pointermove", onMove);
      svg.addEventListener("pointerup", onUp);
      svg.addEventListener("pointercancel", onUp);
      wrap.appendChild(svg);
      f.stage.appendChild(wrap);
    }

    function size() {
      if (!svg || !maze) return;
      const ratio = (maze.cols * CELL + 2 * PAD) / (maze.rows * CELL + 2 * PAD);
      const aw = f.stage.clientWidth - 4, ah = f.stage.clientHeight - 10;
      let w = Math.min(aw, ah * ratio, 900);
      svg.style.width = Math.round(w) + "px";
      svg.style.height = Math.round(w / ratio) + "px";
    }

    function place(cell, animate) {
      const c = centre(cell);
      /* Settle the last position before starting the next move, so the
         walk always animates from the cell it is leaving — even on a
         device that has been skipping frames. */
      void getComputedStyle(mover).transform;
      mover.style.transition = animate && !PlayKit.reduceMotion ? "transform 110ms ease-out" : "none";
      mover.style.transform = "translate(" + c[0] + "px," + c[1] + "px)";
    }

    function drawTrail() {
      trail.setAttribute("d", path.map(function (c, i) { const p = centre(c); return (i ? "L" : "M") + p[0] + " " + p[1]; }).join(" "));
    }

    function cellAt(p) {
      const x = Math.floor(p.x / CELL), y = Math.floor(p.y / CELL);
      if (x < 0 || y < 0 || x >= maze.cols || y >= maze.rows) return -1;
      return y * maze.cols + x;
    }

    /* Walk one cell towards the finger: along the road in the direction
       the finger mostly is, or the other way it is, if that is open. Never
       through a hedge, never more than one cell at a time. */
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
      if (path.length >= 2 && path[path.length - 2] === nb) path.pop();
      else path.push(nb);
      place(nb, true);
      drawTrail();
      PlayKit.SFX.step(steps++);
      clearHint();
      armIdle();
      moving = true;
      setTimeout(function () { moving = false; if (down) step(); }, 105);

      if (sparks[nb]) {
        const s = sparks[nb];
        delete sparks[nb];
        s.classList.add("is-taken");
        PlayKit.SFX.chime();
        setTimeout(function () { s.remove(); }, 500);
      }
      if (nb === goal) win();
    }

    function onDown(e) {
      if (won) return;
      e.preventDefault();
      down = true;
      try { svg.setPointerCapture(e.pointerId); } catch (x) { /* fine */ }
      aim = cellAt(PlayKit.svgPoint(svg, e));
      step();
      stopLoop();
      loop = setInterval(step, 120);
    }
    function onMove(e) {
      if (!down) return;
      aim = cellAt(PlayKit.svgPoint(svg, e));
      step();
    }
    function onUp() {
      down = false;
      stopLoop();
    }
    function stopLoop() {
      if (loop) clearInterval(loop);
      loop = null;
    }

    /* Stuck? Show the way from where she is, just for a moment. */
    function armIdle() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(showHint, big ? 11000 : 5000);
    }
    function showHint() {
      if (won || !f.root.isConnected) return;
      const from = path[path.length - 1];
      const prev = new Array(maze.open.length).fill(-1);
      const q = [from];
      prev[from] = from;
      while (q.length) {
        const c = q.shift();
        if (c === goal) break;
        [M.N, M.E, M.S, M.W].forEach(function (d) {
          const nb = M.next(maze, c, d);
          if (nb >= 0 && prev[nb] < 0) { prev[nb] = c; q.push(nb); }
        });
      }
      const way = [];
      for (let c = goal; c !== from && c >= 0; c = prev[c]) way.push(c);
      way.push(from);
      way.reverse();
      hintPath.setAttribute("d", way.map(function (c, i) { const p = centre(c); return (i ? "L" : "M") + p[0] + " " + p[1]; }).join(" "));
      hintPath.classList.add("is-on");
      PlayKit.say(big ? "Follow the sparkly dots!" : "This way!");
      setTimeout(clearHint, 2800);
      armIdle();
    }
    function clearHint() {
      if (hintPath) hintPath.classList.remove("is-on");
    }

    function win() {
      won = true;
      down = false;
      stopLoop();
      clearTimeout(idleTimer);
      clearHint();
      mover.classList.add("is-home");
      setTimeout(function () {
        if (!f.root.isConnected) return;
        PlayKit.celebrate(f.stage, {
          pic: PICTURE_BY_ID[theme.pic],
          big: big,
          content: svg.parentNode,
          peek: svg.getBoundingClientRect().height,
          nextLabel: "Next maze",
          onNext: function () { lvl++; level(); },
          onMenu: opts.onExit,
        });
      }, 450);
    }

    function onResize() {
      if (!f.root.isConnected) return;
      f.fit();
      size();
    }
    window.addEventListener("resize", onResize);

    return {
      mount: function (host) {
        host.appendChild(f.root);
        PlayKit.afterAttach(f.root, function () {
          f.fit();
          if (!started) { started = true; level(); }
          else size();
        });
      },
      destroy: function () {
        stopLoop();
        clearTimeout(idleTimer);
        window.removeEventListener("resize", onResize);
        PlayKit.hush();
      },
    };
  }

  /* The menu's picture: a little road with the shepherd part way along. */
  function preview() {
    const m = M.gen(4, 4, PlayKit.rng(20260911));
    const col = MAZE_THEMES[0].colors;
    const dist = M.distances(m, 0);
    const goal = dist.indexOf(Math.max.apply(null, dist));
    const road = M.road(m, CELL);
    const c = function (i) { return [(i % 4) * CELL + 5, ((i / 4) | 0) * CELL + 5]; };
    const g = c(goal);
    let s = '<rect width="40" height="40" rx="5" fill="' + col.bg + '"/>' +
      '<path d="' + road + '" fill="none" stroke="' + col.edge + '" stroke-width="8.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + road + '" fill="none" stroke="' + col.road + '" stroke-width="6.4" stroke-linecap="round" stroke-linejoin="round"/>';
    s += '<svg x="' + (g[0] - 6) + '" y="' + (g[1] - 6) + '" width="12" height="12" viewBox="-3 -3 106 106" overflow="visible">' + picToken("sheep") + "</svg>";
    s += '<svg x="-1" y="-1" width="12" height="12" viewBox="-3 -3 106 106" overflow="visible">' + picToken("crook") + "</svg>";
    return PlayKit.svg("0 0 40 40", s, "pk-door-svg");
  }

  PlayKit.register("maze", {
    title: "Mazes",
    blurbBig: "Help the shepherd find his lost sheep",
    blurbLittle: "Take the shepherd to the sheep",
    preview: preview,
    create: function (opts) { return Maze(opts); },
  });
})();
