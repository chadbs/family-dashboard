/* ============================================================
   Recipes — the box, the recipe sheet, and the three-door add
   flow that replaces Kenzie's Pinterest board.

   Public surface (see CONTRACT.md): Router.on("recipes", …) and
   `const Recipes`. Everything else here is private to this file.
   ============================================================ */

const Recipes = (function () {
  const TAG_VOCAB = [
    "weeknight", "quick", "kid-friendly", "one-pan", "slow-cooker", "grill",
    "soup", "pasta", "vegetarian", "spring", "summer", "fall", "winter",
    "comfort", "make-ahead",
  ];

  const h = UI.h;

  /* ---------- data helpers ---------- */

  function byId(id) {
    if (!id) return null;
    if (typeof Store.item === "function") return Store.item("recipes", id);
    const found = Store.list("recipes").filter(function (r) { return r.id === id; })[0];
    return found || null;
  }

  function all() {
    return Store.list("recipes").slice().sort(function (a, b) {
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }

  /* Monday of the ISO week named by a "YYYY-Www" key, so we can turn the
     plan doc's date-keyed slots into real dates for "least recently
     planned" without depending on the Meals module. */
  function weekKeyToMonday(wk) {
    const m = /^(\d{4})-W(\d{2})$/.exec(String(wk || ""));
    if (!m) return null;
    const year = Number(m[1]);
    const week = Number(m[2]);
    const jan4 = new Date(year, 0, 4);
    const jan4Day = (jan4.getDay() + 6) % 7;
    const week1Monday = new Date(year, 0, 4 - jan4Day);
    return new Date(week1Monday.getFullYear(), week1Monday.getMonth(), week1Monday.getDate() + (week - 1) * 7);
  }

  function lastPlannedMap() {
    const plan = Store.get("plan") || {};
    const map = {};
    Object.keys(plan).forEach(function (wk) {
      const monday = weekKeyToMonday(wk);
      if (!monday) return;
      const days = plan[wk] || {};
      DAY_KEYS.forEach(function (dk, i) {
        const slot = days[dk];
        if (!slot || slot.kind !== "recipe" || !slot.recipeId) return;
        const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
        const t = d.getTime();
        if (map[slot.recipeId] === undefined || t > map[slot.recipeId]) map[slot.recipeId] = t;
      });
    });
    return map;
  }

  function suggest(date, n) {
    date = date || new Date();
    n = n || 3;
    let season = null;
    try {
      season = Almanac && Almanac.season ? Almanac.season(date) : null;
    } catch (e) {
      season = null;
    }
    const lastPlanned = lastPlannedMap();
    const scored = all().map(function (r) {
      const last = lastPlanned[r.id];
      return {
        r: r,
        seasonal: season && (r.tags || []).indexOf(season) >= 0 ? 1 : 0,
        fav: r.fav ? 1 : 0,
        last: last === undefined ? -Infinity : last,
      };
    });
    scored.sort(function (a, b) {
      if (a.seasonal !== b.seasonal) return b.seasonal - a.seasonal;
      if (a.fav !== b.fav) return b.fav - a.fav;
      if (a.last !== b.last) return a.last - b.last;
      return a.r.name.localeCompare(b.r.name);
    });
    return scored.slice(0, n).map(function (s) { return s.r; });
  }

  /* ---------- small shared bits ---------- */

  function countLabel(n, singular, plural) {
    return n + " " + (n === 1 ? singular : plural);
  }

  function field(label, inputEl) {
    return h("div", { class: "field" }, h("label", { text: label }), inputEl);
  }

  function splitLines(text) {
    return String(text || "")
      .split("\n")
      .map(function (l) { return l.trim(); })
      .filter(Boolean);
  }

  /* "1 lb chicken thighs" -> {qty:"1 lb", item:"chicken thighs"}.
     A line with no leading quantity keeps the whole line as the item. */
  function parseIngredientLine(line) {
    const m = /^((?:\d+\s*\/\s*\d+|\d+(?:\.\d+)?)(?:\s+\d+\s*\/\s*\d+)?)\s*([a-zA-Z]+\.?)?\s+(.+)$/.exec(line);
    if (m) {
      const qty = (m[1].trim() + (m[2] ? " " + m[2] : "")).trim();
      return { item: m[3].trim(), qty: qty };
    }
    return { item: line, qty: "" };
  }

  function ingredientsToLines(ings) {
    return (ings || [])
      .map(function (ing) {
        const qty = String((ing && ing.qty) || "").trim();
        const item = String((ing && ing.item) || "").trim();
        return qty ? qty + " " + item : item;
      })
      .join("\n");
  }

  /* ---------- Recipes screen ---------- */

  function renderRecipes(root) {
    const recipes = all();
    const favCount = recipes.filter(function (r) { return r.fav; }).length;

    root.appendChild(
      h(
        "div",
        { class: "page-head" },
        h("div", { class: "title", text: "Recipes" }),
        h("div", {
          class: "sub",
          text: countLabel(recipes.length, "recipe", "recipes") + ", " + countLabel(favCount, "favourite", "favourites"),
        })
      )
    );

    const searchInput = h("input", {
      class: "input",
      type: "search",
      placeholder: "Search recipes, tags, ingredients…",
      data: { keep: "recipe-search" },
    });
    searchInput.value = UI.state.recipeSearch || "";
    searchInput.addEventListener("input", function () {
      UI.state.recipeSearch = searchInput.value;
      Router.refresh();
    });
    root.appendChild(h("div", { class: "field" }, searchInput));

    const tagCounts = {};
    recipes.forEach(function (r) {
      (r.tags || []).forEach(function (t) {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });
    const tagsSorted = Object.keys(tagCounts).sort(function (a, b) {
      return tagCounts[b] - tagCounts[a] || a.localeCompare(b);
    });

    if (!UI.state.recipeTags) UI.state.recipeTags = [];
    const activeTags = UI.state.recipeTags;

    const chipDefs = [{ key: "__fav__", label: "Favourites" }].concat(
      tagsSorted.map(function (t) { return { key: t, label: t }; })
    );
    const scroller = h("div", { class: "scroller" });
    chipDefs.forEach(function (def) {
      const active = activeTags.indexOf(def.key) >= 0;
      const chipBtn = h(
        "button",
        { class: "fchip", type: "button", "aria-pressed": active ? "true" : "false" },
        def.label
      );
      chipBtn.addEventListener("click", function () {
        const i = activeTags.indexOf(def.key);
        if (i >= 0) activeTags.splice(i, 1);
        else activeTags.push(def.key);
        Router.refresh();
      });
      scroller.appendChild(chipBtn);
    });
    root.appendChild(scroller);

    const addBtn = h(
      "button",
      { class: "btn btn-primary btn-block", type: "button" },
      UI.icon("plus"),
      "Add a recipe"
    );
    addBtn.addEventListener("click", function () { openAdd(); });
    root.appendChild(addBtn);

    const search = (UI.state.recipeSearch || "").trim().toLowerCase();
    const filtered = recipes.filter(function (r) {
      if (activeTags.indexOf("__fav__") >= 0 && !r.fav) return false;
      for (let i = 0; i < activeTags.length; i++) {
        const t = activeTags[i];
        if (t === "__fav__") continue;
        if ((r.tags || []).indexOf(t) < 0) return false;
      }
      if (!search) return true;
      if (String(r.name || "").toLowerCase().indexOf(search) >= 0) return true;
      if (String(r.source || "").toLowerCase().indexOf(search) >= 0) return true;
      if ((r.tags || []).some(function (t) { return t.toLowerCase().indexOf(search) >= 0; })) return true;
      if ((r.ingredients || []).some(function (ing) {
        return String((ing && ing.item) || "").toLowerCase().indexOf(search) >= 0;
      })) return true;
      return false;
    });

    if (!filtered.length) {
      const clearBtn = h("button", { class: "btn", type: "button" }, "Clear filters");
      clearBtn.addEventListener("click", function () {
        UI.state.recipeSearch = "";
        UI.state.recipeTags = [];
        Router.refresh();
      });
      root.appendChild(UI.empty("search", "No recipes match your filters.", clearBtn));
    } else {
      const grid = h("div", { class: "recipe-grid" });
      filtered.forEach(function (r) { grid.appendChild(recipeCard(r)); });
      root.appendChild(grid);
    }
  }

  function recipeCard(r) {
    const card = h(
      "button",
      { class: "rcard", type: "button" },
      r.image ? h("div", { class: "r-photo", style: { backgroundImage: "url(" + JSON.stringify(String(r.image)) + ")" } }) : null,
      h(
        "div",
        { class: "r-top" },
        h("span", { class: "r-emoji", text: r.emoji || "🍽️" }),
        r.fav ? h("span", { class: "r-fav" }, UI.icon("star")) : null
      ),
      h("div", { class: "r-name", text: r.name || "Untitled" }),
      h(
        "div",
        { class: "r-meta" },
        r.time ? h("span", { text: r.time }) : null,
        r.source ? h("span", { text: r.source }) : null
      )
    );
    card.addEventListener("click", function () { openSheet(r.id); });
    return card;
  }

  /* ---------- the recipe sheet ---------- */

  /* "From Marcella Hazan" reads right; "From Family staple" does not. */
  function sourceLabel(source) {
    const s = (source || "").trim();
    if (!s) return "One of ours";
    if (/^family staple$/i.test(s)) return "A family staple";
    return "From " + s;
  }

  function openSheet(id, opts) {
    opts = opts || {};
    const recipe = byId(id);
    if (!recipe) {
      UI.toast("That recipe isn't in the box anymore.");
      return;
    }

    const sourceRow = h(
      "div",
      { class: "sourceline" },
      h("span", { class: "who", text: sourceLabel(recipe.source) }),
      recipe.sourceUrl
        ? h("a", { href: recipe.sourceUrl, target: "_blank", rel: "noopener noreferrer", text: "Open the original" })
        : null
    );

    const tagChips = (recipe.tags || []).map(function (t) { return UI.chip(t); });
    const chipsRow = h(
      "div",
      { class: "inline" },
      recipe.time ? UI.chip(recipe.time) : null,
      recipe.servings ? UI.chip("Serves " + recipe.servings) : null,
      tagChips
    );

    const ingredients = recipe.ingredients || [];
    let ingredientsBody;
    if (ingredients.length) {
      const ingList = h("div", { class: "ing-list" });
      ingredients.forEach(function (ing) {
        const dot = h("span", { class: "dot" }, UI.icon("check"));
        const row = h(
          "button",
          { class: "ing", type: "button", "aria-pressed": "false" },
          dot,
          h("span", { class: "ing-name", text: (ing && ing.item) || "" }),
          ing && ing.pantry ? UI.chip("have it") : null,
          h("span", { class: "ing-qty", text: (ing && ing.qty) || "" })
        );
        row.addEventListener("click", function () {
          const pressed = row.getAttribute("aria-pressed") === "true";
          row.setAttribute("aria-pressed", pressed ? "false" : "true");
        });
        ingList.appendChild(row);
      });
      ingredientsBody = ingList;
    } else {
      ingredientsBody = h("p", { class: "muted tiny", text: "No ingredients listed yet." });
    }

    const steps = recipe.steps || [];
    let stepsBody;
    if (steps.length) {
      const stepsWrap = h("div", { class: "steps" });
      steps.forEach(function (s, i) {
        stepsWrap.appendChild(
          h("div", { class: "step" }, h("div", { class: "n", text: String(i + 1) }), h("p", { text: s }))
        );
      });
      stepsBody = stepsWrap;
    } else {
      stepsBody = h("p", { class: "muted tiny", text: "No steps added yet." });
    }

    const notesArea = h("textarea", {
      class: "textarea",
      placeholder: "What worked, what to change, who ate it.",
      text: recipe.notes || "",
    });
    notesArea.addEventListener("blur", function () {
      const val = notesArea.value;
      if (val !== (recipe.notes || "")) {
        recipe.notes = val;
        Store.patch("recipes", recipe.id, { notes: val });
      }
    });

    const favLabel = h("span", { text: recipe.fav ? "Favourited" : "Favourite" });
    const favBtn = h("button", { class: "btn", type: "button" }, UI.icon("star"), favLabel);
    if (recipe.fav) favBtn.style.color = "var(--amber)";
    favBtn.addEventListener("click", function () {
      const next = !recipe.fav;
      recipe.fav = next;
      Store.patch("recipes", recipe.id, { fav: next });
      favLabel.textContent = next ? "Favourited" : "Favourite";
      favBtn.style.color = next ? "var(--amber)" : "";
    });

    let actionBtn;
    if (opts.onPick) {
      actionBtn = h("button", { class: "btn btn-primary", type: "button" }, "Use this one");
      actionBtn.addEventListener("click", function () {
        opts.onPick(recipe);
        sheetApi.close();
      });
    } else {
      actionBtn = h("button", { class: "btn btn-primary", type: "button" }, "Add to this week");
      actionBtn.addEventListener("click", function () { openDayPicker(recipe, sheetApi); });
    }

    const moreBtn = h("button", { class: "ibtn", type: "button", "aria-label": "More options" }, "⋮");
    moreBtn.addEventListener("click", function () { openOverflow(recipe, sheetApi); });

    const sheetApi = UI.sheet({
      title: recipe.name || "Recipe",
      body: [
        recipe.image
          ? h("div", { class: "r-hero", style: { backgroundImage: "url(" + JSON.stringify(String(recipe.image)) + ")" }, role: "img", "aria-label": recipe.name || "" })
          : null,
        sourceRow,
        chipsRow,
        UI.section("Ingredients", null, ingredientsBody),
        UI.section("How to make it", null, stepsBody),
        UI.section("Notes", null, notesArea),
      ],
      actions: [favBtn, actionBtn, moreBtn],
    });
  }

  function openDayPicker(recipe, hostSheetApi) {
    if (typeof Plan === "undefined" || !Plan || typeof Plan.setSlot !== "function") {
      UI.toast("Meal planning isn't ready yet.");
      return;
    }
    const monday = Fmt.weekStart(new Date());
    const rows = h("div", { class: "rows" });
    DAY_KEYS.forEach(function (dk, i) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const row = h(
        "button",
        { class: "row", type: "button" },
        h(
          "div",
          { class: "row-main" },
          h("div", { class: "row-title", text: Fmt.dayName(i) }),
          h("div", { class: "row-sub", text: Fmt.shortDate(d) })
        )
      );
      row.addEventListener("click", function () {
        Plan.setSlot(d, { kind: "recipe", recipeId: recipe.id });
        pickerApi.close();
        hostSheetApi.close();
        UI.toast("Added to " + Fmt.dayName(i) + "'s dinner.");
      });
      rows.appendChild(row);
    });
    const pickerApi = UI.sheet({ title: "Add to which day?", body: rows });
  }

  function openOverflow(recipe, hostSheetApi) {
    const editBtn = h("button", { class: "btn btn-block", type: "button" }, UI.icon("pencil"), "Edit recipe");
    editBtn.addEventListener("click", function () {
      overflowApi.close();
      hostSheetApi.close();
      openEdit(recipe);
    });

    const deleteBtn = h("button", { class: "btn btn-danger btn-block", type: "button" }, UI.icon("trash"), "Delete recipe");
    deleteBtn.addEventListener("click", function () {
      UI.confirm("Delete “" + (recipe.name || "this recipe") + "” from the box? This can't be undone.", {
        danger: true,
        title: "Delete this recipe?",
        confirmText: "Delete recipe",
      }).then(function (ok) {
        if (!ok) return;
        overflowApi.close();
        hostSheetApi.close();
        Store.remove("recipes", recipe.id);
        UI.toast("Recipe deleted.");
      });
    });

    const overflowApi = UI.sheet({
      title: recipe.name || "Recipe",
      body: h("div", { class: "stack" }, editBtn, deleteBtn),
    });
  }

  /* ---------- the recipe form (door 2, door 3, edit, and the paste review) ---------- */

  function buildRecipeForm(initial, level) {
    initial = initial || {};
    const full = level === "full";

    const nameInput = h("input", { class: "input", type: "text", placeholder: "What's it called?", value: initial.name || "" });
    const urlInput = h("input", { class: "input", type: "url", placeholder: "https://…", value: initial.sourceUrl || "" });
    const emojiInput = h("input", { class: "input", type: "text", placeholder: "🍽️", maxlength: "8", value: initial.emoji || "" });

    const imageInput = h("input", { class: "input", type: "url", placeholder: "Photo link (optional)", value: initial.image || "" });
    const rows = [field("Name", nameInput), field("Link", urlInput), field("Emoji", emojiInput)];
    if (level === "full") rows.push(field("Photo", imageInput));

    let sourceInput, timeInput, servingsInput, ingredientsArea, stepsArea;
    const selectedTags = (initial.tags || []).slice();

    if (full) {
      sourceInput = h("input", {
        class: "input",
        type: "text",
        placeholder: "Who's it from? (Ina Garten, Kenzie, Pinterest…)",
        value: initial.source || "",
      });
      timeInput = h("input", { class: "input", type: "text", placeholder: "30 min", value: initial.time || "" });
      servingsInput = h("input", { class: "input", type: "text", placeholder: "4", value: initial.servings || "" });
      ingredientsArea = h("textarea", {
        class: "textarea",
        placeholder: "One per line — “1 lb chicken thighs”",
        text: ingredientsToLines(initial.ingredients),
      });
      stepsArea = h("textarea", {
        class: "textarea",
        placeholder: "One step per line",
        text: (initial.steps || []).join("\n"),
      });

      const tagWrap = h("div", { class: "chip-row" });
      TAG_VOCAB.forEach(function (t) {
        const active = selectedTags.indexOf(t) >= 0;
        const tagBtn = h("button", { class: "fchip", type: "button", "aria-pressed": active ? "true" : "false" }, t);
        tagBtn.addEventListener("click", function () {
          const i = selectedTags.indexOf(t);
          if (i >= 0) {
            selectedTags.splice(i, 1);
            tagBtn.setAttribute("aria-pressed", "false");
          } else {
            selectedTags.push(t);
            tagBtn.setAttribute("aria-pressed", "true");
          }
        });
        tagWrap.appendChild(tagBtn);
      });

      rows.push(field("Who's it from", sourceInput));
      rows.push(field("Time", timeInput));
      rows.push(field("Servings", servingsInput));
      rows.push(field("Tags", tagWrap));
      rows.push(field("Ingredients", ingredientsArea));
      rows.push(field("How to make it", stepsArea));
    }

    const el = h("div", { class: "stack" }, rows);

    function collect() {
      const name = nameInput.value.trim();
      if (!name) return { error: "Give the recipe a name first." };
      return {
        value: {
          name: name,
          emoji: (emojiInput.value || "").trim() || "🍽️",
          image: full ? (imageInput.value || "").trim() : (initial.image || ""),
          source: full ? (sourceInput.value || "").trim() : "",
          sourceUrl: (urlInput.value || "").trim(),
          time: full ? (timeInput.value || "").trim() : "",
          servings: full ? (servingsInput.value || "").trim() : "",
          tags: full ? selectedTags.slice() : [],
          ingredients: full ? splitLines(ingredientsArea.value).map(parseIngredientLine) : [],
          steps: full ? splitLines(stepsArea.value) : [],
        },
      };
    }

    return { el: el, collect: collect };
  }

  /* The edit form works in plain text, one ingredient per line, so it cannot
     carry the pantry and store flags. Those flags decide what lands on the
     grocery list and which shop it lands under, so carry them across from the
     version being edited by matching on the ingredient name. */
  function keepIngredientFlags(nextIngredients, previousIngredients) {
    const before = {};
    (previousIngredients || []).forEach(function (ing) {
      if (ing && ing.item) before[String(ing.item).trim().toLowerCase()] = ing;
    });
    return (nextIngredients || []).map(function (ing) {
      const was = before[String(ing.item || "").trim().toLowerCase()];
      if (!was) return ing;
      const out = Object.assign({}, ing);
      if (was.pantry) out.pantry = true;
      if (was.store) out.store = was.store;
      return out;
    });
  }

  function saveRecipe(fields, editingRecipe) {
    if (editingRecipe) {
      const merged = Object.assign({}, editingRecipe, fields);
      merged.ingredients = keepIngredientFlags(fields.ingredients, editingRecipe.ingredients);
      delete merged.id;
      Store.put("recipes", editingRecipe.id, merged);
      UI.toast("Recipe updated.");
    } else {
      const body = Object.assign({ fav: false, notes: "", at: new Date().toISOString() }, fields);
      Store.put("recipes", null, body);
      UI.toast("Added to the box");
    }
  }

  /* ---------- Add a recipe: the three doors ---------- */

  function openAdd() {
    const cfg = Store.get("config") || {};
    let sheetApi;

    function showDoors() {
      const introChildren = [];
      if (cfg.pinterestUrl) {
        const pinRow = h(
          "a",
          { class: "row", href: cfg.pinterestUrl, target: "_blank", rel: "noopener noreferrer" },
          h("div", { class: "row-main" }, h("div", { class: "row-title", text: "Open Kenzie's Pinterest board" })),
          h("div", { class: "row-end" }, UI.icon("external"))
        );
        introChildren.push(h("div", { class: "rows" }, pinRow));
      }

      const doors = h("div", { class: "doors" });
      if (Ask.available()) {
        doors.appendChild(
          doorBtn(
            "clipboard",
            "Paste the recipe",
            "Copy the text off any blog or pin and paste it here. Claude sorts it out.",
            function () { showPasteForm("", ""); }
          )
        );
      }
      doors.appendChild(
        doorBtn(
          "link",
          "From a link",
          Store.mode === "server"
            ? "Paste the link from a pin or a blog. The recipe comes over clean, photo and all."
            : "Save the name and the link now, fill in the rest later.",
          function () { showLinkForm(""); }
        )
      );
      doors.appendChild(
        doorBtn("type", "Type it in", "Write it out yourself.", function () { showManualForm("full"); })
      );

      sheetApi.setBody(h("div", { class: "stack" }, introChildren, doors));
    }

    function doorBtn(iconName, title, sub, onClick) {
      const btn = h(
        "button",
        { class: "door", type: "button" },
        h("div", { class: "door-mark" }, UI.icon(iconName)),
        h(
          "div",
          { class: "door-main" },
          h("div", { class: "door-title", text: title }),
          h("div", { class: "door-sub", text: sub })
        )
      );
      btn.addEventListener("click", onClick);
      return btn;
    }

    /* The Pinterest path. She opens the pin, taps the link (or copies the
       pin's own URL), pastes it here. The server reads the recipe block the
       blog publishes for Google and hands back the clean recipe. */
    function showLinkForm(prefillUrl) {
      const urlInput = h("input", {
        class: "input",
        type: "url",
        placeholder: "https://…",
        value: prefillUrl || "",
        data: { keep: "import-url" },
      });
      const canImport = Store.mode === "server";
      const goBtn = h("button", { class: "btn btn-primary btn-block", type: "button" }, canImport ? "Bring it over" : "Save the link");
      goBtn.addEventListener("click", function () {
        const u = (urlInput.value || "").trim();
        if (!u) {
          UI.toast("Paste the link first.");
          return;
        }
        if (!canImport) {
          const form = buildRecipeForm({ sourceUrl: u }, "minimal");
          showFormWithSave(form);
          return;
        }
        handleImport(u);
      });
      urlInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          goBtn.click();
        }
      });
      sheetApi.setBody(
        h(
          "div",
          { class: "stack" },
          field("The link", urlInput),
          h("p", {
            class: "tiny muted",
            text: canImport
              ? "Works with the blog the pin points to, and usually with the pin itself."
              : "",
          }),
          goBtn
        )
      );
      sheetApi.scrollTop();
      if (window.matchMedia("(min-width: 900px)").matches) urlInput.focus();
    }

    async function handleImport(url) {
      sheetApi.setBody(
        h("div", { class: "thinking" }, h("div", { class: "spinner" }), h("span", { text: "Reading the recipe…" }))
      );
      let out = null;
      try {
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url }),
        });
        out = await res.json();
      } catch (e) {
        out = null;
      }
      if (!out || !out.ok || !out.recipe) {
        UI.toast("Couldn't reach that page. Saved the link; fill the rest in when you can.");
        showFormWithSave(buildRecipeForm({ sourceUrl: url }, "minimal"));
        return;
      }
      const r = out.recipe;
      const ings = (r.ingredients || []).map(parseIngredientLine);
      const parsed = {
        name: r.name || "",
        emoji: guessEmoji(r.name || "", r.keywords || ""),
        image: r.image || "",
        source: r.source || "",
        sourceUrl: r.sourceUrl || url,
        time: r.time || "",
        servings: r.servings || "",
        tags: guessTags(r),
        ingredients: ings,
        steps: r.steps || [],
      };
      if (!r.found) UI.toast("That page didn't publish a recipe block. Fill in what's missing.");
      showReviewForm(parsed);
    }

    function showFormWithSave(form) {
      const saveBtn = h("button", { class: "btn btn-primary btn-block", type: "button" }, "Save to the box");
      saveBtn.addEventListener("click", function () {
        const res = form.collect();
        if (res.error) {
          UI.toast(res.error);
          return;
        }
        saveRecipe(res.value, null);
        sheetApi.close();
      });
      sheetApi.setBody(h("div", { class: "stack" }, form.el, saveBtn));
      sheetApi.scrollTop();
    }

    function showManualForm(level) {
      const form = buildRecipeForm(null, level);
      const saveBtn = h("button", { class: "btn btn-primary btn-block", type: "button" }, "Save to the box");
      saveBtn.addEventListener("click", function () {
        const res = form.collect();
        if (res.error) {
          UI.toast(res.error);
          return;
        }
        saveRecipe(res.value, null);
        sheetApi.close();
      });
      sheetApi.setBody(h("div", { class: "stack" }, form.el, saveBtn));
      sheetApi.scrollTop();
    }

    function showPasteForm(prefillText, prefillUrl) {
      const pasteArea = h("textarea", {
        class: "textarea",
        placeholder: "Paste the whole recipe here — ingredients, steps, all of it",
        data: { keep: "paste-recipe" },
        text: prefillText || "",
      });
      pasteArea.style.minHeight = "220px";
      const urlInput = h("input", { class: "input", type: "url", placeholder: "https://…", value: prefillUrl || "" });
      const submitBtn = h("button", { class: "btn btn-primary btn-block", type: "button" }, "Sort it out");
      submitBtn.addEventListener("click", function () {
        handlePasteSubmit(pasteArea.value, urlInput.value);
      });
      sheetApi.setBody(
        h(
          "div",
          { class: "stack" },
          field("The recipe", pasteArea),
          field("Where did it come from? (optional)", urlInput),
          submitBtn
        )
      );
      sheetApi.scrollTop();
    }

    function showThinking() {
      sheetApi.setBody(
        h("div", { class: "thinking" }, h("div", { class: "spinner" }), h("span", { text: "Claude is reading the recipe…" }))
      );
    }

    async function handlePasteSubmit(text, url) {
      const trimmed = (text || "").trim();
      if (!trimmed) {
        UI.toast("Paste the recipe text first.");
        return;
      }
      const cleanUrl = (url || "").trim();
      showThinking();

      let data;
      try {
        data = await Ask.json(buildPastePrompt(trimmed, cleanUrl), { modelTier: "quick" });
      } catch (err) {
        const msg = Ask.message(err);
        if (msg) UI.toast(msg);
        showPasteForm(trimmed, cleanUrl);
        return;
      }

      const normalized = normalizeParsed(data, cleanUrl);
      if (!normalized) {
        UI.toast("Claude's answer didn't look like a recipe. Try again, or type it in yourself.");
        showPasteForm(trimmed, cleanUrl);
        return;
      }
      showReviewForm(normalized);
    }

    function showReviewForm(parsed) {
      const form = buildRecipeForm(parsed, "full");
      const saveBtn = h("button", { class: "btn btn-primary btn-block", type: "button" }, "Save to the box");
      saveBtn.addEventListener("click", function () {
        const res = form.collect();
        if (res.error) {
          UI.toast(res.error);
          return;
        }
        saveRecipe(res.value, null);
        sheetApi.close();
      });
      sheetApi.setBody(
        h(
          "div",
          { class: "stack" },
          h("p", { class: "muted tiny", text: "Check it over before saving — fix anything that came across wrong." }),
          form.el,
          saveBtn
        )
      );
      sheetApi.scrollTop();
    }

    sheetApi = UI.sheet({ title: "Add a recipe", body: h("div", { class: "stack" }) });
    showDoors();
  }

  /* Reused by the recipe sheet's overflow menu — opens the add sheet
     straight into the full form, pre-filled, in edit mode. */
  function openEdit(recipe) {
    let sheetApi;
    const form = buildRecipeForm(recipe, "full");
    const saveBtn = h("button", { class: "btn btn-primary btn-block", type: "button" }, "Save changes");
    saveBtn.addEventListener("click", function () {
      const res = form.collect();
      if (res.error) {
        UI.toast(res.error);
        return;
      }
      saveRecipe(res.value, recipe);
      sheetApi.close();
    });
    sheetApi = UI.sheet({
      title: "Edit " + (recipe.name || "recipe"),
      body: h("div", { class: "stack" }, form.el, saveBtn),
    });
  }

  function buildPastePrompt(text, url) {
    const vocab = TAG_VOCAB.join(", ");
    let p = "A home cook pasted the text of a recipe copied from a blog or a Pinterest pin. ";
    p += "Read it and reply with ONLY a single JSON object — no other text, no markdown fence — matching exactly this shape:\n";
    p += '{"name": string, "emoji": string (one food emoji), "source": string, "time": string (e.g. "30 min"), ';
    p += '"servings": string (e.g. "4"), "tags": string[], "ingredients": [{"item": string, "qty": string, "pantry": boolean}], "steps": string[]}\n\n';
    p += "Rules:\n";
    p += '- "tags" may ONLY use values from this list, and only ones that truly fit: ' + vocab + ".\n";
    p += '- "source" should name the cook or site the text credits (e.g. "Ina Garten", "Smitten Kitchen") when the text identifies one; otherwise use an empty string.\n';
    p += '- "steps" must be REWRITTEN concisely in plain, original wording — never copied sentences from the pasted text. Use 4 to 8 short imperative sentences (e.g. "Sear the chicken until golden.").\n';
    p += '- "ingredients" should separate each ingredient\'s quantity from its name; set "pantry": true only for common staples (salt, oil, flour, sugar, spices).\n';
    p += '- Leave a field blank ("" or []) rather than guessing when the text does not say.\n\n';
    if (url) p += "The person also gave this source link: " + url + "\n\n";
    p += 'The pasted recipe text:\n"""\n' + text.slice(0, 6000) + '\n"""\n';
    return p;
  }

  /* A cheap emoji for an imported recipe, from its name. Editable anyway. */
  const EMOJI_GUESSES = [
    [/pizza/i, "🍕"], [/taco|burrito|quesadilla|enchilada/i, "🌮"], [/burger/i, "🍔"],
    [/pasta|spaghetti|penne|ziti|lasagna|linguine|gnocchi|mac and cheese|macaroni/i, "🍝"],
    [/soup|chili|stew|chowder/i, "🍲"], [/salad/i, "🥗"], [/shrimp|prawn/i, "🍤"],
    [/salmon|fish|cod|tilapia|tuna/i, "🐟"], [/chicken|turkey/i, "🍗"], [/steak|beef|roast|brisket/i, "🥩"],
    [/pork|ribs|bacon|ham/i, "🥓"], [/rice|risotto|fried rice/i, "🍚"], [/ramen|noodle|pho|stir[- ]?fry/i, "🍜"],
    [/curry/i, "🍛"], [/egg|frittata|omelet|quiche/i, "🍳"], [/pancake|waffle|french toast/i, "🥞"],
    [/bread|roll|bun|biscuit/i, "🍞"], [/cookie|brownie|cake|pie|muffin|dessert|bar/i, "🍪"],
    [/sandwich|panini|grilled cheese/i, "🥪"], [/potato/i, "🥔"], [/corn/i, "🌽"], [/broccoli|veggie|vegetable/i, "🥦"],
  ];
  function guessEmoji(name, keywords) {
    const hay = name + " " + keywords;
    for (let i = 0; i < EMOJI_GUESSES.length; i++) if (EMOJI_GUESSES[i][0].test(hay)) return EMOJI_GUESSES[i][1];
    return "🍽️";
  }

  function guessTags(r) {
    const hay = ((r.name || "") + " " + (r.keywords || "") + " " + (r.steps || []).join(" ")).toLowerCase();
    const tags = [];
    const mins = parseInt((r.time || "").replace(/\D+/g, ""), 10);
    if (/slow cooker|crock ?pot/.test(hay)) tags.push("slow-cooker");
    if (/sheet pan|one pan|one-pan|skillet/.test(hay)) tags.push("one-pan");
    if (/grill/.test(hay)) tags.push("grill");
    if (/soup|chili|stew/.test(hay)) tags.push("soup");
    if (/pasta|spaghetti|penne|noodle|lasagna/.test(hay)) tags.push("pasta");
    if (/vegetarian|meatless|vegan/.test(hay)) tags.push("vegetarian");
    if (r.time && /min/.test(r.time) && !/hr/.test(r.time) && mins && mins <= 25) tags.push("quick");
    if (r.time && !/hr/.test(r.time) && mins && mins <= 45) tags.push("weeknight");
    return tags.filter(function (t, i, a) { return TAG_VOCAB.indexOf(t) >= 0 && a.indexOf(t) === i; }).slice(0, 5);
  }

  function normalizeParsed(data, url) {
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    const name = typeof data.name === "string" ? data.name.trim() : "";
    if (!name) return null;

    const emoji = typeof data.emoji === "string" && data.emoji.trim() ? data.emoji.trim() : "🍽️";
    const source = typeof data.source === "string" ? data.source.trim() : "";
    const time = typeof data.time === "string" ? data.time.trim() : "";
    const servings =
      typeof data.servings === "string" ? data.servings.trim() : typeof data.servings === "number" ? String(data.servings) : "";

    const tags = Array.isArray(data.tags)
      ? data.tags.filter(function (t) { return typeof t === "string" && TAG_VOCAB.indexOf(t) >= 0; })
      : [];

    const ingredients = Array.isArray(data.ingredients)
      ? data.ingredients
          .map(function (ing) {
            if (!ing || typeof ing !== "object") return null;
            const item = typeof ing.item === "string" ? ing.item.trim() : "";
            if (!item) return null;
            return { item: item, qty: typeof ing.qty === "string" ? ing.qty.trim() : "", pantry: !!ing.pantry };
          })
          .filter(Boolean)
      : [];

    const steps = Array.isArray(data.steps)
      ? data.steps.filter(function (s) { return typeof s === "string" && s.trim(); }).map(function (s) { return s.trim(); })
      : [];

    return {
      name: name,
      emoji: emoji,
      source: source,
      sourceUrl: url || "",
      time: time,
      servings: servings,
      tags: tags,
      ingredients: ingredients,
      steps: steps,
    };
  }

  Router.on("recipes", renderRecipes);

  return {
    byId: byId,
    all: all,
    suggest: suggest,
    openSheet: openSheet,
    openAdd: openAdd,
  };
})();
