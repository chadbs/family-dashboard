/* ============================================================
   Display — the always-on wall on the Surface.

   It shows the REAL pages, slowly rotating: Today, this week's dinners,
   the cleaning routine, the kids' chores and stars. Not a bespoke wall
   layout with giant numbers — the same screens the phones show, just
   bigger, with the tab bar swapped for a thin bar across the top that
   carries the clock and the backyard temperature.

   Rotating the actual pages means the wall never drifts out of step with
   the app: anything added to a screen shows up here for free.

   Touch anything and the rotation holds for a minute, so a kid ticking
   off chores does not have the page slide away mid-tap.
   ============================================================ */

const Display = (function () {
  const ROTATE_MS = 24000;
  const HOLD_MS = 60000;

  /* Where the wall stops, in order. `before` puts a screen into the right
     sub-tab so the rotation always shows the useful face of it. */
  const STOPS = [
    { route: "today", label: "Today" },
    {
      route: "meals",
      label: "This week",
      before: function () {
        UI.state.mealsTab = "week";
        UI.state.weekOffset = 0;
      },
    },
    {
      route: "house",
      label: "Cleaning",
      before: function () {
        UI.state.houseTab = "cleaning";
        UI.state.openDay = DAY_KEYS[Fmt.dayIdx(new Date())];
      },
    },
    { route: "rewards", label: "Chores & stars" },
    {
      route: "meals",
      label: "Grocery list",
      before: function () {
        UI.state.mealsTab = "grocery";
      },
      skip: function () {
        return !Store.list("grocery").length;
      },
    },
  ];

  let started = false;
  let idx = 0;
  let holdUntil = 0;
  let bar = null;
  let clockEl = null;
  let dateEl = null;
  let tempEl = null;
  let dotsEl = null;

  function active() {
    try {
      if (location.pathname.indexOf("/display") === 0) return true;
      return new URLSearchParams(location.search).get("display") === "1";
    } catch (e) {
      return false;
    }
  }

  /* Light by day, dark in the evening — the same hours the old wall used,
     whatever the machine's own setting is. */
  function applyWallTheme(now) {
    const h = (now || new Date()).getHours();
    document.documentElement.setAttribute("data-theme", h >= 19 || h < 7 ? "dark" : "light");
  }

  function buildBar() {
    clockEl = UI.h("div", { class: "wb-time nums" });
    dateEl = UI.h("div", { class: "wb-date" });
    tempEl = UI.h("div", { class: "wb-temp" });
    dotsEl = UI.h("div", { class: "wb-dots", "aria-hidden": "true" });
    bar = UI.h(
      "div",
      { class: "wallbar" },
      UI.h("div", { class: "wb-left" }, clockEl, dateEl),
      UI.h("div", { class: "wb-mid" }, dotsEl),
      tempEl
    );
    document.body.appendChild(bar);
  }

  function tick() {
    const now = new Date();
    if (clockEl) {
      let h = now.getHours();
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      const t = h + ":" + String(now.getMinutes()).padStart(2, "0") + " " + ampm;
      if (clockEl.textContent !== t) clockEl.textContent = t;
    }
    if (dateEl) {
      const d = Fmt.date(now, { weekday: "long", month: "long", day: "numeric" });
      if (dateEl.textContent !== d) dateEl.textContent = d;
    }
    if (tempEl) {
      let txt = "";
      try {
        const w = Weather.reading();
        if (w && w.temp !== null) {
          txt = w.emoji + "  " + w.temp + "°  " + (w.fromSensor ? "Backyard" : "Hudsonville");
        }
      } catch (e) {
        txt = "";
      }
      if (tempEl.textContent !== txt) tempEl.textContent = txt;
    }
    applyWallTheme(now);
  }

  function paintDots() {
    if (!dotsEl) return;
    dotsEl.textContent = "";
    STOPS.forEach(function (s, i) {
      dotsEl.appendChild(UI.h("span", { class: "wb-dot", "data-on": i === idx ? "true" : "false" }));
    });
  }

  function show(i) {
    for (let n = 0; n < STOPS.length; n++) {
      const s = STOPS[(i + n) % STOPS.length];
      let skip = false;
      try {
        skip = s.skip ? s.skip() : false;
      } catch (e) {
        skip = false;
      }
      if (skip) continue;
      idx = (i + n) % STOPS.length;
      try {
        if (s.before) s.before();
      } catch (e) {
        /* a bad sub-tab must not stop the wall */
      }
      Router.go(s.route);
      paintDots();
      return;
    }
    Router.go("today");
  }

  function rotate() {
    if (Date.now() < holdUntil) return;
    show(idx + 1);
  }

  function hold() {
    holdUntil = Date.now() + HOLD_MS;
  }

  function start() {
    if (started) return;
    started = true;
    buildBar();
    tick();
    show(0);
    setInterval(tick, 1000);
    setInterval(rotate, ROTATE_MS);
    document.addEventListener("pointerdown", hold, { passive: true });
    /* A wall left running for months should not accumulate anything; the
       page reloads itself nightly so the app also picks up new builds. */
    setInterval(function () {
      const h = new Date().getHours();
      if (h === 4) location.reload();
    }, 60 * 60 * 1000);
  }

  return { active: active, start: start };
})();
