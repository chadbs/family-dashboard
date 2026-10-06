/* ============================================================
   Love — the daily note for Kenzie.

   Carried over from the wall exactly as it behaved there: once a day,
   inside a morning window starting at LOVE.hour, one of Chad's messages
   fills the screen; tap anywhere to close. "Already shown today" is kept
   per device on purpose — it should greet her on her phone and on the
   wall independently, not once for the whole family.

   Two sources of words. Chad's originals live in data/love.js, generated
   byte-for-byte from public/config.js; nothing here edits them. The fresh
   set (data/love-fresh.js, October 2026) adds new shapes, notes for each
   season and weekday, and a few written each morning from the real
   weather and tonight's dinner. Over every ten days she gets three
   seasonal notes, three new ones, two from the day itself, one for the
   day of the week, and one of the originals — and each kind works through
   its whole list before anything comes round again.
   ============================================================ */

const Love = (function () {
  const SHOWN_KEY = "house-love-shown";
  const NOW_KEY = "house-love-now-seen";
  const GLYPHS = ["\u{1F49A}", "\u{1F5A4}", "\u{1F495}", "\u{1F334}", "\u{2728}", "\u{1F497}"];

  function conf() {
    return typeof LOVE !== "undefined" && LOVE ? LOVE : null;
  }

  function lsGet(k) {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  }
  function lsSet(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch (e) {
      /* private window: she just sees it again next time, no harm */
    }
  }

  /* What kind of note each day of a ten-day cycle gets. */
  const CYCLE = ["season", "live", "fresh", "season", "day", "fresh", "season", "live", "fresh", "original"];

  function localDay(d) {
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }

  function seasonOf(d) {
    const m = d.getMonth();
    if (m === 11 && d.getDate() <= 25) return "christmas";
    if (m === 11 || m <= 1) return "winter";
    if (m <= 4) return "spring";
    if (m <= 7) return "summer";
    return "fall";
  }

  /* How many times this kind of day has come round before today. Using it
     as the index walks each list in order, never repeating until the list
     is used up. */
  function nth(day, kind) {
    const slots = [];
    CYCLE.forEach(function (k, i) { if (k === kind) slots.push(i); });
    const len = CYCLE.length;
    const pos = ((day % len) + len) % len;
    return Math.floor(day / len) * slots.length + slots.indexOf(pos);
  }

  function at(list, n) {
    return list[((n % list.length) + list.length) % list.length];
  }

  /* The day itself, for the notes written fresh each morning. */
  function theDay(d) {
    let w = null;
    try { w = typeof Weather !== "undefined" ? Weather.reading() : null; } catch (e) { w = null; }
    if (w && w.stale) w = null;
    let dinner = "", kind = "";
    try {
      if (window.Plan) {
        const slot = Plan.slotFor(d);
        if (slot) {
          kind = slot.kind || "";
          const desc = Plan.describe(slot) || {};
          if (desc.name && desc.name !== "Recipe was deleted") dinner = desc.name.replace(/\s*\([^)]*\)/g, "").trim();
        }
      }
    } catch (e) { dinner = ""; }
    return {
      temp: w && w.temp !== null && w.temp !== undefined ? w.temp : null,
      hi: w && w.hi !== null && w.hi !== undefined ? w.hi : null,
      condition: (w && w.condition) || "",
      dinner: dinner,
      dinnerKind: kind,
      weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
    };
  }

  /* Same message for the whole day, a different one tomorrow, and the same
     one on the wall and on her phone. */
  function messageFor(date) {
    const c = conf();
    const d = date || new Date();
    const day = localDay(d);
    const originals = c && c.messages && c.messages.length ? c.messages : null;
    const F = typeof LOVE_FRESH !== "undefined" ? LOVE_FRESH : null;
    if (!F) return originals ? at(originals, day) : null;

    const kind = CYCLE[((day % CYCLE.length) + CYCLE.length) % CYCLE.length];
    const n = nth(day, kind);
    if (kind === "original" && originals) return at(originals, n);
    if (kind === "season") {
      const pool = F.seasons[seasonOf(d)];
      if (pool && pool.length) return at(pool, n);
    }
    if (kind === "day") {
      const pool = F.days[d.getDay()];
      if (pool && pool.length) return at(pool, n);
    }
    if (kind === "live") {
      const facts = theDay(d);
      for (let i = 0; i < F.live.length; i++) {
        let text = null;
        try { text = at(F.live, n + i)(facts); } catch (e) { text = null; }
        if (text) return text;
      }
    }
    /* "fresh", and anything above that had nothing for today */
    return at(F.any, nth(day, "fresh") + (kind === "fresh" ? 0 : 17));
  }

  function due(date) {
    const c = conf();
    if (!c || !c.to || !c.messages || !c.messages.length) return false;
    const d = date || new Date();
    const hour = typeof c.hour === "number" ? c.hour : 7;
    const h = d.getHours();
    if (h < hour || h >= hour + 6) return false;
    return lsGet(SHOWN_KEY) !== Fmt.dayKey(d);
  }

  /* The one-time surprise note (LOVE.now), shown once per distinct text —
     the wall's showLoveNow behaviour. */
  function surpriseDue() {
    const c = conf();
    if (!c || !c.now) return false;
    return lsGet(NOW_KEY) !== c.now;
  }

  let open = null;

  function drift(host) {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    for (let i = 0; i < 14; i++) {
      const g = UI.h("span", {
        class: "love-glyph",
        text: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        style: {
          left: Math.random() * 100 + "%",
          fontSize: 18 + Math.random() * 26 + "px",
          animationDelay: Math.random() * 2.2 + "s",
          animationDuration: 3.4 + Math.random() * 2.6 + "s",
        },
      });
      host.appendChild(g);
    }
  }

  function present(eyebrow, message, onClose) {
    if (open) open();
    const glyphs = UI.h("div", { class: "love-glyphs", "aria-hidden": "true" });
    drift(glyphs);

    const closeBtn = UI.h(
      "button",
      { class: "love-close", type: "button" },
      "xoxo  \u{1F48B}"
    );

    const card = UI.h(
      "div",
      { class: "love-card", role: "dialog", "aria-modal": "true", "aria-label": eyebrow },
      UI.h("div", { class: "love-eyebrow", text: eyebrow }),
      UI.h("p", { class: "love-msg", text: message }),
      closeBtn
    );

    const scrim = UI.h("div", { class: "love-scrim" }, glyphs, card);

    function close() {
      if (!open) return;
      open = null;
      scrim.classList.add("love-out");
      document.removeEventListener("keydown", onKey);
      setTimeout(function () {
        scrim.remove();
      }, 260);
      if (onClose) onClose();
    }
    function onKey(e) {
      if (e.key === "Escape") close();
    }

    scrim.addEventListener("click", close);
    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      close();
    });
    document.addEventListener("keydown", onKey);

    open = close;
    document.body.appendChild(scrim);
    closeBtn.focus({ preventScroll: true });
  }

  function show(date) {
    const c = conf();
    const msg = messageFor(date);
    if (!c || !msg) return false;
    const d = date || new Date();
    lsSet(SHOWN_KEY, Fmt.dayKey(d));
    present("Good morning, " + c.to + " \u{1F49A}", msg);
    return true;
  }

  function showSurprise() {
    const c = conf();
    if (!c || !c.now) return false;
    lsSet(NOW_KEY, c.now);
    present("\u{1F48C} A surprise note for " + c.to, c.now);
    return true;
  }

  /* Boot calls this once; it checks every minute so the note lands at the
     hour, exactly as the wall does. */
  let ticking = false;
  function watch() {
    if (ticking) return;
    ticking = true;
    function tick() {
      try {
        /* Not over a child's game: the note stays due, and lands within a
           minute of the game being closed. */
        if (typeof Engine !== "undefined" && Engine.current()) return;
        if (surpriseDue()) showSurprise();
        else if (due()) show();
      } catch (e) {
        /* the love note must never take the app down */
      }
    }
    tick();
    setInterval(tick, 60 * 1000);
  }

  return {
    messageFor: messageFor,
    due: due,
    show: show,
    showSurprise: showSurprise,
    watch: watch,
  };
})();
