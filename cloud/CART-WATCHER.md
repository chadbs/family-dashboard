# The cart watcher — filling Meijer and ALDI carts from the family app

The family app has a **Build my carts** button on the grocery list. Tapping it
writes a request into the app. Something with a real browser signed in as
Kenzie has to turn that request into filled carts — that is this watcher, a
Claude session on Chad's main PC using Claude-in-Chrome, exactly as the old
wall pipeline worked. The only thing that moved is *where the request lives*:
the hosted app instead of the Surface.

Run this from a Claude session on the main PC (a session cron at 7:12am and
5:12pm is the usual rhythm). It is session-scoped: re-create it in each new
session.

## The request

`GET https://solanyk-house.chadbs.deno.net/api/hub` → `docs.cart`:

```json
{
  "status": "pending",            // pending | building | done | error
  "requestedAt": "2026-09-02T…",
  "week": "2026-W36",
  "items": [ { "name": "Chicken thighs", "qty": "2 lb", "store": "Meijer", "pref": "" } ],
  "dinners": [ "BBQ chicken", "Chili" ],
  "summary": "",                  // set by the watcher
  "links": { "meijer": "", "aldi": "" }   // set by the watcher when done
}
```

Update it with an op:

```
POST https://solanyk-house.chadbs.deno.net/api/hub
{ "ops": [ { "type": "doc", "key": "cart", "mode": "merge",
             "body": { "status": "building", "startedAt": "<now>" } } ] }
```

## The prompt (paste into the session cron)

> Check `https://solanyk-house.chadbs.deno.net/api/hub`. If `docs.cart.status`
> is not `"pending"`, stop. Otherwise merge `status: "building"` into
> `docs.cart`, then fill the carts with Claude-in-Chrome:
>
> **Meijer** (meijer.com, Hudsonville pickup): for each item with
> `store: "Meijer"`, search it, add the store-brand or the family's `pref`
> product, and **verify the cart badge incremented after every add** — on
> meijer.com ref-based clicks do not register, click by coordinate. Set
> quantities above 1 on the cart page stepper.
>
> **ALDI** (new.aldi.us, works signed-out: reject cookies, confirm the
> shop-method dialog): same for items with `store: "Aldi"`.
>
> Never check out. Never touch passwords, payment, or addresses. Carts only;
> checkout is always a human.
>
> When done, merge into `docs.cart`: `status: "done"`, `summary` like
> "16 Meijer items ≈ $74, 3 ALDI ≈ $9", and `links: {meijer: "<cart url>",
> aldi: "<cart url>"}`. The app shows the links on Kenzie's phone. On a
> failure, merge `status: "error"` with a one-line `summary` and stop.

## Notes carried over from the old pipeline

- Kenzie's one-time sign-ins on the main PC's Chrome (meijer.com and
  aldi.us) are what make the links open *her* cart on her phone. Until then
  they are guest carts.
- Prices and deals come from the nightly sweep in `public/prices.json`; the
  app already files each item under the cheaper store.
