# The Solanyk House — the hub you can open anywhere

The wall dashboard lives on the Surface upstairs. This is the other half: the
household running on a phone, from anywhere, for Kenzie and Chad.

| | The wall (`../public/`) | The hub (`hub/`) |
|---|---|---|
| Where it runs | Surface, kiosk, LAN only | the same server, at `/hub`, reachable from anywhere |
| Who it is for | the whole family, all day | Kenzie and Chad |
| What it holds | calendar, kid chores, grocery carts | weather, meals, recipes, cleaning routine, jobs, projects, stars |
| Where state lives | `../data/state.json` | `../data/hub.json` |

Two different files on purpose: the wall and the hub must never be able to
corrupt each other. The hub never reads or writes `../data/state.json` — the
prime directive in the root README still stands.

## How it is served (the important part)

**The hub is served by `server.js` at `/hub`.** That is what makes it work:

- it can reach the **backyard AcuRite sensor**, because it is same-origin with
  the server that owns `data/weather.json`;
- **nobody signs in to anything** — it is a plain web page on a plain URL;
- one copy of the data for the whole family, in `data/hub.json`.

`scripts/setup-tunnel.ps1`, run once on the Surface, puts that server on the
internet through Tailscale Funnel, which gives it a permanent https address
that survives reboots and IP changes. Kenzie opens the link and adds it to her
home screen. **That address is public and has no password** — a deliberate
choice, made because the alternative was a sign-in Kenzie would fight with.

```bash
node hub/build.js        # src -> dist/hub.html; the server serves that file
```

The Surface picks the new build up on its next mirror-pull, and the watchdog
restarts the server when `server.js` itself changes.

## The artifact copy (secondary)

The same `dist/hub.html` is also published as a claude.ai artifact with
`capabilities: { db: {}, sample: {} }`. The store abstraction means one
codebase serves both. Note what differs:

- the artifact **cannot make network calls at all**, so it never shows the
  backyard sensor — only whatever was last written to its `weather/current`
  document;
- it requires a claude.ai sign-in;
- **its data is a separate copy** that will drift from `data/hub.json`.

So the served `/hub` address is the real one. The artifact is a spare.
`sample` is what turns pasted recipe text into a real recipe; where it is
unavailable, that door is simply not shown.

## Server API the hub uses

| Endpoint | What |
|---|---|
| `GET /hub` | the page |
| `GET /api/hub` | the whole state blob |
| `POST /api/hub` | `{ops:[…]}` applied onto what is on disk right now |
| `GET /api/hub/version` | mtime token, so phones poll cheaply |
| `GET /api/hub/weather` | the AcuRite sensor plus the Open-Meteo forecast |

Writes are **ops, not whole-blob saves**, so two phones editing different
things never clobber each other. `data/hub.json` gets the same protection as
`state.json`: hourly rotating backups, a one-deep `.bak`, atomic writes.

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
