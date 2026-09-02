/* ============================================================
   Chores — the kids' chart, carried over from the wall.

   Addison (4) and Sophie (2) each have a few chores with a big picture.
   Tapping one marks it done and drops a star in that kid's jar, with the
   streak bonus the wall already gave. Tapping again takes it back. Daily
   chores clear each morning; weekly ones clear each Monday.

   Lives in one document, chores/board:
     { list: [{ id, name, who, cadence:"daily"|"weekly", pic, stars }],
       done: { "<periodKey>": { "<choreId>": true } } }
   where periodKey is the day for daily chores and the ISO week for weekly
   ones, so "done" prunes itself as time moves on.

   Used by the Stars tab (phone) and by the wall, where it is the one panel
   the kids are meant to touch.
   ============================================================ */

const SEED_CHORES = {
  list: [
    { id: "windows", name: "Wash windows", who: "Addison", cadence: "weekly", pic: "\u{1F9FD}", stars: 1 },
    { id: "shoes", name: "Clean up shoes", who: "Sophie", cadence: "weekly", pic: "\u{1F45F}", stars: 1 },
    { id: "toys-a", name: "Pick up toys", who: "Addison", cadence: "daily", pic: "\u{1F9F8}", stars: 1 },
    { id: "toys-s", name: "Pick up toys", who: "Sophie", cadence: "daily", pic: "\u{1F9F8}", stars: 1 },
    { id: "table", name: "Help set the table", who: "Addison", cadence: "daily", pic: "\u{1F37D}\u{FE0F}", stars: 1 },
    { id: "books", name: "Put books away", who: "Sophie", cadence: "daily", pic: "\u{1F4DA}", stars: 1 },
  ],
  done: {},
};

/* Chores without a picture get one guessed from the name, like the wall. */
const CHORE_PICS = [
  [/window/i, "\u{1F9FD}"],
  [/shoe/i, "\u{1F45F}"],
  [/toy|lego|block/i, "\u{1F9F8}"],
  [/book/i, "\u{1F4DA}"],
  [/table|dish|plate/i, "\u{1F37D}\u{FE0F}"],
  [/bed/i, "\u{1F6CF}\u{FE0F}"],
  [/laundry|cloth|sock/i, "\u{1F9E6}"],
  [/dog|cat|pet|feed/i, "\u{1F436}"],
  [/plant|water|flower/i, "\u{1FAB4}"],
  [/trash|garbage|recycl/i, "\u{1F5D1}\u{FE0F}"],
  [/teeth|brush/i, "\u{1FAA5}"],
  [/vacuum|sweep|floor/i, "\u{1F9F9}"],
  [/wipe|clean/i, "\u{1F9FC}"],
];

