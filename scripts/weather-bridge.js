/* ============================================================================
   Weather bridge — turns your AcuRite 01608 radio signal into weather.json
   ----------------------------------------------------------------------------
   It runs rtl_433, listens for your sensor, and writes the latest reading to
   data/weather.json, which the dashboard reads via /api/weather.

   FIRST: run rtl_433 once by itself and watch the output so you know exactly
   what your sensor is called and which fields it sends:

       rtl_433 -F json

   You'll see lines like:
       {"model":"Acurite-Rain899","id":1234,"rain_in":3.10, ...}
       {"model":"Acurite-Tower","id":5678,"temperature_F":68.4,"humidity":54, ...}

   Then set RTL433 path and (if needed) tweak the field names in mapEvent()
   below to match what YOUR units print. Start it with:

       node scripts/weather-bridge.js
   ========================================================================== */

const { spawn } = require("child_process");
const fs   = require("fs");
const path = require("path");

// Path to the rtl_433 executable. If it's on your PATH, just "rtl_433".
const RTL433 = process.env.RTL433 || "rtl_433";

const DATA = path.join(__dirname, "..", "data", "weather.json");

// running snapshot we keep updating and writing out
let wx = {
  temperature_F: null, condition: "—", hi: null, lo: null,
  humidity: null, rain_in: 0, indoor_F: null, indoor_hum: null,
  rain12h: new Array(12).fill(0), updated: null,
};

// daily/hourly bookkeeping for hi/lo and rain buckets
let dayStamp = new Date().toDateString();
let rainBaseline = null;          // cumulative rain at first reading today
let lastHourRain = {};            // hour -> cumulative seen, to compute deltas

function resetDayIfNeeded() {
  const today = new Date().toDateString();
  if (today !== dayStamp) {
    dayStamp = today;
    wx.hi = wx.lo = wx.temperature_F;
    rainBaseline = null;
    wx.rain12h = new Array(12).fill(0);
    lastHourRain = {};
  }
}

/* ---- map an rtl_433 event onto our weather snapshot --------------------- */
function mapEvent(o) {
  const model = (o.model || "").toLowerCase();

  // OUTDOOR temperature / humidity (adjust the model match to your sensor)
  if (o.temperature_F != null && !model.includes("indoor") && !model.includes("tower-i")) {
    const t = Number(o.temperature_F);
    wx.temperature_F = t;
    wx.hi = wx.hi == null ? t : Math.max(wx.hi, t);
    wx.lo = wx.lo == null ? t : Math.min(wx.lo, t);
  }
  if (o.humidity != null && !model.includes("indoor")) wx.humidity = Number(o.humidity);

  // INDOOR sensor (the 01608 console reports indoor temp/humidity too)
  if (model.includes("indoor") || o.channel === "I") {
    if (o.temperature_F != null) wx.indoor_F = Number(o.temperature_F);
    if (o.humidity != null) wx.indoor_hum = Number(o.humidity);
  }

  // RAIN (cumulative). We diff it to get "today" and per-hour buckets.
  const cumRain = o.rain_in != null ? Number(o.rain_in)
                 : o.rain_mm != null ? Number(o.rain_mm) / 25.4 : null;
  if (cumRain != null) {
    if (rainBaseline == null) rainBaseline = cumRain;
    wx.rain_in = Math.max(0, +(cumRain - rainBaseline).toFixed(2));
    const hr = new Date().getHours();
    if (lastHourRain[hr] == null) lastHourRain[hr] = cumRain;
    const delta = Math.max(0, cumRain - lastHourRain[hr]);
    lastHourRain[hr] = cumRain;
    wx.rain12h[wx.rain12h.length - 1] = +(wx.rain12h[wx.rain12h.length - 1] + delta).toFixed(2);
  }

  // simple condition guess from rain + humidity
  if (wx.rain_in > 0.01) wx.condition = "Rain";
  else if (wx.humidity != null && wx.humidity > 85) wx.condition = "Cloudy";
  else wx.condition = "Partly cloudy";

  wx.updated = new Date().toISOString();
}

function write() {
  const tmp = DATA + ".tmp";
  try { fs.writeFileSync(tmp, JSON.stringify(wx, null, 2)); fs.renameSync(tmp, DATA); } catch {}
}

/* ---- run rtl_433 and parse its JSON lines ------------------------------ */
console.log(`Starting weather bridge using "${RTL433}"...`);
const proc = spawn(RTL433, ["-F", "json"], { shell: true });

let buf = "";
proc.stdout.on("data", (chunk) => {
  buf += chunk.toString();
  let nl;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
    if (!line.startsWith("{")) continue;
    try {
      const o = JSON.parse(line);
      resetDayIfNeeded();
      mapEvent(o);
      write();
      console.log(`updated: ${wx.temperature_F}F ${wx.humidity}% rain=${wx.rain_in}"`);
    } catch {}
  }
});

proc.stderr.on("data", (d) => process.stderr.write(d));
proc.on("close", (code) => { console.log(`rtl_433 exited (${code}). Is the dongle plugged in?`); process.exit(code || 0); });

// hourly: roll the 12h rain buckets forward by one
setInterval(() => { wx.rain12h.shift(); wx.rain12h.push(0); write(); }, 1000 * 60 * 60);
