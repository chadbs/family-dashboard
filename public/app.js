/* ============================================================================
   Family Dashboard — front-end logic
   - Persistent chores via /api/state (survives code updates + reboots)
   - Live weather via /api/weather
   - Auto day/night theme
   ========================================================================== */

const C = window.CONFIG;
const $ = (id) => document.getElementById(id);
const DOW  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DOWS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MON  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

let STATE = { choreDone: {}, choreWeek: null, grocery: [], events: [], stars: {}, streak: {}, mealPlan: {}, itemPrefs: {}, pantryNeed: {}, mealTarget: {}, shopSkip: {} };

/* ---------------------------------------------------------------- helpers */
function color(who) { return (C.people && C.people[who]) || "#8A93A6"; }
function initials(who) { return who.slice(0, 1).toUpperCase(); }
function avatarOf(who) { return (C.avatars && C.avatars[who]) || ""; }            // emoji, or "" if none
function badgeText(who) { return avatarOf(who) || (who ? initials(who) : "?"); }   // what to show on the badge
function badgeClass(who) { return avatarOf(who) ? "chore-badge avatar" : "chore-badge"; }
function todayKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
function weekKey() {
  const d = new Date(); const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

/* ---------------------------------------------------------------- theme */
function applyTheme() {
  let mode = C.theme || "auto";
  if (mode === "auto") {
    const h = new Date().getHours();
    const dark = (h >= C.darkFromHour) || (h < C.darkUntilHour);
    mode = dark ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", mode);
}

/* ---------------------------------------------------------------- clock */
function renderClock() {
  const n = new Date();
  let h = n.getHours(); const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const m = String(n.getMinutes()).padStart(2, "0");
  $("clock").innerHTML = `${h}:${m}<span style="font-size:.42em;color:var(--muted);font-weight:400;letter-spacing:0;"> ${ampm}</span>`;
  $("date").textContent = `${DOW[n.getDay()]}, ${MON[n.getMonth()]} ${n.getDate()}`;
  const hr = n.getHours();
  $("greeting").textContent = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
}

/* ---------------------------------------------------------------- weather icons */
function weatherIcon(cond = "") {
  const c = cond.toLowerCase();
  const sun = '#F59E0B', cloud = 'var(--ink-soft)', rain = 'var(--rain)';
  if (c.includes("snow") || c.includes("sleet") || c.includes("flurr")) {
    return `<svg viewBox="0 0 64 64" fill="none">
      <path d="M18 40a11 11 0 0 1 .7-22A15 15 0 0 1 47 22a10 10 0 0 1-1 18H18z" fill="${cloud}" opacity=".24"/>
      <path d="M18 40a11 11 0 0 1 .7-22A15 15 0 0 1 47 22a10 10 0 0 1-1 18H18z" stroke="${cloud}" stroke-width="2.5"/>
      <g fill="${rain}"><circle cx="24" cy="49" r="2.4"/><circle cx="34" cy="53" r="2.4"/><circle cx="44" cy="49" r="2.4"/></g></svg>`;
  }
  if (c.includes("rain") || c.includes("shower") || c.includes("storm") || c.includes("drizzle")) {
    return `<svg viewBox="0 0 64 64" fill="none">
      <path d="M20 34a10 10 0 0 1 .6-19.9A14 14 0 0 1 47 18a9 9 0 0 1-1 18H20z" fill="${cloud}" opacity=".22"/>
      <path d="M20 34a10 10 0 0 1 .6-19.9A14 14 0 0 1 47 18a9 9 0 0 1-1 18H20z" stroke="${cloud}" stroke-width="2.5"/>
      <g stroke="${rain}" stroke-width="3.2" stroke-linecap="round">
        <line x1="24" y1="42" x2="21" y2="52"/><line x1="34" y1="42" x2="31" y2="54"/><line x1="44" y1="42" x2="41" y2="52"/>
      </g></svg>`;
  }
  if (c.includes("part") || c.includes("few")) {
    return `<svg viewBox="0 0 64 64" fill="none">
      <circle cx="24" cy="22" r="9" fill="${sun}" opacity=".9"/>
      <g stroke="${sun}" stroke-width="2.6" stroke-linecap="round">
        <line x1="24" y1="5" x2="24" y2="10"/><line x1="9" y1="22" x2="14" y2="22"/>
        <line x1="12" y1="10" x2="15.5" y2="13.5"/><line x1="36" y1="10" x2="32.5" y2="13.5"/></g>
      <path d="M28 46a10 10 0 0 1 .6-20A13 13 0 0 1 52 30a8.5 8.5 0 0 1-1 16H28z" fill="${cloud}" opacity=".28"/>
      <path d="M28 46a10 10 0 0 1 .6-20A13 13 0 0 1 52 30a8.5 8.5 0 0 1-1 16H28z" stroke="${cloud}" stroke-width="2.5"/></svg>`;
  }
  if (c.includes("cloud") || c.includes("overcast") || c.includes("fog") || c.includes("mist")) {
    return `<svg viewBox="0 0 64 64" fill="none">
      <path d="M18 44a11 11 0 0 1 .7-22A15 15 0 0 1 47 26a10 10 0 0 1-1 18H18z" fill="${cloud}" opacity=".25"/>
      <path d="M18 44a11 11 0 0 1 .7-22A15 15 0 0 1 47 26a10 10 0 0 1-1 18H18z" stroke="${cloud}" stroke-width="2.5"/></svg>`;
  }
  // clear / sunny
  return `<svg viewBox="0 0 64 64" fill="none">
    <circle cx="32" cy="32" r="13" fill="${sun}"/>
    <g stroke="${sun}" stroke-width="3" stroke-linecap="round">
      <line x1="32" y1="6" x2="32" y2="13"/><line x1="32" y1="51" x2="32" y2="58"/>
      <line x1="6" y1="32" x2="13" y2="32"/><line x1="51" y1="32" x2="58" y2="32"/>
      <line x1="13" y1="13" x2="18" y2="18"/><line x1="46" y1="46" x2="51" y2="51"/>
      <line x1="51" y1="13" x2="46" y2="18"/><line x1="18" y1="46" x2="13" y2="51"/></g></svg>`;
}

/* ---------------------------------------------------------------- weather */
async function loadWeather() {
  try {
    const r = await fetch("/api/weather", { cache: "no-store" });
    const w = await r.json();
    renderWeather(w);
    $("liveText").textContent = w.demo ? "Demo data" : "Live";
    $("pulse").classList.toggle("stale", !!w.demo);
    if (w.updated) {
      const ago = Math.round((Date.now() - new Date(w.updated)) / 60000);
      $("updated").textContent = ago < 1 ? "updated just now" : `updated ${ago} min ago`;
    } else {
      $("updated").textContent = "waiting for sensor";
    }
  } catch {
    $("liveText").textContent = "Sensor offline";
    $("pulse").classList.add("stale");
  }
}

// Dew point (°F) from temperature (°F) + relative humidity (%), Magnus formula.
function dewPointF(tF, rh) {
  const tC = (tF - 32) * 5 / 9, a = 17.625, b = 243.04;
  const g = Math.log(Math.max(1, rh) / 100) + (a * tC) / (b + tC);
  return ((b * g) / (a - g)) * 9 / 5 + 32;
}

// Map a condition string (+ actual temp) to a sky-tint key for the
// weather-reactive background. Rain/snow (the condition) win over temperature;
// otherwise a heat wave or a deep freeze gets its own warmer/colder tint even
// on an otherwise plain "Clear" day.
function skyFromCondition(cond = "", tempF = null) {
  const c = cond.toLowerCase();
  if (c.includes("rain") || c.includes("shower") || c.includes("storm") || c.includes("drizzle")) return "rainy";
  if (c.includes("snow") || c.includes("sleet") || c.includes("flurr")) return "snow";
  if (tempF != null && tempF >= 85) return "hot";
  if (tempF != null && tempF <= 20) return "cold";
  if (c.includes("part") || c.includes("few")) return "partly";
  if (c.includes("cloud") || c.includes("overcast") || c.includes("fog") || c.includes("mist")) return "cloudy";
  return "sunny";
}

let lastWeather = null;
function renderWeather(w) {
  lastWeather = w || null;
  const r = v => (v == null || isNaN(v)) ? null : Math.round(v);
  const sky = skyFromCondition(w.condition, r(w.temperature_F));
  document.documentElement.setAttribute("data-sky", sky);
  $("tempNow").innerHTML = `${r(w.temperature_F) ?? "--"}<span class="deg">°</span>`;
  $("tempCond").textContent = w.condition || "—";
  $("tempLoc").textContent = C.location || "Outside";
  $("heroIcon").innerHTML = weatherIcon(w.condition);
  const badge = $("tempBadge");
  if (badge) badge.textContent = sky === "hot" ? "🌴" : sky === "cold" ? "🥶" : sky === "rainy" ? "☔" : sky === "snow" ? "❄️" : "";
  $("mHiLo").textContent = (r(w.hi) != null && r(w.lo) != null) ? `${r(w.hi)}° / ${r(w.lo)}°` : "—";
  $("mHum").textContent = r(w.humidity) != null ? `${r(w.humidity)}%` : "—";
  $("mRain").textContent = `${(w.rain_in ?? 0).toFixed(2)}"`;
  // 4th metric: indoor if a sensor reports it; otherwise dew point (from temp + humidity).
  if (r(w.indoor_F) != null) {
    $("mIndoorLabel").textContent = "Indoor";
    $("mIndoor").textContent = `${r(w.indoor_F)}°${r(w.indoor_hum) != null ? ` · ${r(w.indoor_hum)}%` : ""}`;
  } else if (r(w.temperature_F) != null && r(w.humidity) != null) {
    $("mIndoorLabel").textContent = "Dew point";
    $("mIndoor").textContent = `${r(dewPointF(w.temperature_F, w.humidity))}°`;
  } else {
    $("mIndoorLabel").textContent = "Indoor";
    $("mIndoor").textContent = "—";
  }

  const r12 = w.rain12h || [];
  const max = Math.max(0.01, ...r12);
  $("rainChart").innerHTML = r12.map(v => {
    const h = Math.max(4, Math.round((v / max) * 100));
    return `<div class="bar ${v > 0 ? "wet" : ""}" style="height:${h}%"></div>`;
  }).join("");
  const total = r12.reduce((a, b) => a + b, 0);
  $("trendTotal").textContent = `${total.toFixed(2)}" total`;
}

/* ---------------------------------------------------------------- forecast
   A free 7-day outlook from Open-Meteo (no API key). "Now" stays the backyard
   sensor; this adds the days ahead. Tap a day for its hourly detail.          */
let forecastData = null;
function fcDate(iso) { const p = iso.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function fcClock(iso) {
  if (!iso || iso.length < 16) return "";
  let h = +iso.slice(11, 13); const m = iso.slice(14, 16);
  const ap = h >= 12 ? "pm" : "am"; h = h % 12 || 12;
  return `${h}:${m}${ap}`;
}
// WMO weather code -> a label our weatherIcon() understands.
function wmoLabel(code) {
  if (code === 0) return "Clear";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "—";
}

async function loadForecast() {
  if (C.lat == null || C.lon == null) return;
  try {
    const r = await fetch(`/api/forecast?lat=${C.lat}&lon=${C.lon}`, { cache: "no-store" });
    const d = await r.json();
    if (d && d.daily && Array.isArray(d.daily.time)) { forecastData = d; renderForecast(d); }
  } catch { /* keep whatever we have */ }
}
function renderForecast(d) {
  const host = $("forecast"); if (!host) return;
  const dl = d.daily, n = Math.min(7, dl.time.length);
  let html = "";
  for (let i = 0; i < n; i++) {
    const dow = i === 0 ? "Today" : DOWS[fcDate(dl.time[i]).getDay()];
    const cond = wmoLabel(dl.weather_code[i]);
    const hi = Math.round(dl.temperature_2m_max[i]);
    const lo = Math.round(dl.temperature_2m_min[i]);
    const pop = Math.round(dl.precipitation_probability_max[i] ?? 0);
    html += `<button class="fc-day ${i === 0 ? "is-today" : ""}" data-i="${i}" type="button">
      <span class="fc-dow">${dow}</span>
      <span class="fc-ic">${weatherIcon(cond)}</span>
      <span class="fc-t"><b>${hi}°</b><i>${lo}°</i>${pop >= 30 ? `<span class="fc-drop" title="${pop}% rain">💧</span>` : ""}</span>
    </button>`;
  }
  host.innerHTML = html;
}
function openForecastDay(i) {
  const d = forecastData; if (!d || !d.daily || !d.daily.time[i]) return;
  const dl = d.daily, date = dl.time[i], dt = fcDate(date);
  $("fcTitle").textContent = `${i === 0 ? "Today · " : ""}${DOW[dt.getDay()]}, ${MON[dt.getMonth()].slice(0, 3)} ${dt.getDate()}`;
  $("fcPlace").textContent = C.forecastPlace || "";
  const hi = Math.round(dl.temperature_2m_max[i]), lo = Math.round(dl.temperature_2m_min[i]);
  const pop = Math.round(dl.precipitation_probability_max[i] ?? 0), cond = wmoLabel(dl.weather_code[i]);
  $("fcSummary").innerHTML =
    `<span class="fcs-ic">${weatherIcon(cond)}</span>
     <span class="fcs-cond">${cond}</span>
     <span class="fcs-temps"><b>${hi}°</b> <i>${lo}°</i></span>
     <span class="fcs-pop">💧 ${pop}%</span>
     <span class="fcs-sun">↑ ${fcClock(dl.sunrise[i])} &nbsp; ↓ ${fcClock(dl.sunset[i])}</span>`;
  const hr = d.hourly, rows = [];
  if (hr && Array.isArray(hr.time)) {
    for (let j = 0; j < hr.time.length; j++) {
      if (hr.time[j].slice(0, 10) === date) rows.push({ t: hr.time[j], temp: hr.temperature_2m[j], pop: hr.precipitation_probability[j], code: hr.weather_code[j] });
    }
  }
  const show = rows.filter((_, k) => k % 2 === 0);   // every 2 hours keeps it tidy
  const temps = show.map(r => r.temp), tmin = Math.min(...temps), tmax = Math.max(...temps);
  $("fcHours").innerHTML = show.map(r => {
    const h = +r.t.slice(11, 13), ap = h >= 12 ? "p" : "a", h12 = h % 12 || 12;
    const pct = tmax > tmin ? (r.temp - tmin) / (tmax - tmin) : 0.5;
    return `<div class="fch">
      <span class="fch-time">${h12}${ap}</span>
      <span class="fch-ic">${weatherIcon(wmoLabel(r.code))}</span>
      <span class="fch-temp">${Math.round(r.temp)}°</span>
      <span class="fch-bar"><i style="height:${Math.round(26 + pct * 64)}%"></i></span>
      <span class="fch-pop ${r.pop >= 15 ? "" : "dry"}">${r.pop >= 15 ? r.pop + "%" : ""}</span>
    </div>`;
  }).join("");
  $("forecastModal").hidden = false;
}
function closeForecast() { $("forecastModal").hidden = true; }
$("forecast").addEventListener("click", (e) => { const b = e.target.closest(".fc-day"); if (b) openForecastDay(+b.dataset.i); });
$("fcClose").addEventListener("click", closeForecast);
$("forecastModal").addEventListener("click", (e) => { if (e.target.id === "forecastModal") closeForecast(); });

/* ---------------------------------------------------------------- chores
   A weekly chore chart: rows are chores, columns are Mon–Sun. Daily chores
   get a box per day; weekly chores get one box for the whole week. The whole
   grid clears each Monday. The chore LIST seeds from config.js but, once you
   edit it on the touchscreen, lives in state.json (survives code updates).
   Checkmarks (STATE.choreDone) always live in state.json.                    */
const DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// The chore list in effect: your touchscreen-edited list, else config defaults.
function effectiveChores() {
  return (Array.isArray(STATE.chores) && STATE.chores.length) ? STATE.chores : (C.chores || []);
}

function weekStartDate(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7;            // Monday = 0 … Sunday = 6
  x.setDate(x.getDate() - dow);
  return x;
}
function weekKeyOf(d = new Date()) {
  const w = weekStartDate(d);
  return `${w.getFullYear()}-${String(w.getMonth() + 1).padStart(2, "0")}-${String(w.getDate()).padStart(2, "0")}`;
}
function todayIndex() { return (new Date().getDay() + 6) % 7; }

// Clear the whole grid when a new week starts (Monday).
function ensureWeek() {
  STATE.choreDone = STATE.choreDone || {};
  const wk = weekKeyOf();
  if (STATE.choreWeek !== wk) {
    STATE.choreDone = {};
    STATE.choreWeek = wk;
    saveState();
  }
}

function slotFor(c) { return c.cadence === "weekly" ? "w" : String(todayIndex()); }
function isDone(id, slot) { return !!(STATE.choreDone[id] && STATE.choreDone[id][slot]); }
function choreById(id) { return effectiveChores().find(x => x.id === id); }
function choreColor(id) { const c = choreById(id); return color(c && c.who); }
function choreWho(id) { const c = choreById(id); return c && c.who; }
function isKid(who) { return (C.kids || []).includes(who); }

// Auto-pick a picture for a chore from its name (kid chores without one).
// First match wins, so specific words come first and generic wash/clean go
// LAST. Only emoji from Emoji 12 or older — the wall may run an older Windows
// whose font shows newer glyphs (🪟 🪥 🪴 …) as empty boxes, i.e. "no icon".
const CHORE_PICS = [
  [/window/i, "🧽"], [/shoe/i, "👟"], [/tooth|teeth|brush/i, "🦷"], [/\bbed\b|make.*bed/i, "🛏️"],
  [/toy|basement|play.?room/i, "🧸"], [/dish|dishwash/i, "🍽️"], [/trash|garbage/i, "🗑️"], [/recycl/i, "♻️"],
  [/\bdog\b|puppy|walk/i, "🐕"], [/\bcat\b|kitty/i, "🐈"], [/fish/i, "🐠"], [/chicken|coop/i, "🐔"],
  [/bunny|rabbit/i, "🐰"], [/turtle|tortoise/i, "🐢"], [/hamster|guinea/i, "🐹"], [/bird|parakeet/i, "🐦"],
  [/plant|water/i, "🌱"], [/flower/i, "🌷"], [/vacuum|sweep/i, "🧹"], [/mop|floor/i, "💦"],
  [/laundry|fold|clothes/i, "🧺"], [/pajama|\bpjs?\b|dressed/i, "👕"], [/dresser|closet|hang.?up/i, "👚"],
  [/blanket|pillow/i, "🛌"], [/stairs?/i, "👣"], [/dust/i, "✨"], [/wipe|counter/i, "🧴"],
  [/\broom\b/i, "🚪"], [/table|set.*table/i, "🍽️"], [/lunch|meal|cook|kitchen/i, "🍱"],
  [/book|read/i, "📚"], [/\bcar\b|garage/i, "🚗"], [/mail/i, "📬"], [/snow|shovel/i, "❄️"],
  [/leaf|rake/i, "🍂"], [/towel/i, "🧻"], [/hair/i, "💇"], [/face|hand/i, "🧼"],
  [/feed|food|bowl/i, "🥣"], [/homework|study/i, "✏️"], [/guitar|violin|cello/i, "🎸"], [/music|piano|practice/i, "🎹"],
  [/bath|shower/i, "🛁"], [/swim|pool/i, "🏊"], [/bike|cycle|scooter/i, "🚲"], [/mow|lawn|grass/i, "🌿"], [/garden|yard|weed/i, "🌻"],
  [/sock/i, "🧦"], [/potty|toilet/i, "🚽"], [/diaper|baby/i, "🍼"], [/backpack/i, "🎒"],
  [/puzzle/i, "🧩"], [/draw|color(?:ing)?|paint|art/i, "🎨"], [/light|lamp/i, "💡"], [/nap|sleep/i, "😴"],
  [/vitamin/i, "🍊"], [/wash/i, "🧼"], [/clean|tidy|pick.?up/i, "🧼"],
];
function chorePic(c) {
  if (c.pic) return c.pic;                                  // explicit picture wins
  for (const [re, emo] of CHORE_PICS) if (re.test(c.name || "")) return emo;
  return "⭐";                                              // friendly fallback
}

// ── Star economy (each kid's own points jar) ────────────────────────────
function starsOf(who) { return Math.max(0, Math.round((STATE.stars || {})[who] || 0)); }
function choreStars(c) { return (c && typeof c.stars === "number") ? c.stars : (C.defaultChoreStars ?? 1); }
function addStars(who, n) {
  STATE.stars = STATE.stars || {};
  STATE.stars[who] = Math.max(0, (STATE.stars[who] || 0) + n);
}
// The cheapest reward a kid can't afford yet — what their jar is filling toward.
function nextReward(bal) {
  const shop = (C.rewards || []).slice().sort((a, b) => a.cost - b.cost);
  return shop.find(r => r.cost > bal) || null;
}

// ── Streaks: consecutive days a kid earns at least one star ──────────────
function ymdLocal(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
// The streak that's still "alive" (last active today or yesterday), else 0.
function streakOf(who) {
  const s = (STATE.streak || {})[who]; if (!s || !s.last) return 0;
  const y = new Date(); y.setDate(y.getDate() - 1);
  return (s.last === ymdLocal() || s.last === ymdLocal(y)) ? s.count : 0;
}
// Count today toward the streak (once per day); every Nth day earns a bonus.
function bumpStreak(who) {
  STATE.streak = STATE.streak || {};
  const today = ymdLocal();
  const y = new Date(); y.setDate(y.getDate() - 1); const yest = ymdLocal(y);
  const s = STATE.streak[who] || { count: 0, last: null };
  if (s.last === today) return;                       // already counted today
  s.count = (s.last === yest) ? s.count + 1 : 1;      // continue, or restart
  s.last = today;
  STATE.streak[who] = s;
  const every = C.streakBonusEvery || 0, bonus = C.streakBonus || 0;
  if (every > 0 && bonus > 0 && s.count >= 2 && s.count % every === 0) {
    addStars(who, bonus);
    streakCelebrate(who, s.count, bonus);
  }
  renderJars();
}
function streakCelebrate(who, count, bonus) {
  const fx = $("fx"); if (!fx) return;
  for (let i = 0; i < 14; i++) {
    const e = document.createElement("div");
    e.className = "icecream"; e.textContent = "🔥";
    e.style.left = (Math.random() * 100) + "%";
    e.style.fontSize = (22 + Math.random() * 22) + "px";
    e.style.animationDelay = (Math.random() * 0.8) + "s";
    fx.appendChild(e); setTimeout(() => e.remove(), 3200);
  }
  const banner = document.createElement("div");
  banner.className = "ice-banner";
  banner.textContent = `🔥 ${who} — ${count}-day streak! +${bonus} ⭐`;
  fx.appendChild(banner); setTimeout(() => banner.remove(), 3000);
}

// Flip a checkbox; returns true if it just became DONE (so we can celebrate).
// Kid chores also move stars into (or back out of) that kid's jar.
function toggleSlot(id, slot) {
  STATE.choreDone[id] = STATE.choreDone[id] || {};
  let nowDone;
  if (STATE.choreDone[id][slot]) { delete STATE.choreDone[id][slot]; nowDone = false; }
  else { STATE.choreDone[id][slot] = true; nowDone = true; }
  if (!Object.keys(STATE.choreDone[id]).length) delete STATE.choreDone[id];
  const c = choreById(id);
  if (c && isKid(c.who)) {
    addStars(c.who, (nowDone ? 1 : -1) * choreStars(c));
    if (nowDone) bumpStreak(c.who);
    renderJars();
  }
  renderHomeChores(); renderChart();
  saveState();
  return nowDone;
}

/* ---- kid-friendly celebration: a little confetti + an encouraging word,
        localized to where they tapped — never a full-screen takeover ---- */
const CHEERS = ["Great job!", "Nice!", "Woohoo!", "Way to go!", "Awesome!", "High five!", "You did it!", "Yay!",
  "Superstar! ⭐", "So proud!", "Incredible!", "You rock! 🎸", "Amazing!", "Keep it up!", "Winner! 🏆", "Nailed it!",
  "Brilliant! ✨", "You're the best!", "Too good! 💯", "On a roll! 🔥", "Unstoppable! 🚀", "Level up! 🎮", "So cool! 😎"];
const FUN_ANIMALS = ["🐰", "🐢"];   // the kids' favorites, always join the party
function celebrate(x, y, accent, who) {
  const fx = $("fx"); if (!fx) return;
  // Fall back to screen center if we don't have tap coordinates.
  if (!x && !y) { x = window.innerWidth / 2; y = window.innerHeight / 2; }
  const palette = [accent || "#F59E0B", "#3B82F6", "#8B5CF6", "#10B981", "#F472B6", "#FBBF24", "#38BDF8"];

  for (let i = 0; i < 18; i++) {
    const p = document.createElement("i");
    p.className = "confetti";
    const ang = Math.random() * Math.PI * 2;
    const dist = 45 + Math.random() * 85;
    p.style.left = x + "px";
    p.style.top = y + "px";
    p.style.background = palette[i % palette.length];
    p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
    p.style.setProperty("--dy", (Math.sin(ang) * dist - (25 + Math.random() * 45)) + "px");
    p.style.setProperty("--rot", (Math.random() * 600 - 300) + "deg");
    p.style.animationDelay = (Math.random() * 60) + "ms";
    fx.appendChild(p);
    setTimeout(() => p.remove(), 1200);
  }

  // Bunnies & turtles hop out — the person's own animal leads the way.
  const buddies = [];
  const mine = avatarOf(who);
  if (mine) buddies.push(mine);
  FUN_ANIMALS.forEach(a => { if (!buddies.includes(a)) buddies.push(a); });
  buddies.forEach((emo, i) => {
    const b = document.createElement("div");
    b.className = "buddy";
    const ang = (-Math.PI / 2) + (i - (buddies.length - 1) / 2) * 0.55;   // fan upward
    const dist = 72 + Math.random() * 46;
    b.textContent = emo;
    b.style.left = x + "px";
    b.style.top = y + "px";
    b.style.setProperty("--dx", Math.cos(ang) * dist + "px");
    b.style.setProperty("--dy", (Math.sin(ang) * dist) + "px");
    b.style.setProperty("--rot", (Math.random() * 36 - 18) + "deg");
    b.style.animationDelay = (i * 45) + "ms";
    fx.appendChild(b);
    setTimeout(() => b.remove(), 1500);
  });

  const msg = document.createElement("div");
  msg.className = "cheer";
  msg.textContent = CHEERS[Math.floor(Math.random() * CHEERS.length)];
  msg.style.left = x + "px";
  msg.style.top = (y - 26) + "px";
  msg.style.color = accent || "var(--good)";
  fx.appendChild(msg);
  setTimeout(() => msg.remove(), 1300);
}

// Compact list on the Home tab — today's status, tap to toggle.
function renderHomeChores() {
  // Still-to-do chores float to the top; completed ones sink to the bottom.
  const chores = effectiveChores().slice().sort((a, b) =>
    (isDone(a.id, slotFor(a)) ? 1 : 0) - (isDone(b.id, slotFor(b)) ? 1 : 0));
  $("choreList").innerHTML = chores.map(c => {
    const slot = slotFor(c), done = isDone(c.id, slot), col = color(c.who);
    const pic = isKid(c.who) ? `<span class="chore-pic">${chorePic(c)}</span>` : "";
    return `<div class="chore ${done ? "done" : ""} ${isKid(c.who) ? "kid" : ""}" data-id="${c.id}" data-slot="${slot}">
      <div class="chk"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></div>
      <div class="chore-name">${pic}${escapeHtml(c.name)}</div>
      ${c.cadence === "weekly" ? `<span class="chore-cadence">weekly</span>` : ""}
      <div class="${badgeClass(c.who)}" style="background:${col}" title="${escapeHtml(c.who || "")}">${badgeText(c.who)}</div>
    </div>`;
  }).join("");
  const done = chores.filter(c => isDone(c.id, slotFor(c))).length;
  $("choreProgress").textContent = `${done} of ${chores.length} done`;
}

// The full weekly grid on the Chores tab.
function renderChart() {
  const chores = effectiveChores();
  const ws = weekStartDate(), ti = todayIndex();
  let head = `<div class="cc-row cc-head"><div class="cc-name">This week</div>`;
  for (let i = 0; i < 7; i++) {
    const d = new Date(ws); d.setDate(d.getDate() + i);
    head += `<div class="cc-day ${i === ti ? "today" : ""}"><span>${DAY_ABBR[i]}</span><small>${d.getDate()}</small></div>`;
  }
  head += `</div>`;

  const chk = `<div class="chk"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></div>`;
  const rows = chores.map(c => {
    const col = color(c.who);
    let cells;
    if (c.cadence === "weekly") {
      const done = isDone(c.id, "w");
      cells = `<div class="cc-cell cc-week ${done ? "done" : ""}" data-id="${c.id}" data-slot="w">
        ${chk}<span class="cc-week-label">${done ? "Done this week" : "Tap when done"}</span></div>`;
    } else {
      cells = "";
      for (let i = 0; i < 7; i++) {
        cells += `<div class="cc-cell ${isDone(c.id, String(i)) ? "done" : ""} ${i === ti ? "today" : ""} ${i > ti ? "future" : ""}" data-id="${c.id}" data-slot="${i}">${chk}</div>`;
      }
    }
    const kid = isKid(c.who);
    const lead = kid
      ? `<span class="cc-pic">${chorePic(c)}</span>`
      : `<span class="${badgeClass(c.who)} sm" style="background:${col}" title="${escapeHtml(c.who || "")}">${badgeText(c.who)}</span>`;
    return `<div class="cc-row ${kid ? "kid" : ""} ${c.cadence === "weekly" ? "is-weekly" : ""}">
      <div class="cc-name">${lead}<span class="cc-title">${escapeHtml(c.name)}</span></div>${cells}</div>`;
  }).join("");

  $("choreChart").innerHTML = head + rows;

  // Per-person tally of boxes checked this week.
  const tally = {};
  chores.forEach(c => {
    const n = STATE.choreDone[c.id] ? Object.keys(STATE.choreDone[c.id]).length : 0;
    if (c.who && n) tally[c.who] = (tally[c.who] || 0) + n;
  });
  const summary = Object.entries(tally).map(([w, n]) => `${initials(w)} ${n}`).join("  ·  ");
  $("choreProgress2").textContent = summary || "Tap a box to check it off";
}

// A big (non-blocking) ice-cream shower when a kid redeems ice cream.
function iceCreamParty(who) {
  const fx = $("fx"); if (!fx) return;
  const scoops = ["🍦", "🍨", "🍧"];
  for (let i = 0; i < 26; i++) {
    const e = document.createElement("div");
    e.className = "icecream";
    e.textContent = scoops[i % scoops.length];
    e.style.left = (Math.random() * 100) + "%";
    e.style.fontSize = (24 + Math.random() * 28) + "px";
    e.style.animationDelay = (Math.random() * 0.9) + "s";
    e.style.animationDuration = (1.9 + Math.random() * 1.5) + "s";
    fx.appendChild(e);
    setTimeout(() => e.remove(), 3600);
  }
  const banner = document.createElement("div");
  banner.className = "ice-banner";
  const ice = C.rewardEmoji || "🍦";
  banner.textContent = `${ice} ${who || "The kids"} earned ${(C.rewardName || "ice cream").toUpperCase()}! ${ice}`;
  fx.appendChild(banner);
  setTimeout(() => banner.remove(), 3200);
}

/* ---- the Rewards tab: star jars + shop + kindness stars ---- */
// Each kid's jar: balance + a bar filling toward their next reward.
function jarsHTML() {
  const kids = C.kids || [];
  if (!kids.length) return "";
  const star = C.starEmoji || "⭐";
  return kids.map(k => {
    const bal = starsOf(k);
    const nxt = nextReward(bal);
    const pct = nxt ? Math.min(100, Math.round(bal / nxt.cost * 100)) : 100;
    const col = color(k);
    const ava = avatarOf(k) || initials(k);
    const sub = nxt
      ? `${nxt.cost - bal} to ${escapeHtml(nxt.name)} ${nxt.emoji}`
      : `everything unlocked!`;
    const st = streakOf(k);
    const streak = st >= 2 ? `<span class="jar-streak" title="${st}-day streak">🔥 ${st}</span>` : "";
    return `<div class="jar" style="--kidcol:${col}">
      <div class="jar-top">
        <span class="jar-ava ${avatarOf(k) ? "emoji" : ""}" style="background:${col}">${ava}</span>
        <span class="jar-name">${escapeHtml(k)}</span>
        ${streak}
        <span class="jar-bal">${bal} <span class="jar-star">${star}</span></span>
      </div>
      <div class="jar-track"><div class="jar-fill" style="width:${pct}%"></div></div>
      <div class="jar-sub">${sub}</div>
    </div>`;
  }).join("");
}
function renderJars() {
  const html = jarsHTML();
  for (const id of ["jars", "jarsHome"]) {
    const host = $(id); if (!host) continue;
    host.innerHTML = html;
    host.hidden = !html;
  }
}

// The shop: tap a reward to cash a kid's stars in for it.
function renderShop() {
  const host = $("rewardShop"); if (!host) return;
  const kids = C.kids || [];
  const star = C.starEmoji || "⭐";
  host.innerHTML = (C.rewards || []).map(rw => {
    const canAny = kids.some(k => starsOf(k) >= rw.cost);
    return `<div class="shop-item ${canAny ? "ready" : "locked"}" data-rid="${rw.id}">
      <div class="shop-emoji">${rw.emoji || "🎁"}</div>
      <div class="shop-name">${escapeHtml(rw.name)}</div>
      <div class="shop-cost">${canAny ? "" : "🔒 "}${rw.cost} ${star}</div>
    </div>`;
  }).join("");
}

// "Give a kindness star" — a parent hands out a ⭐ for good attitude / sharing.
function renderKindness() {
  const host = $("kindnessRow"); if (!host) return;
  const kids = C.kids || [];
  if (!kids.length) { host.innerHTML = ""; return; }
  const star = C.starEmoji || "⭐";
  host.innerHTML = `<span class="kindness-label">Helped, kind, or good behavior? Give a ${star}:</span>` +
    kids.map(k => `<button class="kindness-btn" data-kid="${escapeHtml(k)}" type="button" style="--kidcol:${color(k)}">
      <span class="kindness-ava ${avatarOf(k) ? "emoji" : ""}">${avatarOf(k) || initials(k)}</span>${escapeHtml(k)} +${star}</button>`).join("");
}

function renderRewardTab() { renderJars(); renderShop(); renderKindness(); }

/* ---- redeeming a reward (with the parent PIN) ---- */
let pendingRedeem = null;   // the reward chosen, awaiting a kid pick
function openRedeem(rid) {
  const rw = (C.rewards || []).find(r => r.id === rid); if (!rw) return;
  const kids = (C.kids || []);
  const affordable = kids.filter(k => starsOf(k) >= rw.cost);
  if (!affordable.length) return;   // nobody can afford it — the card is locked anyway
  pendingRedeem = rw;
  $("redeemEmoji").textContent = rw.emoji || "🎁";
  $("redeemTitle").textContent = rw.name;
  $("redeemCost").textContent = `${rw.cost} ${C.starEmoji || "⭐"}`;
  $("redeemKids").innerHTML = kids.map(k => {
    const ok = starsOf(k) >= rw.cost;
    return `<button class="redeem-kid ${ok ? "" : "disabled"}" data-kid="${escapeHtml(k)}" type="button" ${ok ? "" : "disabled"} style="--kidcol:${color(k)}">
      <span class="redeem-ava ${avatarOf(k) ? "emoji" : ""}">${avatarOf(k) || initials(k)}</span>
      <span class="redeem-kidname">${escapeHtml(k)}</span>
      <span class="redeem-kidbal">${starsOf(k)} ${C.starEmoji || "⭐"}</span>
    </button>`;
  }).join("");
  $("redeemModal").hidden = false;
}
function closeRedeem() { $("redeemModal").hidden = true; pendingRedeem = null; }

function doRedeem(kid) {
  const rw = pendingRedeem; if (!rw) return;
  if (starsOf(kid) < rw.cost) return;
  requirePin(() => {
    addStars(kid, -rw.cost);
    renderRewardTab(); saveState();
    closeRedeem();
    if (rw.id === "icecream") iceCreamParty(kid);
    else treatParty(rw.emoji || "🎁", `${kid} got ${rw.name}!`);
  });
}

// A celebratory shower of the reward's emoji + a banner (reuses the fx layer).
function treatParty(emoji, label) {
  const fx = $("fx"); if (!fx) return;
  for (let i = 0; i < 24; i++) {
    const e = document.createElement("div");
    e.className = "icecream";
    e.textContent = emoji;
    e.style.left = (Math.random() * 100) + "%";
    e.style.fontSize = (24 + Math.random() * 28) + "px";
    e.style.animationDelay = (Math.random() * 0.9) + "s";
    e.style.animationDuration = (1.9 + Math.random() * 1.5) + "s";
    fx.appendChild(e);
    setTimeout(() => e.remove(), 3600);
  }
  const banner = document.createElement("div");
  banner.className = "ice-banner";
  banner.textContent = `${emoji} ${label} ${emoji}`;
  fx.appendChild(banner);
  setTimeout(() => banner.remove(), 3200);
}

/* ---- parent PIN pad (soft lock for redeem + kindness stars) ---- */
let pinTarget = null, pinEntry = "";
function requirePin(onOk) {
  const pin = (C.parentPin || "").toString();
  if (!pin) { onOk(); return; }            // lock disabled
  pinTarget = onOk; pinEntry = "";
  renderPinDots();
  $("pinModal").hidden = false;
}
function renderPinDots() {
  const pin = (C.parentPin || "").toString();
  const len = Math.max(pin.length, 4);
  $("pinDots").innerHTML = Array.from({ length: len }, (_, i) =>
    `<span class="pin-dot ${i < pinEntry.length ? "on" : ""}"></span>`).join("");
}
function closePin() { $("pinModal").hidden = true; pinTarget = null; pinEntry = ""; $("pinDots").classList.remove("bad"); }
function pinKey(k) {
  const pin = (C.parentPin || "").toString();
  if (k === "c") return closePin();
  if (k === "x") { pinEntry = pinEntry.slice(0, -1); return renderPinDots(); }
  if (!/^\d$/.test(k)) return;
  if (pinEntry.length >= pin.length) return;
  pinEntry += k; renderPinDots();
  if (pinEntry.length === pin.length) {
    if (pinEntry === pin) {
      const cb = pinTarget; closePin(); if (cb) cb();
    } else {
      $("pinDots").classList.add("bad");
      setTimeout(() => { pinEntry = ""; renderPinDots(); $("pinDots").classList.remove("bad"); }, 600);
    }
  }
}

// Wire the Rewards tab interactions.
$("rewardShop")?.addEventListener("click", (e) => {
  const it = e.target.closest(".shop-item.ready");
  if (it) openRedeem(it.dataset.rid);
});
$("redeemKids")?.addEventListener("click", (e) => {
  const b = e.target.closest(".redeem-kid:not(.disabled)");
  if (b) doRedeem(b.dataset.kid);
});
$("redeemCancel")?.addEventListener("click", closeRedeem);
$("redeemModal")?.addEventListener("click", (e) => { if (e.target.id === "redeemModal") closeRedeem(); });
$("kindnessRow")?.addEventListener("click", (e) => {
  const b = e.target.closest(".kindness-btn");
  if (!b) return;
  const kid = b.dataset.kid;
  requirePin(() => {
    addStars(kid, 1);
    bumpStreak(kid);            // a kind/helpful act keeps the daily streak alive
    renderRewardTab(); saveState();
    const r = b.getBoundingClientRect();
    celebrate(r.left + r.width / 2, r.top + r.height / 2, color(kid), kid);
    starPop(r.left + r.width / 2, r.top, 1);
  });
});
$("pinPad")?.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-k]");
  if (b) pinKey(b.dataset.k);
});
$("pinModal")?.addEventListener("click", (e) => { if (e.target.id === "pinModal") closePin(); });

/* ---- editing the chore list (touchscreen) ---- */
let editingChores = false;

function peopleOptions(sel) {
  return Object.keys(C.people || {}).map(n =>
    `<option value="${escapeHtml(n)}" ${n === sel ? "selected" : ""}>${escapeHtml(n)}</option>`).join("");
}

// First edit copies the config defaults into state, then state is authoritative.
function customizeChores() {
  if (!Array.isArray(STATE.chores) || !STATE.chores.length) {
    STATE.chores = (C.chores || []).map(c => ({ id: c.id, name: c.name, who: c.who, cadence: c.cadence, pic: c.pic }));
  }
}
function addChore(name, who, cadence) {
  name = (name || "").trim(); if (!name) return;
  customizeChores();
  STATE.chores.push({ id: "c" + Date.now().toString(36), name, who: who || null, cadence: cadence === "weekly" ? "weekly" : "daily" });
  saveState(); renderEditor();
}
function deleteChore(id) {
  customizeChores();
  STATE.chores = STATE.chores.filter(c => c.id !== id);
  if (STATE.choreDone[id]) delete STATE.choreDone[id];
  saveState(); renderEditor();
}
function updateChore(id, field, val) {
  customizeChores();
  const c = STATE.chores.find(x => x.id === id);
  if (c) { c[field] = val; saveState(); }
}

function renderEditor() {
  const chores = effectiveChores();
  const rows = chores.map(c => `<div class="ce-row" data-id="${c.id}">
    <input class="ce-name" type="text" value="${escapeHtml(c.name)}" data-field="name" />
    <select class="ce-who" data-field="who">${peopleOptions(c.who)}</select>
    <select class="ce-cad" data-field="cadence">
      <option value="daily" ${c.cadence === "daily" ? "selected" : ""}>Daily</option>
      <option value="weekly" ${c.cadence === "weekly" ? "selected" : ""}>Weekly</option>
    </select>
    <button class="ce-del" data-del="${c.id}" type="button" aria-label="Delete">&times;</button>
  </div>`).join("");
  $("choreEditor").innerHTML = `<div class="ce-list">${rows}</div>
    <form class="ce-add" id="choreAddForm">
      <input class="ce-name" id="ceAddName" type="text" placeholder="New chore…" autocomplete="off" />
      <select class="ce-who" id="ceAddWho">${peopleOptions(Object.keys(C.people || {})[0])}</select>
      <select class="ce-cad" id="ceAddCad"><option value="daily">Daily</option><option value="weekly">Weekly</option></select>
      <button class="ce-addbtn" type="submit">Add</button>
    </form>`;
}

$("choreEditBtn").addEventListener("click", () => {
  editingChores = !editingChores;
  $("choreEditBtn").textContent = editingChores ? "Done" : "Edit";
  $("choreEditBtn").classList.toggle("active", editingChores);
  $("choreChart").hidden = editingChores;
  $("choreEditor").hidden = !editingChores;
  if (editingChores) renderEditor();
  else { renderChart(); renderHomeChores(); }
});

// Tap a grid cell (or a Home chore row) to check it off — celebrate on done.
function onChoreChecked(id, x, y) {
  const who = choreWho(id);
  celebrate(x, y, color(who), who);
  if (isKid(who)) starPop(x, y, choreStars(choreById(id)));
}

// A little "+3 ⭐" that floats up where the chore was tapped.
function starPop(x, y, amount) {
  const fx = $("fx"); if (!fx || !amount) return;
  if (!x && !y) { x = window.innerWidth / 2; y = window.innerHeight / 2; }
  const s = document.createElement("div");
  s.className = "starpop";
  s.textContent = `+${amount} ${C.starEmoji || "⭐"}`;
  s.style.left = x + "px";
  s.style.top = (y - 34) + "px";
  fx.appendChild(s);
  setTimeout(() => s.remove(), 1400);
}
$("choreChart").addEventListener("click", (e) => {
  const cell = e.target.closest(".cc-cell");
  if (cell && cell.dataset.id && toggleSlot(cell.dataset.id, cell.dataset.slot)) {
    onChoreChecked(cell.dataset.id, e.clientX, e.clientY);
  }
});
$("choreList").addEventListener("click", (e) => {
  const el = e.target.closest(".chore");
  if (el && toggleSlot(el.dataset.id, el.dataset.slot)) {
    onChoreChecked(el.dataset.id, e.clientX, e.clientY);
  }
});

// Editor: live-save name typing + who/cadence changes, handle delete + add.
function onEditorChange(e) {
  const row = e.target.closest(".ce-row");
  if (row && e.target.dataset.field) updateChore(row.dataset.id, e.target.dataset.field, e.target.value);
}
$("choreEditor").addEventListener("input", onEditorChange);
$("choreEditor").addEventListener("change", onEditorChange);
$("choreEditor").addEventListener("click", (e) => {
  const del = e.target.closest("[data-del]");
  if (del) deleteChore(del.dataset.del);
});
$("choreEditor").addEventListener("submit", (e) => {
  if (e.target.id !== "choreAddForm") return;
  e.preventDefault();
  addChore($("ceAddName").value, $("ceAddWho").value, $("ceAddCad").value);
  $("ceAddName").value = ""; $("ceAddName").focus();
});

/* ---------------------------------------------------------------- grocery */
function renderGrocery() {
  const list = STATE.grocery || [];
  const host = $("groceryList");
  let storeChanged = false;
  if (!list.length) {
    host.innerHTML = `<div class="grocery-empty">Nothing on the list yet — add something above.</div>`;
  } else {
    // Re-route every item with tonight's prices: family pick wins, else the
    // cheaper store, else whichever store we have a price for. This is what
    // makes it OBVIOUS why an item sits under Meijer or ALDI.
    list.forEach(g => {
      const pin = prefFor(g.text);
      const p = priceFor(g.text);
      let store = (pin && pin.store) || null;
      if (!store && p) {
        if (p.meijer != null && p.aldi != null) store = p.aldi < p.meijer ? "Aldi" : "Meijer";
        else if (p.meijer != null) store = "Meijer";
        else if (p.aldi != null) store = "Aldi";
      }
      store = store || g.store || null;
      if (store !== g.store) { g.store = store; storeChanged = true; }
    });

    // group by store so the list reads like the actual shopping trip
    const groups = [["Meijer", []], ["Aldi", []], ["Anywhere", []]];
    list.forEach(g => {
      const slot = g.store === "Meijer" ? 0 : g.store === "Aldi" ? 1 : 2;
      groups[slot][1].push(g);
    });
    const withItems = groups.filter(([, items]) => items.length);

    const money = n => "$" + n.toFixed(2);
    const chip = (label, cls, val, winner, pinned) => {
      if (val == null) return `<span class="pchip ghost">${label} —</span>`;
      return `<span class="pchip ${cls} ${winner ? "win" : ""}">${pinned ? "📌 " : ""}${label} ${money(val)}</span>`;
    };
    const row = g => {
      const p = priceFor(g.text);
      const pin = prefFor(g.text);
      const pinnedHere = !!(pin && pin.store && pin.store === g.store);
      // legacy auto-set "Meijer ~$x · ALDI ~$y" pref strings are replaced by chips
      const prefText = g.pref && !/~\$/.test(g.pref) ? `<span class="gitem-pref">${escapeHtml(g.pref)}</span>` : "";
      const deal = p && p.deal ? `<span class="gdeal">🏷 ${escapeHtml(p.deal)}</span>` : "";
      let prices = "";
      if (p && (p.meijer != null || p.aldi != null)) {
        const both = p.meijer != null && p.aldi != null;
        const meijerWins = g.store === "Meijer";
        const save = both ? Math.abs(p.meijer - p.aldi) : 0;
        prices = `<div class="gprices">
          ${chip("Meijer", "meijer", p.meijer, meijerWins, pinnedHere && meijerWins)}
          ${chip("ALDI", "aldi", p.aldi, !meijerWins && g.store === "Aldi", pinnedHere && g.store === "Aldi")}
          ${both && save >= 0.25 ? `<span class="gsave">save ${money(save)}</span>` : ""}
        </div>`;
      }
      return `<div class="gitem ${g.done ? "done" : ""}" data-id="${g.id}">
      <div class="chk gchk"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></div>
      <div class="gitem-text">${escapeHtml(g.text)}${prefText}${deal}</div>
      ${prices}
      <div class="gitem-x" data-remove="${g.id}" title="Remove">&times;</div>
    </div>`;
    };

    host.innerHTML = withItems.map(([store, items]) => {
      const open = items.filter(g => !g.done);
      // estimated basket for this store: chosen-store price of unchecked items
      const est = open.reduce((sum, g) => {
        const p = priceFor(g.text); if (!p) return sum;
        const v = store === "Aldi" ? p.aldi : p.meijer;
        return v != null ? sum + v : sum;
      }, 0);
      const head = `<div class="gstore-head"><span class="store-dot ${store === "Aldi" ? "aldi" : store === "Meijer" ? "meijer" : "any"}"></span>${store}<small>${open.length} to buy${est > 0 ? ` · ~${money(est)}` : ""}</small></div>`;
      return head + items.map(row).join("");
    }).join("");
  }
  const left = list.filter(g => !g.done).length;
  $("groceryCount").textContent = list.length ? `${left} to buy` : "empty";
  if (storeChanged) saveState();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

function addGrocery(text) {
  text = (text || "").trim();
  if (!text) return;
  STATE.grocery = STATE.grocery || [];
  const id = "g" + Date.now().toString(36);
  STATE.grocery.push({ id, text, done: false });
  renderGrocery(); saveState();
  priceItem(id, text);   // look up Meijer vs ALDI in the background
}

// Best-effort price check for a manually-added item: web-search both stores,
// tag the item with the prices, and point it at the cheaper store. Silent on
// failure — the item just stays as typed.
async function priceItem(id, text) {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 80000);
    const r = await fetch(`/api/price-item?item=${encodeURIComponent(text)}`, { cache: "no-store", signal: ctrl.signal });
    clearTimeout(to);
    const d = await r.json();
    if (!d || !d.ok) return;
    const g = (STATE.grocery || []).find(x => x.id === id);
    if (!g || g.done) return;                       // gone or bought already
    // stash the fresh prices in the client cache; renderGrocery routes the
    // item to the cheaper store and draws the price chips from PRICES
    PRICES[text.toLowerCase().replace(/\(.*?\)/g, " ").replace(/\s+/g, " ").trim()] =
      { meijer: d.meijer ?? null, aldi: d.aldi ?? null, at: new Date().toISOString() };
    renderGrocery(); saveState();
  } catch { /* estimates only — never block the list */ }
}
function toggleGrocery(id) {
  const g = (STATE.grocery || []).find(x => x.id === id);
  if (g) { g.done = !g.done; renderGrocery(); saveState(); }
}
function removeGrocery(id) {
  STATE.grocery = (STATE.grocery || []).filter(x => x.id !== id);
  renderGrocery(); saveState();
}

