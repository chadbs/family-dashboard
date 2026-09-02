// Almanac -- sun times, Michigan seasonal produce, house tips, birthdays, moon phase.
// Location is fixed: Hudsonville, Michigan. lat 42.8717, lon -85.8639, America/Detroit.
// Pure functions only. No Date.now() inside computations -- always use the passed date.
// Plain top-level const, no IIFE, no export -- the build concatenates all src files
// into one script scope, so helper names below are prefixed to avoid collisions.

const ALMANAC_LAT = 42.8717;
const ALMANAC_LON = -85.8639; // degrees East; negative = West of Greenwich

// ---------------------------------------------------------------------
// small math helpers
// ---------------------------------------------------------------------

function almanacRad(d) { return d * Math.PI / 180; }
function almanacDeg(r) { return r * 180 / Math.PI; }

function almanacNormDate(date) {
  return (date instanceof Date && !isNaN(date.getTime())) ? date : new Date();
}

// ---------------------------------------------------------------------
// sunTimes -- NOAA solar position algorithm (matches the NOAA Solar
// Calculator spreadsheet, https://gml.noaa.gov/grad/solcalc/). Steps:
//
//   1. Julian Day for the calendar date (evaluated at 12:00 UTC -- the
//      declination/equation-of-time change so slowly over a day that
//      using noon instead of the true sunrise/sunset moment costs well
//      under a minute of accuracy).
//   2. Julian Century from J2000.0.
//   3. Geometric mean longitude and mean anomaly of the sun.
//   4. Eccentricity of Earth's orbit.
//   5. Sun's equation of center -> true longitude -> apparent longitude.
//   6. Mean obliquity of the ecliptic, corrected for nutation.
//   7. Solar declination from apparent longitude + obliquity correction.
//   8. Equation of time (minutes) -- clock time vs. sundial time.
//   9. Hour angle for a solar zenith of 90.833 degrees (90deg for the
//      horizon, +50 arcmin for atmospheric refraction, +16 arcmin for
//      the sun's disc radius -- the standard "sunrise/sunset" zenith).
//  10. Solar noon and sunrise/sunset, all expressed directly in minutes
//      from UTC midnight (longitude does all the work here -- no
//      timezone/DST table needed). Converted to a real UTC instant, so
//      the browser's own local-time rendering handles DST correctly.
//
// Cross-check against NOAA's published Grand Rapids-area figures:
//   Jun 21 -> sunrise ~6:02am / sunset ~9:24pm EDT
//   Dec 21 -> sunrise ~8:11am / sunset ~5:15pm EST
// ---------------------------------------------------------------------

function almanacJulianDay(y, m, d) {
  // m is 1-12. Evaluate at 12:00 UTC of the given calendar date.
  const utcNoonMs = Date.UTC(y, m - 1, d, 12, 0, 0);
  return utcNoonMs / 86400000 + 2440587.5; // Unix epoch -> Julian Day
}

