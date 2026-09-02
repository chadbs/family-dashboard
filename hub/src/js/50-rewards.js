/* ============================================================
   Stars — the kids' reward economy, carried over from the wall
   dashboard so it works on a phone too.

   Public surface (see CONTRACT.md): Router.on("rewards", …) and
   `const Rewards`. Everything else here is private to this file.
   ============================================================ */

const SEED_REWARD_SHOP = {
  kids: [
    { name: "Addison", emoji: "🐰" },
    { name: "Sophie", emoji: "🐢" },
  ],
  starEmoji: "⭐",
  streakBonusEvery: 3,
  streakBonus: 1,
  rewards: [
    { id: "candy", name: "Candy", emoji: "🍬", cost: 3 },
    { id: "stayup", name: "Stay up late", emoji: "🌙", cost: 4 },
    { id: "playdad", name: "Play with Dad", emoji: "🎲", cost: 4 },
    { id: "tv", name: "Watch TV 30 min", emoji: "📺", cost: 5 },
    { id: "icecream", name: "Ice cream", emoji: "🍦", cost: 5 },
    { id: "park", name: "Park trip", emoji: "🌳", cost: 5 },
  ],
};

const SEED_REWARD_STATE = {
  stars: { Addison: 0, Sophie: 0 },
  streak: { Addison: { count: 1, last: "2026-07-22" } },
  log: [],
};

