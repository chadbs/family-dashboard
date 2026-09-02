# Cross-module contract

Four view modules are built in parallel. Everything they share is listed here.
Each file may define ONLY the globals listed under its own heading, and may
CALL any global listed under any heading (all files are concatenated into one
script scope, and every call happens after every file has evaluated, so
forward references between modules are fine).

Read `src/js/00-core.js` for the real signatures of `Store`, `UI`, `Fmt`,
`Router` and `Ask` — it is the authority, not this summary.
Read `src/styles.css` for the class names — use them; do not invent colors.

---

## Defined by `10-today.js`
```js
Router.on("today", renderToday)
```
No shared globals.

## Defined by `20-meals.js`
```js
Router.on("meals", renderMeals)

const Plan = {
  week(date),               // -> { mon:Slot, …, sun:Slot } for that date's week ({} if none)
  slotFor(date),            // -> Slot | null   for one calendar date
  setSlot(date, slot),      // writes into plan/current under the right week + day key
  clearSlot(date),
  describe(slot),           // -> { emoji, name, sub }  ready to render; name is "" when unplanned
  openPicker(date),         // opens the "what's for dinner" sheet for that date
  fillWeek(date),           // auto-plans the whole week
};

const Grocery = {
  addItem(name, opts),      // opts: { qty, cat, store, src }
  buildFromWeek(date),      // regenerate the list from the week's recipes + staples
};
```
`Slot = { kind: "recipe"|"text"|"out"|"leftovers", recipeId?, title?, note? }`

## Defined by `30-recipes.js`
```js
Router.on("recipes", renderRecipes)

const Recipes = {
  byId(id),                 // -> recipe object with .id, or null
  all(),                    // -> array, alphabetical by name
  suggest(date, n),         // -> n recipes suited to that date's season, favorites first,
                            //    least-recently-planned first, never repeating
  openSheet(id, opts),      // the full recipe sheet. opts.onPick(recipe) adds a
                            //    "Use this one" button in the footer instead of "Add to this week"
  openAdd(),                // the three-door add flow
};
```

## Defined by `40-house.js`
```js
Router.on("house", renderHouse)

const House = {
  todayTasks(date),         // -> [{ id, text, min, done }] for that weekday, with today's checks applied
  toggleTask(date, taskId), // flips the check for that date
  zoneName(dayIdx),         // -> a short name for the day's theme, derived from its tasks
  openJobs(),               // Router.go("house") + switch the segment to Jobs
  attention(date),          // -> [{ kind:"job"|"project", id, title, sub, tone }] — overdue or
                            //    urgent jobs and in-progress projects, most pressing first, max 6
};
```

---

## Shared conventions

- `date` arguments are always a `Date`; default to `new Date()` when omitted.
- Day keys are `Fmt.dayKey(date)` -> `"2026-09-02"`. Weekday index is
  `Fmt.dayIdx(date)`, **Monday = 0**, matching `DAY_KEYS`.
- Never write to the store from a render function — only from an event handler.
- After a write, do nothing else: `Store` emits and the router repaints.
- Any text input the person types into across a repaint needs
  `data-keep="some-stable-id"` so the router restores focus and caret.
- Ephemeral view state (which filter chip is on, which segment shows) goes in
  `UI.state`, e.g. `UI.state.houseTab = "jobs"`. It must survive a repaint and
  must never be persisted.
