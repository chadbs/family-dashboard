# The Solanyk House — the family app

One web app for the whole household. On a phone it has tabs: **Today, Meals,
Recipes, House, Stars**. Stars holds the kids' chore chart (tap a chore, earn
a star, streak bonus every third day) and the reward shop, carried over from
the wall. Recipes imports straight from a link. The grocery list prices every
item at Meijer and ALDI, files it under the cheaper store, and can order the
carts filled. On the wall Surface in the kitchen it opens at
`/display` and becomes the always-on display — clock, backyard weather, and a
slow rotation through the day's cleaning, tonight's dinner, the star jars,
what needs doing, the week ahead. Kenzie's morning note pops on whichever
screen she is looking at.

**It is hosted.** The data and the page live on Deno Deploy (see
[`../cloud/README.md`](../cloud/README.md)), so nothing depends on the Surface
being on. Phones on cellular, the wall, and Chad's PC all read and write the
same copy. There is no sign-in, on purpose.

## The three ways this one page can run

`src/js/00-core.js`'s `Store` picks the first that works:

| Mode | When | Data lives in |
|---|---|---|
| `server` | the page was served by something answering `/api/hub` — **the hosted app** (normal), or `server.js` on the Surface at `/hub` (LAN fallback, redirects to the hosted app once `cloud/endpoint.json` is filled in) | Deno KV, or `data/hub.json` |
| `cloud` | the page is the claude.ai artifact | the artifact's own database |
| `local` | anything else (a file on disk) | that device only |

Same code, same screens. Only the hosted app can show the backyard sensor,
because only it receives the Surface's pushes.

## Build

```bash
node hub/build.js        # src -> dist/hub.html, checked in on purpose
```

`dist/hub.html` is committed because the hosted app serves it straight from
the repo with no build step, and the Surface's server does the same. The
auto-push task ships it; Deno Deploy redeploys on every push.

## Source layout

```
hub/
  SPEC.md        what it is and what each screen does
  CONTRACT.md    the globals the view modules share
  build.js       src -> dist/hub.html
  src/
    index.html   the shell, with {{STYLES}} {{DATA}} {{APP}} markers
    styles.css   the whole design system
    css/*.css    module-local additions, appended in name order
    data/        almanac, love (generated from public/config.js), recipes, seed
    js/          00-core, 05-weather, 10-today, 20-meals, 30-recipes,
                 40-house, 50-rewards, 60-display, 70-love, 99-boot
```

Files are concatenated in name order into one script scope. **No modules, no
npm, no bundler.** The number prefixes are the load order.

`data/love.js` is **generated** from `public/config.js` (`loveMessages`,
`loveNow`, `loveTo`, `loveHour`) so the words stay Chad's, byte for byte. Edit
them in `config.js`, then regenerate with the one-liner in the file header.

## The artifact copy (a spare)

`dist/hub.html` is also published as a claude.ai artifact with
`capabilities: { db: {}, sample: {} }`. It works, but it cannot make network
calls (so no sensor), it needs a claude.ai sign-in, and its data is a separate
copy. The hosted app is the real one. `sample` is what turns pasted recipe text
into a recipe; where unavailable that door is not shown.

## Server API (identical on Deno and on `server.js`)

| Endpoint | What |
|---|---|
| `GET /` (Deno) · `GET /hub` (Surface) | the page |
| `GET /display` | the page, wall mode |
| `GET /api/hub` | the whole state blob |
| `POST /api/hub` | `{ops:[…]}` applied onto current state, per field |
| `GET /api/hub/version` | change token, so phones poll cheaply |
| `GET /api/hub/weather` | the AcuRite sensor (if fresh) plus the forecast |
| `POST /api/sensor` (Deno) | the Surface's reading |

Writes are **ops, not whole-blob saves**, so two phones editing different
things never clobber each other.

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
