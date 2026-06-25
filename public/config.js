/* ============================================================================
   YOUR SETTINGS — edit this file to make the dashboard yours.
   (This is part of the CODE, so changes here sync from your PC to the screen.
    Your chore checkmarks live separately and are never affected by edits here.)
   ========================================================================== */

window.CONFIG = {

  // Shown in the top-left greeting.
  home: "The Solanyk family",

  // Weather units + your location label.
  location: "Backyard",

  // ── Family members and their colors ──────────────────────────────────
  people: {
    Chad:    "#3B82F6",   // blue
    Kenzie:  "#8B5CF6",   // purple
    Addison: "#F59E0B",   // amber
    Sophie:  "#10B981",   // green
  },

  // Fun avatars shown on chore badges (any emoji works). People without one
  // just show their first initial. The kids' favorites: Addy 🐰, Sophie 🐢.
  avatars: {
    Addison: "🐰",
    Sophie:  "🐢",
  },

  // ── Birthdays ────────────────────────────────────────────────────────
  // The dashboard shows the next upcoming birthday and figures out the age
  // automatically from the year born.
  birthdays: [
    { name: "Addison", month: 3, day: 20, born: 2022 },
    { name: "Sophie",  month: 7, day: 10, born: 2024 },
  ],

  // ── Chores ───────────────────────────────────────────────────────────
  // cadence: "daily"  -> checkmarks clear each morning
  //          "weekly" -> checkmarks clear each Monday
  // The list itself is code (syncs from your PC). Which ones are CHECKED is
  // state (lives on the Surface, survives every update).
  // These are just the STARTING chores. Add/edit/delete them right on the
  // touchscreen with the "Edit" button on the Chores tab — your changes are
  // saved on the device and survive every update.
  chores: [
    { id: "windows", name: "Wash windows",   who: "Addison", cadence: "weekly" },
    { id: "shoes",   name: "Clean up shoes", who: "Sophie",  cadence: "weekly" },
  ],

  // ── Calendar ─────────────────────────────────────────────────────────
  // To pull your real Google Calendar: in Google Calendar settings, copy the
  // "Secret address in iCal format" and paste it below. Leave null to use the
  // sample events instead.
  calendarICalUrl: "https://calendar.google.com/calendar/ical/chadsolanyk%40gmail.com/private-afa5561c80778c7283eeab6ed1cc52af/basic.ics",

  // Sample events (used when calendarICalUrl is null). d = days from today.
  sampleEvents: [
    { d: 0, time: "9:00a",   title: "Standup call",          who: "Chad"    },
    { d: 0, time: "5:30p",   title: "Addison — swim lesson", who: "Addison" },
    { d: 0, time: "6:30p",   title: "Taco night",            who: "Kenzie"  },
    { d: 1, time: "10:00a",  title: "Sophie — checkup",      who: "Sophie"  },
    { d: 1, time: "12:00p",  title: "Lunch w/ Pat",          who: "Chad"    },
    { d: 2, time: "All day", title: "Trash + recycling",     who: "Chad"    },
    { d: 2, time: "9:30a",   title: "Library story time",    who: "Addison" },
    { d: 3, time: "7:00p",   title: "Date night",            who: "Kenzie"  },
  ],

  // ── Look & feel ──────────────────────────────────────────────────────
  // "auto" switches to a dark theme in the evening; or force "light" / "dark".
  theme: "auto",
  darkFromHour: 19,   // 7pm
  darkUntilHour: 7,   // 7am
};
