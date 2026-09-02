/* ============================================================
   Today — the page Kenzie opens at 7am.
   Pure function of the store: header, sun strip, today's cleaning,
   tonight's dinner, needs attention, good to know.
   Defines exactly one global: Router.on("today", ...).
   ============================================================ */

(function () {
  const ASK_LOADING_KEY = "todayAskLoading";

  const DONE_LINES = [
    "Every box checked. Go put your feet up for a few minutes.",
    "That's the whole list — nicely done.",
    "All done here. The house says thank you.",
    "Kitchen's clean, kids are fed, the day's ahead of you now.",
  ];

  function stableIndex(key, len) {
    let h = 0;
    const s = String(key);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % len;
  }

  /* ---------- header ---------- */

  function renderHeader(now) {
    return UI.h(
      "div",
      { class: "page-head" },
      UI.h("div", { class: "eyebrow", text: Fmt.greeting(now) }),
      UI.h("div", { class: "title", text: Fmt.dayName(Fmt.dayIdx(now)) }),
      UI.h("div", {
        class: "sub",
        text: Fmt.date(now, { month: "long", day: "numeric", year: "numeric" }),
      })
    );
  }

  /* ---------- sun strip ---------- */

  function sunCell(val, key) {
    return UI.h(
      "div",
      { class: "cell" },
      UI.h("div", { class: "val", text: val }),
      UI.h("div", { class: "key", text: key })
    );
  }

  function renderSunStrip(now) {
    let sun;
    try {
      sun = Almanac.sunTimes(now);
    } catch (e) {
      sun = null;
    }
    let moon;
    try {
      moon = Almanac.moonPhase(now);
    } catch (e) {
      moon = null;
    }

    const cells = [];
    if (sun) {
      cells.push(sunCell(Fmt.time(sun.sunrise), "Sunrise"));
      cells.push(sunCell(Fmt.time(sun.sunset), "Sunset"));
      cells.push(sunCell(sun.dayLength, "Daylight"));
    }
    if (moon) {
      cells.push(sunCell(moon.emoji + " " + moon.name, "Moon"));
    }
    if (!cells.length) return null;
    return UI.h("div", { class: "sunstrip" }, cells);
  }

  /* ---------- today's cleaning ---------- */

  function checkRow(task) {
    return UI.h(
      "button",
      {
        class: "check",
        type: "button",
        "aria-pressed": task.done ? "true" : "false",
        on: {
          click: function () {
            House.toggleTask(new Date(), task.id);
          },
        },
      },
      UI.h("span", { class: "box" }, UI.icon("check")),
      UI.h("div", { class: "check-main" }, UI.h("div", { class: "check-text", text: task.text })),
      UI.h("span", { class: "check-min", text: Fmt.minutes(task.min) })
    );
  }

  function renderCleaningCard(now) {
    const tasks = House.todayTasks() || [];
    const body = [];

    if (!tasks.length) {
      body.push(
        UI.empty(
          "broom",
          "No cleaning tasks are set up for today.",
          UI.h(
            "button",
            {
              class: "btn btn-primary",
              type: "button",
              on: {
                click: function () {
                  Router.go("house");
                },
              },
            },
            "Set up the routine"
          )
        )
      );
    } else {
      const doneCount = tasks.filter(function (t) {
        return !!t.done;
      }).length;
      const totalMin = tasks.reduce(function (sum, t) {
        return sum + (Number(t.min) || 0);
      }, 0);

      body.push(
        UI.h(
          "div",
          { class: "zone-head" },
          UI.h(
            "div",
            {},
            UI.h("div", { class: "zone-name", text: House.zoneName(Fmt.dayIdx(now)) }),
            UI.h("div", { class: "zone-sub", text: Fmt.minutes(totalMin) + " total" })
          )
        )
      );
      body.push(UI.h("div", { class: "zone-meter" }, UI.meter(doneCount, tasks.length)));
      body.push(
        UI.h(
          "div",
          { class: "rows" },
          tasks.map(function (t) {
            return checkRow(t);
          })
        )
      );

      if (tasks.length && doneCount === tasks.length) {
        body.push(
          UI.h(
            "div",
            { class: "done-note" },
            UI.icon("check"),
            UI.h("span", { text: DONE_LINES[stableIndex(Fmt.dayKey(now), DONE_LINES.length)] })
          )
        );
      }
    }

    return UI.h("div", { class: "card" }, body);
  }

  /* ---------- tonight's dinner ---------- */

  function renderDinnerSection(now) {
    let slot = null;
    try {
      slot = Plan.slotFor(now);
    } catch (e) {
      slot = null;
    }
    let desc = null;
    try {
      desc = Plan.describe(slot);
    } catch (e) {
      desc = null;
    }
    desc = desc || {};

    const name = desc.name || "Nothing planned yet";
    const sub = desc.name ? desc.sub || "" : "Tap to pick something for tonight";
    const glyph = desc.emoji || "\u{1F372}"; // pot of food, fallback

    const dinnerBtn = UI.h(
      "button",
      {
        class: "dinner",
        type: "button",
        on: {
          click: function () {
            if (slot && slot.kind === "recipe" && slot.recipeId) {
              Recipes.openSheet(slot.recipeId);
            } else {
              Plan.openPicker(now);
            }
          },
        },
      },
      UI.h("div", { class: "glyph", text: glyph }),
      UI.h(
        "div",
        { class: "dinner-main" },
        UI.h("div", { class: "dinner-name", text: name }),
        sub ? UI.h("div", { class: "dinner-sub", text: sub }) : null
      )
    );

    return UI.section("Tonight's dinner", null, UI.h("div", { class: "card" }, dinnerBtn));
  }

  /* ---------- needs attention ---------- */

  function attentionRow(item) {
    const tone = item.tone || "someday";
    return UI.h(
      "button",
      {
        class: "row",
        type: "button",
        on: {
          click: function () {
            if (item.kind === "job") House.openJobs();
            else Router.go("house");
          },
        },
      },
      UI.h("span", { class: "pri-stripe pri-" + tone }),
      UI.h(
        "div",
        { class: "row-main" },
        UI.h("div", { class: "row-title", text: item.title }),
        item.sub ? UI.h("div", { class: "row-sub", text: item.sub }) : null
      ),
      UI.h("span", { class: "row-end" }, UI.icon("chevron", 18))
    );
  }

  function renderAttentionSection(now) {
    let items = [];
    try {
      items = House.attention(now) || [];
    } catch (e) {
      items = [];
    }
    items = items.slice(0, 4);
    if (!items.length) return null;

    return UI.section(
      "Needs attention",
      null,
      UI.h(
        "div",
        { class: "card" },
        UI.h(
          "div",
          { class: "rows" },
          items.map(function (it) {
            return attentionRow(it);
          })
        )
      )
    );
  }

  /* ---------- good to know ---------- */

  function staticRow(iconName, colorVar, text) {
    return UI.h(
      "div",
      { class: "row row-static" },
      UI.h(
        "span",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "22px",
            height: "22px",
            flexShrink: "0",
            color: "var(--" + colorVar + ")",
          },
        },
        UI.icon(iconName, 18)
      ),
      UI.h("div", { class: "row-main" }, UI.h("div", { class: "row-title", text: text }))
    );
  }

  function buildAskPrompt(now, zoneName, tasks, dinnerLine, jobLines, season, inSeasonNames) {
    return (
      "Today is " +
      Fmt.date(now) +
      " in Hudsonville, Michigan. It's " +
      season +
      ". In season: " +
      (inSeasonNames.length ? inSeasonNames.join(", ") : "nothing notable") +
      ". Today's cleaning zone is \"" +
      zoneName +
      "\" (" +
      tasks.length +
      " tasks). Tonight's dinner: " +
      dinnerLine +
      ". Most pressing jobs: " +
      (jobLines.length ? jobLines.join("; ") : "none pending") +
      ". Give 2-3 short, concrete suggestions for what today specifically needs. " +
      "Under 60 words total. No preamble, no markdown."
    );
  }

  function renderAskBlock(now) {
    if (!Ask.available()) return null;

    const dayKey = Fmt.dayKey(now);
    const daily = Store.get("daily") || {};
    const existing = daily[dayKey] && daily[dayKey].tip;

    function askClaude() {
      UI.state[ASK_LOADING_KEY] = true;
      Router.refresh();

      let zoneName = "";
      let tasks = [];
      try {
        tasks = House.todayTasks() || [];
        zoneName = House.zoneName(Fmt.dayIdx(now));
      } catch (e) {
        tasks = [];
      }

      let dinnerLine = "nothing planned";
      try {
        const slot = Plan.slotFor(now);
        const desc = Plan.describe(slot) || {};
        if (desc.name) dinnerLine = desc.name;
      } catch (e) {
        /* leave default */
      }

      let jobLines = [];
      try {
        jobLines = (House.attention(now) || [])
          .filter(function (a) {
            return a.kind === "job";
          })
          .slice(0, 2)
          .map(function (a) {
            return a.title;
          });
      } catch (e) {
        jobLines = [];
      }

      let season = "";
      let inSeasonNames = [];
      try {
        season = Almanac.season(now);
        inSeasonNames = (Almanac.inSeason(now) || []).map(function (i) {
          return i.name;
        });
      } catch (e) {
        /* leave defaults */
      }

      const prompt = buildAskPrompt(now, zoneName, tasks, dinnerLine, jobLines, season, inSeasonNames);

      Ask.text(prompt, {})
        .then(function (text) {
          UI.state[ASK_LOADING_KEY] = false;
          const patch = {};
          patch[dayKey] = { tip: text };
          Store.mergeDoc("daily", patch);
        })
        .catch(function (err) {
          UI.state[ASK_LOADING_KEY] = false;
          UI.toast(Ask.message(err));
          Router.refresh();
        });
    }

    if (existing) {
      return UI.h(
        "div",
        { class: "tipcard" },
        UI.h("div", { class: "eyebrow", text: "From Claude" }),
        UI.h("div", { class: "tip-text", text: existing }),
        UI.h(
          "button",
          {
            class: "btn btn-sm",
            type: "button",
            on: { click: askClaude },
          },
          "Ask again"
        )
      );
    }

    if (UI.state[ASK_LOADING_KEY]) {
      return UI.h(
        "div",
        { class: "thinking" },
        UI.h("div", { class: "spinner" }),
        UI.h("span", { text: "Thinking about today…" })
      );
    }

    return UI.h(
      "button",
      {
        class: "btn btn-block",
        type: "button",
        on: { click: askClaude },
      },
      "Ask Claude what today needs"
    );
  }

  function renderGoodToKnowSection(now) {
    const body = [];

    let inSeason = [];
    try {
      inSeason = (Almanac.inSeason(now) || []).slice(0, 4);
    } catch (e) {
      inSeason = [];
    }
    if (inSeason.length) {
      body.push(
        UI.h("div", { class: "eyebrow", style: { padding: "14px 16px 0" }, text: "In season in Michigan" })
      );
      body.push(
        UI.h(
          "div",
          { class: "produce" },
          inSeason.map(function (item) {
            return UI.h(
              "div",
              { class: "produce-item" },
              UI.h("span", { class: "p-emoji", text: item.emoji }),
              UI.h(
                "div",
                {},
                UI.h("div", { class: "p-name", text: item.name }),
                UI.h("div", { class: "p-note", text: item.note })
              )
            );
          })
        )
      );
    }

    let birthday = null;
    try {
      birthday = Almanac.nextBirthday(now);
    } catch (e) {
      birthday = null;
    }
    if (birthday && typeof birthday.daysAway === "number" && birthday.daysAway <= 45) {
      const tail = birthday.daysAway === 0 ? "today!" : "in " + birthday.daysAway + " days";
      body.push(staticRow("gift", "amber", birthday.name + " turns " + birthday.turning + " " + tail));
    }

    const config = Store.get("config") || {};
    if (typeof config.trashDay === "number") {
      const dow = now.getDay();
      const tomorrow = (dow + 1) % 7;
      if (dow === config.trashDay || tomorrow === config.trashDay) {
        body.push(staticRow("trash", "delft", "Trash goes out tonight"));
      }
    }

    let tip = null;
    try {
      tip = Almanac.tip(now);
    } catch (e) {
      tip = null;
    }
    if (tip) {
      body.push(
        UI.h(
          "div",
          { class: "tipcard" },
          UI.h("div", { class: "eyebrow", text: tip.tag }),
          UI.h("div", { class: "tip-text", text: tip.text })
        )
      );
    }

    const askBlock = renderAskBlock(now);
    if (askBlock) body.push(askBlock);

    if (!body.length) return null;

    return UI.section("Good to know", null, UI.h("div", { class: "card" }, body));
  }

  /* ---------- render ---------- */

  function renderToday(root) {
    const now = new Date();

    root.appendChild(renderHeader(now));

    const strip = renderSunStrip(now);
    if (strip) root.appendChild(strip);

    const left = UI.h("div", {}, renderCleaningCard(now), renderDinnerSection(now));
    const right = UI.h("div", {}, renderAttentionSection(now), renderGoodToKnowSection(now));

    root.appendChild(UI.h("div", { class: "two-col" }, left, right));
  }

  Router.on("today", renderToday);
})();