const Rewards = (function () {
  const REASONS = [
    "Did a chore",
    "Was kind",
    "Helped without asking",
    "Listened the first time",
  ];

  /* ---------- data ---------- */

  function shop() {
    const doc = Store.get("rewardShop");
    return isPlainObject(doc) && Object.keys(doc).length ? doc : SEED_REWARD_SHOP;
  }

  function state() {
    const doc = Store.get("rewards");
    const base = isPlainObject(doc) && Object.keys(doc).length ? doc : SEED_REWARD_STATE;
    return {
      stars: isPlainObject(base.stars) ? base.stars : {},
      streak: isPlainObject(base.streak) ? base.streak : {},
      log: Array.isArray(base.log) ? base.log : [],
    };
  }

  function kids() {
    const list = shop().kids;
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }

  function kidByName(name) {
    return kids().filter(function (k) { return k && k.name === name; })[0] || null;
  }

  function balance(kid) {
    const st = state();
    const n = Number(st.stars && st.stars[kid]);
    if (!isFinite(n)) return 0;
    return Math.max(0, Math.round(n));
  }

  function rewardById(id) {
    const list = shop().rewards;
    const arr = Array.isArray(list) ? list : [];
    return arr.filter(function (r) { return r && r.id === id; })[0] || null;
  }

  /* Add (or, with a negative n, take back) stars for a kid and log it.
     Also advances that kid's streak — but only on a positive award, and
     only the first time today, so a correction never touches it and a
     second star the same day doesn't double-count the day. */
  function give(kid, n, why) {
    kid = String(kid || "").trim();
    const amt = Math.round(Number(n)) || 0;
    if (!kid || !amt) return;

    const st = state();
    const before = balance(kid);
    const after = Math.max(0, before + amt);
    if (after === before) return; // e.g. "take back" with nothing left to take

    const patch = { stars: {} };
    patch.stars[kid] = after;

    const log = st.log.slice();
    log.unshift({
      at: new Date().toISOString(),
      kid: kid,
      delta: after - before,
      why: String(why || "").trim(),
    });

    let bonusAmt = 0;
    let bonusCount = 0;
    if (amt > 0) {
      const todayKey = Fmt.dayKey();
      const cur = st.streak[kid] || {};
      if (cur.last !== todayKey) {
        const yestKey = Fmt.dayKey(new Date(Date.now() - 86400000));
        const count = cur.last === yestKey ? (Number(cur.count) || 0) + 1 : 1;
        const sh = shop();
        const every = Math.max(1, Math.round(Number(sh.streakBonusEvery)) || 3);
        const bonusEach = Math.max(0, Math.round(Number(sh.streakBonus)) || 0);

        patch.streak = {};
        patch.streak[kid] = { count: count, last: todayKey };

        if (bonusEach > 0 && count % every === 0) {
          bonusAmt = bonusEach;
          bonusCount = count;
          patch.stars[kid] = after + bonusAmt;
          log.unshift({
            at: new Date().toISOString(),
            kid: kid,
            delta: bonusAmt,
            why: bonusCount + "-day streak bonus",
          });
        }
      }
    }

    patch.log = log.slice(0, 80);
    Store.mergeDoc("rewards", patch);

    if (bonusAmt > 0) {
      UI.toast(
        kid + " hit a " + bonusCount + "-day streak — " + bonusAmt + " bonus " +
          (shop().starEmoji || "⭐") + "!"
      );
    }
  }

  function redeem(kid, rewardId) {
    kid = String(kid || "").trim();
    const reward = rewardById(rewardId);
    if (!kid || !reward) return false;

    const star = shop().starEmoji || "⭐";
    const bal = balance(kid);
    const cost = Math.max(0, Math.round(Number(reward.cost)) || 0);
    if (bal < cost) {
      UI.toast(kid + " needs " + (cost - bal) + " more " + star + " for " + reward.name + ".");
      return false;
    }

    const st = state();
    const after = bal - cost;
    const patch = { stars: {} };
    patch.stars[kid] = after;
    const log = st.log.slice();
    log.unshift({ at: new Date().toISOString(), kid: kid, delta: -cost, why: reward.name });
    patch.log = log.slice(0, 80);
    Store.mergeDoc("rewards", patch);

    UI.toast(kid + " cashed in for " + (reward.emoji ? reward.emoji + " " : "") + reward.name + "!");
    return true;
  }

  /* ---------- shared little helpers ---------- */

  function field(label, control) {
    return UI.h("div", { class: "field" }, UI.h("label", { text: label }), control);
  }

  function isStreakLive(entry) {
    if (!entry || !entry.last) return false;
    const todayKey = Fmt.dayKey();
    const yestKey = Fmt.dayKey(new Date(Date.now() - 86400000));
    return entry.last === todayKey || entry.last === yestKey;
  }

  /* "just now" precision isn't needed here — today shows a time, yesterday
     says so, anything older gets a short date. Fmt.relDay reads "3 days
     late" for anything further back, which is the wrong voice for a log
     of stars already given. */
  function whenLabel(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const dayKey = Fmt.dayKey(d);
    if (dayKey === Fmt.dayKey()) return Fmt.time(d);
    if (dayKey === Fmt.dayKey(new Date(Date.now() - 86400000))) return "yesterday";
    return Fmt.shortDate(d);
  }

  /* ---------- the jars ---------- */

  function openGiveSheet(kid) {
    const star = shop().starEmoji || "⭐";
    const input = UI.h("input", {
      class: "input",
      type: "text",
      placeholder: "What was it for?",
      data: { keep: "give-reason-" + kid },
    });

    function award(reason) {
      give(kid, 1, reason);
      s.close();
    }

    const grid = UI.h("div", { class: "reason-grid" });
    REASONS.forEach(function (r) {
      grid.appendChild(
        UI.h(
          "button",
          { class: "reason-btn", type: "button", on: { click: function () { award(r); } } },
          r
        )
      );
    });

    const s = UI.sheet({
      title: "Give " + kid + " a star " + star,
      body: UI.h("div", { class: "stack" }, grid, field("Or write your own", input)),
      actions: [
        UI.h(
          "button",
          { class: "btn", type: "button", on: { click: function () { s.close(); } } },
          "Cancel"
        ),
        UI.h(
          "button",
          {
            class: "btn btn-primary",
            type: "button",
            on: {
              click: function () {
                const text = input.value.trim();
                if (!text) {
                  UI.toast("Say what it was for first.");
                  return;
                }
                award(text);
              },
            },
          },
          "Give the star"
        ),
      ],
    });
  }

  function takeOneBack(kid) {
    if (balance(kid) <= 0) {
      UI.toast(kid + " doesn't have any stars to take back yet.");
      return;
    }
    give(kid, -1, "Correction");
    UI.toast("Took back a star from " + kid + ".");
  }

  function buildJar(sh, kidInfo) {
    const name = kidInfo.name;
    const bal = balance(name);
    const streakEntry = state().streak[name];
    const live = isStreakLive(streakEntry);

    const jar = UI.h("div", { class: "card jar" });
    jar.appendChild(UI.h("div", { class: "jar-emoji", text: kidInfo.emoji || "⭐" }));
    jar.appendChild(UI.h("div", { class: "jar-name", text: name }));
    jar.appendChild(
      UI.h(
        "div",
        { class: "jar-balance" },
        UI.h("span", { class: "nums", text: String(bal) }),
        UI.h("span", { class: "unit", text: sh.starEmoji || "⭐" })
      )
    );
    if (live) {
      jar.appendChild(UI.chip("🔥 " + (streakEntry.count || 1) + " day streak", "amber"));
    }

    const actions = UI.h("div", { class: "jar-actions" });
    actions.appendChild(
      UI.h(
        "button",
        {
          class: "btn btn-primary btn-block",
          type: "button",
          on: { click: function () { openGiveSheet(name); } },
        },
        "Give a star"
      )
    );
    actions.appendChild(
      UI.h(
        "button",
        {
          class: "btn btn-sm btn-block",
          type: "button",
          on: { click: function () { takeOneBack(name); } },
        },
        "Take one back"
      )
    );
    jar.appendChild(actions);
    return jar;
  }

  function renderJars(sh) {
    const wrap = UI.h("div", { class: "jars" });
    kids().forEach(function (k) {
      wrap.appendChild(buildJar(sh, k));
    });
    return wrap;
  }

  /* ---------- the shop ---------- */

  function openRedeemSheet(reward) {
    const sh = shop();
    const star = sh.starEmoji || "⭐";
    const list = kids();
    const affordable = list.filter(function (k) { return balance(k.name) >= reward.cost; });

    let body;
    if (affordable.length) {
      const rows = UI.h("div", { class: "rows" });
      affordable.forEach(function (k) {
        const bal = balance(k.name);
        const left = bal - reward.cost;
        rows.appendChild(
          UI.h(
            "button",
            {
              class: "row",
              type: "button",
              on: {
                click: function () {
                  if (redeem(k.name, reward.id)) s.close();
                },
              },
            },
            UI.h("span", { class: "redeem-emoji", text: k.emoji || "⭐" }),
            UI.h(
              "div",
              { class: "row-main" },
              UI.h("div", { class: "row-title", text: k.name }),
              UI.h("div", {
                class: "row-sub",
                text: bal + " " + star + " now · " + left + " " + star + " left",
              })
            )
          )
        );
      });
      body = UI.h(
        "div",
        { class: "stack" },
        UI.h("p", { class: "tiny muted", text: "Who's cashing in?" }),
        UI.h("div", { class: "card" }, rows)
      );
    } else {
      let closest = null;
      list.forEach(function (k) {
        const need = reward.cost - balance(k.name);
        if (!closest || need < closest.need) closest = { name: k.name, need: need };
      });
      const msg = closest
        ? closest.name + " needs " + closest.need + " more " + star + " for " + reward.name + "."
        : "No kids are set up in the shop yet.";
      body = UI.empty("star", msg);
    }

    const s = UI.sheet({
      title: (reward.emoji ? reward.emoji + " " : "") + reward.name,
      body: body,
      actions: [
        UI.h(
          "button",
          { class: "btn btn-block", type: "button", on: { click: function () { s.close(); } } },
          "Close"
        ),
      ],
    });
  }

  function buildRewardCard(reward) {
    const star = shop().starEmoji || "⭐";
    const affordable = kids().some(function (k) { return balance(k.name) >= reward.cost; });
    const card = UI.h(
      "button",
      { class: "rcard", type: "button", data: { afford: affordable ? "true" : "false" } },
      UI.h("div", { class: "r-top" }, UI.h("span", { class: "r-emoji", text: reward.emoji || "🎁" })),
      UI.h("div", { class: "r-name", text: reward.name || "Reward" }),
      UI.h(
        "div",
        { class: "r-meta" },
        UI.h("span", { class: "nums", text: (Math.round(Number(reward.cost)) || 0) + " " + star })
      )
    );
    card.addEventListener("click", function () { openRedeemSheet(reward); });
    return card;
  }

  function renderShop(sh) {
    const wrap = UI.h("div", { class: "stack" });
    wrap.appendChild(UI.h("div", { class: "eyebrow", text: "What stars can buy" }));

    const rewards = (Array.isArray(sh.rewards) ? sh.rewards.filter(Boolean).slice() : []).sort(
      function (a, b) { return (Number(a.cost) || 0) - (Number(b.cost) || 0); }
    );

    if (!rewards.length) {
      wrap.appendChild(UI.empty("gift", "Nothing in the shop yet — add something below."));
    } else {
      const grid = UI.h("div", { class: "recipe-grid" });
      rewards.forEach(function (r) { grid.appendChild(buildRewardCard(r)); });
      wrap.appendChild(grid);
    }
    return wrap;
  }

  /* ---------- recent stars ---------- */

  function renderRecent(st) {
    const star = shop().starEmoji || "⭐";
    const entries = st.log.slice(0, 12);

    let body;
    if (!entries.length) {
      body = UI.empty("star", "No stars given yet — tap “Give a star” above to start.");
    } else {
      const rows = UI.h("div", { class: "rows" });
      entries.forEach(function (e) {
        const kidInfo = kidByName(e.kid);
        const delta = Number(e.delta) || 0;
        rows.appendChild(
          UI.h(
            "div",
            { class: "row row-static" },
            UI.h("span", { class: "log-emoji", text: (kidInfo && kidInfo.emoji) || star }),
            UI.h(
              "div",
              { class: "row-main" },
              UI.h("div", { class: "row-title", text: e.why || (e.kid + " star") }),
              UI.h("div", { class: "row-sub", text: e.kid + " · " + whenLabel(e.at) })
            ),
            UI.h(
              "div",
              { class: "row-end" },
              UI.chip((delta > 0 ? "+" : "") + delta + " " + star, delta > 0 ? "leaf" : "tulip")
            )
          )
        );
      });
      body = UI.h("div", { class: "card" }, rows);
    }

    return UI.section("Recent stars", null, body);
  }

  /* ---------- edit the shop ---------- */

  function saveShopRewards(sh, nextRewards) {
    const next = Object.assign({}, sh, { rewards: nextRewards });
    Store.setDoc("rewardShop", next);
  }

  function buildRewardEditRow(draft, idx, rerender) {
    const r = draft[idx];
    const emojiInput = UI.h("input", {
      class: "input rwd-emoji",
      type: "text",
      value: r.emoji || "",
      placeholder: "🎁",
    });
    const nameInput = UI.h("input", {
      class: "input rwd-name",
      type: "text",
      value: r.name || "",
      placeholder: "Reward name",
    });
    const costInput = UI.h("input", {
      class: "input rwd-cost",
      type: "number",
      min: "1",
      value: String(r.cost || 1),
    });
    emojiInput.addEventListener("input", function () { r.emoji = emojiInput.value; });
    nameInput.addEventListener("input", function () { r.name = nameInput.value; });
    costInput.addEventListener("input", function () { r.cost = costInput.value; });

    const del = UI.h(
      "button",
      {
        class: "ibtn",
        type: "button",
        "aria-label": "Delete " + (r.name || "reward"),
        on: {
          click: function () {
            draft.splice(idx, 1);
            rerender();
          },
        },
      },
      UI.icon("trash")
    );

    return UI.h("div", { class: "edit-row reward-edit-row" }, emojiInput, nameInput, costInput, del);
  }

  function openEditShopSheet() {
    const sh = shop();
    const draft = (Array.isArray(sh.rewards) ? sh.rewards.filter(Boolean) : []).map(function (r) {
      return Object.assign({}, r);
    });

    function buildBody() {
      const wrap = UI.h("div", { class: "stack" });
      draft.forEach(function (r, idx) {
        wrap.appendChild(buildRewardEditRow(draft, idx, function () { s.setBody(buildBody()); }));
      });
      wrap.appendChild(
        UI.h(
          "button",
          {
            class: "btn btn-block",
            type: "button",
            on: {
              click: function () {
                draft.push({ id: uid("rwd"), name: "", emoji: "🎁", cost: 3 });
                s.setBody(buildBody());
              },
            },
          },
          "Add a reward"
        )
      );
      return wrap;
    }

    const s = UI.sheet({
      title: "Edit the rewards",
      body: buildBody(),
      actions: [
        UI.h(
          "button",
          { class: "btn", type: "button", on: { click: function () { s.close(); } } },
          "Cancel"
        ),
        UI.h(
          "button",
          {
            class: "btn btn-primary",
            type: "button",
            on: {
              click: function () {
                const cleaned = draft
                  .map(function (r) {
                    return {
                      id: r.id || uid("rwd"),
                      name: String(r.name || "").trim(),
                      emoji: String(r.emoji || "").trim() || "🎁",
                      cost: Math.max(1, Math.round(Number(r.cost) || 1)),
                    };
                  })
                  .filter(function (r) { return r.name; });
                saveShopRewards(sh, cleaned);
                s.close();
              },
            },
          },
          "Save"
        ),
      ],
    });
  }

  /* ---------- screen shell ---------- */

  function renderRewards(root) {
    const sh = shop();
    const st = state();
    const star = sh.starEmoji || "⭐";
    const list = kids();

    const sub = list
      .map(function (k) { return k.name + " has " + balance(k.name) + " " + star; })
      .join(" · ");

    root.appendChild(
      UI.h(
        "div",
        { class: "page-head" },
        UI.h("h1", { class: "title", text: "Stars" }),
        UI.h("p", { class: "sub", text: sub || "No kids set up in the shop yet." })
      )
    );

    if (list.length) root.appendChild(renderJars(sh));
    else root.appendChild(UI.empty("star", "Add kids in “Edit the rewards” to start giving stars."));

    /* The chore chart: where most of the stars actually come from. */
    if (typeof Chores !== "undefined" && list.length) root.appendChild(Chores.section());

    root.appendChild(renderShop(sh));
    root.appendChild(renderRecent(st));

    root.appendChild(
      UI.h(
        "button",
        { class: "btn btn-sm", type: "button", on: { click: openEditShopSheet } },
        "Edit the rewards"
      )
    );
  }

  Router.on("rewards", renderRewards);

  return {
    shop: shop,
    state: state,
    balance: balance,
    give: give,
    redeem: redeem,
  };
})();