function almanacSolarCalc(y, m, d) {
  const JD = almanacJulianDay(y, m, d);
  const T = (JD - 2451545.0) / 36525.0; // Julian century from J2000.0

  // Geometric mean longitude of the sun (deg), 0-360
  let geomMeanLong = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
  if (geomMeanLong < 0) geomMeanLong += 360;

  // Geometric mean anomaly of the sun (deg)
  const geomMeanAnom = 357.52911 + T * (35999.05029 - 0.0001537 * T);

  // Eccentricity of Earth's orbit
  const eccent = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);

  // Sun's equation of center (deg)
  const Mrad = almanacRad(geomMeanAnom);
  const eqOfCtr =
    Math.sin(Mrad) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * Mrad) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * Mrad) * 0.000289;

  // True and apparent longitude of the sun (deg)
  const trueLong = geomMeanLong + eqOfCtr;
  const omega = 125.04 - 1934.136 * T;
  const appLong = trueLong - 0.00569 - 0.00478 * Math.sin(almanacRad(omega));

  // Mean obliquity of the ecliptic (deg), then corrected for nutation
  const meanObliq =
    23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const obliqCorr = meanObliq + 0.00256 * Math.cos(almanacRad(omega));

  // Solar declination (deg)
  const declin = almanacDeg(Math.asin(Math.sin(almanacRad(obliqCorr)) * Math.sin(almanacRad(appLong))));

  // Equation of time (minutes)
  const y2 = Math.pow(Math.tan(almanacRad(obliqCorr / 2)), 2);
  const geomMeanLongRad = almanacRad(geomMeanLong);
  const eqOfTime = 4 * almanacDeg(
    y2 * Math.sin(2 * geomMeanLongRad) -
    2 * eccent * Math.sin(Mrad) +
    4 * eccent * y2 * Math.sin(Mrad) * Math.cos(2 * geomMeanLongRad) -
    0.5 * y2 * y2 * Math.sin(4 * geomMeanLongRad) -
    1.25 * eccent * eccent * Math.sin(2 * Mrad)
  );

  // Hour angle for sunrise/sunset at zenith 90.833 deg
  const zenith = 90.833;
  const latRad = almanacRad(ALMANAC_LAT);
  const declinRad = almanacRad(declin);
  let haCos = Math.cos(almanacRad(zenith)) / (Math.cos(latRad) * Math.cos(declinRad)) -
    Math.tan(latRad) * Math.tan(declinRad);
  haCos = Math.max(-1, Math.min(1, haCos)); // clamp for polar edge cases
  const haSunrise = almanacDeg(Math.acos(haCos));

  // Solar noon and sunrise/sunset, in minutes from UTC midnight.
  const solarNoonUTC = 720 - 4 * ALMANAC_LON - eqOfTime;
  const sunriseUTC = solarNoonUTC - 4 * haSunrise;
  const sunsetUTC = solarNoonUTC + 4 * haSunrise;

  return { solarNoonUTC: solarNoonUTC, sunriseUTC: sunriseUTC, sunsetUTC: sunsetUTC };
}

function almanacMinutesToDate(y, m, d, minutesFromUtcMidnight) {
  const baseUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0);
  return new Date(baseUtcMs + Math.round(minutesFromUtcMidnight * 60000));
}

function almanacFormatDayLength(sunrise, sunset) {
  const totalMin = Math.round((sunset.getTime() - sunrise.getTime()) / 60000);
  const h = Math.floor(totalMin / 60);
  const mnt = totalMin % 60;
  return h + "h " + mnt + "m";
}

// ---------------------------------------------------------------------
// inSeason -- what's actually being harvested in Michigan, by month
// ---------------------------------------------------------------------

