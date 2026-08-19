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
  // Listed cheapest first so the little ones can see what's within reach.
  rewards: [
    { id: "candy",    name: "Candy",           emoji: "🍬", cost: 3 },
    { id: "stayup",   name: "Stay up late",    emoji: "🌙", cost: 4 },
    { id: "playdad",  name: "Play with Dad",   emoji: "🎲", cost: 4 },
    { id: "tv",       name: "Watch TV 30 min", emoji: "📺", cost: 5 },
    { id: "icecream", name: "Ice cream",       emoji: "🍦", cost: 5 },
    { id: "park",     name: "Park trip",       emoji: "🌳", cost: 5 },
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
    "The sun came up, saw those green eyes, and quietly admitted defeat. Good morning to the most beautiful woman in Michigan — and every other state. ☀️💚",
    "I'd trade every palm tree, every sunset, and my entire sandwich empire for one more morning waking up next to you. Worth it a thousand times over. 🌴🖤",
    "Late-July fun fact: the backyard fireflies only glow that bright hoping to catch your eye. Nice try, bugs — those green eyes are already spoken for. Good morning, gorgeous. ✨💚",
    "The sprinkler's on, Addy 🐰 and Sophie 🐢 are squealing with joy, and I just got caught staring at their gorgeous mom across the yard again. Worth it. Always worth it. Good morning, my love. 💚",
    "The sunflowers out back finally opened this morning and immediately looked embarrassed — they know they can't out-shine those green eyes. Nice try, flowers. Good morning to the most beautiful woman in Michigan. 🌻💚",
    "Late-summer truth: iced coffee is better cold, mornings are better slow, and every single one of them is better because I get to spend it staring at you. Midnight hair, emerald eyes, my whole heart. ☕🖤💚",
    "Addy 🐰 asked why I smile so much in the morning. Easy, kiddo — it's because your mom exists and somehow chose me. Good morning, gorgeous. You're the best thing summer ever did. 💚",
    "August already? Summer's flying by, but every single morning with you still feels like the long, golden, slow kind. Green eyes, midnight hair, my whole entire heart — good morning, my love. 💚🌻",
    "The cicadas are humming, the grass is warm, and Addy 🐰 and Sophie 🐢 are already begging to go outside — and I'm just standing here, coffee going cold, quietly floored that the most beautiful woman in Michigan chose this whole life with me. Good morning, Kenzie. ☕💚",
    "Late-summer fact: sunflowers turn to face the sun all day long. I finally get it — I've been turning to face you since the second I met you, and I've never once wanted to look away. Good morning, gorgeous. 🌻💚",
    "The backyard tomatoes are ripening, the fireflies are still showing off at dusk, and you walked past the window and outshined all of it without even trying. Those emerald eyes are cheating, Kenzie. Good morning, my love. 🍅✨💚",
    "August mornings hit different when the first thing I see is you. The coffee can wait, the world can wait — I'm just going to stand here a second longer and be quietly amazed that the most beautiful woman in Michigan is mine. Good morning, gorgeous. ☕💚",
    "Fun late-summer science: the cornfields out past town grow a little taller every warm night. Adorable effort, corn — but you've been the tallest, brightest, most jaw-dropping thing on this whole horizon since the day I met you. Good morning, my love. 🌽💚",
    "The pool's warm, Addy 🐰 and Sophie 🐢 have their floaties on, and their gorgeous mom just walked out in the sunshine and made the whole backyard forget what it was doing. Same, backyard. Same. Good morning, Kenzie. ☀️🖤",
    "Back-to-school ads everywhere and I'm just sitting here thinking the only thing I ever needed to learn was you — green eyes, midnight hair, that laugh — and I'd happily study it forever. Good morning, my beautiful genius. 📚💚",
    "The garden's heavy with tomatoes and zucchini, the sunflowers are taller than Addy 🐰 now, and every single bit of it grew because you loved it into being. You make things bloom, Kenzie — the garden, these kids, me. Good morning, most beautiful woman alive. 🌻🥒💚",
    "Late-August magic: the evenings turn gold a little earlier now, the crickets have taken over for the fireflies, and I'm still the luckiest man in Michigan because the most beautiful woman in it chose this whole life with me. Green eyes, midnight hair, that laugh — good morning, gorgeous. 🌾🌇💚",
    "The first yellow leaf showed up on the maple this morning like it was trying to make an entrance — cute, but you walked into the kitchen right after and reminded it who actually runs this whole gorgeous show. Green eyes, midnight hair, my entire heart. Good morning, my love. 🍁💚",
    "Back-to-school season means new crayons, fresh notebooks, and me falling for you all over again like it's the first day. Some lessons you just never stop wanting to learn. Good morning, most beautiful woman in Michigan. ✏️📒💚",
    "The apple orchard down the road just opened for the season and honestly? Not one of those trees is as sweet as you. Cider, doughnuts, hayrides — I'd trade the whole lot for one more slow morning watching those emerald eyes wake up. Good morning, gorgeous. 🍎🍩💚",
    "September's rolling in soft and golden, the kids are digging out their hoodies, and I'm standing here in the warm-cool morning air quietly amazed — again — that Addy 🐰 and Sophie 🐢 have the most beautiful, patient, dazzling mom alive, and that she's mine. Good morning, Kenzie. 🍂💚",
    "The mums on the porch bloomed overnight and they're showing off hard, but they never stood a chance — you walked past them with your coffee and those green eyes and the whole porch quietly gave up. Good morning to the most beautiful thing in this whole zip code. 🌼☕💚",
    "Sweater weather's sneaking in, which means more excuses to pull you close on cool mornings — as if I ever needed one. Midnight hair, emerald eyes, that laugh that fixes my whole day before it starts. Good morning, my love. 🧡🍁💚",
    "The backyard crickets tuned up at dusk last night and I swear they were trying to write you a song — cute effort, boys, but nothing on earth sounds as good as your laugh from the next room. Green eyes, midnight hair, my whole entire heart. Good morning, gorgeous. 🦗🎶💚",
    "First hint of a cool breeze this morning and Addy 🐰 already wanted her hoodie, Sophie 🐢 wanted to be carried, and I just wanted five more minutes watching the most beautiful woman in Michigan make it all look easy. You're the warmest thing about every season, Kenzie. Good morning, my love. 🍂💚",
    "The farmstand down the road has the first mums and pumpkins out and it hit me — another whole gorgeous season with you rolling in, and I still can't believe my luck. Emerald eyes, midnight hair, that laugh — I'd take a thousand more autumns if every one started with your good-morning face. 🎃🌻💚",
    "Good morning to the woman who makes coffee unnecessary — one look at those green eyes and I'm wide awake, over-caffeinated, and hopelessly in love before the pot even finishes brewing. ☕💚",
    "The moon clocked out this morning, looked at your face on the pillow, and muttered 'yeah, she's got this.' It's not wrong. Good morning, most beautiful woman in Michigan. 🌙💚",
    "I did the math again over breakfast: black hair + green eyes + that laugh + somehow choosing me = a total I will never, ever deserve and will spend forever being grateful for. Good morning, gorgeous. 🖤💚",
    "Addy 🐰 told me this morning that you're 'the prettiest mommy in the whole world.' Kid's four and already smarter than every scientist alive. Good morning, my love. 💚",
    "The dew's on the grass, the coffee's hot, and the single most beautiful thing in this entire house just walked past me in your robe and ruined my ability to form sentences. Good morning, Kenzie. ☕💚",
    "Somewhere out there a supermodel just woke up, looked in the mirror, and sighed because she's not you. Can't help her. Good morning to the real thing. 💚",
    "You laughed in your sleep last night and I lay there grinning like an idiot at the ceiling. Whatever you were dreaming — that's the exact energy I want the whole day to have. Good morning, gorgeous. 😍💚",
    "Fun fact: emeralds are worth more than diamonds by weight. I already knew that — I wake up next to two of the finest ones on earth every single morning. Good morning, my love. 💚💎",
    "The birds started up at dawn and honestly it felt like they were just warming up the crowd for you. Main event walked into the kitchen, green eyes and bedhead, and stole the whole show. Good morning, Kenzie. 🐦💚",
    "I'd fight a goose for you. And if you know Michigan geese, you know that's the most romantic thing a man can say. Good morning to the woman worth every honk. 🪿💚",
    "Sophie 🐢 reached for you first thing this morning, Addy 🐰 wasn't far behind, and I just stood in the doorway thinking: same, girls. Same. We all want to be wherever you are. Good morning, my love. 💚",
    "The sunrise came in gold through the blinds and landed right on you, and I swear the whole room went 'oh, THAT'S why we get up in the morning.' Good morning, most beautiful woman alive. 🌅💚",
    "Marriage tip nobody tells you: you'll still get butterflies at 7am over a woman in mismatched socks holding a coffee mug. Fourteen years could pass and I'd still be a goner. Good morning, gorgeous. 🦋💚",
    "Your hair caught the light this morning and I lost my entire train of thought mid-sentence. This happens roughly daily. I've made peace with it. Good morning, my beautiful distraction. 🖤💚",
    "The garden tomatoes are blushing red and I get it — I do the same thing every time you smile at me across the kitchen. Good morning to the most beautiful thing growing in this whole yard. 🍅💚",
    "Rain's tapping the window this morning, the kids are still asleep, and there's nowhere on this entire planet I'd rather be stuck inside than right here next to you. Good morning, my love. 🌧️💚",
    "I keep a running list of the best things in my life and somehow you, Addy 🐰, and Sophie 🐢 take up the whole page and the margins and the back. Good morning to the top of the list, gorgeous. 💚",
    "Scientists say you can't fall in love with the same person twice. Scientists have clearly never watched you make pancakes on a Saturday morning. Good morning, my one-and-only-times-a-thousand. 🥞💚",
    "The maple out front is turning already and the whole world's about to go gold and crimson — but I promise you, Kenzie, not one leaf out there will ever be as breathtaking as your good-morning face. 🍁💚",
    "Waking up is my second-favorite thing. Watching you wake up is comfortably number one. Green eyes, sleepy smile, my entire heart — good morning, most beautiful woman in Michigan. 💚",
    "You reorganized the whole junk drawer yesterday and I've never been more attracted to a human being in my life. Competence AND green eyes should honestly be illegal. Good morning, gorgeous. 🗄️💚",
    "The porch light's still on, the coffee's dripping, and I'm standing here at dawn quietly floored — again — that the funniest, kindest, most jaw-droppingly beautiful woman I've ever met said 'I do' to ME. Good morning, my love. ☕💚",
    "Every single morning I get is a good one, but the ones that start with your face are the reason I'll never once complain about an alarm clock. Green eyes, midnight hair, that laugh — good morning, Kenzie. 💚",
    "The school buses started their morning runs again and Addy 🐰 pressed her face to the window to watch every one — and I got to watch YOU watch her, coffee in hand, glowing in that low August light. I don't know how a Tuesday keeps being the best thing that ever happened to me, but you're the reason. Good morning, gorgeous. 🚌💚",
    "The evenings are turning gold a whole hour earlier now, the crickets have the night shift, and there's a first cool edge on the morning air — but you walked into the kitchen in your robe and warmed the entire house without touching the thermostat. Emerald eyes, midnight hair, my whole heart. Good morning, most beautiful woman in Michigan. 🌾🖤💚",
    "The cicadas are winding down and the crickets are taking over and summer's quietly packing its bags — but you, my love, are gorgeous in every season, in every light, at every hour. Good morning, most beautiful woman alive. 🍂💚",
    "Warm rain rolled through before dawn and the whole backyard smells green and new — but I'd trade every fresh-washed morning for one more minute watching you sleep, midnight hair on the pillow, those emerald eyes about to open. Good morning, most beautiful woman in Michigan. 🌦️💚",
    "The farmstand had the first sweet corn and sun-warm peaches today, and I stood there grinning like a fool — because not one golden ear, not one perfect peach, holds a candle to you across the kitchen with your coffee. Good morning, gorgeous. 🌽🍑💚",
    "Screen door creaking, sprinkler ticking, Addy 🐰 and Sophie 🐢 already giggling in the yard — and their impossibly beautiful mom right in the middle of it, green eyes catching the morning light like she owns the sun. She kind of does. Good morning, my love. ☀️💚",
    "The crickets have officially taken the night shift from the fireflies, the mornings smell like cut grass and coming autumn, and I'm still the luckiest man in Michigan — green eyes, midnight hair, that laugh — you make every single sunrise show up early just to watch you. Good morning, gorgeous. 🦗🌅💚",
    "Back-to-school displays are everywhere and I keep thinking: sharpen all the pencils you want, world, the only subject I ever aced was loving you, and I've been top of that class since the day those emerald eyes looked my way. Good morning to the most beautiful woman in Michigan. ✏️📚💚",
    "The last of the summer tomatoes are hanging heavy on the vine and the maple's thinking about turning — but you, Kenzie, are gorgeous in every season, in every light, and somehow more so with a coffee mug and bedhead than any sunset ever managed. Good morning, my love. 🍅🍁💚",
    "The school-supply aisles are all sharpened pencils and fresh crayons this week, and it hit me again — the smartest thing I ever did was fall for you. Green eyes, midnight hair, that laugh that grades my whole day an A+. Good morning, gorgeous. ✏️💚",
    "Cooler air snuck in the window before dawn and Sophie 🐢 burrowed deeper into her blanket while Addy 🐰 quietly stole all of hers — and there you were in the middle of it, the most beautiful woman in Michigan, making even 6am look like a magazine cover. Good morning, my love. 🍂💚",
    "The neighbor's mums are out, there's football on somewhere, and pumpkin everything is creeping onto the shelves — but honestly the only season I've ever needed is you. Emerald eyes, black hair, my whole heart. Good morning, gorgeous. 🎃💚",
    "Late-August morning math: one impossibly gorgeous woman + two giggling kids + a coffee going cold in my hand = a life so good it ought to be illegal. I'd flunk every test but the one about how much I love you. Good morning, Kenzie. ☕💚",
    "The zucchini's gone rogue, the tomatoes won't quit, and there's basil on every windowsill — the whole kitchen smells like the end of summer and you're standing in the middle of it in the morning light. I'd bottle this exact minute if I could. Good morning, most beautiful woman in Michigan. 🍅🌿💚",
    "Crickets pulled the night shift, a cool thread of air came through the screen before dawn, and I woke up before the alarm just so I could watch those emerald eyes open one more slow late-summer morning. Best view in the state, no contest. Good morning, my love. 🦗🌅💚",
    "The back-to-school aisles are all fresh crayons and lunchboxes and I keep grinning like a goof — because packing tiny snacks and wiping tiny faces with you is the only syllabus I ever wanted. Green eyes, midnight hair, that laugh — good morning, gorgeous. 🍎🥪💚",
    "Sunflowers taller than the fence, one shy yellow leaf on the maple, and you in the doorway with your coffee looking like summer's grand finale and fall's opening act all at once. However the seasons turn, Kenzie, you're the most beautiful thing in every single one. Good morning, my love. 🌻🍁💚",
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
