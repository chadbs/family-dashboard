/* ============================================================
   Word — the morning verse.

   One KJV verse a day, the same one on every phone and on the wall. The
   church year leads when it has something to say — Advent, the twelve days
   of Christmas, Holy Week, Easter week, Thanksgiving week, the Lord's Day —
   and otherwise the everyday verses come up in a shuffled order, each once
   before any comes round again. Beneath it, by turns, a line from a
   Reformed voice, a few lines of a hymn, or a question of the Shorter
   Catechism; and a weekly question from the children's catechism for the
   girls. The pick is arithmetic on the date, so it needs no store. A
   speaker button reads it aloud for the two who cannot read yet.

   Voice lives here too, because the Bible game (55) borrows it: the
   browser's default voice is the old robotic desktop one on Windows, so
   we go looking for a natural voice — Edge's "Natural" set, Chrome's
   Google voices, Siri's Samantha on an iPhone — and fall back gracefully.
   ============================================================ */

const Voice = (function () {
  let cached = null;
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  function score(v) {
    if (!/^en/i.test(v.lang || "")) return -1;
    const n = (v.name || "").toLowerCase();
    let s = 0;
    if (/en[-_]us/i.test(v.lang)) s += 3;
    if (/natural|neural|premium|enhanced|wavenet/.test(n)) s += 8;
    if (/google/.test(n)) s += 6;
    if (/aria|jenny|michelle|ana|samantha|ava|allison|zoe|emma|libby|sonia|karen|moira/.test(n)) s += 4;
    if (/online/.test(n)) s += 2;
    /* The old Windows desktop voices are the robotic ones. Still English,
       so still a last resort — Zira is the gentler of them for the girls. */
    if (/desktop|david|zira|mark|compact|espeak|microsoft [a-z]+ - /.test(n) && !/natural/.test(n)) s -= 3;
    if (/zira/.test(n)) s += 2;
    return s;
  }

  function pick() {
    if (!supported) return null;
    if (cached) return cached;
    let list = [];
    try { list = window.speechSynthesis.getVoices() || []; } catch (e) { list = []; }
    if (!list.length) return null;
    let best = null;
    let bs = -Infinity;
    list.forEach(function (v) {
      const s = score(v);
      if (s < 0 && !/^en/i.test(v.lang || "")) return;
      if (s > bs) { bs = s; best = v; }
    });
    cached = best;
    return best;
  }

  if (supported) {
    try {
      window.speechSynthesis.addEventListener("voiceschanged", function () { cached = null; });
      /* Chrome hands back an empty list until it has been asked once. */
      window.speechSynthesis.getVoices();
    } catch (e) { /* fine */ }
  }

  function browserSpeak(text, opts, done) {
    if (!supported) return false;
    const o = opts || {};
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = pick();
      if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = "en-US"; }
      u.rate = o.rate || 0.95;
      u.pitch = o.pitch || 1.05;
      u.volume = 1;
      if (done) { u.onend = done; u.onerror = done; }
      window.speechSynthesis.speak(u);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---- the good voice ----
     The hosted app can synthesise a line properly and hands back an mp3
     (see /api/say in cloud/main.ts). It answers 204 when it can't, and then
     we fall back to the browser. Clips are memoised here as well as cached
     on the server, so a repeated prompt costs nothing at all. */

  let server = null;     /* null = untried, true/false once known */
  let el = null;         /* one <audio>, unlocked by the first real tap */
  let unlocked = false;
  let lastAsked = "";
  const clips = new Map();
  const SILENCE =
    "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+UlK3z/177OXOle0KVK5nnzXPmveWjNORFllsbmoxDVUlM7A//tQxAgAA4AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+UlK3z/177OXOle0KVK5nnzXPmveWjNORFllsbmoxDVU";

  function audio() {
    if (el) return el;
    try {
      el = new Audio();
      el.preload = "auto";
    } catch (e) {
      el = null;
    }
    return el;
  }

  /* Phones refuse to play audio that no finger started. The game is nothing
     but taps, so we spend the very first one priming a silent clip; every
     later play reuses that same element and is allowed through. */
  function unlock() {
    if (unlocked) return;
    const a = audio();
    if (!a) return;
    unlocked = true;
    try {
      a.src = SILENCE;
      const p = a.play();
      if (p && p.catch) p.catch(function () { /* it will work on a later tap */ });
    } catch (e) { /* fine */ }
  }
  if (typeof document !== "undefined") {
    ["pointerdown", "touchstart", "click"].forEach(function (ev) {
      document.addEventListener(ev, unlock, { once: true, capture: true, passive: true });
    });
  }

  function url(text) {
    return "/api/say?t=" + encodeURIComponent(text);
  }

  /* Ask for a line ahead of time so it plays the instant it is wanted. */
  function prefetch(text) {
    if (server === false || !text) return;
    const t = String(text).trim();
    if (!t || clips.has(t)) return;
    clips.set(
      t,
      fetch(url(t))
        .then(function (r) {
          if (r.status === 204) { server = false; return null; }
          if (!r.ok) return null;
          server = true;
          return r.blob().then(function (b) { return URL.createObjectURL(b); });
        })
        .catch(function () { return null; })
    );
  }

  /* Every line gets a turn number; saying something new, or hushing,
     starts a new turn. A line only reports that it finished if it is still
     the current turn, so a follow-on never fires after being talked over. */
  let turn = 0;

  /* opts.onEnd runs once, when the line has been said. It always runs —
     if the audio is blocked or the device has no voice at all, a timer
     sized to the length of the line stands in for it — so a sequence of
     lines can never stall halfway. */
  function speak(text, opts) {
    const t = String(text || "").trim();
    if (!t) return false;
    hush();
    const my = turn;
    const o = opts || {};
    let fired = false;
    const done = function () {
      if (fired || my !== turn) return;
      fired = true;
      if (o.onEnd) o.onEnd();
    };
    if (o.onEnd) setTimeout(done, 1400 + t.length * 90);

    if (server === false) {
      if (!browserSpeak(t, o, done)) setTimeout(done, 600);
      return true;
    }

    prefetch(t);
    const want = t;
    clips.get(t).then(function (src) {
      /* Something else started talking while this was loading. */
      if (want !== lastAsked || my !== turn) return;
      const a = audio();
      if (!src || !a) return void browserSpeak(t, o, done);
      try {
        a.onended = done;
        a.src = src;
        a.playbackRate = o.rate || 1;
        const p = a.play();
        if (p && p.catch) p.catch(function () { browserSpeak(t, o, done); });
      } catch (e) {
        browserSpeak(t, o, done);
      }
    });
    lastAsked = t;
    return true;
  }

  function hush() {
    turn++;
    lastAsked = "";
    try { window.speechSynthesis.cancel(); } catch (e) { /* fine */ }
    try { if (el) { el.onended = null; el.pause(); el.currentTime = 0; } } catch (e) { /* fine */ }
  }

  return {
    speak: speak,
    hush: hush,
    prefetch: prefetch,
    unlock: unlock,
    pick: pick,
    supported: supported,
    server: function () { return server; },
  };
})();