const ALMANAC_IN_SEASON = {
  1: [ // January -- storage crops + greenhouse
    { name: "Storage apples", emoji: "\u{1F34E}", note: "Look for Honeycrisp and Ida Red still crisp from cold storage." },
    { name: "Potatoes", emoji: "\u{1F954}", note: "Michigan-grown russets and reds are in root cellars now -- good keepers for roasting." },
    { name: "Onions", emoji: "\u{1F9C5}", note: "Storage onions from fall harvest; firm and papery-skinned is what you want." },
    { name: "Cabbage", emoji: "\u{1F96C}", note: "Great for slow-cooked soups; keeps for weeks in the crisper." },
    { name: "Winter squash", emoji: "\u{1F383}", note: "Butternut and acorn squash from fall storage, still sweet." },
    { name: "Greenhouse greens", emoji: "\u{1F96C}", note: "Local hoophouse spinach and lettuce start showing up at winter markets." }
  ],
  2: [ // February -- storage + maple syrup starts
    { name: "Storage apples", emoji: "\u{1F34E}", note: "Getting toward the end of the good ones -- use them up in baking." },
    { name: "Maple syrup", emoji: "\u{1F341}", note: "Sap starts running on freeze-thaw days late this month -- watch the sugar shacks open." },
    { name: "Potatoes & onions", emoji: "\u{1F954}", note: "Still the reliable root-cellar staples for weeknight dinners." },
    { name: "Winter squash", emoji: "\u{1F383}", note: "Last of the storage squash -- roast it before it starts to soften." },
    { name: "Greenhouse greens", emoji: "\u{1F96C}", note: "Hoophouse lettuce and spinach fill the gap before field greens return." }
  ],
  3: [ // March -- maple syrup peak, early greens
    { name: "Maple syrup", emoji: "\u{1F341}", note: "Peak tapping season -- fresh Michigan syrup shows up at farm stands." },
    { name: "Storage apples", emoji: "\u{1F34E}", note: "Last call for cellar apples before this year's crop is long gone." },
    { name: "Hoophouse spinach", emoji: "\u{1F96C}", note: "Cold-hardy spinach is one of the first fresh greens of the year." },
    { name: "Microgreens", emoji: "\u{1F331}", note: "Local greenhouse growers have trays of pea shoots and radish greens." }
  ],
  4: [ // April -- asparagus begins, rhubarb
    { name: "Asparagus", emoji: "\u{1F33F}", note: "Early spears start showing up late in the month -- Michigan is a top producer." },
    { name: "Rhubarb", emoji: "\u{1F338}", note: "First stalks are ready; pair with strawberries once those arrive in June." },
    { name: "Radishes", emoji: "\u{1F345}", note: "Quick-growing and peppery -- good in a spring salad." },
    { name: "Spinach & lettuce", emoji: "\u{1F96C}", note: "Cool-weather greens are back in the field, not just the hoophouse." }
  ],
  5: [ // May -- asparagus peak, strawberries begin
    { name: "Asparagus", emoji: "\u{1F33F}", note: "Peak season -- look for firm, tight tips at the farm stand." },
    { name: "Rhubarb", emoji: "\u{1F338}", note: "Still going strong; freezes well if you cut more than you can use." },
    { name: "Strawberries", emoji: "\u{1F353}", note: "U-pick fields start opening late in the month in West Michigan." },
    { name: "Lettuce & spinach", emoji: "\u{1F96C}", note: "Field-grown greens are at their best before summer heat makes them bitter." }
  ],
  6: [ // June -- strawberries peak, sweet cherries, early raspberries
    { name: "Strawberries", emoji: "\u{1F353}", note: "Peak U-pick season -- freeze extra for smoothies and jam." },
    { name: "Sweet cherries", emoji: "\u{1F352}", note: "Traverse City-area orchards start picking sweet cherries this month." },
    { name: "Peas", emoji: "\u{1FADB}", note: "Snap and snow peas are at their sweetest picked young." },
    { name: "Early raspberries", emoji: "\u{1F347}", note: "Summer-bearing varieties start coming in toward month's end." },
    { name: "Lettuce & spinach", emoji: "\u{1F96C}", note: "Last good month before the heat pushes them to bolt." }
  ],
  7: [ // July -- tart cherries peak, blueberries, sweet corn, peaches begin
    { name: "Tart cherries", emoji: "\u{1F352}", note: "Michigan grows most of the country's tart cherries -- peak harvest is now." },
    { name: "Blueberries", emoji: "\u{1FAD0}", note: "Michigan is a top blueberry state; U-pick season runs most of the month." },
    { name: "Sweet corn", emoji: "\u{1F33D}", note: "First local corn of the year -- buy it the day you plan to eat it." },
    { name: "Raspberries", emoji: "\u{1F347}", note: "Full swing for summer raspberries." },
    { name: "Green beans", emoji: "\u{1FAD8}", note: "Snap a bean in half -- it should break clean, not bend." },
    { name: "Peaches", emoji: "\u{1F351}", note: "Early Michigan peach varieties start ripening late this month." }
  ],
  8: [ // August -- blueberries peak, corn peak, peaches, tomatoes
    { name: "Blueberries", emoji: "\u{1FAD0}", note: "Peak volume -- a great month to freeze a few bags flat for winter." },
    { name: "Sweet corn", emoji: "\u{1F33D}", note: "Peak season; husk it right before cooking for the best flavor." },
    { name: "Peaches", emoji: "\u{1F351}", note: "West Michigan peaches hit their stride -- ripen on the counter, not the fridge." },
    { name: "Tomatoes", emoji: "\u{1F345}", note: "Field tomatoes finally taste like tomatoes -- stock up for sauce." },
    { name: "Green beans", emoji: "\u{1FAD8}", note: "Still coming on strong; good for a quick fridge-pickle batch." },
    { name: "Cantaloupe", emoji: "\u{1F348}", note: "Should smell sweet at the stem end when it's ripe." }
  ],
  9: [ // September -- apples begin, tomatoes, sweet corn tail end
    { name: "Apples", emoji: "\u{1F34E}", note: "Early varieties like Gala and Paula Red kick off orchard season." },
    { name: "Tomatoes", emoji: "\u{1F345}", note: "Last big push before frost -- good time to can or freeze extras." },
    { name: "Grapes", emoji: "\u{1F347}", note: "Concord grapes from West Michigan vineyards are ready this month." },
    { name: "Peppers", emoji: "\u{1FAD1}", note: "Bell and hot peppers hit peak flavor as nights cool." },
    { name: "Winter squash", emoji: "\u{1F383}", note: "Butternut and acorn squash start coming off the vine." },
    { name: "Late sweet corn", emoji: "\u{1F33D}", note: "Last of the season -- grab it before fields wrap up." }
  ],
  10: [ // October -- apples peak, pumpkins, squash
    { name: "Apples", emoji: "\u{1F34E}", note: "Peak orchard season -- Honeycrisp and Jonagold are at their best." },
    { name: "Apple cider", emoji: "\u{1F9C3}", note: "Fresh-pressed cider from local orchards -- unpasteurized versions keep refrigerated." },
    { name: "Pumpkins", emoji: "\u{1F383}", note: "Pick one with a solid stem still attached for the longest shelf life." },
    { name: "Winter squash", emoji: "\u{1F383}", note: "Butternut, acorn and delicata are all in full harvest." },
    { name: "Brussels sprouts", emoji: "\u{1F96C}", note: "A light frost actually sweetens them -- good sign, not a problem." }
  ],
  11: [ // November -- late apples, storage crops
    { name: "Apples", emoji: "\u{1F34E}", note: "Late-season varieties like Ida Red store well through winter." },
    { name: "Winter squash", emoji: "\u{1F383}", note: "Last of the harvest; cure a couple weeks before eating for the best sweetness." },
    { name: "Cabbage", emoji: "\u{1F96C}", note: "Cold-hardy and just harvested -- good for slaws and braises." },
    { name: "Brussels sprouts", emoji: "\u{1F96C}", note: "Peak flavor after a few frosty nights in the field." },
    { name: "Potatoes", emoji: "\u{1F954}", note: "Fresh-dug fall potatoes are going into storage now." }
  ],
  12: [ // December -- storage crops, greenhouse
    { name: "Storage apples", emoji: "\u{1F34E}", note: "Cold-stored orchard apples are still good for pies and snacking." },
    { name: "Potatoes", emoji: "\u{1F954}", note: "Root-cellar staple all winter -- keep them somewhere cool and dark." },
    { name: "Onions", emoji: "\u{1F9C5}", note: "Storage onions from the fall harvest, good through the winter." },
    { name: "Cabbage", emoji: "\u{1F96C}", note: "Keeps for weeks -- good for soups on the coldest nights." },
    { name: "Winter squash", emoji: "\u{1F383}", note: "Last of the season's squash, still sweet if cured well." },
    { name: "Greenhouse greens", emoji: "\u{1F96C}", note: "Local hoophouse growers keep lettuce and spinach coming through winter." }
  ]
};