$("groceryAdd").addEventListener("submit", (e) => {
  e.preventDefault();
  const inp = $("groceryInput");
  addGrocery(inp.value);
  inp.value = ""; inp.focus();
});
$("groceryList").addEventListener("click", (e) => {
  const rm = e.target.closest("[data-remove]");
  if (rm) { e.stopPropagation(); return removeGrocery(rm.dataset.remove); }
  const item = e.target.closest(".gitem");
  if (item) toggleGrocery(item.dataset.id);
});

// Email the grocery list to Kenzie (server sends it via Gmail).
$("grocerySend")?.addEventListener("click", async () => {
  const btn = $("grocerySend"), status = $("grocerySendStatus");
  btn.disabled = true;
  status.className = "share-status"; status.textContent = "Sending…";
  try {
    const r = await fetch("/api/share-grocery", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const d = await r.json();
    if (d.ok) { status.classList.add("ok"); status.textContent = `Sent ${d.count} item${d.count === 1 ? "" : "s"} to Kenzie ✓`; }
    else { status.classList.add("err"); status.textContent = d.error || "Couldn't send."; }
  } catch {
    status.classList.add("err"); status.textContent = "Couldn't reach the server.";
  }
  setTimeout(() => { btn.disabled = false; }, 1200);
  setTimeout(() => { status.textContent = ""; status.className = "share-status"; }, 7000);
});

// Push the grocery list to Google Keep (syncs to Kenzie's phone).
$("groceryKeep")?.addEventListener("click", async () => {
  const btn = $("groceryKeep"), status = $("grocerySendStatus");
  btn.disabled = true;
  status.className = "share-status"; status.textContent = "Sending to Keep…";
  try {
    const r = await fetch("/api/keep-grocery", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const d = await r.json();
    if (d.ok) { status.classList.add("ok"); status.textContent = `Sent ${d.count} item${d.count === 1 ? "" : "s"} to Keep ✓`; }
    else { status.classList.add("err"); status.textContent = d.error || "Couldn't send to Keep."; }
  } catch {
    status.classList.add("err"); status.textContent = "Couldn't reach the server.";
  }
  setTimeout(() => { btn.disabled = false; }, 1200);
  setTimeout(() => { status.textContent = ""; status.className = "share-status"; }, 8000);
});

/* ---------------------------------------------------------------- calendar */
let liveEvents = null;   // set if an optional iCal feed is configured

// The dashboard's OWN calendar: events the family (or voice/Claude) adds, kept
// in state.json as { id, date:"YYYY-MM-DD", time:"HH:MM"|null, title, who }.
function localEventsAsOffsets() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return (STATE.events || []).map(ev => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ev.date || "");
    if (!m) return null;
    const dt = new Date(+m[1], +m[2] - 1, +m[3]); dt.setHours(0, 0, 0, 0);
    const d = Math.round((dt - today) / 86400000);
    let time = "All day";
    if (ev.time && /^\d{1,2}:\d{2}$/.test(ev.time)) {
      let [hh, mm] = ev.time.split(":").map(Number);
      const ap = hh >= 12 ? "p" : "a"; hh = hh % 12 || 12;
      time = `${hh}:${String(mm).padStart(2, "0")}${ap}`;
    }
    return { d, time, title: ev.title, who: ev.who || null };
  }).filter(e => e && e.d >= 0 && e.d <= 7);
}

