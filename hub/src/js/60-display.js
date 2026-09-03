/* ============================================================
   Display — the Surface on the kitchen wall.

   It is the ordinary app, in full, with every button and checkbox live:
   give a star, tick a chore, plan a dinner, edit a job. Nothing is hidden
   and nothing rotates — the family walks up to it and uses it.

   What /display adds over / is only what an always-on screen wants:

     * a thin bar across the top with the time, the date and the backyard
       temperature, so a glance from across the room is worth something;
     * light through the day, dark from 7pm, whatever the machine's own
       setting says;
     * slightly larger type, because it is read standing up;
     * a reload at 4am so a screen left running for months quietly picks up
       new builds.
   ============================================================ */

const Display = (function () {
  let started = false;
  let clockEl = null;
  let dateEl = null;
  let tempEl = null;

  function active() {
    try {
      if (location.pathname.indexOf("/display") === 0) return true;
      return new URLSearchParams(location.search).get("display") === "1";
    } catch (e) {
      return false;
    }
  }

  /* Light by day, dark in the evening — the hours the old wall used. */
  function applyWallTheme(now) {
    const h = (now || new Date()).getHours();
    document.documentElement.setAttribute("data-theme", h >= 19 || h < 7 ? "dark" : "light");
  }

  function buildBar() {
    clockEl = UI.h("div", { class: "wb-time nums" });
    dateEl = UI.h("div", { class: "wb-date" });
    tempEl = UI.h("div", { class: "wb-temp" });
    document.body.appendChild(
      UI.h(
        "div",
        { class: "wallbar" },
        UI.h("div", { class: "wb-left" }, clockEl, dateEl),
        UI.h("div", { class: "wb-mid" }),
        tempEl
      )
    );
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

  function start() {
    if (started) return;
    started = true;
    buildBar();
    tick();
    Router.go("today");
    setInterval(tick, 1000);
    /* Nothing accumulates on a screen that runs for months, and it picks up
       whatever has shipped since. 4am, when nobody is looking at it. */
    setInterval(function () {
      if (new Date().getHours() === 4) location.reload();
    }, 60 * 60 * 1000);
  }

  return { active: active, start: start };
})();