// ---------------------------------------------------------------------
// tip -- 40 curated, actionable house tips, deterministic per calendar
// day. Seasonal tips carry a `months` array (1-12); when the current
// month has matching tips, the pick is drawn from that subset first, so
// month-appropriate tips surface instead of "blow out sprinklers" in
// April. Universal tips (no `months`) fill in the rest of the year.
// ---------------------------------------------------------------------

const ALMANAC_TIPS = [
  // -- home (year-round) --
  { text: "Swap the furnace filter -- a fresh one every 90 days keeps the system from working overtime.", tag: "home" },
  { text: "Test every smoke and CO detector button and swap batteries if one chirps.", tag: "home" },
  { text: "Wipe the washing machine door gasket dry after a load to keep the mildew smell out.", tag: "home" },
  { text: "Clean the lint trap AND the dryer vent hose -- lint buildup is a real fire risk.", tag: "home" },
  { text: "Wipe down light switches and doorknobs -- the most-touched spots in the house.", tag: "home" },
  { text: "Sweep the garage floor and toss anything sticky before it becomes a permanent stain.", tag: "home" },
  { text: "Flip and rotate mattresses twice a year to keep them wearing evenly.", tag: "home" },
  { text: "Vacuum under the couch cushions before crumbs turn into a bug problem.", tag: "home" },
  // -- kitchen (year-round) --
  { text: "Run a vinegar cycle through the coffee maker to clear hard-water scale.", tag: "kitchen" },
  { text: "Sharpen the kitchen knives -- a dull blade slips more than a sharp one.", tag: "kitchen" },
  { text: "Vacuum the refrigerator coils on the back or bottom so it doesn't run harder than it needs to.", tag: "kitchen" },
  { text: "Check the fridge and freezer with an actual thermometer -- 37F fridge, 0F freezer.", tag: "kitchen" },
  { text: "Run the garbage disposal with ice cubes and a little dish soap to clean the blades.", tag: "kitchen" },
  { text: "Check under the kitchen sink for slow drips -- a $2 gasket beats a soaked cabinet floor.", tag: "kitchen" },
  { text: "Empty and wipe out the junk drawer -- five minutes, and you'll find the missing scissors.", tag: "kitchen" },
  // -- kids (year-round) --
  { text: "Set up a rainy-day bin of board games and puzzles the kids can reach themselves.", tag: "kids" },
  { text: "Rotate the toy bin -- pack half away for a few weeks so it feels new when it comes back out.", tag: "kids" },
  { text: "Let the kids pick one shelf to reorganize their way -- ownership beats a forced clean.", tag: "kids" },
  { text: "Keep a step stool by the kitchen sink so little hands can help with dishes and hand-washing.", tag: "kids" },
  { text: "Refresh the art supply bin and clear out dried-up markers before someone gets frustrated.", tag: "kids" },
  // -- fall / winter-prep (Sep-Nov) --
  { text: "Blow out or shut off the outdoor sprinkler lines before the first hard freeze.", tag: "yard", months: [9, 10] },
  { text: "Disconnect and drain garden hoses, then shut the outdoor spigot's inside valve.", tag: "yard", months: [9, 10, 11] },
  { text: "Have the furnace serviced before the first cold snap, not during it.", tag: "home", months: [9, 10] },
  { text: "Clean gutters once the last leaves are down so spring melt has somewhere to go.", tag: "yard", months: [10, 11] },
  { text: "Bring in or cover the patio furniture and grill before the first snow flies.", tag: "yard", months: [10, 11] },
  { text: "Swap the storm windows down and check door sweeps for drafts.", tag: "home", months: [10, 11] },
  { text: "Check the snow blower starts before the first storm -- fresh gas, new spark plug if it's been a year.", tag: "yard", months: [11] },
  { text: "Rake the last leaves into the garden beds as mulch instead of bagging them at the curb.", tag: "yard", months: [10, 11] },
  { text: "Stock the pantry with a few storm-day meals -- power blips happen with the first ice.", tag: "kitchen", months: [11, 12] },
  // -- deep winter (Dec-Feb) --
  { text: "Reverse ceiling fans to clockwise on low -- it pushes warm air back down without a chill.", tag: "home", months: [11, 12, 1] },
  { text: "Keep the cabinet doors under the sink open on the coldest nights so the pipes stay warmer.", tag: "home", months: [12, 1, 2] },
  { text: "Let outdoor faucets drip on the worst subzero nights to keep the line from freezing solid.", tag: "yard", months: [12, 1, 2] },
  { text: "Sand the front steps and driveway ramp before the morning ice, not after someone slips.", tag: "yard", months: [12, 1, 2] },
  { text: "Check the sump pump pit for ice before a thaw -- a frozen discharge line backs water into the basement.", tag: "home", months: [1, 2, 3] },
  // -- spring (Mar-May) --
  { text: "Tap into the maple trees if the sap's running -- freezing nights and 40F days are the sign.", tag: "yard", months: [2, 3] },
  { text: "Pour a bucket of water into the sump pit to check the pump actually kicks on before spring melt.", tag: "home", months: [3, 4] },
  { text: "Turn the outdoor water back on and check hose bibs for a winter crack before using them.", tag: "yard", months: [4, 5] },
  { text: "Clean the grill grates and check the propane tank before the first cookout.", tag: "kitchen", months: [4, 5] },
  { text: "Edge the garden beds and top with fresh mulch before the weeds get a head start.", tag: "yard", months: [5] },
  // -- summer (Jun-Aug) --
  { text: "Check that the AC condenser fins are clear of grass clippings and cottonwood fluff.", tag: "home", months: [6, 7] },
  { text: "Water the garden early morning, not midday, so less evaporates before it reaches the roots.", tag: "yard", months: [6, 7, 8] },
  { text: "Freeze extra herbs in olive oil ice cubes while the garden is overflowing.", tag: "kitchen", months: [7, 8] },
  { text: "Check the deck or porch boards for splinters and re-stain any spot that's gone gray.", tag: "yard", months: [6, 7] },
  { text: "Run bikes and helmets through a quick check -- tire pressure, brakes -- before the season of daily rides.", tag: "kids", months: [5, 6] },
  { text: "Set up a shady water station outside so the kids drink more without being asked.", tag: "kids", months: [6, 7, 8] }
];

