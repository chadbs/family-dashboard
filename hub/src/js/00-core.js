/* ============================================================
   Core — store, db wiring, router, DOM helpers, sheets, toasts.
   Everything the view modules are allowed to touch lives here.
   Zero dependencies. One shared script scope.
   ============================================================ */

/* ---------- paths ---------- */

const DOC_PATHS = {
  config: "config/app",
  routine: "routine/days",
  checks: "checks/recent",
  plan: "plan/current",
  daily: "daily/notes",
};

const COLL_NAMES = ["recipes", "jobs", "projects", "grocery"];

const LOCAL_KEY = "solanyk-house-v1";
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ---------- small utilities ---------- */

function uid(prefix) {
  return (
    (prefix || "x") +
    "-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/* Recursive merge, mirroring what db.update() does server-side so the
   optimistic local copy and the stored copy stay in step. Arrays replace
   wholesale — same rule as the store. */
function deepMerge(target, patch) {
  const out = isPlainObject(target) ? Object.assign({}, target) : {};
  Object.keys(patch || {}).forEach(function (k) {
    const v = patch[k];
    if (isPlainObject(v)) out[k] = deepMerge(out[k], v);
    else out[k] = v;
  });
  return out;
}

function clone(v) {
  return v === undefined ? v : JSON.parse(JSON.stringify(v));
}

/* ---------- Fmt ---------- */

const Fmt = {
  /* Local calendar date, never UTC — a phone in Michigan must agree with
     the wall in the kitchen about what day it is. */
  dayKey: function (d) {
    d = d || new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  },

  fromDayKey: function (key) {
    const p = String(key).split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  },

  /* Monday-based index, so it lines up with DAY_KEYS. */
  dayIdx: function (d) {
    d = d || new Date();
    return (d.getDay() + 6) % 7;
  },

  dayName: function (i) {
    return DAY_NAMES[((i % 7) + 7) % 7];
  },

  dayAbbr: function (i) {
    return DAY_ABBR[((i % 7) + 7) % 7];
  },

  /* Monday of the week containing d. */
  weekStart: function (d) {
    d = d || new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    start.setDate(start.getDate() - Fmt.dayIdx(d));
    return start;
  },

  /* ISO week key, e.g. "2026-W36". */
  weekKey: function (d) {
    const t = Fmt.weekStart(d);
    const thursday = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 3);
    const firstThu = new Date(thursday.getFullYear(), 0, 4);
    firstThu.setDate(firstThu.getDate() - ((firstThu.getDay() + 6) % 7) + 3);
    const week = 1 + Math.round((thursday - firstThu) / (7 * 86400000));
    return thursday.getFullYear() + "-W" + String(week).padStart(2, "0");
  },

  date: function (d, opts) {
    d = d || new Date();
    return d.toLocaleDateString(
      undefined,
      opts || { weekday: "long", month: "long", day: "numeric" }
    );
  },

  shortDate: function (d) {
    return (d || new Date()).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  },

  time: function (d) {
    return (d || new Date()).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  },

  /* "in 3 days" / "yesterday" / "Sep 20" — for job due dates. */
  relDay: function (key) {
    if (!key) return "";
    const then = Fmt.fromDayKey(key);
    const now = Fmt.fromDayKey(Fmt.dayKey());
    const days = Math.round((then - now) / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "tomorrow";
    if (days === -1) return "yesterday";
    if (days < 0) return Math.abs(days) + " days late";
    if (days <= 14) return "in " + days + " days";
    return Fmt.shortDate(then);
  },

  greeting: function (d) {
    const h = (d || new Date()).getHours();
    if (h < 5) return "Still up";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Good night";
  },

  minutes: function (n) {
    n = Number(n) || 0;
    if (n < 60) return n + " min";
    const h = Math.floor(n / 60);
    const m = n % 60;
    return m ? h + "h " + m + "m" : h + "h";
  },
};

/* ---------- Store ---------- */

const Store = (function () {
  let db = null;
  let mode = "local";
  const docs = { config: {}, routine: {}, checks: {}, plan: {}, daily: {} };
  const docExists = {};
  const docQueue = {};
  const colls = { recipes: {}, jobs: {}, projects: {}, grocery: {} };
  const listeners = [];
  let readyResolve;
  const ready = new Promise(function (r) {
    readyResolve = r;
  });
  let settled = false;

  function emit() {
    listeners.slice().forEach(function (fn) {
      try {
        fn();
      } catch (e) {
        console.error("store listener failed", e);
      }
    });
  }

  function saveLocal() {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify({ docs: docs, colls: colls }));
    } catch (e) {
      /* private window, quota, or blocked site data — the app still works,
         it just will not remember on this device. */
    }
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!isPlainObject(parsed)) return false;
      Object.keys(docs).forEach(function (k) {
        if (isPlainObject(parsed.docs && parsed.docs[k])) docs[k] = parsed.docs[k];
      });
      COLL_NAMES.forEach(function (k) {
        if (isPlainObject(parsed.colls && parsed.colls[k])) colls[k] = parsed.colls[k];
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  function applySeeds() {
    if (!Object.keys(docs.routine || {}).length) docs.routine = clone(SEED_ROUTINE);
    if (!Object.keys(docs.config || {}).length) docs.config = clone(SEED_CONFIG);
    if (!Object.keys(colls.recipes).length) {
      SEED_RECIPES.forEach(function (r) {
        colls.recipes[r.id] = clone(r);
      });
    }
    if (!Object.keys(colls.jobs).length) {
      SEED_JOBS.forEach(function (j) {
        colls.jobs[j.id] = clone(j);
      });
    }
    if (!Object.keys(colls.projects).length) {
      SEED_PROJECTS.forEach(function (p) {
        colls.projects[p.id] = clone(p);
      });
    }
  }

  function settle() {
    if (settled) return;
    settled = true;
    readyResolve();
  }

  /* --- cloud --- */

  function subscribeDoc(key) {
    const path = DOC_PATHS[key];
    db.doc(path).onSnapshot(
      function (snap) {
        docExists[key] = snap.exists;
        docs[key] = snap.exists ? clone(snap.data()) || {} : {};
        saveLocal();
        emit();
      },
      function (err) {
        console.warn("doc subscription ended", path, err && err.code);
      }
    );
  }

  function subscribeColl(name) {
    db.collection(name).onSnapshot(
      function (snap) {
        const next = {};
        snap.docs.forEach(function (d) {
          next[d.id] = clone(d.data()) || {};
        });
        colls[name] = next;
        saveLocal();
        emit();
      },
      function (err) {
        console.warn("collection subscription ended", name, err && err.code);
      }
    );
  }

  function wait(ms) {
    return new Promise(function (r) {
      setTimeout(r, ms);
    });
  }

  /* First device to open the artifact writes the starting content. The lease
     stops two phones opening it at once from both seeding.

     routine/days is written LAST and is the "already seeded" marker, so a run
     that dies halfway (a dropped connection, a rate limit) leaves the marker
     unwritten and the next open picks up where it left off instead of
     stranding the family with half a recipe box. */
  async function seedCloudIfEmpty() {
    const routineRef = db.doc(DOC_PATHS.routine);
    if ((await routineRef.get()).exists) return;

    const lease = await db.doc("config/seed").acquire({ holder: "seed", ttlMs: 120000 });
    if (!lease.acquired) return;
    if ((await routineRef.get()).exists) return;

    let n = 0;
    async function seedOne(coll, item) {
      const body = clone(item);
      delete body.id;
      const ref = db.collection(coll).doc(item.id);
      if ((await ref.get()).exists) return;
      try {
        await ref.set(body);
      } catch (e) {
        if ((e && e.code) !== "unavailable" && (e && e.code) !== "resource_exhausted") throw e;
        await wait(700);
        await ref.set(body);
      }
      /* The per-viewer call rate is a real budget; 54 writes back to back
         will trip it. Breathe every so often. */
      if (++n % 8 === 0) await wait(220);
    }

    for (const r of SEED_RECIPES) await seedOne("recipes", r);
    for (const j of SEED_JOBS) await seedOne("jobs", j);
    for (const p of SEED_PROJECTS) await seedOne("projects", p);

    await db.doc(DOC_PATHS.config).set(clone(SEED_CONFIG));
    await routineRef.set(clone(SEED_ROUTINE));
  }

  async function connect() {
    loadLocal();
    applySeeds();
    emit();

    let handle = null;
    try {
      handle = await claude.use("db");
    } catch (e) {
      handle = null;
    }

    if (!handle) {
      mode = "local";
      settle();
      emit();
      return;
    }

    db = handle;
    mode = "cloud";

    try {
      await seedCloudIfEmpty();
    } catch (e) {
      console.warn("seeding skipped", e && e.code);
    }

    Object.keys(DOC_PATHS).forEach(subscribeDoc);
    COLL_NAMES.forEach(subscribeColl);

    /* Snapshots arrive on their own; do not block the first paint on them. */
    setTimeout(settle, 600);
    emit();
  }

  function write(fn, label) {
    if (mode !== "cloud" || !db) {
      saveLocal();
      return Promise.resolve();
    }
    return fn().catch(function (err) {
      const code = (err && err.code) || "unavailable";
      if (code === "quota_exceeded") {
        UI.toast("The family store is full. Delete some old items first.");
      } else if (code === "revoked" || code === "not_granted") {
        mode = "local";
        UI.toast("Saved on this device only.");
      } else {
        UI.toast("Could not save " + (label || "that") + ". Try again.");
      }
      saveLocal();
    });
  }

  return {
    get mode() {
      return mode;
    },
    ready: ready,
    connect: connect,

    get: function (key) {
      return docs[key] || {};
    },

    setDoc: function (key, body) {
      docs[key] = clone(body) || {};
      saveLocal();
      emit();
      const full = clone(docs[key]);
      const prior = docQueue[key] || Promise.resolve();
      const next = prior.then(function () {
        if (mode !== "cloud" || !db) return;
        return db
          .doc(DOC_PATHS[key])
          .set(full)
          .then(function () {
            docExists[key] = true;
          });
      });
      docQueue[key] = next.catch(function () {});
      return write(function () {
        return next;
      }, "changes");
    },

    /* Merge a patch into one of the date-keyed documents. Two phones ticking
       different boxes must both stick, which is what update()'s recursive
       merge gives us — but update() rejects when the document does not exist
       yet, and a first-tap-of-the-day burst can fire several merges before the
       creating write lands. So writes for a key are chained: the first one
       creates, the rest merge, in order. */
    mergeDoc: function (key, patch) {
      docs[key] = deepMerge(docs[key], patch);
      saveLocal();
      emit();
      const full = clone(docs[key]);
      const body = clone(patch);
      const prior = docQueue[key] || Promise.resolve();
      const next = prior.then(function () {
        if (mode !== "cloud" || !db) return;
        const ref = db.doc(DOC_PATHS[key]);
        if (docExists[key]) return ref.update(body);
        return ref.set(full).then(function () {
          docExists[key] = true;
        });
      });
      docQueue[key] = next.catch(function () {});
      return write(function () {
        return next;
      }, "changes");
    },

    list: function (name) {
      const bag = colls[name] || {};
      return Object.keys(bag).map(function (id) {
        return Object.assign({ id: id }, bag[id]);
      });
    },

    item: function (name, id) {
      const body = (colls[name] || {})[id];
      return body ? Object.assign({ id: id }, body) : null;
    },

    put: function (name, id, body) {
      const docId = id || uid(name.slice(0, 3));
      const stored = clone(body) || {};
      delete stored.id;
      colls[name][docId] = stored;
      saveLocal();
      emit();
      write(function () {
        return db.collection(name).doc(docId).set(clone(stored));
      }, "that");
      return docId;
    },

    patch: function (name, id, patch) {
      const current = colls[name][id];
      if (!current) return Promise.resolve();
      const merged = deepMerge(current, patch);
      delete merged.id;
      colls[name][id] = merged;
      saveLocal();
      emit();
      return write(function () {
        return db.collection(name).doc(id).set(clone(merged));
      }, "that");
    },

    remove: function (name, id) {
      delete colls[name][id];
      saveLocal();
      emit();
      return write(function () {
        return db.collection(name).doc(id).delete();
      }, "the delete");
    },

    on: function (fn) {
      listeners.push(fn);
      return function () {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    },
  };
})();

/* ---------- icons ---------- */

const ICON_PATHS = {
  check: '<polyline points="20 6 9 17 4 12"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  chevron: '<polyline points="9 18 15 12 9 6"/>',
  back: '<polyline points="15 18 9 12 15 6"/>',
  down: '<polyline points="6 9 12 15 18 9"/>',
  up: '<polyline points="18 15 12 9 6 15"/>',
  sunrise:
    '<path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><polyline points="8 6 12 2 16 6"/><line x1="1" y1="22" x2="23" y2="22"/>',
  sunset:
    '<path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="9" x2="12" y2="2"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><polyline points="16 5 12 9 8 5"/><line x1="1" y1="22" x2="23" y2="22"/>',
  sun: '<circle cx="12" cy="12" r="4"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  pot: '<path d="M4 9h16v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><line x1="2" y1="9" x2="4" y2="9"/><line x1="20" y1="9" x2="22" y2="9"/><path d="M8 6V4"/><path d="M12 6V3"/><path d="M16 6V4"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  broom: '<path d="M19 3l-6 6"/><path d="M14 8l2 2"/><path d="M12 10l-6 6-2 5 5-2 6-6z"/><path d="M7 15l2 2"/>',
  wrench:
    '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  hammer:
    '<path d="M15 12l-8.5 8.5a2.12 2.12 0 0 1-3-3L12 9"/><path d="M17.64 15L22 10.64"/><path d="M20.91 11.7l-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.99"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  trash:
    '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  pencil:
    '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  clipboard:
    '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
  sparkle:
    '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>',
  alert:
    '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
  external:
    '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  calendar:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>',
  gift: '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
  type: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
  refresh:
    '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  drag: '<circle cx="9" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="18" r="1.5"/>',
};

/* ---------- UI ---------- */

const UI = (function () {
  /* Ephemeral view state that must survive a re-render (open filters,
     which segment is showing). Never persisted. */
  const state = {};

  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    const p = props || {};
    Object.keys(p).forEach(function (key) {
      const val = p[key];
      if (val === null || val === undefined || val === false) return;
      if (key === "class") el.className = val;
      else if (key === "text") el.textContent = val;
      else if (key === "style") Object.assign(el.style, val);
      else if (key === "on") {
        Object.keys(val).forEach(function (evt) {
          el.addEventListener(evt, val[evt]);
        });
      } else if (key === "data") {
        Object.keys(val).forEach(function (d) {
          el.dataset[d] = val[d];
        });
      } else if (key === "svg") {
        el.innerHTML = val;
      } else if (val === true) {
        el.setAttribute(key, "");
      } else {
        el.setAttribute(key, String(val));
      }
    });
    appendAll(el, children);
    return el;
  }

  function appendAll(el, kids) {
    kids.forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) return appendAll(el, c);
      el.appendChild(typeof c === "object" && c.nodeType ? c : document.createTextNode(String(c)));
    });
  }

  function icon(name, size) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.9");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    if (size) {
      svg.setAttribute("width", size);
      svg.setAttribute("height", size);
    }
    svg.innerHTML = ICON_PATHS[name] || ICON_PATHS.info;
    return svg;
  }

  /* --- sheets --- */

  const openSheets = [];

  function sheet(opts) {
    const o = opts || {};
    const body = h("div", { class: "sheet-body" });
    appendAll(body, [o.body]);

    const head = h(
      "div",
      { class: "sheet-head" },
      h("h2", { text: o.title || "" }),
      h(
        "button",
        {
          class: "ibtn",
          type: "button",
          "aria-label": "Close",
          on: { click: function () { close(); } },
        },
        icon("x")
      )
    );

    const panel = h("div", { class: "sheet", role: "dialog", "aria-modal": "true" });
    panel.appendChild(h("div", { class: "sheet-grip" }));
    panel.appendChild(head);
    panel.appendChild(body);

    if (o.actions && o.actions.length) {
      const foot = h("div", { class: "sheet-foot" });
      appendAll(foot, o.actions);
      panel.appendChild(foot);
    }

    const scrim = h("div", {
      class: "scrim",
      on: {
        click: function (e) {
          if (e.target === scrim) close();
        },
      },
    });
    scrim.appendChild(panel);

    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      const i = openSheets.indexOf(api);
      if (i >= 0) openSheets.splice(i, 1);
      scrim.remove();
      if (!openSheets.length) document.body.style.overflow = "";
      if (o.onClose) o.onClose();
    }

    const api = {
      close: close,
      el: panel,
      setBody: function (node) {
        body.textContent = "";
        appendAll(body, [node]);
      },
      scrollTop: function () {
        body.scrollTop = 0;
      },
    };

    document.body.appendChild(scrim);
    document.body.style.overflow = "hidden";
    openSheets.push(api);

    const focusable = panel.querySelector("input, textarea, button.btn-primary");
    if (focusable && window.matchMedia("(min-width: 900px)").matches) focusable.focus();

    return api;
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && openSheets.length) openSheets[openSheets.length - 1].close();
  });

  function confirmSheet(message, opts) {
    const o = opts || {};
    return new Promise(function (resolve) {
      let answered = false;
      const s = sheet({
        title: o.title || "Are you sure?",
        body: h("p", { class: "muted", text: message }),
        actions: [
          h(
            "button",
            {
              class: "btn",
              type: "button",
              on: { click: function () { answered = true; s.close(); resolve(false); } },
            },
            "Keep it"
          ),
          h(
            "button",
            {
              class: "btn " + (o.danger ? "btn-danger" : "btn-primary"),
              type: "button",
              on: { click: function () { answered = true; s.close(); resolve(true); } },
            },
            o.confirmText || "Yes, do it"
          ),
        ],
        onClose: function () {
          if (!answered) resolve(false);
        },
      });
    });
  }

  /* --- toasts --- */

  let toastHost = null;
  function toast(msg) {
    if (!toastHost) {
      toastHost = h("div", { class: "toasts" });
      document.body.appendChild(toastHost);
    }
    const t = h("div", { class: "toast", text: msg });
    toastHost.appendChild(t);
    setTimeout(function () {
      t.style.transition = "opacity .3s ease";
      t.style.opacity = "0";
      setTimeout(function () { t.remove(); }, 320);
    }, 2400);
  }

  /* --- composed bits every view reuses --- */

  function empty(iconName, line, action) {
    return h(
      "div",
      { class: "empty" },
      h("div", { class: "empty-mark" }, icon(iconName)),
      h("p", { text: line }),
      action || null
    );
  }

  function section(title, aside, ...children) {
    const head = h("div", { class: "section-head" }, h("h2", { text: title }));
    if (aside) head.appendChild(aside.nodeType ? aside : h("span", { class: "aside", text: aside }));
    return h("section", { class: "section" }, head, ...children);
  }

  function chip(text, tone) {
    return h("span", { class: "chip" + (tone ? " chip-" + tone : ""), text: text });
  }

  function meter(done, total) {
    const pct = total ? Math.round((done / total) * 100) : 0;
    return h(
      "div",
      { class: "meter" },
      h(
        "div",
        { class: "meter-track" },
        h("div", { class: "meter-fill", style: { width: pct + "%" } })
      ),
      h(
        "div",
        { class: "meter-label" },
        h("span", { text: done + " of " + total + " done" }),
        h("span", { class: "nums", text: pct + "%" })
      )
    );
  }

  return {
    h: h,
    icon: icon,
    sheet: sheet,
    confirm: confirmSheet,
    toast: toast,
    empty: empty,
    section: section,
    chip: chip,
    meter: meter,
    state: state,
  };
})();

