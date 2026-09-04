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

  /* The things the family buys every week no matter what is for dinner.
     These are the DEFAULT; once anyone edits them, the edited list lives in
     the config doc and syncs to every device. */
  const SEED_STAPLES = [
    { item: "Whole milk", qty: "3 gallons", store: "Meijer" },
    { item: "Greek yogurt", qty: "5 tubs", store: "Meijer" },
  ];

  const Staples = {
    list: function () {
      const s = (Store.get("config") || {}).staples;
      return Array.isArray(s) ? s : SEED_STAPLES.map(function (x) { return Object.assign({}, x); });
    },
    save: function (next) {
      Store.mergeDoc("config", { staples: next });
    },
  };

  /* The stuff Kenzie keeps on hand — spices, oils, baking basics. Anything
     on this list is assumed already in the cupboard and is kept OFF the
     grocery list when it builds, so the list stays to fresh things to buy.
     If she runs out of one she just adds it back by hand. */
  const SEED_PANTRY = [
    "Salt", "Black pepper", "Olive oil", "Vegetable oil", "Cooking oil",
    "Flour", "Sugar", "Brown sugar", "Baking powder", "Baking soda",
    "Vanilla", "Cornstarch", "Rice", "Paprika", "Smoked paprika", "Cumin",
    "Chili powder", "Oregano", "Basil", "Thyme", "Rosemary", "Cinnamon",
    "Garlic powder", "Onion powder", "Italian seasoning", "Red pepper flakes",
    "Bay leaves", "Soy sauce", "Vinegar", "Honey", "Ketchup", "Mustard",
    "Mayo", "Worcestershire sauce", "Hot sauce", "Cooking spray",
  ];

  /* Put every weekly staple onto the grocery list now, skipping any already
     there. Staples are always-wanted, so they bypass the pantry filter.
     Returns how many were newly added. */
  function putStaplesOnList() {
    const have = {};
    Store.list("grocery").forEach(function (it) {
      have[(it.name || "").trim().toLowerCase()] = true;
    });
    let added = 0;
    Staples.list().forEach(function (s) {
      if (!s || !s.item) return;
      const key = s.item.trim().toLowerCase();
      if (have[key]) return;
      Store.put("grocery", null, {
        name: s.item.trim(),
        qty: s.qty || "",
        cat: s.cat || categorize(s.item),
        store: normStore(s.store) || "",
        done: false,
        src: "Weekly staples",
        at: new Date().toISOString(),
      });
      have[key] = true;
      added++;
    });
    return added;
  }

  const Pantry = {
    list: function () {
      const p = (Store.get("config") || {}).pantry;
      return Array.isArray(p) ? p : SEED_PANTRY.slice();
    },
    save: function (next) {
      Store.mergeDoc("config", { pantry: next });
    },
  };

  /* True when an ingredient is something she already keeps. Matches a pantry
     entry only when it appears as whole words INSIDE the item — so "paprika"
     catches "smoked paprika", but "black pepper" never catches "bell pepper"
     and "garlic powder" never catches fresh "garlic". */
  function inPantry(name) {
    const item = String(name || "").toLowerCase().trim();
    if (!item) return false;
    return Pantry.list().some(function (p) {
      const term = String(p || "").toLowerCase().trim();
      if (!term) return false;
      const re = new RegExp("\\b" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
      return re.test(item);
    });
  }

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

  /* Every field spelled out, even when empty. The store merges recursively,
     so a partial slot would leave the previous dinner's recipeId sitting
     underneath a slot that is now "eating out". */
  function fullSlot(slot) {
    if (slot === null || slot === undefined) return null;
    return {
      kind: slot.kind || "text",
      recipeId: slot.recipeId || "",
      title: slot.title || "",
      note: slot.note || "",
    };
  }

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

    /* Every field is written explicitly, even when empty. The store merges
       recursively, so a partial slot would leave the previous dinner's
       recipeId sitting underneath a slot that is now "eating out". */
    setSlot: function (date, slot) {
      date = date || new Date();
      const wk = Fmt.weekKey(date);
      const dayKey = DAY_KEYS[Fmt.dayIdx(date)];
      const full = fullSlot(slot);
      const patch = {};
      patch[wk] = {};
      patch[wk][dayKey] = full;
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
        UI.h("button", { class: "btn btn-sm", type: "button", on: { click: showTypeForm } }, "Type it in")
      );

      /* When the day already has something on it, say so and offer to take
         it off — otherwise the only way to clear a dinner is a small button
         that looks like the three next to it. */
      const current = Plan.slotFor(date);
      let currentRow = null;
      if (current) {
        const d = describeSlot(current);
        currentRow = UI.h(
          "div",
          { class: "planned-now" },
          UI.h("span", { class: "pn-emoji", text: d.emoji || "🍽️" }),
          UI.h(
            "span",
            { class: "pn-main" },
            UI.h("span", { class: "pn-name", text: d.name || "Planned" }),
            UI.h("span", { class: "pn-sub", text: "Pick something else below, or take it off." })
          ),
          UI.h(
            "button",
            {
              class: "btn btn-sm btn-danger",
              type: "button",
              on: { click: function () { finish(null, "Cleared " + Fmt.dayName(Fmt.dayIdx(date))); } },
            },
            "Remove"
          )
        );
      }

      const body = UI.h("div", { class: "stack" }, currentRow, searchInput, quickRow, resultsHost);
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
          patch[SAT] = fullSlot({ kind: "recipe", recipeId: pick.id });
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
        patch[key] = fullSlot({ kind: "recipe", recipeId: pick.id });
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

  /* ---------- Prices, stores, the cart order ---------- */

  /* Meijer vs ALDI prices from the nightly sweep. Fetched once a session in
     server mode; absent everywhere else, and the list simply shows no prices. */
  const Prices = (function () {
    let map = {};
    let tried = false;
    async function load() {
      if (tried || Store.mode !== "server") return;
      tried = true;
      try {
        const res = await fetch("/api/prices", { cache: "no-store" });
        const d = await res.json();
        map = d && typeof d === "object" ? (d.prices || d) : {};
        Router.refresh();
      } catch (e) {
        /* no prices this session */
      }
    }
    /* "Whole milk (3 gallons)" should find the "whole milk" entry. */
    function forItem(name) {
      const t = String(name || "").toLowerCase().replace(/\(.*?\)/g, " ").replace(/\s+/g, " ").trim();
      if (!t) return null;
      if (map[t]) return map[t];
      let best = null, bestLen = 0;
      Object.keys(map).forEach(function (k) {
        if ((t.indexOf(k) >= 0 || k.indexOf(t) >= 0) && k.length > bestLen) { best = map[k]; bestLen = k.length; }
      });
      return best;
    }
    function any() { return Object.keys(map).length > 0; }
    return { load: load, forItem: forItem, any: any };
  })();

  const DEAL_LINKS = [
    { name: "Meijer weekly ad", url: "https://www.meijer.com/shopping/weekly-ad.html" },
    { name: "mPerks coupons", url: "https://www.meijer.com/shopping/mperks.html" },
    { name: "ALDI weekly ad", url: "https://www.aldi.us/weekly-specials/our-weekly-ads/" },
  ];

  function normStore(s) {
    const v = String(s || "").toLowerCase();
    if (v.indexOf("aldi") >= 0) return "Aldi";
    if (v.indexOf("meijer") >= 0) return "Meijer";
    return "";
  }

  /* Which store an item goes to, the same rule the wall used: the family's
     own choice for that item, else the cheaper store when both prices are
     known, else what the recipe said, else Meijer. */
  function storeFor(it) {
    if (it.pref) return normStore(it.pref) || "Meijer";
    const p = Prices.forItem(it.name);
    if (p && typeof p.meijer === "number" && typeof p.aldi === "number") return p.aldi < p.meijer ? "Aldi" : "Meijer";
    return normStore(it.store) || "Meijer";
  }

  function money(n) {
    return "$" + (Math.round(n * 100) / 100).toFixed(2);
  }

  function cartItems() {
    return Store.list("grocery").filter(function (it) { return !it.done && !it.skip; });
  }

  const Cart = {
    request: function () {
      const items = cartItems();
      if (!items.length) {
        UI.toast("Nothing to order yet. Build the list first.");
        return;
      }
      const week = Plan.week(new Date());
      const dinners = DAY_KEYS.map(function (k) { return week[k] ? Plan.describe(week[k]).name : ""; }).filter(Boolean);
      Store.setDoc("cart", {
        status: "pending",
        requestedAt: new Date().toISOString(),
        week: Fmt.weekKey(new Date()),
        items: items.map(function (it) { return { name: it.name, qty: it.qty || "", store: storeFor(it), pref: it.prefText || "" }; }),
        dinners: dinners,
        summary: "",
        links: {},
      });
      UI.toast("Cart order sent. Chad's PC starts on it at 7:12 or 5:12.");
    },
    clear: function () {
      Store.setDoc("cart", {});
    },
  };

  function cartStatusCard() {
    const c = Store.get("cart") || {};
    if (!c.status) return null;
    const lines = {
      pending: ["Cart order waiting", "Chad's PC picks it up at 7:12am and 5:12pm and fills the Meijer and ALDI carts."],
      building: ["Filling the carts now", "Meijer first, then ALDI. A few minutes."],
      done: ["Carts are ready", c.summary || "Open them below and check out when you're ready."],
      error: ["The cart build hit a snag", c.summary || "It will try again next time, or ask Chad."],
    };
    const l = lines[c.status] || [c.status, ""];
    const kids = [
      UI.h("div", { class: "cs-line" }, c.status === "building" ? UI.h("span", { class: "spinner" }) : null, UI.h("span", { text: l[0] })),
      l[1] ? UI.h("div", { class: "cs-sub", text: l[1] }) : null,
    ];
    if (c.status === "done" && c.links && (c.links.meijer || c.links.aldi)) {
      kids.push(
        UI.h(
          "div",
          { class: "cart-links" },
          c.links.meijer ? UI.h("a", { class: "btn btn-primary", href: c.links.meijer, target: "_blank", rel: "noopener noreferrer" }, "Open Meijer cart") : null,
          c.links.aldi ? UI.h("a", { class: "btn", href: c.links.aldi, target: "_blank", rel: "noopener noreferrer" }, "Open ALDI cart") : null
        )
      );
    }
    kids.push(
      UI.h(
        "button",
        { class: "btn btn-sm", type: "button", on: { click: function () { Cart.clear(); UI.toast("Cleared the cart order."); } } },
        c.status === "done" || c.status === "error" ? "Dismiss" : "Cancel the order"
      )
    );
    return UI.h("div", { class: "cart-status", "data-state": c.status }, kids);
  }

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

      /* Drop the things she keeps on hand (spices, oils, baking) before the
         staples go on — a staple is something she always wants bought, so it
         is never pantry-filtered. */
      Object.keys(wanted).forEach(function (key) {
        if (inPantry(wanted[key].name)) delete wanted[key];
      });

      Staples.list().forEach(function (s) {
        if (!s || !s.item) return;
        addWanted(s.item, s.qty, s.store, s.cat || categorize(s.item), "Weekly staples");
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

  function openItemSheet(it) {
    const qty = UI.h("input", { class: "input", type: "text", value: it.qty || "", placeholder: "How much" });
    const store = UI.h(
      "select",
      { class: "select" },
      UI.h("option", { value: "", text: "Cheapest store (" + storeFor(Object.assign({}, it, { pref: "" })) + ")" }),
      UI.h("option", { value: "Meijer", text: "Always Meijer", selected: normStore(it.pref) === "Meijer" ? true : null }),
      UI.h("option", { value: "Aldi", text: "Always ALDI", selected: normStore(it.pref) === "Aldi" ? true : null })
    );
    const prefText = UI.h("input", { class: "input", type: "text", value: it.prefText || "", placeholder: "Brand or kind we like (optional)" });
    const s = UI.sheet({
      title: it.name,
      body: UI.h("div", { class: "stack" }, UI.h("div", { class: "field" }, UI.h("label", { text: "Amount" }), qty), UI.h("div", { class: "field" }, UI.h("label", { text: "Store" }), store), UI.h("div", { class: "field" }, UI.h("label", { text: "What to get" }), prefText)),
      actions: [
        UI.h("button", { class: "btn btn-danger", type: "button", on: { click: function () { Store.remove("grocery", it.id); s.close(); } } }, "Remove"),
        UI.h("button", { class: "btn btn-primary", type: "button", on: { click: function () { Store.patch("grocery", it.id, { qty: qty.value.trim(), pref: store.value, prefText: prefText.value.trim() }); s.close(); } } }, "Save"),
      ],
    });
  }

  function groceryRow(it) {
    const p = Prices.forItem(it.name);
    const st = storeFor(it);
    const sub = [];
    if (p && (typeof p.meijer === "number" || typeof p.aldi === "number")) {
      const parts = [];
      if (typeof p.meijer === "number") parts.push(UI.h("span", { class: "g-price" }, st === "Meijer" ? UI.h("b", { text: "Meijer " + money(p.meijer) }) : "Meijer " + money(p.meijer)));
      if (typeof p.aldi === "number") parts.push(UI.h("span", { class: "g-price" }, st === "Aldi" ? UI.h("b", { text: "ALDI " + money(p.aldi) }) : "ALDI " + money(p.aldi)));
      sub.push(parts);
      if (p.deal) sub.push(UI.h("span", { class: "g-deal", text: String(p.deal) }));
    } else if (UI.state.groceryBy !== "store") {
      sub.push(UI.h("span", { text: st }));
    }
    if (it.src && it.src !== "added") sub.push(UI.h("span", { text: it.src }));

    /* Name and amount share the first line, so a phone-width row never has
       to squeeze four things across; the prices sit underneath. */
    const main = UI.h(
      "div",
      { class: "g-main", on: { click: function () { openItemSheet(it); } } },
      UI.h(
        "div",
        { class: "g-line" },
        UI.h("span", { class: "g-name", text: it.name }),
        it.qty ? UI.h("span", { class: "g-qty", text: it.qty }) : null
      ),
      sub.length ? UI.h("div", { class: "g-sub" }, sub) : null
    );
    return UI.h(
      "div",
      { class: "g-row", "data-done": it.done ? "true" : "false", "data-skip": it.skip ? "true" : "false" },
      UI.h("button", { class: "box", type: "button", "aria-label": it.done ? "Not in the cart" : "In the cart", on: { click: function () { Store.patch("grocery", it.id, { done: !it.done }); } } }, UI.icon("check")),
      main,
      UI.h("button", { class: "g-have", type: "button", title: "I have this — take it off the list", on: { click: function () { Store.remove("grocery", it.id); UI.toast("Took " + it.name + " off the list"); } } }, "have it")
    );
  }

  function sortItems(list) {
    return list.slice().sort(function (a, b) {
      if (!!a.done !== !!b.done) return a.done ? 1 : -1;
      if (!!a.skip !== !!b.skip) return a.skip ? 1 : -1;
      const ca = CAT_ORDER.indexOf(a.cat), cb = CAT_ORDER.indexOf(b.cat);
      if (ca !== cb) return (ca < 0 ? 99 : ca) - (cb < 0 ? 99 : cb);
      return (a.name || "").localeCompare(b.name || "");
    });
  }

  function groupTotal(list) {
    let total = 0, priced = 0;
    list.forEach(function (it) {
      if (it.done || it.skip) return;
      const p = Prices.forItem(it.name);
      const st = storeFor(it);
      const v = p ? (st === "Aldi" ? p.aldi : p.meijer) : null;
      if (typeof v === "number") { total += v; priced++; }
    });
    return { total: total, priced: priced };
  }

  function groceryGroups(items) {
    const byStore = UI.state.groceryBy === "store";
    const buckets = {};
    items.forEach(function (it) {
      const k = byStore ? storeFor(it) : (it.cat && CAT_ORDER.indexOf(it.cat) >= 0 ? it.cat : "Other");
      (buckets[k] = buckets[k] || []).push(it);
    });
    const order = byStore ? ["Meijer", "Aldi"] : CAT_ORDER;
    return order.filter(function (k) { return buckets[k] && buckets[k].length; }).map(function (k) {
      const list = sortItems(buckets[k]);
      const t = byStore && Prices.any() ? groupTotal(list) : null;
      return UI.h(
        "div",
        { class: "grocery-group" },
        UI.h("div", { class: "g-head", text: k === "Aldi" ? "ALDI" : k }),
        list.map(groceryRow),
        t && t.priced ? UI.h("div", { class: "g-total" }, UI.h("span", { text: "About " + t.priced + " priced item" + (t.priced === 1 ? "" : "s") }), UI.h("b", { text: "~" + money(t.total) })) : null
      );
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

  /* The always-buy list. Edited here, stored in config, added to the
     grocery list every time it's built. */
  function openStaplesSheet() {
    let working = Staples.list().map(function (s) {
      return { item: s.item || "", qty: s.qty || "", store: normStore(s.store) || "Meijer" };
    });
    let sheet;

    function row(s, idx) {
      const item = UI.h("input", { class: "input", type: "text", value: s.item, placeholder: "Item" });
      const qty = UI.h("input", { class: "input staple-qty", type: "text", value: s.qty, placeholder: "How much" });
      const store = UI.h(
        "select",
        { class: "select staple-store" },
        UI.h("option", { value: "Meijer", text: "Meijer", selected: s.store === "Meijer" ? true : null }),
        UI.h("option", { value: "Aldi", text: "ALDI", selected: s.store === "Aldi" ? true : null })
      );
      function sync() {
        s.item = item.value.trim();
        s.qty = qty.value.trim();
        s.store = store.value;
      }
      [item, qty, store].forEach(function (el) {
        el.addEventListener("input", sync);
        el.addEventListener("change", sync);
      });
      const del = UI.h(
        "button",
        { class: "ibtn", type: "button", "aria-label": "Remove " + (s.item || "staple") },
        UI.icon("trash")
      );
      del.addEventListener("click", function () {
        working.splice(idx, 1);
        render();
      });
      return UI.h(
        "div",
        { class: "staple-row" },
        UI.h("div", { class: "staple-line" }, item, del),
        UI.h("div", { class: "staple-line" }, qty, store)
      );
    }

    function render() {
      const rows = working.map(row);
      const add = UI.h("button", { class: "btn btn-block", type: "button" }, UI.icon("plus"), "Add a staple");
      add.addEventListener("click", function () {
        working.push({ item: "", qty: "", store: "Meijer" });
        render();
      });
      const body = UI.h(
        "div",
        { class: "stack" },
        UI.h("p", { class: "tiny muted", text: "The things you always need. These get added every time you build the grocery list." }),
        rows.length ? UI.h("div", { class: "stack" }, rows) : UI.h("p", { class: "muted", text: "Nothing yet. Add what you always buy." }),
        add
      );
      if (sheet) sheet.setBody(body);
      return body;
    }

    sheet = UI.sheet({
      title: "Weekly staples",
      body: render(),
      actions: [
        UI.h("button", { class: "btn", type: "button", on: { click: function () { sheet.close(); } } }, "Cancel"),
        UI.h(
          "button",
          {
            class: "btn btn-primary",
            type: "button",
            on: {
              click: function () {
                const cleaned = working
                  .map(function (s) {
                    return { item: (s.item || "").trim(), qty: (s.qty || "").trim(), store: s.store || "Meijer" };
                  })
                  .filter(function (s) { return s.item; });
                Staples.save(cleaned);
                const n = putStaplesOnList();
                sheet.close();
                UI.toast(n ? "Saved — added " + n + " to your list" : "Saved your weekly staples");
              },
            },
          },
          "Save"
        ),
      ],
    });
  }

  /* The already-have list: spices and staples she keeps, kept off the
     shopping list. Chips you can tap to remove, plus a box to add more. */
  function openPantrySheet() {
    let working = Pantry.list().slice();
    let sheet;

    function render() {
      const chips = UI.h("div", { class: "chip-row pantry-chips" });
      working.forEach(function (name, i) {
        const chip = UI.h(
          "button",
          { class: "pantry-chip", type: "button", "aria-label": "Remove " + name },
          UI.h("span", { text: name }),
          UI.icon("x")
        );
        chip.addEventListener("click", function () {
          working.splice(i, 1);
          render();
        });
        chips.appendChild(chip);
      });

      const addInput = UI.h("input", {
        class: "input",
        type: "text",
        placeholder: "Add something you keep on hand",
        data: { keep: "pantry-add" },
      });
      function add() {
        const v = addInput.value.trim();
        if (!v) return;
        if (!working.some(function (x) { return x.toLowerCase() === v.toLowerCase(); })) working.push(v);
        addInput.value = "";
        render();
        const el = sheet.el.querySelector('[data-keep="pantry-add"]');
        if (el) el.focus();
      }
      addInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); add(); }
      });

      const body = UI.h(
        "div",
        { class: "stack" },
        UI.h("p", { class: "tiny muted", text: "Spices and staples you already keep. These stay OFF the grocery list. Run out of one? Just add it to the list by hand that week." }),
        working.length ? chips : UI.h("p", { class: "muted", text: "Nothing yet." }),
        UI.h("div", { class: "quickadd" }, addInput, UI.h("button", { class: "ibtn", type: "button", "aria-label": "Add", on: { click: add } }, UI.icon("plus")))
      );
      if (sheet) sheet.setBody(body);
      return body;
    }

    sheet = UI.sheet({
      title: "Already have",
      body: render(),
      actions: [
        UI.h("button", { class: "btn", type: "button", on: { click: function () { sheet.close(); } } }, "Cancel"),
        UI.h(
          "button",
          {
            class: "btn btn-primary",
            type: "button",
            on: {
              click: function () {
                Pantry.save(working.map(function (s) { return s.trim(); }).filter(Boolean));
                sheet.close();
                UI.toast("Saved what you keep on hand");
              },
            },
          },
          "Save"
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

    /* Shown in both states, so the always-buy list is reachable whether the
       grocery list is empty or full. */
    wrap.appendChild(
      UI.h(
        "div",
        { class: "inline staples-bar" },
        UI.h(
          "button",
          { class: "btn btn-sm", type: "button", on: { click: openStaplesSheet } },
          UI.icon("star"),
          "Weekly staples"
        ),
        UI.h(
          "button",
          { class: "btn btn-sm", type: "button", on: { click: openPantrySheet } },
          UI.icon("check"),
          "Already have"
        )
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

    Prices.load();
    if (!UI.state.groceryBy) UI.state.groceryBy = "store";

    const status = cartStatusCard();
    if (status) wrap.appendChild(status);

    const seg = UI.h(
      "div",
      { class: "segmented" },
      UI.h("button", { type: "button", "aria-pressed": UI.state.groceryBy === "store" ? "true" : "false", on: { click: function () { UI.state.groceryBy = "store"; Router.refresh(); } } }, "By store"),
      UI.h("button", { type: "button", "aria-pressed": UI.state.groceryBy !== "store" ? "true" : "false", on: { click: function () { UI.state.groceryBy = "aisle"; Router.refresh(); } } }, "By aisle")
    );
    wrap.appendChild(seg);

    wrap.appendChild(UI.h("div", { class: "card" }, groceryGroups(items)));

    const doneN = items.filter(function (i) { return i.done; }).length;
    const toOrder = cartItems().length;
    wrap.appendChild(
      UI.h(
        "div",
        { class: "spread" },
        UI.h("span", { class: "tiny muted", text: items.length + " item" + (items.length === 1 ? "" : "s") + " · " + doneN + " in the cart" }),
        UI.h("button", { class: "btn btn-danger btn-sm", type: "button", on: { click: openClearSheet } }, "Clear the list")
      )
    );

    const c = Store.get("cart") || {};
    if (Store.mode === "server" && toOrder && (!c.status || c.status === "done" || c.status === "error")) {
      wrap.appendChild(
        UI.h(
          "button",
          { class: "btn btn-primary btn-block", type: "button", on: { click: function () { Cart.request(); } } },
          UI.icon("cart"),
          "Build my carts (" + toOrder + " item" + (toOrder === 1 ? "" : "s") + ")"
        )
      );
    }

    wrap.appendChild(
      UI.h(
        "div",
        { class: "deal-links" },
        DEAL_LINKS.map(function (d) {
          return UI.h("a", { href: d.url, target: "_blank", rel: "noopener noreferrer" }, UI.icon("external"), d.name);
        })
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
