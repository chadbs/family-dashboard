# The Solanyk House — build spec

A phone-first **Claude Artifact** that gives the family everything the wall
dashboard can't give them away from the wall: meals + real recipes, Kenzie's
daily cleaning routine, Chad's job list, the big-project list, and a Today page
that pulls the useful parts of all of it together.

It is a **separate product from the wall dashboard** (`../public/`). It does not
read the wall's `data/state.json` and must never write to it. The wall keeps
weather, kid chores, stars and the grocery-cart pipeline. The hub is the
anywhere copy of the *household* side.

---

## How it ships

Source lives in `hub/src/`. `node hub/build.js` concatenates it into a single
`hub/dist/hub.html`, which is published with the Artifact tool using
`capabilities: { db: {}, sample: {} }`.

```
hub/
  build.js               concatenates src -> dist/hub.html
  src/index.html         shell; contains {{STYLES}} {{DATA}} {{APP}} markers
  src/styles.css         the whole design system + every component
  src/data/almanac.js    sun times, Michigan seasonal produce, house tips
  src/data/recipes.js    SEED_RECIPES — the starting recipe box
  src/data/seed.js       SEED_ROUTINE, SEED_JOBS, SEED_PROJECTS
  src/js/00-core.js      store, db wiring, router, DOM helpers, sheets, toasts
  src/js/10-today.js     Today view
  src/js/20-meals.js     Meals view (week plan + grocery)
  src/js/30-recipes.js   Recipes view (box, detail sheet, import)
  src/js/40-house.js     House view (Cleaning / Jobs / Projects)
  src/js/99-boot.js      startup
```

Concatenation order is alphabetical by path inside each group: `data/*` then
`js/*`. Everything shares one global scope — **no modules, no imports, no
bundler, no npm.** Same zero-dependency rule as the rest of this repo.

---

## Design system (already written in `src/styles.css` — use it, don't invent)

**Direction: Dutch-kitchen porcelain.** Hudsonville sits in Dutch West
Michigan, so the palette is delft blue on porcelain, with tulip red and garden
green doing semantic work. Deliberately *not* the cream-and-terracotta look.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ground` | `#EFF2F1` | `#101A20` | page background |
| `--surface` | `#FFFFFF` | `#18242C` | cards, sheets |
| `--surface-2` | `#F7F9F8` | `#1F2D36` | insets, inputs |
| `--ink` | `#14212B` | `#E7EEF2` | primary text |
| `--ink-2` | `#5C6E7A` | `#93A7B3` | secondary text |
| `--ink-3` | `#8798A3` | `#6C818E` | tertiary / placeholder |
| `--line` | `#DCE4E3` | `#27353F` | hairlines |
| `--delft` | `#2B5B87` | `#7FB3DD` | the accent |
| `--tulip` | `#AE3A32` | `#E4796F` | overdue / urgent / destructive |
| `--leaf` | `#4B7A47` | `#8CBF86` | done / good |
| `--amber` | `#B5792A` | `#DFAC5E` | projects / attention |

Type: **Newsreader** (serif, display only — page titles, recipe names, day
names) + **Public Sans** (everything operational). Eyebrow labels are
`0.72rem`, uppercase, `letter-spacing: .09em`, `--ink-3`.

Radii: `--r-sm 8px`, `--r 14px`, `--r-lg 20px`. Spend border/shadow by role —
not every block is a card.

**Layout.** Mobile-first single column, `max-width: 640px`, with a fixed bottom
tab bar (`Today · Meals · Recipes · House`). At `≥900px` the tab bar becomes a
left rail and content widens to `1080px` with a two-column Today.

Tap targets ≥ 44px. `font-variant-numeric: tabular-nums` on any column of
digits. Respect `prefers-reduced-motion`.

---

## The data store

`await claude.use("db")`. Availability is per-view and may be `null` — the app
must render fully from seeds and local storage when it is, in read/write-local
mode, and light up when db resolves.

No `user` capability is available on this account, so **everything is shared**
family-wide. Do not use `data/users/` paths.

