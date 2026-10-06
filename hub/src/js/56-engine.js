/* ============================================================
   Engine — the games' shared machinery.

   The Bible tab's games run on Phaser 4 (WebGL), vendored in hub/vendor
   and loaded only the first time a game is opened, so nothing else in the
   app pays for it. A game opens full-screen over the app, the way a game
   on a tablet does, and the back button (or the phone's own back gesture)
   closes it.

   What lives here, so each game can be about its own idea:

     open()       the full-screen shell: canvas, back and mute buttons,
                  loading, the end-of-picture card, and the history entry
                  that lets "back" close the game.
     Sfx          sound designed rather than beeped: a mixing bus with a
                  touch of room reverb, bells, a marimba, pops, whooshes,
                  a wooden snap, rain — and a music box playing "Jesus
                  Loves Me" very quietly, which dips whenever the voice
                  speaks.
     textures     the storybook SVGs turned into crisp WebGL textures, and
                  the little shapes the effects are made of.
     kit()        effects every game wants: a sky, drifting motes,
                  sparkle bursts, confetti, a hint hand, and the
                  "picture comes alive" moment at the end.
     celebrate()  the finish: fanfare, confetti, the picture's name said
                  out loud, then the card slides in and the camera frames
                  the picture beside it.

   Game coordinates are device pixels (the canvas is sized to the screen
   times its pixel ratio, then shown at 1/ratio), so everything is sharp on
   a phone; `ctx.u` turns CSS pixels into game pixels.
   ============================================================ */

