/* ============================================================
   Word — the morning verse.

   One KJV verse a day, the same one on every phone and on the wall, with
   a line from a Reformed voice beneath it. The pick is arithmetic on the
   date, so it needs no store, never repeats two days running, and comes
   round in a different order each year. A speaker button reads it aloud
   for the two who cannot read yet.

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

  function today(date) {
    const d = date || new Date();
    const V = (typeof SCRIPTURE !== "undefined" && SCRIPTURE.verses) || [];
    const Q = (typeof SCRIPTURE !== "undefined" && SCRIPTURE.quotes) || [];
    if (!V.length) return null;
    const doy = dayOfYear(d);
    const y = d.getFullYear();
    /* Stride by a number coprime to the list length so a year walks the
       whole list rather than revisiting a short cycle; the year offsets it. */
    const vi = (doy * 7 + y * 3) % V.length;
    const qi = Q.length ? (doy * 5 + y) % Q.length : -1;
    return { verse: V[vi], quote: qi >= 0 ? Q[qi] : null };
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
      { class: "card word-card" },
      UI.h(
        "div",
        { class: "word-head" },
        UI.h("div", { class: "eyebrow", text: "This morning's word" }),
        readBtn
      ),
      UI.h("p", { class: "word-verse", text: v.text }),
      UI.h("div", { class: "word-ref", text: v.ref + " (KJV)" }),
      w.quote
        ? UI.h(
            "div",
            { class: "word-quote" },
            UI.h("p", { class: "word-quote-text", text: "“" + w.quote.text + "”" }),
            UI.h("div", { class: "word-quote-who", text: "— " + w.quote.who })
          )
        : null
    );
  }

  return { today: today, card: card, dayOfYear: dayOfYear };
})();
