"use strict";
/* ============================================================================
   Get a Google "master token" for the grocery -> Keep button, in pure Node
   (no Python needed).

   HOW TO USE (do this once, on this PC):
     1) In Chrome, open:  https://accounts.google.com/EmbeddedSetup
        Sign in as the account whose Keep should receive the list (Kenzie's,
        or a shared one). Accept the terms if prompted.
     2) Open DevTools (F12) -> Application -> Cookies -> https://accounts.google.com
        Copy the value of the cookie named  oauth_token  (starts with "oauth2_4/").
     3) Run:
          node scripts/keep-token.js  her@gmail.com  oauth2_4/....(the value)....
        It prints a master token (starts with "aas_et/").
     4) Put these into data/secrets.json:
          "gkeepEmail": "her@gmail.com",
          "gkeepMasterToken": "aas_et/....",
          "keepListTitle": "Groceries"
        Then restart the server. The 📝 Send to Keep button will work.

   The master token is long-lived; the oauth_token is single-use, so if step 3
   fails, grab a fresh oauth_token (repeat step 1-2).
   ========================================================================== */

const { exchangeOAuthToken } = require("./keep-client.js");

(async () => {
  const [email, oauthToken] = process.argv.slice(2);
  if (!email || !oauthToken) {
    console.error("Usage: node scripts/keep-token.js <email> <oauth_token>");
    console.error("(oauth_token is the cookie from https://accounts.google.com/EmbeddedSetup — see the top of this file)");
    process.exit(1);
  }
  try {
    const master = await exchangeOAuthToken(email, oauthToken);
    console.log("\n  Master token (put this in data/secrets.json as gkeepMasterToken):\n");
    console.log("  " + master + "\n");
  } catch (e) {
    console.error("\n  Couldn't get a master token: " + ((e && e.message) || e));
    console.error("  Most common cause: the oauth_token was already used or expired — grab a fresh one and retry.\n");
    process.exit(1);
  }
})();