const Word = (function () {
  /* UTC arithmetic on purpose: local-midnight subtraction is off by an hour
     across daylight saving, which made "tomorrow" come out as today. */
  function dayOfYear(d) {
    const start = Date.UTC(d.getFullYear(), 0, 0);
    const day = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((day - start) / 86400000);
  }

  /* Days since 1970 by the calendar date, the same on every screen. */
  function dayNum(d) {
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }

  function more() {
    return typeof SCRIPTURE_MORE !== "undefined" ? SCRIPTURE_MORE : null;
  }

  function at(list, n) {
    return list[((n % list.length) + list.length) % list.length];
  }

  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }

  /* A fixed shuffle of 0..n-1 for one pass through a list. */
  function shuffled(n, seed) {
    const a = [];
    for (let i = 0; i < n; i++) a.push(i);
    let s = seed >>> 0 || 1;
    for (let i = n - 1; i > 0; i--) {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      const j = s % (i + 1);
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* The nth item of a list, walked in a different shuffled order each pass:
     everything comes up once before anything comes round again, and across
     the seam between passes nothing from the back half of one pass turns
     up in the front half of the next. (The old stride of 7 over 98
     verses only ever reached 14 of them.) */
  const passes = {};
  function pass(len, p, salt) {
    const key = salt + ":" + len + ":" + p;
    if (!passes[key]) {
      let o = shuffled(len, hash(salt) + p * 2654435761);
      const k = Math.max(1, Math.floor(len / 2));
      if (p > 0 && len > 1) {
        const recent = {};
        pass(len, p - 1, salt).slice(len - k).forEach(function (x) { recent[x] = true; });
        const head = o.filter(function (x) { return !recent[x]; }).slice(0, k);
        const used = {};
        head.forEach(function (x) { used[x] = true; });
        o = head.concat(o.filter(function (x) { return !used[x]; }));
      }
      passes[key] = o;
    }
    return passes[key];
  }
  function walk(list, n, salt) {
    const len = list.length;
    const p = Math.floor(n / len);
    return list[pass(len, p, salt)[n - p * len]];
  }

  /* ---- the church year ---- */

  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    return new Date(y, month - 1, ((h + l - 7 * m + 114) % 31) + 1);
  }
  function thanksgiving(y) {
    const dow = new Date(y, 10, 1).getDay();
    return new Date(y, 10, 1 + ((4 - dow + 7) % 7) + 21);
  }
  function adventSunday(y) {
    const dow = new Date(y, 11, 25).getDay();
    return new Date(y, 11, 25 - (dow === 0 ? 7 : dow) - 21);
  }

  const LITTLE_FROM = Math.floor((Date.UTC(2026, 9, 5) / 86400000 + 3) / 7);

  const TWELVE = ["", "", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"];

  /* Where today falls: { kind, i (place in the season), label, key (a
     great day, which always gets its own hymn) }. */
  function occasion(d) {
    const y = d.getFullYear(), m = d.getMonth(), dd = d.getDate();
    const day = dayNum(d);
    const since = function (x) { return day - dayNum(x); };

    if (m === 0 && dd === 1) return { kind: "newyear", i: y, label: "A new year · " + y + " \u{1F305}" };
    if ((m === 11 && dd >= 24) || (m === 0 && dd <= 6)) {
      const i = m === 11 ? dd - 24 : dd + 6;
      const label = i === 0 ? "Christmas Eve \u{1F56F}️"
        : i === 1 ? "Christmas Day ⭐"
        : i === 12 ? "Epiphany · the wise men ⭐"
        : "Christmastide · the " + TWELVE[i] + " day";
      return { kind: "christmas", i: i, label: label, key: i === 1, hymn: i === 0 ? "Silent Night" : null };
    }
    const adv = adventSunday(y);
    if (since(adv) >= 0 && (m < 11 || dd <= 23)) {
      const i = since(adv);
      const week = Math.floor(i / 7) + 1;
      return { kind: "advent", i: i, last: m === 11 && dd === 23, label: "Advent · week " + week + " " + "\u{1F56F}️".repeat(week) };
    }
    const E = easter(y);
    const fromPalm = since(E) + 7;
    if (fromPalm >= 0 && fromPalm <= 6) {
      const names = { 0: "Palm Sunday \u{1F33F}", 4: "Maundy Thursday", 5: "Good Friday ✝️", 6: "Holy Saturday" };
      return { kind: "passion", i: fromPalm, label: names[fromPalm] || "Holy Week", key: fromPalm === 5, hymn: fromPalm === 0 ? "All Glory, Laud, and Honour" : null };
    }
    if (since(E) >= 0 && since(E) <= 6) {
      const i = since(E);
      return { kind: "risen", i: i, label: i === 0 ? "Resurrection Day · He is risen! \u{1F305}" : "Easter week · He is risen indeed", key: i === 0 };
    }
    const T = thanksgiving(y);
    if (since(T) >= -3 && since(T) <= 0) {
      const i = since(T) + 3;
      return { kind: "thanksgiving", i: i, label: i === 3 ? "Thanksgiving Day \u{1F33E}" : "Thanksgiving week \u{1F342}", key: i === 3 };
    }
    if (d.getDay() === 0) return { kind: "lordsDay", i: Math.floor(day / 7), label: "The Lord's Day ⛪" };
    return { kind: "plain", i: day, label: d.toLocaleDateString("en-US", { weekday: "long" }) + " morning's word" };
  }

  function seasonVerse(occ, d, M) {
    const pool = M && M.seasons && M.seasons[occ.kind];
    if (!pool || !pool.length) return null;
    switch (occ.kind) {
      case "newyear": return at(pool, occ.i);
      /* Isaiah 9:6 is kept for the twenty-third */
      case "advent": return occ.last ? pool[pool.length - 1] : at(pool.slice(0, -1), occ.i);
      case "christmas": case "passion": case "risen": return at(pool, occ.i);
      case "thanksgiving": return occ.i === 3 ? pool[0] : pool[1 + ((occ.i + d.getFullYear() * 3) % (pool.length - 1))];
      case "lordsDay": return walk(pool, occ.i, "lord");
      default: return null;
    }
  }

  function everyday() {
    const base = (typeof SCRIPTURE !== "undefined" && SCRIPTURE.verses) || [];
    const M = more();
    const seen = {};
    return base.concat((M && M.verses) || []).filter(function (v) {
      if (seen[v.ref]) return false;
      seen[v.ref] = true;
      return true;
    });
  }

  /* How many singing days (every third day, and every Sunday) there have
     been up to this one, so weekday and Sunday hymns share one walk and
     never meet. Day 3 of 1970 was a Sunday: Sundays are 3 mod 7, and the
     ones not already a hymn day are 3 and 17 mod 21. */
  function hymnDays(day) {
    function count(m, r) { return day >= r ? Math.floor((day - r) / m) + 1 : 0; }
    return count(3, 1) + count(21, 3) + count(21, 17);
  }

  /* Under the verse, one of three by turns: a line from a Reformed voice,
     a few lines of a hymn, or a question of the Shorter Catechism. Sundays
     and the great days always sing; the seasons pick their own. */
  function companion(day, occ, M) {
    const quotes = ((typeof SCRIPTURE !== "undefined" && SCRIPTURE.quotes) || []).concat((M && M.quotes) || []);
    const hymns = (M && M.hymns) || [];
    const cat = (M && M.catechism) || [];
    const seasonal = occ.kind === "newyear" ? "christmas" : occ.kind;
    const sHymns = hymns.filter(function (h) { return h.season === seasonal; });
    const sCat = cat.filter(function (c) { return c.season === seasonal; });
    const gHymns = hymns.filter(function (h) { return !h.season; });
    const gCat = cat.filter(function (c) { return !c.season; });

    let kind = ["quote", "hymn", "catechism"][((day % 3) + 3) % 3];
    if (occ.key || occ.hymn || occ.sunday) kind = "hymn";
    const n = Math.floor(day / 3);

    if (kind === "hymn") {
      const named = occ.hymn && sHymns.filter(function (h) { return h.title === occ.hymn; })[0];
      if (named) return { kind: "hymn", item: named };
      if (sHymns.length) return { kind: "hymn", item: occ.key ? sHymns[0] : at(sHymns, Math.floor(occ.i / 3)) };
      if (gHymns.length) return { kind: "hymn", item: walk(gHymns, hymnDays(day), "hymn") };
    }
    if (kind === "catechism") {
      /* the season's own question once, early on; the rest of the time the
         ordinary walk through the catechism */
      if (sCat.length && occ.i < 3) return { kind: "catechism", item: sCat[0] };
      if (gCat.length) return { kind: "catechism", item: walk(gCat, n, "wsc") };
    }
    if (quotes.length) return { kind: "quote", item: walk(quotes, n, "quote") };
    return null;
  }

  function today(date) {
    const d = date || new Date();
    const V = everyday();
    if (!V.length) return null;
    const M = more();
    const day = dayNum(d);
    const occ = occasion(d);
    occ.sunday = d.getDay() === 0;
    const verse = seasonVerse(occ, d, M) || walk(V, day, "verse");
    const extra = companion(day, occ, M);
    /* weeks run Monday to Sunday, from "Who made you?" the week of 5 October 2026 */
    const week = Math.floor((day + 3) / 7) - LITTLE_FROM;
    const little = M && M.little && M.little.length ? at(M.little, week) : null;
    return {
      verse: verse,
      occasion: occ,
      extra: extra,
      quote: extra && extra.kind === "quote" ? extra.item : null,
      little: little,
    };
  }

  function extraBlock(x) {
    if (!x) return null;
    const it = x.item;
    if (x.kind === "hymn") {
      return UI.h(
        "div",
        { class: "word-quote word-hymn" },
        UI.h("div", { class: "word-extra-tag", text: "\u{1F3B5} Sing" }),
        UI.h("p", { class: "word-hymn-lines" }, ...it.lines.map(function (l) { return UI.h("span", { text: l }); })),
        UI.h("div", { class: "word-quote-who", text: "— " + it.who + ", “" + it.title + "”" })
      );
    }
    if (x.kind === "catechism") {
      return UI.h(
        "div",
        { class: "word-quote word-cat" },
        UI.h("div", { class: "word-extra-tag", text: "\u{1F4D6} Catechism" }),
        UI.h("p", { class: "word-cat-q", text: "Q. " + it.q }),
        UI.h("p", { class: "word-cat-a", text: "A. " + it.a }),
        UI.h("div", { class: "word-quote-who", text: "— Westminster Shorter Catechism, Q. " + it.n })
      );
    }
    return UI.h(
      "div",
      { class: "word-quote" },
      UI.h("p", { class: "word-quote-text", text: "“" + it.text + "”" }),
      UI.h("div", { class: "word-quote-who", text: "— " + it.who })
    );
  }

  /* This week's question for the girls; tap to see the answer. */
  function littleBlock(l) {
    if (!l) return null;
    const btn = UI.h(
      "button",
      { class: "word-little", type: "button", "aria-expanded": "false" },
      UI.h("span", { class: "word-little-tag", text: "\u{1F430}\u{1F422} This week, ask the girls" }),
      UI.h("span", { class: "word-little-q", text: l.q }),
      UI.h("span", { class: "word-little-hint", text: "Tap for the answer" }),
      UI.h("span", { class: "word-little-a", text: l.a })
    );
    btn.addEventListener("click", function () {
      const open = btn.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    return btn;
  }

  function card(date) {
    const w = today(date);
    if (!w) return null;
    const v = w.verse;

    const readBtn = UI.h(
      "button",
      { class: "ibtn word-read", type: "button", "aria-label": "Read it aloud", title: "Read it aloud" },
      UI.icon("sound")
    );
    readBtn.addEventListener("click", function () {
      const ok = Voice.speak(v.text + " " + v.ref.replace(/(\d+):(\d+)/, "$1 verse $2") + ".", { rate: 0.92 });
      if (!ok) UI.toast("This browser can't read aloud.");
    });

    return UI.h(
      "div",
      { class: "card word-card", data: { season: w.occasion.kind } },
      UI.h(
        "div",
        { class: "word-head" },
        UI.h("div", { class: "eyebrow word-eyebrow", text: w.occasion.label }),
        readBtn
      ),
      UI.h("p", { class: "word-verse", text: v.text }),
      UI.h("div", { class: "word-ref", text: v.ref + " (KJV)" }),
      extraBlock(w.extra),
      littleBlock(w.little)
    );
  }

  return { today: today, card: card, dayOfYear: dayOfYear, occasion: occasion };
})();
