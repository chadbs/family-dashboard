# The Solanyk House — the hub you can open anywhere

The wall dashboard lives on the Surface upstairs. This is the other half: the
household running on a phone, from anywhere, for Kenzie and Chad.

| | The wall (`../public/`) | The hub (`hub/`) |
|---|---|---|
| Where it runs | Surface, kiosk, LAN only | claude.ai artifact, any phone or browser |
| Who it is for | the whole family, all day | Kenzie and Chad |
| What it holds | weather, calendar, kid chores, stars, grocery carts | meals, recipes, cleaning routine, jobs, projects |
| Where state lives | `../data/state.json` on the Surface | the artifact's own shared database |

They are separate on purpose. The hub never reads or writes
`../data/state.json` — the prime directive in the root README still stands.

## Build and publish

```bash
node hub/build.js
```

That concatenates `hub/src/` into `hub/dist/hub.html`. Publish it with the
Artifact tool:

```
capabilities: { db: {}, sample: {} }
```

`db` gives every device the same data, live. `sample` is what turns a pasted
block of recipe text into a real recipe. Both degrade: with no `db` the app
runs on that device's own storage, and with no `sample` the paste-import door
simply is not shown.

Redeploying to the same artifact URL keeps the data — the store belongs to the
artifact, not to a version of the page.

## Source layout

```
hub/
  SPEC.md        what it is and what each screen does
  CONTRACT.md    the globals the view modules share
  build.js       src -> dist/hub.html
  src/
    index.html   the shell, with {{STYLES}} {{DATA}} {{APP}} markers
    styles.css   the whole design system
    css/*.css    small module-local additions, appended in name order
    data/        almanac.js, recipes.js, seed.js  (the starting content)
    js/          00-core, 10-today, 20-meals, 30-recipes, 40-house, 99-boot
```

Files are concatenated in name order into one script scope. **No modules, no
npm, no bundler** — the same zero-dependency rule as the rest of this repo.
The number prefixes are the load order, so leave room between them.

## The data store

One document store per artifact, shared by everyone who can open it.

| Path | Kind | Holds |
|---|---|---|
| `config/app` | doc | Pinterest board link, trash day |
| `routine/days` | doc | the weekly cleaning routine, keyed `mon`…`sun` |
| `checks/recent` | doc | which cleaning tasks got done, keyed by date, kept 60 days |
| `recipes/<id>` | collection | the recipe box |
| `plan/current` | doc | dinners, keyed by ISO week then weekday, kept 8 weeks |
| `grocery/<id>` | collection | the shopping list |
| `jobs/<id>` | collection | Chad's list |
| `projects/<id>` | collection | the big list |
| `daily/notes` | doc | the day's generated suggestion, kept 14 days |

**Anything that grows per day is a field in one document, never a document per
day.** The store caps at 5,000 documents and `99-boot.js` prunes the
date-keyed ones on every start.

Writes are last-writer-wins with no transactions, so the date-keyed documents
are written with `Store.mergeDoc`, which merges recursively — two phones
ticking different boxes both stick.

The first device to open a fresh artifact seeds it from `src/data/`, holding a
short lease so two phones opening at once do not both write.

## Conventions

1. Zero dependencies. Plain DOM. No frameworks, no CDN scripts.
2. Every colour comes from a token in `styles.css`. Never a hex literal in a
   component, or one of the two themes breaks.
3. Never `innerHTML` with stored or pasted content. Build nodes, set `text`.
4. Render functions never write to the store. Handlers write; the store emits;
   the router repaints.
5. A text input that must survive a repaint carries `data-keep="<id>"`.
6. Recipes are attributed and linked, never reproduced. Steps are written in
   our own words. This matches the rule the wall dashboard already follows.
7. `node --check` every file, then `node build.js`, before publishing.
