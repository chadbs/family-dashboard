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

let STATE = { choresDone: {}, keys: {} };

/* ---------------------------------------------------------------- helpers */
function color(who) { return (C.people && C.people[who]) || "#8A93A6"; }
function initials(who) { return who.slice(0, 1).toUpperCase(); }
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
  if (c.includes("rain") || c.includes("shower") || c.includes("storm")) {
    return `<svg viewBox="0 0 64 64" fill="none">
      <path d="M20 34a10 10 0 0 1 .6-19.9A14 14 0 0 1 47 18a9 9 0 0 1-1 18H20z" fill="${cloud}" opacity=".22"/>
      <path d="M20 34a10 10 0 0 1 .6-19.9A14 14 0 0 1 47 18a9 9 0 0 1-1 18H20z" stroke="${cloud}" stroke-width="2.5"/>
      <g stroke="${rain}" stroke-width="3.2" stroke-linecap="round">
        <line x1="24" y1="42" x2="21" y2="52"/><line x1="34" y1="42" x2="31" y2="54"/><line x1="44" y1="42" x2="41" y2="52"/>
      </g></svg>`;
  }
  if (c.includes("cloud") && !c.includes("part")) {
    return `<svg viewBox="0 0 64 64" fill="none">
      <path d="M18 44a11 11 0 0 1 .7-22A15 15 0 0 1 47 26a10 10 0 0 1-1 18H18z" fill="${cloud}" opacity=".25"/>
      <path d="M18 44a11 11 0 0 1 .7-22A15 15 0 0 1 47 26a10 10 0 0 1-1 18H18z" stroke="${cloud}" stroke-width="2.5"/></svg>`;
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

function renderWeather(w) {
  $("tempNow").innerHTML = `${Math.round(w.temperature_F)}<span class="deg">°</span>`;
  $("tempCond").textContent = w.condition || "—";
  $("tempLoc").textContent = C.location || "Outside";
  $("heroIcon").innerHTML = weatherIcon(w.condition);
  $("mHiLo").textContent = `${Math.round(w.hi)}° / ${Math.round(w.lo)}°`;
  $("mHum").textContent = `${Math.round(w.humidity)}%`;
  $("mRain").textContent = `${(w.rain_in ?? 0).toFixed(2)}"`;
  $("mIndoor").textContent = `${Math.round(w.indoor_F)}° · ${Math.round(w.indoor_hum)}%`;

  const r12 = w.rain12h || [];
  const max = Math.max(0.01, ...r12);
  $("rainChart").innerHTML = r12.map(v => {
    const h = Math.max(4, Math.round((v / max) * 100));
    return `<div class="bar ${v > 0 ? "wet" : ""}" style="height:${h}%"></div>`;
  }).join("");
  const total = r12.reduce((a, b) => a + b, 0);
  $("trendTotal").textContent = `${total.toFixed(2)}" total`;
}

/* ---------------------------------------------------------------- chores */
function resetChoresIfNeeded() {
  const tk = todayKey(), wk = weekKey();
  STATE.keys = STATE.keys || {};
  let changed = false;
  if (STATE.keys.daily !== tk) {
    C.chores.filter(c => c.cadence === "daily").forEach(c => { if (STATE.choresDone[c.id]) { delete STATE.choresDone[c.id]; changed = true; } });
    STATE.keys.daily = tk; changed = true;
  }
  if (STATE.keys.weekly !== wk) {
    C.chores.filter(c => c.cadence === "weekly").forEach(c => { if (STATE.choresDone[c.id]) { delete STATE.choresDone[c.id]; changed = true; } });
    STATE.keys.weekly = wk; changed = true;
  }
  if (changed) saveState();
}

function choreRow(c, showCadence) {
  const done = !!STATE.choresDone[c.id];
  const col = color(c.who);
  return `<div class="chore ${done ? "done" : ""}" data-id="${c.id}">
    <div class="chk"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></div>
    <div class="chore-name">${c.name}</div>
    ${showCadence ? `<span class="chore-cadence">${c.cadence}</span>` : ""}
    <div class="chore-badge" style="background:${col}" title="${c.who}">${initials(c.who)}</div>
  </div>`;
}

function renderChores() {
  $("choreList").innerHTML = C.chores.map(c => choreRow(c, false)).join("");
  $("choreBoard").innerHTML = C.chores.map(c => choreRow(c, true)).join("");
  const done = C.chores.filter(c => STATE.choresDone[c.id]).length;
  const txt = `${done} of ${C.chores.length} done`;
  $("choreProgress").textContent = txt;
  $("choreProgress2").textContent = txt;
}

function toggleChore(id) {
  if (STATE.choresDone[id]) delete STATE.choresDone[id];
  else STATE.choresDone[id] = true;
  renderChores();
  saveState();
}

document.addEventListener("click", (e) => {
  const el = e.target.closest(".chore");
  if (el) toggleChore(el.dataset.id);
});

/* ---------------------------------------------------------------- grocery */
function renderGrocery() {
  const list = STATE.grocery || [];
  const host = $("groceryList");
  if (!list.length) {
    host.innerHTML = `<div class="grocery-empty">Nothing on the list yet — add something above.</div>`;
  } else {
    host.innerHTML = list.map(g => `<div class="gitem ${g.done ? "done" : ""}" data-id="${g.id}">
      <div class="chk gchk"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></div>
      <div class="gitem-text">${escapeHtml(g.text)}</div>
      <div class="gitem-x" data-remove="${g.id}" title="Remove">&times;</div>
    </div>`).join("");
  }
  const left = list.filter(g => !g.done).length;
  $("groceryCount").textContent = list.length ? `${left} to buy` : "empty";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

function addGrocery(text) {
  text = (text || "").trim();
  if (!text) return;
  STATE.grocery = STATE.grocery || [];
  STATE.grocery.push({ id: "g" + Date.now().toString(36), text, done: false });
  renderGrocery(); saveState();
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

/* ---------------------------------------------------------------- calendar */
let liveEvents = null;   // set once the real Google Calendar loads

function eventsForOffset() {
  const source = liveEvents || C.sampleEvents || [];
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
    renderAgenda(); renderWeek();
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

function birthdayBanner() {
  const b = nextBirthday();
  if (!b) return "";
  const col = color(b.name);
  const when = b.days === 0 ? "today!" : b.days === 1 ? "tomorrow" : `in ${b.days} days`;
  const dateStr = `${MON[b.date.getMonth()].slice(0,3)} ${b.date.getDate()}`;
  const cake = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="${col}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
    <path d="M4 20h16v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7z"/><path d="M4 15c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1"/>
    <line x1="12" y1="4" x2="12" y2="8"/><circle cx="12" cy="3" r="1" fill="${col}" stroke="none"/></svg>`;
  return `<div style="display:flex;align-items:center;gap:11px;background:${col}14;border:1px solid ${col}33;border-radius:var(--r-md);padding:11px 14px;margin-bottom:4px;">
    ${cake}
    <div style="flex:1;font-size:clamp(13px,1.25vw,17px);font-weight:600;">${b.name} turns ${b.turning} ${when}</div>
    <div style="font-size:clamp(11px,1vw,14px);font-weight:700;color:${col};">${dateStr}</div>
  </div>`;
}

function renderAgenda() {
  const map = eventsForOffset();
  const offsets = Object.keys(map).map(Number).sort((a, b) => a - b).slice(0, 4);
  const today = new Date(); today.setHours(0,0,0,0);
  const events = offsets.map(off => {
    const dt = new Date(today); dt.setDate(dt.getDate() + off);
    const label = off === 0 ? "Today" : off === 1 ? "Tomorrow" : DOW[dt.getDay()];
    const rows = map[off].map(e => {
      const col = e.who ? color(e.who) : "var(--accent)";
      const badge = e.who ? `<span class="ev-who" style="background:${col}22;color:${col}">${e.who}</span>` : "";
      return `<div class="event">
        <span class="ev-bar" style="background:${col}"></span>
        <span class="ev-time">${e.time}</span>
        <span class="ev-title">${escapeHtml(e.title)}</span>
        ${badge}
      </div>`;
    }).join("");
    return `<div class="agenda-day-label ${off === 0 ? "today" : ""}">${label}</div>${rows}`;
  }).join("");
  $("agenda").innerHTML = birthdayBanner() + events;
}

function renderWeek() {
  const map = eventsForOffset();
  const today = new Date(); today.setHours(0,0,0,0);
  let html = "";
  for (let off = 0; off < 7; off++) {
    const dt = new Date(today); dt.setDate(dt.getDate() + off);
    const evs = map[off] || [];
    const body = evs.length
      ? evs.map(e => {
          const col = e.who ? color(e.who) : "var(--accent)";
          const who = e.who ? ` · ${e.who}` : "";
          return `<div class="wk-ev" style="border-left-color:${col}"><b>${escapeHtml(e.title)}</b><span>${e.time}${who}</span></div>`;
        }).join("")
      : `<div class="empty">No events</div>`;
    html += `<div class="weekcol ${off === 0 ? "today" : ""}">
      <h3>${DOWS[dt.getDay()]}<small>${MON[dt.getMonth()].slice(0,3)} ${dt.getDate()}</small></h3>${body}</div>`;
  }
  $("weekGrid").innerHTML = html;
}

/* ---------------------------------------------------------------- state I/O */
async function loadState() {
  try {
    const r = await fetch("/api/state", { cache: "no-store" });
    const s = await r.json();
    STATE = Object.assign({ choresDone: {}, keys: {}, grocery: [] }, s);
    STATE.choresDone = STATE.choresDone || {};
    STATE.keys = STATE.keys || {};
    STATE.grocery = STATE.grocery || [];
  } catch { STATE = { choresDone: {}, keys: {}, grocery: [] }; }
}

let saveTimer = null;
function saveState() {
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
});

/* ---------------------------------------------------------------- boot */
async function boot() {
  applyTheme();
  $("homeName").textContent = C.home || "The family";
  renderClock();
  await loadState();
  resetChoresIfNeeded();
  renderChores();
  renderGrocery();
  renderAgenda();
  renderWeek();
  await loadWeather();
  loadCalendar();

  setInterval(renderClock, 1000 * 10);
  setInterval(applyTheme, 1000 * 60 * 5);
  setInterval(loadWeather, 1000 * 30);
  setInterval(loadCalendar, 1000 * 60 * 15);
  setInterval(() => { resetChoresIfNeeded(); renderChores(); }, 1000 * 60 * 5);
  // re-pull state periodically so edits from other devices show up
  setInterval(async () => {
    if (document.activeElement === $("groceryInput")) return; // don't clobber typing
    await loadState(); resetChoresIfNeeded(); renderChores(); renderGrocery();
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
