"use strict";
/* ============================================================================
   Minimal, ZERO-DEPENDENCY Google Keep client — just enough to push a grocery
   checklist to Keep (which then syncs to Kenzie's phone).

   Google has no official consumer Keep API, so this speaks the same unofficial
   endpoints the community libraries (gkeepapi / gpsoauth) use:
     1) exchangeOAuthToken  — a one-time browser "oauth_token" -> a master token
     2) getAccessToken      — master token -> short-lived OAuth access token
     3) createGroceryList   — POST a new checklist note to Keep's sync endpoint

   Setup + how to get the tokens: see scripts/KEEP-SETUP.md.
   NOTE: unofficial API — verify end-to-end once a real token is in place.
   ========================================================================== */

const https = require("https");
const crypto = require("crypto");

const ANDROID_ID = "0123456789abcdef";   // any stable device id works

function form(params) {
  return Object.entries(params)
    .map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&");
}
function post(url, { headers = {}, body = "" }) {
  return new Promise((resolve, reject) => {
    const req = https.request(new URL(url), { method: "POST", headers }, (res) => {
      let data = ""; res.on("data", d => (data += d));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.setTimeout(20000, () => req.destroy(new Error("request timed out")));
    if (body) req.write(body);
    req.end();
  });
}
function parseKV(text) {
  const map = {};
  text.split("\n").forEach(line => { const i = line.indexOf("="); if (i > 0) map[line.slice(0, i)] = line.slice(i + 1); });
  return map;
}

// One-time: exchange the browser "oauth_token" (oauth2_4/...) for a durable
// master token (aas_et/...). Run this once via scripts/keep-token.js.
async function exchangeOAuthToken(email, oauthToken) {
  const r = await post("https://android.clients.google.com/auth", {
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "GoogleAuth/1.4" },
    body: form({
      accountType: "HOSTED_OR_GOOGLE", Email: email, has_permission: 1, add_account: 1,
      Token: oauthToken, service: "ac2dm", source: "android", androidId: ANDROID_ID,
      device_country: "us", operatorCountry: "us", lang: "en", sdk_version: "17",
    }),
  });
  const map = parseKV(r.body);
  if (!map.Token) throw new Error(map.Error ? `token exchange failed: ${map.Error}` : "token exchange failed (check the oauth_token)");
  return map.Token;
}

// master token -> short-lived OAuth access token scoped for Keep.
async function getAccessToken(email, masterToken) {
  const r = await post("https://android.clients.google.com/auth", {
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "GoogleAuth/1.4" },
    body: form({
      accountType: "HOSTED_OR_GOOGLE", Email: email, has_permission: 1, EncryptedPasswd: masterToken,
      service: "oauth2:https://www.googleapis.com/auth/memento https://www.googleapis.com/auth/reminders",
      source: "android", androidId: ANDROID_ID, app: "com.google.android.keep",
      client_sig: "38918a453d07199354f8b19af05ec6562ced5788",
      device_country: "us", operatorCountry: "us", lang: "en", sdk_version: "17",
    }),
  });
  const map = parseKV(r.body);
  if (!map.Auth) throw new Error(map.Error ? `auth failed: ${map.Error}` : "auth failed (is the master token still valid?)");
  return map.Auth;
}

// Create a brand-new checklist note titled `title` with `items` (all unchecked).
async function createGroceryList(accessToken, title, items) {
  const now = new Date().toISOString().replace("Z", "000Z");   // microsecond precision
  const ts = { kind: "notes#timestamps", created: now, updated: now, userEdited: now };
  const nodeSettings = { kind: "notes#nodeSettings", newListItemPlacement: "BOTTOM", graveyardState: "EXPANDED", checkedListItemsPolicy: "GRAVEYARD" };
  const annotationsGroup = { kind: "notes#annotationsGroup" };
  const listId = crypto.randomUUID();

  const nodes = [{
    id: listId, kind: "notes#node", type: "LIST", parentId: "root",
    sortValue: "10000000", title, text: "", color: "DEFAULT",
    isArchived: false, isPinned: false, labelIds: [], timestamps: ts, nodeSettings, annotationsGroup,
  }];
  items.forEach((text, i) => {
    nodes.push({
      id: crypto.randomUUID(), kind: "notes#node", type: "LIST_ITEM",
      parentId: listId, superListItemId: null, sortValue: String((items.length - i) * 1000000),
      text: String(text), checked: false, timestamps: ts, nodeSettings, annotationsGroup,
    });
  });

  const payload = {
    nodes,
    clientTimestamp: now,
    requestHeader: {
      clientSessionId: "s--" + Date.now() + "--" + Math.floor(Math.random() * 1e9),
      clientPlatform: "ANDROID",
      clientVersion: { major: "9", minor: "9", build: "9", revision: "9" },
      capabilities: ["NC", "PI", "EI", "IN", "SH", "DR", "TR", "IT", "EX", "MI", "CO"].map(type => ({ type })),
    },
  };
  const r = await post("https://www.googleapis.com/notes/v1/changes", {
    headers: { "Content-Type": "application/json", "Authorization": "OAuth " + accessToken },
    body: JSON.stringify(payload),
  });
  if (r.status !== 200) throw new Error(`Keep API ${r.status}: ${r.body.slice(0, 240)}`);
  return true;
}

module.exports = { exchangeOAuthToken, getAccessToken, createGroceryList };
