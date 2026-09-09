/* ============================================================
   Bible — the game for Addison (4) and Sophie (2).

   Each story gets a day: Creation, Noah, David, Jonah, the Good Shepherd,
   Daniel, the loaves and fishes, baby Moses, the fruit of the Spirit,
   Jesus and the children. Everything is read aloud and driven by touch,
   because one of the players cannot read and neither of them can type.

   TWO LEVELS, because a two-year-old and a four-year-old are not playing
   the same game:

     Little (Sophie)  five rounds, four big tiles, count to five, a hint
                      that arrives quickly, no penalty for a wrong tap.
     Big (Addison)    six rounds, six tiles, twelve-square boards, four
                      pairs, counting past five — and four round types she
                      has to actually think about: put them in order by
                      size, remember what was hiding, spot the one that
                      does not belong, and judge which side has more. A
                      wrong tile is taken off the board rather than just
                      wobbling, so guessing runs out but the round always
                      converges. Hints wait much longer.

   Design rules, in the order they matter:
     - never a dead end. Every round is winnable and the nudge escalates.
     - the difficulty ramps inside a session: the first round is a gimme,
       the last one is the real thing.
     - no two rounds of the same shape in a row.
     - a hit is loud, bright and instant. A miss is gentle and informative.
     - no stars, no score, no timer. Finishing the story is the prize, and
       a clean run is quietly acknowledged.

   The day's story and its boards come from the date, so the wall and both
   phones agree — but the story trail at the bottom is tappable, so any
   story can be played on any day.
   ============================================================ */

