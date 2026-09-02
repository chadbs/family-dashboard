/* ============================================================
   Display — the always-on wall.

   The same app, opened at /display on the Surface in the kitchen, becomes
   a wall: no tabs, no chrome, glanceable from across the room. A clock and
   the backyard weather stay put on the left; the right side rotates slowly
   through the things worth knowing today.

   Read-only by design. Nobody checks things off on the wall in this view;
   that happens on a phone, and the wall follows within seconds.
   ============================================================ */

const Display = (function () {
  const ROTATE_MS = 12000;
  const FADE_MS = 650;

  let started = false;
  let panelIdx = 0;
  let clockEl = null;
  let dateEl = null;
  let panelHost = null;
  let dotsEl = null;
  let lastMinute = -1;

  function active() {
    try {
      if (location.pathname.indexOf("/display") === 0) return true;
      return new URLSearchParams(location.search).get("display") === "1";
    } catch (e) {
      return false;
    }
  }

  /* The wall goes dark in the evening and light in the morning, the same
     hours the old wall used, regardless of the machine's own setting. */
  function applyWallTheme(now) {
    const h = now.getHours();
    const dark = h >= 19 || h < 7;
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }

  /* ---------- the fixed side ---------- */

  function timeParts(now) {
    let h = now.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return { hm: h + ":" + String(now.getMinutes()).padStart(2, "0"), ampm: ampm };
  }

  function renderClock(now) {
    const t = timeParts(now);
    clockEl = UI.h(
      "div",
      { class: "wall-time" },
      UI.h("span", { class: "wall-hm nums", text: t.hm }),
      UI.h("span", { class: "wall-ampm", text: t.ampm })
    );
    dateEl = UI.h("div", {
      class: "wall-date",
      text: Fmt.date(now, { weekday: "long", month: "long", day: "numeric" }),
    });
    return UI.h("div", { class: "wall-clock" }, clockEl, dateEl);
  }

  function tickClock() {
    const now = new Date();
    if (clockEl && document.contains(clockEl)) {
      const t = timeParts(now);
      const hm = clockEl.firstChild;
      const ap = clockEl.lastChild;
      if (hm && hm.textContent !== t.hm) hm.textContent = t.hm;
      if (ap && ap.textContent !== t.ampm) ap.textContent = t.ampm;
    }
    const minute = now.getMinutes();
    if (minute !== lastMinute) {
      lastMinute = minute;
      applyWallTheme(now);
      if (dateEl && document.contains(dateEl)) {
        const d = Fmt.date(now, { weekday: "long", month: "long", day: "numeric" });
        if (dateEl.textContent !== d) dateEl.textContent = d;
      }
    }
  }

  function renderWeatherBlock(now) {
    const w = Weather.reading();
    if (!w) {
      const sun = Almanac.sunTimes(now);
      return UI.h(
        "div",
        { class: "wall-wx wall-wx-empty" },
        UI.h("div", { class: "wall-wx-cond", text: "Sunrise " + Fmt.time(sun.sunrise) }),
        UI.h("div", { class: "wall-wx-where", text: "Sunset " + Fmt.time(sun.sunset) })
      );
    }
    return UI.h(
      "div",
      { class: "wall-wx" },
      UI.h(
        "div",
        { class: "wall-wx-top" },
        UI.h("span", { class: "wall-wx-emoji", text: w.emoji }),
        UI.h(
          "span",
          { class: "wall-temp nums" },
          w.temp === null ? "--" : String(w.temp),
          UI.h("span", { class: "wall-deg", text: "°" })
        )
      ),
      UI.h("div", { class: "wall-wx-cond", text: w.condition || "" }),
      UI.h(
        "div",
        { class: "wall-wx-line" },
        UI.h("span", { class: "wall-wx-where", text: w.fromSensor ? "Backyard" : "Hudsonville" }),
        w.hi !== null
          ? UI.h("span", {
              class: "wall-wx-hilo nums",
              text: "H " + w.hi + "°  L " + (w.lo === null ? "--" : w.lo) + "°",
            })
          : null
      ),
      w.indoor !== null
        ? UI.h("div", { class: "wall-wx-sub nums", text: "Inside " + w.indoor + "°" })
        : null
    );
  }

  function renderSunLine(now) {
    const sun = Almanac.sunTimes(now);
    return UI.h(
      "div",
      { class: "wall-sun nums" },
      UI.h("span", {}, UI.icon("sunrise"), " " + Fmt.time(sun.sunrise)),
      UI.h("span", {}, UI.icon("sunset"), " " + Fmt.time(sun.sunset))
    );
  }

  /* ---------- the rotating panels ---------- */

  function eyebrow(text) {
    return UI.h("div", { class: "wall-eyebrow", text: text });
  }

  function panelCleaning(now) {
    const tasks = House.todayTasks(now) || [];
    if (!tasks.length) return null;
    const done = tasks.filter(function (t) {
      return t.done;
    }).length;
    const mins = tasks.reduce(function (s, t) {
      return s + (Number(t.min) || 0);
    }, 0);
    const allDone = done === tasks.length;
    return UI.h(
      "div",
      { class: "wall-panel" },
      eyebrow("Today's cleaning · " + House.zoneName(Fmt.dayIdx(now))),
      UI.h(
        "div",
        { class: "wall-list" },
        tasks.map(function (t) {
          return UI.h(
            "div",
            { class: "wall-task", "data-done": t.done ? "true" : "false" },
            UI.h("span", { class: "wall-task-box" }, UI.icon("check")),
            UI.h("span", { class: "wall-task-text", text: t.text })
          );
        })
      ),
      UI.h("div", {
        class: "wall-foot nums",
        text: allDone
          ? "All done today"
          : done + " of " + tasks.length + " done · " + Fmt.minutes(mins),
      })
    );
  }

  function panelTonight(now) {
    const slot = Plan.slotFor(now);
    if (!slot) return null;
    const d = Plan.describe(slot);
    if (!d || !d.name) return null;
    return UI.h(
      "div",
      { class: "wall-panel wall-center" },
      eyebrow("Tonight's dinner"),
      UI.h("div", { class: "wall-big-emoji", text: d.emoji || "\u{1F372}" }),
      UI.h("div", { class: "wall-title", text: d.name }),
      d.sub ? UI.h("div", { class: "wall-sub", text: d.sub }) : null
    );
  }

  function panelWeek(now) {
    const week = Plan.week(now) || {};
    const rows = [];
    let any = false;
    const monday = Fmt.weekStart(now);
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const slot = week[DAY_KEYS[i]];
      const d = slot ? Plan.describe(slot) : null;
      if (d && d.name) any = true;
      rows.push(
        UI.h(
          "div",
          { class: "wall-week-row", "data-today": Fmt.dayKey(date) === Fmt.dayKey(now) ? "true" : "false" },
          UI.h("span", { class: "wall-week-day", text: Fmt.dayAbbr(i) }),
          UI.h("span", { class: "wall-week-emoji", text: d && d.name ? d.emoji : "" }),
          UI.h("span", {
            class: "wall-week-name" + (d && d.name ? "" : " wall-week-empty"),
            text: d && d.name ? d.name : "open",
          })
        )
      );
    }
    if (!any) return null;
    return UI.h("div", { class: "wall-panel" }, eyebrow("This week's dinners"), UI.h("div", { class: "wall-week" }, rows));
  }

  function panelStars() {
    const shop = Rewards.shop() || {};
    const kids = shop.kids || [];
    if (!kids.length) return null;
    const state = Rewards.state() || {};
    const today = Fmt.dayKey();
    const yesterday = Fmt.dayKey(new Date(Date.now() - 86400000));
    return UI.h(
      "div",
      { class: "wall-panel" },
      eyebrow("Star jars"),
      UI.h(
        "div",
        { class: "wall-jars" },
        kids.map(function (k) {
          const streak = state.streak && state.streak[k.name];
          const live = streak && (streak.last === today || streak.last === yesterday) && streak.count > 1;
          return UI.h(
            "div",
            { class: "wall-jar" },
            UI.h("div", { class: "wall-jar-emoji", text: k.emoji || "⭐" }),
            UI.h("div", { class: "wall-jar-name", text: k.name }),
            UI.h(
              "div",
              { class: "wall-jar-count nums" },
              String(Rewards.balance(k.name)),
              UI.h("span", { class: "wall-jar-star", text: " " + (shop.starEmoji || "⭐") })
            ),
            live ? UI.h("div", { class: "wall-jar-streak", text: "\u{1F525} " + streak.count + " days in a row" }) : null
          );
        })
      )
    );
  }

  function panelAttention(now) {
    const items = (House.attention(now) || []).slice(0, 4);
    if (!items.length) return null;
    return UI.h(
      "div",
      { class: "wall-panel" },
      eyebrow("Needs doing"),
      UI.h(
        "div",
        { class: "wall-list" },
        items.map(function (it) {
          return UI.h(
            "div",
            { class: "wall-row" },
            UI.h("span", { class: "pri-stripe pri-" + (it.tone || "someday") }),
            UI.h(
              "span",
              { class: "wall-row-main" },
              UI.h("span", { class: "wall-row-title", text: it.title }),
              it.sub ? UI.h("span", { class: "wall-row-sub", text: it.sub }) : null
            )
          );
        })
      )
    );
  }

  function panelSeason(now) {
    const items = (Almanac.inSeason(now) || []).slice(0, 3);
    if (!items.length) return null;
    return UI.h(
      "div",
      { class: "wall-panel" },
      eyebrow("In season in Michigan"),
      UI.h(
        "div",
        { class: "wall-list" },
        items.map(function (p) {
          return UI.h(
            "div",
            { class: "wall-row" },
            UI.h("span", { class: "wall-row-emoji", text: p.emoji }),
            UI.h(
              "span",
              { class: "wall-row-main" },
              UI.h("span", { class: "wall-row-title", text: p.name }),
              UI.h("span", { class: "wall-row-sub", text: p.note })
            )
          );
        })
      )
    );
  }

  function panelForecast() {
    const w = Weather.reading();
    if (!w || !w.days || w.days.length < 2) return null;
    return UI.h(
      "div",
      { class: "wall-panel" },
      eyebrow("The week ahead"),
      UI.h(
        "div",
        { class: "wall-fc" },
        w.days.slice(0, 5).map(function (d, i) {
          const date = Fmt.fromDayKey(d.date);
          const desc = Weather.describe(d.code);
          return UI.h(
            "div",
            { class: "wall-fc-day" },
            UI.h("div", { class: "wall-fc-name", text: i === 0 ? "Today" : Fmt.dayAbbr(Fmt.dayIdx(date)) }),
            UI.h("div", { class: "wall-fc-emoji", text: desc.emoji }),
            UI.h("div", { class: "wall-fc-hi nums", text: d.hi === null ? "--" : d.hi + "°" }),
            UI.h("div", { class: "wall-fc-lo nums", text: d.lo === null ? "--" : d.lo + "°" }),
            d.rain !== null && d.rain >= 30 ? UI.h("div", { class: "wall-fc-rain nums", text: d.rain + "%" }) : null
          );
        })
      )
    );
  }

  function panelSky(now) {
    const sun = Almanac.sunTimes(now);
    const moon = Almanac.moonPhase(now);
    const bday = Almanac.nextBirthday(now);
    const cells = [
      ["Sunrise", Fmt.time(sun.sunrise)],
      ["Sunset", Fmt.time(sun.sunset)],
      ["Daylight", sun.dayLength],
      ["Moon", moon.emoji + " " + moon.name],
    ];
    const kids = [];
    if (bday && bday.daysAway <= 45) {
      kids.push(
        UI.h("div", {
          class: "wall-note",
          text:
            bday.daysAway === 0
              ? "\u{1F382} " + bday.name + " turns " + bday.turning + " today"
              : "\u{1F382} " + bday.name + " turns " + bday.turning + " in " + bday.daysAway + " days",
        })
      );
    }
    return UI.h(
      "div",
      { class: "wall-panel" },
      eyebrow("Sun and moon"),
      UI.h(
        "div",
        { class: "wall-grid2" },
        cells.map(function (c) {
          return UI.h(
            "div",
            { class: "wall-cell" },
            UI.h("div", { class: "wall-cell-val nums", text: c[1] }),
            UI.h("div", { class: "wall-cell-key", text: c[0] })
          );
        })
      ),
      kids
    );
  }

  function panelTip(now) {
    const tip = Almanac.tip(now);
    if (!tip || !tip.text) return null;
    return UI.h(
      "div",
      { class: "wall-panel wall-center" },
      eyebrow("Good to know"),
      UI.h("div", { class: "wall-tip", text: tip.text })
    );
  }

  /* The one panel the kids touch: their chores, tappable on the wall. A tap
     drops a star in the jar and holds the rotation so the panel does not
     slide away mid-tap. */
  function panelChores() {
    if (typeof Chores === "undefined") return null;
    const blocks = Chores.kidBlocks({ big: true });
    if (!blocks.length) return null;
    return UI.h(
      "div",
      { class: "wall-panel" },
      eyebrow("Chores"),
      UI.h("div", { class: "wall-chores" }, blocks)
    );
  }

  const PANELS = [
    panelCleaning,
    panelChores,
    panelTonight,
    panelStars,
    panelAttention,
    panelWeek,
    panelForecast,
    panelSeason,
    panelSky,
    panelTip,
  ];

  /* Build the panel at an index, or the next one that has something to
     say. Returns { node, idx }. */
  function buildPanel(fromIdx) {
    const now = new Date();
    for (let n = 0; n < PANELS.length; n++) {
      const i = (fromIdx + n) % PANELS.length;
      let node = null;
      try {
        node = PANELS[i](now);
      } catch (e) {
        node = null;
      }
      if (node) return { node: node, idx: i };
    }
    return { node: UI.h("div", { class: "wall-panel wall-center" }, UI.h("div", { class: "wall-tip", text: "All quiet." })), idx: fromIdx };
  }

  function renderDots(current) {
    if (!dotsEl) return;
    dotsEl.textContent = "";
    PANELS.forEach(function (_, i) {
      dotsEl.appendChild(UI.h("span", { class: "wall-dot", "data-on": i === current ? "true" : "false" }));
    });
  }

  function showPanel(idx, animate) {
    if (!panelHost || !document.contains(panelHost)) return;
    const built = buildPanel(idx);
    panelIdx = built.idx;
    const incoming = built.node;
    const outgoing = panelHost.firstElementChild;
    if (animate && outgoing) {
      outgoing.classList.add("wall-out");
      incoming.classList.add("wall-in");
      panelHost.appendChild(incoming);
      setTimeout(function () {
        outgoing.remove();
        incoming.classList.remove("wall-in");
      }, FADE_MS);
    } else {
      panelHost.textContent = "";
      panelHost.appendChild(incoming);
    }
    renderDots(panelIdx);
  }

  /* A touch anywhere holds the current panel for a while — a kid working
     through their chores must not have the screen change under them. */
  let holdUntil = 0;
  function hold() {
    holdUntil = Date.now() + 45000;
  }

  function rotate() {
    if (Date.now() < holdUntil) return;
    showPanel((panelIdx + 1) % PANELS.length, true);
  }

  /* ---------- the screen ---------- */

  function renderDisplay(root) {
    const now = new Date();
    root.classList.add("wall");

    const side = UI.h(
      "aside",
      { class: "wall-side" },
      renderClock(now),
      renderWeatherBlock(now),
      renderSunLine(now)
    );

    panelHost = UI.h("div", { class: "wall-stage" });
    dotsEl = UI.h("div", { class: "wall-dots", "aria-hidden": "true" });
    const mainCol = UI.h("section", { class: "wall-main" }, panelHost, dotsEl);

    root.appendChild(side);
    root.appendChild(mainCol);

    /* A repaint (the store changed) keeps the current panel, so the wall
       never jumps back to the first card just because a box was ticked. */
    showPanel(panelIdx, false);
    applyWallTheme(now);
  }

  /* Timers start exactly once for the life of the page. A repaint replaces
     the DOM; the tickers find the new nodes through the module refs and
     no-op when nothing is mounted. */
  function start() {
    if (started) return;
    started = true;
    Router.go("display");
    setInterval(tickClock, 1000);
    setInterval(rotate, ROTATE_MS);
    document.addEventListener("pointerdown", hold, { passive: true });
  }

  Router.on("display", renderDisplay);

  return { active: active, start: start };
})();
