/**
 * The Solanyk House — the family app, hosted.
 *
 * This is the always-on copy: it holds the family's data and serves the app
 * to every screen. The Surface upstairs is no longer the source of truth for
 * any of it — it is just another client, one that happens to show the display
 * view and to push the backyard sensor up here when it is awake.
 *
 * Runs on Deno Deploy. Storage is Deno KV, which is strongly consistent, so an
 * edit made on one phone is visible to the other as soon as it polls.
 *
 * Routes
 *   GET  /                    the app
 *   GET  /display             the app in always-on wall mode
 *   GET  /manifest.webmanifest
 *   GET  /api/hub             the whole state blob
 *   POST /api/hub             {ops:[...]}, applied onto current state
 *   GET  /api/hub/version     change token, for cheap polling
 *   GET  /api/hub/weather     backyard sensor + Open-Meteo forecast
 *   POST /api/sensor          the Surface pushes AcuRite readings here
 *
 * There is no authentication, by the family's explicit choice: the whole point
 * is that Kenzie opens a link and it works. Anyone with the URL can read and
 * write. Nothing secret goes in here.
 */

/* On Deno Deploy this opens the hosted database. Locally it opens a file:
   set HOUSE_KV_PATH to point it somewhere disposable while developing. */
const kv = await Deno.openKv(Deno.env.get("HOUSE_KV_PATH") || undefined);

/* Mirrors the shape the app's own store uses. Anything not named here is
   rejected, so a bad client can never invent keys. */
const DOCS = [
  "config",
  "routine",
  "checks",
  "plan",
  "daily",
  "weather",
  "rewards",
  "rewardShop",
  "chores",
  "cart",
] as const;
const COLLS = ["recipes", "jobs", "projects", "grocery"] as const;

const LAT = 42.8717;
const LON = -85.8639;

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj =>
  v !== null && typeof v === "object" && !Array.isArray(v);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

/* ---------- state ---------- */

async function readBlob() {
  const docs: Obj = {};
  const colls: Obj = {};
  DOCS.forEach((k) => (docs[k] = {}));
  COLLS.forEach((k) => (colls[k] = {}));

  const entries = kv.list<Obj>({ prefix: ["hub"] });
  for await (const e of entries) {
    const [, kind, a, b] = e.key as string[];
    if (kind === "docs" && DOCS.includes(a as never)) docs[a] = e.value;
    else if (kind === "colls" && COLLS.includes(a as never)) {
      (colls[a] as Obj)[b] = e.value;
    }
  }
  return { docs, colls, version: await readVersion() };
}

async function readVersion() {
  const v = await kv.get<number>(["hub", "meta", "version"]);
  return String(v.value ?? 0);
}

async function bumpVersion() {
  const v = Date.now();
  await kv.set(["hub", "meta", "version"], v);
  return String(v);
}

/* Recursive merge, identical to the rule the app's own store follows, so the
   copy in the browser and the copy up here can never drift apart. Arrays
   replace wholesale. */
function merge(target: unknown, patch: Obj): Obj {
  const out: Obj = isObj(target) ? { ...target } : {};
  for (const k of Object.keys(patch)) {
    const v = patch[k];
    out[k] = isObj(v) ? merge(out[k], v) : v;
  }
  return out;
}

type Op = {
  type?: string;
  key?: string;
  coll?: string;
  id?: string;
  mode?: string;
  body?: unknown;
};

/* One write. Anything unrecognised is skipped rather than throwing, so a
   newer client can never wedge an older deployment. */
async function applyOp(op: Op) {
  if (!op || typeof op !== "object") return;

  if (op.type === "doc") {
    if (!op.key || !DOCS.includes(op.key as never)) return;
    const body = isObj(op.body) ? op.body : {};
    const path = ["hub", "docs", op.key];
    if (op.mode === "merge") {
      const cur = await kv.get<Obj>(path);
      await kv.set(path, merge(cur.value, body));
    } else {
      await kv.set(path, body);
    }
    return;
  }

  if (op.type === "item") {
    if (!op.coll || !COLLS.includes(op.coll as never)) return;
    if (!op.id || typeof op.id !== "string" || op.id.length > 200) return;
    const path = ["hub", "colls", op.coll, op.id];
    if (op.mode === "delete") {
      await kv.delete(path);
      return;
    }
    const body = isObj(op.body) ? op.body : {};
    if (op.mode === "patch") {
      const cur = await kv.get<Obj>(path);
      await kv.set(path, merge(cur.value, body));
    } else {
      await kv.set(path, body);
    }
  }
}