function eventsForOffset() {
  // Dashboard-owned events + any optional iCal feed (no fake sample events).
  const source = [...localEventsAsOffsets(), ...(liveEvents || [])];
  const map = {};
  source.forEach(e => { (map[e.d] ||= []).push(e); });
  return map;
}

async function loadCalendar() {
  if (!C.calendarICalUrl) return;            // still using sample events
  try {
    const r = await fetch("/api/calendar?url=" + encodeURIComponent(C.calendarICalUrl), { cache: "no-store" });
    const data = await r.json();
    if (!Array.isArray(data.events)) return;
    const today = new Date(); today.setHours(0,0,0,0);
    liveEvents = data.events.map(ev => {
      const dt = new Date(ev.start);
      const d0 = new Date(dt); d0.setHours(0,0,0,0);
      const d = Math.round((d0 - today) / 86400000);
      let time = "All day";
      if (!ev.allDay) {
        let h = dt.getHours(); const ap = h >= 12 ? "p" : "a"; h = h % 12 || 12;
        time = `${h}:${String(dt.getMinutes()).padStart(2,"0")}${ap}`;
      }
      return { d, time, title: ev.title, who: ev.who || null };
    }).filter(e => e.d >= 0 && e.d <= 7);
    renderAgenda(); renderMonth();
  } catch { /* keep samples on failure */ }
}

