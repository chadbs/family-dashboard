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

// Make sure the data folder exists.
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Seed state.json from the example the first time only (never overwrites).
if (!fs.existsSync(STATE)) {
  const seed = path.join(DATA_DIR, "state.example.json");
  const initial = fs.existsSync(seed) ? fs.readFileSync(seed, "utf8") : "{}";
  fs.writeFileSync(STATE, initial);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
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