/* ---------- weather ---------- */

const FORECAST_TTL_MS = 10 * 60 * 1000;

async function forecast() {
  const cached = await kv.get<{ at: number; data: Obj }>(["hub", "meta", "forecast"]);
  if (cached.value && Date.now() - cached.value.at < FORECAST_TTL_MS) {
    return cached.value.data;
  }
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=" + LAT + "&longitude=" + LON +
    "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
    "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FDetroit&forecast_days=7";
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("forecast " + res.status);
    const data = (await res.json()) as Obj;
    await kv.set(["hub", "meta", "forecast"], { at: Date.now(), data });
    return data;
  } catch {
    /* Stale beats blank: the family would rather see this morning's forecast
       than an empty card. */
    return cached.value ? cached.value.data : null;
  }
}

/* The backyard reading only counts while it is fresh. The Surface sleeps and
   loses power, so a reading from yesterday must not be shown as "now". */
const SENSOR_FRESH_MS = 90 * 60 * 1000;

async function sensorReading() {
  const s = await kv.get<{ at: number; reading: Obj }>(["hub", "meta", "sensor"]);
  if (!s.value) return null;
  if (Date.now() - s.value.at > SENSOR_FRESH_MS) return null;
  return s.value.reading;
}

/* ---------- prices ---------- */

/* public/prices.json is written nightly by the price-sweep routine and
   committed, so every push carries fresh Meijer/ALDI prices up here. */
let pricesCache: { at: number; body: string } | null = null;

async function prices() {
  if (pricesCache && Date.now() - pricesCache.at < 5 * 60 * 1000) return pricesCache.body;
  try {
    const body = await Deno.readTextFile(new URL("../public/prices.json", import.meta.url));
    JSON.parse(body);
    pricesCache = { at: Date.now(), body };
    return body;
  } catch {
    return "{}";
  }
}

/* ---------- recipe import ---------- */

/* Kenzie's pins all point at recipe blogs, and nearly every recipe blog
   carries a schema.org Recipe block (JSON-LD) for Google. That block is the
   clean recipe with none of the page's ads: name, photo, ingredients, steps,
   time, servings, author. This pulls it out, so a link becomes a recipe in
   the box with one paste. */

const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

async function fetchPage(url: string) {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error("page " + res.status);
  const text = await res.text();
  return { html: text, finalUrl: res.url || url };
}

/* A Pinterest pin page is not the recipe; it points at the blog. Best
   effort: find the pin's outbound link and follow that instead. */
function pinterestSource(html: string): string | null {
  const m =
    html.match(/"link"\s*:\s*"(https?:\\\/\\\/[^"]+?)"/) ||
    html.match(/property="og:see_also"\s+content="(https?:[^"]+)"/) ||
    html.match(/"sourceUrl"\s*:\s*"(https?:[^"]+?)"/);
  if (!m) return null;
  const u = m[1].replace(/\\\//g, "/");
  return /pinterest\./i.test(u) ? null : u;
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripTags(s: string) {
  return decodeEntities(String(s).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function findRecipeNode(node: unknown): Obj | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const hit = findRecipeNode(n);
      if (hit) return hit;
    }
    return null;
  }
  if (!isObj(node)) return null;
  const t = node["@type"];
  const types = Array.isArray(t) ? t : [t];
  if (types.some((x) => typeof x === "string" && /recipe/i.test(x))) return node;
  if (node["@graph"]) return findRecipeNode(node["@graph"]);
  if (node["mainEntity"]) return findRecipeNode(node["mainEntity"]);
  return null;
}

