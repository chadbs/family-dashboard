# Family Dashboard

A zero-dependency Node.js **family wall dashboard** running full-screen in Chrome
kiosk on a wall-mounted Surface Laptop 3. It replaced a Skylight Calendar and
grew into the family's home hub: live backyard weather, the week's calendar,
a chore chart with a star economy for the kids, meal planning with real recipes
from great cooks, and a grocery flow that ends with **filled Meijer + ALDI carts
and the links emailed to Kenzie's phone**.

**The goal:** everything hands-off. Kenzie (mom) plans dinners and taps one
button on the wall; the kids (Addison 4, Sophie 2) tap chores and earn stars;
Chad (dad) never has to babysit any of it. Agents maintain and improve the
dashboard by pushing to this repo — the wall updates itself.

> **New thread / new model? Read this file, then [SURFACE.md](SURFACE.md).**
> Deeper history lives in the Claude project memory on the main PC
> (`~/.claude/projects/...weather-dashboard/memory/`).

---

## The two machines

```
 MAIN PC (edit machine — agents work here)          SURFACE (the wall — display only)
 ┌─────────────────────────────────────┐            ┌─────────────────────────────────────┐
 │ • Claude Code edits + pushes        │   GitHub   │ • git mirror-pulls every minute     │
 │ • auto-push task (every 10 min)     │ ─────────► │ • watchdog restarts server on code  │
 │ • cart-build watcher (cron 2x/day)  │            │   change; relaunches kiosk browser  │
 │ • Claude-in-Chrome fills carts      │            │ • rtl_433 + weather-bridge (AcuRite)│
 │                                     │ ◄────LAN── │ • serves :8080 to phones on WiFi    │
 └─────────────────────────────────────┘            └─────────────────────────────────────┘
```

- **Main PC** = where code is edited. An auto-push scheduled task
  (`FamilyDashboard-AutoPush`, every 10 min) commits + pushes anything changed —
  so *working-tree edits ship themselves*; don't be surprised when your commit
  says "nothing to commit."
- **Surface** = a mirror. It never edits code. `scripts/auto-update.bat` does
  `fetch` + `reset --hard origin/main` every minute (never `pull --rebase` — a
  stray local commit once wedged it forever). `scripts/ensure-running.ps1`
  (watchdog, every 2 min) restarts the Node server when its source is newer
  than the process and relaunches the kiosk browser if it died.
- **Surface address:** hostname `DESKTOP-314A4VU` (`.home.local`) on port 8080.
  Its DHCP IP churns (.189 → .161 → …) — resolve by hostname, or sweep
  `192.168.1.x:8080/api/version`.

## ⚠️ The prime directive: STATE IS SACRED

Code is git-tracked. **Family state is not, ever:** `data/state.json` (chores,
stars, grocery, meal plans, cart requests), `data/photos/`, `data/backups/`,
`data/secrets.json` (Gmail creds), `data/weather.json`, `data/prices.json`,
`data/recipe-picks.json`. All gitignored. Never commit them, never delete them,
**never run `git clean` anywhere**. The server defends itself too: POST
/api/state rejects non-objects, keeps rotating hourly backups in
`data/backups/` + a one-deep `.bak`, and writes atomically (tmp + rename).

---

## What's on the wall (tabs)

