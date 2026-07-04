/* ============================================================================
   Family Weather Dashboard — local server
   ----------------------------------------------------------------------------
   Zero dependencies. Runs on plain Node.js (no npm install needed).
   Start it with:   node server.js
   Then open:       http://localhost:8080   (or the Surface's IP from any device)

   What it does:
     • Serves the dashboard (the /public folder)
     • GET  /api/state    -> returns the saved state (chores, settings)
     • POST /api/state    -> saves state to data/state.json   <-- PERSISTENT
     • GET  /api/weather  -> returns the latest reading from your AcuRite sensor

   IMPORTANT: the dashboard CODE lives in /public (synced from GitHub).
   Your STATE lives in /data/state.json, which is NOT in git, so updating the
   code never touches your chore checkmarks. That's the whole trick.
   ========================================================================== */

const http = require("http");
const fs   = require("fs");
const path = require("path");

const PORT      = process.env.PORT || 8080;
const ROOT      = __dirname;
const PUBLIC    = path.join(ROOT, "public");
const DATA_DIR  = path.join(ROOT, "data");
const STATE     = path.join(DATA_DIR, "state.json");
const WEATHER   = path.join(DATA_DIR, "weather.json");
const SECRETS   = path.join(DATA_DIR, "secrets.json");   // gitignored: Gmail creds etc.
const PHOTOS    = path.join(DATA_DIR, "photos");          // gitignored: family photos for the reel

// Make sure the data + photos folders exist.
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PHOTOS)) fs.mkdirSync(PHOTOS, { recursive: true });

// Seed state.json from the example the first time only (never overwrites).
if (!fs.existsSync(STATE)) {
  const seed = path.join(DATA_DIR, "state.example.json");
  const initial = fs.existsSync(seed) ? fs.readFileSync(seed, "utf8") : "{}";
  fs.writeFileSync(STATE, initial);
}

