# The hosted family app (`cloud/`)

This is the always-on copy of The Solanyk House. It holds the family's data
and serves the app to every screen: phones anywhere, and the wall Surface,
which opens `/display` and becomes the always-on kitchen display.

The Surface is **no longer the source of truth for anything**. It loses power
and sleeps at night; the app lives here instead, and the Surface is just one
more client that also happens to push the backyard sensor reading up when it
is awake.

```
                   ┌──────────────────────────────┐
  Kenzie's phone ─►│  Deno Deploy                 │◄─ Chad's phone
  (cell or wifi)   │  cloud/main.ts + Deno KV     │
                   │  https://<name>.deno.dev     │
                   └──────────────┬───────────────┘
                        /display  │  ▲ POST /api/sensor every 5 min
                                  ▼  │
                   ┌──────────────────────────────┐
                   │  Surface (wall, kiosk)        │
                   │  rtl_433 → weather-bridge     │
                   │  → data/weather.json          │
                   └──────────────────────────────┘
```

## Deploy it (one time, about two minutes)

The one step I could not do for you is the sign-in. Everything else is ready.

1. Go to **https://dash.deno.com** and click **Sign in with GitHub**. Use the
   same GitHub account that owns `chadbs/family-dashboard`.
2. **New Project** → **Deploy from GitHub repository**.
3. Pick **`chadbs/family-dashboard`** (it is private — the GitHub app will ask
   to be installed on it; allow that one repo).
4. Branch **`main`**. Entry point **`cloud/main.ts`**. Leave the build step
   empty — there is nothing to build; the app is already built into
   `hub/dist/hub.html` and checked in.
5. Give the project a name. That name is the address, so pick a nice one:
   `solanyk-house` gives **https://solanyk-house.deno.dev**.
6. Click **Deploy**.

That is it. From then on **every push to `main` redeploys automatically** —
and this repo already pushes itself every 10 minutes from Chad's PC, so
editing the app and shipping it are the same act.

## After the first deploy

1. Open the address. The app seeds itself with the starting recipes, routine,
   jobs, projects and stars on the first visit.
2. Put the address in **`cloud/endpoint.json`** on Chad's PC and let it push:
   ```json
   { "url": "https://solanyk-house.deno.dev" }
   ```
   That one file tells the Surface where to push the sensor and where to
   point the wall. `server.js` also starts redirecting its old `/hub` there,
   so there is only ever one copy of the data.
3. On the **Surface**, once, as the wall user:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\setup-sensor-push.ps1
   ```
   It sends one reading as a test, then registers a task to send one every
   five minutes. The watchdog will relaunch the kiosk browser pointed at
   `<address>/display` the next time it restarts it.
4. On Kenzie's iPhone: open the address in Safari, tap Share, then **Add to
   Home Screen**. It installs like an app — its own icon, full screen, no
   browser bars — and opens straight to Today.

## What the server does

| Route | What |
|---|---|
| `GET /` | the app |
| `GET /display` | the app, in always-on wall mode |
| `GET /api/hub` | the whole state |
| `POST /api/hub` | `{ops:[…]}` applied onto current state, per field |
| `GET /api/hub/version` | change token, so phones poll cheaply |
| `GET /api/hub/weather` | backyard sensor (if fresh) + Open-Meteo forecast (cached 10 min) |
| `POST /api/sensor` | the Surface's AcuRite reading |
| `GET /api/prices` | Meijer vs ALDI prices from `public/prices.json` (the nightly sweep; every push carries the latest) |
| `POST /api/import` | `{url}` → the recipe on that page (schema.org Recipe block: name, photo, ingredients, steps, time, servings, author). Follows a Pinterest pin to its blog when it can. |
| `GET /manifest.webmanifest` | so phones install it as an app |

## Getting Kenzie's Pinterest recipes in

Recipes → **Add a recipe** → **From a link**. Paste the blog link a pin points
to (or the pin's own link; the server follows it to the blog when Pinterest
lets it). The recipe comes back clean — photo, ingredients, steps, time — into
a review form, and one tap saves it. No ads, no scrolling, and the original is
always one tap away from the recipe. A whole board is just that, one pin at a
time, at her pace.

## The cart order

Grocery list → **Build my carts**. That writes `docs.cart` with the items
routed to the cheaper store. A Claude session on Chad's PC (see
`CART-WATCHER.md`) picks it up at 7:12am and 5:12pm, fills the Meijer and ALDI
carts with Claude-in-Chrome, and writes the cart links back — they show up on
the grocery tab as two buttons. Never checks out.

Storage is **Deno KV**: one key per document and per item, strongly
consistent, so an edit on one phone is visible to the other on its next poll
(every 5 seconds, plus immediately when a phone wakes up).

A sensor reading counts as "now" for 90 minutes. After that the card falls
back to the forecast and says "Hudsonville" instead of "Backyard", so the
Surface being asleep never shows yesterday's temperature as today's.

## There is no login

Anyone with the address can read and change everything. That is the family's
explicit choice, made so Kenzie never fights a sign-in. Do not put anything
secret in this app, and do not post the address anywhere public.

## Data safety

Deno KV is durable and replicated; there is no file to lose. If you ever want
a copy on disk, `GET /api/hub` returns the whole state as JSON — save it
anywhere. To restore, POST it back as ops (a small script; ask Claude).

## Running it locally (for development)

```
HOUSE_KV_PATH=/tmp/house.kv deno run -A --unstable-kv cloud/main.ts   # http://localhost:8000
```

`HOUSE_KV_PATH` points the database at a throwaway file; without it Deno
uses its own default local store. Deno is installed on Chad's PC via winget.
The server caches `hub/dist/hub.html` in memory — restart it after
`node hub/build.js`.
