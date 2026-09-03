/* ============================================================
   Boot — tab bar, housekeeping, start.
   Runs last; every view module has registered itself by now.
   ============================================================ */

const TABS = [
  { route: "today", label: "Today", icon: "sun" },
  { route: "meals", label: "Meals", icon: "pot" },
  { route: "recipes", label: "Recipes", icon: "book" },
  { route: "house", label: "House", icon: "home" },
  { route: "rewards", label: "Stars", icon: "star" },
];

function buildTabBar() {
  const bar = document.getElementById("tabbar");
  bar.textContent = "";
  bar.appendChild(UI.h("div", { class: "brand", text: "The Solanyk House" }));
  TABS.forEach(function (t) {
    bar.appendChild(
      UI.h(
        "button",
        {
          type: "button",
          data: { route: t.route },
          on: {
            click: function () {
              Router.go(t.route);
            },
          },
        },
        UI.icon(t.icon),
        UI.h("span", { text: t.label })
      )
    );
  });
}

/* Date-keyed documents are fields, not documents, so they only grow. Trim
   them once per session to keep the store small and the app quick. */
function prune() {
  const today = Fmt.fromDayKey(Fmt.dayKey());

  function daysOld(key) {
    const d = Fmt.fromDayKey(key);
    if (isNaN(d)) return 1e6;
    return Math.round((today - d) / 86400000);
  }

  const checks = Store.get("checks");
  const keptChecks = {};
  let droppedChecks = 0;
  Object.keys(checks).forEach(function (k) {
    if (daysOld(k) <= 60) keptChecks[k] = checks[k];
    else droppedChecks++;
  });
  if (droppedChecks) Store.setDoc("checks", keptChecks);

  const daily = Store.get("daily");
  const keptDaily = {};
  let droppedDaily = 0;
  Object.keys(daily).forEach(function (k) {
    if (daysOld(k) <= 14) keptDaily[k] = daily[k];
    else droppedDaily++;
  });
  if (droppedDaily) Store.setDoc("daily", keptDaily);

  const plan = Store.get("plan");
  const weeks = Object.keys(plan).sort();
  if (weeks.length > 8) {
    const kept = {};
    weeks.slice(-8).forEach(function (w) {
      kept[w] = plan[w];
    });
    Store.setDoc("plan", kept);
  }
}

/* The app is left open on a phone overnight. When the date rolls over,
   Today has to become today. */
function watchMidnight() {
  let seen = Fmt.dayKey();
  setInterval(function () {
    const now = Fmt.dayKey();
    if (now !== seen) {
      seen = now;
      Router.refresh();
    }
  }, 30000);
}

async function boot() {
  buildTabBar();
  Router.mount(document.getElementById("main"));
  Store.on(Router.refresh);

  /* The wall opens /display and gets the always-on view; everything else
     gets the phone app. Same page, same data. */
  const wall = typeof Display !== "undefined" && Display.active();
  if (wall) {
    document.body.classList.add("display-mode");
    document.documentElement.classList.add("display-root");
    Display.start();
  } else {
    Router.go("today");
  }

  watchMidnight();

  /* Kenzie's morning note, on whichever screen she is looking at. */
  if (typeof Love !== "undefined") Love.watch();

  Ask.init().then(function () {
    Router.refresh();
  });

  await Store.connect();
  await Store.ready;
  /* On the hosted app a nightly cron does the pruning, so a phone opening
     the app never has to spend its first seconds on housekeeping. Offline
     and artifact copies still tidy after themselves. */
  if (Store.mode !== "server") prune();
  Router.refresh();

  /* The backyard sensor, once we know whether this copy of the page can
     reach it. Refreshed while the app is open, paused when it is not. */
  if (await Weather.refresh()) Router.refresh();
  /* The server caches the forecast for ten minutes anyway, and the backyard
     sensor only reports every five, so asking more often than this just
     spends requests. */
  setInterval(function () {
    if (document.hidden) return;
    Weather.refresh().then(function (ok) {
      if (ok && Router.current() === "today") Router.refresh();
    });
  }, 15 * 60 * 1000);
}

boot();
