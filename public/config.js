/* ============================================================================
   YOUR SETTINGS — edit this file to make the dashboard yours.
   (This is part of the CODE, so changes here sync from your PC to the screen.
    Your chore checkmarks live separately and are never affected by edits here.)
   ========================================================================== */

window.CONFIG = {

  // Shown in the top-left greeting.
  home: "The Solanyk family",

  // Weather units + your location label (shown under the live sensor temp).
  location: "Backyard",

  // For the 7-day forecast (free, no API key — uses Open-Meteo).
  // These are Hudsonville, MI. "Now" still comes from your backyard sensor.
  lat: 42.8717,
  lon: -85.8639,
  forecastPlace: "Hudsonville, MI",

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

  // ── Stars (one currency for everything) ──────────────────────────────
  // Kids earn ⭐ for doing chores AND for being kind / helping / good behavior
  // (you tap "Give a ⭐"), save them up, and cash them in for the treats below.
  // 1 chore = 1 star, 1 kind/helpful thing = 1 star. Balances live on the
  // Surface and survive every update.
  starEmoji: "⭐",
  starName: "star",
  defaultChoreStars: 1,         // a chore is worth this many ⭐ unless it sets its own
  // No parent lock right now — anyone can redeem. Put a 4-digit code here
  // (e.g. "1234") to require it again when the kids are older.
  parentPin: "",
  // Streaks: do something good on consecutive days to keep a 🔥 streak going.
  // Every Nth day in a row earns a bonus star.
  streakBonusEvery: 3,
  streakBonus: 1,
  // The reward shop. Tap a reward on the Rewards tab to cash stars in for it.
  // Ice cream is 7 ⭐ (≈ a week of chores), and they can spend on others too.
  rewards: [
    { id: "candy",    name: "Candy",          emoji: "🍬", cost: 3  },
    { id: "tv",       name: "Watch TV 30 min", emoji: "📺", cost: 4 },
    { id: "stayup",   name: "Stay up late",   emoji: "🌙", cost: 5 },
    { id: "icecream", name: "Ice cream",      emoji: "🍦", cost: 7 },
    { id: "park",     name: "Park trip",      emoji: "🌳", cost: 10 },
  ],

  // These are just the STARTING chores. Add/edit/delete them right on the
  // touchscreen with the "Edit" button on the Chores tab — your changes are
  // saved on the device and survive every update. "pic" is optional: kid
  // chores without one get a picture auto-picked from the name.
  chores: [
    { id: "windows", name: "Wash windows",   who: "Addison", cadence: "weekly", pic: "🧽" },
    { id: "shoes",   name: "Clean up shoes", who: "Sophie",  cadence: "weekly", pic: "👟" },
  ],

  // ── Meals & groceries ────────────────────────────────────────────────
  // Kenzie plans dinners for the week; the app builds the grocery list from
  // the recipes + the weekly staples, split by store. Edit freely — the
  // ingredient lists are a starting point, correct them as you go.
  meals: {
    // ALWAYS on the cart every week, no matter the dinners.
    weekly: [
      { item: "Whole milk",   qty: "3 gallons", store: "Meijer" },
      { item: "Greek yogurt", qty: "5 tubs",    store: "Meijer" },
    ],
    // Big / occasional staples — bought every once in a while, NOT weekly.
    // Shown as a "running low?" checklist so Kenzie ticks what to restock.
    pantry: [
      "Flour", "Salt", "Sugar", "Cooking oil", "Soy sauce", "Rice",
      "Dried pasta", "Marinara sauce", "BBQ sauce", "Ketchup", "Mustard",
      "Yeast", "Broth / miso", "Cornstarch", "Spices", "Parmesan",
    ],
    // Saturday is homemade pizza night.
    pizzaDay: 5,                                   // Mon=0 … Sat=5, Sun=6
    pizzaName: "Pizza night 🍕 (homemade dough)",
    // Roughly how many home-cooked dinners to aim for (pizza counts as one).
    homeDinnersSummer: 4,
    homeDinners: 5,
    // Fresh ideas the planner sprinkles in (and the "🎲 New idea" button).
    // When Claude Code is signed in here it suggests live, trending, weather-
    // aware ideas; otherwise it falls back to this season-tagged list.
    newIdeas: ["Tacos", "Stir fry", "Breakfast for dinner", "Sheet-pan salmon",
      "Chili", "Fajitas", "Soup & grilled cheese", "Curry", "Pot roast", "Quesadillas"],
    seasonalIdeas: {
      summer: ["Grilled chicken & veggies", "BBQ ribs", "Fish tacos", "Caprese pasta",
        "Shrimp skewers", "Cobb salad", "Street-corn bowls", "Grilled veggie flatbread"],
      fall: ["Chili", "Pot roast", "Butternut squash soup", "Sheet-pan sausage & veggies",
        "Shepherd's pie", "Baked ziti", "Pork chops & apples", "Chicken & wild rice soup"],
      winter: ["Beef stew", "Chicken pot pie", "Lasagna", "Tomato soup & grilled cheese",
        "Coconut curry", "Meatloaf & mashed potatoes", "White chicken chili", "Beef & broccoli"],
      spring: ["Lemon herb chicken", "Asparagus pasta", "Stir fry", "Salmon rice bowls",
        "Fajitas", "Spring veggie risotto", "Greek chicken pitas", "Pesto pasta"],
    },
    // ── Featured picks: REAL recipes from great cooks — never AI slop. ──
    // These back up the weekly live picks (which Claude web-searches from top
    // sources when it's signed in). Simple ingredients, ~easy weeknight level.
    // seasons: which seasons it suits (omit = all year).
    featured: [
      { name: "Tomato–butter pasta", source: "Marcella Hazan", emoji: "🍝", time: "45 min",
        seasons: ["fall", "winter", "spring"],
        ingredients: ["Canned whole tomatoes", "Butter", "Onion", { item: "Dried pasta", pantry: true }, { item: "Parmesan", pantry: true }] },
      { name: "Lemon–garlic roast chicken", source: "Ina Garten", emoji: "🍋",
        time: "40 min", ingredients: ["Chicken thighs", "Lemons", "Garlic", "Fresh thyme"] },
      { name: "Crispy sheet-pan chicken & potatoes", source: "Kenji López-Alt / Serious Eats", emoji: "🍗",
        time: "45 min", ingredients: ["Chicken thighs", "Baby potatoes", "Lemons", "Fresh rosemary"] },
      { name: "Sheet-pan gnocchi & tomatoes", source: "Ali Slagle / NYT Cooking", emoji: "🥔",
        time: "30 min", seasons: ["summer", "fall"],
        ingredients: ["Shelf-stable gnocchi", "Cherry tomatoes", "Fresh mozzarella", "Basil"] },
      { name: "Everyday chicken tacos", source: "Pati Jinich (style)", emoji: "🌮",
        time: "30 min", ingredients: ["Chicken breast", "Corn tortillas", "Avocado", "Lime", "Cilantro", "Cotija or feta"] },
      { name: "Garlicky shrimp & greens pasta", source: "Melissa Clark / NYT Cooking", emoji: "🦐",
        time: "25 min", seasons: ["spring", "summer"],
        ingredients: ["Shrimp", "Baby spinach", "Garlic", "Lemons", { item: "Dried pasta", pantry: true }] },
      { name: "Skillet chicken pot pie", source: "Erin French / The Lost Kitchen (style)", emoji: "🥧",
        time: "50 min", seasons: ["fall", "winter"],
        ingredients: ["Chicken thighs", "Frozen peas & carrots", "Puff pastry", "Heavy cream", "Onion"] },
      { name: "Grilled flank steak & corn salad", source: "Bon Appétit", emoji: "🥩",
        time: "35 min", seasons: ["summer"],
        ingredients: ["Flank steak", "Corn", "Cherry tomatoes", "Feta", "Lime"] },
    ],
    // Deal / coupon links used by the shopping list + grocery email.
    dealLinks: [
      { name: "Meijer weekly ad", url: "https://www.meijer.com/shopping/weekly-ad.html" },
      { name: "mPerks coupons",   url: "https://www.meijer.com/shopping/mperks.html" },
      { name: "ALDI weekly ad",   url: "https://www.aldi.us/weekly-specials/our-weekly-ads/" },
    ],
    // The staple dinners. "pantry: true" on an ingredient means it's assumed
    // on-hand (a big/occasional staple) and skipped on the weekly list.
    recipes: [
      { id: "cashew-chicken", name: "Cashew chicken", emoji: "🍗", ingredients: [
        { item: "Chicken breast", store: "Meijer" }, { item: "Cashews", store: "Meijer" },
        { item: "Broccoli", store: "Aldi" }, { item: "Bell pepper", store: "Aldi" },
        { item: "Rice", store: "Meijer", pantry: true }, { item: "Soy sauce", store: "Meijer", pantry: true },
      ] },
      { id: "bbq-chicken", name: "BBQ chicken", emoji: "🍗", ingredients: [
        { item: "Chicken thighs", store: "Meijer" }, { item: "BBQ sauce", store: "Meijer", pantry: true },
        { item: "Potatoes", store: "Aldi" }, { item: "Corn", store: "Aldi" },
      ] },
      { id: "spaghetti", name: "Spaghetti", emoji: "🍝", ingredients: [
        { item: "Ground beef", store: "Meijer" }, { item: "Marinara sauce", store: "Meijer", pantry: true },
        { item: "Spaghetti noodles", store: "Meijer", pantry: true }, { item: "Parmesan", store: "Meijer", pantry: true },
      ] },
      { id: "burgers", name: "Burgers (homemade buns)", emoji: "🍔", ingredients: [
        { item: "Ground beef", store: "Meijer" }, { item: "Cheese slices", store: "Meijer" },
        { item: "Lettuce", store: "Aldi" }, { item: "Tomato", store: "Aldi" }, { item: "Onion", store: "Aldi" },
        { item: "Flour", store: "Meijer", pantry: true }, { item: "Yeast", store: "Meijer", pantry: true },
      ] },
      { id: "ramen", name: "Ramen", emoji: "🍜", ingredients: [
        { item: "Ramen noodles", store: "Meijer" }, { item: "Eggs", store: "Meijer" },
        { item: "Green onion", store: "Aldi" }, { item: "Mushrooms", store: "Aldi" },
        { item: "Pork", store: "Meijer" }, { item: "Broth / miso", store: "Meijer", pantry: true },
      ] },
      { id: "sausage-pasta", name: "Sausage pasta", emoji: "🍝", ingredients: [
        { item: "Italian sausage", store: "Meijer" }, { item: "Penne pasta", store: "Meijer", pantry: true },
        { item: "Heavy cream", store: "Meijer" }, { item: "Bell pepper", store: "Aldi" },
        { item: "Onion", store: "Aldi" }, { item: "Parmesan", store: "Meijer", pantry: true },
      ] },
    ],
  },

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
    "Happy almost-4th! You're hotter than any fireworks show, prettier than any skyline, and louder than a finale — in the best way. 🎆💚",
    "If they made fireworks that looked like your smile they'd close every other display. Happy July, gorgeous. 🎇🖤",
    "July 4th fun fact: independence is great, but finding someone to be completely UN-independent from is better. That's you. 💚🎆",
    "Sophie's birthday is almost here 🐢 — watching you be their mom is the best show on earth. You're incredible, Kenzie. 💚",
    "Addy's 🐰 and Sophie's 🐢 have the most beautiful, creative, funniest, most patient mom alive. Lucky doesn't cover it. 💚🖤",
  ],

  // One-time SURPRISE note: shows immediately (once) the moment the screen
  // gets this update — on top of the daily 7am ones. Set back to null to clear.
  loveNow: "Kenzie — your garden flowers are absolutely stunning, but they have an unfair advantage: they're standing next to YOU. Those blooms work overtime trying to be the most beautiful thing outside, and they lose every single time. You grow beauty with your hands AND you ARE beauty — green eyes that make tulips weep with envy, a smile brighter than any sunflower, and a gift for making living things flourish that honestly should be illegal. The roses are gorgeous. You're more gorgeous. The garden knows it. I know it. The whole neighborhood suspects it. Most talented gardener. Most beautiful human. Most hopelessly loved woman alive. 🌸🌺💚",

  // ── Look & feel ──────────────────────────────────────────────────────
  // "auto" switches to a dark theme in the evening; or force "light" / "dark".
  theme: "auto",
  darkFromHour: 19,   // 7pm
  darkUntilHour: 7,   // 7am

  // ── Photo reel + glass theme ─────────────────────────────────────────
  // Turn the wall into a slow family-photo slideshow with frosted-glass cards
  // floating on top. Drop photos into data/photos/ on the Surface (they stay
  // private — they never leave the device and are never pushed to GitHub).
  // Set photoTheme to true to switch it on; false keeps the calm sage look.
  // With it on but no personal photos yet, it shows the built-in default
  // scenes (public/scenes/) until you add your own.
  photoTheme: true,
  photoIntervalSec: 45,   // seconds each photo shows before a slow crossfade
};