// ---- State backups: a rotating safety net so family data is never lost ----
// Before a save overwrites state.json, snapshot the CURRENT file into
// data/backups/ (at most once an hour), keeping the newest 30. If anything
// ever wipes the live state, the last-known-good copies are right there.
const BACKUPS = path.join(DATA_DIR, "backups");
let lastBackupHour = null;
function backupState() {
  try {
    if (!fs.existsSync(STATE)) return;
    const now = new Date();
    const hourKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}`;
    if (lastBackupHour === hourKey) return;               // at most one per hour
    if (!fs.existsSync(BACKUPS)) fs.mkdirSync(BACKUPS, { recursive: true });
    const dest = path.join(BACKUPS, `state-${hourKey}.json`);
    if (!fs.existsSync(dest)) fs.copyFileSync(STATE, dest);
    lastBackupHour = hourKey;
    // prune: keep only the newest 30 snapshots
    const files = fs.readdirSync(BACKUPS).filter(f => /^state-.*\.json$/.test(f)).sort();
    while (files.length > 30) fs.unlinkSync(path.join(BACKUPS, files.shift()));
  } catch { /* a failed backup must never block a save */ }
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif":  "image/gif",
  ".ico":  "image/x-icon",
  ".woff2":"font/woff2",
};

function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}

// Fetch a URL as text, following redirects (Google's iCal feed redirects).
function fetchText(target, depth = 0) {
  return new Promise((resolve, reject) => {
    if (depth > 5) return reject(new Error("too many redirects"));
    const https = require("https");
    const req2 = https.get(target, { timeout: 10000 }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        r.resume();
        return resolve(fetchText(new URL(r.headers.location, target).toString(), depth + 1));
      }
      if (r.statusCode !== 200) { r.resume(); return reject(new Error("HTTP " + r.statusCode)); }
      let data = "";
      r.setEncoding("utf8");
      r.on("data", (c) => { data += c; if (data.length > 5_000_000) req2.destroy(); });
      r.on("end", () => resolve(data));
    });
    req2.on("timeout", () => req2.destroy(new Error("timeout")));
    req2.on("error", reject);
  });
}

// iCal parser -> upcoming events for the next 14 days.
// Handles plain VEVENTs *and* recurring ones (RRULE), which families rely on:
// FREQ=DAILY/WEEKLY/MONTHLY/YEARLY with INTERVAL, BYDAY, UNTIL, COUNT, plus EXDATE.
const HORIZON_DAYS = 14;

function parseICS(ics) {
  // unfold folded lines (continuation lines start with space or tab)
  const lines = ics.replace(/\r\n/g, "\n").split("\n");
  const unfolded = [];
  for (const ln of lines) {
    if ((ln.startsWith(" ") || ln.startsWith("\t")) && unfolded.length) unfolded[unfolded.length - 1] += ln.slice(1);
    else unfolded.push(ln);
  }

  const events = [];
  let cur = null;
  for (const ln of unfolded) {
    if (ln === "BEGIN:VEVENT") { cur = { exdates: [] }; continue; }
    if (ln === "END:VEVENT") {
      if (cur && cur.title && cur.dtstart) events.push(cur);
      cur = null; continue;
    }
    if (!cur) continue;
    const i = ln.indexOf(":"); if (i < 0) continue;
    const key = ln.slice(0, i); const val = ln.slice(i + 1);
    const name = key.split(";")[0].toUpperCase();
    if (name === "SUMMARY") cur.title = val.replace(/\\,/g, ",").replace(/\\n/gi, " ").replace(/\\;/g, ";").trim();
    else if (name === "DTSTART") {
      cur.allDay = /VALUE=DATE/i.test(key) || /^\d{8}$/.test(val);
      cur.dtstart = val;
    }
    else if (name === "RRULE") cur.rrule = val;
    else if (name === "EXDATE") val.split(",").forEach(v => cur.exdates.push(v.trim()));
  }

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const horizon = new Date(now); horizon.setDate(horizon.getDate() + HORIZON_DAYS);

  const out = [];
  for (const e of events) {
    for (const ms of expandEvent(e, now, horizon)) {
      out.push({ title: e.title, start: new Date(ms).toISOString(), allDay: !!e.allDay, who: null });
    }
  }
  return out
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, 60);
}

// Parse an iCal date/datetime into a JS Date (local for floating/all-day, UTC for trailing Z).
function icsToDate(v, allDay) {
  const m = String(v).match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?(Z)?/);
  if (!m) return null;
  const [, y, mo, d, hh = "0", mm = "0", ss = "0", z] = m;
  if (allDay) return new Date(+y, +mo - 1, +d);
  if (z) return new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss));
  return new Date(+y, +mo - 1, +d, +hh, +mm, +ss);
}

// Return the occurrence timestamps (ms) of an event that fall within [now, horizon].
function expandEvent(e, now, horizon) {
  const start = icsToDate(e.dtstart, e.allDay);
  if (!start) return [];
  const nowMs = now.getTime(), horMs = horizon.getTime();

  if (!e.rrule) {
    const ms = start.getTime();
    return (ms >= nowMs && ms <= horMs) ? [ms] : [];
  }

  const R = {};
  e.rrule.split(";").forEach(p => { const [k, v] = p.split("="); if (k) R[k.toUpperCase()] = v; });
  const freq = (R.FREQ || "").toUpperCase();
  const interval = Math.max(1, parseInt(R.INTERVAL || "1", 10) || 1);
  const until = R.UNTIL ? icsToDate(R.UNTIL, !/T/.test(R.UNTIL)) : null;
  const count = R.COUNT ? parseInt(R.COUNT, 10) : null;
  const DOW = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  const byday = R.BYDAY ? R.BYDAY.split(",").map(d => DOW[d.slice(-2).toUpperCase()]).filter(n => n != null) : null;
  const exset = new Set((e.exdates || []).map(v => { const d = icsToDate(v, e.allDay); return d ? d.getTime() : -1; }));
  const hh = start.getHours(), mm = start.getMinutes(), ss = start.getSeconds();

  const out = [];
  let generated = 0;       // total occurrences emitted by the rule (for COUNT)
  const GUARD = 20000;     // safety cap so a malformed rule can't loop forever
  let stop = false;

  // Record one candidate occurrence; returns false when the series is exhausted.
  function consider(d) {
    const ms = d.getTime();
    if (ms < start.getTime()) return true;                 // before the series begins
    if (until && ms > until.getTime()) { stop = true; return false; }
    if (count != null && generated >= count) { stop = true; return false; }
    generated++;
    if (ms >= nowMs && ms <= horMs && !exset.has(ms)) out.push(ms);
    return true;
  }

  if (freq === "WEEKLY") {
    const days = (byday && byday.length ? byday : [start.getDay()]).slice().sort((a, b) => a - b);
    for (let k = 0; k < GUARD && !stop; k++) {
      const weekRef = new Date(start); weekRef.setDate(weekRef.getDate() + k * 7 * interval);
      for (const dow of days) {
        const occ = new Date(weekRef);
        occ.setDate(occ.getDate() + (dow - weekRef.getDay()));
        occ.setHours(hh, mm, ss, 0);
        if (!consider(occ)) break;
      }
      if (weekRef.getTime() > horMs + 7 * 86400000) break;
    }
  } else if (freq === "DAILY" || freq === "MONTHLY" || freq === "YEARLY") {
    const cur = new Date(start);
    for (let k = 0; k < GUARD && !stop; k++) {
      const occ = new Date(cur); occ.setHours(hh, mm, ss, 0);
      if (!consider(occ)) break;
      if (occ.getTime() > horMs) break;
      if (freq === "DAILY") cur.setDate(cur.getDate() + interval);
      else if (freq === "MONTHLY") cur.setMonth(cur.getMonth() + interval);
      else cur.setFullYear(cur.getFullYear() + interval);
    }
  } else {
    // Unknown FREQ: fall back to the single start date if it's in range.
    const ms = start.getTime();
    if (ms >= nowMs && ms <= horMs) out.push(ms);
  }

  return out;
}

// Send a plain-text email through Gmail SMTP (implicit TLS, no dependencies).
// Needs a Gmail App Password (not the account password).
function sendGmail({ user, pass, to, subject, text, fromName }) {
  return new Promise((resolve, reject) => {
    const tls = require("tls");
    const enc = s => Buffer.from(String(s), "utf8").toString("base64");
    const encSubject = /[^\x00-\x7F]/.test(subject) ? `=?UTF-8?B?${enc(subject)}?=` : subject;
    const body =
      `From: ${fromName ? `${fromName} <${user}>` : user}\r\n` +
      `To: ${to}\r\n` +
      `Subject: ${encSubject}\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: text/plain; charset=utf-8\r\n\r\n` +
      String(text).replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..") +
      `\r\n.\r\n`;

    // Each step: the response code we expect, then the command to send next.
    const steps = [
      { code: 220, send: "EHLO familydashboard\r\n" },
      { code: 250, send: "AUTH LOGIN\r\n" },
      { code: 334, send: enc(user) + "\r\n" },
      { code: 334, send: enc(pass) + "\r\n" },
      { code: 235, send: `MAIL FROM:<${user}>\r\n` },
      { code: 250, send: `RCPT TO:<${to}>\r\n` },
      { code: 250, send: "DATA\r\n" },
      { code: 354, send: body },
      { code: 250, send: "QUIT\r\n" },
      { code: 221, send: null },
    ];

    const socket = tls.connect(465, "smtp.gmail.com", { servername: "smtp.gmail.com" });
    let stage = 0, buf = "", done = false;
    const fail = m => { if (done) return; done = true; try { socket.destroy(); } catch {} reject(new Error(m)); };
    socket.setEncoding("utf8");
    socket.setTimeout(20000, () => fail("timed out talking to Gmail"));
    socket.on("error", e => fail(String((e && e.message) || e)));
    socket.on("data", chunk => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).replace(/\r$/, ""); buf = buf.slice(i + 1);
        if (/^\d{3}-/.test(line)) continue;            // multi-line reply, wait for the last line
        const code = parseInt(line.slice(0, 3), 10);
        if (code !== steps[stage].code) return fail(`Gmail said: ${line}`);
        const cmd = steps[stage].send;
        stage++;
        if (cmd) socket.write(cmd);
        if (stage >= steps.length) { done = true; try { socket.end(); } catch {} return resolve(true); }
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  // ---- API: state (persistent) ------------------------------------------
  if (pathname === "/api/state") {
    if (req.method === "GET") {
      try { return sendJSON(res, 200, JSON.parse(fs.readFileSync(STATE, "utf8"))); }
      catch { return sendJSON(res, 200, {}); }
    }
    if (req.method === "POST") {
      const body = await readBody(req);
      try {
        const parsed = JSON.parse(body);           // validate before writing
        // must be a plain object — reject null/numbers/arrays that would nuke state
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
          return sendJSON(res, 400, { ok: false, error: "state must be an object" });
        backupState();                             // rotating hourly safety net
        // plus a one-deep .bak so a bad save can be recovered in one step
        if (fs.existsSync(STATE)) fs.copyFileSync(STATE, STATE + ".bak");
        // atomic write: temp file then rename, so a crash can't corrupt state
        const tmp = STATE + ".tmp";
        fs.writeFileSync(tmp, JSON.stringify(parsed, null, 2));
        fs.renameSync(tmp, STATE);
        return sendJSON(res, 200, { ok: true });
      } catch (e) {
        return sendJSON(res, 400, { ok: false, error: "invalid json" });
      }
    }
    res.writeHead(405); return res.end();
  }

  // ---- API: share grocery list by email (Gmail) -------------------------
  if (pathname === "/api/share-grocery" && req.method === "POST") {
    let secrets;
    try { secrets = JSON.parse(fs.readFileSync(SECRETS, "utf8")); }
    catch { return sendJSON(res, 200, { ok: false, error: "Email isn't set up yet — create data/secrets.json (copy data/secrets.example.json and fill it in)." }); }
    const { gmailUser, gmailAppPassword, groceryTo } = secrets;
    if (!gmailUser || !gmailAppPassword || !groceryTo) {
      return sendJSON(res, 200, { ok: false, error: "data/secrets.json is missing gmailUser, gmailAppPassword, or groceryTo." });
    }
    let grocery = [];
    try { grocery = (JSON.parse(fs.readFileSync(STATE, "utf8")).grocery) || []; } catch {}
    const toBuy = grocery.filter(g => g && !g.done);
    if (!toBuy.length) return sendJSON(res, 200, { ok: false, error: "The grocery list is empty." });
    const text = "Here's the grocery list:\n\n" + toBuy.map(g => `• ${g.text}`).join("\n") + "\n\n— sent from the family dashboard 💚";
    try {
      await sendGmail({ user: gmailUser, pass: gmailAppPassword, to: groceryTo,
        subject: `🛒 Grocery list (${toBuy.length} item${toBuy.length === 1 ? "" : "s"})`,
        text, fromName: secrets.fromName || "Family Dashboard" });
      return sendJSON(res, 200, { ok: true, count: toBuy.length });
    } catch (e) {
      return sendJSON(res, 200, { ok: false, error: "Couldn't send: " + ((e && e.message) || e) });
    }
  }

  // ---- API: push the grocery list to Google Keep (syncs to Kenzie's phone) ----
  if (pathname === "/api/keep-grocery" && req.method === "POST") {
    let secrets;
    try { secrets = JSON.parse(fs.readFileSync(SECRETS, "utf8")); }
    catch { return sendJSON(res, 200, { ok: false, error: "Google Keep isn't set up yet — see scripts/KEEP-SETUP.md." }); }
    const { gkeepEmail, gkeepMasterToken } = secrets;
    if (!gkeepEmail || !gkeepMasterToken) {
      return sendJSON(res, 200, { ok: false, error: "data/secrets.json is missing gkeepEmail or gkeepMasterToken (see scripts/KEEP-SETUP.md)." });
    }
    let grocery = [];
    try { grocery = (JSON.parse(fs.readFileSync(STATE, "utf8")).grocery) || []; } catch {}
    const toBuy = grocery.filter(g => g && !g.done).map(g => g.text);
    if (!toBuy.length) return sendJSON(res, 200, { ok: false, error: "The grocery list is empty." });
    const label = secrets.keepListTitle || "Groceries";
    const title = `${label} — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

    // The Node client is the no-Python fallback (unofficial, less reliable).
    const viaNode = async () => {
      const keep = require("./scripts/keep-client.js");
      const token = await keep.getAccessToken(gkeepEmail, gkeepMasterToken);
      await keep.createGroceryList(token, title, toBuy);
      return { ok: true, count: toBuy.length };
    };

    // Prefer the battle-tested Python gkeepapi helper if Python is available.
    const { spawn } = require("child_process");
    const payload = JSON.stringify({ email: gkeepEmail, masterToken: gkeepMasterToken, listTitle: label, title, items: toBuy });
    const py = spawn("python", [path.join(ROOT, "scripts", "keep_push.py")], { cwd: ROOT });
    let out = "", err = "", done = false;
    const finish = (obj) => { if (done) return; done = true; sendJSON(res, 200, obj); };
    const fallbackToNode = () => viaNode().then(finish).catch(e => finish({ ok: false, error: "Couldn't send to Keep: " + ((e && e.message) || e) }));
    py.on("error", fallbackToNode);   // python not spawnable
    py.stdout.on("data", d => (out += d));
    py.stderr.on("data", d => (err += d));
    py.on("close", (code) => {
      let parsed = null;
      try { parsed = JSON.parse(out.trim().split("\n").filter(Boolean).pop()); } catch {}
      if (parsed) return finish(parsed);
      const all = out + " " + err;
      if (/was not found|Microsoft Store|not recognized|no python/i.test(all)) return fallbackToNode();   // python missing on Windows
      finish({ ok: false, error: "Keep push failed: " + (err.trim().slice(0, 200) || all.trim().slice(0, 160) || ("exit " + code)) });
    });
    try { py.stdin.write(payload); py.stdin.end(); } catch {}
    return;
  }

  // ---- API: voice assistant — drives Claude Code to do what was asked ----
  if (pathname === "/api/voice" && req.method === "POST") {
    // Only the wall itself (the kiosk on localhost) may issue voice commands —
    // never other devices on the network. This endpoint can edit files + run
    // git/node, so we keep it strictly loopback-only.
    const ra = req.socket.remoteAddress || "";
    if (!(ra === "127.0.0.1" || ra === "::1" || ra === "::ffff:127.0.0.1"))
      return sendJSON(res, 403, { ok: false, error: "Voice commands can only run from the wall itself." });
    const body = await readBody(req);
    let text = "";
    try { text = String(JSON.parse(body).text || "").slice(0, 600); } catch {}
    if (!text.trim()) return sendJSON(res, 200, { ok: false, error: "I didn't catch that." });

    const today = new Date();
    const dow = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][today.getDay()];
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const prompt = [
      `A family member just spoke this to the wall-mounted family dashboard. Carry out what they asked, then reply with ONE short, warm sentence describing what you did — it is read back to them.`,
      ``,
      `Command: "${text}"`,
      ``,
      `You are in the dashboard's project folder. Today is ${dow}, ${iso}.`,
      `LIVE DATA is in data/state.json (gitignored). Edit it to change the calendar, grocery, or chores — keep it VALID JSON and preserve existing keys:`,
      `  - Calendar: state.events = [{ "id":"ev<unique>", "date":"YYYY-MM-DD", "time":"HH:MM" 24h or null for all-day, "title":"...", "who":"Chad|Kenzie|Addison|Sophie" or null }]`,
      `  - Grocery: state.grocery = [{ "id":"g<unique>", "text":"...", "done":false }]  (for a recipe, look the recipe up on the web first, then add its ingredients)`,
      `  - Chores: state.chores = [{ "id":"c<unique>", "name":"...", "who":"...", "cadence":"daily|weekly", "pic":"emoji optional" }]`,
      `The wall re-reads state.json within ~20s, so editing the file is enough.`,
      ``,
      `LOOK/FEEL or NEW FEATURES live in code: public/config.js (title, people/colors, theme), public/app.js, public/styles.css. If you change code: run "node --check" on any .js you touch, keep the app working, then commit and push so it survives the next auto-update. The wall reloads itself on code changes.`,
      ``,
      `Rules: keep changes minimal and safe — a family relies on this display, never break it. Never print or expose data/secrets.json. If the request is unclear or unsafe, do nothing and say so briefly. End with ONE short friendly sentence for the family.`,
    ].join("\n");

    const { spawn } = require("child_process");
    // Scoped tools (NOT full bypass): edit files, look things up, validate, and
    // commit — but no arbitrary shell. Covers calendar/grocery/recipes/app edits.
    const TOOLS = "Read Edit Write Glob Grep WebFetch WebSearch Bash(node:*) Bash(git:*)";
    const child = spawn("claude", ["-p", "--output-format", "text", "--allowedTools", TOOLS], { cwd: ROOT, shell: true });
    let out = "", err = "", done = false;
    const finish = (obj) => { if (done) return; done = true; clearTimeout(timer); sendJSON(res, 200, obj); };
    const timer = setTimeout(() => { try { child.kill(); } catch {} finish({ ok: false, error: "That took too long — try a simpler command." }); }, 120000);
    child.on("error", () => finish({ ok: false, error: "Claude Code isn't installed here yet — run: npm i -g @anthropic-ai/claude-code, then claude setup-token." }));
    child.stdout.on("data", d => out += d.toString());
    child.stderr.on("data", d => err += d.toString());
    child.on("close", (code) => {
      const all = out + " " + err;   // Claude prints some errors to stdout, some to stderr
      if (/not recognized|command not found|ENOENT/i.test(all))
        return finish({ ok: false, error: "Claude Code isn't installed here yet — run: npm i -g @anthropic-ai/claude-code, then claude setup-token." });
      if (code !== 0 && /authenticat|invalid.*credential|\b401\b|setup-token|run .*login/i.test(all))
        return finish({ ok: false, error: "Claude needs to sign in on this device — run: claude setup-token (then try again)." });
      const summary = out.trim().replace(/\s+/g, " ").slice(0, 300);
      if (code === 0 && summary) finish({ ok: true, summary });
      else finish({ ok: false, error: summary || err.trim().replace(/\s+/g, " ").slice(0, 200) || "Couldn't complete that." });
    });
    try { child.stdin.write(prompt); child.stdin.end(); } catch {}
    return;
  }

  // ---- API: version (so the screen auto-reloads after a code update) ----
  if (pathname === "/api/version") {
    try {
      const files = ["index.html", "app.js", "styles.css", "config.js"];
      let token = 0;
      for (const f of files) {
        try { token += fs.statSync(path.join(PUBLIC, f)).mtimeMs; } catch {}
      }
      return sendJSON(res, 200, { version: Math.round(token) });
    } catch { return sendJSON(res, 200, { version: 0 }); }
  }

  // ---- API: calendar (server-side iCal proxy + parser) ------------------
  // The browser can't fetch Google's iCal feed (CORS), so we fetch + parse it
  // here and hand back clean JSON. URL comes from config.js (calendarICalUrl).
  if (pathname === "/api/calendar") {
    const target = url.searchParams.get("url") || "";
    if (!/^https:\/\//i.test(target)) return sendJSON(res, 400, { events: [], error: "https url required" });
    try {
      const ics = await fetchText(target);
      return sendJSON(res, 200, { events: parseICS(ics) });
    } catch (e) {
      return sendJSON(res, 200, { events: [], error: String(e && e.message || e) });
    }
  }

  // ---- API: forecast (free 7-day via Open-Meteo, no API key) ------------
  if (pathname === "/api/forecast") {
    const lat = parseFloat(url.searchParams.get("lat"));
    const lon = parseFloat(url.searchParams.get("lon"));
    if (!isFinite(lat) || !isFinite(lon)) return sendJSON(res, 400, { error: "lat/lon required" });
    const api = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset" +
      "&hourly=temperature_2m,precipitation_probability,weather_code" +
      "&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto&forecast_days=7";
    try {
      const data = JSON.parse(await fetchText(api));
      return sendJSON(res, 200, data);
    } catch (e) {
      return sendJSON(res, 200, { error: String(e && e.message || e) });
    }
  }

  // ---- API: meal ideas (Claude suggests fresh, seasonal dinners) --------
  // Loopback-only (it shells out to Claude). Read-only tools (web search).
  // Returns { ok, ideas:[...] }; the client falls back to a seasonal list.
  if (pathname === "/api/meal-ideas") {
    const ra = req.socket.remoteAddress || "";
    if (!(ra === "127.0.0.1" || ra === "::1" || ra === "::ffff:127.0.0.1"))
      return sendJSON(res, 200, { ok: false, error: "local only" });
    const n = Math.max(3, Math.min(10, parseInt(url.searchParams.get("n") || "6", 10)));
    const season = (url.searchParams.get("season") || "this season").replace(/[^\w ]/g, "").slice(0, 20);
    const temp = (url.searchParams.get("temp") || "").replace(/[^\d-]/g, "").slice(0, 4);
    const cond = (url.searchParams.get("cond") || "").replace(/[^\w ]/g, "").slice(0, 40);
    const prompt = `Suggest ${n} easy, family-friendly DINNER ideas that suit ${season}` +
      (temp ? ` weather (around ${temp}°F${cond ? ", " + cond : ""})` : "") +
      `. Mix in a couple of currently popular/trending ones — you may web search for fresh inspiration. Realistic for a busy family with young kids. Reply with ONLY a JSON array of short dinner names (max ~4 words each) and nothing else, e.g. ["Sheet-pan fajitas","Teriyaki salmon bowls"].`;
    const { spawn } = require("child_process");
    const child = spawn("claude", ["-p", "--output-format", "text", "--allowedTools", "WebSearch WebFetch"], { cwd: ROOT, shell: true });
    let out = "", done = false;
    const finish = (obj) => { if (done) return; done = true; clearTimeout(timer); sendJSON(res, 200, obj); };
    const timer = setTimeout(() => { try { child.kill(); } catch {} finish({ ok: false, error: "timeout" }); }, 45000);
    child.on("error", () => finish({ ok: false, error: "claude unavailable" }));
    child.stdout.on("data", d => out += d.toString());
    child.on("close", () => {
      let ideas = [];
      try { const m = out.match(/\[[\s\S]*\]/); if (m) ideas = JSON.parse(m[0]); } catch {}
      ideas = (Array.isArray(ideas) ? ideas : []).filter(x => typeof x === "string" && x.trim()).map(x => x.trim().slice(0, 40)).slice(0, n);
      finish(ideas.length ? { ok: true, ideas } : { ok: false, error: "no ideas" });
    });
    try { child.stdin.write(prompt); child.stdin.end(); } catch {}
    return;
  }

  // ---- API: recipe picks (weekly, from REAL top-tier sources) -----------
  // Claude web-searches for seasonal / weather-relevant dinner recipes from
  // named chefs & publications (never invented "AI slop"), returns structured
  // JSON, and we cache it per ISO-week in data/recipe-picks.json so the wall
  // isn't re-searching every load. ?refresh=1 forces a new search.
  if (pathname === "/api/recipe-picks") {
    const PICKS = path.join(DATA_DIR, "recipe-picks.json");
    const wk = (() => { const d = new Date(); const j1 = new Date(d.getFullYear(), 0, 1);
      return d.getFullYear() + "-W" + Math.ceil((((d - j1) / 86400000) + j1.getDay() + 1) / 7); })();
    let cached = null;
    try { cached = JSON.parse(fs.readFileSync(PICKS, "utf8")); } catch {}
    const fresh = cached && cached.week === wk && Array.isArray(cached.picks) && cached.picks.length;
    if (fresh && url.searchParams.get("refresh") !== "1")
      return sendJSON(res, 200, { ok: true, picks: cached.picks, week: cached.week, cached: true });

    const ra = req.socket.remoteAddress || "";
    const isLocal = ra === "127.0.0.1" || ra === "::1" || ra === "::ffff:127.0.0.1";
    const stale = () => cached && Array.isArray(cached.picks) && cached.picks.length
      ? sendJSON(res, 200, { ok: true, picks: cached.picks, week: cached.week, cached: true, stale: true })
      : sendJSON(res, 200, { ok: false, error: "no picks yet" });
    if (!isLocal) return stale();                       // only the wall itself may trigger a search

    const season = (url.searchParams.get("season") || "this season").replace(/[^\w ]/g, "").slice(0, 20);
    const temp = (url.searchParams.get("temp") || "").replace(/[^\d-]/g, "").slice(0, 4);
    const cond = (url.searchParams.get("cond") || "").replace(/[^\w ]/g, "").slice(0, 40);
    const prompt = `Find 6 GREAT dinner recipes for a busy family with young kids, suited to ${season} in Michigan` +
      (temp ? ` (this week ~${temp}°F${cond ? ", " + cond : ""})` : "") + `.
Rules — quality over everything:
- ONLY real, well-loved recipes from top-tier chefs, restaurants, or publications (e.g. NYT Cooking, Serious Eats, Bon Appétit, Smitten Kitchen, Ina Garten, Kenji López-Alt, Half Baked Harvest, Maangchi, Pati Jinich). Web-search to verify each one actually exists — never invent a recipe.
- Fairly easy: ≤ 50 min active, no obscure equipment, ≤ 10 core ingredients, nothing hard to find at a Midwest grocery store.
- Varied proteins/cuisines across the 6.
Reply with ONLY a JSON array, no other text:
[{"name":"short dish name","source":"chef or publication","time":"~30 min","emoji":"one fitting emoji","ingredients":["6-10 core shopping ingredients, capitalized, no quantities"]}]`;
    const { spawn } = require("child_process");
    const child = spawn("claude", ["-p", "--output-format", "text", "--allowedTools", "WebSearch WebFetch"], { cwd: ROOT, shell: true });
    let out = "", done = false;
    const finish = (obj) => { if (done) return; done = true; clearTimeout(timer); sendJSON(res, 200, obj); };
    const timer = setTimeout(() => { try { child.kill(); } catch {} if (!done) { done = true; stale(); } }, 90000);
    child.on("error", () => { if (!done) { done = true; stale(); } });
    child.stdout.on("data", d => out += d.toString());
    child.on("close", () => {
      if (done) return;
      let picks = [];
      try { const m = out.match(/\[[\s\S]*\]/); if (m) picks = JSON.parse(m[0]); } catch {}
      picks = (Array.isArray(picks) ? picks : []).filter(p => p && p.name && Array.isArray(p.ingredients))
        .map(p => ({ name: String(p.name).slice(0, 60), source: String(p.source || "").slice(0, 60),
          time: String(p.time || "").slice(0, 20), emoji: String(p.emoji || "🍽️").slice(0, 8),
          ingredients: p.ingredients.slice(0, 12).map(x => String(x).slice(0, 40)) }))
        .slice(0, 8);
      if (!picks.length) { done = true; return stale(); }
      try { fs.writeFileSync(PICKS, JSON.stringify({ week: wk, fetchedAt: new Date().toISOString(), picks }, null, 2)); } catch {}
      finish({ ok: true, picks, week: wk, cached: false });
    });
    try { child.stdin.write(prompt); child.stdin.end(); } catch {}
    return;
  }

  // ---- API: weather (latest sensor reading) -----------------------------
  if (pathname === "/api/weather") {
    try {
      const w = JSON.parse(fs.readFileSync(WEATHER, "utf8"));
      return sendJSON(res, 200, w);
    } catch {
      // No live data yet — return demo numbers so the screen is never blank.
      return sendJSON(res, 200, {
        demo: true,
        temperature_F: 68, condition: "Partly cloudy", hi: 74, lo: 59,
        humidity: 54, rain_in: 0.42, indoor_F: 71, indoor_hum: 42,
        rain12h: [0,0,0,0,0.02,0.08,0.18,0.10,0.04,0,0,0],
        updated: null,
      });
    }
  }

  // ---- API: photos (the background reel reads this list) ----------------
  // Lists image files dropped into data/photos/ (gitignored). The dashboard
  // crossfades through them as the wallpaper when the photo theme is on.
  if (pathname === "/api/photos") {
    const exts = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);
    const list = (dir, prefix) => {
      try {
        return fs.readdirSync(dir)
          .filter(f => exts.has(path.extname(f).toLowerCase()) && !f.startsWith("."))
          .sort().map(f => prefix + encodeURIComponent(f));
      } catch { return []; }
    };
    // Your private photos win; if you haven't added any yet, fall back to the
    // tracked default scenes in public/scenes/ so the wall still has a backdrop.
    let photos = list(PHOTOS, "/photos/");
    if (!photos.length) photos = list(path.join(PUBLIC, "scenes"), "/scenes/");
    return sendJSON(res, 200, { photos });
  }

  // ---- Serve a photo file from data/photos/ (outside /public) ------------
  if (pathname.startsWith("/photos/")) {
    const name = decodeURIComponent(pathname.slice("/photos/".length));
    const photoPath = path.join(PHOTOS, name);
    if (!photoPath.startsWith(PHOTOS + path.sep)) { res.writeHead(403); return res.end(); }
    return fs.readFile(photoPath, (err, content) => {
      if (err) { res.writeHead(404); return res.end("Not found"); }
      const ext = path.extname(photoPath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(content);
    });
  }

  // ---- Static files ------------------------------------------------------
  let filePath = path.join(PUBLIC, pathname === "/" ? "index.html" : pathname);
  // prevent path traversal
  if (!filePath.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      // SPA-ish fallback to index.html
      fs.readFile(path.join(PUBLIC, "index.html"), (e2, html) => {
        if (e2) { res.writeHead(404); return res.end("Not found"); }
        res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-store" });
        res.end(html);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    // no-store so the wall always loads fresh code after a git pull + reload
    // (otherwise Edge serves a stale cached app.js/config.js and nothing changes)
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(content);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`\n  Family dashboard running:`);
    console.log(`    On this machine:  http://localhost:${PORT}`);
    console.log(`    On your network:  http://<this-device-ip>:${PORT}\n`);
  });
} else {
  // Imported by tests — expose the calendar parser without starting the server.
  module.exports = { parseICS, expandEvent, icsToDate, sendGmail };
}