| Tab | What it does |
|-----|--------------|
| **Home** | Weather hero (live backyard sensor + 7-day Open-Meteo forecast), this-week calendar strip, chores, star jars. Family photo reel behind glass cards. Weather-reactive background. |
| **Calendar** | Month grid; tap a day to add, tap an event to edit. Google Calendar (secret iCal URL, proxied by the server). Birthday/holiday banners. |
| **Rewards** | One currency: 1 chore = 1 ⭐ (streak bonus every 3 days, kindness = 1⭐). Shop: candy 3⭐ … ice cream 7⭐ … park trip 10⭐. No PIN. |
| **Chores** | Weekly chart with per-kid emoji chores, editable on the touchscreen. |
| **Meals** | Kenzie sets how many home dinners; "✨ Plan my week" auto-fills from **real attributed recipes** (weekly Claude web-search by season/weather, cached in `data/recipe-picks.json`) + curated classics in config. Shopping list builds from the plan (+ weekly staples: milk ×3, yogurt ×5) with "already have it" toggles, prices, and deal badges. **🛒 Build my carts** queues the order. **Clear week** two-tap button. |
| **Grocery** | Family list grouped by store; add an item and it's auto-priced (Meijer vs ALDI) and filed under the cheaper store. Send to Google Keep / email. Deal links (Meijer weekly ad, mPerks, ALDI ad). **Clear list** two-tap button. |

**Store routing** for any item: explicit family pref (✎) → *cheaper store when
both prices known* → recipe default → Meijer.

## The cart pipeline (the crown jewel)

```
Wall: Kenzie taps 🛒 Build my carts
  └► state.cartRequest = {status:"pending", items:[{name,qty,store,pref}], dinners[]}
       └► MAIN PC watcher (cron 7:12a & 5:12p) polls the wall over LAN
            └► flips status→"building" (wall shows live status line)
            └► Claude-in-Chrome fills meijer.com (Hudsonville pickup) + new.aldi.us carts
            │    • search each item, add store-brand/pref product, verify cart badge
            │    • NEVER checks out, NEVER touches passwords/payment
            └► flips status→"done" + summary
                 └► the WALL emails the cart links to Kenzie (sendCartReadyEmail
                     in server.js → secrets.cartTo || secrets.groceryTo)
                      └► she taps the link on her iPhone → her signed-in cart
```

Hard-won browser lessons (in the watcher prompt + memory): on meijer.com,
ref-based clicks don't register — **click by coordinate and verify the cart
badge increments** after every add; set qty>1 on the cart page stepper.
new.aldi.us works signed-out (reject cookies, confirm shop-method dialog).

## The automation fleet

| Automation | Runs where | Schedule | Registered how |
|---|---|---|---|
| Auto-push (commits edits) | Main PC | every 10 min | Task Scheduler `FamilyDashboard-AutoPush` |
| Mirror-pull code | Surface | every 1 min | Task Scheduler `FamilyDashboard-AutoUpdate` |
| Watchdog (server/bridge/kiosk alive, restart on code change) | Surface | every 2 min + at logon | Task Scheduler `FamilyDashboard-Watchdog` |
| Daily caretaker (small verified improvements, pushes to main) | Cloud (claude.ai routine) | ~9:07 UTC daily | trigger `trig_01LqELcTrefe15UTNatyRuLx` |
| Nightly price sweep (Meijer vs ALDI + deals → commits `public/prices.json`) | Cloud (claude.ai routine) | 09:23 UTC (≈5:23am ET) daily | trigger `trig_01APN8F5TfzCCSeHeUhvepp4` |
| Cart-build watcher | Main PC Claude session | 7:12am & 5:12pm | **session-only cron** — must be re-created in each new Claude session (prompt lives in project memory + chat history ~2026-07-08) |

Prices flow: cloud sweep commits `public/prices.json` (tracked → reaches the
wall via the mirror) + on-demand lookups land in `data/prices.json` (local);
`/api/prices` merges both, newest per item wins.

## Server API (server.js, zero dependencies)