| Path | Kind | Body |
|---|---|---|
| `config/app` | doc | `{ pinterestUrl, trashDay, recycleWeek, updatedAt }` |
| `routine/days` | doc | `{ mon:[Task], tue:[Task], …, sun:[Task] }` where `Task = {id, text, min}` |
| `checks/recent` | doc | `{ "YYYY-MM-DD": { "<taskId>": true }, … }` — pruned to 60 days |
| `recipes/<id>` | coll | `Recipe` (below) |
| `plan/current` | doc | `{ "YYYY-Www": { mon:Slot, …, sun:Slot }, … }` — pruned to 8 weeks |
| `grocery/<id>` | coll | `{ name, qty, cat, store, done, src, at }` |
| `jobs/<id>` | coll | `{ title, area, priority, notes, due, done, doneAt, at }` |
| `projects/<id>` | coll | `{ title, category, status, cost, season, next, notes, order, at }` |
| `daily/notes` | doc | `{ "YYYY-MM-DD": { tip } }` — pruned to 14 days |

`Slot = { kind: "recipe"|"text"|"out"|"leftovers", recipeId?, title?, note? }`

`Recipe`:
```js
{
  id, name, emoji,
  source,        // "Marcella Hazan", "Kenzie", "Pinterest" — who it came from
  sourceUrl,     // original link, or "" — always shown as "Open the original"
  time,          // "30 min"
  servings,      // "4"
  tags,          // ["weeknight","kid-friendly","fall","one-pan","slow-cooker"]
  ingredients,   // [{ item, qty, pantry?:true, store?:"Meijer"|"Aldi" }]
  steps,         // ["Brown the beef…", …]  concise, our own words
  notes,         // "" — family notes, e.g. "Addison eats this"
  fav,           // bool
  at             // ISO added
}
```

**Doc-count discipline.** The store caps at 5,000 documents. Anything that
grows per-day is a *field in one document*, never a document per day — that is
why `checks`, `plan` and `daily` are single docs with date keys and a prune.

**Concurrency.** Writes are last-writer-wins with no transactions. Use
`update()` (which merges nested objects recursively) for the date-keyed docs so
two phones ticking different boxes both stick. Never build counters from
read-modify-write.

---

## Copyright rule (inherited from this repo, non-negotiable)

Recipes are **attributed and linked, never reproduced**. Ingredient lists are
functional facts and are fine. Steps must be written concisely in our own
words — never copied from a source. Every recipe that came from a named cook
keeps `source` and `sourceUrl` and the UI always offers "Open the original".

---

## The views

### Today (`10-today.js`)
The page Kenzie opens at 7am. In order:
1. **Header** — day name (serif), full date, and the greeting for the hour.
2. **Sun & season strip** — sunrise/sunset (computed locally by
   `Almanac.sunTimes`, no network), day length, and the season.
3. **Today's cleaning** — the weekday's routine tasks as big checkable rows,
   with a progress meter and a "nice work" state when all are done.
4. **Tonight's dinner** — the slot from this week's plan. Tapping opens the
   recipe sheet. If nothing is planned, a "Pick tonight's dinner" button.
5. **Needs attention** — overdue/soon jobs and any project marked in progress,
   at most four rows, only when non-empty.
6. **Good to know** — a rotating card: what's in season in Michigan this month
   (from `Almanac`), the next birthday, trash day when it's tomorrow, and a
   house tip. Optional "Ask Claude for an idea" button using `sample`.

### Meals (`20-meals.js`)
- Week strip Mon–Sun with the current day marked. Each row shows the slot.
- Tapping a day opens the **plan sheet**: search the recipe box, seasonal
  suggestions, favorites, "eating out", "leftovers", or free text.
- **Fill the week** — auto-assigns from favorites + seasonal + least-recently
  used, keeps Saturday as pizza night, never repeats within the week.
- **Grocery list** built from the week's recipes: grouped by aisle category,
  pantry items excluded, weekly staples (milk ×3, greek yogurt ×5) added,
  checkable, manually extendable, with a two-tap Clear.

### Recipes (`30-recipes.js`)
- Search + tag filter chips + favorites toggle. Cards show emoji, name, time,
  source.
- **Recipe sheet**: name, source line with "Open the original", time/servings,
  ingredients with tick-off, numbered steps, family notes (editable),
  "Add to this week" (choose a day), favorite, edit, delete.
