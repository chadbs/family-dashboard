/* ============================================================
   Dot to dot.

   The numbers sit on the outline of one of the storybook pictures. Join
   them with a finger — sweep through them or tap them one by one — and
   each dot rings the next note of a little tune. Close the shape and it
   fills in and becomes the picture: the ark, the lion, the empty tomb.

   Sophie (2) gets five big dots and the next one always glows, so it is
   tracing rather than counting. Addison (nearly 5) gets every number on
   the outline — up to sixteen — and has to find the next one herself; it
   only starts to glow if she has been looking for a while.

   The line follows the finger from the last dot, so she can see where she
   is going. A wrong dot wobbles and the voice says which number to find.
   ============================================================ */

(function () {
  const h = UI.h;
  const PAPER = "#fffaf0";
  const LINE = "#e0704f";
  let uid = 0;

  /* Pick `m` of the outline's points, spread evenly round it. */
  function sample(points, m) {
    if (points.length <= m) return points.slice();
    const out = [];
    for (let i = 0; i < m; i++) out.push(points[Math.round((i * points.length) / m) % points.length]);
    return out;
  }

  function centroid(pts) {
    let x = 0, y = 0;
    pts.forEach(function (p) { x += p[0]; y += p[1]; });
    return [x / pts.length, y / pts.length];
  }

  function dist(a, p) {
    return Math.hypot(a[0] - p.x, a[1] - p.y);
  }

  function Dots(opts) {
    const big = opts.big;
    const order = PlayKit.rotation(PICTURES, 0);
    const f = PlayKit.frame({ title: "Dot to dot", kind: "dots", onBack: opts.onExit });
    const id = "dz" + ++uid;
    const HIT = big ? 7.5 : 11;
    const DOT = big ? 2.5 : 3.9;

    let idx = 0, pic = null, dots = [], next = 0, done = false, down = false;
    let svg = null, lines = null, band = null, dotEls = [];
    let hintTimer = null, lastNudge = 0, started = false;

    function level() {
      clearTimeout(hintTimer);
      PlayKit.hush();
      pic = order[idx % order.length];
      done = false;
      next = 0;
      dots = big ? pic.outline.map(function (p) { return [p[0], p[1]]; }) : sample(pic.outline, 5);
      f.caption(big ? "Picture " + (idx + 1) + " · " + dots.length + " dots" : "Touch the shining dot");
      f.clear();
      build();
      size();
      PlayKit.say(big
        ? "Join the dots, from one to " + PlayKit.numberWord(dots.length) + ". What will it be?"
        : "Touch the shining dot!");
      PlayKit.prefetch([pic.said, pic.truth, pic.q ? pic.q.teach : ""]);
      target();
    }

    function build() {
      const wrap = h("div", { class: "dz-wrap" });
      svg = PlayKit.svg("-7 -7 114 114", "", "dz-board" + (big ? " is-big" : ""));
      const N = PlayKit.node;
      N("defs", {}, svg).innerHTML = '<clipPath id="' + id + '-clip"><rect width="100" height="100" rx="5"/></clipPath>';
      N("rect", { x: -7, y: -7, width: 114, height: 114, rx: 9, fill: PAPER }, svg);
      N("rect", { x: -6.4, y: -6.4, width: 112.8, height: 112.8, rx: 8.6, fill: "none", stroke: "#eadcc2", "stroke-width": 1.2 }, svg);

      const reveal = N("g", { class: "dz-reveal", "clip-path": "url(#" + id + "-clip)" }, svg);
      reveal.innerHTML = picMarkup(pic);

      lines = N("g", { class: "dz-lines" }, svg);
      band = N("line", { class: "dz-band", x1: 0, y1: 0, x2: 0, y2: 0, stroke: LINE, "stroke-width": big ? 1.6 : 2.2 }, svg);

      const g = N("g", { class: "dz-dots" }, svg);
      const c = centroid(dots);
      dotEls = dots.map(function (p, i) {
        const dg = N("g", { class: "dz-dot", "data-i": i }, g);
        N("circle", { class: "dz-halo", cx: p[0], cy: p[1], r: DOT * 2.3 }, dg);
        N("circle", { class: "dz-pip", cx: p[0], cy: p[1], r: DOT }, dg);
        /* Numbers sit outside the shape, away from its middle, so the line
           being drawn never runs through them. */
        const vx = p[0] - c[0], vy = p[1] - c[1];
        const len = Math.hypot(vx, vy) || 1;
        const off = big ? 5.8 : 7.6;
        const lx = Math.max(-4, Math.min(104, p[0] + (vx / len) * off));
        const ly = Math.max(-2, Math.min(106, p[1] + (vy / len) * off));
        const t = N("text", { class: "dz-num", x: lx, y: ly, "text-anchor": "middle", "dominant-baseline": "central" }, dg);
        t.textContent = String(i + 1);
        return dg;
      });

      svg.addEventListener("pointerdown", onDown);
      svg.addEventListener("pointermove", onMove);
      svg.addEventListener("pointerup", onUp);
      svg.addEventListener("pointercancel", onUp);
      wrap.appendChild(svg);
      f.stage.appendChild(wrap);
    }

    /* The board is square and as big as the space allows. */
    function size() {
      if (!svg) return;
      const s = Math.max(240, Math.min(f.stage.clientWidth - 4, f.stage.clientHeight - 12, 760));
      svg.style.width = s + "px";
      svg.style.height = s + "px";
    }

    function targetIndex() {
      return next < dots.length ? next : 0;
    }

    /* Which dot is wanted now. Sophie's always glows; Addison's glows at
       the very start, for the jump back to one, and when she is stuck. */
    function target() {
      const ti = targetIndex();
      dotEls.forEach(function (el, i) {
        el.classList.toggle("is-target", i === ti && !done);
        el.classList.remove("is-hint");
      });
      if (!big || next === 0 || next === dots.length) hint();
      else armHint();
    }

    function hint() {
      const el = dotEls[targetIndex()];
      if (el && !done) el.classList.add("is-hint");
    }

    function armHint() {
      clearTimeout(hintTimer);
      hintTimer = setTimeout(hint, 7000);
    }

    function light(i) {
      dotEls[i].classList.add("is-lit");
    }

    function addLine(a, b) {
      const l = PlayKit.node("line", {
        class: "dz-line",
        x1: dots[a][0], y1: dots[a][1], x2: dots[b][0], y2: dots[b][1],
        stroke: LINE, "stroke-width": big ? 1.9 : 2.7,
      }, lines);
      return l;
    }

    function connect() {
      if (next === 0) {
        light(0);
        next = 1;
        PlayKit.SFX.note(0);
        PlayKit.say("one");
      } else if (next < dots.length) {
        addLine(next - 1, next);
        light(next);
        PlayKit.SFX.note(next);
        next++;
        PlayKit.say(next === dots.length && big
          ? PlayKit.numberWord(next) + "! Now back to one."
          : PlayKit.numberWord(next));
      } else {
        addLine(dots.length - 1, 0);
        PlayKit.SFX.note(dots.length);
        finish();
        return;
      }
      target();
    }

    function nudge(i) {
      const el = dotEls[i];
      el.classList.remove("is-wrong");
      void el.getBoundingClientRect();
      el.classList.add("is-wrong");
      PlayKit.SFX.miss();
      const now = Date.now();
      if (now - lastNudge > 1800) {
        lastNudge = now;
        PlayKit.say(big ? "Find number " + PlayKit.numberWord(targetIndex() + 1) + "." : "Touch the shining dot!");
      }
      hint();
    }

    function showBand(p) {
      if (next === 0 || done) { band.style.opacity = "0"; return; }
      const from = dots[next - 1] || dots[dots.length - 1];
      band.setAttribute("x1", from[0]);
      band.setAttribute("y1", from[1]);
      band.setAttribute("x2", p.x);
      band.setAttribute("y2", p.y);
      band.style.opacity = "1";
    }

    function handle(p, isDown) {
      if (done) return;
      const t = dots[targetIndex()];
      if (dist(t, p) <= HIT) {
        connect();
        if (!done) showBand(p);
        return;
      }
      if (isDown) {
        const ti = targetIndex();
        for (let i = 0; i < dots.length; i++) {
          if (i !== ti && dist(dots[i], p) <= HIT * 0.8 && !(next > 0 && i === next - 1)) { nudge(i); break; }
        }
      }
      showBand(p);
    }

    function onDown(e) {
      if (done) return;
      e.preventDefault();
      down = true;
      try { svg.setPointerCapture(e.pointerId); } catch (x) { /* fine */ }
      handle(PlayKit.svgPoint(svg, e), true);
    }
    function onMove(e) {
      if (!down || done) return;
      handle(PlayKit.svgPoint(svg, e), false);
    }
    function onUp() {
      down = false;
      if (band) band.style.opacity = "0";
    }

    /* The shape closes and becomes the picture. */
    function finish() {
      done = true;
      down = false;
      clearTimeout(hintTimer);
      band.style.opacity = "0";
      svg.classList.add("is-done");
      dotEls.forEach(function (el) { el.classList.remove("is-target", "is-hint"); });
      setTimeout(function () {
        if (!f.root.isConnected) return;
        PlayKit.celebrate(f.stage, {
          pic: pic,
          big: big,
          content: svg.parentNode,
          peek: svg.getBoundingClientRect().height,
          onNext: function () { idx++; level(); },
          onMenu: opts.onExit,
        });
      }, 650);
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
        clearTimeout(hintTimer);
        window.removeEventListener("resize", onResize);
        PlayKit.hush();
      },
    };
  }

  /* The menu's picture of this game: a star half joined up. */
  function preview() {
    const star = PICTURE_BY_ID.star.outline;
    let s = '<rect x="-7" y="-7" width="114" height="114" rx="12" fill="' + PAPER + '"/>';
    s += '<polyline points="' + star.slice(0, 6).map(function (p) { return p[0] + "," + p[1]; }).join(" ") +
      '" fill="none" stroke="' + LINE + '" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>';
    star.forEach(function (p, i) {
      s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.2" fill="' + (i < 6 ? "#ffd166" : "#fff") + '" stroke="' + PIC_INK + '" stroke-width="1.8"/>';
    });
    s += '<circle cx="' + star[6][0] + '" cy="' + star[6][1] + '" r="9" fill="none" stroke="#ffb020" stroke-width="2.4" opacity=".8"/>';
    return PlayKit.svg("-7 -7 114 114", s, "pk-door-svg");
  }

  PlayKit.register("dots", {
    title: "Dot to dot",
    blurbBig: "Join the numbers and see what God made",
    blurbLittle: "Touch the shining dots",
    preview: preview,
    create: function (opts) { return Dots(opts); },
  });
})();