function nextBirthday() {
  const list = C.birthdays || [];
  if (!list.length) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  let best = null;
  for (const b of list) {
    let next = new Date(now.getFullYear(), b.month - 1, b.day);
    if (next < now) next = new Date(now.getFullYear() + 1, b.month - 1, b.day);
    const days = Math.round((next - now) / 86400000);
    const turning = next.getFullYear() - b.born;
    if (!best || days < best.days) best = { name: b.name, days, turning, date: next };
  }
  return best;
}

// Shows a small banner 0–3 days before major fixed-date holidays.
function holidayBanner() {
  const n = new Date(); n.setHours(0, 0, 0, 0);
  const upcoming = [
    { month: 1,  day: 1,  name: "New Year's Day", emoji: "🎊", col: "#8B5CF6" },
    { month: 2,  day: 14, name: "Valentine's Day", emoji: "💝", col: "#F472B6" },
    { month: 7,  day: 4,  name: "July 4th",       emoji: "🎆", col: "#EF4444" },
    { month: 10, day: 31, name: "Halloween",       emoji: "🎃", col: "#F97316" },
    { month: 12, day: 25, name: "Christmas",       emoji: "🎄", col: "#10B981" },
  ];
  for (const h of upcoming) {
    const hd = new Date(n.getFullYear(), h.month - 1, h.day);
    const days = Math.round((hd - n) / 86400000);
    if (days < 0 || days > 3) continue;
    const when = days === 0 ? "Today! 🎇" : days === 1 ? "Tomorrow!" : `in ${days} days`;
    return `<div style="display:flex;align-items:center;gap:9px;background:${h.col}15;border:1px solid ${h.col}44;border-radius:var(--r-md);padding:5px 12px;margin-bottom:3px;">
      <span style="font-size:1.25em;line-height:1;flex-shrink:0">${h.emoji}</span>
      <div style="font-size:clamp(12px,1.15vw,15px);font-weight:600;">${h.name} — ${when}</div>
    </div>`;
  }
  return "";
}

