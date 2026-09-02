/* ============================================================
   Weather — the backyard sensor first, the forecast behind it.

   Two ways the numbers arrive:

   * Served from the family's own dashboard server (the normal case), the
     page asks /api/hub/weather, which reads the AcuRite sensor's own
     data/weather.json and adds the Open-Meteo forecast. That is the real
     backyard temperature, the same number the wall shows.

   * Published as a Claude artifact, the page cannot make network calls at
     all, so it falls back to whatever was last written into the store's
     weather document, and says how old that is.

   Either way the card renders or quietly disappears — it never blocks the
   rest of the screen.
   ============================================================ */

const Weather = (function () {
  let live = null;
  let tried = false;

  /* WMO weather codes, as Open-Meteo reports them. */
  const CODES = {
    0: ["Clear", "☀️"],
    1: ["Mostly clear", "🌤️"],
    2: ["Partly cloudy", "⛅"],
    3: ["Overcast", "☁️"],
    45: ["Fog", "🌫️"],
    48: ["Freezing fog", "🌫️"],
    51: ["Light drizzle", "🌦️"],
    53: ["Drizzle", "🌦️"],
    55: ["Heavy drizzle", "🌧️"],
    56: ["Freezing drizzle", "🌧️"],
    57: ["Freezing drizzle", "🌧️"],
    61: ["Light rain", "🌦️"],
    63: ["Rain", "🌧️"],
    65: ["Heavy rain", "🌧️"],
    66: ["Freezing rain", "🌧️"],
    67: ["Freezing rain", "🌧️"],
    71: ["Light snow", "🌨️"],
    73: ["Snow", "🌨️"],
    75: ["Heavy snow", "❄️"],
    77: ["Snow grains", "🌨️"],
    80: ["Showers", "🌦️"],
    81: ["Showers", "🌧️"],
    82: ["Heavy showers", "⛈️"],
    85: ["Snow showers", "🌨️"],
    86: ["Snow showers", "❄️"],
    95: ["Thunderstorm", "⛈️"],
    96: ["Thunderstorm", "⛈️"],
    99: ["Thunderstorm", "⛈️"],
  };

  function describe(code) {
    const hit = CODES[code];
    return { text: hit ? hit[0] : "", emoji: hit ? hit[1] : "🌡️" };
  }

  function round(n) {
    return n === null || n === undefined || isNaN(n) ? null : Math.round(Number(n));
  }

  /* The best reading we have, normalised so the card never has to care
     which of the two paths it came from. */
  function reading() {
    const src = live || Store.get("weather");
    if (!src || (!src.sensor && !src.current)) return null;

    const sensor = src.sensor || null;
    const current = src.current || null;
    const daily = src.daily || null;

    /* The backyard sensor wins for temperature — it is thirty feet away,
       not at the airport. Everything else fills in around it. */
    const sensorTemp = sensor ? round(sensor.temperature_F) : null;
    const apiTemp = current ? round(current.temperature_2m) : null;
    const code = current ? current.weather_code : null;
    const desc = describe(code);

    const days = [];
    if (daily && Array.isArray(daily.time)) {
      for (let i = 0; i < daily.time.length && i < 7; i++) {
        days.push({
          date: daily.time[i],
          hi: round(daily.temperature_2m_max && daily.temperature_2m_max[i]),
          lo: round(daily.temperature_2m_min && daily.temperature_2m_min[i]),
          rain: round(daily.precipitation_probability_max && daily.precipitation_probability_max[i]),
          code: daily.weather_code ? daily.weather_code[i] : null,
        });
      }
    }

    return {
      temp: sensorTemp !== null ? sensorTemp : apiTemp,
      fromSensor: sensorTemp !== null,
      feels: current ? round(current.apparent_temperature) : null,
      humidity: sensor && sensor.humidity != null ? round(sensor.humidity)
        : current ? round(current.relative_humidity_2m) : null,
      wind: current ? round(current.wind_speed_10m) : null,
      indoor: sensor ? round(sensor.indoor_F) : null,
      rainToday: sensor && sensor.rain_in != null ? Number(sensor.rain_in) : null,
      condition: desc.text || (sensor && sensor.condition) || "",
      emoji: desc.emoji,
      hi: days.length ? days[0].hi : null,
      lo: days.length ? days[0].lo : null,
      days: days,
      fetchedAt: src.fetchedAt || null,
      stale: isStale(src.fetchedAt),
    };
  }

  function isStale(iso) {
    if (!iso) return true;
    const age = Date.now() - new Date(iso).getTime();
    return !(age >= 0) || age > 3 * 3600 * 1000;
  }

  async function refresh() {
    if (Store.mode !== "server") return false;
    try {
      const res = await fetch("/api/hub/weather", { cache: "no-store" });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data || (!data.sensor && !data.current)) return false;
      live = data;
      return true;
    } catch (e) {
      return false;
    } finally {
      tried = true;
    }
  }

  /* --- the card ------------------------------------------------------ */

  function stat(value, label) {
    return UI.h(
      "div",
      { class: "wx-stat" },
      UI.h("div", { class: "wx-stat-val", text: value }),
      UI.h("div", { class: "wx-stat-key", text: label })
    );
  }

  function dayCell(d, i) {
    const date = Fmt.fromDayKey(d.date);
    const desc = describe(d.code);
    return UI.h(
      "div",
      { class: "wx-day" },
      UI.h("div", { class: "wx-day-name", text: i === 0 ? "Today" : Fmt.dayAbbr(Fmt.dayIdx(date)) }),
      UI.h("div", { class: "wx-day-icon", text: desc.emoji }),
      UI.h(
        "div",
        { class: "wx-day-temps" },
        UI.h("span", { class: "wx-hi", text: d.hi === null ? "--" : d.hi + "°" }),
        UI.h("span", { class: "wx-lo", text: d.lo === null ? "--" : d.lo + "°" })
      ),
      d.rain !== null && d.rain >= 30
        ? UI.h("div", { class: "wx-day-rain", text: d.rain + "%" })
        : null
    );
  }

  function card() {
    const w = reading();

    if (!w) {
      /* Only worth saying anything when there is a reason it is missing. */
      if (Store.mode === "server" && !tried) return null;
      if (Store.mode !== "server") {
        return UI.h(
          "div",
          { class: "card card-pad banner-slot" },
          UI.h(
            "div",
            { class: "banner" },
            UI.icon("info"),
            UI.h("span", {
              text:
                "No weather here yet. Open the hub from the house dashboard link " +
                "and it shows the backyard sensor.",
            })
          )
        );
      }
      return null;
    }

    const bits = [];
    if (w.feels !== null && w.feels !== w.temp) bits.push(stat(w.feels + "°", "Feels like"));
    if (w.humidity !== null) bits.push(stat(w.humidity + "%", "Humidity"));
    if (w.wind !== null) bits.push(stat(w.wind + " mph", "Wind"));
    if (w.indoor !== null) bits.push(stat(w.indoor + "°", "Inside"));
    if (w.rainToday !== null && w.rainToday > 0) bits.push(stat(w.rainToday + '"', "Rain today"));

    const head = UI.h(
      "div",
      { class: "wx-head" },
      UI.h("div", { class: "wx-emoji", text: w.emoji }),
      UI.h(
        "div",
        { class: "wx-main" },
        UI.h(
          "div",
          { class: "wx-temp nums" },
          w.temp === null ? "--" : String(w.temp),
          UI.h("span", { class: "wx-deg", text: "°" })
        ),
        UI.h("div", { class: "wx-cond", text: w.condition }),
        UI.h("div", {
          class: "wx-where",
          text: w.fromSensor ? "Backyard sensor" : "Hudsonville",
        })
      ),
      w.hi !== null
        ? UI.h(
            "div",
            { class: "wx-hilo nums" },
            UI.h("div", { text: "H " + w.hi + "°" }),
            UI.h("div", { class: "muted", text: "L " + (w.lo === null ? "--" : w.lo) + "°" })
          )
        : null
    );

    const kids = [head];
    if (bits.length) kids.push(UI.h("div", { class: "wx-stats" }, bits));
    if (w.days.length > 1)
      kids.push(UI.h("div", { class: "wx-week" }, w.days.slice(0, 7).map(dayCell)));
    if (w.stale && w.fetchedAt)
      kids.push(
        UI.h("div", { class: "wx-stale tiny muted", text: "Last updated " + Fmt.relDay(Fmt.dayKey(new Date(w.fetchedAt))) })
      );

    return UI.h("div", { class: "card wx-card" }, kids);
  }

  return {
    describe: describe,
    reading: reading,
    refresh: refresh,
    card: card,
  };
})();
