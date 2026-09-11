/* ============================================================
   Jigsaws.

   One of the storybook pictures, cut into real interlocking pieces —
   knobs and sockets, not squares. The pieces wait in a heap beside the
   board; drag one near where it belongs and it snaps home with a click.

   The board shows a faint copy of the picture underneath, so nobody is
   guessing: Sophie's is clear and her pieces are outlined in their
   places; Addison's is fainter, and after her first puzzle the outlines
   go too. Sophie starts with four big pieces, Addison with nine, and
   each puzzle finished makes the next one a little bigger.

   Pieces are only grabbable by their actual shape, not their bounding
   box, so a knob sitting under another piece's corner can still be
   picked up.
   ============================================================ */

(function () {
  const h = UI.h;
  const GRIDS_BIG = [[3, 3], [3, 4], [4, 4], [4, 5]];
  const GRIDS_LITTLE = [[2, 2], [2, 3], [3, 3]];
  let uid = 0;

  function Jigsaw(opts) {
    const big = opts.big;
    const order = PlayKit.rotation(PICTURES, 5);
    const f = PlayKit.frame({ title: "Jigsaws", kind: "jigsaw", onBack: opts.onExit });
    const id = "jz" + ++uid;

    let lvl = 0, pic = null, cols = 0, rows = 0, pieces = [], done = false, started = false;
    let area = null, board = null, ghost = null, slots = null;
    let geo = { S: 0, bx: 0, by: 0, scale: 1, W: 0, H: 0, tray: null };
    let zTop = 10, drag = null;

    function level() {
      PlayKit.hush();
      pic = order[lvl % order.length];
      const list = big ? GRIDS_BIG : GRIDS_LITTLE;
      const g = list[Math.min(lvl, list.length - 1)];
      cols = g[0];
      rows = g[1];
      done = false;
      f.caption((big ? "Puzzle " + (lvl + 1) + " · " : "") + cols * rows + " pieces");
      f.stage.textContent = "";
      build();
      PlayKit.say(big ? "Put the picture back together!" : "Drag the pieces into the picture!");
      PlayKit.prefetch([pic.said, pic.truth, pic.q ? pic.q.teach : ""]);
    }

    /* Where the board and the heap of pieces go, for the space there is. */
    function measure() {
      const W = f.stage.clientWidth, H = f.stage.clientHeight;
      const wide = W > H * 1.1;
      let S, bx, by, tray;
      if (wide) {
        S = Math.min(H - 20, W * 0.56);
        bx = Math.max(10, (W * 0.58 - S) / 2);
        by = (H - S) / 2;
        tray = { x: bx + S + 18, y: 10, w: W - (bx + S + 18) - 10, h: H - 20 };
      } else {
        S = Math.min(W - 16, (H - 20) * 0.58);
        bx = (W - S) / 2;
        by = 8;
        tray = { x: 8, y: by + S + 14, w: W - 16, h: H - (by + S + 14) - 8 };
      }
      geo = { S: S, bx: bx, by: by, scale: S / 100, W: W, H: H, tray: tray };
    }

    function build() {
      measure();
      area = h("div", { class: "jz-area" });
      board = h("div", { class: "jz-board" });
      const faint = big ? 0.2 : 0.36;
      ghost = PlayKit.svg("0 0 100 100", '<g opacity="' + faint + '">' + picMarkup(pic) + "</g>", "jz-ghost");
      board.appendChild(ghost);
      slots = PlayKit.node("g", { class: "jz-slots" + (big && lvl > 0 ? " is-off" : "") }, ghost);
      area.appendChild(board);

      const edges = PlayKit.jigsaw.edges(cols, rows, PlayKit.rng((Math.random() * 4294967296) >>> 0));
      const pw = 100 / cols, ph = 100 / rows, T = Math.min(pw, ph) * 0.24;
      const art = picMarkup(pic);
      pieces = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const x0 = x * pw, y0 = y * ph;
          const d = PlayKit.jigsaw.path(x0, y0, pw, ph, edges(x, y), T);
          PlayKit.node("path", { d: d, fill: "none", stroke: "#3b2f2a", "stroke-opacity": ".35", "stroke-width": ".45", "stroke-dasharray": "1.4 1.2" }, slots);

          const cid = id + "-" + lvl + "-" + x + "-" + y;
          const el = h("div", { class: "jz-piece" });
          const s = PlayKit.svg((x0 - T) + " " + (y0 - T) + " " + (pw + 2 * T) + " " + (ph + 2 * T),
            '<defs><clipPath id="' + cid + '"><path d="' + d + '"/></clipPath></defs>' +
            '<g clip-path="url(#' + cid + ')">' + art + "</g>" +
            '<path class="jz-edge" d="' + d + '" fill="none" stroke="#3b2f2a" stroke-opacity=".5" stroke-width=".55"/>' +
            '<path class="jz-shine" d="' + d + '" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width=".35" transform="translate(-.25 -.25)"/>' +
            '<path class="jz-hit" d="' + d + '" fill="transparent"/>');
          el.appendChild(s);
          area.appendChild(el);
          const p = { el: el, x: x, y: y, x0: x0, y0: y0, pw: pw, ph: ph, T: T, locked: false, nx: 0, ny: 0, left: 0, top: 0 };
          pieces.push(p);
          bind(p, s.querySelector(".jz-hit"));
        }
      }
      f.stage.appendChild(area);
      scatter();
      layout();
    }

    /* Deal the pieces into the heap: a loose grid, shuffled, each a little
       askew from its slot, so they read as a pile and not a list. */
    function scatter() {
      const t = geo.tray;
      const n = pieces.length;
      const c = Math.max(1, Math.round(Math.sqrt(n * (t.w / Math.max(1, t.h)))));
      const r = Math.ceil(n / c);
      const cw = t.w / c, ch = t.h / r;
      PlayKit.shuffle(pieces).forEach(function (p, i) {
        const pwPx = (p.pw + 2 * p.T) * geo.scale, phPx = (p.ph + 2 * p.T) * geo.scale;
        const cx = t.x + (i % c) * cw + cw / 2 + (Math.random() - 0.5) * cw * 0.25;
        const cy = t.y + Math.floor(i / c) * ch + ch / 2 + (Math.random() - 0.5) * ch * 0.25;
        p.nx = (cx - pwPx / 2) / geo.W;
        p.ny = (cy - phPx / 2) / geo.H;
      });
    }

    function home(p) {
      return [geo.bx + (p.x0 - p.T) * geo.scale, geo.by + (p.y0 - p.T) * geo.scale];
    }

    /* Put everything where it belongs for the current size. Called on
       every mount and resize; a placed piece goes to its new home, a loose
       one keeps its place as a fraction of the play area. */
    function layout() {
      board.style.left = geo.bx + "px";
      board.style.top = geo.by + "px";
      board.style.width = geo.S + "px";
      board.style.height = geo.S + "px";
      pieces.forEach(function (p) {
        const w = (p.pw + 2 * p.T) * geo.scale, hh = (p.ph + 2 * p.T) * geo.scale;
        p.el.style.width = w + "px";
        p.el.style.height = hh + "px";
        if (p.locked) {
          const hp = home(p);
          p.left = hp[0];
          p.top = hp[1];
        } else {
          p.left = clamp(p.nx * geo.W, -w * 0.25, geo.W - w * 0.75);
          p.top = clamp(p.ny * geo.H, -hh * 0.25, geo.H - hh * 0.75);
        }
        paint(p);
      });
    }

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    function paint(p) {
      p.el.style.left = p.left + "px";
      p.el.style.top = p.top + "px";
    }

    function bind(p, hit) {
      hit.addEventListener("pointerdown", function (e) {
        if (p.locked || done) return;
        e.preventDefault();
        e.stopPropagation();
        const ar = area.getBoundingClientRect();
        drag = { p: p, ox: e.clientX - ar.left - p.left, oy: e.clientY - ar.top - p.top };
        try { hit.setPointerCapture(e.pointerId); } catch (x) { /* fine */ }
        p.el.style.transition = "none";
        p.el.style.zIndex = String(++zTop);
        p.el.classList.add("is-drag");
        PlayKit.SFX.tap();
      });
      hit.addEventListener("pointermove", function (e) {
        if (!drag || drag.p !== p) return;
        const ar = area.getBoundingClientRect();
        const w = p.el.offsetWidth, hh = p.el.offsetHeight;
        p.left = clamp(e.clientX - ar.left - drag.ox, -w * 0.3, geo.W - w * 0.7);
        p.top = clamp(e.clientY - ar.top - drag.oy, -hh * 0.3, geo.H - hh * 0.7);
        paint(p);
      });
      const end = function () {
        if (!drag || drag.p !== p) return;
        drag = null;
        p.el.classList.remove("is-drag");
        drop(p);
      };
      hit.addEventListener("pointerup", end);
      hit.addEventListener("pointercancel", end);
    }

    function drop(p) {
      const hp = home(p);
      const bodyW = p.pw * geo.scale, bodyH = p.ph * geo.scale;
      const reach = Math.min(bodyW, bodyH) * (big ? 0.34 : 0.55);
      if (Math.hypot(p.left - hp[0], p.top - hp[1]) <= reach) {
        snap(p);
      } else {
        p.nx = p.left / geo.W;
        p.ny = p.top / geo.H;
      }
    }

    function snap(p) {
      const hp = home(p);
      p.locked = true;
      p.left = hp[0];
      p.top = hp[1];
      p.el.style.transition = PlayKit.reduceMotion ? "none" : "left 140ms ease-out, top 140ms ease-out";
      p.el.style.zIndex = "2";
      p.el.classList.add("is-locked");
      paint(p);
      PlayKit.SFX.snap();
      if (pieces.every(function (q) { return q.locked; })) finish();
    }

    function finish() {
      done = true;
      area.classList.add("is-done");
      setTimeout(function () {
        if (!f.root.isConnected) return;
        PlayKit.celebrate(f.stage, {
          pic: pic,
          big: big,
          nextLabel: "Next puzzle",
          onNext: function () { lvl++; level(); },
          onMenu: opts.onExit,
        });
      }, 500);
    }

    function relayout() {
      if (!area) return;
      measure();
      layout();
    }

    function onResize() {
      if (!f.root.isConnected) return;
      f.fit();
      relayout();
    }
    window.addEventListener("resize", onResize);

    return {
      mount: function (host) {
        host.appendChild(f.root);
        f.fit();
        if (!started) { started = true; level(); }
        else relayout();
      },
      destroy: function () {
        window.removeEventListener("resize", onResize);
        PlayKit.hush();
      },
    };
  }

  /* The menu's picture: the heart, with its last piece lifted out. */
  function preview() {
    const pic = PICTURE_BY_ID.heart;
    const edges = PlayKit.jigsaw.edges(2, 2, PlayKit.rng(11));
    const T = 12;
    const ps = [];
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) ps.push(PlayKit.jigsaw.path(x * 50, y * 50, 50, 50, edges(x, y), T));
    const art = picMarkup(pic);
    let s = '<defs><clipPath id="jzpv-a"><path d="' + ps[0] + " " + ps[1] + " " + ps[2] + '"/></clipPath>' +
      '<clipPath id="jzpv-b"><path d="' + ps[3] + '"/></clipPath></defs>' +
      '<rect width="100" height="100" rx="6" fill="#f1e6d3"/>' +
      '<g clip-path="url(#jzpv-a)">' + art + "</g>";
    ps.slice(0, 3).forEach(function (d) { s += '<path d="' + d + '" fill="none" stroke="#3b2f2a" stroke-opacity=".45" stroke-width="1"/>'; });
    s += '<g transform="translate(9 7)"><path d="' + ps[3] + '" fill="#000" opacity=".18" transform="translate(2 3)"/>' +
      '<g clip-path="url(#jzpv-b)">' + art + '</g><path d="' + ps[3] + '" fill="none" stroke="#3b2f2a" stroke-opacity=".6" stroke-width="1.1"/></g>';
    return PlayKit.svg("0 0 112 110", s, "pk-door-svg");
  }

  PlayKit.register("jigsaw", {
    title: "Jigsaws",
    blurbBig: "Real puzzle pieces — they snap into place",
    blurbLittle: "Big pieces that snap into place",
    preview: preview,
    create: function (opts) { return Jigsaw(opts); },
  });
})();