const Engine = (function () {
  const h = UI.h;
  const PHASER = "/vendor/phaser-4.2.1.min.js";
  const PHASER_CDN = "https://cdn.jsdelivr.net/npm/phaser@4.2.1/dist/phaser.min.js";

  /* ---------- loading Phaser ---------- */

  let loading = null;
  function loadPhaser() {
    if (window.Phaser) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      function add(src, fallback) {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = function () { if (window.Phaser) resolve(); else fallback(); };
        s.onerror = fallback;
        document.head.appendChild(s);
      }
      /* Our own copy first; the public CDN only if this copy of the app
         can't serve it (the Surface's local fallback server, say). */
      add(PHASER, function () {
        add(PHASER_CDN, function () { loading = null; reject(new Error("The game engine didn't load.")); });
      });
    });
    return loading;
  }

  function buzz(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* fine */ }
  }

  /* ============================================================
     Sound
     ============================================================ */

  const Sfx = (function () {
    let ac = null, master = null, sfx = null, music = null, wet = null;
    let noiseBuf = null;

    function ctx() {
      if (ac) return ac;
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        const comp = ac.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.ratio.value = 3.5;
        master = ac.createGain();
        master.gain.value = PlayKit.muted() ? 0 : 0.9;
        master.connect(comp);
        comp.connect(ac.destination);

        /* A small warm room, so a bell rings rather than clicks. */
        const verb = ac.createConvolver();
        verb.buffer = impulse(1.8, 3.2);
        wet = ac.createGain();
        wet.gain.value = 0.24;
        verb.connect(wet);
        wet.connect(master);

        sfx = ac.createGain();
        sfx.connect(master);
        sfx.connect(verb);
        music = ac.createGain();
        music.gain.value = 0;
        music.connect(master);
        music.connect(verb);

        noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) {
        ac = null;
      }
      return ac;
    }

    function impulse(sec, decay) {
      const rate = ac.sampleRate, len = Math.floor(rate * sec);
      const b = ac.createBuffer(2, len, rate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return b;
    }

    function now() {
      const c = ctx();
      if (!c) return -1;
      if (c.state === "suspended") c.resume();
      return c.currentTime;
    }

    /* One enveloped oscillator. `to` sweeps the pitch; `bus` picks the mix. */
    function tone(o) {
      const t0 = now();
      if (t0 < 0) return;
      const t = t0 + (o.at || 0);
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = o.type || "sine";
      osc.frequency.setValueAtTime(o.f, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.sweep || o.dur));
      if (o.detune) osc.detune.value = o.detune;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.vol, t + (o.attack || 0.006));
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      osc.connect(g);
      g.connect(o.bus || sfx);
      osc.start(t);
      osc.stop(t + o.dur + 0.05);
    }

    function noise(o) {
      const t0 = now();
      if (t0 < 0) return null;
      const t = t0 + (o.at || 0);
      const src = ac.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = !!o.loop;
      const f = ac.createBiquadFilter();
      f.type = o.filter || "bandpass";
      f.frequency.setValueAtTime(o.f, t);
      if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
      f.Q.value = o.q || 1;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.vol, t + (o.attack || 0.004));
      if (!o.loop) g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      src.connect(f);
      f.connect(g);
      g.connect(o.bus || sfx);
      src.start(t, Math.random());
      if (!o.loop) src.stop(t + o.dur + 0.05);
      return { src: src, gain: g };
    }

    /* A bell: a pure tone with the slightly-off overtone real bells have. */
    function bell(f, at, vol, dur) {
      tone({ f: f, at: at, vol: vol, dur: dur || 1.4 });
      tone({ f: f * 2.76, at: at, vol: vol * 0.22, dur: (dur || 1.4) * 0.35 });
      tone({ f: f * 5.4, at: at, vol: vol * 0.06, dur: (dur || 1.4) * 0.15 });
    }
    function marimba(f, at, vol) {
      tone({ f: f, at: at, vol: vol, dur: 0.6, type: "sine" });
      tone({ f: f * 4, at: at, vol: vol * 0.18, dur: 0.09, type: "sine" });
      tone({ f: f * 10, at: at, vol: vol * 0.05, dur: 0.03, type: "sine" });
    }

    /* C major pentatonic, from middle C up three octaves. Any run of these
       sounds like a tune, so joining dots plays something pleasant. */
    const PENTA = [];
    [261.63, 293.66, 329.63, 392, 440].forEach(function (f) { PENTA.push(f, f * 2, f * 4); });
    PENTA.sort(function (a, b) { return a - b; });

    const fx = {
      pop: function () {
        tone({ f: 420, to: 1150, sweep: 0.07, dur: 0.12, vol: 0.22 });
        noise({ f: 3200, q: 2, dur: 0.02, vol: 0.12 });
      },
      sparkle: function () {
        for (let i = 0; i < 4; i++) bell(PENTA[10 + Math.floor(Math.random() * 5)], i * 0.045, 0.045, 0.6);
      },
      note: function (i) {
        marimba(PENTA[Math.min(PENTA.length - 1, 5 + i)], 0, 0.22);
      },
      chime: function () {
        bell(1046.5, 0, 0.07);
        bell(1318.5, 0.07, 0.06);
        bell(1568, 0.14, 0.06);
      },
      snap: function () {
        noise({ f: 2400, q: 5, dur: 0.035, vol: 0.4 });
        tone({ f: 160, to: 80, dur: 0.09, vol: 0.28 });
        bell(1568, 0.02, 0.035, 0.5);
      },
      lift: function () {
        tone({ f: 330, to: 520, sweep: 0.08, dur: 0.12, vol: 0.08, type: "triangle" });
      },
      drop: function () {
        tone({ f: 220, to: 140, dur: 0.1, vol: 0.12 });
        noise({ f: 700, filter: "lowpass", dur: 0.06, vol: 0.08 });
      },
      boing: function () {
        tone({ f: 200, to: 520, sweep: 0.06, dur: 0.06, vol: 0.14, type: "triangle" });
        tone({ f: 520, to: 160, at: 0.06, dur: 0.34, vol: 0.12, type: "triangle" });
      },
      miss: function () {
        tone({ f: 330, to: 247, dur: 0.18, vol: 0.09, type: "triangle" });
      },
      whoosh: function () {
        noise({ f: 300, to: 2600, q: 0.8, dur: 0.38, vol: 0.12, attack: 0.08 });
      },
      step: function (i) {
        noise({ f: i % 2 ? 900 : 700, filter: "lowpass", dur: 0.035, vol: 0.06 });
        tone({ f: i % 2 ? 196 : 220, dur: 0.05, vol: 0.03 });
      },
      hop: function () {
        tone({ f: 330, to: 660, sweep: 0.09, dur: 0.11, vol: 0.08 });
      },
      thud: function () {
        tone({ f: 110, to: 55, dur: 0.28, vol: 0.4 });
        noise({ f: 400, filter: "lowpass", dur: 0.18, vol: 0.2 });
      },
      splash: function () {
        noise({ f: 2200, to: 500, filter: "lowpass", dur: 0.7, vol: 0.18, attack: 0.02 });
      },
      chirp: function () {
        tone({ f: 2300, to: 3100, sweep: 0.06, dur: 0.08, vol: 0.05 });
        tone({ f: 2500, to: 3300, sweep: 0.06, at: 0.12, dur: 0.08, vol: 0.05 });
      },
      win: function () {
        [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach(function (f, i) { bell(f, i * 0.09, 0.07, 1.6); });
        /* a soft warm chord underneath */
        [261.63, 329.63, 392].forEach(function (f, i) {
          tone({ f: f, at: 0.05, vol: 0.035, dur: 2.2, type: "sawtooth", attack: 0.25, detune: i * 4 - 4 });
        });
      },
    };

    /* Rain: a loop of filtered noise that fades in and out. */
    let rainNode = null;
    function rain(on) {
      if (!ctx()) return;
      if (on && !rainNode) {
        rainNode = noise({ f: 1400, filter: "lowpass", q: 0.4, loop: true, vol: 0.09, attack: 1.2 });
      } else if (!on && rainNode) {
        const n = rainNode;
        rainNode = null;
        const t = ac.currentTime;
        n.gain.gain.cancelScheduledValues(t);
        n.gain.gain.setValueAtTime(n.gain.gain.value, t);
        n.gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
        n.src.stop(t + 1.5);
      }
    }

    /* ---------- the music box ----------
       "Jesus Loves Me" (William Bradbury, 1862), the verse, round and
       round, on a music box so quiet it is more felt than heard. */
    const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392, A4 = 440, C5 = 523.25, E5 = 659.25, D5 = 587.33, G5 = 783.99, A5 = 880, C6 = 1046.5;
    const TUNE = [
      [G5, 1], [E5, 1], [E5, 1], [D5, 1], [E5, 1], [G5, 1], [G5, 2],
      [A5, 1], [A5, 1], [C6, 1], [A5, 1], [A5, 1], [G5, 1], [G5, 2],
      [G5, 1], [E5, 1], [E5, 1], [D5, 1], [E5, 1], [G5, 1], [G5, 2],
      [A5, 1], [A5, 1], [G5, 1], [C5, 1], [E5, 1], [D5, 1], [C5, 2],
    ];
    const BASS = [C4, G4, C4, G4, F4, C4, C4, G4, C4, G4, C4, G4, F4, G4, C4, C4];
    const BEAT = 60 / 88;
    let musicOn = false, musicTimer = null, nextAt = 0, step = 0, ducked = false;
    const LEN = TUNE.reduce(function (n, x) { return n + x[1]; }, 0) + 4;

    function scheduleMusic() {
      if (!ac || !musicOn) return;
      while (nextAt < ac.currentTime + 0.5) {
        /* walk the tune: find which note starts on this beat */
        let beat = step % LEN, at = 0, idx = -1;
        for (let i = 0; i < TUNE.length; i++) {
          if (at === beat) { idx = i; break; }
          at += TUNE[i][1];
        }
        const when = nextAt - ac.currentTime;
        if (idx >= 0) {
          tone({ f: TUNE[idx][0], at: when, vol: 0.5, dur: 1.5, bus: music });
          tone({ f: TUNE[idx][0] * 3, at: when, vol: 0.05, dur: 0.3, bus: music });
        }
        if (beat % 2 === 0 && beat < LEN - 4) {
          tone({ f: BASS[(beat / 2) % BASS.length] / 2, at: when, vol: 0.16, dur: 1.8, bus: music });
        }
        nextAt += BEAT;
        step++;
      }
    }
    function musicLevel() {
      if (!music || !ac) return;
      const target = !musicOn ? 0.0001 : ducked ? 0.012 : 0.05;
      const t = ac.currentTime;
      music.gain.cancelScheduledValues(t);
      music.gain.setValueAtTime(Math.max(0.0001, music.gain.value), t);
      music.gain.exponentialRampToValueAtTime(target, t + 0.4);
    }
    function startMusic() {
      if (!ctx() || musicOn) return;
      musicOn = true;
      nextAt = ac.currentTime + 0.6;
      step = 0;
      musicLevel();
      musicTimer = setInterval(scheduleMusic, 120);
    }
    function stopMusic() {
      musicOn = false;
      clearInterval(musicTimer);
      musicTimer = null;
      musicLevel();
    }
    function duck(on) {
      ducked = !!on;
      musicLevel();
    }

    function applyMute() {
      if (!master || !ac) return;
      const t = ac.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t);
      master.gain.exponentialRampToValueAtTime(PlayKit.muted() ? 0.0001 : 0.9, t + 0.15);
    }

    return Object.assign({ ctx: ctx, rain: rain, startMusic: startMusic, stopMusic: stopMusic, duck: duck, applyMute: applyMute, PENTA: PENTA }, fx);
  })();

  /* Speak, with the music ducked underneath. */
  function say(text, onEnd) {
    Sfx.duck(true);
    PlayKit.say(text, function () {
      Sfx.duck(false);
      if (onEnd) onEnd();
    });
  }

  /* ============================================================
     Textures
     ============================================================ */

  const canvases = new Map();

  /* An SVG drawing, rasterised once at the size it will be used, kept for
     every later game. */
  function svgTexture(key, inner, vb, w, hgt) {
    if (canvases.has(key)) return Promise.resolve(canvases.get(key));
    return new Promise(function (resolve) {
      const svgText = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" width="' + w + '" height="' + hgt + '">' + inner + "</svg>";
      const img = new Image();
      img.onload = function () {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = hgt;
        c.getContext("2d").drawImage(img, 0, 0, w, hgt);
        canvases.set(key, c);
        resolve(c);
      };
      img.onerror = function () {
        const c = document.createElement("canvas");
        c.width = c.height = 4;
        canvases.set(key, c);
        resolve(c);
      };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);
    });
  }

  function canvasTexture(key, w, hgt, draw) {
    if (canvases.has(key)) return canvases.get(key);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = hgt;
    draw(c.getContext("2d"), w, hgt);
    canvases.set(key, c);
    return c;
  }

  /* The little shapes the effects are made of. Drawn once, white, and
     tinted wherever they are used. */
  function makeEffectTextures() {
    canvasTexture("fx-glow", 128, 128, function (g) {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.25, "rgba(255,255,255,0.6)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
    });
    canvasTexture("fx-dot", 32, 32, function (g) {
      g.fillStyle = "#fff";
      g.beginPath(); g.arc(16, 16, 14, 0, Math.PI * 2); g.fill();
    });
    canvasTexture("fx-spark", 64, 64, function (g) {
      g.fillStyle = "#fff";
      g.beginPath();
      g.moveTo(32, 2);
      g.quadraticCurveTo(36, 28, 62, 32);
      g.quadraticCurveTo(36, 36, 32, 62);
      g.quadraticCurveTo(28, 36, 2, 32);
      g.quadraticCurveTo(28, 28, 32, 2);
      g.fill();
    });
    canvasTexture("fx-heart", 64, 64, function (g) {
      g.fillStyle = "#fff";
      g.beginPath();
      g.moveTo(32, 56);
      g.bezierCurveTo(8, 40, 2, 24, 14, 14);
      g.bezierCurveTo(22, 8, 30, 12, 32, 20);
      g.bezierCurveTo(34, 12, 42, 8, 50, 14);
      g.bezierCurveTo(62, 24, 56, 40, 32, 56);
      g.fill();
    });
    canvasTexture("fx-ring", 128, 128, function (g) {
      g.strokeStyle = "#fff";
      g.lineWidth = 8;
      g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.stroke();
    });
    canvasTexture("fx-bit", 16, 10, function (g) {
      g.fillStyle = "#fff";
      g.fillRect(0, 0, 16, 10);
    });
    canvasTexture("fx-drop", 16, 48, function (g) {
      const gr = g.createLinearGradient(0, 0, 0, 48);
      gr.addColorStop(0, "rgba(255,255,255,0)");
      gr.addColorStop(1, "rgba(255,255,255,0.95)");
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(8, 0); g.lineTo(11, 40); g.arc(8, 41, 3.5, 0, Math.PI); g.lineTo(5, 40);
      g.fill();
    });
    canvasTexture("fx-shadow", 128, 48, function (g) {
      const gr = g.createRadialGradient(64, 24, 0, 64, 24, 64);
      gr.addColorStop(0, "rgba(0,0,0,0.42)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.save(); g.scale(1, 48 / 128); g.beginPath(); g.arc(64, 64, 64, 0, Math.PI * 2); g.restore();
      g.fill();
    });
    canvasTexture("fx-z", 64, 64, function (g) {
      g.fillStyle = "#fff";
      g.font = "800 52px system-ui, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("z", 32, 34);
    });
    canvasTexture("fx-rays", 256, 256, function (g) {
      g.translate(128, 128);
      for (let i = 0; i < 14; i++) {
        g.rotate((Math.PI * 2) / 14);
        const gr = g.createLinearGradient(0, 0, 0, -128);
        gr.addColorStop(0, "rgba(255,255,255,0.9)");
        gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(-5, 0); g.lineTo(-20, -128); g.lineTo(20, -128); g.lineTo(5, 0); g.fill();
      }
    });
    canvasTexture("fx-shine", 128, 512, function (g) {
      const gr = g.createLinearGradient(0, 0, 128, 0);
      gr.addColorStop(0, "rgba(255,255,255,0)");
      gr.addColorStop(0.5, "rgba(255,255,255,0.7)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 512);
    });
  }

  /* Hand every texture made so far to this game. */
  function useTextures(scene) {
    canvases.forEach(function (c, key) {
      if (!scene.textures.exists(key)) scene.textures.addCanvas(key, c);
    });
  }

  /* A picture, or one of its subjects alone. */
  function pictureTexture(pic, size) {
    return svgTexture("pic-" + pic.id, picMarkup(pic), "0 0 100 100", size || 1024, size || 1024);
  }
  function subjectTexture(key, pic, size) {
    return svgTexture(key, (pic.tokenExtra || "") + picMarkup(pic, { body: true, details: true, token: true }), "0 0 100 100", size || 320, size || 320);
  }
  function castTexture(key, size) {
    if (key === "ark") return svgTexture("cast-ark", CAST.ark, "0 0 200 130", 900, 585);
    if (key === "plank") return svgTexture("cast-plank", CAST.plank, "0 0 100 24", 400, 96);
    return svgTexture("cast-" + key, CAST[key], "0 0 100 100", size || 320, size || 320);
  }
  function zooTexture(name) {
    return svgTexture("zoo-" + name, ZOO[name].svg, "0 0 100 100", 320, 320);
  }

  /* ============================================================
     The full-screen shell
     ============================================================ */

  let current = null;

  function open(def, opts) {
    close();
    const ctx = {
      def: def,
      kid: opts.kid,
      big: !!opts.big,
      level: 0,
      u: 1,
      game: null,
      scene: null,
      alive: true,
      say: say,
      onResize: null,
    };
    current = ctx;

    const holder = h("div", { class: "ge-canvas" });
    const back = h("button", { class: "ge-btn ge-back", type: "button", "aria-label": "Back to the games" }, UI.icon("x"));
    back.addEventListener("click", function () { leave(); });
    const muteBtn = h("button", { class: "ge-btn ge-mute", type: "button" });
    function paintMute() {
      muteBtn.textContent = "";
      muteBtn.appendChild(UI.icon(PlayKit.muted() ? "mute" : "sound"));
      muteBtn.setAttribute("aria-label", PlayKit.muted() ? "Turn the sound on" : "Turn the sound off");
      muteBtn.setAttribute("aria-pressed", PlayKit.muted() ? "true" : "false");
    }
    muteBtn.addEventListener("click", function () {
      PlayKit.setMuted(!PlayKit.muted());
      Sfx.applyMute();
      paintMute();
    });
    paintMute();

    const caption = h("span", { class: "ge-caption" });
    const top = h("div", { class: "ge-top" },
      back,
      h("div", { class: "ge-title" }, h("span", { class: "ge-name", text: def.title }), caption),
      muteBtn);
    const loader = h("div", { class: "ge-load" },
      h("div", { class: "ge-load-art" }, def.preview()),
      h("div", { class: "ge-load-text", text: "Getting ready…" }));
    const cards = h("div", { class: "ge-cards" });
    const root = h("div", { class: "ge ge-" + def.id, role: "dialog", "aria-modal": "true", "aria-label": def.title },
      holder, top, loader, cards);

    ctx.root = root;
    ctx.holder = holder;
    ctx.cards = cards;
    ctx.loader = loader;
    ctx.caption = function (t) { caption.textContent = t || ""; };

    document.body.appendChild(root);
    document.documentElement.classList.add("ge-open");
    try { history.pushState({ ge: 1 }, ""); ctx.pushed = true; } catch (e) { ctx.pushed = false; }

    Sfx.ctx();
    Sfx.applyMute();
    makeEffectTextures();

    loadPhaser()
      .then(function () { return Promise.resolve(def.prepare(ctx)); })
      .then(function () { if (ctx.alive) boot(ctx); })
      .catch(function (e) {
        console.error("game failed to start", e);
        if (!ctx.alive) return;
        loader.textContent = "";
        const b = h("button", { class: "btn btn-primary", type: "button" }, "Back");
        b.addEventListener("click", leave);
        loader.appendChild(h("div", { class: "ge-load-text", text: "The game couldn't start. It needs a connection the first time." }));
        loader.appendChild(b);
      });
  }

  function screen() {
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    return { w: window.innerWidth, h: window.innerHeight, dpr: dpr };
  }

  function boot(ctx) {
    const s = screen();
    ctx.u = s.dpr;
    ctx.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: ctx.holder,
      width: Math.round(s.w * s.dpr),
      height: Math.round(s.h * s.dpr),
      zoom: 1 / s.dpr,
      backgroundColor: ctx.def.background || "#1b2a36",
      scale: { mode: Phaser.Scale.NONE },
      audio: { noAudio: true },
      input: { activePointers: 3 },
      banner: false,
      render: { antialias: true, powerPreference: "high-performance" },
      scene: sceneFor(ctx),
    });
    Sfx.startMusic();
  }

  /* Each level is a fresh scene with fresh state: the game's `scene(ctx)`
     returns { create, update } closures, and a new level asks for new
     ones rather than resetting the old. */
  function sceneFor(ctx) {
    const def = ctx.def.scene(ctx);
    return {
      key: "play",
      create: function () {
        ctx.scene = this;
        useTextures(this);
        this.input.dragDistanceThreshold = 2;
        if (ctx.loader.isConnected) {
          ctx.loader.classList.add("is-gone");
          setTimeout(function () { ctx.loader.remove(); }, 400);
        }
        def.create.call(this);
      },
      update: function (time, dt) {
        if (def.update) def.update.call(this, time, dt);
      },
    };
  }

  function nextLevel(ctx) {
    if (!ctx.alive || !ctx.game) return;
    ctx.cards.textContent = "";
    ctx.level++;
    Promise.resolve(ctx.def.prepare(ctx)).then(function () {
      if (!ctx.alive) return;
      const game = ctx.game;
      game.scene.remove("play");
      game.scene.add("play", sceneFor(ctx), true);
    });
  }

  function leave() {
    if (current && current.pushed && history.state && history.state.ge) history.back();
    else close();
  }

  function close() {
    const ctx = current;
    if (!ctx) return;
    current = null;
    ctx.alive = false;
    Sfx.stopMusic();
    Sfx.rain(false);
    PlayKit.hush();
    try { if (ctx.game) ctx.game.destroy(true); } catch (e) { /* fine */ }
    if (ctx.root) ctx.root.remove();
    document.documentElement.classList.remove("ge-open");
  }

  window.addEventListener("popstate", function () { if (current) close(); });

  let resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      const ctx = current;
      if (!ctx || !ctx.game) return;
      const s = screen();
      ctx.u = s.dpr;
      ctx.game.scale.resize(Math.round(s.w * s.dpr), Math.round(s.h * s.dpr));
      ctx.game.scale.setZoom(1 / s.dpr);
      if (ctx.onResize) ctx.onResize();
    }, 120);
  });

  /* ============================================================
     The kit: effects for inside a game
     ============================================================ */

  function kit(scene, ctx) {
    const u = ctx.u;
    const W = function () { return scene.scale.width; };
    const H = function () { return scene.scale.height; };
    /* Room at the top for the back and mute buttons. */
    const top = function () { return 68 * u; };

    function hex(c) { return typeof c === "number" ? c : parseInt(String(c).replace("#", ""), 16); }

    /* A vertical gradient filling the screen, redrawn on resize. */
    function sky(topColor, bottomColor, depth) {
      const g = scene.add.graphics().setDepth(depth || -100);
      let a = hex(topColor), b = hex(bottomColor);
      function draw() {
        g.clear();
        g.fillGradientStyle(a, a, b, b, 1);
        g.fillRect(0, 0, W(), H());
      }
      draw();
      return {
        g: g,
        draw: draw,
        set: function (t, bt) { a = hex(t); b = hex(bt); draw(); },
      };
    }

    /* Soft motes drifting up through the scene, for depth and life. */
    function motes(tint, alpha) {
      return scene.add.particles(0, 0, "fx-glow", {
        x: { min: 0, max: W() },
        y: { min: H() * 0.2, max: H() * 1.05 },
        speedY: { min: -14 * u, max: -36 * u },
        speedX: { min: -8 * u, max: 8 * u },
        scale: { min: 0.05 * u, max: 0.16 * u },
        /* fade in, then out, over each mote's life */
        alpha: { onEmit: function () { return 0; }, onUpdate: function (p, k, t) { return Math.sin(t * Math.PI) * (alpha || 0.35); } },
        lifespan: { min: 5000, max: 9000 },
        frequency: 260,
        tint: tint || 0xffffff,
        blendMode: "ADD",
      }).setDepth(-50);
    }

    /* A one-off burst of sparkles, hearts or confetti at a point. */
    function burst(x, y, o) {
      const opt = o || {};
      const em = scene.add.particles(0, 0, opt.tex || "fx-spark", {
        speed: { min: (opt.speed || 260) * 0.35 * u, max: (opt.speed || 260) * u },
        angle: opt.angle || { min: 0, max: 360 },
        scale: { start: (opt.scale || 0.35) * u, end: 0 },
        alpha: { start: 1, end: 0 },
        rotate: opt.spin ? { min: -180, max: 180 } : 0,
        lifespan: { min: 400, max: opt.life || 900 },
        gravityY: (opt.gravity || 0) * u,
        tint: opt.tints || [0xffffff, 0xffe08a, 0xffc94a, 0xfff3c4],
        blendMode: opt.blend || "ADD",
        emitting: false,
      }).setDepth(opt.depth || 900);
      if (opt.parent) opt.parent.add(em);
      em.explode(opt.count || 18, x, y);
      scene.time.delayedCall((opt.life || 900) + 200, function () { em.destroy(); });
      return em;
    }

    /* A ring that grows and fades, for a snap or an arrival. */
    function ring(x, y, r, tint, parent) {
      const s = scene.add.image(x, y, "fx-ring").setTint(tint || 0xffffff).setDepth(880).setAlpha(0.9);
      s.setScale((r * 0.4) / 64);
      if (parent) parent.add(s);
      scene.tweens.add({ targets: s, scale: (r * 1.3) / 64, alpha: 0, duration: 520, ease: "Cubic.easeOut", onComplete: function () { s.destroy(); } });
    }

    /* Confetti from the top of the screen. */
    function confetti() {
      if (PlayKit.reduceMotion) return;
      const em = scene.add.particles(0, 0, "fx-bit", {
        x: { min: 0, max: W() },
        y: -20 * u,
        speedY: { min: 200 * u, max: 520 * u },
        speedX: { min: -140 * u, max: 140 * u },
        gravityY: 320 * u,
        rotate: { min: 0, max: 360 },
        scaleX: { min: 0.6 * u, max: 1.1 * u },
        scaleY: { min: 0.5 * u, max: 1 * u },
        lifespan: 3600,
        quantity: 6,
        frequency: 18,
        tint: [0xef6f6c, 0xf6a24b, 0xffd166, 0x8fd18a, 0x6fb6e8, 0x9b7fd1, 0xffffff],
        emitting: true,
      }).setDepth(950);
      scene.time.delayedCall(900, function () { em.stop(); });
      scene.time.delayedCall(4800, function () { em.destroy(); });
    }

    /* The hint hand: shows a tap or a drag, then gets out of the way. */
    let handSprite = null, handTween = null;
    function hand() {
      if (!handSprite) {
        handSprite = scene.add.image(0, 0, "cast-hand").setOrigin(0.37, 0.07).setDepth(990).setAlpha(0);
        handSprite.setScale((64 * u) / 320);
      }
      return handSprite;
    }
    function showDrag(from, to, opts) {
      const o = opts || {};
      const s = hand();
      if (handTween) handTween.stop();
      s.setPosition(from.x, from.y).setAlpha(0).setScale((64 * u) / 320);
      handTween = scene.tweens.chain({
        targets: s,
        loop: o.loops === undefined ? 1 : o.loops,
        loopDelay: 400,
        tweens: [
          { alpha: 1, duration: 260, x: from.x, y: from.y },
          { scale: (56 * u) / 320, duration: 160 },
          { x: to.x, y: to.y, duration: o.dur || 900, ease: "Sine.easeInOut" },
          { scale: (64 * u) / 320, duration: 160 },
          { alpha: 0, duration: 260 },
        ],
      });
    }
    function showTap(at) {
      const s = hand();
      if (handTween) handTween.stop();
      s.setPosition(at.x, at.y).setAlpha(0).setScale((64 * u) / 320);
      handTween = scene.tweens.chain({
        targets: s,
        loop: 1,
        loopDelay: 300,
        tweens: [
          { alpha: 1, duration: 220 },
          { scale: (54 * u) / 320, duration: 140, yoyo: true, repeat: 1 },
          { alpha: 0, duration: 260, delay: 200 },
        ],
      });
    }
    function hideHand() {
      if (handTween) handTween.stop();
      handTween = null;
      if (handSprite) handSprite.setAlpha(0);
    }

    /* The picture comes alive: each one does its own thing. Coordinates in
       picture units (0-100) inside a container whose 100 units are `size`
       pixels across. */
    const ALIVE = {
      ark: { kind: "rainbow", at: [50, 30] },
      dove: { kind: "feathers", at: [56, 34] },
      whale: { kind: "spray", at: [36, 12] },
      sheep: { kind: "hearts", at: [50, 32] },
      lion: { kind: "zzz", at: [80, 24] },
      basket: { kind: "ripples", at: [50, 74] },
      star: { kind: "twinkle", at: [50, 44] },
      crown: { kind: "twinkle", at: [50, 52] },
      cross: { kind: "rays", at: [50, 36] },
      tomb: { kind: "rays", at: [50, 52] },
      heart: { kind: "hearts", at: [50, 46] },
    };
    function alive(picId, container, size) {
      const a = ALIVE[picId] || { kind: "twinkle", at: [50, 50] };
      const k = size / 100;
      const x = a.at[0] * k, y = a.at[1] * k;
      let em = null;
      if (a.kind === "spray") {
        em = scene.add.particles(x, y, "fx-drop", {
          angle: { min: -120, max: -60 }, speed: { min: 180 * k, max: 300 * k }, gravityY: 520 * k,
          scale: { start: 0.09 * k, end: 0.04 * k }, alpha: { start: 1, end: 0 }, lifespan: 1100, frequency: 45,
          tint: [0x9fd8ff, 0xffffff], rotate: { min: -20, max: 20 },
        });
      } else if (a.kind === "hearts") {
        em = scene.add.particles(x, y, "fx-heart", {
          x: { min: -18 * k, max: 18 * k }, speedY: { min: -26 * k, max: -46 * k }, speedX: { min: -8 * k, max: 8 * k },
          scale: { start: 0.05 * k, end: 0.12 * k }, alpha: { start: 1, end: 0 }, lifespan: 2400, frequency: 420,
          tint: [0xef5f67, 0xf6a3b8, 0xff8fa3],
        });
      } else if (a.kind === "zzz") {
        em = scene.add.particles(x, y, "fx-z", {
          speedY: { min: -14 * k, max: -22 * k }, speedX: { min: 6 * k, max: 14 * k },
          scale: { start: 0.05 * k, end: 0.13 * k }, alpha: { start: 1, end: 0 }, lifespan: 2600, frequency: 900, tint: 0x7a5aa8,
        });
      } else if (a.kind === "feathers") {
        em = scene.add.particles(x, y, "fx-glow", {
          x: { min: -20 * k, max: 20 * k }, speedY: { min: 6 * k, max: 16 * k }, speedX: { min: -12 * k, max: 12 * k },
          scaleX: { start: 0.07 * k, end: 0.04 * k }, scaleY: 0.025 * k, rotate: { min: 0, max: 360 }, alpha: { start: 0.9, end: 0 },
          lifespan: 3200, frequency: 520, tint: 0xffffff,
        });
      } else if (a.kind === "ripples") {
        const loop = scene.time.addEvent({
          delay: 900, loop: true, callback: function () {
            const s = scene.add.image(x, y, "fx-ring").setTint(0xffffff).setAlpha(0.8).setScale(0.05 * k, 0.018 * k);
            container.add(s);
            scene.tweens.add({ targets: s, scaleX: 0.42 * k, scaleY: 0.12 * k, alpha: 0, duration: 1800, ease: "Sine.easeOut", onComplete: function () { s.destroy(); } });
          },
        });
        return loop;
      } else if (a.kind === "rays") {
        const r = scene.add.image(x, y, "fx-rays").setBlendMode("ADD").setAlpha(0.32).setTint(0xfff3c4).setScale((1.2 * size) / 256);
        container.addAt(r, 1);
        scene.tweens.add({ targets: r, angle: 360, duration: 24000, repeat: -1 });
        scene.tweens.add({ targets: r, alpha: 0.18, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        return r;
      } else if (a.kind === "rainbow") {
        em = scene.add.particles(x, y, "fx-spark", {
          emitZone: { type: "random", source: new Phaser.Geom.Rectangle(-44 * k, -20 * k, 88 * k, 40 * k) },
          scale: { start: 0, end: 0.12 * k, ease: "Sine.easeOut" }, alpha: { start: 1, end: 0 }, lifespan: 1000, frequency: 120,
          tint: [0xef6f6c, 0xf6a24b, 0xffd166, 0x8fd18a, 0x6fb6e8], blendMode: "ADD",
        });
      } else {
        em = scene.add.particles(x, y, "fx-spark", {
          emitZone: { type: "random", source: new Phaser.Geom.Circle(0, 0, 40 * k) },
          scale: { start: 0, end: 0.1 * k, ease: "Sine.easeOut" }, alpha: { start: 1, end: 0 }, lifespan: 900, frequency: 140,
          tint: [0xffffff, 0xffe08a], blendMode: "ADD",
        });
      }
      if (em) container.add(em);
      return em;
    }

    /* A gentle, endless "breathing" so a finished picture never looks
       frozen. */
    function breathe(target, amount) {
      return scene.tweens.add({
        targets: target, scale: target.scale * (1 + (amount || 0.02)),
        duration: 1600, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });
    }

    return {
      u: u, W: W, H: H, top: top, sky: sky, motes: motes, burst: burst, ring: ring, confetti: confetti,
      showDrag: showDrag, showTap: showTap, hideHand: hideHand, alive: alive, breathe: breathe, hex: hex,
    };
  }

  /* ============================================================
     The finish
     ============================================================ */

  /* o.pic       the picture whose card to show
     o.region()  where the picture is on screen, in game pixels
     o.nextLabel the button that plays on */
  function celebrate(ctx, o) {
    const scene = ctx.scene;
    const k = kit(scene, ctx);
    Sfx.win();
    k.confetti();
    buzz(40);
    say(o.pic.said, function () {
      if (!ctx.alive || ctx.scene !== scene) return;
      const card = PlayKit.finale(ctx.cards, {
        pic: o.pic,
        big: ctx.big,
        nextLabel: o.nextLabel || "Play again",
        onNext: function () { Sfx.pop(); nextLevel(ctx); },
        onMenu: leave,
        onWrong: function () { Sfx.miss(); },
        onRight: function () { Sfx.chime(); k.confetti(); },
      });
      /* Frame the picture in whatever the card leaves free. */
      requestAnimationFrame(function () {
        if (!o.region || !card.isConnected) return;
        frame(scene, ctx, o.region(), freeArea(ctx, card));
      });
      say(o.pic.truth, function () {
        if (card.isConnected && card._ask) card._ask();
      });
    });
  }

  /* The part of the screen the card isn't covering, in game pixels. */
  function freeArea(ctx, card) {
    const u = ctx.u;
    const r = card.getBoundingClientRect();
    const W = window.innerWidth, H = window.innerHeight;
    const topPad = 64;
    if (r.left > W * 0.3) return { x: 0, y: topPad * u, w: r.left * u, h: (H - topPad) * u };
    return { x: 0, y: topPad * u, w: W * u, h: Math.max(80, r.top - topPad) * u };
  }

  /* Move and zoom the camera so `region` sits in the middle of `free`. */
  function frame(scene, ctx, region, free) {
    const cam = scene.cameras.main;
    const pad = 0.9;
    const z = Math.min(1.25, Math.min((free.w * pad) / region.w, (free.h * pad) / region.h));
    const rcx = region.x + region.w / 2, rcy = region.y + region.h / 2;
    const fcx = free.x + free.w / 2, fcy = free.y + free.h / 2;
    const W = scene.scale.width, H = scene.scale.height;
    /* Put world point (rcx, rcy) at screen point (fcx, fcy). */
    const cx = rcx + (W / 2 - fcx) / z;
    const cy = rcy + (H / 2 - fcy) / z;
    cam.zoomTo(z, 650, "Cubic.easeInOut");
    cam.pan(cx, cy, 650, "Cubic.easeInOut");
  }

  return {
    open: open,
    close: close,
    leave: leave,
    kit: kit,
    celebrate: celebrate,
    say: say,
    Sfx: Sfx,
    buzz: buzz,
    svgTexture: svgTexture,
    canvasTexture: canvasTexture,
    canvas: function (key) { return canvases.get(key); },
    pictureTexture: pictureTexture,
    subjectTexture: subjectTexture,
    castTexture: castTexture,
    zooTexture: zooTexture,
    current: function () { return current; },
  };
})();