function birthdayBanner() {
  const b = nextBirthday();
  if (!b) return "";
  const col = color(b.name);
  const soon = b.days <= 7;
  const whenText = b.days === 0 ? "today!" : b.days === 1 ? "tomorrow" : `in ${b.days} days`;
  const when = b.days === 0 ? `today! 🎉` : b.days <= 3 ? `${whenText} 🎈` : whenText;
  const dateStr = `${MON[b.date.getMonth()].slice(0,3)} ${b.date.getDate()}`;
  const avatar = (C.avatars || {})[b.name];
  const icon = avatar
    ? `<span style="font-size:1.6em;line-height:1;flex-shrink:0">${avatar}</span>`
    : `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="${col}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
        <path d="M4 20h16v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7z"/><path d="M4 15c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1"/>
        <line x1="12" y1="4" x2="12" y2="8"/><circle cx="12" cy="3" r="1" fill="${col}" stroke="none"/></svg>`;
  const bg = soon ? `${col}22` : `${col}14`;
  const border = soon ? `1.5px solid ${col}55` : `1px solid ${col}33`;
  return `<div style="display:flex;align-items:center;gap:10px;background:${bg};border:${border};border-radius:var(--r-md);padding:6px 12px;margin-bottom:3px;">
    ${icon}
    <div style="flex:1;font-size:clamp(12px,1.15vw,15px);font-weight:600;">${b.name} turns ${b.turning} ${when}</div>
    <div style="font-size:clamp(11px,1vw,13px);font-weight:700;color:${col};">${dateStr}</div>
  </div>`;
}

// Parse a formatted time label ("9:00a", "12:30p") to minutes; -1 if none.
function labelMins(lbl) {
  const m = /^(\d{1,2}):(\d{2})\s*([ap])/i.exec(lbl || "");
  if (!m) return -1;
  let h = (+m[1]) % 12; if (m[3].toLowerCase() === "p") h += 12;
  return h * 60 + (+m[2]);
}
// Merge dashboard-owned events (absolute dates) + the iCal feed (offsets) into
// a map keyed by YYYY-MM-DD, each a list of { timeLabel, title, who, mins }.
function buildWeekEvents() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const byDate = {};
  const add = (ds, e) => { (byDate[ds] ||= []).push(e); };
  (STATE.events || []).forEach(ev => {
    if (!ev || !ev.date) return;
    const tl = fmtEvTime(ev.time);
    add(ev.date, { timeLabel: tl, title: ev.title, who: ev.who, mins: ev.time ? labelMins(tl) : -1 });
  });
  (liveEvents || []).forEach(e => {
    const dt = new Date(today); dt.setDate(dt.getDate() + e.d);
    const allDay = e.time === "All day";
    add(ymd(dt), { timeLabel: allDay ? "" : e.time, title: e.title, who: e.who, mins: allDay ? -1 : labelMins(e.time) });
  });
  return byDate;
}

// Home: a week-planner strip — one column per day (Mon–Sun), today highlighted,
// events as color-coded pills. Tap any day to add an event right on the screen.
function renderAgenda() {
  const ws = weekStartDate(), ti = todayIndex();
  const byDate = buildWeekEvents();
  let cols = "";
  for (let i = 0; i < 7; i++) {
    const dt = new Date(ws); dt.setDate(dt.getDate() + i);
    const ds = ymd(dt);
    const evs = (byDate[ds] || []).slice().sort((a, b) => a.mins - b.mins);
    const pills = evs.length ? evs.map(e => {
      const col = e.who ? color(e.who) : "var(--accent)";
      return `<div class="ws-ev" style="border-left-color:${col};background:color-mix(in srgb, ${col} 13%, var(--card))">
        ${e.timeLabel ? `<span class="ws-evtime">${e.timeLabel}</span>` : ""}<span class="ws-evtitle">${escapeHtml(e.title)}</span></div>`;
    }).join("") : `<div class="ws-empty"></div>`;
    cols += `<div class="ws-col ${i === ti ? "today" : ""} ${i < ti ? "past" : ""}" data-date="${ds}">
      <div class="ws-dow">${DAY_ABBR[i]}</div><div class="ws-date">${dt.getDate()}</div>
      <div class="ws-evs">${pills}</div></div>`;
  }
  $("agenda").innerHTML = holidayBanner() + birthdayBanner() + `<div class="weekstrip">${cols}</div>`;
  // the wall answers "what's for dinner?" — tonight's plan in the card header
  const sub = $("homeCalSub");
  if (sub) {
    const tonight = mealPlanFor(weekKeyOf())[todayIndex()];
    if (tonight && tonight.dinner) sub.innerHTML = `🍽️ Tonight: <b>${escapeHtml(tonight.dinner)}</b>`;
    else if (tonight && tonight.out) sub.textContent = "🚗 Out tonight";
    else sub.textContent = "Tap a day to add";
  }
}
$("agenda").addEventListener("click", (e) => {
  const col = e.target.closest(".ws-col[data-date]");
  if (col) openEventEditor(col.dataset.date, null);
});

/* ---- month calendar (Calendar tab) — tap a day to add, an event to edit ---- */
function ymd(dt) { return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`; }
function fmtEvTime(t) {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return "";
  let [hh, mm] = t.split(":").map(Number); const ap = hh >= 12 ? "p" : "a"; hh = hh % 12 || 12;
  return `${hh}:${String(mm).padStart(2, "0")}${ap}`;
}
let calMonth = null;   // Date = first day of the displayed month
function renderMonth() {
  const grid = $("monthGrid"); if (!grid) return;
  const now = new Date();
  if (!calMonth) calMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const year = calMonth.getFullYear(), month = calMonth.getMonth();
  $("calTitle").textContent = `${MON[month]} ${year}`;
  $("calDow").innerHTML = DOWS.map(d => `<div class="cal-dow-cell">${d}</div>`).join("");

  const byDate = {};
  (STATE.events || []).forEach(e => { if (e && e.date) (byDate[e.date] ||= []).push(e); });
  const todayStr = ymd(now);
  const startDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let cells = "";
  for (let i = 0; i < startDow; i++) cells += `<div class="cal-cell blank"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const evs = (byDate[ds] || []).slice().sort((a, b) => (a.time || "0").localeCompare(b.time || "0"));
    const chips = evs.slice(0, 3).map(e => {
      const col = e.who ? color(e.who) : "var(--accent)";
      const t = fmtEvTime(e.time);
      return `<div class="cal-ev" data-eid="${e.id}" style="border-left-color:${col}">${t ? `<b>${t}</b> ` : ""}${escapeHtml(e.title)}</div>`;
    }).join("");
    const more = evs.length > 3 ? `<div class="cal-more">+${evs.length - 3} more</div>` : "";
    cells += `<div class="cal-cell ${ds === todayStr ? "today" : ""}" data-date="${ds}">
      <div class="cal-daynum">${d}</div>${chips}${more}</div>`;
  }
  grid.innerHTML = cells;
}

/* ---- event editor (touch) ---- */
let editingEventId = null, editingEventDate = null;
function prettyDate(ds) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ds || ""); if (!m) return "";
  const dt = new Date(+m[1], +m[2] - 1, +m[3]);
  return `${DOW[dt.getDay()]}, ${MON[dt.getMonth()].slice(0, 3)} ${dt.getDate()}`;
}
function openEventEditor(date, eventId) {
  let ev = null;
  if (eventId) { ev = (STATE.events || []).find(x => x.id === eventId); if (!ev) return; date = ev.date; }
  editingEventId = eventId || null; editingEventDate = date;
  $("eventModalTitle").textContent = eventId ? "Edit event" : "New event";
  $("evDateLabel").textContent = prettyDate(date);
  $("evTitle").value = ev ? ev.title : "";
  $("evWho").innerHTML = `<option value="">Anyone</option>` +
    Object.keys(C.people || {}).map(n => `<option value="${escapeHtml(n)}" ${ev && ev.who === n ? "selected" : ""}>${escapeHtml(n)}</option>`).join("");
  const allDay = ev ? !ev.time : false;
  $("evAllDay").checked = allDay;
  $("evTime").value = (ev && ev.time) ? ev.time : "";
  $("evTime").disabled = allDay;
  $("evDelete").hidden = !eventId;
  $("eventModal").hidden = false;
  setTimeout(() => { try { $("evTitle").focus(); } catch {} }, 60);
}
function closeEventEditor() { $("eventModal").hidden = true; }
function saveEvent() {
  const title = $("evTitle").value.trim();
  if (!title) { $("evTitle").focus(); return; }
  const allDay = $("evAllDay").checked;
  const time = allDay ? null : ($("evTime").value || null);
  const who = $("evWho").value || null;
  STATE.events = STATE.events || [];
  if (editingEventId) {
    const ev = STATE.events.find(x => x.id === editingEventId);
    if (ev) { ev.title = title; ev.time = time; ev.who = who; ev.date = editingEventDate; }
  } else {
    STATE.events.push({ id: "ev" + Date.now().toString(36), date: editingEventDate, time, title, who });
  }
  saveState(); closeEventEditor(); renderMonth(); renderAgenda();
}
function deleteEvent() {
  if (editingEventId) STATE.events = (STATE.events || []).filter(x => x.id !== editingEventId);
  saveState(); closeEventEditor(); renderMonth(); renderAgenda();
}

$("monthGrid").addEventListener("click", (e) => {
  const evEl = e.target.closest(".cal-ev");
  if (evEl) { e.stopPropagation(); return openEventEditor(null, evEl.dataset.eid); }
  const cell = e.target.closest(".cal-cell[data-date]");
  if (cell) openEventEditor(cell.dataset.date, null);
});
$("calPrev").addEventListener("click", () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1); renderMonth(); });
$("calNext").addEventListener("click", () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1); renderMonth(); });
$("calToday").addEventListener("click", () => { calMonth = null; renderMonth(); });
$("evAllDay").addEventListener("change", () => { $("evTime").disabled = $("evAllDay").checked; });
$("evSave").addEventListener("click", saveEvent);
$("evDelete").addEventListener("click", deleteEvent);
$("evCancel").addEventListener("click", closeEventEditor);
$("eventModal").addEventListener("click", (e) => { if (e.target.id === "eventModal") closeEventEditor(); });
$("evTitle").addEventListener("keydown", (e) => { if (e.key === "Enter") saveEvent(); });

/* ---------------------------------------------------------------- state I/O
   SAFETY: family data (chores, stars, meals, grocery) must never be lost.
   - Load retries 5x with backoff (a server restart during git pull recovers).
   - stateReady blocks saves until we've actually loaded — a failed boot can
     never overwrite good data on disk with empties.
   - If the server answers empty while we hold real data (a hiccup, not a
     reset), we keep ours instead of clobbering the screen.
   - The server keeps state.json.bak + hourly snapshots in data/backups/.     */
let stateReady = false;   // guards against overwriting disk if we never loaded

function hasMeaningfulData(s) {
  if (!s || typeof s !== "object") return false;
  return !!(Object.keys(s.stars || {}).length || (s.grocery || []).length ||
    (s.events || []).length || Object.keys(s.mealPlan || {}).length ||
    Object.keys(s.choreDone || {}).length || (s.chores || []).length ||
    Object.keys(s.itemPrefs || {}).length);
}
async function loadState() {
  const DEFAULTS = { choreDone: {}, choreWeek: null, grocery: [], events: [], stars: {}, streak: {}, mealPlan: {}, itemPrefs: {}, pantryNeed: {}, mealTarget: {}, shopSkip: {} };
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const r = await fetch("/api/state", { cache: "no-store" });
      const s = await r.json();
      // Server hiccup returning {} while we hold real data? Don't wipe ourselves.
      if (!hasMeaningfulData(s) && hasMeaningfulData(STATE)) { stateReady = true; return; }
      STATE = Object.assign({ ...DEFAULTS }, s);
      STATE.choreDone  = STATE.choreDone  || {};
      STATE.grocery    = STATE.grocery    || [];
      STATE.events     = STATE.events     || [];
      STATE.stars      = STATE.stars      || {};
      STATE.streak     = STATE.streak     || {};
      STATE.mealPlan   = STATE.mealPlan   || {};
      STATE.itemPrefs  = STATE.itemPrefs  || {};
      STATE.pantryNeed = STATE.pantryNeed || {};
      STATE.mealTarget = STATE.mealTarget || {};
      STATE.shopSkip = STATE.shopSkip || {};
      stateReady = true;
      return;
    } catch {
      if (attempt < 4) await new Promise(res => setTimeout(res, 2000 * (attempt + 1)));
    }
  }
  // All retries failed — KEEP whatever we already have in memory (never blank
  // a working screen). If we never had data, saves stay blocked.
  if (!hasMeaningfulData(STATE)) stateReady = false;
}

let saveTimer = null;
function saveState() {
  if (!stateReady) return;   // never overwrite disk if we couldn't load it
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(STATE),
    }).catch(() => {});
  }, 150);
}

/* ---------------------------------------------------------------- tabs */
$("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab"); if (!btn) return;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("is-active", t === btn));
  const view = btn.dataset.view;
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("is-active", v.id === `view-${view}`));
  if (view === "calendar") renderMonth();   // fresh month each time it opens
  if (view === "rewards") renderRewardTab();
  if (view === "meals") renderMeals();
});