function isoDuration(v: unknown): string {
  if (typeof v !== "string") return "";
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i.exec(v.trim());
  if (!m) return "";
  const mins = (Number(m[1] || 0) * 24 + Number(m[2] || 0)) * 60 + Number(m[3] || 0);
  if (!mins) return "";
  if (mins < 60) return mins + " min";
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  return r ? h + " hr " + r + " min" : h + " hr";
}

function firstString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) return firstString(v[0]);
  if (isObj(v)) return firstString(v["url"] ?? v["name"] ?? v["@id"] ?? v["text"]);
  return "";
}

/* An author is a person's name or nothing. Some sites only reference the
   author by a schema id like "https://site/#/schema/person/abc" — that is
   not a name and must never be shown as one. */
function authorName(v: unknown): string {
  if (typeof v === "string") return /^https?:\/\//i.test(v) ? "" : v.trim();
  if (Array.isArray(v)) {
    for (const x of v) {
      const n = authorName(x);
      if (n) return n;
    }
    return "";
  }
  if (isObj(v)) {
    const n = v["name"];
    return typeof n === "string" && !/^https?:\/\//i.test(n) ? n.trim() : "";
  }
  return "";
}

function stepsFrom(v: unknown, out: string[] = []): string[] {
  if (!v) return out;
  if (typeof v === "string") {
    /* One big string: paragraphs, list items and line breaks are the step
       boundaries. Some sites (Half Baked Harvest among them) ship the whole
       method as one run of prose with the numbers glued to the previous
       sentence — "…until smooth.2. In a large bowl…" — so also break before
       a number that starts a new sentence. Then the "1." prefixes come off. */
    stripTags(v.replace(/<\/?(?:li|p|br|div|h\d)[^>]*>/gi, "\n"))
      .split(/\n+|(?<=[.!?])\s*(?=\d{1,2}\.\s*[A-Z])/)
      .map((s) => s.replace(/^\s*(?:step\s*)?\d+[.):]\s*/i, "").trim())
      .filter((s) => s.length > 3)
      .forEach((s) => out.push(s));
    return out;
  }
  if (Array.isArray(v)) {
    v.forEach((x) => stepsFrom(x, out));
    return out;
  }
  if (isObj(v)) {
    if (v["itemListElement"]) return stepsFrom(v["itemListElement"], out);
    const text = firstString(v["text"]) || firstString(v["name"]);
    if (text) out.push(stripTags(text));
  }
  return out;
}