/* ---------- Ask (the sample capability) ---------- */

const Ask = (function () {
  let sample = null;
  let resolved = false;

  async function init() {
    try {
      sample = await claude.use("sample");
    } catch (e) {
      sample = null;
    }
    resolved = true;
  }

  function available() {
    return resolved && !!sample;
  }

  function handle(err) {
    const code = (err && err.code) || "";
    if (code === "not_granted") {
      sample = null;
      return "Claude is not available here.";
    }
    if (code === "rate_limited") return "Too many questions at once. Give it a minute.";
    if (code === "cancelled") return "";
    return "Claude could not answer that. Try again.";
  }

  return {
    init: init,
    available: available,
    text: async function (prompt, opts) {
      if (!sample) throw new Error("unavailable");
      const res = await sample(prompt, opts || {});
      return res.text;
    },
    json: async function (prompt, opts) {
      if (!sample) throw new Error("unavailable");
      return sample.json(prompt, opts || {});
    },
    message: handle,
  };
})();

/* ---------- Router ---------- */

const Router = (function () {
  const routes = {};
  let current = "today";
  let host = null;
  let pending = false;

  function on(name, render) {
    routes[name] = render;
  }

  /* A re-render replaces the whole view, so anything the person was typing
     into would lose focus and caret. Views mark such inputs with data-keep
     and this puts them back exactly as they were. */
  function captureFocus() {
    const el = document.activeElement;
    if (!el || !el.dataset || !el.dataset.keep) return null;
    if (!host || !host.contains(el)) return null;
    return {
      key: el.dataset.keep,
      value: el.value,
      start: el.selectionStart,
      end: el.selectionEnd,
    };
  }

  function restoreFocus(snap) {
    if (!snap || !host) return;
    const el = host.querySelector('[data-keep="' + snap.key + '"]');
    if (!el) return;
    if (snap.value !== undefined && el.value !== undefined) el.value = snap.value;
    el.focus();
    try {
      if (snap.start !== null && el.setSelectionRange) el.setSelectionRange(snap.start, snap.end);
    } catch (e) {
      /* number and date inputs refuse setSelectionRange; harmless */
    }
  }

  function paint() {
    pending = false;
    if (!host) return;
    const render = routes[current] || routes.today;
    const snap = captureFocus();
    const scroll = window.scrollY;
    const view = document.createElement("div");
    view.className = "view";
    try {
      render(view);
    } catch (e) {
      console.error("view failed", current, e);
      view.appendChild(
        UI.empty("alert", "Something in this screen broke. Switching tabs and back usually clears it.")
      );
    }
    host.replaceChildren(view);
    restoreFocus(snap);
    if (scroll) window.scrollTo(0, scroll);
    document.querySelectorAll(".tabbar button[data-route]").forEach(function (b) {
      if (b.dataset.route === current) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
  }

  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(paint);
  }

  return {
    on: on,
    mount: function (el) {
      host = el;
    },
    go: function (name) {
      if (!routes[name]) return;
      const changed = current !== name;
      current = name;
      if (changed) window.scrollTo(0, 0);
      paint();
    },
    current: function () {
      return current;
    },
    refresh: schedule,
  };
})();
