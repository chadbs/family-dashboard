/* ============================================================
   Word — the morning verse.

   One KJV verse a day, the same one on every phone and on the wall, with
   a line from a Reformed voice beneath it. The pick is arithmetic on the
   date, so it needs no store, never repeats two days running, and comes
   round in a different order each year. A speaker button reads it aloud
   for the two who cannot read yet.
   ============================================================ */

const Word = (function () {
  function dayOfYear(d) {
    const start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000);
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

  function speak(text) {
    try {
      if (!("speechSynthesis" in window)) return false;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.92;
      u.pitch = 1;
      window.speechSynthesis.speak(u);
      return true;
    } catch (e) {
      return false;
    }
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
      const ok = speak(v.text + " " + v.ref.replace(/(\d+):(\d+)/, "$1 verse $2") + ".");
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

  return { today: today, card: card, speak: speak };
})();