/* ---------------------------------------------------------------- love note
   A sweet popup that greets someone (Kenzie) each morning at C.loveHour,
   rotating through C.loveMessages one per day. Shown once a day; dismiss by
   tapping. "Shown today" is remembered in localStorage (device-local).        */
function pickLoveMessage() {
  const msgs = C.loveMessages || [];
  if (!msgs.length) return null;
  const day = Math.floor(Date.now() / 86400000);   // rotates once per day
  return msgs[day % msgs.length];
}
function spawnLoveHearts() {
  const host = $("loveHearts"); if (!host) return;
  host.innerHTML = "";
  const glyphs = ["💚", "🖤", "💕", "🌴", "✨", "💗"];
  for (let i = 0; i < 14; i++) {
    const h = document.createElement("span");
    h.className = "love-heart";
    h.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
    h.style.left = (Math.random() * 100) + "%";
    h.style.fontSize = (18 + Math.random() * 26) + "px";
    h.style.animationDelay = (Math.random() * 2.2) + "s";
    h.style.animationDuration = (3.4 + Math.random() * 2.6) + "s";
    host.appendChild(h);
  }
}
function showLove() {
  const msg = pickLoveMessage(); if (!msg) return;
  $("loveMsg").textContent = msg;
  $("loveEyebrow").textContent = "Good morning, " + (C.loveTo || "beautiful") + " 💚";
  spawnLoveHearts();
  $("loveModal").hidden = false;
}
function hideLove() { $("loveModal").hidden = true; }
// One-time surprise note: shows immediately, once per distinct message.
function showLoveNow() {
  const msg = C.loveNow;
  if (!msg) return false;
  if (localStorage.getItem("loveNowSeen") === msg) return false;   // already shown this one
  localStorage.setItem("loveNowSeen", msg);
  $("loveMsg").textContent = msg;
  $("loveEyebrow").textContent = "💌 A surprise note for " + (C.loveTo || "you");
  spawnLoveHearts();
  $("loveModal").hidden = false;
  return true;
}
function maybeShowLove() {
  if (!C.loveTo || !(C.loveMessages || []).length) return;
  const target = (C.loveHour != null) ? C.loveHour : 7;
  const tk = todayKey();
  if (localStorage.getItem("loveLastShown") === tk) return;     // already greeted today
  const hr = new Date().getHours();
  if (hr < target || hr >= target + 6) return;                  // morning window only
  localStorage.setItem("loveLastShown", tk);
  showLove();
}
$("loveModal").addEventListener("click", hideLove);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { hideLove(); closeForecast(); } });

/* ---------------------------------------------------------------- voice assistant
   Tap the mic → speak → the command goes to /api/voice, which lets Claude Code
   do it (add a calendar event, grocery items from a recipe, change the app, …). */
const voiceSR = window.SpeechRecognition || window.webkitSpeechRecognition;
let voiceRec = null;

function voiceShow(state, status, text) {
  const m = $("voiceModal");
  m.hidden = false;
  m.dataset.state = state;
  $("voiceOrb").textContent = state === "thinking" ? "✨" : state === "done" ? "✅" : state === "error" ? "🤔" : "🎤";
  $("voiceStatus").textContent = status;
  $("voiceText").textContent = text || "";
  $("voiceCancel").textContent = state === "done" ? "Done" : state === "thinking" ? "Working…" : "Close";
}
function voiceHide() { $("voiceModal").hidden = true; }
function voiceStop() { if (voiceRec) { const r = voiceRec; voiceRec = null; try { r.abort(); } catch {} } }

function startVoice() {
  if (!voiceSR) { voiceShow("error", "This screen can't listen", "Use Edge or Chrome with a microphone."); return; }
  let finalText = "";
  const rec = new voiceSR();
  voiceRec = rec;
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  voiceShow("listening", "Listening…", "");
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t; else interim += t;
    }
    $("voiceText").textContent = (finalText + interim).trim();
  };
  rec.onerror = (e) => {
    if (voiceRec !== rec) return;
    voiceRec = null;
    if (e.error === "not-allowed" || e.error === "service-not-allowed")
      voiceShow("error", "Microphone blocked", "Allow mic access for this page, then try again.");
    else if (e.error === "no-speech")
      voiceShow("error", "Didn't hear anything", "Tap the mic and speak.");
    else voiceShow("error", "Couldn't listen", e.error || "");
  };
  rec.onend = () => {
    if (voiceRec !== rec) return;   // was aborted
    voiceRec = null;
    const cmd = finalText.trim();
    if (cmd) sendVoiceCommand(cmd);
    else voiceShow("error", "Didn't hear anything", "Tap the mic and speak.");
  };
  try { rec.start(); } catch {}
}

async function sendVoiceCommand(text) {
  voiceShow("thinking", "On it…", text);
  try {
    const r = await fetch("/api/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    const data = await r.json();
    if (data.ok) {
      voiceShow("done", data.summary || "Done!", "");
      await loadState(); ensureWeek();
      renderHomeChores(); renderChart(); renderRewardTab(); renderGrocery(); renderAgenda(); renderMonth();
      setTimeout(() => { if ($("voiceModal").dataset.state === "done") voiceHide(); }, 6000);
    } else {
      voiceShow("error", "Hmm", data.error || "Couldn't do that.");
    }
  } catch {
    voiceShow("error", "Couldn't reach the assistant", "Is the dashboard server running?");
  }
}

$("voiceBtn").addEventListener("click", startVoice);
$("voiceCancel").addEventListener("click", () => { voiceStop(); voiceHide(); });
$("voiceModal").addEventListener("click", (e) => { if (e.target.id === "voiceModal") { voiceStop(); voiceHide(); } });

/* ---------------------------------------------------------------- photo reel
   A slow family-photo slideshow behind frosted-glass cards. Reads the photo
   list from /api/photos (files dropped into data/photos/ on the Surface).
   Only turns on when config.photoTheme is true AND there are photos; otherwise
   the calm sage / weather-reactive background stays exactly as it was.        */
let reelPhotos = [], reelIdx = 0, reelLayer = 0, reelTimer = null;
// Whether the photo theme is on. config.photoTheme is the real switch, but
// ?glass=1 / ?glass=0 in the URL forces it on/off for previewing on a PC
// without changing what the wall does.
function photoThemeOn() {
  try {
    const g = new URLSearchParams(location.search).get("glass");
    if (g === "1") return true;
    if (g === "0") return false;
  } catch {}
  return !!C.photoTheme;
}
function glassOn() { return photoThemeOn() && reelPhotos.length > 0; }

async function loadPhotos() {
  try {
    const r = await fetch("/api/photos", { cache: "no-store" });
    const d = await r.json();
    const next = Array.isArray(d.photos) ? d.photos : [];
    const changed = next.join("|") !== reelPhotos.join("|");
    reelPhotos = next;
    if (changed) applySkin();
  } catch { /* keep whatever we have */ }
}
function applySkin() {
  const on = glassOn();
  document.documentElement.setAttribute("data-skin", on ? "glass" : "plain");
  if (on) startReel(); else stopReel();
}
function showPhoto(src) {
  const layers = [$("reelA"), $("reelB")];
  const next = layers[reelLayer ^ 1];
  next.style.backgroundImage = `url("${src}")`;
  next.classList.remove("kb"); void next.offsetWidth; next.classList.add("kb", "show");
  layers[reelLayer].classList.remove("show");
  reelLayer ^= 1;
}
function nextPhoto() {
  if (reelPhotos.length < 2) return;
  reelIdx = (reelIdx + 1) % reelPhotos.length;
  showPhoto(reelPhotos[reelIdx]);
}
function startReel() {
  if (!reelPhotos.length) return;
  reelIdx = 0; showPhoto(reelPhotos[0]);
  clearInterval(reelTimer);
  reelTimer = setInterval(nextPhoto, Math.max(8, (C.photoIntervalSec || 45)) * 1000);
}
function stopReel() {
  clearInterval(reelTimer); reelTimer = null;
  ["reelA", "reelB"].forEach(id => { const l = $(id); if (l) { l.classList.remove("show", "kb"); l.style.backgroundImage = ""; } });
}

/* ---------------------------------------------------------------- meals & groceries
   Kenzie plans dinners for the week; the app builds the grocery list from the
   recipes + weekly staples, split by store, with remembered preferences.      */
let mealOffset = 0;   // 0 = this week, +1 = next week …
function mealsCfg() { return C.meals || {}; }
function recipeById(id) { return (mealsCfg().recipes || []).find(r => r.id === id) || null; }
function mealWeekStart() { const d = new Date(); d.setDate(d.getDate() + mealOffset * 7); return weekStartDate(d); }
function mealWeekKey() { return weekKeyOf(mealWeekStart()); }
function pantrySet() { return new Set((mealsCfg().pantry || []).map(s => s.toLowerCase())); }
function mealPlanFor(wk) { return ((STATE.mealPlan || {})[wk]) || {}; }
function setNight(wk, day, val) {
  STATE.mealPlan = STATE.mealPlan || {};
  STATE.mealPlan[wk] = STATE.mealPlan[wk] || {};
  if (val == null) delete STATE.mealPlan[wk][day];
  else STATE.mealPlan[wk][day] = val;
  saveState();
}

// Remembered preferences (per item) — what brand/product the family likes.
function prefFor(item) { return (STATE.itemPrefs || {})[item.toLowerCase()] || null; }
function setPref(item, pref, store) {
  STATE.itemPrefs = STATE.itemPrefs || {};
  STATE.itemPrefs[item.toLowerCase()] = { pref: pref || "", store: store || null };
  saveState();
}

// Live Meijer/ALDI prices — merged from the nightly cloud sweep (public/
// prices.json, committed to the repo) + on-demand local lookups. Used to pick
// the cheaper store and show prices/deals on the shopping list.
let PRICES = {};
async function loadPrices() {
  try {
    const r = await fetch("/api/prices", { cache: "no-store" });
    const d = await r.json();
    if (d && d.ok && d.prices) { PRICES = d.prices; renderShopList(); renderDeals(); renderGrocery(); }
  } catch {}
}
// Fuzzy: "Whole milk (3 gallons)" should match the "whole milk" price entry.
// Exact key first, else the longest key contained in the text (or vice versa).
function priceFor(item) {
  const t = String(item || "").toLowerCase().replace(/\(.*?\)/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (PRICES[t]) return PRICES[t];
  let best = null, bestLen = 0;
  for (const [k, v] of Object.entries(PRICES)) {
    if ((t.includes(k) || k.includes(t)) && k.length > bestLen) { best = v; bestLen = k.length; }
  }
  return best;
}

// Which store an item comes from, in priority order:
//   1. the family's explicit preference (✎ "what we like")
//   2. whichever store is CHEAPER when we know both prices
//   3. the recipe's default store, else Meijer
function itemStore(item, baseStore) {
  const p = prefFor(item);
  if (p && p.store) return p.store;
  const pr = priceFor(item);
  if (pr && pr.meijer != null && pr.aldi != null) return pr.aldi < pr.meijer ? "Aldi" : "Meijer";
  return baseStore || "Meijer";
}
function itemPrefText(item, store) { const p = prefFor(item); return (p && p.pref) ? p.pref : `${store} brand`; }

// Build the week's shopping list: weekly staples + non-pantry recipe items.
function buildShoppingList(wk) {
  const plan = mealPlanFor(wk), pan = pantrySet(), map = {};
  function add(name, baseStore, qty, source) {
    const key = name.toLowerCase(), store = itemStore(name, baseStore);
    if (!map[key]) map[key] = { name, store, qty: qty || "", sources: [] };
    if (qty && !map[key].qty) map[key].qty = qty;
    if (source && !map[key].sources.includes(source)) map[key].sources.push(source);
  }
  (mealsCfg().weekly || []).forEach(w => add(w.item, w.store, w.qty, "weekly"));
  Object.values(plan).forEach(night => {
    if (!night || night.out) return;
    // a config staple recipe, or a picked recipe carrying its own ingredients
    const r = night.recipeId ? recipeById(night.recipeId) : null;
    const ings = r ? (r.ingredients || []) : (night.ingredients || []);
    const label = r ? r.name : night.dinner;
    ings.forEach(ing => {
      const o = (typeof ing === "string") ? { item: ing } : ing;
      if (!o || !o.item) return;
      if (o.pantry || pan.has(o.item.toLowerCase())) return;   // assumed on-hand
      add(o.item, o.store, "", label);
    });
  });
  return Object.values(map);
}

function mealWeekLabelText(ws) {
  const end = new Date(ws); end.setDate(end.getDate() + 6);
  const tag = mealOffset === 0 ? " · this week" : mealOffset === 1 ? " · next week" : "";
  return `${MON[ws.getMonth()].slice(0, 3)} ${ws.getDate()} – ${MON[end.getMonth()].slice(0, 3)} ${end.getDate()}${tag}`;
}
function renderMealWeek() {
  const host = $("mealWeek"); if (!host) return;
  const ws = mealWeekStart(), wk = mealWeekKey(), plan = mealPlanFor(wk);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  $("mealWeekLabel").textContent = mealWeekLabelText(ws);
  let html = "";
  for (let i = 0; i < 7; i++) {
    const dt = new Date(ws); dt.setDate(dt.getDate() + i);
    const night = plan[i];
    let label, cls = "";
    let linkBtn = "";
    if (night && night.out) { label = "🚗 Out / away"; cls = "out"; }
    else if (night && night.dinner) {
      label = `${night.emoji ? night.emoji + " " : ""}${escapeHtml(night.dinner)}` +
        (night.source ? `<small class="meal-src">${escapeHtml(night.source)}</small>` : "");
      if (night.source || night.url)
        linkBtn = `<span class="meal-recipe-link" data-url="${recipeUrl({ name: night.dinner, source: night.source, url: night.url })}" title="Open the recipe">recipe ↗</span>`;
    }
    else { label = `<span class="meal-empty">Tap to choose…</span>`; cls = "empty"; }
    html += `<button class="meal-night ${dt.getTime() === today.getTime() ? "today" : ""} ${cls}" data-day="${i}" type="button">
      <span class="meal-dow">${DAY_ABBR[i]} <small>${dt.getMonth() + 1}/${dt.getDate()}</small></span>
      <span class="meal-dinner">${label}</span>${linkBtn}
    </button>`;
  }
  host.innerHTML = html;
}
// Which items she's marked "already have it" this week (excluded from the cart).
function skipSetFor(wk) { return (STATE.shopSkip || {})[wk] || {}; }
function toggleSkip(wk, item) {
  STATE.shopSkip = STATE.shopSkip || {};
  const s = STATE.shopSkip[wk] = STATE.shopSkip[wk] || {};
  const k = item.toLowerCase();
  if (s[k]) delete s[k]; else s[k] = true;
  saveState();
}
function renderShopList() {
  const host = $("shopList"); if (!host) return;
  const wk = mealWeekKey(), skip = skipSetFor(wk);
  const items = buildShoppingList(wk);
  if (!items.length) { host.innerHTML = `<div class="shop-empty">Plan some dinners above and your list builds itself.</div>`; return; }
  let html = "";
  ["Meijer", "Aldi"].forEach(store => {
    const its = items.filter(x => x.store === store);
    if (!its.length) return;
    const active = its.filter(it => !skip[it.name.toLowerCase()]).length;
    html += `<div class="shop-store"><div class="shop-store-head"><span class="store-dot ${store === "Aldi" ? "aldi" : "meijer"}"></span>${store}<small>${active} to buy</small></div>`;
    html += its.map(it => {
      const skipped = !!skip[it.name.toLowerCase()];
      const pr = priceFor(it.name);
      let priceHtml = "";
      if (pr && !skipped) {
        const own = it.store === "Aldi" ? pr.aldi : pr.meijer;
        const other = it.store === "Aldi" ? pr.meijer : pr.aldi;
        if (own != null) priceHtml += `<span class="shop-price">~$${own.toFixed(2)}</span>`;
        if (own != null && other != null && other - own >= 0.25)
          priceHtml += `<span class="deal-badge">save $${(other - own).toFixed(2)}</span>`;
        if (pr.deal) priceHtml += `<span class="deal-badge">🏷 ${escapeHtml(pr.deal)}</span>`;
      }
      return `<div class="shop-row ${skipped ? "skipped" : ""}" data-skipitem="${escapeHtml(it.name)}">
        <span class="shop-have ${skipped ? "on" : ""}" title="Tap if you already have it">${skipped ? "✓" : ""}</span>
        <span class="shop-name">${escapeHtml(it.name)}${it.qty ? ` <span class="shop-qty">${escapeHtml(it.qty)}</span>` : ""}${priceHtml}</span>
        <span class="shop-pref">${skipped ? "already have it" : escapeHtml(itemPrefText(it.name, it.store))}</span>
        <a class="shop-link" href="${storeSearchUrl(it.store, it.name)}" target="_blank" rel="noopener" title="See it at ${it.store}">↗</a>
        <button class="shop-edit" data-item="${escapeHtml(it.name)}" data-store="${it.store}" type="button" aria-label="Set what we like">✎</button>
      </div>`;
    }).join("");
    html += `</div>`;
  });
  html += `<div class="shop-hint">Tap an item you already have — it's skipped when the list goes to the cart.</div>`;
  host.innerHTML = html;
}
function renderPantryCheck() {
  const host = $("pantryCheck"); if (!host) return;
  const need = STATE.pantryNeed || {};
  host.innerHTML = (mealsCfg().pantry || []).map(it =>
    `<button class="pantry-item ${need[it.toLowerCase()] ? "on" : ""}" data-pan="${escapeHtml(it)}" type="button">${escapeHtml(it)}</button>`).join("");
}
function renderMeals() {
  renderMealWeek(); renderShopList(); renderPantryCheck(); renderPicks(); renderDeals(); renderCartStatus();
  const v = $("mealTargetVal"); if (v) v.textContent = mealTarget(mealWeekKey());
  primeIdeas();   // warm fresh ideas in the background so taps stay instant
}

// How many home-cooked dinners to aim for this week (Kenzie can set it; the
// default follows the season). Pizza counts as one.
function currentSeason() {
  const m = new Date().getMonth();
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "fall";
  if (m === 11 || m <= 1) return "winter";
  return "spring";
}
function mealTarget(wk) {
  const t = (STATE.mealTarget || {})[wk];
  if (t != null) return t;
  const ws = mealWeekStart(), isSummer = ws.getMonth() >= 5 && ws.getMonth() <= 7;
  return isSummer ? (mealsCfg().homeDinnersSummer || 4) : (mealsCfg().homeDinners || 5);
}
function setMealTarget(wk, n) {
  STATE.mealTarget = STATE.mealTarget || {};
  STATE.mealTarget[wk] = Math.max(0, Math.min(7, n));
  saveState();
}

// Fresh dinner ideas — live from Claude (seasonal + weather-aware) when it's
// signed in here, else a season-tagged fallback list. Cached for the session.
let ideaCache = [];
async function fetchMealIdeas(n) {
  try {
    const w = lastWeather || {};
    const qs = `n=${n}&season=${currentSeason()}&temp=${w.temperature_F != null ? Math.round(w.temperature_F) : ""}&cond=${encodeURIComponent(w.condition || "")}`;
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 35000);
    const r = await fetch(`/api/meal-ideas?${qs}`, { cache: "no-store", signal: ctrl.signal });
    clearTimeout(to);
    const d = await r.json();
    if (d && d.ok && Array.isArray(d.ideas) && d.ideas.length) return d.ideas;
  } catch {}
  const m = mealsCfg();   // fall back to the seasonal bank
  const pool = (m.seasonalIdeas && m.seasonalIdeas[currentSeason()]) || m.newIdeas || [];
  return pool.slice().sort(() => Math.random() - 0.5).slice(0, n);
}
// An instant seasonal idea (no network) for snappy taps.
function instantIdea() {
  const m = mealsCfg();
  const pool = (m.seasonalIdeas && m.seasonalIdeas[currentSeason()]) || m.newIdeas || [];
  return pool[Math.floor(Math.random() * pool.length)] || "Something new";
}
// Warm the cache in the background (one in-flight fetch at a time). When Claude
// is signed in here, the cache fills with live ideas; taps stay instant.
let ideaFetching = false;
function primeIdeas() {
  if (ideaFetching || ideaCache.length >= 3) return;
  ideaFetching = true;
  fetchMealIdeas(6).then(list => { (list || []).forEach(x => { if (!ideaCache.includes(x)) ideaCache.push(x); }); }).finally(() => { ideaFetching = false; });
}
// Never blocks: a cached (Claude) idea if we have one, else an instant seasonal one.
function nextIdeaInstant() { primeIdeas(); return ideaCache.length ? ideaCache.shift() : instantIdea(); }

/* ---- weekly recipe picks: REAL recipes from great cooks, never AI slop ----
   Live picks come from /api/recipe-picks (Claude web-searches top sources,
   cached per week). The curated config.meals.featured classics fill in
   underneath so the row is always full of quality. Picking one puts it on a
   night WITH its ingredients, which flow straight into the shopping list.   */
let recipePicks = [];
function seasonalFeatured() {
  const s = currentSeason();
  return (mealsCfg().featured || []).filter(f => !f.seasons || f.seasons.includes(s));
}
function allPicks() {
  const seen = new Set(recipePicks.map(p => (p.name || "").toLowerCase()));
  return recipePicks.concat(seasonalFeatured().filter(f => !seen.has(f.name.toLowerCase())));
}
async function loadRecipePicks(refresh) {
  const btn = $("pickRefresh");
  if (refresh && btn) { btn.disabled = true; btn.classList.add("spin"); }
  try {
    const w = lastWeather || {};
    const qs = `season=${currentSeason()}&temp=${w.temperature_F != null ? Math.round(w.temperature_F) : ""}&cond=${encodeURIComponent(w.condition || "")}` + (refresh ? "&refresh=1" : "");
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 95000);
    const r = await fetch(`/api/recipe-picks?${qs}`, { cache: "no-store", signal: ctrl.signal });
    clearTimeout(to);
    const d = await r.json();
    if (d && d.ok && Array.isArray(d.picks) && d.picks.length) recipePicks = d.picks;
  } catch { /* featured classics carry the row */ }
  if (btn) { btn.disabled = false; btn.classList.remove("spin"); }
  renderPicks();
}
function renderPicks() {
  const host = $("mealPicks"); if (!host) return;
  const picks = allPicks();
  const sub = $("picksSub");
  if (sub) sub.textContent = recipePicks.length ? "fresh finds for this week's weather" : "from chefs & kitchens we trust";
  host.innerHTML = picks.map((p, i) => `<button class="pick-card" data-pick="${i}" type="button">
      <span class="pick-emoji">${p.emoji || "🍽️"}</span>
      <span class="pick-name">${escapeHtml(p.name)}</span>
      <span class="pick-src">${escapeHtml(p.source || "")}</span>
      <span class="pick-meta">${p.time ? escapeHtml(p.time) : ""}${p.ingredients ? ` · ${p.ingredients.length} ingredients` : ""}</span>
    </button>`).join("");
}

