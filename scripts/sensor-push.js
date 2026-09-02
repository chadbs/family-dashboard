#!/usr/bin/env node
/* sensor-push.js — send the backyard AcuRite reading up to the family app.
 *
 * Runs on the Surface (the machine with the RTL-SDR dongle). Reads the
 * latest reading that weather-bridge.js keeps in data/weather.json and POSTs
 * it to the hosted app, which shows it on every phone and on the wall.
 *
 * Where the app lives comes from cloud/endpoint.json:
 *     { "url": "https://solanyk-house.deno.dev" }
 * or the HUB_URL environment variable, or the first argument.
 *
 * Runs once and exits. scripts/setup-sensor-push.ps1 registers it to run
 * every 5 minutes. Zero dependencies, like everything else here.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const ROOT = path.join(__dirname, "..");
const WEATHER = path.join(ROOT, "data", "weather.json");
const ENDPOINT = path.join(ROOT, "cloud", "endpoint.json");

function baseUrl() {
  const arg = process.argv[2];
  if (arg) return arg;
  if (process.env.HUB_URL) return process.env.HUB_URL;
  try {
    const cfg = JSON.parse(fs.readFileSync(ENDPOINT, "utf8"));
    if (cfg && cfg.url) return cfg.url;
  } catch {}
  return "";
}

const base = baseUrl().replace(/\/+$/, "");
if (!base) {
  console.error("sensor-push: no app URL. Put it in cloud/endpoint.json as {\"url\": \"https://...\"}");
  process.exit(2);
}

let reading;
try {
  reading = JSON.parse(fs.readFileSync(WEATHER, "utf8"));
} catch {
  console.error("sensor-push: no data/weather.json yet (is weather-bridge running?)");
  process.exit(0);
}
if (!reading || reading.demo || reading.temperature_F == null) {
  console.log("sensor-push: no real reading yet, nothing sent");
  process.exit(0);
}

/* Only send what the app uses. The sensor's own timestamp goes along so a
   stale file is never mistaken for a fresh reading. */
const payload = JSON.stringify({
  temperature_F: reading.temperature_F,
  humidity: reading.humidity,
  indoor_F: reading.indoor_F,
  indoor_hum: reading.indoor_hum,
  rain_in: reading.rain_in,
  condition: reading.condition,
  hi: reading.hi,
  lo: reading.lo,
  updated: reading.updated || null,
  sentAt: new Date().toISOString(),
});

const target = new URL(base + "/api/sensor");
const lib = target.protocol === "https:" ? https : http;
const req = lib.request(
  target,
  {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
    timeout: 15000,
  },
  (res) => {
    let body = "";
    res.on("data", (c) => (body += c));
    res.on("end", () => {
      if (res.statusCode === 200) {
        console.log("sensor-push: sent " + reading.temperature_F + "F to " + target.host);
      } else {
        console.error("sensor-push: server said " + res.statusCode + " " + body.slice(0, 200));
        process.exitCode = 1;
      }
    });
  }
);
req.on("timeout", () => {
  req.destroy(new Error("timeout"));
});
req.on("error", (e) => {
  console.error("sensor-push: " + e.message);
  process.exitCode = 1;
});
req.end(payload);