function almanacDateSerial(date) {
  // Monotonic-enough integer per calendar day; stable within a day,
  // changes every day, no timezone math involved.
  return date.getFullYear() * 372 + date.getMonth() * 31 + date.getDate();
}

// ---------------------------------------------------------------------
// nextBirthday -- fixed family table
// ---------------------------------------------------------------------

const ALMANAC_BIRTHDAYS = [
  { name: "Addison", born: { y: 2022, m: 3, d: 20 } },
  { name: "Sophie", born: { y: 2024, m: 7, d: 10 } }
];

function almanacLocalMidnight(y, m, d) {
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

// ---------------------------------------------------------------------
// moonPhase -- synodic-month approximation from a known new moon epoch
// ---------------------------------------------------------------------

const ALMANAC_SYNODIC_MONTH_DAYS = 29.530588853;
// A known new moon: 2000-01-06 18:14 UTC
const ALMANAC_KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

const ALMANAC_MOON_STAGES = [
  { name: "New moon", emoji: "\u{1F311}" },
  { name: "Waxing crescent", emoji: "\u{1F312}" },
  { name: "First quarter", emoji: "\u{1F313}" },
  { name: "Waxing gibbous", emoji: "\u{1F314}" },
  { name: "Full moon", emoji: "\u{1F315}" },
  { name: "Waning gibbous", emoji: "\u{1F316}" },
  { name: "Last quarter", emoji: "\u{1F317}" },
  { name: "Waning crescent", emoji: "\u{1F318}" }
];

// ---------------------------------------------------------------------
// The public API. Plain top-level const object -- no IIFE, no export.
// ---------------------------------------------------------------------

const Almanac = {

  sunTimes: function (date) {
    date = almanacNormDate(date);
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();

    const calc = almanacSolarCalc(y, m, d);
    const sunrise = almanacMinutesToDate(y, m, d, calc.sunriseUTC);
    const sunset = almanacMinutesToDate(y, m, d, calc.sunsetUTC);
    const solarNoon = almanacMinutesToDate(y, m, d, calc.solarNoonUTC);

    return {
      sunrise: sunrise,
      sunset: sunset,
      dayLength: almanacFormatDayLength(sunrise, sunset),
      solarNoon: solarNoon
    };
  },

  season: function (date) {
    date = almanacNormDate(date);
    const m = date.getMonth(); // 0-11
    if (m >= 2 && m <= 4) return "spring";   // Mar-May
    if (m >= 5 && m <= 7) return "summer";   // Jun-Aug
    if (m >= 8 && m <= 10) return "fall";    // Sep-Nov
    return "winter";                          // Dec-Feb
  },

  inSeason: function (date) {
    date = almanacNormDate(date);
    const m = date.getMonth() + 1;
    const list = ALMANAC_IN_SEASON[m] || ALMANAC_IN_SEASON[1];
    // return a shallow copy so callers can't mutate the source table
    return list.map(function (item) {
      return { name: item.name, emoji: item.emoji, note: item.note };
    });
  },

  tip: function (date) {
    date = almanacNormDate(date);
    const m = date.getMonth() + 1;
    const serial = almanacDateSerial(date);

    let pool = ALMANAC_TIPS.filter(function (t) { return t.months && t.months.indexOf(m) !== -1; });
    if (pool.length === 0) {
      pool = ALMANAC_TIPS.filter(function (t) { return !t.months; });
    }
    if (pool.length === 0) pool = ALMANAC_TIPS; // safety net, should never trigger

    let idx = serial % pool.length;
    if (idx < 0) idx += pool.length;
    const picked = pool[idx];
    return { text: picked.text, tag: picked.tag };
  },

  nextBirthday: function (date) {
    date = almanacNormDate(date);
    const today = almanacLocalMidnight(date.getFullYear(), date.getMonth() + 1, date.getDate());

    let best = null;
    ALMANAC_BIRTHDAYS.forEach(function (person) {
      let occYear = today.getFullYear();
      let occ = almanacLocalMidnight(occYear, person.born.m, person.born.d);
      if (occ.getTime() < today.getTime()) {
        occYear += 1;
        occ = almanacLocalMidnight(occYear, person.born.m, person.born.d);
      }
      const daysAway = Math.round((occ.getTime() - today.getTime()) / 86400000);
      const turning = occYear - person.born.y;
      if (best === null || daysAway < best.daysAway) {
        best = { name: person.name, date: occ, turning: turning, daysAway: daysAway };
      }
    });

    return best;
  },

  moonPhase: function (date) {
    date = almanacNormDate(date);
    const daysSince = (date.getTime() - ALMANAC_KNOWN_NEW_MOON_MS) / 86400000;
    let age = daysSince % ALMANAC_SYNODIC_MONTH_DAYS;
    if (age < 0) age += ALMANAC_SYNODIC_MONTH_DAYS;

    const fraction = age / ALMANAC_SYNODIC_MONTH_DAYS; // 0 = new, 0.5 = full, 1 = new again
    const illum = (1 - Math.cos(2 * Math.PI * fraction)) / 2;

    const stageWidth = ALMANAC_SYNODIC_MONTH_DAYS / 8;
    let stageIdx = Math.floor((age + stageWidth / 2) / stageWidth) % 8;
    if (stageIdx < 0) stageIdx += 8;
    const stage = ALMANAC_MOON_STAGES[stageIdx];

    return { name: stage.name, emoji: stage.emoji, illum: illum };
  }

};