| Endpoint | What |
|---|---|
| `GET/POST /api/state` | The one state blob. POST is validated + backed up + atomic; flipping `cartRequest.status` to `"done"` triggers the cart-links email. |
| `GET /api/weather` | Latest AcuRite reading (via rtl_433 + `scripts/weather-bridge.js`). |
| `GET /api/calendar` | Proxied Google Calendar iCal. |
| `GET /api/version` | mtime token — the page polls it and reloads itself on deploys. |
| `GET /api/photos` | Photo reel manifest from `data/photos/`. |
| `GET /api/recipe-picks` | This week's real-recipe picks (Claude web-search, cached weekly, `?refresh=1` loopback-only). |
| `GET /api/meal-ideas` | Seasonal dinner ideas (Claude). |
| `GET /api/prices` | Merged price map (see above). |
| `GET /api/price-item?item=X` | Live Meijer/ALDI price lookup (Claude web-search, 7-day cache, loopback-only). |
| `POST /api/share-grocery` | Emails the grocery list (Gmail SMTP, creds in `data/secrets.json`). |
| `POST /api/keep-grocery` | Pushes the list to Google Keep (python `gkeepapi`, Node fallback). |

## File map

| Path | What |
|---|---|
| `server.js` | Everything server-side. Plain Node, no npm. |
| `public/config.js` | **Family settings**: people, chores, rewards, meals (staples/recipes/pantry/deal links), calendar URL, location (Hudsonville MI). |
| `public/app.js` / `index.html` / `styles.css` | The app. Glass skin via `html[data-skin="glass"]`. |
| `public/prices.json` | Nightly price sweep output (tracked on purpose). |
| `SURFACE.md` | Instructions for Claude running ON the Surface. Hard rules + the one repair command. |
| `scripts/setup-surface.ps1` | **One idempotent command** that makes the Surface fully self-sufficient (repo repair, never-sleep, firewall :8080, both tasks, start everything). |
| `scripts/ensure-running.ps1` / `auto-update.bat` / `*-hidden.vbs` | The Surface self-healing trio. |
| `scripts/weather-bridge.js` | rtl_433 → `data/weather.json`. |
| `scripts/keep_push.py` / `keep-client.js` | Google Keep integration. |
| `data/` | **Untracked family state. Do not touch.** |

## Conventions (read before changing anything)

1. **Zero dependencies.** Plain HTML/CSS/JS + Node stdlib. No npm, ever.
2. **Never touch `data/`** (see prime directive).
3. **The auto-push will race you** — it commits every 10 min. Check
   `git log origin/main` before assuming your change didn't ship.
4. **PowerShell scripts must stay pure ASCII.** PS 5.1 misreads UTF-8-no-BOM;
   an em dash becomes a smart quote that closes strings early (this happened;
   it was nasty to find).
5. **Verify before push**: `node --check` every JS file; the caretaker routine
   and this repo's history both enforce "if unsure, ship nothing."
6. **Kid-friendly, glassy, beautiful.** The family looks at this all day.
   Recipes are attributed links, never reproduced content.
7. Cart agent hard rules: **fill carts only** — no checkout, no credentials,
   no payment info, ever. Checkout is always human.

## Current status & known gaps (2026-07-12)

- ✅ First real end-to-end cart build succeeded 2026-07-08 (16 Meijer items
  ~$74 + 2 ALDI ~$7 from Kenzie's wall tap).
- ⚠️ **Surface scheduled tasks aren't firing** — the server runs from an old
  boot-start and isn't picking up new code (e.g. the cart-email hook in
  `f5eb42d`). Fix: run `scripts/setup-surface.ps1` on the Surface once, as the
  wall user (admin for the firewall rule), or tell the Surface's Claude:
  *"Read SURFACE.md and follow it."*
- ⚠️ **Kenzie's one-time sign-ins pending**: meijer.com + aldi.us in the main
  PC's Chrome (so carts fill under her account) and once on her iPhone (so the
  emailed links open her live cart). Until then carts are guest carts on the
  main PC's Chrome.
- ⚠️ The cart-build watcher is session-scoped: if no Claude session is open on
  the main PC, wall cart requests wait as "pending" until one is.
- 💡 Backlog ideas from past sessions: myQ garage control, Nvidia Shield
  power, custom messages to Kenzie, Google Photos sync for the photo reel.