- **Add a recipe** — three doors, and this is the feature that replaces
  Pinterest:
  1. **Paste** — she copies the recipe text off any blog or pin and pastes it;
     `sample.json` turns it into the `Recipe` shape for review before saving.
     Hide this door entirely when `sample` is `null`.
  2. **Link** — name + URL only, saved as a link card to fill in later.
  3. **By hand** — plain form.
- A "Kenzie's Pinterest board" link from `config/app` sits at the top of the
  add sheet so she can jump out, copy, and come back.

### House (`40-house.js`)
Segmented control: **Cleaning · Jobs · Projects**.

- **Cleaning** — the weekly routine, one panel per weekday, fully editable:
  add/rename/delete tasks, set minutes, reorder. Today's day is expanded.
  This is the configurable part the Today page reads.
- **Jobs** (Chad's list) — quick-add field at the top. Each job: title, area
  chip, priority (`urgent` / `soon` / `someday`), optional due date, notes.
  Sorted urgent-first, overdue flagged in `--tulip`. Done jobs collapse into a
  "Done" section that can be cleared.
- **Projects** — the big stuff. Cards with status chips
  (`idea → planned → in progress → done`), rough cost, best season, and a
  "next step" line. Grouped by status, reorderable.

---

## Core API (`00-core.js`) — what every view module may use

```js
Store.ready                       // Promise<void>, resolves after first load
Store.mode                        // "cloud" | "local"
Store.get(key)                    // "config" | "routine" | "checks" | "plan" | "daily"
Store.setDoc(key, body)           // full replace
Store.mergeDoc(key, patch)        // recursive merge (checks/plan/daily/config)
Store.list(coll)                  // array for "recipes" | "jobs" | "projects" | "grocery"
Store.put(coll, id, body)         // create/replace an item; id null => generated
Store.patch(coll, id, patch)
Store.remove(coll, id)
Store.on(change => …)             // subscribe to any store change; returns unsubscribe

UI.h(tag, props, ...children)     // DOM builder; props: class, text, html, on:{click}, attrs
UI.sheet({ title, body, actions })// bottom sheet / modal; returns { close }
UI.confirm(msg, { danger })       // Promise<bool>, two-tap inline confirm
UI.toast(msg)
UI.icon(name)                     // inline SVG, currentColor

Router.on(route, renderFn)        // "today" | "meals" | "recipes" | "house"
Router.go(route, params)
Router.current()

Fmt.date(d), Fmt.dayKey(d), Fmt.weekKey(d), Fmt.dayName(i), Fmt.money(n)

Almanac.sunTimes(date)            // { sunrise:Date, sunset:Date, dayLength:"13h 42m" }
Almanac.season(date)              // "spring"|"summer"|"fall"|"winter"
Almanac.inSeason(date)            // [ "Sweet corn", "Peaches", … ] Michigan
Almanac.tip(date)                 // a house tip for the day
Almanac.nextBirthday(date)        // { name, date, turning, daysAway }

Ask.available()                   // bool — sample capability resolved
Ask.json(prompt, opts)            // sample.json wrapper with error handling
Ask.text(prompt, opts)
```

Every view module registers itself exactly like this and touches nothing else
global:

```js
Router.on("today", function renderToday(root) { /* fill root */ });
```

`root` is an empty `<div class="view">`; the module owns everything inside it.
Re-render on `Store.on` is handled by the router — a module must be safe to
re-run at any time and must not attach global listeners.

---

## House rules for whoever implements a module

1. **Zero dependencies.** Plain DOM. No frameworks, no CDN scripts.
2. **No new colors.** Every color comes from a token in the table above.
3. **Both themes.** Never a hard-coded hex in a component.
4. Never `innerHTML` with user or db content — build nodes, set `textContent`.
5. Guard every db call: it can reject, and `Store.mode` can be `"local"`.
6. Empty states are designed, not blank: one line of what goes here plus the
   button that puts something there.
7. Write the copy from the family's side of the screen. "Wash the windows",
   not "Task item". Buttons say what happens.
8. `node --check` every file before you call it done.
