# 📝 Send grocery list to Google Keep — setup

The **📝 Send to Keep** button on the Grocery tab pushes the to-buy items into a
Google Keep checklist, which then syncs to Kenzie's phone (the Keep app).

Google has **no official consumer Keep API**, so this uses the same unofficial
endpoints the community libraries use. It needs a one-time **master token** for
the Google account whose Keep should receive the list.

The push runs through the battle-tested **`gkeepapi`** Python library when it's
available (recommended — most reliable), and falls back to a pure-Node client
if Python isn't installed.

## One-time setup

**Step 0 (recommended): install the Python helper**
```
pip install gkeepapi
```
Make sure `python` runs from the command line (install from python.org and tick
"Add Python to PATH"). If you skip this, the Node fallback is used automatically
— but the Python path is more reliable.

Do this on the machine that **runs the dashboard server** (the Surface, or this
PC while testing). It's easiest to use the account you want the list to land in
(Kenzie's), or a Google account you both share.

1. **Get an `oauth_token`:**
   - In Chrome, open **https://accounts.google.com/EmbeddedSetup**
   - Sign in as the target account. Accept the terms if it asks (click "I agree").
   - Open DevTools (**F12**) → **Application** tab → **Cookies** →
     `https://accounts.google.com`
   - Find the cookie named **`oauth_token`** and copy its value
     (it starts with `oauth2_4/`).

2. **Turn it into a master token** (run in the project folder):
   ```
   node scripts/keep-token.js  kenzie@gmail.com  oauth2_4/....paste-the-value....
   ```
   It prints a **master token** starting with `aas_et/`.
   (The `oauth_token` is single-use — if it errors, grab a fresh one from step 1.)

3. **Put it in `data/secrets.json`** (create it from `data/secrets.example.json`
   if you haven't):
   ```json
   {
     "gkeepEmail": "kenzie@gmail.com",
     "gkeepMasterToken": "aas_et/....",
     "keepListTitle": "Groceries"
   }
   ```

4. **Restart the server.** Now the 📝 Send to Keep button creates a
   `Groceries — <date>` checklist in that account's Keep, which shows up on the
   phone within seconds.

## Notes
- `data/secrets.json` is **gitignored** — the token never leaves the machine.
- The master token is long-lived. If Keep ever stops working, it may have been
  revoked (e.g. password change) — just redo the steps for a fresh one.
- Because this is an unofficial API, it can change. If it becomes unreliable,
  the fallback is **Google Tasks** (official API) or the existing 📧 email
  button — ask Claude to switch it over.