/* ---- night chooser: tap a pick → choose which evening it goes on ---- */
let pendingPick = null;
// A link to the actual recipe: the verified URL from the weekly search, or a
// search for "name + source + recipe" so there's ALWAYS a way to the method.
function recipeUrl(p) {
  if (p && p.url) return p.url;
  const q = encodeURIComponent(`${p.name} ${p.source || ""} recipe`.trim());
  return `https://www.google.com/search?q=${q}`;
}
function pickAsNight(p) {
  return { dinner: p.name, emoji: p.emoji || "🍽️", source: p.source || null,
    url: (p.url || null), ingredients: (p.ingredients || []).slice(), out: false };
}
function openNightChooser(p) {
  pendingPick = p;
  const ings = (p.ingredients || []).map(x => typeof x === "string" ? x : x.item).join(", ");
  $("nightRecipe").innerHTML = `<span class="pick-emoji">${p.emoji || "🍽️"}</span>
    <div class="night-r-body"><div class="night-r-name">${escapeHtml(p.name)}</div>
    <div class="night-r-src">${escapeHtml(p.source || "")}
      · <a class="night-r-link" href="${recipeUrl(p)}" target="_blank" rel="noopener">view recipe ↗</a></div>
    ${ings ? `<div class="night-r-ings">${escapeHtml(ings)}</div>` : ""}</div>`;
  const ws = mealWeekStart(), plan = mealPlanFor(mealWeekKey());
  let html = "";
  for (let i = 0; i < 7; i++) {
    const dt = new Date(ws); dt.setDate(dt.getDate() + i);
    const n = plan[i];
    const cur = n ? (n.out ? "🚗 out" : (n.dinner || "")) : "free";
    html += `<button class="night-opt ${n ? "" : "free"}" data-day="${i}" type="button">
      <b>${DAY_ABBR[i]} ${dt.getMonth() + 1}/${dt.getDate()}</b><small>${escapeHtml(String(cur).slice(0, 22))}</small></button>`;
  }
  $("nightOptions").innerHTML = html;
  $("nightModal").hidden = false;
}
function closeNightChooser() { $("nightModal").hidden = true; pendingPick = null; }
$("mealPicks")?.addEventListener("click", e => {
  const b = e.target.closest(".pick-card"); if (!b) return;
  const p = allPicks()[+b.dataset.pick]; if (p) openNightChooser(p);
});
$("nightOptions")?.addEventListener("click", e => {
  const b = e.target.closest(".night-opt"); if (!b || !pendingPick) return;
  setNight(mealWeekKey(), +b.dataset.day, pickAsNight(pendingPick));
  closeNightChooser(); renderMeals();
});
$("nightClose")?.addEventListener("click", closeNightChooser);
$("nightModal")?.addEventListener("click", e => { if (e.target.id === "nightModal") closeNightChooser(); });
$("pickRefresh")?.addEventListener("click", () => loadRecipePicks(true));

/* ---- store + deal links (the "find it cheap" layer) ---- */
function storeSearchUrl(store, item) {
  const q = encodeURIComponent(item);
  return store === "Aldi" ? `https://new.aldi.us/results?q=${q}`
                          : `https://www.meijer.com/shopping/search.html?text=${q}`;
}
function dealsRowHTML() {
  const links = mealsCfg().dealLinks || [];
  if (!links.length) return "";
  return `<span class="deals-label">💰 Deals:</span>` + links.map(l =>
    `<a class="deal-chip" href="${l.url}" target="_blank" rel="noopener">${escapeHtml(l.name)}</a>`).join("");
}
function renderDeals() {
  for (const id of ["mealDeals", "groceryDeals"]) {
    const host = $(id); if (host) host.innerHTML = dealsRowHTML();
  }
}

// "✨ Plan my week" — instantly fill a sensible draft she can edit. Honors the
// dinner target, puts pizza on Saturday, mixes in seasonal ideas, and avoids
// last week's meals. (The live-Claude ideas power the 🎲 New idea button.)
function planMyWeek() {
  const wk = mealWeekKey(), ws = mealWeekStart(), m = mealsCfg();
  const targetHome = mealTarget(wk);
  const pizzaDay = (m.pizzaDay != null) ? m.pizzaDay : 5;
  const plan = {};
  let cookSlots = targetHome;
  if (targetHome >= 1) { plan[pizzaDay] = { dinner: m.pizzaName || "Pizza night 🍕", recipeId: "pizza", out: false }; cookSlots--; }
  const prevStart = new Date(ws); prevStart.setDate(prevStart.getDate() - 7);
  const usedLastWeek = new Set(Object.values(mealPlanFor(weekKeyOf(prevStart))).map(n => n && n.dinner).filter(Boolean));
  let recipes = (m.recipes || []).slice().sort(() => Math.random() - 0.5);
  recipes.sort((a, b) => (usedLastWeek.has(a.name) ? 1 : 0) - (usedLastWeek.has(b.name) ? 1 : 0));
  const picks = [];
  const ideaCount = cookSlots >= 4 ? 2 : (cookSlots >= 2 ? 1 : 0);
  // fresh slots come from the real-recipe picks (with ingredients); fall back
  // to the seasonal name bank only if no picks are available
  const quality = allPicks().filter(p => !usedLastWeek.has(p.name)).sort(() => Math.random() - 0.5);
  const pool = quality.length ? quality
    : (ideaCache.length ? ideaCache.slice() : ((m.seasonalIdeas && m.seasonalIdeas[currentSeason()]) || m.newIdeas || [])).slice().sort(() => Math.random() - 0.5);
  for (let i = 0; i < ideaCount && i < pool.length; i++) {
    picks.push(typeof pool[i] === "string" ? { dinner: pool[i], out: false } : pickAsNight(pool[i]));
    cookSlots--;
  }
  for (const r of recipes) { if (cookSlots <= 0) break; picks.push({ dinner: r.name, emoji: r.emoji, recipeId: r.id, out: false }); cookSlots--; }
  let pi = 0;
  for (let d = 0; d < 7; d++) {
    if (plan[d]) continue;                 // pizza day already set
    plan[d] = (pi < picks.length) ? picks[pi++] : { out: true };
  }
  STATE.mealPlan = STATE.mealPlan || {};
  STATE.mealPlan[wk] = plan;
  saveState(); renderMeals();
}

