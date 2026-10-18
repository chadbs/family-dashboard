/* ============================================================
   Countdowns — the next big thing the family is waiting for.

   Shared by home.html and saver.html: <script src="countdowns.js">,
   then Countdowns.next() gives the soonest event that hasn't passed.

   To add one, put it in TRIPS with a local date and time
   ("YYYY-MM-DDTHH:MM"). Thanksgiving and Christmas come back every
   year on their own.
   ============================================================ */

var Countdowns = (function () {
  var TRIPS = [
    { title: "Gatlinburg trip", emoji: "🏔️", at: "2026-10-26T04:00" },
  ];

  /* Fourth Thursday of November. */
  function thanksgiving(year) {
    var d = new Date(year, 10, 1);
    var firstThu = 1 + ((4 - d.getDay() + 7) % 7);
    return new Date(year, 10, firstThu + 21);
  }

  function events(now) {
    var y = now.getFullYear();
    var list = TRIPS.map(function (t) {
      var p = t.at.split(/[-T:]/).map(Number);
      return { title: t.title, emoji: t.emoji, at: new Date(p[0], p[1] - 1, p[2], p[3] || 0, p[4] || 0) };
    });
    [y, y + 1].forEach(function (yr) {
      list.push({ title: "Thanksgiving", emoji: "🦃", at: thanksgiving(yr) });
      list.push({ title: "Christmas", emoji: "🎄", at: new Date(yr, 11, 25) });
    });
    return list.sort(function (a, b) { return a.at - b.at; });
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /* An event stays "today" until midnight after it starts. */
  function next(now) {
    now = now || new Date();
    var list = events(now);
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      var endOfDay = new Date(startOfDay(e.at).getTime() + 864e5);
      if (endOfDay > now) return describe(e, now);
    }
    return null;
  }

  /* {title, emoji, at, days, hours, minutes, sleeps, today, label}
     days/hours/minutes: time left (0 once it has started).
     sleeps: calendar days until the day of the event (what kids count).
     label: "in 8 days", "tomorrow", "in 5 hours", "today!" */
  function describe(e, now) {
    var ms = Math.max(0, e.at - now);
    var sleeps = Math.round((startOfDay(e.at) - startOfDay(now)) / 864e5);
    var days = Math.floor(ms / 864e5);
    var hours = Math.floor((ms % 864e5) / 36e5);
    var minutes = Math.floor((ms % 36e5) / 6e4);
    var label;
    if (sleeps <= 0) label = ms > 0 && ms < 864e5 ? "in " + Math.max(1, Math.round(ms / 36e5)) + " hours" : "today!";
    else if (sleeps === 1) label = "tomorrow";
    else label = "in " + sleeps + " days";
    if (label === "in 1 hours") label = "in 1 hour";
    return {
      title: e.title,
      emoji: e.emoji,
      at: e.at,
      days: days,
      hours: hours,
      minutes: minutes,
      sleeps: sleeps,
      today: sleeps <= 0,
      label: label,
    };
  }

  return { next: next, events: events };
})();
