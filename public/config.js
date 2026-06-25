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
  // Who counts as a "kid": their chores show BIG pictures and they earn the
  // reward below. Anyone here without a picture on a chore gets one assigned
  // automatically (from the chore's name).
  kids: ["Addison", "Sophie"],

  // Reward: finish this many chore check-offs in a week to earn the treat.
  rewardGoal: 7,
  rewardEmoji: "🍦",
  rewardName: "ice cream",

  // These are just the STARTING chores. Add/edit/delete them right on the
  // touchscreen with the "Edit" button on the Chores tab — your changes are
  // saved on the device and survive every update. "pic" is optional: kid
  // chores without one get a picture auto-picked from the name.
  chores: [
    { id: "windows", name: "Wash windows",   who: "Addison", cadence: "weekly", pic: "🪟" },
    { id: "shoes",   name: "Clean up shoes", who: "Sophie",  cadence: "weekly", pic: "👟" },
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

  // ── Daily love note ──────────────────────────────────────────────────
  // A sweet popup that greets someone each morning. It rotates through the
  // messages below (one per day), so add as many as you like. Set loveTo to
  // null to turn it off.
  loveTo: "Kenzie",
  loveHour: 7,        // shows at/after this hour each morning (24h clock)
  loveMessages: [
    "Kenzie, your green eyes just made the sunrise file for early retirement. ☀️💚",
    "Roses are red, your eyes are green — you're the most gorgeous woman the world's ever seen.",
    "Scientists confirmed it: your black hair has its own gravitational pull. I'm helplessly in orbit. 🖤",
    "Good morning to the woman who makes emeralds jealous. Those eyes, Kenzie. THOSE eyes. 💚",
    "I told the ocean about you and now it won't stop blushing. The palm trees say hi too. 🌴",
    "Your beauty is statistically unfair to every other human. I've notified the authorities. 😍",
    "If your hair were any silkier I'd need a permit to touch it. Midnight has competition. 🖤",
    "Kenzie: living proof that perfection wakes up, drinks coffee, and somehow gets MORE beautiful.",
    "My heart just did a backflip. It is NOT insured for that. Entirely your fault. 💘",
    "Two green eyes, one black-haired goddess, zero chance I'll ever stop loving you.",
    "Somewhere a palm tree is swaying just to impress you. It's failing. You win, always. 🌴💚",
    "Marrying you was the smartest thing I've ever done — and I once invented a pretty great sandwich.",
    "Your hair: midnight. Your eyes: emerald. My brain: absolute mush. Worth it. 🖤💚",
    "Today's forecast: 100% you, with scattered patches of me being completely obsessed.",
    "I'd cross oceans, climb palm trees, and fight a coconut bare-handed for one of your smiles. 🌴🥥",
    "Green-eyed, black-haired, heart-stealing menace — and somehow you're MINE. Luckiest guy alive.",
    "You're so beautiful the mirror asks YOU for an autograph.",
    "Good morning, my love. The stars clocked out early — you've clearly got the shining handled.",
    "Cleopatra called; she wants her 'most beautiful woman alive' title back. I told her absolutely not. 👑",
    "Your eyes are green, your hair is night, and loving you is my favorite sight.",
    "If beauty were a crime you'd get life, and I'd happily turn myself in as an accomplice. 💚",
    "A palm tree, a sunset, and you — honestly the palm tree and sunset are just background extras. 🌴",
    "I love you more than coffee, Kenzie, and that's a dangerous thing to admit this early in the morning. ☕",
    "Those emerald eyes could stop traffic, start a war, and end my whole life. Good morning, gorgeous. 💚",
    "Your black hair is so flawless that shampoo commercials feel personally attacked. 🖤",
    "Every love song was secretly written about you. The artists just hadn't met you yet.",
    "You + a beach + palm trees = the only paradise I'll ever need. Bring those green eyes. 🌴💚",
    "I'd rearrange the stars to spell your name, but they're too busy staring at you.",
    "Kenzie, you're a 10 — but on a scale of how much I love you, you flat-out broke the machine.",
    "Good morning, beautiful. Reminder: you're stunning, I'm obsessed, and the coffee's cold because I got lost looking at you. ☕💚",
    "Summer is amazing, but only because you're in it. Green eyes + sunshine = an actual hazard. ☀️💚",
    "Your black hair in the summer sun looks like the night sky crashed the party early. Unfairly gorgeous. 🖤☀️",
    "Hot day forecast, but you're the real heat wave. Those emerald eyes could melt glaciers, Kenzie. 💚🌡️",
    "Watching you with Addy and Sophie — you're the most beautiful thing about every single day. 🐰🐢💚",
    "A summer breeze is lovely, but your laugh is better. Also your eyes. Also your everything. 🌴💚",
  ],

  // One-time SURPRISE note: shows immediately (once) the moment the screen
  // gets this update — on top of the daily 7am ones. Set back to null to clear.
  loveNow: "Kenzie — this note cut the line ahead of all the morning ones just to say: I love you. Ridiculously. With my whole heart AND my entire mush of a brain. (Your green eyes started it.) 💚🌴",

  // ── Look & feel ──────────────────────────────────────────────────────
  // "auto" switches to a dark theme in the evening; or force "light" / "dark".
  theme: "auto",
  darkFromHour: 19,   // 7pm
  darkUntilHour: 7,   // 7am
};