const BibleGame = (function () {
  /* ---------- the animal kingdom ----------
     `where` places it for the odd-one-out round, `size` orders it for the
     smallest-to-biggest round, `name` lets the prompts speak it aloud.
     "both" lives in the water and on the land, so it is never the answer
     to a habitat question. */

  const ANIMALS = {
    "\u{1F430}": { name: "bunny", where: "land", size: 2 },
    "\u{1F422}": { name: "turtle", where: "both", size: 2 },
    "\u{1F992}": { name: "giraffe", where: "land", size: 6 },
    "\u{1F418}": { name: "elephant", where: "land", size: 7 },
    "\u{1F981}": { name: "lion", where: "land", size: 5 },
    "\u{1F42F}": { name: "tiger", where: "land", size: 5 },
    "\u{1F43B}": { name: "bear", where: "land", size: 5 },
    "\u{1F411}": { name: "sheep", where: "land", size: 4 },
    "\u{1F410}": { name: "goat", where: "land", size: 4 },
    "\u{1F415}": { name: "dog", where: "land", size: 3 },
    "\u{1F431}": { name: "cat", where: "land", size: 3 },
    "\u{1F438}": { name: "frog", where: "both", size: 1 },
    "\u{1F986}": { name: "duck", where: "both", size: 2 },
    "\u{1F426}": { name: "bird", where: "land", size: 1 },
    "\u{1F54A}️": { name: "dove", where: "land", size: 1 },
    "\u{1F41F}": { name: "fish", where: "sea", size: 2 },
    "\u{1F40B}": { name: "whale", where: "sea", size: 8 },
    "\u{1F419}": { name: "octopus", where: "sea", size: 4 },
    "\u{1F980}": { name: "crab", where: "sea", size: 2 },
    "\u{1F41A}": { name: "shell", where: "sea", size: 1 },
    "\u{1F41D}": { name: "bee", where: "land", size: 1 },
    "\u{1F98B}": { name: "butterfly", where: "land", size: 1 },
    "\u{1F401}": { name: "mouse", where: "land", size: 1 },
    "\u{1F42E}": { name: "cow", where: "land", size: 5 },
    "\u{1F437}": { name: "pig", where: "land", size: 4 },
    "\u{1F414}": { name: "chicken", where: "land", size: 2 },
    "\u{1F434}": { name: "horse", where: "land", size: 6 },
    "\u{1F98C}": { name: "deer", where: "land", size: 4 },
    "\u{1F406}": { name: "leopard", where: "land", size: 5 },
    "\u{1F407}": { name: "rabbit", where: "land", size: 2 },
    "\u{1F420}": { name: "little fish", where: "sea", size: 1 },
  };

  function nameOf(glyph) {
    const a = ANIMALS[glyph];
    return a ? a.name : "";
  }
  function plural(glyph) {
    const n = nameOf(glyph);
    if (!n) return "";
    if (n === "sheep" || n === "fish" || n === "little fish" || n === "deer") return n;
    if (/[^aeiou]y$/.test(n)) return n.slice(0, -1) + "ies";   /* bunny -> bunnies */
    if (/(s|sh|ch|x|z)$/.test(n)) return n + "es";             /* octopus -> octopuses */
    return n + "s";
  }

  /* ---------- the stories ----------
     `cast` is what the procedural rounds draw on, so a story's harder
     rounds are still about that story's animals. */

  const STORIES = [
    {
      id: "creation",
      name: "God Made Everything",
      ref: "Genesis 1:1",
      verse: "In the beginning God created the heaven and the earth.",
      icon: "\u{1F30D}",
      sky: "day",
      cast: ["\u{1F430}", "\u{1F422}", "\u{1F992}", "\u{1F41F}", "\u{1F426}", "\u{1F418}", "\u{1F98B}"],
      rounds: [
        { type: "pick", prompt: "God made the sun to light the day. Tap the sun!", answer: "☀️", others: ["\u{1F31A}", "\u{1F41F}", "\u{1F333}"] },
        { type: "pick", prompt: "God made the moon to shine at night. Tap the moon!", answer: "\u{1F319}", others: ["☀️", "\u{1F41D}", "\u{1F338}"] },
        { type: "tapall", prompt: "God made all the stars. Tap every star!", target: "⭐", filler: ["☁️", "\u{1F319}"], count: 5 },
        { type: "pick", prompt: "God made the turtle, slow and steady. Tap the turtle!", answer: "\u{1F422}", others: ["\u{1F430}", "\u{1F992}", "\u{1F33B}"] },
        { type: "pick", prompt: "God made the bunny with long ears. Tap the bunny!", answer: "\u{1F430}", others: ["\u{1F422}", "\u{1F418}", "\u{1F33A}"] },
        { type: "pick", prompt: "God made the giraffe with a long neck. Tap the giraffe!", answer: "\u{1F992}", others: ["\u{1F430}", "\u{1F438}", "\u{1F41F}"] },
        { type: "sort", prompt: "Where does the whale live?", item: "\u{1F40B}", answer: "sea" },
        { type: "sort", prompt: "Where does the bunny live?", item: "\u{1F430}", answer: "land" },
        { type: "count", prompt: "God rested on the seventh day. Tap seven flowers!", item: "\u{1F33C}", n: 7 },
        { type: "pairs", prompt: "Match the animals God made!", items: ["\u{1F430}", "\u{1F422}", "\u{1F992}", "\u{1F98B}"] },
      ],
    },
    {
      id: "noah",
      name: "Noah's Ark",
      ref: "Genesis 7:9",
      verse: "There went in two and two unto Noah into the ark.",
      icon: "\u{1F6A2}",
      sky: "rain",
      cast: ["\u{1F992}", "\u{1F422}", "\u{1F430}", "\u{1F42F}", "\u{1F43B}", "\u{1F418}", "\u{1F54A}️"],
      rounds: [
        { type: "pairs", prompt: "The animals came two by two. Match the pairs!", items: ["\u{1F992}", "\u{1F422}", "\u{1F430}", "\u{1F42F}"] },
        { type: "pick", prompt: "Noah built a big boat. Tap the boat!", answer: "\u{1F6A2}", others: ["\u{1F697}", "\u{1F3E0}", "\u{1F6B2}"] },
        { type: "count", prompt: "Two giraffes walked on. Tap two giraffes!", item: "\u{1F992}", n: 2 },
        { type: "count", prompt: "Two turtles crawled on. Tap two turtles!", item: "\u{1F422}", n: 2 },
        { type: "pick", prompt: "After the rain God sent a rainbow. Tap the rainbow!", answer: "\u{1F308}", others: ["☁️", "⛈️", "❄️"] },
        { type: "tapall", prompt: "It rained and rained. Tap every raindrop!", target: "\u{1F4A7}", filler: ["☀️", "\u{1F33B}"], count: 5 },
        { type: "find", prompt: "A dove brought back a leaf. Find the dove!", target: "\u{1F54A}️", filler: "☁️" },
      ],
    },
    {
      id: "david",
      name: "David and Goliath",
      ref: "1 Samuel 17:45",
      verse: "I come to thee in the name of the LORD of hosts.",
      icon: "\u{1F411}",
      sky: "day",
      cast: ["\u{1F411}", "\u{1F401}", "\u{1F992}", "\u{1F410}", "\u{1F415}", "\u{1F98C}"],
      rounds: [
        { type: "count", prompt: "David picked five smooth stones. Tap five stones!", item: "\u{1FAA8}", n: 5 },
        { type: "pick", prompt: "David was a shepherd boy. Tap the sheep!", answer: "\u{1F411}", others: ["\u{1F437}", "\u{1F414}", "\u{1F431}"] },
        { type: "find", prompt: "One little sheep wandered off. Find the sheep!", target: "\u{1F411}", filler: "\u{1F33F}" },
        { type: "pick", prompt: "Goliath was very tall, like a giraffe. Tap the giraffe!", answer: "\u{1F992}", others: ["\u{1F430}", "\u{1F422}", "\u{1F401}"] },
        { type: "pick", prompt: "David was small, like a little mouse. Tap the mouse!", answer: "\u{1F401}", others: ["\u{1F992}", "\u{1F418}", "\u{1F40B}"] },
        { type: "tapall", prompt: "David trusted God. Tap every heart!", target: "❤️", filler: ["\u{1FAA8}", "\u{1F33F}"], count: 4 },
        { type: "pick", prompt: "David played the harp for the king. Tap the harp!", answer: "\u{1FA95}", others: ["\u{1F941}", "\u{1F3BA}", "\u{1F3B8}"] },
      ],
    },
    {
      id: "jonah",
      name: "Jonah and the Big Fish",
      ref: "Jonah 2:2",
      verse: "I cried by reason of mine affliction unto the LORD, and he heard me.",
      icon: "\u{1F40B}",
      sky: "sea",
      cast: ["\u{1F40B}", "\u{1F41F}", "\u{1F419}", "\u{1F980}", "\u{1F422}", "\u{1F41A}"],
      rounds: [
        { type: "pick", prompt: "A big fish swallowed Jonah. Tap the big fish!", answer: "\u{1F40B}", others: ["\u{1F41F}", "\u{1F980}", "\u{1F422}"] },
        { type: "sort", prompt: "Where does the big fish live?", item: "\u{1F40B}", answer: "sea" },
        { type: "find", prompt: "Jonah got on a boat. Find the boat!", target: "⛵", filler: "\u{1F30A}" },
        { type: "count", prompt: "Jonah was inside for three days. Tap three fish!", item: "\u{1F41F}", n: 3 },
        { type: "tapall", prompt: "The sea was stormy. Tap every wave!", target: "\u{1F30A}", filler: ["⛵", "\u{1F41F}"], count: 5 },
        { type: "pick", prompt: "Jonah prayed, and God heard him. Tap the praying hands!", answer: "\u{1F64F}", others: ["\u{1F44B}", "\u{1F44F}", "✌️"] },
        { type: "pairs", prompt: "Match the sea creatures!", items: ["\u{1F40B}", "\u{1F419}", "\u{1F422}", "\u{1F980}"] },
      ],
    },
    {
      id: "shepherd",
      name: "The Good Shepherd",
      ref: "Psalm 23:1",
      verse: "The LORD is my shepherd; I shall not want.",
      icon: "\u{1F411}",
      sky: "meadow",
      cast: ["\u{1F411}", "\u{1F430}", "\u{1F98C}", "\u{1F410}", "\u{1F415}", "\u{1F98B}"],
      rounds: [
        { type: "find", prompt: "One sheep is lost. Find the sheep!", target: "\u{1F411}", filler: "\u{1F33F}" },
        { type: "count", prompt: "The shepherd counts his sheep. Tap four sheep!", item: "\u{1F411}", n: 4 },
        { type: "tapall", prompt: "Bring every sheep home. Tap all the sheep!", target: "\u{1F411}", filler: ["\u{1F33F}", "\u{1F332}"], count: 5 },
        { type: "pick", prompt: "The shepherd leads them to water. Tap the water!", answer: "\u{1F4A7}", others: ["\u{1F525}", "\u{1FAA8}", "\u{1F335}"] },
        { type: "pick", prompt: "A bunny hopped by the flock. Tap the bunny!", answer: "\u{1F430}", others: ["\u{1F411}", "\u{1F410}", "\u{1F415}"] },
        { type: "sort", prompt: "Is a sheep gentle or scary?", item: "\u{1F411}", answer: "land", labels: { sea: "Scary \u{1F43A}", land: "Gentle \u{1F411}" } },
        { type: "pairs", prompt: "Match the meadow friends!", items: ["\u{1F411}", "\u{1F430}", "\u{1F98C}", "\u{1F98B}"] },
      ],
    },
    {
      id: "children",
      name: "Jesus Loves the Children",
      ref: "Mark 10:14",
      verse: "Suffer the little children to come unto me, and forbid them not.",
      icon: "\u{1F476}",
      sky: "day",
      cast: ["\u{1F430}", "\u{1F431}", "\u{1F415}", "\u{1F98B}", "\u{1F426}", "\u{1F422}"],
      rounds: [
        { type: "tapall", prompt: "Jesus loves every child. Tap all the children!", target: "\u{1F467}", filler: ["\u{1F333}", "\u{1F33C}"], count: 5 },
        { type: "pick", prompt: "Jesus loves you! Tap the heart!", answer: "❤️", others: ["⭐", "\u{1F338}", "\u{1F31E}"] },
        { type: "count", prompt: "Tap three hearts for Jesus!", item: "\u{1F49B}", n: 3 },
        { type: "find", prompt: "One child is hiding. Find the little one!", target: "\u{1F476}", filler: "\u{1F33B}" },
        { type: "pick", prompt: "We can talk to Jesus in prayer. Tap the praying hands!", answer: "\u{1F64F}", others: ["\u{1F44B}", "\u{1F91D}", "\u{1F44D}"] },
        { type: "sort", prompt: "Does Jesus love little ones?", item: "\u{1F476}", answer: "land", labels: { sea: "No \u{1F614}", land: "Yes! ❤️" } },
        { type: "pairs", prompt: "Match the happy faces!", items: ["\u{1F600}", "\u{1F60A}", "\u{1F970}", "\u{1F917}"] },
      ],
    },
    {
      id: "daniel",
      name: "Daniel and the Lions",
      ref: "Daniel 6:22",
      verse: "My God hath sent his angel, and hath shut the lions' mouths.",
      icon: "\u{1F981}",
      sky: "night",
      cast: ["\u{1F981}", "\u{1F42F}", "\u{1F406}", "\u{1F431}", "\u{1F401}", "\u{1F430}"],
      rounds: [
        { type: "pick", prompt: "Daniel was put in with the lions. Tap the lion!", answer: "\u{1F981}", others: ["\u{1F42E}", "\u{1F430}", "\u{1F437}"] },
        { type: "count", prompt: "The lions stayed quiet. Tap three lions!", item: "\u{1F981}", n: 3 },
        { type: "find", prompt: "God sent an angel. Find the angel!", target: "\u{1F47C}", filler: "\u{1F981}" },
        { type: "pick", prompt: "Daniel prayed three times a day. Tap the praying hands!", answer: "\u{1F64F}", others: ["\u{1F44F}", "\u{1F919}", "\u{1F44B}"] },
        { type: "tapall", prompt: "Daniel was safe all night. Tap every star!", target: "⭐", filler: ["\u{1F981}", "\u{1F319}"], count: 4 },
        { type: "sort", prompt: "Where does a lion live?", item: "\u{1F981}", answer: "land" },
        { type: "pairs", prompt: "Match the big cats!", items: ["\u{1F981}", "\u{1F42F}", "\u{1F406}", "\u{1F431}"] },
      ],
    },
    {
      id: "loaves",
      name: "Five Loaves and Two Fish",
      ref: "Matthew 14:20",
      verse: "And they did all eat, and were filled.",
      icon: "\u{1F35E}",
      sky: "meadow",
      cast: ["\u{1F41F}", "\u{1F420}", "\u{1F426}", "\u{1F430}", "\u{1F98B}", "\u{1F411}"],
      rounds: [
        { type: "count", prompt: "A boy had five loaves of bread. Tap five!", item: "\u{1F35E}", n: 5 },
        { type: "count", prompt: "And two little fish. Tap two fish!", item: "\u{1F41F}", n: 2 },
        { type: "pick", prompt: "Jesus gave thanks and shared it. Tap the basket!", answer: "\u{1F9FA}", others: ["\u{1F392}", "\u{1F4E6}", "\u{1F6D2}"] },
        { type: "tapall", prompt: "Everyone was full! Tap all the bread!", target: "\u{1F35E}", filler: ["\u{1F41F}", "\u{1F9FA}"], count: 5 },
        { type: "find", prompt: "Find the boy who shared his lunch!", target: "\u{1F466}", filler: "\u{1F35E}" },
        { type: "sort", prompt: "Where does a fish live?", item: "\u{1F41F}", answer: "sea" },
        { type: "pairs", prompt: "Match the food!", items: ["\u{1F35E}", "\u{1F41F}", "\u{1F347}", "\u{1F34E}"] },
      ],
    },
    {
      id: "moses",
      name: "Baby Moses",
      ref: "Exodus 2:3",
      verse: "She took for him an ark of bulrushes, and laid it in the flags by the river's brink.",
      icon: "\u{1F476}",
      sky: "sea",
      cast: ["\u{1F438}", "\u{1F986}", "\u{1F422}", "\u{1F41F}", "\u{1F98B}", "\u{1F426}"],
      rounds: [
        { type: "find", prompt: "Baby Moses floated in a basket. Find the basket!", target: "\u{1F9FA}", filler: "\u{1F33E}" },
        { type: "pick", prompt: "The basket floated on the river. Tap the water!", answer: "\u{1F4A7}", others: ["\u{1F525}", "\u{1F33B}", "\u{1FAA8}"] },
        { type: "pick", prompt: "A princess found the baby. Tap the baby!", answer: "\u{1F476}", others: ["\u{1F418}", "\u{1F431}", "\u{1F338}"] },
        { type: "count", prompt: "Tap three reeds by the river!", item: "\u{1F33E}", n: 3 },
        { type: "sort", prompt: "Where does a frog live?", item: "\u{1F438}", answer: "sea", labels: { sea: "River \u{1F4A7}", land: "Desert \u{1F335}" } },
        { type: "tapall", prompt: "God kept Moses safe. Tap every heart!", target: "❤️", filler: ["\u{1F33E}", "\u{1F4A7}"], count: 4 },
        { type: "pairs", prompt: "Match the river friends!", items: ["\u{1F438}", "\u{1F986}", "\u{1F422}", "\u{1F41F}"] },
      ],
    },
    {
      id: "fruit",
      name: "The Fruit of the Spirit",
      ref: "Galatians 5:22",
      verse: "But the fruit of the Spirit is love, joy, peace.",
      icon: "\u{1F34E}",
      sky: "meadow",
      cast: ["\u{1F430}", "\u{1F54A}️", "\u{1F98B}", "\u{1F41D}", "\u{1F422}", "\u{1F411}"],
      rounds: [
        { type: "pick", prompt: "Love is a fruit of the Spirit. Tap the heart!", answer: "❤️", others: ["\u{1F34E}", "\u{1F34C}", "\u{1F347}"] },
        { type: "pick", prompt: "Joy is a fruit of the Spirit. Tap the happy face!", answer: "\u{1F600}", others: ["\u{1F622}", "\u{1F620}", "\u{1F634}"] },
        { type: "tapall", prompt: "Good fruit grows! Tap all the apples!", target: "\u{1F34E}", filler: ["\u{1F33F}", "\u{1F333}"], count: 5 },
        { type: "count", prompt: "Tap four bananas!", item: "\u{1F34C}", n: 4 },
        { type: "pairs", prompt: "Match the fruit!", items: ["\u{1F34E}", "\u{1F34C}", "\u{1F347}", "\u{1F353}"] },
        { type: "pick", prompt: "Peace is a fruit of the Spirit. Tap the dove!", answer: "\u{1F54A}️", others: ["\u{1F981}", "\u{1F40A}", "\u{1F98A}"] },
        { type: "pick", prompt: "Gentleness, like a bunny. Tap the bunny!", answer: "\u{1F430}", others: ["\u{1F40A}", "\u{1F981}", "\u{1F988}"] },
        { type: "sort", prompt: "Is being kind good or bad?", item: "\u{1F91D}", answer: "land", labels: { sea: "Bad \u{1F614}", land: "Good \u{1F31F}" } },
      ],
    },
  ];

  /* ---------- what the story is, told in three beats ----------
     Spoken between the chapters of a Journey, so the game is a story with
     rounds in it rather than rounds with a verse stapled on. Plain words,
     faithful to the text. */

  const BEATS = {
    creation: [
      "In the beginning, there was nothing at all. Then God spoke, and there was light.",
      "God made the sky and the sea, the trees and every animal. And God saw that it was good.",
      "Last of all God made people, to know him and to love him. And he rested on the seventh day.",
    ],
    noah: [
      "The whole world had turned away from God. But Noah walked with God, and God told him to build an ark.",
      "Two by two the animals came in, and the rain fell for forty days and forty nights.",
      "When the water went down, God set a rainbow in the sky, and promised never to flood the whole earth again.",
    ],
    david: [
      "David was the youngest of eight brothers, and he kept his father's sheep.",
      "A giant named Goliath frightened the whole army. But David said, I come to you in the name of the LORD.",
      "With one small stone, God gave David the victory. The battle is the LORD's.",
    ],
    jonah: [
      "God told Jonah to go and preach to Nineveh. But Jonah ran the other way, onto a ship.",
      "A great storm came, and a great fish swallowed Jonah up. For three days he prayed inside it.",
      "God heard him, and the fish put him safe on dry land. Then Jonah went to Nineveh after all.",
    ],
    shepherd: [
      "Jesus said, I am the good shepherd. He knows every one of his sheep by name.",
      "If even one little lamb wanders off, the shepherd goes out and looks until he finds it.",
      "He carries it home on his shoulders, rejoicing. That is how Jesus loves his people.",
    ],
    children: [
      "Mothers and fathers were bringing their little children to Jesus.",
      "The disciples tried to send them away. They thought Jesus was too busy for children.",
      "But Jesus said, Suffer the little children to come unto me, and forbid them not. And he took them up in his arms and blessed them.",
    ],
    daniel: [
      "Daniel prayed to God three times every day, with his window open toward Jerusalem.",
      "A wicked law said no one could pray. Daniel prayed anyway, and they threw him to the lions.",
      "But God sent his angel and shut the lions' mouths, and in the morning Daniel was not hurt at all.",
    ],
    loaves: [
      "A great crowd followed Jesus all day, and by evening everybody was hungry.",
      "One boy had five little loaves and two small fish. That was all the food there was.",
      "Jesus gave thanks, and broke it, and every single person ate and was full. Twelve baskets were left over.",
    ],
    moses: [
      "A cruel king wanted every Hebrew baby boy taken away.",
      "So a mother hid her baby in a basket, and set it among the reeds at the river's edge.",
      "The king's own daughter found him, and named him Moses. God was keeping him safe all along.",
    ],
    fruit: [
      "When God saves a person, he puts his own Spirit inside them.",
      "And the Spirit grows good fruit in them: love, joy, peace, patience and kindness.",
      "We do not grow it ourselves, any more than an apple makes itself. God grows it in us.",
    ],
  };

  /* ---------- the catechism ----------
     What this family believes, put into questions a small child can answer
     and a sentence they can carry away. The wrong answers are plainly
     wrong on purpose: a near-miss would teach the error. Every right
     answer is followed by the truth spoken out loud, because the point is
     the teaching, not the tapping.

     The distinction Dad most wants them to have: we are saved by grace,
     through faith, and we obey *because* we are loved, never in order to
     be. That ordering appears again and again below. */

  const DOCTRINE_LITTLE = [
    { q: "Who made you?", options: [["\u{1F30D}", "God made me", 1], ["\u{1F9F8}", "A toy", 0]],
      teach: "God made you. God made everything there is.", ref: "Genesis 1:1" },
    { q: "Does God love you?", options: [["❤️", "Yes!", 1], ["\u{1F614}", "No", 0]],
      teach: "God loves you. He loved us first, before we ever loved him.", ref: "1 John 4:19" },
    { q: "Who saves us from our sin?", options: [["✝️", "Jesus", 1], ["\u{1F64B}", "I do", 0]],
      teach: "Jesus saves us. We could never save ourselves.", ref: "Acts 4:12" },
    { q: "Where do we read about God?", options: [["\u{1F4D6}", "The Bible", 1], ["\u{1F4FA}", "The TV", 0]],
      teach: "God tells us about himself in the Bible. Every word of it is true.", ref: "Psalm 119:105" },
    { q: "Who hears you when you pray?", options: [["\u{1F64F}", "God hears me", 1], ["\u{1F634}", "Nobody", 0]],
      teach: "God hears every prayer, even a very little one.", ref: "Psalm 34:15" },
    { q: "Who takes care of you every day?", options: [["\u{1F30D}", "God does", 1], ["\u{1F340}", "Good luck", 0]],
      teach: "God takes care of you every single day. Nothing happens by luck.", ref: "1 Peter 5:7" },
    { q: "Is God good all the time?", options: [["\u{1F31F}", "All the time", 1], ["⏰", "Only sometimes", 0]],
      teach: "God is good all the time. He never changes.", ref: "Psalm 100:5" },
    { q: "Who made the animals?", options: [["\u{1F992}", "God made them", 1], ["\u{1F9D1}", "People made them", 0]],
      teach: "God made every animal, the giraffe and the bunny and the turtle too.", ref: "Genesis 1:25" },
    { q: "Who loved us first?", options: [["❤️", "God did", 1], ["\u{1F64B}", "I did", 0]],
      teach: "We love him, because he first loved us.", ref: "1 John 4:19" },
    { q: "Can God do anything?", options: [["✨", "Yes, anything", 1], ["\u{1F937}", "Only little things", 0]],
      teach: "Nothing is too hard for God.", ref: "Jeremiah 32:17" },
    { q: "Who should we obey?", options: [["\u{1F30D}", "God", 1], ["\u{1F9F8}", "Our toys", 0]],
      teach: "We obey God, and we obey Mum and Dad, because God tells us to.", ref: "Ephesians 6:1" },
    { q: "Did Jesus stay dead?", options: [["\u{1F31E}", "He rose again!", 1], ["\u{1FAA6}", "He stayed dead", 0]],
      teach: "Jesus died for sin, and on the third day he rose again.", ref: "1 Corinthians 15:4" },
  ];

  const DOCTRINE_BIG = [
    { q: "Are we saved by believing in Jesus, or by being good?",
      options: [["✝️", "By trusting Jesus", 1], ["\u{1F3C6}", "By being good", 0], ["\u{1F60A}", "By being nice", 0]],
      teach: "By grace are ye saved through faith; and that not of yourselves: it is the gift of God. Not by anything we do.",
      ref: "Ephesians 2:8" },
    { q: "Why do we obey God? To make him love us, or because he already does?",
      options: [["❤️", "He already loves us", 1], ["\u{1F3C6}", "To make him love us", 0], ["\u{1F440}", "So people see us", 0]],
      teach: "We obey because we are loved, never so that we will be. Obeying is our thank-you, not our payment.",
      ref: "1 John 4:19" },
    { q: "Who chose first — God, or us?",
      options: [["\u{1F30D}", "God chose first", 1], ["\u{1F64B}", "I chose first", 0], ["\u{1F3B2}", "It just happened", 0]],
      teach: "Ye have not chosen me, but I have chosen you. God loved us before we ever knew him.",
      ref: "John 15:16" },
    { q: "Who can change a person's heart?",
      options: [["\u{1F54A}️", "God alone", 1], ["\u{1F4AA}", "Trying really hard", 0], ["\u{1F9D1}", "Your parents", 0]],
      teach: "Only God can give a new heart. He says: a new heart also will I give you.",
      ref: "Ezekiel 36:26" },
    { q: "Why did God make you?",
      options: [["✨", "For his glory", 1], ["\u{1F3AE}", "To have fun", 0], ["\u{1F4B0}", "To get rich", 0]],
      teach: "Man's chief end is to glorify God, and to enjoy him for ever.",
      ref: "Westminster Shorter Catechism" },
    { q: "Can being nice get you into heaven?",
      options: [["✝️", "No — only Jesus can", 1], ["\u{1F60A}", "Yes, if I'm nice", 0], ["\u{1F3C6}", "If I'm the best", 0]],
      teach: "All our best works are not enough. Jesus is the way, the truth, and the life.",
      ref: "John 14:6" },
    { q: "So are good works useless?",
      options: [["\u{1F34E}", "No — they grow from love", 1], ["\u{1F5D1}️", "Yes, useless", 0], ["\u{1F3C6}", "They save us", 0]],
      teach: "Good works do not save us; they grow out of us once we are saved, like fruit on a tree.",
      ref: "Ephesians 2:10" },
    { q: "How many Gods are there?",
      options: [["☝️", "Only one", 1], ["✌️", "Two", 0], ["\u{1F522}", "Many", 0]],
      teach: "There is one God, in three persons: the Father, the Son, and the Holy Ghost.",
      ref: "Deuteronomy 6:4" },
    { q: "Who is the third person of the Trinity?",
      options: [["\u{1F54A}️", "The Holy Spirit", 1], ["\u{1F47C}", "An angel", 0], ["\u{1F451}", "A king", 0]],
      teach: "The Father, the Son, and the Holy Ghost — one God, three persons.",
      ref: "Matthew 28:19" },
    { q: "What is sin?",
      options: [["\u{1F4D6}", "Breaking God's law", 1], ["\u{1F622}", "Feeling sad", 0], ["\u{1F615}", "A little mistake", 0]],
      teach: "Sin is breaking God's law — in what we do, and in what we want in our hearts.",
      ref: "1 John 3:4" },
    { q: "Who has sinned?",
      options: [["\u{1F30D}", "Every one of us", 1], ["\u{1F608}", "Only bad people", 0], ["\u{1F6AB}", "Nobody", 0]],
      teach: "All have sinned, and come short of the glory of God. That is why we all need a Saviour.",
      ref: "Romans 3:23" },
    { q: "God's love for you — did you earn it?",
      options: [["\u{1F381}", "No, it's a gift", 1], ["\u{1F3C6}", "I earned it", 0], ["\u{1F91D}", "Half and half", 0]],
      teach: "It is a gift. A gift you work for is not a gift at all.",
      ref: "Romans 6:23" },
    { q: "Does God ever change his mind about loving his children?",
      options: [["\u{1F5FB}", "Never", 1], ["\u{1F324}️", "Sometimes", 0], ["\u{1F504}", "Every day", 0]],
      teach: "Nothing can separate us from the love of God. He does not change.",
      ref: "Romans 8:39" },
    { q: "When you do wrong, what should you do?",
      options: [["\u{1F64F}", "Tell God, and be forgiven", 1], ["\u{1F648}", "Hide it", 0], ["\u{1F3C6}", "Do extra chores", 0]],
      teach: "If we confess our sins, he is faithful and just to forgive us. We do not have to earn it back.",
      ref: "1 John 1:9" },
    { q: "Who keeps the whole world going?",
      options: [["\u{1F30D}", "God does", 1], ["\u{1F340}", "Luck", 0], ["\u{1F9D1}", "People do", 0]],
      teach: "God holds all things together. Not one sparrow falls without him.",
      ref: "Matthew 10:29" },
    { q: "Whose is the whole earth?",
      options: [["\u{1F30D}", "It is the LORD's", 1], ["\u{1F451}", "The king's", 0], ["\u{1F6AB}", "Nobody's", 0]],
      teach: "The earth is the LORD's, and the fulness thereof.",
      ref: "Psalm 24:1" },
  ];

  /* ---------- levels ---------- */

  const LEVELS = {
    little: {
      key: "little", label: "Little", sub: "Ages 2-3",
      rounds: 5, hint: 7000, pick: 4, find: 9, pairs: 3, tapall: 9,
      countBump: 0, peek: 4200, eliminate: false, procedural: false,
    },
    big: {
      key: "big", label: "Big", sub: "Ages 4+",
      rounds: 6, hint: 13000, pick: 6, find: 12, pairs: 4, tapall: 12,
      countBump: 2, peek: 2800, eliminate: true, procedural: true,
    },
  };

  /* How hard each shape is, so a session can ramp instead of lurching.
     The catechism round sits in the middle: it is not hard to tap, but it
     is the one worth arriving at with a warm brain. */
  const WEIGHT = {
    pick: 1, sort: 1, find: 2, tapall: 2, count: 2, truth: 3,
    pairs: 3, more: 3, oddone: 4, order: 5, missing: 5,
  };

  /* A Journey is the long version: twelve rounds in three chapters, with
     the story told in between and the catechism closing each chapter. */
  const JOURNEY_CHAPTERS = 3;
  const JOURNEY_PER_CHAPTER = 4;

  const PRAISE = ["Yes!", "You found it!", "Great job!", "Wonderful!", "That's right!", "Hooray!", "Well done!", "Clever girl!"];
  const NUDGE = ["Try again!", "Almost! Look again.", "Not that one. Keep looking!", "Hmm, have another go."];

  /* ---------- tiny helpers ---------- */

  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* mulberry32: small, good enough, deterministic per seed. */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, r) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function take(arr, n, r) {
    return shuffle(arr, r).slice(0, n);
  }

  function pickOne(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function storyForDay(date) {
    const d = date || new Date();
    return STORIES[(Word.dayOfYear(d) + d.getFullYear()) % STORIES.length];
  }

  function storyById(id) {
    return STORIES.filter(function (s) { return s.id === id; })[0] || null;
  }

  /* ---------- the harder rounds, built from the story's cast ----------
     These are generated rather than written out, so Addison gets a board
     she has not seen before even on a story she has played all week. */

  function castPool(story) {
    const extra = Object.keys(ANIMALS);
    return story.cast.concat(extra.filter(function (g) { return story.cast.indexOf(g) < 0; }));
  }

  /* Smallest to biggest. Three animals, three clearly different sizes. */
  function makeOrder(story, r) {
    const pool = castPool(story).filter(function (g) { return ANIMALS[g]; });
    let chosen = null;
    for (let attempt = 0; attempt < 40 && !chosen; attempt++) {
      const three = take(pool, 3, r);
      const sizes = three.map(function (g) { return ANIMALS[g].size; });
      const uniq = sizes.filter(function (s, i) { return sizes.indexOf(s) === i; });
      if (uniq.length === 3) chosen = three;
    }
    if (!chosen) return null;
    const seq = chosen.slice().sort(function (a, b) { return ANIMALS[a].size - ANIMALS[b].size; });
    return {
      type: "order",
      prompt: "Tap them from smallest to biggest!",
      seq: seq,
      tiles: shuffle(chosen, r),
    };
  }

  /* Which side has more? Real counting, no reading. */
  function makeMore(story, r) {
    const g = take(story.cast, 1, r)[0];
    const small = 2 + Math.floor(r() * 3);        /* 2-4 */
    const big = small + 1 + Math.floor(r() * 2);  /* 1-2 more */
    const leftIsBig = r() < 0.5;
    return {
      type: "more",
      prompt: "Which side has MORE " + plural(g) + "?",
      glyph: g,
      left: leftIsBig ? big : small,
      right: leftIsBig ? small : big,
      answer: leftIsBig ? "left" : "right",
    };
  }

  /* Three belong together, one does not. */
  function makeOddOne(story, r) {
    const all = castPool(story).filter(function (g) { return ANIMALS[g].where !== "both"; });
    const sea = all.filter(function (g) { return ANIMALS[g].where === "sea"; });
    const land = all.filter(function (g) { return ANIMALS[g].where === "land"; });
    if (sea.length < 3 || land.length < 3) return null;
    const seaIsGroup = r() < 0.5;
    const group = seaIsGroup ? take(sea, 3, r) : take(land, 3, r);
    const odd = seaIsGroup ? take(land, 1, r)[0] : take(sea, 1, r)[0];
    return {
      type: "oddone",
      prompt: seaIsGroup
        ? "Three of these live in the water. Tap the one that does not!"
        : "Three of these live on the land. Tap the one that does not!",
      answer: odd,
      tiles: shuffle(group.concat([odd]), r),
    };
  }

  /* Look hard, then remember. One of them hides. */
  function makeMissing(story, r, level) {
    const n = level.key === "big" ? 5 : 4;
    const pool = castPool(story);
    const shown = take(pool, n, r);
    const hideAt = Math.floor(r() * shown.length);
    const answer = shown[hideAt];
    const decoys = take(
      pool.filter(function (g) { return shown.indexOf(g) < 0; }),
      2,
      r
    );
    if (decoys.length < 2) return null;
    return {
      type: "missing",
      prompt: "Look carefully and remember!",
      prompt2: "Which one is hiding?",
      tiles: shown,
      hideAt: hideAt,
      answer: answer,
      choices: shuffle(decoys.concat([answer]), r),
    };
  }

  function proceduralRounds(story, r, level) {
    return [makeOrder(story, r), makeMore(story, r), makeOddOne(story, r), makeMissing(story, r, level)]
      .filter(Boolean);
  }

  /* ---------- building a session ---------- */

  function distractors(story, avoid, n, r) {
    const pool = castPool(story)
      .concat(["\u{1F33B}", "\u{1F333}", "\u{1FAA8}", "\u{1F33F}", "☁️", "\u{1F31F}"])
      .filter(function (g) { return avoid.indexOf(g) < 0; });
    return take(pool, n, r);
  }

  /* Give a written round its board at this level. */
  function buildRound(spec, r, level, story) {
    const round = Object.assign({}, spec);
    if (spec.type === "pick" || spec.type === "oddone") {
      if (spec.type === "pick") {
        const want = level.pick - 1;
        let others = spec.others.slice();
        if (others.length < want) {
          others = others.concat(distractors(story, [spec.answer].concat(others), want - others.length, r));
        }
        round.tiles = shuffle([spec.answer].concat(others.slice(0, want)), r);
      }
    } else if (spec.type === "tapall") {
      const total = level.tapall;
      const count = Math.min(spec.count + (level.key === "big" ? 1 : 0), total - 3);
      const tiles = [];
      for (let i = 0; i < count; i++) tiles.push(spec.target);
      while (tiles.length < total) tiles.push(spec.filler[Math.floor(r() * spec.filler.length)]);
      round.count = count;
      round.tiles = shuffle(tiles, r);
    } else if (spec.type === "find") {
      const size = level.find;
      const tiles = [];
      for (let i = 0; i < size; i++) tiles.push(spec.filler);
      tiles[Math.floor(r() * size)] = spec.target;
      round.tiles = tiles;
    } else if (spec.type === "count") {
      const n = Math.min(spec.n + level.countBump, 10);
      round.n = n;
      round.prompt = level.countBump && spec.n !== n
        ? spec.prompt.replace(/tap (\w+)/i, "Tap " + numberWord(n))
        : spec.prompt;
      round.tiles = [];
      const total = Math.max(n + 2, 6);
      for (let i = 0; i < total; i++) round.tiles.push(spec.item);
    } else if (spec.type === "pairs") {
      const items = spec.items.slice(0, level.pairs);
      round.tiles = shuffle(items.concat(items), r);
    }
    return round;
  }

  const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  function numberWord(n) {
    return NUMBER_WORDS[n] || String(n);
  }

  /* A catechism question, with its answers shuffled so the right one is
     not always in the same place. */
  function buildTruth(spec, r) {
    return {
      type: "truth",
      prompt: spec.q,
      teach: spec.teach,
      ref: spec.ref,
      options: shuffle(
        spec.options.map(function (o) { return { glyph: o[0], text: o[1], ok: !!o[2] }; }),
        r
      ),
    };
  }

  function truthPool(level, r) {
    const src = level.key === "big" ? DOCTRINE_BIG : DOCTRINE_LITTLE;
    return shuffle(src, r).map(function (s) { return buildTruth(s, r); });
  }

  /* Pick the session's rounds: ramp them, and never the same shape twice
     in a row. Every session carries at least one catechism round. */
  function chooseRounds(story, level, r, mode) {
    if (mode === "journey") return journeyRounds(story, level, r);

    const gameplay = gameplayPool(story, level, r);
    const truths = truthPool(level, r);
    const want = Math.min(level.rounds, gameplay.length + 1);
    const chosen = ramp(spread(gameplay, want - 1), level);
    /* Drop the question in around two thirds of the way through, once she
       is warmed up but before she is tired. */
    chosen.splice(Math.max(1, Math.round(chosen.length * 0.66)), 0, truths[0]);
    return chosen;
  }

  /* Twelve rounds, three chapters, the story told between them, and each
     chapter closing on a question. */
  function journeyRounds(story, level, r) {
    const gameplay = gameplayPool(story, level, r);
    const truths = truthPool(level, r);
    const perChapter = JOURNEY_PER_CHAPTER - 1;
    const need = JOURNEY_CHAPTERS * perChapter;
    const picked = ramp(spread(gameplay, Math.min(need, gameplay.length)), level);
    const out = [];
    for (let c = 0; c < JOURNEY_CHAPTERS; c++) {
      const slice = picked.slice(c * perChapter, (c + 1) * perChapter);
      slice.forEach(function (rd) { out.push(rd); });
      if (truths[c]) out.push(truths[c]);
    }
    return out;
  }

  function gameplayPool(story, level, r) {
    const written = story.rounds
      .filter(function (s) { return !s.level || s.level === level.key; })
      .map(function (s) { return buildRound(s, r, level, story); });

    let pool = shuffle(written, r);
    if (level.procedural) {
      const gen = shuffle(proceduralRounds(story, r, level), r);
      pool = gen.concat(pool);
    }
    return pool;
  }

  /* Take a spread of shapes rather than the first N, so a session is not
     all one thing when a story leans heavily on one. */
  function spread(pool, want) {
    /* Take a spread rather than the first N, so a session is not all one
       shape when a story leans heavily on one. */
    const chosen = [];
    const byType = {};
    pool.forEach(function (rd) {
      const seen = byType[rd.type] || 0;
      if (chosen.length < want && seen < 2) {
        byType[rd.type] = seen + 1;
        chosen.push(rd);
      }
    });
    for (let i = 0; chosen.length < want && i < pool.length; i++) {
      if (chosen.indexOf(pool[i]) < 0) chosen.push(pool[i]);
    }
    return chosen;
  }

  /* Easy first, hard last — but never two of the same shape together. */
  function ramp(list) {
    const out = list.slice();
    out.sort(function (a, b) { return (WEIGHT[a.type] || 2) - (WEIGHT[b.type] || 2); });
    for (let i = 1; i < out.length; i++) {
      if (out[i].type !== out[i - 1].type) continue;
      for (let j = i + 1; j < out.length; j++) {
        if (out[j].type !== out[i].type) {
          const t = out[i];
          out[i] = out[j];
          out[j] = t;
          break;
        }
      }
    }
    return out;
  }

  /* ---------- who is playing, and at what level ---------- */

  /* There is no difficulty setting to get wrong. Each child simply has her
     own game: Addison is nearly five and gets the older one, Sophie is two
     and gets the gentle one. `config.gameLevel` still carries it so it can
     be changed without a code edit when they grow. */
  const GROWN_UP_AT = 4;

  function levelFor(name) {
    const cfg = Store.get("config") || {};
    const want = (cfg.gameLevel || {})[name];
    if (LEVELS[want]) return LEVELS[want];
    const age = (cfg.kidAges || {})[name];
    if (typeof age === "number") return age >= GROWN_UP_AT ? LEVELS.big : LEVELS.little;
    return LEVELS.little;
  }

  /* ---------- sound ---------- */

  let audio = null;
  let muted = false;
  function ctx() {
    if (audio) return audio;
    try {
      audio = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      audio = null;
    }
    return audio;
  }
  function tone(freq, ms, type, delay, vol) {
    if (muted) return;
    try {
      const c = ctx();
      if (!c) return;
      if (c.state === "suspended") c.resume();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || "sine";
      o.frequency.value = freq;
      o.connect(g);
      g.connect(c.destination);
      const t = c.currentTime + (delay || 0) / 1000;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.16, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      o.start(t);
      o.stop(t + ms / 1000 + 0.03);
    } catch (e) {
      /* no sound is fine */
    }
  }
  const SFX = {
    good: function () { tone(659, 120); tone(880, 160, "sine", 100); tone(1175, 220, "sine", 200, 0.12); },
    miss: function () { tone(260, 140, "triangle", 0, 0.1); tone(220, 200, "triangle", 120, 0.1); },
    tap: function () { tone(540, 60, "sine", 0, 0.1); },
    flip: function () { tone(700, 50, "sine", 0, 0.08); },
    peek: function () { tone(880, 90, "sine", 0, 0.1); tone(660, 120, "sine", 90, 0.09); },
    start: function () { [523, 659, 784].forEach(function (f, i) { tone(f, 180, "sine", i * 110, 0.12); }); },
    win: function () { [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { tone(f, 240, "sine", i * 110, 0.14); }); },
  };

  function say(text) {
    if (muted) return;
    Voice.speak(text, { rate: 1 });
  }
  function hush() {
    Voice.hush();
  }

  /* ---------- the sky: a WebGL particle field behind the board ----------
     three.js is fetched the first time the tab opens and never blocks the
     game; until it lands (or if it never does) the CSS scene stands in.
     One renderer for the life of the page, re-attached to whichever card
     is on screen, because the view is rebuilt on every tap. */

  const Backdrop = (function () {
    const SRC = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    const N = 150;
    let state = "idle"; /* idle | loading | ready | failed */
    let renderer = null, scene = null, camera = null, points = null, geo = null, mat = null;
    let canvas = null, mode = "", w = 0, h = 0, raf = null, idle = 0;
    let vel = null, phase = null, base = null;
    const reduce = (function () {
      try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
    })();

    function load() {
      if (state !== "idle" || reduce) return;
      state = "loading";
      const s = document.createElement("script");
      s.src = SRC;
      s.async = true;
      s.onload = function () { state = "ready"; Router.refresh(); };
      s.onerror = function () { state = "failed"; };
      document.head.appendChild(s);
    }

    function isDark() {
      const t = document.documentElement.getAttribute("data-theme");
      if (t === "dark") return true;
      if (t === "light") return false;
      try { return window.matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) { return false; }
    }

    function softDot() {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d");
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.35, "rgba(255,255,255,0.7)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    }

    /* Colour and motion per sky, from the house palette. */
    const LOOKS = {
      day:    { light: 0x2f5d8a, dark: 0xdfe9f5, size: [3, 8],  drift: [0.06, -0.10], wobble: 0.35, twinkle: 0.4 },
      meadow: { light: 0xb8860b, dark: 0xffe08a, size: [2, 6],  drift: [0.12, -0.14], wobble: 0.6,  twinkle: 0.5 },
      sea:    { light: 0x2f5d8a, dark: 0xbfe3ff, size: [3, 10], drift: [0.0,  -0.32], wobble: 0.9,  twinkle: 0.3 },
      rain:   { light: 0x4b6b86, dark: 0xb9d0e6, size: [2, 4],  drift: [-0.08, 1.6],  wobble: 0.05, twinkle: 0.1 },
      night:  { light: 0x2f5d8a, dark: 0xfff4c2, size: [2, 7],  drift: [0.02, -0.02], wobble: 0.1,  twinkle: 1.0 },
      party:  { light: 0xd39a12, dark: 0xffd76a, size: [4, 12], drift: [0.0,  -1.1],  wobble: 1.4,  twinkle: 0.9 },
    };

    function build() {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setClearColor(0x000000, 0);
      canvas = renderer.domElement;
      canvas.className = "bg-gl";
      canvas.setAttribute("aria-hidden", "true");
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);

      geo = new THREE.BufferGeometry();
      const pos = new Float32Array(N * 3);
      const size = new Float32Array(N);
      const alpha = new Float32Array(N);
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("size", new THREE.BufferAttribute(size, 1));
      geo.setAttribute("alpha", new THREE.BufferAttribute(alpha, 1));
      vel = new Float32Array(N * 2);
      phase = new Float32Array(N);
      base = new Float32Array(N);

      mat = new THREE.ShaderMaterial({
        uniforms: { color: { value: new THREE.Color(0xffffff) }, map: { value: softDot() }, ratio: { value: renderer.getPixelRatio() } },
        vertexShader:
          "attribute float size; attribute float alpha; varying float vA; uniform float ratio;" +
          "void main(){ vA = alpha; gl_PointSize = size * ratio; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader:
          "uniform vec3 color; uniform sampler2D map; varying float vA;" +
          "void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(color, t.a * vA); }",
        transparent: true,
        depthWrite: false,
        depthTest: false,
      });
      points = new THREE.Points(geo, mat);
      scene.add(points);
    }

    function seed(look) {
      const pos = geo.attributes.position.array;
      const size = geo.attributes.size.array;
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * w;
        pos[i * 3 + 1] = (Math.random() - 0.5) * h;
        pos[i * 3 + 2] = 0;
        size[i] = look.size[0] + Math.random() * (look.size[1] - look.size[0]);
        const spd = 0.6 + Math.random() * 0.9;
        vel[i * 2] = look.drift[0] * spd;
        vel[i * 2 + 1] = look.drift[1] * spd;
        phase[i] = Math.random() * Math.PI * 2;
        base[i] = 0.25 + Math.random() * 0.5;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.size.needsUpdate = true;
    }

    function fit(container) {
      const cw = container.clientWidth, ch = container.clientHeight;
      if (!cw || !ch || (cw === w && ch === h)) return false;
      w = cw; h = ch;
      renderer.setSize(w, h, false);
      camera.left = -w / 2; camera.right = w / 2; camera.top = h / 2; camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      return true;
    }

    function tick() {
      raf = null;
      if (!canvas.isConnected) {
        if (++idle < 90) raf = requestAnimationFrame(tick);
        return;
      }
      idle = 0;
      if (document.hidden) { raf = requestAnimationFrame(tick); return; }
      if (fit(canvas.parentNode)) seed(LOOKS[mode] || LOOKS.day);
      const look = LOOKS[mode] || LOOKS.day;
      const pos = geo.attributes.position.array;
      const alpha = geo.attributes.alpha.array;
      const t = performance.now() / 1000;
      for (let i = 0; i < N; i++) {
        let x = pos[i * 3] + vel[i * 2] + Math.sin(t * 0.8 + phase[i]) * look.wobble * 0.3;
        let y = pos[i * 3 + 1] - vel[i * 2 + 1];
        if (y > h / 2 + 10) y = -h / 2 - 10;
        if (y < -h / 2 - 10) y = h / 2 + 10;
        if (x > w / 2 + 10) x = -w / 2 - 10;
        if (x < -w / 2 - 10) x = w / 2 + 10;
        pos[i * 3] = x;
        pos[i * 3 + 1] = y;
        alpha[i] = base[i] * (1 - look.twinkle * 0.5 + look.twinkle * 0.5 * Math.sin(t * 2.2 + phase[i] * 3));
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.alpha.needsUpdate = true;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }

    /* Put the sky behind this card. Safe to call on every render. */
    function attach(container, sky) {
      if (state !== "ready") { load(); return false; }
      try {
        if (!renderer) build();
      } catch (e) {
        state = "failed";
        return false;
      }
      const look = LOOKS[sky] || LOOKS.day;
      const dark = isDark();
      mat.uniforms.color.value.setHex(dark ? look.dark : look.light);
      mat.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
      mat.needsUpdate = true;
      container.classList.add("has-gl");
      container.insertBefore(canvas, container.firstChild);
      if (sky !== mode) {
        mode = sky;
        w = 0; h = 0; /* force a refit + reseed for the new look */
      }
      if (!raf) raf = requestAnimationFrame(tick);
      return true;
    }

    return { attach: attach, load: load };
  })();

  /* ---------- game state (ephemeral, per screen) ---------- */

  function S() {
    if (!UI.state.bible) UI.state.bible = { phase: "kid" };
    return UI.state.bible;
  }

  /* Which story the start screen is offering: today's, or one tapped on
     the trail. */
  function offered() {
    const st = S();
    return (st.pickId && storyById(st.pickId)) || storyForDay(new Date());
  }

  function startGame(kid, level, fresh, mode) {
    const st = S();
    const story = offered();
    const seedStr = fresh
      ? String(Math.random())
      : Fmt.dayKey() + ":" + story.id + ":" + level.key + ":" + (mode || "quick");
    const r = rng(hashStr(seedStr));
    const rounds = chooseRounds(story, level, r, mode);
    clearTimers();
    st.kid = kid;
    st.level = level;
    st.story = story;
    st.rounds = rounds;
    st.mode = mode || "quick";
    st.idx = 0;
    st.clean = true;
    st.roundState = null;
    st.enter = true;
    SFX.start();
    Voice.unlock();
    if (st.mode === "journey") {
      st.chapter = 0;
      st.phase = "chapter";
      Router.refresh();
      setTimeout(function () { say(chapterText(st)); }, 420);
      return;
    }
    st.phase = "play";
    Router.refresh();
    speakRound(rounds[0], 380);
    armHint();
  }

  /* Which chapter a round belongs to, and the words that open it. */
  function chapterOf(idx) {
    return Math.floor(idx / JOURNEY_PER_CHAPTER);
  }
  function chapterStart(idx) {
    return idx % JOURNEY_PER_CHAPTER === 0;
  }
  function chapterText(st) {
    const beats = BEATS[st.story.id] || [];
    return beats[st.chapter] || st.story.verse;
  }

  function currentRound() {
    const st = S();
    return st.rounds ? st.rounds[st.idx] : null;
  }

  function roundState() {
    const st = S();
    if (!st.roundState) {
      st.roundState = { done: [], picked: [], dead: [], count: 0, wrong: null, solved: false, hint: false, peeked: false };
    }
    return st.roundState;
  }

  /* Say a round's prompt, and get the next one's audio ready while this one
     plays so the game never waits on the network. */
  /* Neither of them can read the answers, so a catechism question is read
     out with its choices, the way you would ask it at the table. */
  function roundSpeech(round) {
    if (round.type !== "truth") return round.prompt;
    return round.prompt + " Is it: " + round.options.map(function (o) { return o.text; }).join("? Or: ") + "?";
  }

  function speakRound(round, delay) {
    setTimeout(function () {
      say(roundSpeech(round));
      const st = S();
      const next = st.rounds && st.rounds[st.idx + 1];
      if (next) Voice.prefetch(roundSpeech(next));
      if (round.prompt2) Voice.prefetch(round.prompt2);
      if (round.teach) Voice.prefetch(round.teach);
    }, delay || 0);
  }

  /* ---- timers: the idle nudge, and the peek in the remember round ---- */

  let hintTimer = null;
  let peekTimer = null;
  let teachTimer = null;

  function clearTimers() {
    clearTimeout(hintTimer);
    clearTimeout(peekTimer);
    clearTimeout(teachTimer);
    hintTimer = null;
    peekTimer = null;
    teachTimer = null;
  }

  function armHint() {
    clearTimeout(hintTimer);
    const st = S();
    const wait = (st.level || LEVELS.little).hint;
    hintTimer = setTimeout(function () {
      const s = S();
      if (s.phase !== "play" || Router.current() !== "bible") return;
      const rs = roundState();
      if (rs.solved || (currentRound() || {}).type === "missing" && !rs.peeked) return;
      rs.hint = true;
      Router.refresh();
    }, wait);
  }

  function armPeek(round) {
    if (peekTimer) return;
    const st = S();
    peekTimer = setTimeout(function () {
      peekTimer = null;
      const rs = roundState();
      rs.peeked = true;
      SFX.peek();
      Router.refresh();
      say(round.prompt2);
      armHint();
    }, (st.level || LEVELS.little).peek);
  }

  function advance() {
    const st = S();
    st.roundState = null;
    clearTimers();
    if (st.idx + 1 >= st.rounds.length) {
      st.phase = "done";
      SFX.win();
      Router.refresh();
      setTimeout(function () {
        say("You did it" + (st.kid ? ", " + st.kid : "") + "! " + st.story.verse);
      }, 520);
      return;
    }
    st.idx++;
    st.enter = true;
    /* On a Journey the story picks up again at the top of each chapter. */
    if (st.mode === "journey" && chapterStart(st.idx)) {
      st.chapter = chapterOf(st.idx);
      st.phase = "chapter";
      Router.refresh();
      setTimeout(function () { say(chapterText(st)); }, 380);
      return;
    }
    Router.refresh();
    speakRound(st.rounds[st.idx], 340);
    armHint();
  }

  /* Leaving the chapter card and getting on with it. */
  function beginChapter() {
    const st = S();
    st.phase = "play";
    st.enter = true;
    Router.refresh();
    speakRound(st.rounds[st.idx], 260);
    armHint();
  }

  function good(el) {
    SFX.good();
    clearTimeout(hintTimer);
    const rs = roundState();
    const round = currentRound();
    rs.solved = true;
    rs.hint = false;
    if (el) burst(el);

    /* A catechism question is not finished when the right tile is tapped.
       The answer gets said back, in full, because that is the whole point
       of asking. */
    if (round && round.type === "truth") {
      rs.teaching = true;
      Router.refresh();
      say(round.teach);
      teachTimer = setTimeout(advance, 6200);
      return;
    }

    say(pickOne(PRAISE));
    Router.refresh();
    setTimeout(advance, 900);
  }

  /* A wrong tap. At the big level the tile is taken off the board, so
     guessing gets you nowhere but the round still always converges. */
  function miss(key) {
    SFX.miss();
    const st = S();
    const rs = roundState();
    st.clean = false;
    rs.wrong = key;
    if ((st.level || LEVELS.little).eliminate && key && rs.dead.indexOf(key) < 0) rs.dead.push(key);
    Router.refresh();
    setTimeout(function () {
      const r2 = roundState();
      if (r2.wrong === key) {
        r2.wrong = null;
        Router.refresh();
      }
    }, 520);
    say(pickOne(NUDGE));
  }

  /* A little burst of sparks out of a tile. Pure decoration, removed
     after it plays. */
  function burst(el, glyphs) {
    try {
      const rect = el.getBoundingClientRect();
      const host = UI.h("div", { class: "bg-burst", "aria-hidden": "true" });
      host.style.left = rect.left + rect.width / 2 + "px";
      host.style.top = rect.top + rect.height / 2 + "px";
      const set = glyphs || ["✨", "⭐", "\u{1F31F}", "\u{1F49B}", "✨"];
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 60 + Math.random() * 50;
        const s = UI.h("span", { class: "bg-spark", text: set[i % set.length] });
        s.style.setProperty("--dx", Math.cos(ang) * dist + "px");
        s.style.setProperty("--dy", Math.sin(ang) * dist + "px");
        s.style.animationDelay = Math.random() * 60 + "ms";
        host.appendChild(s);
      }
      document.body.appendChild(host);
      setTimeout(function () { host.remove(); }, 900);
    } catch (e) {
      /* decoration only */
    }
  }

  /* ---------- rendering ---------- */

  function tile(glyph, opts) {
    const o = opts || {};
    const b = UI.h(
      "button",
      {
        class: "bg-tile" + (o.cls ? " " + o.cls : ""),
        type: "button",
        "aria-label": o.label || nameOf(glyph) || glyph,
        disabled: o.disabled ? true : null,
      },
      UI.h("span", { class: "bg-glyph", text: o.hidden ? "❓" : glyph })
    );
    b.style.setProperty("--i", String(o.index || 0));
    if (o.onTap) {
      b.addEventListener("click", function (ev) { o.onTap(ev.currentTarget); });
    }
    return b;
  }

  function muteButton() {
    const b = UI.h(
      "button",
      { class: "ibtn bg-mute", type: "button", "aria-label": muted ? "Turn sound on" : "Turn sound off", title: muted ? "Sound is off" : "Sound is on" },
      UI.icon(muted ? "x" : "sound")
    );
    b.addEventListener("click", function () {
      muted = !muted;
      if (muted) hush();
      Router.refresh();
    });
    return b;
  }

  function tomorrowStory(now) {
    return storyForDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  }

  function renderKidPicker(root) {
    const st = S();
    const shop = typeof Rewards !== "undefined" ? Rewards.shop() || {} : {};
    const kids = shop.kids || [];
    const now = new Date();
    const today = storyForDay(now);
    const story = offered();
    const tomorrow = tomorrowStory(now);
    const chosen = story.id !== today.id;

    root.appendChild(
      UI.h(
        "div",
        { class: "page-head bg-head" },
        UI.h(
          "div",
          {},
          UI.h("div", { class: "eyebrow", text: chosen ? "A story you picked" : "Today's Bible game" }),
          UI.h("div", { class: "title", text: story.name })
        ),
        muteButton()
      )
    );

    /* One card per kid: tap the picture to play, tap the level chip to
       change how hard it is. */
    const players = kids.map(function (k) {
      const level = levelFor(k.name);
      const card = UI.h("div", { class: "bg-kid-wrap" });
      const b = UI.h(
        "button",
        { class: "bg-kid", type: "button" },
        UI.h("span", { class: "bg-kid-emoji", text: k.emoji || "⭐" }),
        UI.h("span", { class: "bg-kid-name", text: k.name }),
        UI.h("span", { class: "bg-kid-sub", text: "Tap to play" })
      );
      b.addEventListener("click", function () { startGame(k.name, levelFor(k.name), false, "quick"); });
      const chip = UI.h(
        "button",
        { class: "bg-level", type: "button", "data-level": level.key, "aria-label": "Difficulty for " + k.name + ": " + level.label },
        UI.h("span", { text: level.label }),
        UI.icon("chevron")
      );
      chip.addEventListener("click", function () {
        setLevel(k.name, level.key === "big" ? "little" : "big");
        SFX.tap();
      });
      card.appendChild(b);
      card.appendChild(chip);
      /* The long version, for when there is time for the whole story. */
      if (level.key === "big") {
        const j = UI.h(
          "button",
          { class: "bg-journey", type: "button", "aria-label": "Play the long journey with " + k.name },
          UI.h("span", { text: "\u{1F5FA}️" }),
          UI.h("span", { text: "Journey" })
        );
        j.addEventListener("click", function () { startGame(k.name, levelFor(k.name), false, "journey"); });
        card.appendChild(j);
      }
      return card;
    });

    const anyone = UI.h("div", { class: "bg-kid-wrap" });
    const anyBtn = UI.h(
      "button",
      { class: "bg-kid bg-kid-anyone", type: "button" },
      UI.h("span", { class: "bg-kid-emoji", text: story.icon }),
      UI.h("span", { class: "bg-kid-name", text: kids.length ? "Together" : "Play" }),
      UI.h("span", { class: "bg-kid-sub", text: "Tap to play" })
    );
    anyBtn.addEventListener("click", function () { startGame("", LEVELS.little, false, "quick"); });
    anyone.appendChild(anyBtn);
    players.push(anyone);

    const intro = UI.h(
      "div",
      { class: "card bg-intro bg-sky", "data-sky": story.sky },
      UI.h("div", { class: "bg-scene", "aria-hidden": "true" }, sceneBits(story.sky)),
      UI.h("div", { class: "bg-intro-icon", text: story.icon }),
      UI.h("p", { class: "bg-intro-verse", text: "“" + story.verse + "”" }),
      UI.h("div", { class: "word-ref", text: story.ref + " (KJV)" }),
      UI.h("div", { class: "bg-intro-text", text: "Everything is read out loud, so just listen and tap." }),
      UI.h("div", { class: "eyebrow", text: "Who's playing?" }),
      UI.h("div", { class: "bg-kids", "data-n": String(players.length) }, players)
    );
    root.appendChild(intro);
    Backdrop.attach(intro, story.sky);

    /* The trail is tappable: any story, any day. */
    const head = UI.h("div", { class: "bg-trail-head" }, UI.h("div", { class: "eyebrow", text: "Pick a story" }));
    if (chosen) {
      const back = UI.h("button", { class: "btn btn-sm", type: "button" }, "Back to today");
      back.addEventListener("click", function () {
        st.pickId = null;
        SFX.tap();
        Router.refresh();
      });
      head.appendChild(back);
    }

    root.appendChild(
      UI.h(
        "div",
        { class: "bg-trail" },
        head,
        UI.h(
          "div",
          { class: "bg-trail-row" },
          STORIES.map(function (s) {
            const isNow = s.id === story.id;
            const isToday = s.id === today.id;
            const isNext = s.id === tomorrow.id;
            const stop = UI.h(
              "button",
              {
                class: "bg-trail-stop" + (isNow ? " is-now" : "") + (isToday ? " is-today" : ""),
                type: "button",
                title: s.name,
                "aria-label": s.name,
              },
              UI.h("span", { class: "bg-trail-icon", text: s.icon }),
              UI.h("span", { class: "bg-trail-tag", text: isToday ? "Today" : isNext ? "Next" : s.name.split(" ")[0] })
            );
            stop.addEventListener("click", function () {
              st.pickId = isToday ? null : s.id;
              SFX.tap();
              Router.refresh();
            });
            return stop;
          })
        )
      )
    );
  }

  /* Soft scenery behind the board — clouds, waves, hills — as text so it
     costs nothing and matches the tiles. Used until three.js arrives. */
  function sceneBits(sky) {
    const bits = {
      day: ["☁️", "☁️", "\u{1F33F}", "\u{1F33C}", "\u{1F33F}"],
      rain: ["\u{1F327}️", "☁️", "\u{1F4A7}", "\u{1F4A7}", "\u{1F30A}"],
      sea: ["\u{1F30A}", "\u{1F30A}", "\u{1F41F}", "\u{1F30A}", "\u{1F41A}"],
      meadow: ["\u{1F33C}", "\u{1F33F}", "\u{1F98B}", "\u{1F33C}", "\u{1F33F}"],
      night: ["⭐", "\u{1F319}", "⭐", "✨", "⭐"],
    }[sky] || [];
    return bits.map(function (g, i) {
      const s = UI.h("span", { class: "bg-scene-bit", text: g });
      s.style.setProperty("--i", String(i));
      return s;
    });
  }

  function renderPrompt(round) {
    const rs = roundState();
    const text = round.type === "missing" && rs.peeked ? round.prompt2 : round.prompt;
    const btn = UI.h("button", { class: "ibtn bg-say", type: "button", "aria-label": "Say it again" }, UI.icon("sound"));
    btn.addEventListener("click", function () { say(text); });
    return UI.h(
      "div",
      { class: "bg-prompt" },
      UI.h("div", { class: "bg-prompt-row" }, UI.h("p", { class: "bg-prompt-text", text: text }), btn)
    );
  }

  function renderProgress() {
    const st = S();
    const dots = UI.h(
      "div",
      { class: "bg-progress", "aria-label": "Round " + (st.idx + 1) + " of " + st.rounds.length },
      st.rounds.map(function (rd, i) {
        const on = i < st.idx ? "done" : i === st.idx ? "now" : "";
        return UI.h(
          "span",
          { class: "bg-dot" + (rd.type === "truth" ? " is-truth" : ""), "data-on": on },
          on === "done" ? UI.icon("check") : null
        );
      })
    );
    if (st.mode !== "journey") return dots;
    return UI.h(
      "div",
      { class: "bg-progress-wrap" },
      UI.h("div", { class: "tiny muted", text: "Part " + (chapterOf(st.idx) + 1) + " of " + JOURNEY_CHAPTERS }),
      dots
    );
  }

  function hintCls(rs, isTarget) {
    return rs.hint && isTarget && !rs.solved ? " bg-hint" : "";
  }
  function deadCls(rs, key) {
    return rs.dead.indexOf(key) >= 0 ? " bg-dead" : "";
  }

  /* One tap, one right answer: pick, find and odd-one-out all share this. */
  function renderChoiceBoard(round, answer, cols) {
    const rs = roundState();
    return UI.h(
      "div",
      { class: "bg-grid bg-grid-" + cols },
      round.tiles.map(function (g, i) {
        const key = "t" + i;
        const isAns = g === answer;
        const dead = rs.dead.indexOf(key) >= 0;
        return tile(g, {
          index: i,
          cls: (rs.solved && isAns ? "bg-hit" : rs.wrong === key ? "bg-miss" : "") + deadCls(rs, key) + hintCls(rs, isAns),
          disabled: rs.solved || dead,
          onTap: function (el) {
            if (isAns) good(el);
            else miss(key);
          },
        });
      })
    );
  }

  function renderTapAll(round) {
    const rs = roundState();
    const need = round.count;
    let hinted = false;
    return UI.h(
      "div",
      { class: "bg-stack" },
      UI.h(
        "div",
        { class: "bg-counter" },
        UI.h("span", { class: "nums", text: String(rs.done.length) }),
        UI.h("span", { class: "bg-counter-of", text: " of " + need })
      ),
      UI.h(
        "div",
        { class: "bg-grid bg-grid-3" },
        round.tiles.map(function (g, i) {
          const key = "t" + i;
          const gone = rs.done.indexOf(key) >= 0;
          const isTarget = g === round.target && !gone;
          const showHint = isTarget && !hinted;
          if (showHint) hinted = true;
          return tile(g, {
            index: i,
            cls: (gone ? "bg-gone" : rs.wrong === key ? "bg-miss" : "") + deadCls(rs, key) + hintCls(rs, showHint),
            disabled: gone || rs.solved || rs.dead.indexOf(key) >= 0,
            onTap: function (el) {
              if (g !== round.target) return miss(key);
              SFX.tap();
              armHint();
              burst(el, ["✨"]);
              rs.done.push(key);
              rs.hint = false;
              if (rs.done.length >= need) good(null);
              else Router.refresh();
            },
          });
        })
      )
    );
  }

  function renderCount(round) {
    const rs = roundState();
    let hinted = false;
    return UI.h(
      "div",
      { class: "bg-stack" },
      UI.h("div", { class: "bg-bignum nums", text: String(rs.count) }),
      UI.h(
        "div",
        { class: "bg-grid bg-grid-3" },
        round.tiles.map(function (g, i) {
          const key = "t" + i;
          const gone = rs.done.indexOf(key) >= 0;
          const showHint = !gone && !hinted;
          if (showHint) hinted = true;
          return tile(g, {
            index: i,
            cls: (gone ? "bg-counted" : "") + hintCls(rs, showHint),
            disabled: gone || rs.solved,
            onTap: function (el) {
              rs.done.push(key);
              rs.count++;
              rs.hint = false;
              armHint();
              tone(440 + rs.count * 60, 110, "sine", 0, 0.12);
              burst(el, ["✨"]);
              say(numberWord(rs.count));
              if (rs.count >= round.n) good(null);
              else Router.refresh();
            },
          });
        })
      )
    );
  }

  function firstDown(round, rs) {
    for (let i = 0; i < round.tiles.length; i++) {
      if (rs.done.indexOf("t" + i) < 0) return i;
    }
    return -1;
  }

  function renderPairs(round) {
    const rs = roundState();
    const hintAt = rs.picked.length === 0 ? firstDown(round, rs) : -1;
    return UI.h(
      "div",
      { class: "bg-grid bg-grid-" + (round.tiles.length > 6 ? "4" : "3") },
      round.tiles.map(function (g, i) {
        const key = "t" + i;
        const matched = rs.done.indexOf(key) >= 0;
        const faceUp = matched || rs.picked.indexOf(key) >= 0;
        return tile(g, {
          index: i,
          hidden: !faceUp,
          label: faceUp ? nameOf(g) || g : "Hidden card",
          cls: (matched ? "bg-hit" : faceUp ? "bg-up" : "bg-down") + hintCls(rs, i === hintAt),
          disabled: matched || rs.solved || rs.picked.length >= 2,
          onTap: function () {
            if (rs.picked.indexOf(key) >= 0) return;
            SFX.flip();
            armHint();
            rs.hint = false;
            rs.picked.push(key);
            Router.refresh();
            if (rs.picked.length === 2) {
              const a = rs.picked[0], b = rs.picked[1];
              const ga = round.tiles[Number(a.slice(1))], gb = round.tiles[Number(b.slice(1))];
              setTimeout(function () {
                const r2 = roundState();
                if (ga === gb) {
                  r2.done.push(a, b);
                  r2.picked = [];
                  if (r2.done.length >= round.tiles.length) return good(null);
                  SFX.good();
                  say(nameOf(ga) ? "Two " + plural(ga) + "!" : "A pair!");
                } else {
                  SFX.miss();
                  r2.picked = [];
                  S().clean = false;
                }
                Router.refresh();
              }, 760);
            }
          },
        });
      })
    );
  }

  function renderSort(round) {
    const rs = roundState();
    const labels = round.labels || { sea: "Sea \u{1F30A}", land: "Land \u{1F333}" };
    const answer = round.answer;
    return UI.h(
      "div",
      { class: "bg-stack" },
      UI.h("div", { class: "bg-sort-item" + (rs.solved ? " bg-sort-go" : ""), text: round.item, "data-to": answer }),
      UI.h(
        "div",
        { class: "bg-grid bg-grid-2" },
        ["sea", "land"].map(function (k, i) {
          const b = UI.h(
            "button",
            {
              class: "bg-tile bg-choice" + (rs.solved && k === answer ? " bg-hit" : rs.wrong === k ? " bg-miss" : "") + hintCls(rs, k === answer),
              type: "button",
              disabled: rs.solved ? true : null,
            },
            UI.h("span", { class: "bg-choice-text", text: labels[k] })
          );
          b.style.setProperty("--i", String(i));
          b.addEventListener("click", function (ev) {
            if (k === answer) good(ev.currentTarget);
            else miss(k);
          });
          return b;
        })
      )
    );
  }

  /* ---- the thinking rounds ---- */

  /* Smallest to biggest, in order. A wrong tap starts the run again, so
     she has to hold the whole sequence in her head. */
  function renderOrder(round) {
    const rs = roundState();
    const nextWanted = round.seq[rs.done.length];
    return UI.h(
      "div",
      { class: "bg-stack" },
      UI.h(
        "div",
        { class: "bg-ladder", "aria-hidden": "true" },
        round.seq.map(function (g, i) {
          const filled = i < rs.done.length;
          return UI.h("span", { class: "bg-rung" + (filled ? " is-on" : "") }, UI.h("span", { class: "bg-rung-glyph", text: filled ? rs.done[i] : String(i + 1) }));
        })
      ),
      UI.h(
        "div",
        { class: "bg-grid bg-grid-3" },
        round.tiles.map(function (g, i) {
          const key = "t" + i;
          const used = rs.done.indexOf(g) >= 0;
          return tile(g, {
            index: i,
            cls: (used ? "bg-counted" : rs.wrong === key ? "bg-miss" : "") + hintCls(rs, g === nextWanted),
            disabled: used || rs.solved,
            onTap: function (el) {
              if (g !== nextWanted) {
                rs.done = [];
                return miss(key);
              }
              rs.done.push(g);
              rs.hint = false;
              armHint();
              tone(440 + rs.done.length * 110, 120, "sine", 0, 0.12);
              burst(el, ["✨"]);
              if (rs.done.length >= round.seq.length) good(null);
              else {
                say(nameOf(g));
                Router.refresh();
              }
            },
          });
        })
      )
    );
  }

  /* Which side has more? Two clusters, one tap. */
  function renderMore(round) {
    const rs = roundState();
    function side(which, n) {
      const cluster = [];
      for (let i = 0; i < n; i++) cluster.push(UI.h("span", { class: "bg-many-glyph", text: round.glyph }));
      const b = UI.h(
        "button",
        {
          class: "bg-tile bg-many" +
            (rs.solved && which === round.answer ? " bg-hit" : rs.wrong === which ? " bg-miss" : "") +
            deadCls(rs, which) + hintCls(rs, which === round.answer),
          type: "button",
          disabled: rs.solved || rs.dead.indexOf(which) >= 0 ? true : null,
          "aria-label": n + " " + plural(round.glyph),
        },
        UI.h("span", { class: "bg-many-wrap" }, cluster)
      );
      b.addEventListener("click", function (ev) {
        if (which === round.answer) good(ev.currentTarget);
        else miss(which);
      });
      return b;
    }
    return UI.h("div", { class: "bg-grid bg-grid-2" }, side("left", round.left), side("right", round.right));
  }

  /* Look, then remember. The board is shown, then one tile hides. */
  function renderMissing(round) {
    const rs = roundState();
    if (!rs.peeked) {
      armPeek(round);
      return UI.h(
        "div",
        { class: "bg-stack" },
        UI.h(
          "div",
          { class: "bg-grid bg-grid-3 bg-peeking" },
          round.tiles.map(function (g, i) {
            return tile(g, { index: i, disabled: true });
          })
        )
      );
    }
    return UI.h(
      "div",
      { class: "bg-stack" },
      UI.h(
        "div",
        { class: "bg-grid bg-grid-3" },
        round.tiles.map(function (g, i) {
          const isHidden = i === round.hideAt;
          return tile(g, {
            index: i,
            hidden: isHidden && !rs.solved,
            label: isHidden ? "The hidden one" : nameOf(g),
            cls: isHidden ? (rs.solved ? "bg-hit" : "bg-down bg-hole") : "bg-quiet",
            disabled: true,
          });
        })
      ),
      UI.h("div", { class: "bg-choices" },
        round.choices.map(function (g, i) {
          const key = "c" + i;
          const dead = rs.dead.indexOf(key) >= 0;
          return tile(g, {
            index: i,
            cls: "bg-answer" + (rs.solved && g === round.answer ? " bg-hit" : rs.wrong === key ? " bg-miss" : "") + deadCls(rs, key) + hintCls(rs, g === round.answer),
            disabled: rs.solved || dead,
            onTap: function (el) {
              if (g === round.answer) good(el);
              else miss(key);
            },
          });
        })
      )
    );
  }

  /* The catechism round. Big soft answers, each with its picture, and the
     truth said back the moment she gets it right. */
  function renderTruth(round) {
    const rs = roundState();

    if (rs.teaching) {
      const card = UI.h(
        "div",
        { class: "bg-teach" },
        UI.h("div", { class: "bg-teach-mark", text: "✝️" }),
        UI.h("p", { class: "bg-teach-text", text: round.teach }),
        round.ref ? UI.h("div", { class: "word-ref", text: round.ref }) : null,
        UI.h("button", { class: "btn btn-primary btn-block bg-teach-go", type: "button" }, "Amen")
      );
      card.querySelector(".bg-teach-go").addEventListener("click", function () {
        clearTimeout(teachTimer);
        teachTimer = null;
        advance();
      });
      return card;
    }

    return UI.h(
      "div",
      { class: "bg-answers" },
      round.options.map(function (o, i) {
        const key = "o" + i;
        const dead = rs.dead.indexOf(key) >= 0;
        const b = UI.h(
          "button",
          {
            class: "bg-tile bg-truth" +
              (rs.solved && o.ok ? " bg-hit" : rs.wrong === key ? " bg-miss" : "") +
              deadCls(rs, key) + hintCls(rs, o.ok),
            type: "button",
            disabled: rs.solved || dead ? true : null,
          },
          UI.h("span", { class: "bg-truth-glyph", text: o.glyph }),
          UI.h("span", { class: "bg-truth-text", text: o.text })
        );
        b.style.setProperty("--i", String(i));
        b.addEventListener("click", function (ev) {
          if (o.ok) good(ev.currentTarget);
          else miss(key);
        });
        return b;
      })
    );
  }

  function renderBoard(round) {
    if (round.type === "truth") return renderTruth(round);
    if (round.type === "pick") return renderChoiceBoard(round, round.answer, round.tiles.length > 4 ? 3 : 2);
    if (round.type === "oddone") return renderChoiceBoard(round, round.answer, 2);
    if (round.type === "find") return renderChoiceBoard(round, round.target, round.tiles.length > 9 ? 4 : 3);
    if (round.type === "tapall") return renderTapAll(round);
    if (round.type === "count") return renderCount(round);
    if (round.type === "pairs") return renderPairs(round);
    if (round.type === "order") return renderOrder(round);
    if (round.type === "more") return renderMore(round);
    if (round.type === "missing") return renderMissing(round);
    return renderSort(round);
  }

  function renderPlay(root) {
    const st = S();
    const round = currentRound();
    if (!round) {
      st.phase = "kid";
      return renderKidPicker(root);
    }
    const quit = UI.h("button", { class: "ibtn", type: "button", "aria-label": "Stop playing", title: "Stop playing" }, UI.icon("x"));
    quit.addEventListener("click", function () {
      st.phase = "kid";
      st.roundState = null;
      clearTimers();
      hush();
      Router.refresh();
    });

    root.appendChild(
      UI.h(
        "div",
        { class: "bg-top" },
        UI.h(
          "div",
          { class: "bg-who" },
          UI.h("span", { class: "bg-story-icon", text: st.story.icon }),
          UI.h("span", { text: st.story.name + (st.kid ? " · " + st.kid : "") })
        ),
        UI.h("div", { class: "bg-top-actions" }, muteButton(), quit)
      )
    );
    root.appendChild(renderProgress());

    const card = UI.h(
      "div",
      { class: "card bg-board bg-sky" + (st.enter ? " bg-enter" : ""), "data-sky": st.story.sky },
      UI.h("div", { class: "bg-scene", "aria-hidden": "true" }, sceneBits(st.story.sky)),
      renderPrompt(round),
      renderBoard(round)
    );
    st.enter = false;
    root.appendChild(card);
    Backdrop.attach(card, st.story.sky);
  }

  function renderDone(root) {
    const st = S();
    const tomorrow = tomorrowStory(new Date());

    const again = UI.h("button", { class: "btn btn-primary btn-block bg-big-btn", type: "button" }, "Play again");
    again.addEventListener("click", function () { startGame(st.kid, st.level, true, st.mode); });

    /* What the questions taught, so it can be read back at bedtime. */
    const learned = (st.rounds || []).filter(function (r) { return r.type === "truth"; });
    const other = UI.h("button", { class: "btn btn-block", type: "button" }, "All done");
    other.addEventListener("click", function () { st.phase = "kid"; hush(); Router.refresh(); });
    const read = UI.h("button", { class: "btn btn-sm", type: "button" }, UI.icon("sound"), "Read the verse");
    read.addEventListener("click", function () { say(st.story.verse + ". " + st.story.ref); });

    const confetti = ["⭐", "✨", "\u{1F31F}", "\u{1F49B}", "⭐", "✨", "\u{1F31F}", "\u{1F49B}", "⭐", "✨", "\u{1F31F}", "\u{1F49B}"];
    const done = UI.h(
      "div",
      { class: "card bg-done bg-sky", "data-sky": st.story.sky },
      UI.h("div", { class: "bg-confetti", "aria-hidden": "true" }, confetti.map(function (g, i) {
        return UI.h("span", {
          class: "bg-conf",
          text: g,
          style: { left: (4 + i * 8) + "%", animationDelay: (i * 0.09) + "s", animationDuration: (2.2 + (i % 3) * 0.4) + "s" },
        });
      })),
      UI.h("div", { class: "bg-done-icon", text: st.story.icon }),
      UI.h("div", { class: "bg-done-title", text: "You did it" + (st.kid ? ", " + st.kid : "") + "!" }),
      st.clean ? UI.h("div", { class: "bg-perfect" }, UI.h("span", { text: "✨" }), UI.h("span", { text: "Every one, first try" })) : null,
      st.mode === "journey" ? UI.h("div", { class: "bg-perfect bg-journey-badge" }, UI.h("span", { text: "\u{1F5FA}️" }), UI.h("span", { text: "The whole journey" })) : null,
      UI.h("p", { class: "bg-done-verse", text: "“" + st.story.verse + "”" }),
      UI.h("div", { class: "word-ref", text: st.story.ref + " (KJV)" }),
      read,
      learned.length
        ? UI.h(
            "div",
            { class: "bg-learned" },
            UI.h("div", { class: "eyebrow", text: learned.length > 1 ? "What we learned" : "What we learned today" }),
            learned.map(function (t) {
              const row = UI.h(
                "button",
                { class: "bg-learned-row", type: "button", "aria-label": "Read again: " + t.teach },
                UI.h("span", { class: "bg-learned-text", text: t.teach }),
                t.ref ? UI.h("span", { class: "bg-learned-ref", text: t.ref }) : null
              );
              row.addEventListener("click", function () { say(t.teach); });
              return row;
            })
          )
        : null,
      UI.h("div", { class: "stack bg-done-actions" }, again, other),
      UI.h("div", { class: "bg-tomorrow" }, UI.h("span", { text: tomorrow.icon }), UI.h("span", { text: "Tomorrow: " + tomorrow.name }))
    );
    root.appendChild(done);
    Backdrop.attach(done, "party");
  }

  /* The story, between the chapters of a Journey. */
  function renderChapter(root) {
    const st = S();
    const n = st.chapter + 1;

    const go = UI.h(
      "button",
      { class: "btn btn-primary btn-block bg-big-btn", type: "button" },
      n < JOURNEY_CHAPTERS ? "Keep going" : "Last part!"
    );
    go.addEventListener("click", beginChapter);

    const again = UI.h("button", { class: "ibtn", type: "button", "aria-label": "Say it again" }, UI.icon("sound"));
    again.addEventListener("click", function () { say(chapterText(st)); });

    const quit = UI.h("button", { class: "ibtn", type: "button", "aria-label": "Stop playing" }, UI.icon("x"));
    quit.addEventListener("click", function () {
      st.phase = "kid";
      clearTimers();
      hush();
      Router.refresh();
    });

    root.appendChild(
      UI.h(
        "div",
        { class: "bg-top" },
        UI.h(
          "div",
          { class: "bg-who" },
          UI.h("span", { class: "bg-story-icon", text: st.story.icon }),
          UI.h("span", { text: st.story.name + (st.kid ? " · " + st.kid : "") })
        ),
        UI.h("div", { class: "bg-top-actions" }, muteButton(), quit)
      )
    );

    const card = UI.h(
      "div",
      { class: "card bg-chapter bg-sky bg-enter", "data-sky": st.story.sky },
      UI.h("div", { class: "bg-scene", "aria-hidden": "true" }, sceneBits(st.story.sky)),
      UI.h(
        "div",
        { class: "bg-chapter-head" },
        UI.h("div", { class: "eyebrow", text: "Part " + n + " of " + JOURNEY_CHAPTERS }),
        again
      ),
      UI.h("div", { class: "bg-chapter-icon", text: st.story.icon }),
      UI.h("p", { class: "bg-chapter-text", text: chapterText(st) }),
      UI.h(
        "div",
        { class: "bg-chapter-pips", "aria-hidden": "true" },
        [0, 1, 2].map(function (i) {
          return UI.h("span", { class: "bg-pip" + (i <= st.chapter ? " is-on" : "") });
        })
      ),
      go
    );
    root.appendChild(card);
    Backdrop.attach(card, st.story.sky);
  }

  function renderBible(root) {
    root.classList.add("bg-view");
    Backdrop.load();
    const st = S();
    if (st.phase === "chapter") return renderChapter(root);
    if (st.phase === "play") return renderPlay(root);
    if (st.phase === "done") return renderDone(root);
    return renderKidPicker(root);
  }

  Router.on("bible", renderBible);

  return {
    storyForDay: storyForDay,
    stories: STORIES,
    levels: LEVELS,
    chooseRounds: chooseRounds,
    rng: rng,
    hashStr: hashStr,
  };
})();