// Push the built list (+ any "running low" pantry items) into the grocery tab.
function sendShopToGrocery() {
  const wk = mealWeekKey(), skip = skipSetFor(wk);
  const items = buildShoppingList(wk).filter(it => !skip[it.name.toLowerCase()]);
  const need = STATE.pantryNeed || {};
  (mealsCfg().pantry || []).forEach(it => { if (need[it.toLowerCase()]) items.push({ name: it, store: itemStore(it, "Meijer"), qty: "", sources: ["pantry"] }); });
  STATE.grocery = STATE.grocery || [];
  let added = 0;
  items.forEach(it => {
    const text = it.name + (it.qty ? ` (${it.qty})` : "");
    if (STATE.grocery.some(g => (g.text || "").toLowerCase() === text.toLowerCase() && !g.done)) return;
    STATE.grocery.push({ id: "g" + Date.now().toString(36) + Math.floor(Math.random() * 1000), text, done: false, store: it.store, pref: itemPrefText(it.name, it.store) });
    added++;
  });
  STATE.pantryNeed = {};
  saveState(); renderGrocery(); renderPantryCheck();
  const st = $("mealShopStatus");
  if (st) { st.className = "share-status ok"; st.textContent = `Added ${added} item${added === 1 ? "" : "s"} to the grocery list ✓`; setTimeout(() => { st.textContent = ""; st.className = "share-status"; }, 6000); }
}

// "🛒 Build my carts" — freeze this week's final order (unskipped items +
// weekly staples + flagged pantry restocks, with stores & preferences) into
// STATE.cartRequest. Claude on the main PC reads it and fills the Meijer +
// Aldi carts in Chrome, then emails the cart links to review & buy.
function buildCartOrder() {
  const wk = mealWeekKey(), skip = skipSetFor(wk);
  const items = buildShoppingList(wk).filter(it => !skip[it.name.toLowerCase()]);
  const need = STATE.pantryNeed || {};
  (mealsCfg().pantry || []).forEach(it => {
    if (need[it.toLowerCase()]) items.push({ name: it, store: itemStore(it, "Meijer"), qty: "", sources: ["pantry"] });
  });
  const st = $("mealShopStatus");
  if (!items.length) {
    if (st) { st.className = "share-status err"; st.textContent = "Nothing on the list yet — plan some dinners first."; }
    return;
  }
  STATE.cartRequest = {
    week: wk,
    requestedAt: new Date().toISOString(),
    status: "pending",
    items: items.map(it => ({ name: it.name, qty: it.qty || "", store: it.store, pref: itemPrefText(it.name, it.store) })),
    dinners: Object.values(mealPlanFor(wk)).filter(n => n && n.dinner).map(n => n.dinner),
  };
  saveState(); renderCartStatus();
  if (st) {
    st.className = "share-status ok";
    st.textContent = `Cart order queued (${items.length} items) — the main PC starts building within a few minutes 🛒`;
    setTimeout(() => { st.textContent = ""; st.className = "share-status"; }, 12000);
  }
}
$("mealBuildCart")?.addEventListener("click", buildCartOrder);

// Live status of the cart build (the main PC's watcher updates cartRequest).
function renderCartStatus() {
  const el = $("cartStatus"); if (!el) return;
  const cr = STATE.cartRequest;
  if (!cr || !cr.status) { el.hidden = true; el.textContent = ""; return; }
  const map = {
    pending: "🛒 Cart order queued — the main PC will start within a few minutes…",
    building: "🛒 Building your Meijer + ALDI carts now…",
    done: `✅ Carts are ready${cr.summary ? " — " + cr.summary : ""} (check your email)`,
    error: `⚠️ Cart build hit a snag${cr.summary ? ": " + cr.summary : ""} — it will retry, or ask Chad`,
  };
  el.hidden = false;
  el.dataset.state = cr.status;
  el.textContent = map[cr.status] || "";
}

/* ---- clear-all buttons (two-tap confirm so little fingers can't wipe things) ---- */
function armClear(btn, label, onConfirm) {
  if (btn.dataset.armed === "1") {
    delete btn.dataset.armed; btn.textContent = label;
    onConfirm();
    return;
  }
  btn.dataset.armed = "1"; btn.textContent = "Tap again to clear";
  setTimeout(() => { if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = label; } }, 3500);
}
$("groceryClear")?.addEventListener("click", () => armClear($("groceryClear"), "Clear list", () => {
  STATE.grocery = [];
  renderGrocery(); saveState();
}));
$("mealClearWeek")?.addEventListener("click", () => armClear($("mealClearWeek"), "Clear week", () => {
  const wk = mealWeekKey();
  if (STATE.mealPlan) delete STATE.mealPlan[wk];
  if (STATE.shopSkip) delete STATE.shopSkip[wk];
  renderMeals(); saveState();
}));

/* ---- dinner picker ---- */
let dinnerDay = null;
function openDinner(day) {
  dinnerDay = day;
  const ws = mealWeekStart(); const dt = new Date(ws); dt.setDate(dt.getDate() + day);
  $("dinnerTitle").textContent = `${DOW[dt.getDay()]}'s dinner`;
  const recipes = mealsCfg().recipes || [];
  const picks = allPicks().slice(0, 4);
  let opts = picks.map((p, i) => `<button class="dinner-opt pickopt" data-pickidx="${i}" type="button">
      ${p.emoji || "🍽️"} ${escapeHtml(p.name)}<small>${escapeHtml(p.source || "")}</small></button>`).join("");
  opts += recipes.map(r => `<button class="dinner-opt" data-rid="${r.id}" type="button">${r.emoji || "🍽️"} ${escapeHtml(r.name)}</button>`).join("");
  opts += `<button class="dinner-opt special" data-special="pizza" type="button">${escapeHtml(mealsCfg().pizzaName || "Pizza night 🍕")}</button>`;
  opts += `<button class="dinner-opt special" data-special="idea" type="button">🎲 New idea</button>`;
  opts += `<button class="dinner-opt special out" data-special="out" type="button">🚗 Out / away</button>`;
  $("dinnerOptions").innerHTML = opts;
  $("dinnerCustom").value = "";
  $("dinnerModal").hidden = false;
}
function chooseDinner(val) { setNight(mealWeekKey(), dinnerDay, val); closeDinner(); renderMeals(); }
function closeDinner() { $("dinnerModal").hidden = true; dinnerDay = null; }

/* ---- preference editor ---- */
let prefItem = null, prefStore = null;
function updatePrefStores() { document.querySelectorAll("#prefStores .pref-store").forEach(b => b.classList.toggle("on", b.dataset.store === prefStore)); }
function openPref(item, store) {
  prefItem = item; const p = prefFor(item);
  prefStore = (p && p.store) || store || "Meijer";
  $("prefTitle").textContent = item;
  $("prefInput").value = (p && p.pref) || "";
  updatePrefStores();
  $("prefModal").hidden = false;
  setTimeout(() => { try { $("prefInput").focus(); } catch {} }, 60);
}
function savePref() { setPref(prefItem, $("prefInput").value.trim(), prefStore); $("prefModal").hidden = true; renderShopList(); renderGrocery(); }
function closePref() { $("prefModal").hidden = true; }

$("mealWeek")?.addEventListener("click", e => {
  const link = e.target.closest(".meal-recipe-link");
  if (link) { e.stopPropagation(); window.open(link.dataset.url, "_blank", "noopener"); return; }
  const b = e.target.closest(".meal-night"); if (b) openDinner(+b.dataset.day);
});
$("mealPrev")?.addEventListener("click", () => { mealOffset--; renderMeals(); });
$("mealNext")?.addEventListener("click", () => { mealOffset++; renderMeals(); });
$("mealTargetUp")?.addEventListener("click", () => { const wk = mealWeekKey(); setMealTarget(wk, mealTarget(wk) + 1); renderMeals(); });
$("mealTargetDown")?.addEventListener("click", () => { const wk = mealWeekKey(); setMealTarget(wk, mealTarget(wk) - 1); renderMeals(); });
$("mealPlanBtn")?.addEventListener("click", planMyWeek);
$("mealToGrocery")?.addEventListener("click", sendShopToGrocery);
$("dinnerOptions")?.addEventListener("click", e => {
  const b = e.target.closest(".dinner-opt"); if (!b) return;
  if (b.dataset.pickidx != null) { const p = allPicks()[+b.dataset.pickidx]; if (p) chooseDinner(pickAsNight(p)); }
  else if (b.dataset.rid) { const r = recipeById(b.dataset.rid); if (r) chooseDinner({ dinner: r.name, emoji: r.emoji, recipeId: r.id, out: false }); }
  else if (b.dataset.special === "pizza") chooseDinner({ dinner: mealsCfg().pizzaName || "Pizza night 🍕", recipeId: "pizza", out: false });
  else if (b.dataset.special === "out") chooseDinner({ out: true });
  else if (b.dataset.special === "idea") {
    // prefer a real pick (with its ingredients); fall back to a seasonal name
    const pool = allPicks();
    if (pool.length) chooseDinner(pickAsNight(pool[Math.floor(Math.random() * pool.length)]));
    else chooseDinner({ dinner: nextIdeaInstant(), out: false });
  }
});
$("dinnerCustom")?.addEventListener("keydown", e => { if (e.key === "Enter") { const v = e.target.value.trim(); if (v) chooseDinner({ dinner: v, out: false }); } });
$("dinnerClose")?.addEventListener("click", closeDinner);
$("dinnerClear")?.addEventListener("click", () => chooseDinner(null));
$("dinnerModal")?.addEventListener("click", e => { if (e.target.id === "dinnerModal") closeDinner(); });
$("shopList")?.addEventListener("click", e => {
  const b = e.target.closest(".shop-edit");
  if (b) return openPref(b.dataset.item, b.dataset.store);
  if (e.target.closest(".shop-link")) return;                 // let the link be a link
  const row = e.target.closest(".shop-row[data-skipitem]");   // anywhere else on the row = toggle "have it"
  if (row) { toggleSkip(mealWeekKey(), row.dataset.skipitem); renderShopList(); }
});
$("pantryCheck")?.addEventListener("click", e => {
  const b = e.target.closest(".pantry-item"); if (!b) return;
  const k = b.dataset.pan.toLowerCase();
  STATE.pantryNeed = STATE.pantryNeed || {}; STATE.pantryNeed[k] = !STATE.pantryNeed[k];
  b.classList.toggle("on"); saveState();
});
$("prefStores")?.addEventListener("click", e => { const b = e.target.closest(".pref-store"); if (b) { prefStore = b.dataset.store; updatePrefStores(); } });
$("prefSave")?.addEventListener("click", savePref);
$("prefCancel")?.addEventListener("click", closePref);
$("prefModal")?.addEventListener("click", e => { if (e.target.id === "prefModal") closePref(); });

/* ---------------------------------------------------------------- boot */
async function boot() {
  applyTheme();
  $("homeName").textContent = C.home || "The family";
  renderClock();
  await loadState();
  ensureWeek();
  renderHomeChores();
  renderChart();
  renderRewardTab();
  renderGrocery();
  renderMeals();
  renderAgenda();
  renderMonth();
  await loadWeather();
  loadForecast();                        // 7-day outlook (free Open-Meteo)
  loadRecipePicks();                     // this week's real-recipe picks
  loadPrices();                          // Meijer/ALDI prices (nightly sweep + lookups)
  loadCalendar();
  loadPhotos();                          // start the photo reel if it's enabled
  if (!showLoveNow()) maybeShowLove();   // surprise note wins; else the daily one

  setInterval(maybeShowLove, 1000 * 60);   // check each minute so it pops at loveHour
  setInterval(renderClock, 1000 * 10);
  setInterval(applyTheme, 1000 * 60 * 5);
  setInterval(loadWeather, 1000 * 30);
  setInterval(loadForecast, 1000 * 60 * 30);   // refresh the outlook every 30 min
  setInterval(loadCalendar, 1000 * 60 * 15);
  setInterval(loadPrices, 1000 * 60 * 30);  // fresh prices after the nightly sweep
  setInterval(loadPhotos, 1000 * 60 * 5);   // pick up newly-added photos
  setInterval(() => { ensureWeek(); renderHomeChores(); renderChart(); }, 1000 * 60 * 5);
  // re-pull state periodically so edits from other devices show up
  setInterval(async () => {
    if (editingChores) return;                                 // don't clobber an edit in progress
    if (document.activeElement === $("groceryInput")) return;  // don't clobber typing
    // any editor/modal open? leave the screen alone until it's closed
    for (const id of ["pinModal", "eventModal", "dinnerModal", "prefModal", "redeemModal"]) {
      const m = $(id); if (m && !m.hidden) return;
    }
    await loadState(); ensureWeek(); renderHomeChores(); renderChart(); renderRewardTab(); renderGrocery();
    renderAgenda(); renderMonth(); renderMeals();                // pick up voice/Claude-added edits
  }, 1000 * 20);
  // watch for a new code version (after a git pull) and reload automatically
  watchVersion();
}

let codeVersion = null;
async function watchVersion() {
  async function check() {
    try {
      const v = (await (await fetch("/api/version", { cache: "no-store" })).json()).version;
      if (codeVersion === null) codeVersion = v;
      else if (v !== codeVersion) location.reload();
    } catch {}
  }
  await check();
  setInterval(check, 1000 * 15);
}

boot();
