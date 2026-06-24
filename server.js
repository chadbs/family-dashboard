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

// Minimal iCal parser -> upcoming events for the next 14 days.
function parseICS(ics) {
  // unfold folded lines (continuation lines start with space or tab)
  const lines = ics.replace(/\r\n/g, "\n").split("\n");
  const unfolded = [];
  for (const ln of lines) {
    if ((ln.startsWith(" ") || ln.startsWith("\t")) && unfolded.length) unfolded[unfolded.length - 1] += ln.slice(1);
    else unfolded.push(ln);
  }

  const out = [];
  let cur = null;
  for (const ln of unfolded) {
    if (ln === "BEGIN:VEVENT") { cur = {}; continue; }
    if (ln === "END:VEVENT") {
      if (cur && cur.title && cur.start) out.push(cur);
      cur = null; continue;
    }
    if (!cur) continue;
    const i = ln.indexOf(":"); if (i < 0) continue;
    const key = ln.slice(0, i); const val = ln.slice(i + 1);
    const name = key.split(";")[0].toUpperCase();
    if (name === "SUMMARY") cur.title = val.replace(/\\,/g, ",").replace(/\\n/gi, " ").replace(/\\;/g, ";").trim();
    else if (name === "DTSTART") {
      const allDay = /VALUE=DATE/i.test(key) || /^\d{8}$/.test(val);
      cur.allDay = allDay;
      cur.start = icsDate(val, allDay);
    }
  }

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const horizon = new Date(now); horizon.setDate(horizon.getDate() + 14);
  return out
    .filter(e => e.start && new Date(e.start) >= now && new Date(e.start) <= horizon)
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, 60)
    .map(e => ({ title: e.title, start: e.start, allDay: !!e.allDay, who: null }));
}

function icsDate(v, allDay) {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?(Z)?/);
  if (!m) return null;
  const [, y, mo, d, hh = "0", mm = "0", ss = "0", z] = m;
  if (allDay) return new Date(+y, +mo - 1, +d).toISOString();
  if (z) return new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss)).toISOString();
  return new Date(+y, +mo - 1, +d, +hh, +mm, +ss).toISOString();
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
        res.writeHead(200, { "Content-Type": MIME[".html"] });
        res.end(html);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\n  Family dashboard running:`);
  console.log(`    On this machine:  http://localhost:${PORT}`);
  console.log(`    On your network:  http://<this-device-ip>:${PORT}\n`);
});
