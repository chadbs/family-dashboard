/* ============================================================
   Meals — the week's dinners + the grocery list.
   Plain DOM, zero dependencies. Defines exactly three globals:
   the Router.on("meals", …) registration, Plan, and Grocery.
   Everything else lives inside this IIFE so it can never collide
   with a helper of the same name in another view module.
   ============================================================ */

(function () {
  /* ---------- grocery aisle categorization ---------- */

  const CAT_ORDER = ["Produce", "Meat", "Dairy", "Bakery", "Frozen", "Pantry", "Other"];

  const STAPLES = [
    { item: "Whole milk", qty: "3 gallons", store: "Meijer", cat: "Dairy" },
    { item: "Greek yogurt", qty: "5 tubs", store: "Meijer", cat: "Dairy" },
  ];

  /* Keyword table, cheapest-and-most-specific-first so a jarred sauce
     doesn't get mistaken for the vegetable in its name ("canned diced
     tomatoes" should land in Pantry, not Produce). Doesn't have to be
     perfect — just right most of the time. */
  function categorize(name) {
    const n = (name || "").toLowerCase();

    if (n.indexOf("frozen") >= 0) return "Frozen";

    const pantry = [
      "canned", "jar", "sauce", "salsa", "pesto", "marinara", "bbq",
      "ketchup", "mustard", "broth", "miso", "stock", "yeast", "cornstarch",
      "baking", "spice", "seasoning", "oil", "vinegar", "syrup", "pasta",
      "noodle", "rice", "flour", "sugar", "cracker", "cereal", "bean",
      "chip", "nut",
    ];
    for (let i = 0; i < pantry.length; i++) {
      if (n.indexOf(pantry[i]) >= 0) return "Pantry";
    }

    const meat = [
      "chicken", "beef", "steak", "pork", "sausage", "bacon", "turkey",
      "ham", "rib", "shrimp", "salmon", "fish", "cod", "tilapia", "meat",
      "roast",
    ];
    for (let i = 0; i < meat.length; i++) {
      if (n.indexOf(meat[i]) >= 0) return "Meat";
    }

    const dairy = [
      "milk", "cheese", "yogurt", "cream", "butter", "egg", "mozzarella",
      "parmesan", "ricotta", "cheddar", "feta", "cotija",
    ];
    for (let i = 0; i < dairy.length; i++) {
      if (n.indexOf(dairy[i]) >= 0) return "Dairy";
    }

    const bakery = ["bread", "bun", "bagel", "tortilla", "roll", "dough", "pastry"];
    for (let i = 0; i < bakery.length; i++) {
      if (n.indexOf(bakery[i]) >= 0) return "Bakery";
    }

    const produce = [
      "lettuce", "tomato", "onion", "garlic", "pepper", "broccoli", "potato",
      "carrot", "celery", "spinach", "zucchini", "corn", "avocado", "lime",
      "lemon", "cilantro", "basil", "mushroom", "cabbage", "asparagus",
      "ginger", "cucumber", "kale", "apple", "banana", "thyme", "rosemary",
      "parsley", "dill", "mint",
    ];
    for (let i = 0; i < produce.length; i++) {
      if (n.indexOf(produce[i]) >= 0) return "Produce";
    }

    return "Other";
  }

  /* ---------- Plan ---------- */

  function describeSlot(slot) {
    if (!slot) return { emoji: "", name: "", sub: "" };
    if (slot.kind === "recipe") {
      const r = Recipes.byId(slot.recipeId);
      if (!r) return { emoji: "🍽️", name: "Recipe was deleted", sub: "Tap to pick something else" };
      return {
        emoji: r.emoji || "🍽️",
        name: r.name,
        sub: [r.time, r.source].filter(Boolean).join(" · "),
      };
    }
    if (slot.kind === "text") return { emoji: "🍲", name: slot.title || "", sub: "" };
    if (slot.kind === "out") return { emoji: "🍴", name: "Eating out", sub: slot.note || "" };
    if (slot.kind === "leftovers") return { emoji: "🥡", name: "Leftovers", sub: "" };
    return { emoji: "", name: "", sub: "" };
  }

  const Plan = {
    week: function (date) {
      date = date || new Date();
      const plan = Store.get("plan");
      return plan[Fmt.weekKey(date)] || {};
    },

    slotFor: function (date) {
      date = date || new Date();
      const week = Plan.week(date);
      return week[DAY_KEYS[Fmt.dayIdx(date)]] || null;
    },

    setSlot: function (date, slot) {
      date = date || new Date();
      const wk = Fmt.weekKey(date);
      const dayKey = DAY_KEYS[Fmt.dayIdx(date)];
      const patch = {};
      patch[wk] = {};
      patch[wk][dayKey] = slot;
      Store.mergeDoc("plan", patch);
    },

    clearSlot: function (date) {
      Plan.setSlot(date, null);
    },

    describe: describeSlot,

    openPicker: function (date) {
      date = date || new Date();
      const title = Fmt.dayName(Fmt.dayIdx(date)) + " · " + Fmt.shortDate(date);

      const searchInput = UI.h("input", {
        class: "input",
        type: "text",
        placeholder: "Search recipes, source or tag",
        data: { keep: "plan-search" },
      });

      const resultsHost = UI.h("div", { class: "stack" });

      function finish(slot, msg) {
        Plan.setSlot(date, slot);
        s.close();
        UI.toast(msg);
      }

      function rowFor(r) {
        return UI.h(
          "button",
          { class: "row", type: "button", on: { click: function () { finish({ kind: "recipe", recipeId: r.id }, "Planned"); } } },
          UI.h("span", { class: "slot-emoji", text: r.emoji || "🍽️" }),
          UI.h(
            "span",
            { class: "row-main" },
            UI.h("span", { class: "row-title", text: r.name }),
            UI.h("span", { class: "row-sub", text: r.time || "" })
          )
        );
      }

      function matches(r, q) {
        if (!q) return true;
        const hay = (
          (r.name || "") + " " + (r.source || "") + " " + (r.tags || []).join(" ")
        ).toLowerCase();
        return hay.indexOf(q) >= 0;
      }

      function renderResults() {
        const q = searchInput.value.trim().toLowerCase();
        resultsHost.textContent = "";

        const suggested = (typeof Recipes !== "undefined" && Recipes.suggest(date, 6)) || [];
        resultsHost.appendChild(
          UI.section(
            "Suggested",
            null,
            suggested.length
              ? UI.h("div", { class: "card" }, UI.h("div", { class: "rows" }, suggested.map(rowFor)))
              : UI.h("p", { class: "muted tiny", text: "Nothing suggested yet — add a few recipes to the box." })
          )
        );

        const all = ((typeof Recipes !== "undefined" && Recipes.all()) || []).filter(function (r) {
          return matches(r, q);
        });
        resultsHost.appendChild(
          UI.section(
            q ? "Results" : "All recipes",
            null,
            all.length
              ? UI.h("div", { class: "card" }, UI.h("div", { class: "rows" }, all.map(rowFor)))
              : UI.h("p", { class: "muted tiny", text: "No recipes match that search." })
          )
        );
      }

      searchInput.addEventListener("input", renderResults);

      function showTypeForm() {
        const titleInput = UI.h("input", {
          class: "input",
          type: "text",
          placeholder: "What's for dinner?",
          data: { keep: "plan-type-title" },
        });
        function save() {
          const t = titleInput.value.trim();
          if (!t) return;
          finish({ kind: "text", title: t }, "Planned");
        }
        titleInput.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); save(); }
        });
        s.setBody(
          UI.h(
            "div",
            { class: "stack" },
            UI.h("div", { class: "field" }, UI.h("label", { text: "Tonight's dinner" }), titleInput),
            UI.h(
              "div",
              { class: "btn-row" },
              UI.h("button", { class: "btn", type: "button", on: { click: function () { s.setBody(body); } } }, "Back"),
              UI.h("button", { class: "btn btn-primary", type: "button", on: { click: save } }, "Save")
            )
          )
        );
        titleInput.focus();
      }

      const quickRow = UI.h(
        "div",
        { class: "inline" },
        UI.h("button", { class: "btn btn-sm", type: "button", on: { click: function () { finish({ kind: "out" }, "Planned"); } } }, "Eating out"),
        UI.h("button", { class: "btn btn-sm", type: "button", on: { click: function () { finish({ kind: "leftovers" }, "Planned"); } } }, "Leftovers"),
        UI.h("button", { class: "btn btn-sm", type: "button", on: { click: showTypeForm } }, "Type it in"),
        UI.h("button", { class: "btn btn-sm", type: "button", on: { click: function () { finish(null, "Cleared"); } } }, "Clear this day")
      );

      const body = UI.h("div", { class: "stack" }, searchInput, quickRow, resultsHost);
      var s = UI.sheet({ title: title, body: body });
      renderResults();
    },

    fillWeek: function (date) {
      date = date || new Date();
      const monday = Fmt.weekStart(date);
      const wk = Fmt.weekKey(date);
      const week = Plan.week(date);

      const used = {};
      DAY_KEYS.forEach(function (k) {
        const slot = week[k];
        if (slot && slot.kind === "recipe" && slot.recipeId) used[slot.recipeId] = true;
      });

      function dateForIdx(i) {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        return d;
      }

      function firstUnused(d) {
        const list = (typeof Recipes !== "undefined" && Recipes.suggest(d, 20)) || [];
        for (let i = 0; i < list.length; i++) {
          if (!used[list[i].id]) return list[i];
        }
        return null;
      }

      const patch = {};

      /* Saturday is pizza night, first choice a recipe actually named pizza. */
      const SAT = DAY_KEYS[5];
      if (!week[SAT]) {
        const all = (typeof Recipes !== "undefined" && Recipes.all()) || [];
        let pizza = all.find(function (r) { return r.name && r.name.toLowerCase().indexOf("pizza") >= 0; });
        if (pizza && used[pizza.id]) pizza = null;
        const pick = pizza || firstUnused(dateForIdx(5));
        if (pick) {
          patch[SAT] = { kind: "recipe", recipeId: pick.id };
          used[pick.id] = true;
        }
      }

      /* Mon(0), Tue(1), Thu(3), Sun(6) — Wed(2) and Fri(4) stay open on
         purpose, to keep the week to the family's target of five dinners. */
      [0, 1, 3, 6].forEach(function (i) {
        const key = DAY_KEYS[i];
        if (week[key]) return;
        const pick = firstUnused(dateForIdx(i));
        if (!pick) return;
        patch[key] = { kind: "recipe", recipeId: pick.id };
        used[pick.id] = true;
      });

      if (Object.keys(patch).length) {
        const doc = {};
        doc[wk] = patch;
        Store.mergeDoc("plan", doc);
      }

      const finalWeek = deepMerge(week, patch);
      let dinners = 0;
      DAY_KEYS.forEach(function (k) {
        const slot = finalWeek[k];
        if (slot && (slot.kind === "recipe" || slot.kind === "text")) dinners++;
      });
      const open = [];
      if (!finalWeek.wed) open.push("Wednesday");
      if (!finalWeek.fri) open.push("Friday");
      let msg = "Planned " + dinners + (dinners === 1 ? " dinner." : " dinners.");
      if (open.length) msg += " " + open.join(" and ") + " " + (open.length === 1 ? "is" : "are") + " open.";
      UI.toast(msg);
    },
  };

  /* ---------- Grocery ---------- */

  const Grocery = {
    addItem: function (name, opts) {
      const o = opts || {};
      const trimmed = (name || "").trim();
      if (!trimmed) return;
      const existing = Store.list("grocery").find(function (it) {
        return it.name && it.name.trim().toLowerCase() === trimmed.toLowerCase() && !it.done;
      });
      if (existing) {
        UI.toast(trimmed + " is already on the list");
        return;
      }
      Store.put("grocery", null, {
        name: trimmed,
        qty: o.qty || "",
        cat: o.cat || categorize(trimmed),
        store: o.store || "",
        done: false,
        src: o.src || "added",
        at: new Date().toISOString(),
      });
      UI.toast("Added " + trimmed);
    },

    buildFromWeek: function (date) {
      date = date || new Date();
      const week = Plan.week(date);
      const wanted = {};

      function addWanted(item, qty, store, cat, srcLabel) {
        const key = (item || "").trim().toLowerCase();
        if (!key) return;
        const cur = wanted[key];
        if (!cur) {
          wanted[key] = {
            name: (item || "").trim(),
            qty: qty || "",
            store: store || "",
            cat: cat,
            srcs: srcLabel ? [srcLabel] : [],
          };
          return;
        }
        if (qty && cur.qty && qty !== cur.qty) cur.qty = cur.qty + " + " + qty;
        else if (qty && !cur.qty) cur.qty = qty;
        if (!cur.store && store) cur.store = store;
        if (srcLabel && cur.srcs.indexOf(srcLabel) === -1) cur.srcs.push(srcLabel);
      }

      DAY_KEYS.forEach(function (k) {
        const slot = week[k];
        if (!slot || slot.kind !== "recipe" || !slot.recipeId) return;
        const recipe = (typeof Recipes !== "undefined" && Recipes.byId(slot.recipeId)) || null;
        if (!recipe) return;
        (recipe.ingredients || []).forEach(function (ing) {
          if (!ing || ing.pantry) return;
          addWanted(ing.item, ing.qty, ing.store, categorize(ing.item), recipe.name);
        });
      });

      STAPLES.forEach(function (s) {
        addWanted(s.item, s.qty, s.store, s.cat, "Weekly staples");
      });

      const existing = Store.list("grocery");
      const byKey = {};
      existing.forEach(function (it) {
        const key = (it.name || "").trim().toLowerCase();
        if (!byKey[key]) byKey[key] = it;
      });

      let added = 0, updated = 0, removed = 0;

      Object.keys(wanted).forEach(function (key) {
        const w = wanted[key];
        const src = w.srcs.join(" + ");
        const cur = byKey[key];
        if (!cur) {
          Store.put("grocery", null, {
            name: w.name,
            qty: w.qty,
            cat: w.cat,
            store: w.store,
            done: false,
            src: src,
            at: new Date().toISOString(),
          });
          added++;
          return;
        }
        if (cur.src === "added") return; // hand-added items are never rewritten
        const patch = {};
        if (cur.qty !== w.qty) patch.qty = w.qty;
        if (cur.store !== w.store) patch.store = w.store;
        if (cur.cat !== w.cat) patch.cat = w.cat;
        if (cur.src !== src) patch.src = src;
        if (Object.keys(patch).length) {
          Store.patch("grocery", cur.id, patch);
          updated++;
        }
      });

      existing.forEach(function (it) {
        if (it.src === "added") return;
        const key = (it.name || "").trim().toLowerCase();
        if (!wanted[key]) {
          Store.remove("grocery", it.id);
          removed++;
        }
      });

      const bits = [];
      if (added) bits.push(added + " added");
      if (updated) bits.push(updated + " updated");
      if (removed) bits.push(removed + " removed");
      UI.toast(bits.length ? "Grocery list: " + bits.join(", ") + "." : "Grocery list is already up to date.");
    },
  };

  /* ---------- screen: This week ---------- */

  function weekRangeLabel(monday) {
    const end = new Date(monday);
    end.setDate(end.getDate() + 6);
    const startMonth = monday.toLocaleDateString(undefined, { month: "short" });
    const endMonth = end.toLocaleDateString(undefined, { month: "short" });
    if (startMonth === endMonth) return startMonth + " " + monday.getDate() + " – " + end.getDate();
    return startMonth + " " + monday.getDate() + " – " + endMonth + " " + end.getDate();
  }

  function dayRow(d) {
    const i = Fmt.dayIdx(d);
    const isToday = Fmt.dayKey(d) === Fmt.dayKey(new Date());
    const info = describeSlot(Plan.slotFor(d));
    return UI.h(
      "button",
      {
        class: "dayrow",
        type: "button",
        data: isToday ? { today: "true" } : {},
        on: { click: function () { Plan.openPicker(d); } },
      },
      UI.h(
        "span",
        { class: "daytag" },
        UI.h("span", { class: "dayabbr", text: Fmt.dayAbbr(i) }),
        UI.h("span", { class: "daynum", text: String(d.getDate()) })
      ),
      UI.h("span", { class: "slot-emoji", text: info.emoji }),
      UI.h(
        "span",
        { class: "slot" },
        info.name
          ? UI.h("span", { class: "slot-name", text: info.name })
          : UI.h("span", { class: "slot-name slot-empty", text: "Tap to plan" }),
        info.sub ? UI.h("span", { class: "slot-sub", text: info.sub }) : null
      )
    );
  }

  function weekNav(monday, offset) {
    const label =
      offset === 0 ? "This week" : offset === 1 ? "Next week" : offset === -1 ? "Last week" : weekRangeLabel(monday);
    return UI.h(
      "div",
      { class: "spread" },
      UI.h(
        "button",
        {
          class: "ibtn",
          type: "button",
          "aria-label": "Previous week",
          on: { click: function () { UI.state.weekOffset = offset - 1; Router.refresh(); } },
        },
        UI.icon("back")
      ),
      UI.h("span", { class: "eyebrow", style: { flex: "1", textAlign: "center" }, text: label }),
      UI.h(
        "button",
        {
          class: "ibtn",
          type: "button",
          "aria-label": "Next week",
          on: { click: function () { UI.state.weekOffset = offset + 1; Router.refresh(); } },
        },
        UI.icon("chevron")
      )
    );
  }

  function weekCard(monday) {
    const rows = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      rows.push(dayRow(d));
    }
    return UI.h("div", { class: "card" }, UI.h("div", { class: "daylist" }, rows));
  }

  function weekBtnRow(monday) {
    const week = Plan.week(monday);
    const targetKeys = [DAY_KEYS[0], DAY_KEYS[1], DAY_KEYS[3], DAY_KEYS[5], DAY_KEYS[6]];
    const full = targetKeys.every(function (k) { return !!week[k]; });

    const planBtn = UI.h(
      "button",
      {
        class: "btn btn-primary",
        type: "button",
        on: {
          click: function () {
            if (!full) { Plan.fillWeek(monday); return; }
            UI.confirm("Replace this week's plan with fresh suggestions?").then(function (ok) {
              if (!ok) return;
              targetKeys.forEach(function (k) {
                const d = new Date(monday);
                d.setDate(d.getDate() + DAY_KEYS.indexOf(k));
                Plan.clearSlot(d);
              });
              Plan.fillWeek(monday);
            });
          },
        },
      },
      full ? "Re-plan the week" : "Plan the week"
    );

    const groceryBtn = UI.h(
      "button",
      {
        class: "btn",
        type: "button",
        on: {
          click: function () {
            Grocery.buildFromWeek(monday);
            UI.state.mealsTab = "grocery";
            Router.refresh();
          },
        },
      },
      "Build the grocery list"
    );

    return UI.h("div", { class: "btn-row" }, planBtn, groceryBtn);
  }

  /* ---------- screen: Grocery list ---------- */

  function checkRow(it) {
    const pressed = !!it.done;
    return UI.h(
      "button",
      {
        class: "check",
        type: "button",
        "aria-pressed": pressed ? "true" : "false",
        on: { click: function () { Store.patch("grocery", it.id, { done: !it.done }); } },
      },
      UI.h("span", { class: "box" }, UI.icon("check")),
      UI.h("span", { class: "check-main" }, UI.h("span", { class: "check-text", text: it.name })),
      it.qty ? UI.h("span", { class: "check-min", text: it.qty }) : null
    );
  }

  function groceryGroups(items) {
    const byCat = {};
    items.forEach(function (it) {
      const c = it.cat && CAT_ORDER.indexOf(it.cat) >= 0 ? it.cat : "Other";
      (byCat[c] = byCat[c] || []).push(it);
    });
    return CAT_ORDER.filter(function (c) { return byCat[c] && byCat[c].length; }).map(function (c) {
      const list = byCat[c].slice().sort(function (a, b) {
        if (!!a.done !== !!b.done) return a.done ? 1 : -1;
        return (a.name || "").localeCompare(b.name || "");
      });
      return UI.h("div", { class: "grocery-group" }, UI.h("div", { class: "g-head", text: c }), list.map(checkRow));
    });
  }

  function openClearSheet() {
    const items = Store.list("grocery");
    const doneItems = items.filter(function (i) { return i.done; });
    const s = UI.sheet({
      title: "Clear the list",
      body: UI.h("p", {
        class: "muted",
        text: doneItems.length
          ? "Clear just what's checked off, or start the whole list over?"
          : "Nothing is checked off yet. Clear the whole list instead?",
      }),
      actions: [
        UI.h("button", { class: "btn", type: "button", on: { click: function () { s.close(); } } }, "Never mind"),
        doneItems.length
          ? UI.h(
              "button",
              {
                class: "btn btn-danger",
                type: "button",
                on: {
                  click: function () {
                    doneItems.forEach(function (i) { Store.remove("grocery", i.id); });
                    s.close();
                    UI.toast("Cleared " + doneItems.length + " checked item" + (doneItems.length === 1 ? "" : "s") + ".");
                  },
                },
              },
              "Clear checked (" + doneItems.length + ")"
            )
          : null,
        UI.h(
          "button",
          {
            class: "btn btn-danger",
            type: "button",
            on: {
              click: function () {
                items.forEach(function (i) { Store.remove("grocery", i.id); });
                s.close();
                UI.toast("Cleared the list.");
              },
            },
          },
          "Clear everything"
        ),
      ],
    });
  }

  function renderGroceryTab() {
    const wrap = UI.h("div", { class: "stack" });

    const addInput = UI.h("input", {
      class: "input",
      type: "text",
      placeholder: "Add an item",
      data: { keep: "grocery-add" },
    });
    function submitAdd() {
      const v = addInput.value.trim();
      if (!v) return;
      Grocery.addItem(v, { src: "added" });
      addInput.value = "";
    }
    addInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); submitAdd(); }
    });
    wrap.appendChild(
      UI.h(
        "div",
        { class: "quickadd" },
        addInput,
        UI.h("button", { class: "ibtn", type: "button", "aria-label": "Add item", on: { click: submitAdd } }, UI.icon("plus"))
      )
    );

    const items = Store.list("grocery");
    if (!items.length) {
      wrap.appendChild(
        UI.empty(
          "cart",
          "The list is empty. Build it from this week's dinners.",
          UI.h(
            "button",
            { class: "btn btn-primary", type: "button", on: { click: function () { Grocery.buildFromWeek(new Date()); } } },
            "Build the grocery list"
          )
        )
      );
      return wrap;
    }

    wrap.appendChild(UI.h("div", { class: "card" }, groceryGroups(items)));

    const doneN = items.filter(function (i) { return i.done; }).length;
    wrap.appendChild(
      UI.h(
        "div",
        { class: "spread" },
        UI.h("span", { class: "tiny muted", text: items.length + " item" + (items.length === 1 ? "" : "s") + " · " + doneN + " in the cart" }),
        UI.h("button", { class: "btn btn-danger btn-sm", type: "button", on: { click: openClearSheet } }, "Clear the list")
      )
    );

    return wrap;
  }

  /* ---------- the route ---------- */

  Router.on("meals", function renderMeals(root) {
    if (!UI.state.mealsTab) UI.state.mealsTab = "week";
    if (typeof UI.state.weekOffset !== "number") UI.state.weekOffset = 0;

    const offset = UI.state.weekOffset;
    const base = new Date();
    base.setDate(base.getDate() + offset * 7);
    const monday = Fmt.weekStart(base);

    root.appendChild(
      UI.h(
        "div",
        { class: "page-head" },
        UI.h("div", { class: "title display", text: "Meals" }),
        UI.h("div", { class: "sub", text: weekRangeLabel(monday) })
      )
    );

    root.appendChild(
      UI.h(
        "div",
        { class: "segmented" },
        UI.h(
          "button",
          {
            type: "button",
            "aria-pressed": UI.state.mealsTab === "week" ? "true" : "false",
            on: { click: function () { UI.state.mealsTab = "week"; Router.refresh(); } },
          },
          "This week"
        ),
        UI.h(
          "button",
          {
            type: "button",
            "aria-pressed": UI.state.mealsTab === "grocery" ? "true" : "false",
            on: { click: function () { UI.state.mealsTab = "grocery"; Router.refresh(); } },
          },
          "Grocery list"
        )
      )
    );

    if (UI.state.mealsTab === "grocery") {
      root.appendChild(renderGroceryTab());
    } else {
      root.appendChild(weekNav(monday, offset));
      root.appendChild(weekCard(monday));
      root.appendChild(weekBtnRow(monday));
    }
  });

  /* Plan and Grocery must be true globals — every other view module calls
     them directly (see CONTRACT.md) — but nothing else in this file should
     leak, so only these two are attached to the global scope. */
  window.Plan = Plan;
  window.Grocery = Grocery;
})();
