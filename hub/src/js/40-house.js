/* ============================================================
   House — Cleaning / Jobs / Projects.
   Everything the Today screen needs from this module goes
   through the House object below; everything else here is
   private to this file, wrapped in the IIFE.
   ============================================================ */

const House = (function () {
  /* ---------- zone naming ---------- */

  const ZONES = [
    { name: "Laundry & bedrooms", words: ["laundry", "bed"] },
    { name: "The kitchen", words: ["sink", "counter", "dish"] },
    { name: "Bathrooms", words: ["tub", "toilet", "mirror"] },
    { name: "Floors & living spaces", words: ["vacuum", "mop", "floor"] },
    { name: "Outside", words: ["yard", "garage", "car"] },
    { name: "Reset & plan the week", words: ["plan", "reset"] },
  ];

  function zoneName(dayIdx) {
    const idx = ((dayIdx % 7) + 7) % 7;
    const dayKey = DAY_KEYS[idx];
    const routine = Store.get("routine") || {};
    if (routine.names && routine.names[dayKey]) return routine.names[dayKey];

    const tasks = Array.isArray(routine[dayKey]) ? routine[dayKey] : [];
    if (!tasks.length) return Fmt.dayName(idx) + " list";

    const counts = ZONES.map(function () {
      return 0;
    });
    tasks.forEach(function (t) {
      const text = String((t && t.text) || "").toLowerCase();
      ZONES.forEach(function (zone, i) {
        if (
          zone.words.some(function (w) {
            return text.indexOf(w) >= 0;
          })
        ) {
          counts[i] += 1;
        }
      });
    });

    let bestIdx = -1;
    let bestCount = 0;
    counts.forEach(function (c, i) {
      if (c > bestCount) {
        bestCount = c;
        bestIdx = i;
      }
    });
    if (bestIdx < 0) return Fmt.dayName(idx) + " list";
    return ZONES[bestIdx].name;
  }

  /* ---------- Today-screen API ---------- */

  function todayTasks(date) {
    date = date || new Date();
    const idx = Fmt.dayIdx(date);
    const dayKey = DAY_KEYS[idx];
    const routine = Store.get("routine") || {};
    const tasks = Array.isArray(routine[dayKey]) ? routine[dayKey] : [];
    const dateKey = Fmt.dayKey(date);
    const checksDoc = Store.get("checks") || {};
    const dayChecks = checksDoc[dateKey] || {};
    return tasks.map(function (t) {
      return { id: t.id, text: t.text, min: t.min, done: !!dayChecks[t.id] };
    });
  }

  function toggleTask(date, taskId) {
    date = date || new Date();
    const dateKey = Fmt.dayKey(date);
    const checksDoc = Store.get("checks") || {};
    const dayChecks = checksDoc[dateKey] || {};
    const next = !dayChecks[taskId];
    const patch = {};
    patch[dateKey] = {};
    patch[dateKey][taskId] = next;
    Store.mergeDoc("checks", patch);
  }

  function openJobs() {
    UI.state.houseTab = "jobs";
    Router.go("house");
  }

  function attention(date) {
    date = date || new Date();
    const todayKey = Fmt.dayKey(date);
    const now = Fmt.fromDayKey(todayKey);

    const urgentJobs = [];
    const soonJobs = [];
    Store.list("jobs").forEach(function (j) {
      if (j.done) return;
      const due = j.due || "";
      const overdue = due && due < todayKey;
      if (j.priority === "urgent" || overdue) {
        urgentJobs.push(j);
        return;
      }
      if (due) {
        const then = Fmt.fromDayKey(due);
        const days = Math.round((then - now) / 86400000);
        if (days >= 0 && days <= 7) soonJobs.push(j);
      }
    });

    function byDueThenAge(a, b) {
      const ad = a.due || "9999-99-99";
      const bd = b.due || "9999-99-99";
      if (ad !== bd) return ad < bd ? -1 : 1;
      const aa = a.at || "";
      const ba = b.at || "";
      return aa < ba ? -1 : aa > ba ? 1 : 0;
    }
    urgentJobs.sort(byDueThenAge);
    soonJobs.sort(byDueThenAge);

    const goingProjects = Store.list("projects")
      .filter(function (p) {
        return p.status === "in progress";
      })
      .sort(function (a, b) {
        return (a.order || 0) - (b.order || 0);
      });

    const out = [];
    urgentJobs.forEach(function (j) {
      out.push({
        kind: "job",
        id: j.id,
        title: j.title,
        sub: [j.area, Fmt.relDay(j.due)].filter(Boolean).join(" · "),
        tone: "urgent",
      });
    });
    soonJobs.forEach(function (j) {
      out.push({
        kind: "job",
        id: j.id,
        title: j.title,
        sub: [j.area, Fmt.relDay(j.due)].filter(Boolean).join(" · "),
        tone: "soon",
      });
    });
    goingProjects.forEach(function (p) {
      out.push({
        kind: "project",
        id: p.id,
        title: p.title,
        sub: p.next || "",
        tone: "someday",
      });
    });

    return out.slice(0, 6);
  }

  /* ---------- shared little helpers ---------- */

  function field(label, control) {
    return UI.h("div", { class: "field" }, UI.h("label", { text: label }), control);
  }

  function buildSelect(options, value) {
    const select = UI.h("select", { class: "select" });
    options.forEach(function (opt) {
      select.appendChild(
        UI.h("option", { value: opt.value, selected: opt.value === value }, opt.label)
      );
    });
    return select;
  }

  function plural(n, word) {
    return n + " " + word + (n === 1 ? "" : "s");
  }

  /* ---------- Cleaning tab ---------- */

  function nextRoutineWithDay(dayKey, list) {
    const routine = Store.get("routine") || {};
    const next = Object.assign({}, routine);
    next[dayKey] = list;
    return next;
  }

  function addTask(dayKey, text) {
    const routine = Store.get("routine") || {};
    const list = Array.isArray(routine[dayKey]) ? routine[dayKey] : [];
    const nextList = list.concat([{ id: uid("task"), text: text, min: 10 }]);
    Store.setDoc("routine", nextRoutineWithDay(dayKey, nextList));
  }

  function saveTaskEdit(dayKey, taskId, text, min) {
    const routine = Store.get("routine") || {};
    const list = Array.isArray(routine[dayKey]) ? routine[dayKey] : [];
    const nextList = list.map(function (t) {
      if (t.id !== taskId) return t;
      return Object.assign({}, t, { text: text, min: min });
    });
    Store.setDoc("routine", nextRoutineWithDay(dayKey, nextList));
  }

  function deleteTask(dayKey, task) {
    UI.confirm('Delete "' + task.text + '"?', { danger: true, confirmText: "Delete it" }).then(
      function (ok) {
        if (!ok) return;
        const routine = Store.get("routine") || {};
        const list = Array.isArray(routine[dayKey]) ? routine[dayKey] : [];
        const nextList = list.filter(function (t) {
          return t.id !== task.id;
        });
        Store.setDoc("routine", nextRoutineWithDay(dayKey, nextList));
      }
    );
  }

  function moveTask(dayKey, idx, dir) {
    const routine = Store.get("routine") || {};
    const list = Array.isArray(routine[dayKey]) ? routine[dayKey] : [];
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const nextList = list.slice();
    const tmp = nextList[idx];
    nextList[idx] = nextList[j];
    nextList[j] = tmp;
    Store.setDoc("routine", nextRoutineWithDay(dayKey, nextList));
  }

  function openEditTaskSheet(dayKey, task) {
    const textInput = UI.h("input", { class: "input", type: "text", value: task.text });
    const minInput = UI.h("input", {
      class: "input",
      type: "number",
      min: "1",
      value: String(task.min || 10),
    });

    const s = UI.sheet({
      title: "Edit task",
      body: UI.h("div", { class: "stack" }, field("Task", textInput), field("Minutes", minInput)),
      actions: [
        UI.h(
          "button",
          { class: "btn", type: "button", on: { click: function () { s.close(); } } },
          "Cancel"
        ),
        UI.h(
          "button",
          {
            class: "btn btn-primary",
            type: "button",
            on: {
              click: function () {
                const newText = textInput.value.trim();
                if (!newText) {
                  UI.toast("Give the task some words first.");
                  return;
                }
                const newMin = Math.max(1, Number(minInput.value) || 10);
                saveTaskEdit(dayKey, task.id, newText, newMin);
                s.close();
              },
            },
          },
          "Save"
        ),
      ],
    });
  }

  function buildEditRow(dayKey, tasks, task, idx) {
    const row = UI.h("div", { class: "edit-row" });
    row.appendChild(UI.h("span", { class: "e-text", text: task.text }));
    row.appendChild(UI.h("span", { class: "e-min", text: Fmt.minutes(task.min) }));
    row.appendChild(
      UI.h(
        "button",
        {
          class: "ibtn",
          type: "button",
          "aria-label": "Move earlier",
          disabled: idx === 0,
          on: { click: function () { moveTask(dayKey, idx, -1); } },
        },
        UI.icon("up")
      )
    );
    row.appendChild(
      UI.h(
        "button",
        {
          class: "ibtn",
          type: "button",
          "aria-label": "Move later",
          disabled: idx === tasks.length - 1,
          on: { click: function () { moveTask(dayKey, idx, 1); } },
        },
        UI.icon("down")
      )
    );
    row.appendChild(
      UI.h(
        "button",
        {
          class: "ibtn",
          type: "button",
          "aria-label": "Edit task",
          on: { click: function () { openEditTaskSheet(dayKey, task); } },
        },
        UI.icon("pencil")
      )
    );
    row.appendChild(
      UI.h(
        "button",
        {
          class: "ibtn",
          type: "button",
          "aria-label": "Delete task",
          on: { click: function () { deleteTask(dayKey, task); } },
        },
        UI.icon("trash")
      )
    );
    return row;
  }

  function buildDayQuickAdd(dayKey) {
    const input = UI.h("input", {
      class: "input",
      type: "text",
      placeholder: "Add a task",
      data: { keep: "task-add-" + dayKey },
    });
    function submit() {
      const text = input.value.trim();
      if (!text) return;
      addTask(dayKey, text);
      input.value = "";
    }
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    });
    const addBtn = UI.h(
      "button",
      { class: "btn btn-primary", type: "button", "aria-label": "Add task", on: { click: submit } },
      UI.icon("plus")
    );
    return UI.h("div", { class: "quickadd" }, input, addBtn);
  }

  function buildDayBlock(dayIdx, isToday) {
    const dayKey = DAY_KEYS[dayIdx];
    const routine = Store.get("routine") || {};
    const tasks = Array.isArray(routine[dayKey]) ? routine[dayKey] : [];
    const isOpen = UI.state.openDay === dayIdx;
    const totalMin = tasks.reduce(function (sum, t) {
      return sum + (Number(t.min) || 0);
    }, 0);

    const block = UI.h("div", {
      class: "dayblock",
      data: { open: isOpen ? "true" : "false", today: isToday ? "true" : "false" },
    });

    block.appendChild(
      UI.h(
        "button",
        {
          class: "dayblock-head",
          type: "button",
          on: {
            click: function () {
              UI.state.openDay = isOpen ? null : dayIdx;
              Router.refresh();
            },
          },
        },
        UI.h("span", { class: "d-name", text: Fmt.dayName(dayIdx) + " · " + zoneName(dayIdx) }),
        UI.h("span", { class: "d-count", text: plural(tasks.length, "task") + " · " + Fmt.minutes(totalMin) }),
        UI.h("span", { class: "caret" }, UI.icon("chevron"))
      )
    );

    if (isOpen) {
      const body = UI.h("div", { class: "dayblock-body" });
      tasks.forEach(function (t, idx) {
        body.appendChild(buildEditRow(dayKey, tasks, t, idx));
      });
      body.appendChild(buildDayQuickAdd(dayKey));
      block.appendChild(body);
    }

    return block;
  }

  function renderCleaningTab() {
    const wrap = UI.h("div", { class: "stack" });
    wrap.appendChild(
      UI.h("p", {
        class: "tiny muted",
        text: "Whatever is here shows up on the Today screen each morning.",
      })
    );

    const todayIdx = Fmt.dayIdx(new Date());
    if (UI.state.openDay === undefined) UI.state.openDay = todayIdx;

    for (let i = 0; i < 7; i++) {
      wrap.appendChild(buildDayBlock(i, i === todayIdx));
    }
    return wrap;
  }

  /* ---------- Jobs tab ---------- */

  const AREA_OPTIONS = [
    "Kitchen",
    "Bathroom",
    "Bedroom",
    "Living room",
    "Basement",
    "Garage",
    "Yard",
    "Exterior",
    "Car",
  ];
  const PRIORITY_OPTIONS = [
    ["urgent", "Urgent"],
    ["soon", "Soon"],
    ["someday", "Someday"],
  ];
  const PRI_ORDER = { urgent: 0, soon: 1, someday: 2 };

  function jobSortFn(a, b) {
    const pa = PRI_ORDER[a.priority] !== undefined ? PRI_ORDER[a.priority] : 2;
    const pb = PRI_ORDER[b.priority] !== undefined ? PRI_ORDER[b.priority] : 2;
    if (pa !== pb) return pa - pb;
    const ad = a.due || "9999-99-99";
    const bd = b.due || "9999-99-99";
    if (ad !== bd) return ad < bd ? -1 : 1;
    const aa = a.at || "";
    const ba = b.at || "";
    return aa < ba ? -1 : aa > ba ? 1 : 0;
  }

  function toggleJobDone(job) {
    const next = !job.done;
    Store.patch("jobs", job.id, { done: next, doneAt: next ? new Date().toISOString() : "" });
  }

  function openJobSheet(job) {
    const titleInput = UI.h("input", { class: "input", type: "text", value: job.title });
    const areaOptions = [{ value: "", label: "No area" }].concat(
      AREA_OPTIONS.map(function (a) {
        return { value: a, label: a };
      })
    );
    const areaSelect = buildSelect(areaOptions, job.area || "");
    const priSelect = buildSelect(
      PRIORITY_OPTIONS.map(function (p) {
        return { value: p[0], label: p[1] };
      }),
      job.priority || "soon"
    );
    const dueInput = UI.h("input", { class: "input", type: "date", value: job.due || "" });
    const notesInput = UI.h("textarea", { class: "textarea", text: job.notes || "" });

    const s = UI.sheet({
      title: "Edit job",
      body: UI.h(
        "div",
        { class: "stack" },
        field("Title", titleInput),
        field("Area", areaSelect),
        field("Priority", priSelect),
        field("Due", dueInput),
        field("Notes", notesInput)
      ),
      actions: [
        UI.h(
          "button",
          {
            class: "btn btn-danger",
            type: "button",
            on: {
              click: function () {
                UI.confirm('Delete "' + job.title + '"?', {
                  danger: true,
                  confirmText: "Delete it",
                }).then(function (ok) {
                  if (!ok) return;
                  Store.remove("jobs", job.id);
                  s.close();
                });
              },
            },
          },
          "Delete"
        ),
        UI.h(
          "button",
          {
            class: "btn btn-primary",
            type: "button",
            on: {
              click: function () {
                const title = titleInput.value.trim();
                if (!title) {
                  UI.toast("Give the job a title first.");
                  return;
                }
                Store.patch("jobs", job.id, {
                  title: title,
                  area: areaSelect.value,
                  priority: priSelect.value,
                  due: dueInput.value || "",
                  notes: notesInput.value,
                });
                s.close();
              },
            },
          },
          "Save"
        ),
      ],
    });
  }

  function buildJobRow(job) {
    const stripe = UI.h("div", { class: "pri-stripe pri-" + (job.priority || "someday") });
    const todayKey = Fmt.dayKey();
    const overdue = !!job.due && job.due < todayKey && !job.done;

    const check = UI.h(
      "button",
      {
        class: "job-check",
        type: "button",
        "aria-label": job.done ? "Mark not done" : "Mark done",
        on: { click: function () { toggleJobDone(job); } },
      },
      UI.icon("check")
    );

    const meta = UI.h("div", { class: "job-meta" });
    if (job.area) meta.appendChild(UI.chip(job.area));
    if (job.due) meta.appendChild(UI.chip(Fmt.relDay(job.due), overdue ? "tulip" : null));

    const mainChildren = [UI.h("div", { class: "job-title", text: job.title }), meta];
    if (job.notes) mainChildren.push(UI.h("div", { class: "job-notes", text: job.notes }));

    const main = UI.h(
      "div",
      { class: "job-main", on: { click: function () { openJobSheet(job); } } },
      mainChildren
    );

    return UI.h(
      "div",
      { class: "job-row", data: { done: job.done ? "true" : "false" } },
      stripe,
      check,
      main
    );
  }

  function buildJobQuickAdd() {
    const input = UI.h("input", {
      class: "input",
      type: "text",
      placeholder: "What needs fixing?",
      data: { keep: "job-add" },
    });
    function submit() {
      const title = input.value.trim();
      if (!title) return;
      Store.put("jobs", null, {
        title: title,
        area: "",
        priority: "soon",
        notes: "",
        due: "",
        done: false,
        doneAt: "",
        at: new Date().toISOString(),
      });
      input.value = "";
    }
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    });
    const addBtn = UI.h(
      "button",
      { class: "btn btn-primary", type: "button", "aria-label": "Add job", on: { click: submit } },
      UI.icon("plus")
    );
    return UI.h("div", { class: "quickadd" }, input, addBtn);
  }

  function buildJobFilters(filter) {
    const scroller = UI.h("div", { class: "scroller" });
    PRIORITY_OPTIONS.forEach(function (pair) {
      const key = pair[0];
      scroller.appendChild(
        UI.h(
          "button",
          {
            class: "fchip",
            type: "button",
            "aria-pressed": filter.pri[key] ? "true" : "false",
            on: {
              click: function () {
                filter.pri[key] = !filter.pri[key];
                Router.refresh();
              },
            },
          },
          pair[1]
        )
      );
    });
    scroller.appendChild(
      UI.h(
        "button",
        {
          class: "fchip",
          type: "button",
          "aria-pressed": filter.showDone ? "true" : "false",
          on: {
            click: function () {
              filter.showDone = !filter.showDone;
              Router.refresh();
            },
          },
        },
        "Show done"
      )
    );
    return scroller;
  }

  function buildDoneSection(doneJobs, filter) {
    const wrap = UI.h("div", { class: "card card-quiet" });
    wrap.appendChild(
      UI.h(
        "button",
        {
          class: "row",
          type: "button",
          on: {
            click: function () {
              filter.showDone = !filter.showDone;
              Router.refresh();
            },
          },
        },
        UI.h(
          "div",
          { class: "row-main" },
          UI.h("div", { class: "row-title", text: plural(doneJobs.length, "job") + " done" })
        ),
        UI.h("div", { class: "row-end" }, UI.icon(filter.showDone ? "up" : "down"))
      )
    );

    if (filter.showDone) {
      const rows = UI.h("div", { class: "rows" });
      doneJobs
        .slice()
        .sort(function (a, b) {
          const aa = a.doneAt || "";
          const ba = b.doneAt || "";
          return aa < ba ? 1 : aa > ba ? -1 : 0;
        })
        .forEach(function (j) {
          rows.appendChild(buildJobRow(j));
        });
      wrap.appendChild(rows);
      wrap.appendChild(
        UI.h(
          "div",
          { class: "card-pad" },
          UI.h(
            "button",
            {
              class: "btn btn-danger btn-block",
              type: "button",
              on: {
                click: function () {
                  UI.confirm("Clear all the done jobs? This can't be undone.", {
                    danger: true,
                    confirmText: "Clear the done ones",
                  }).then(function (ok) {
                    if (!ok) return;
                    doneJobs.forEach(function (j) {
                      Store.remove("jobs", j.id);
                    });
                  });
                },
              },
            },
            "Clear the done ones"
          )
        )
      );
    }
    return wrap;
  }

  function renderJobsTab() {
    if (!UI.state.jobFilter) {
      UI.state.jobFilter = { pri: { urgent: true, soon: true, someday: true }, showDone: false };
    }
    const filter = UI.state.jobFilter;

    const wrap = UI.h("div", { class: "stack" });
    wrap.appendChild(buildJobQuickAdd());
    wrap.appendChild(buildJobFilters(filter));

    const allJobs = Store.list("jobs");
    const openJobsList = allJobs
      .filter(function (j) {
        return !j.done && filter.pri[j.priority || "someday"];
      })
      .sort(jobSortFn);
    const doneJobs = allJobs.filter(function (j) {
      return j.done;
    });

    if (!openJobsList.length) {
      wrap.appendChild(
        UI.empty(
          "wrench",
          allJobs.length
            ? "No jobs match these filters."
            : "No jobs on the list yet. Add the first thing that needs fixing."
        )
      );
    } else {
      const rows = UI.h("div", { class: "rows" });
      openJobsList.forEach(function (j) {
        rows.appendChild(buildJobRow(j));
      });
      wrap.appendChild(UI.h("div", { class: "card" }, rows));
    }

    if (doneJobs.length) wrap.appendChild(buildDoneSection(doneJobs, filter));

    return wrap;
  }

  /* ---------- Projects tab ---------- */

  const CATEGORY_OPTIONS = ["Exterior", "Interior", "Yard", "Garage", "Big ticket"];
  const PROJECT_STATUS_OPTIONS = [
    ["idea", "Idea"],
    ["planned", "Planned"],
    ["in progress", "In progress"],
    ["done", "Done"],
  ];
  const STATUS_GROUPS = [
    ["in progress", "In progress"],
    ["planned", "Planned"],
    ["idea", "Ideas"],
    ["done", "Done"],
  ];
  const NEXT_STATUS = { idea: "planned", planned: "in progress", "in progress": "done" };

  function advanceProjectStatus(p) {
    const next = NEXT_STATUS[p.status];
    if (next) Store.patch("projects", p.id, { status: next });
  }

  function openProjectSheet(p) {
    const isNew = !p;
    const titleInput = UI.h("input", { class: "input", type: "text", value: p ? p.title : "" });
    const categorySelect = buildSelect(
      CATEGORY_OPTIONS.map(function (c) {
        return { value: c, label: c };
      }),
      p ? p.category : CATEGORY_OPTIONS[0]
    );
    const statusSelect = buildSelect(
      PROJECT_STATUS_OPTIONS.map(function (s) {
        return { value: s[0], label: s[1] };
      }),
      p ? p.status : "idea"
    );
    const costInput = UI.h("input", {
      class: "input",
      type: "text",
      value: p ? p.cost || "" : "",
      placeholder: "$500-1,000",
    });
    const seasonInput = UI.h("input", {
      class: "input",
      type: "text",
      value: p ? p.season || "" : "",
      placeholder: "Spring",
    });
    const nextInput = UI.h("input", {
      class: "input",
      type: "text",
      value: p ? p.next || "" : "",
      placeholder: "What's the next step?",
    });
    const notesInput = UI.h("textarea", { class: "textarea", text: p ? p.notes || "" : "" });

    const actions = [];
    if (!isNew) {
      actions.push(
        UI.h(
          "button",
          {
            class: "btn btn-danger",
            type: "button",
            on: {
              click: function () {
                UI.confirm('Delete "' + p.title + '"?', {
                  danger: true,
                  confirmText: "Delete it",
                }).then(function (ok) {
                  if (!ok) return;
                  Store.remove("projects", p.id);
                  s.close();
                });
              },
            },
          },
          "Delete"
        )
      );
    }
    actions.push(
      UI.h(
        "button",
        {
          class: "btn btn-primary",
          type: "button",
          on: {
            click: function () {
              const title = titleInput.value.trim();
              if (!title) {
                UI.toast("Give the project a name first.");
                return;
              }
              const body = {
                title: title,
                category: categorySelect.value,
                status: statusSelect.value,
                cost: costInput.value.trim(),
                season: seasonInput.value.trim(),
                next: nextInput.value.trim(),
                notes: notesInput.value,
              };
              if (isNew) {
                const all = Store.list("projects");
                const maxOrder = all.reduce(function (m, x) {
                  return Math.max(m, x.order || 0);
                }, 0);
                body.order = maxOrder + 1;
                body.at = new Date().toISOString();
                Store.put("projects", null, body);
              } else {
                Store.patch("projects", p.id, body);
              }
              s.close();
            },
          },
        },
        isNew ? "Add project" : "Save"
      )
    );

    const s = UI.sheet({
      title: isNew ? "Add a project" : "Edit project",
      body: UI.h(
        "div",
        { class: "stack" },
        field("Title", titleInput),
        field("Category", categorySelect),
        field("Status", statusSelect),
        field("Cost", costInput),
        field("Season", seasonInput),
        field("Next step", nextInput),
        field("Notes", notesInput)
      ),
      actions: actions,
    });
  }

  function buildProjectCard(p) {
    const statusTone = p.status === "in progress" ? "leaf" : p.status === "planned" ? "delft" : null;
    const statusLabel =
      p.status === "in progress"
        ? "In progress"
        : p.status === "planned"
        ? "Planned"
        : p.status === "done"
        ? "Done"
        : "Idea";

    const card = UI.h("div", {
      class: "pcard",
      on: {
        click: function (e) {
          if (e.target && e.target.closest && e.target.closest("button")) return;
          openProjectSheet(p);
        },
      },
    });

    card.appendChild(
      UI.h(
        "div",
        { class: "p-head" },
        UI.h("div", { class: "p-title", text: p.title }),
        UI.chip(statusLabel, statusTone)
      )
    );

    if (p.next) {
      card.appendChild(
        UI.h(
          "div",
          { class: "p-next" },
          UI.h("span", { class: "p-next-key", text: "Next" }),
          UI.h("span", { text: p.next })
        )
      );
    }

    const facts = UI.h("div", { class: "p-facts" });
    if (p.cost) facts.appendChild(UI.h("span", {}, "Cost ", UI.h("b", { text: p.cost })));
    if (p.season) facts.appendChild(UI.h("span", {}, "Season ", UI.h("b", { text: p.season })));
    if (p.category) facts.appendChild(UI.h("span", {}, "Category ", UI.h("b", { text: p.category })));
    if (facts.childNodes.length) card.appendChild(facts);

    if (p.notes) card.appendChild(UI.h("p", { class: "tiny muted", text: p.notes }));

    if (p.status !== "done") {
      const label = p.status === "in progress" ? "Mark it done" : "Start it";
      card.appendChild(
        UI.h(
          "button",
          {
            class: "btn btn-sm",
            type: "button",
            on: {
              click: function (e) {
                e.stopPropagation();
                advanceProjectStatus(p);
              },
            },
          },
          label
        )
      );
    }

    return card;
  }

  function renderProjectsTab() {
    const wrap = UI.h("div", { class: "stack" });
    wrap.appendChild(
      UI.h(
        "button",
        {
          class: "btn btn-primary btn-block",
          type: "button",
          on: { click: function () { openProjectSheet(null); } },
        },
        "Add a project"
      )
    );

    const all = Store.list("projects");
    STATUS_GROUPS.forEach(function (pair) {
      const status = pair[0];
      const label = pair[1];
      const items = all
        .filter(function (p) {
          return p.status === status;
        })
        .sort(function (a, b) {
          return (a.order || 0) - (b.order || 0);
        });
      if (!items.length && status !== "idea") return;

      const group = UI.h("div", { class: "status-group" });
      group.appendChild(UI.h("div", { class: "eyebrow", text: label + " (" + items.length + ")" }));
      if (!items.length) {
        group.appendChild(UI.empty("hammer", "Nothing here yet — this is where a someday idea goes."));
      } else {
        items.forEach(function (p) {
          group.appendChild(UI.h("div", { class: "card" }, buildProjectCard(p)));
        });
      }
      wrap.appendChild(group);
    });

    return wrap;
  }

  /* ---------- screen shell ---------- */

  function buildSegmented(tab) {
    const seg = UI.h("div", { class: "segmented" });
    [
      ["cleaning", "Cleaning"],
      ["jobs", "Jobs"],
      ["projects", "Projects"],
    ].forEach(function (pair) {
      const key = pair[0];
      seg.appendChild(
        UI.h(
          "button",
          {
            type: "button",
            "aria-pressed": tab === key ? "true" : "false",
            on: {
              click: function () {
                UI.state.houseTab = key;
                Router.refresh();
              },
            },
          },
          pair[1]
        )
      );
    });
    return seg;
  }

  function renderHouse(root) {
    const tab = UI.state.houseTab || "cleaning";
    UI.state.houseTab = tab;

    const jobs = Store.list("jobs");
    const projects = Store.list("projects");
    const openJobsCount = jobs.filter(function (j) {
      return !j.done;
    }).length;
    const goingCount = projects.filter(function (p) {
      return p.status === "in progress";
    }).length;

    root.appendChild(
      UI.h(
        "div",
        { class: "page-head" },
        UI.h("h1", { class: "title", text: "The house" }),
        UI.h("p", {
          class: "sub",
          text: plural(openJobsCount, "job") + " open · " + plural(goingCount, "project") + " going",
        })
      )
    );

    root.appendChild(buildSegmented(tab));

    if (tab === "jobs") root.appendChild(renderJobsTab());
    else if (tab === "projects") root.appendChild(renderProjectsTab());
    else root.appendChild(renderCleaningTab());
  }

  Router.on("house", renderHouse);

  return {
    todayTasks: todayTasks,
    toggleTask: toggleTask,
    zoneName: zoneName,
    openJobs: openJobs,
    attention: attention,
  };
})();