function extractRecipe(html: string, pageUrl: string) {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  let node: Obj | null = null;
  for (const b of blocks) {
    try {
      node = findRecipeNode(JSON.parse(b[1].trim()));
    } catch {
      /* some sites ship slightly broken JSON; try the next block */
    }
    if (node) break;
  }

  const og = (prop: string) => {
    const m =
      html.match(new RegExp('<meta[^>]+property=["\']og:' + prop + '["\'][^>]+content=["\']([^"\']+)', "i")) ||
      html.match(new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:' + prop + '["\']', "i"));
    return m ? decodeEntities(m[1]) : "";
  };

  const host = (() => {
    try {
      return new URL(pageUrl).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  if (!node) {
    return {
      found: false,
      name: og("title") || "",
      image: og("image") || "",
      source: og("site_name") || host,
      sourceUrl: pageUrl,
      ingredients: [] as string[],
      steps: [] as string[],
      time: "",
      servings: "",
    };
  }

  const ingredients = ([] as unknown[])
    .concat(node["recipeIngredient"] ?? node["ingredients"] ?? [])
    .map((x) => stripTags(String(x)).replace(/\s*\(\s*\$[^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  let steps = stepsFrom(node["recipeInstructions"]);
  if (!steps.length && node["description"]) steps = stepsFrom(node["description"]);
  const author = authorName(node["author"]);
  const yieldV = node["recipeYield"];
  const servings = Array.isArray(yieldV) ? String(yieldV[0]) : yieldV ? String(yieldV) : "";

  return {
    found: true,
    name: stripTags(firstString(node["name"]) || og("title")),
    image: firstString(node["image"]) || og("image") || "",
    source: author || og("site_name") || host,
    sourceUrl: pageUrl,
    ingredients,
    steps,
    time: isoDuration(node["totalTime"]) || isoDuration(node["cookTime"]) || "",
    servings: servings.replace(/[^\d].*$/, "").trim() || servings.trim(),
    keywords: stripTags(firstString(node["keywords"]) || ""),
  };
}

async function importRecipe(rawUrl: string) {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  let page = await fetchPage(url);
  if (/pinterest\./i.test(new URL(page.finalUrl).hostname)) {
    const src = pinterestSource(page.html);
    if (src) page = await fetchPage(src);
  }
  return extractRecipe(page.html, page.finalUrl);
}

/* ---------- the page ---------- */

let pageCache: string | null = null;

async function page() {
  if (pageCache) return pageCache;
  const url = new URL("../hub/dist/hub.html", import.meta.url);
  pageCache = await Deno.readTextFile(url);
  return pageCache;
}

const MANIFEST = {
  name: "The Solanyk House",
  short_name: "The House",
  start_url: "/",
  display: "standalone",
  background_color: "#eff2f1",
  theme_color: "#2b5b87",
  icons: [],
};

/* ---------- routing ---------- */

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const p = url.pathname;

  if (p === "/api/hub/version") {
    return json({ version: await readVersion() });
  }

  if (p === "/api/hub") {
    if (req.method === "GET") return json(await readBlob());
    if (req.method === "POST") {
      let ops: Op[];
      try {
        ops = (await req.json()).ops;
      } catch {
        return json({ ok: false, error: "invalid json" }, 400);
      }
      if (!Array.isArray(ops) || !ops.length) {
        return json({ ok: false, error: "ops must be a non-empty array" }, 400);
      }
      if (ops.length > 500) return json({ ok: false, error: "too many ops" }, 400);
      for (const op of ops) await applyOp(op);
      return json({ ok: true, version: await bumpVersion() });
    }
    return new Response("Method not allowed", { status: 405 });
  }

  if (p === "/api/hub/weather") {
    const [live, sensor] = await Promise.all([forecast(), sensorReading()]);
    return json({
      sensor,
      current: live && live.current ? live.current : null,
      daily: live && live.daily ? live.daily : null,
      fetchedAt: new Date().toISOString(),
    });
  }

  /* The Surface posts the AcuRite reading here whenever it is awake. */
  if (p === "/api/sensor" && req.method === "POST") {
    let reading: unknown;
    try {
      reading = await req.json();
    } catch {
      return json({ ok: false, error: "invalid json" }, 400);
    }
    if (!isObj(reading)) return json({ ok: false, error: "reading must be an object" }, 400);
    await kv.set(["hub", "meta", "sensor"], { at: Date.now(), reading });
    return json({ ok: true });
  }

  if (p === "/api/prices") {
    return new Response(await prices(), {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }

  /* A link in, a recipe out. */
  if (p === "/api/import" && req.method === "POST") {
    let body: { url?: string };
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "invalid json" }, 400);
    }
    if (!body || typeof body.url !== "string" || !body.url.trim()) {
      return json({ ok: false, error: "url required" }, 400);
    }
    try {
      const recipe = await importRecipe(body.url);
      return json({ ok: true, recipe });
    } catch (e) {
      return json({ ok: false, error: String((e as Error)?.message || e) }, 200);
    }
  }

  if (p === "/manifest.webmanifest") {
    return new Response(JSON.stringify(MANIFEST), {
      headers: { "content-type": "application/manifest+json" },
    });
  }

  if (p === "/health") {
    return json({ ok: true, version: await readVersion(), at: new Date().toISOString() });
  }

  /* Everything else is the app. /display is the same page; the client reads
     the path and switches into wall mode. */
  if (req.method === "GET") {
    try {
      return new Response(await page(), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    } catch {
      return new Response("The app has not been built yet: run node hub/build.js and push.", {
        status: 500,
      });
    }
  }

  return new Response("Not found", { status: 404 });
}

Deno.serve(handler);