const Chores = (function () {
  function picFor(name) {
    for (let i = 0; i < CHORE_PICS.length; i++) if (CHORE_PICS[i][0].test(name || "")) return CHORE_PICS[i][1];
    return "\u{2B50}";
  }

  function board() {
    const doc = Store.get("chores");
    if (doc && Array.isArray(doc.list)) return doc;
    return SEED_CHORES;
  }

  function list() {
    return (board().list || []).filter(function (c) {
      return c && c.id && c.name;
    });
  }

  function forKid(kid) {
    return list().filter(function (c) {
      return c.who === kid;
    });
  }

  function periodKey(chore, date) {
    return chore.cadence === "weekly" ? Fmt.weekKey(date) : Fmt.dayKey(date);
  }

  function isDone(chore, date) {
    const done = board().done || {};
    const bucket = done[periodKey(chore, date || new Date())];
    return !!(bucket && bucket[chore.id]);
  }

  function starsFor(chore) {
    const n = Math.round(Number(chore.stars));
    return n > 0 ? n : 1;
  }

  /* Tap = done + a star. Tap again = undone, star back. The kids see it
     change on the wall within seconds of a phone tap, and the other way. */
  function toggle(id, date) {
    const now = date || new Date();
    const chore = list().find(function (c) {
      return c.id === id;
    });
    if (!chore) return;
    const key = periodKey(chore, now);
    const wasDone = isDone(chore, now);
    const patch = { done: {} };
    patch.done[key] = {};
    patch.done[key][id] = !wasDone;
    Store.mergeDoc("chores", patch);

    if (chore.who && typeof Rewards !== "undefined") {
      const n = starsFor(chore);
      if (wasDone) Rewards.give(chore.who, -n, "Took back: " + chore.name);
      else Rewards.give(chore.who, n, "Did a chore: " + chore.name);
    }
    return !wasDone;
  }

  function saveList(next) {
    const cur = board();
    /* Keep only the current day and week of ticks; older buckets are just
       history nobody reads, and the store is happier small. */
    const keep = {};
    const dk = Fmt.dayKey();
    const wk = Fmt.weekKey();
    const done = cur.done || {};
    if (done[dk]) keep[dk] = done[dk];
    if (done[wk]) keep[wk] = done[wk];
    Store.setDoc("chores", { list: next, done: keep });
  }

  /* ---------- the tiles ---------- */

  function tile(chore, opts) {
    const o = opts || {};
    const done = isDone(chore, new Date());
    const el = UI.h(
      "button",
      {
        class: "chore-tile" + (o.big ? " chore-tile-big" : ""),
        type: "button",
        "aria-pressed": done ? "true" : "false",
        "aria-label": chore.name + (done ? ", done" : ""),
      },
      UI.h("span", { class: "chore-pic", text: chore.pic || picFor(chore.name) }),
      UI.h("span", { class: "chore-name", text: chore.name }),
      UI.h(
        "span",
        { class: "chore-meta" },
        chore.cadence === "weekly" ? UI.h("span", { class: "chore-cad", text: "this week" }) : null,
        UI.h("span", { class: "chore-stars nums", text: starsFor(chore) + " \u{2B50}" })
      ),
      UI.h("span", { class: "chore-check" }, UI.icon("check"))
    );
    el.addEventListener("click", function () {
      const nowDone = toggle(chore.id);
      if (nowDone) {
        el.classList.add("chore-pop");
        if (o.onDone) o.onDone(chore);
      }
    });
    return el;
  }

  /* One block per kid: emoji, name, tiles. Shared by the phone and the wall. */
  function kidBlocks(opts) {
    const o = opts || {};
    const shop = typeof Rewards !== "undefined" ? Rewards.shop() || {} : {};
    const kids = shop.kids || [];
    const blocks = [];
    kids.forEach(function (k) {
      const mine = forKid(k.name);
      if (!mine.length) return;
      const doneN = mine.filter(function (c) {
        return isDone(c, new Date());
      }).length;
      blocks.push(
        UI.h(
          "div",
          { class: "chore-kid" },
          UI.h(
            "div",
            { class: "chore-kid-head" },
            UI.h("span", { class: "chore-kid-emoji", text: k.emoji || "\u{2B50}" }),
            UI.h("span", { class: "chore-kid-name", text: k.name }),
            UI.h("span", {
              class: "chore-kid-count nums",
              text: doneN === mine.length ? "All done!" : doneN + " of " + mine.length,
            })
          ),
          UI.h(
            "div",
            { class: "chore-grid" },
            mine.map(function (c) {
              return tile(c, o);
            })
          )
        )
      );
    });
    return blocks;
  }

  /* ---------- editing ---------- */

  function openEditor() {
    const shop = typeof Rewards !== "undefined" ? Rewards.shop() || {} : {};
    const kids = (shop.kids || []).map(function (k) {
      return k.name;
    });
    let working = list().map(function (c) {
      return Object.assign({}, c);
    });

    let sheet;
    function row(c, idx) {
      const name = UI.h("input", { class: "input", type: "text", value: c.name, placeholder: "Chore" });
      const who = UI.h("select", { class: "select" });
      kids.forEach(function (k) {
        who.appendChild(UI.h("option", { value: k, text: k, selected: c.who === k ? true : null }));
      });
      const cad = UI.h(
        "select",
        { class: "select" },
        UI.h("option", { value: "daily", text: "Every day", selected: c.cadence !== "weekly" ? true : null }),
        UI.h("option", { value: "weekly", text: "Once a week", selected: c.cadence === "weekly" ? true : null })
      );
      const pic = UI.h("input", { class: "input chore-pic-input", type: "text", value: c.pic || "", placeholder: picFor(c.name) });
      const stars = UI.h("input", { class: "input chore-stars-input", type: "number", min: "1", max: "5", value: starsFor(c) });
      const del = UI.h("button", { class: "ibtn", type: "button", "aria-label": "Remove" }, UI.icon("trash"));
      del.addEventListener("click", function () {
        working.splice(idx, 1);
        render();
      });
      function sync() {
        c.name = name.value.trim();
        c.who = who.value;
        c.cadence = cad.value;
        c.pic = pic.value.trim();
        c.stars = Math.max(1, Math.round(Number(stars.value)) || 1);
      }
      [name, who, cad, pic, stars].forEach(function (i) {
        i.addEventListener("input", sync);
        i.addEventListener("change", sync);
      });
      return UI.h(
        "div",
        { class: "chore-edit-row" },
        UI.h("div", { class: "chore-edit-line" }, pic, name, del),
        UI.h("div", { class: "chore-edit-line" }, who, cad, stars)
      );
    }

    function render() {
      const rows = working.map(row);
      const add = UI.h("button", { class: "btn btn-block", type: "button" }, UI.icon("plus"), "Add a chore");
      add.addEventListener("click", function () {
        working.push({ id: uid("chore"), name: "", who: kids[0] || "", cadence: "daily", pic: "", stars: 1 });
        render();
      });
      const body = UI.h(
        "div",
        { class: "stack" },
        UI.h("p", { class: "tiny muted", text: "Every day clears each morning. Once a week clears each Monday. Stars are what a tap is worth." }),
        UI.h("div", { class: "stack" }, rows),
        add
      );
      if (sheet) sheet.setBody(body);
      return body;
    }

    sheet = UI.sheet({
      title: "The chore chart",
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
                  .map(function (c) {
                    return {
                      id: c.id || uid("chore"),
                      name: (c.name || "").trim(),
                      who: c.who || "",
                      cadence: c.cadence === "weekly" ? "weekly" : "daily",
                      pic: (c.pic || "").trim() || picFor(c.name),
                      stars: starsFor(c),
                    };
                  })
                  .filter(function (c) {
                    return c.name;
                  });
                saveList(cleaned);
                sheet.close();
                UI.toast("Chore chart saved");
              },
            },
          },
          "Save"
        ),
      ],
    });
  }

  /* The section the Stars tab shows above the jars. */
  function section() {
    const blocks = kidBlocks({});
    const editBtn = UI.h("button", { class: "btn btn-sm", type: "button" }, UI.icon("pencil"), "Edit");
    editBtn.addEventListener("click", openEditor);
    if (!blocks.length) {
      return UI.section(
        "Chores",
        editBtn,
        UI.h("div", { class: "card" }, UI.empty("star", "No chores on the chart yet. Add a few and the kids can start earning.", UI.h("button", { class: "btn btn-primary", type: "button", on: { click: openEditor } }, "Set up the chart")))
      );
    }
    return UI.section("Chores", editBtn, UI.h("div", { class: "chore-kids" }, blocks));
  }

  return {
    list: list,
    forKid: forKid,
    isDone: isDone,
    toggle: toggle,
    kidBlocks: kidBlocks,
    section: section,
    openEditor: openEditor,
  };
})();
