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

let STATE = { choreDone: {}, choreWeek: null, grocery: [] };

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
const CHORE_PICS = [
  [/window/i, "🪟"], [/shoe/i, "👟"], [/tooth|teeth|brush/i, "🪥"], [/\bbed\b|make.*bed/i, "🛏️"],
  [/toy/i, "🧸"], [/dish|dishwash/i, "🍽️"], [/trash|garbage/i, "🗑️"], [/recycl/i, "♻️"],
  [/\bdog\b|puppy|walk/i, "🐕"], [/\bcat\b|kitty/i, "🐈"], [/fish/i, "🐠"],
  [/plant|water/i, "🪴"], [/flower/i, "🌷"], [/vacuum|sweep/i, "🧹"], [/mop|floor/i, "🧽"],
  [/laundry|fold|clothes/i, "🧺"], [/wash/i, "🧼"], [/clean|tidy|pick.?up/i, "🧼"],
  [/\broom\b/i, "🚪"], [/table|set.*table/i, "🍽️"], [/lunch|meal|cook|kitchen/i, "🍱"],
  [/book|read/i, "📚"], [/\bcar\b/i, "🚗"], [/mail/i, "📬"], [/snow|shovel/i, "❄️"],
  [/leaf|rake/i, "🍂"], [/towel/i, "🧻"], [/hair/i, "💇"], [/face|hand/i, "🧽"],
  [/feed|food|bowl/i, "🥣"], [/homework|study/i, "✏️"], [/music|piano|practice/i, "🎹"],
];
function chorePic(c) {
  if (c.pic) return c.pic;                                  // explicit picture wins
  for (const [re, emo] of CHORE_PICS) if (re.test(c.name || "")) return emo;
  return "⭐";                                              // friendly fallback
}

// How many chore check-offs a person has this week (for the reward).
function rewardCount(who) {
  let n = 0;
  effectiveChores().forEach(c => {
    if (c.who === who && STATE.choreDone[c.id]) n += Object.keys(STATE.choreDone[c.id]).length;
  });
  return n;
}

// Flip a checkbox; returns true if it just became DONE (so we can celebrate).
function toggleSlot(id, slot) {
  STATE.choreDone[id] = STATE.choreDone[id] || {};
  let nowDone;
  if (STATE.choreDone[id][slot]) { delete STATE.choreDone[id][slot]; nowDone = false; }
  else { STATE.choreDone[id][slot] = true; nowDone = true; }
  if (!Object.keys(STATE.choreDone[id]).length) delete STATE.choreDone[id];
  renderHomeChores(); renderChart();
  saveState();
  return nowDone;
}

/* ---- kid-friendly celebration: a little confetti + an encouraging word,
        localized to where they tapped — never a full-screen takeover ---- */
const CHEERS = ["Great job!", "Nice!", "Woohoo!", "Way to go!", "Awesome!", "High five!", "You did it!", "Yay!"];
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
  const chores = effectiveChores();
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
  renderRewards();

  // Per-person tally of boxes checked this week.
  const tally = {};
  chores.forEach(c => {
    const n = STATE.choreDone[c.id] ? Object.keys(STATE.choreDone[c.id]).length : 0;
    if (c.who && n) tally[c.who] = (tally[c.who] || 0) + n;
  });
  const summary = Object.entries(tally).map(([w, n]) => `${initials(w)} ${n}`).join("  ·  ");
  $("choreProgress2").textContent = summary || "Tap a box to check it off";
}

// Ice-cream reward bar: each kid's progress toward C.rewardGoal chores.
function renderRewards() {
  const host = $("rewardBar"); if (!host) return;
  const goal = C.rewardGoal || 7;
  const kids = (C.kids || []).filter(k => effectiveChores().some(c => c.who === k));
  if (!kids.length) { host.hidden = true; host.innerHTML = ""; return; }
  host.hidden = false;
  host.innerHTML = kids.map(k => {
    const n = rewardCount(k);
    const earned = n >= goal;
    const col = color(k);
    const pips = Array.from({ length: goal }, (_, i) =>
      `<span class="pip ${i < n ? "on" : ""}" style="${i < n ? `background:${col};border-color:${col}` : ""}"></span>`).join("");
    return `<div class="reward ${earned ? "earned" : ""}" style="--kid:${col}">
      <div class="reward-who"><span class="reward-ava">${avatarOf(k) || initials(k)}</span><span class="reward-name">${escapeHtml(k)}</span></div>
      <div class="reward-pips">${pips}</div>
      <div class="reward-goal">
        <span class="reward-count">${Math.min(n, goal)}/${goal}</span>
        <span class="reward-ice">${C.rewardEmoji || "🍦"}</span>
      </div>
      <div class="reward-earned-tag">${C.rewardEmoji || "🍦"} ${escapeHtml((C.rewardName || "ice cream"))} earned!</div>
    </div>`;
  }).join("");
}

// A big (non-blocking) ice-cream shower when a kid hits the reward goal.
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
  banner.textContent = `${C.rewardEmoji || "🍦"} ${who} earned ${(C.rewardName || "ice cream").toUpperCase()}! ${C.rewardEmoji || "🍦"}`;
  fx.appendChild(banner);
  setTimeout(() => banner.remove(), 3200);
}

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
  // Just crossed the reward line? Make it rain ice cream.
  if (isKid(who) && rewardCount(who) === (C.rewardGoal || 7)) iceCreamParty(who);
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
    STATE = Object.assign({ choreDone: {}, choreWeek: null, grocery: [] }, s);
    STATE.choreDone = STATE.choreDone || {};
    STATE.grocery = STATE.grocery || [];
  } catch { STATE = { choreDone: {}, choreWeek: null, grocery: [] }; }
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
document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideLove(); });

/* ---------------------------------------------------------------- boot */
async function boot() {
  applyTheme();
  $("homeName").textContent = C.home || "The family";
  renderClock();
  await loadState();
  ensureWeek();
  renderHomeChores();
  renderChart();
  renderGrocery();
  renderAgenda();
  renderWeek();
  await loadWeather();
  loadCalendar();
  maybeShowLove();

  setInterval(maybeShowLove, 1000 * 60);   // check each minute so it pops at loveHour
  setInterval(renderClock, 1000 * 10);
  setInterval(applyTheme, 1000 * 60 * 5);
  setInterval(loadWeather, 1000 * 30);
  setInterval(loadCalendar, 1000 * 60 * 15);
  setInterval(() => { ensureWeek(); renderHomeChores(); renderChart(); }, 1000 * 60 * 5);
  // re-pull state periodically so edits from other devices show up
  setInterval(async () => {
    if (editingChores) return;                                 // don't clobber an edit in progress
    if (document.activeElement === $("groceryInput")) return;  // don't clobber typing
    await loadState(); ensureWeek(); renderHomeChores(); renderChart(); renderGrocery();
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
