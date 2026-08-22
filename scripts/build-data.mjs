// Converts raw d3-celestial catalog data (in dataprep/) into compact JSON
// used by the app at runtime (src/data/). Run with: node scripts/build-data.mjs
//
// Source data: d3-celestial by Olaf Frohn (BSD license), which itself derives
// from the Hipparcos catalog (stars), Yale/HYG data (names) and NGC/IC + Messier
// catalogs (deep sky objects). See dataprep/LICENSE_d3celestial.txt.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dp = path.join(root, "dataprep");
const out = path.join(root, "src", "data");
mkdirSync(out, { recursive: true });

const readJSON = (p) => JSON.parse(readFileSync(p, "utf-8"));

const stars = readJSON(path.join(dp, "stars.6.json"));
const starnames = readJSON(path.join(dp, "starnames.json"));
const constellationsRaw = readJSON(path.join(dp, "constellations.json"));
const linesRaw = readJSON(path.join(dp, "constellations.lines.json"));
const messier = readJSON(path.join(dp, "messier.json"));
const dsosBright = readJSON(path.join(dp, "dsos.bright.json"));

// ---- HYG database: adds real distance (parsecs) + spectral class per HIP ----
// Minimal CSV parser that respects double-quoted fields (some contain commas).
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const hygRows = parseCSV(readFileSync(path.join(dp, "hygdata_v41.csv"), "utf-8"));
const hygHeader = hygRows[0];
const hipIdx = hygHeader.indexOf("hip");
const distIdx = hygHeader.indexOf("dist");
const spectIdx = hygHeader.indexOf("spect");
const PARSEC_TO_LY = 3.26156;

const hygByHip = new Map();
for (let i = 1; i < hygRows.length; i++) {
  const r = hygRows[i];
  const hip = r[hipIdx];
  if (!hip) continue;
  const distPc = parseFloat(r[distIdx]);
  hygByHip.set(Number(hip), {
    distanceLy: Number.isFinite(distPc) && distPc > 0 && distPc < 90000 ? distPc * PARSEC_TO_LY : null,
    spect: r[spectIdx] || null,
  });
}

// ---- Stars ----
const norm360 = (d) => (d < 0 ? d + 360 : d);

const outStars = stars.features.map((f) => {
  const hip = f.id;
  const meta = starnames[String(hip)];
  const hyg = hygByHip.get(hip);
  const [ra, dec] = f.geometry.coordinates;
  return {
    hip,
    ra: norm360(ra),
    dec,
    mag: f.properties.mag,
    bv: f.properties.bv ? parseFloat(f.properties.bv) : null,
    name: meta?.name || null,
    bayer: meta?.bayer || null,
    flam: meta?.flam || null,
    con: meta?.c || null,
    hd: meta?.hd || null,
    distanceLy: hyg?.distanceLy ?? null,
    spect: hyg?.spect || null,
  };
});
outStars.sort((a, b) => a.mag - b.mag);

// ---- Constellations ----
const linesById = new Map(linesRaw.features.map((f) => [f.id, f]));

const outConstellations = constellationsRaw.features.map((f) => {
  const id = f.id;
  const lineFeature = linesById.get(id);
  const segments = lineFeature
    ? lineFeature.geometry.coordinates.map((seg) =>
        seg.map(([ra, dec]) => [norm360(ra), dec])
      )
    : [];
  const [cra, cdec] = f.geometry.coordinates;
  return {
    id,
    en: f.properties.en,
    ru: f.properties.ru,
    la: f.properties.la,
    gen: f.properties.gen,
    center: { ra: norm360(cra), dec: cdec },
    lines: segments,
  };
});

// ---- Deep sky objects ----
const outDeepSky = [
  ...messier.features.map((f) => {
    const [ra, dec] = f.geometry.coordinates;
    return {
      id: f.id,
      name: f.properties.name,
      altName: f.properties.alt || null,
      desig: f.properties.desig || null,
      type: f.properties.type,
      mag: f.properties.mag,
      dim: f.properties.dim || null,
      ra: norm360(ra),
      dec,
    };
  }),
  ...dsosBright.features
    .filter((f) => !messier.features.some((m) => m.properties.desig === f.properties.desig))
    .map((f) => {
      const [ra, dec] = f.geometry.coordinates;
      return {
        id: f.id,
        name: f.properties.desig,
        altName: null,
        desig: f.properties.desig,
        type: f.properties.type,
        mag: f.properties.mag,
        dim: f.properties.dim || null,
        ra: norm360(ra),
        dec,
      };
    }),
];

// ---- Satellites ----
// A curated, hand-picked set of well-known satellites (see
// src/data/satelliteFacts.ts for their descriptions). Orbital elements
// (TLE) come straight from CelesTrak and are propagated live with SGP4
// at runtime (src/astronomy/satellites.ts) — nothing about their position
// is precomputed or hard-coded here, only *which* real object each `key`
// points at.
function parseTLEFile(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const sats = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i].trim();
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];
    if (!line1.startsWith("1 ") || !line2.startsWith("2 ")) continue;
    sats.push({ name, line1, line2 });
  }
  return sats;
}

function tleEpochToISO(line1) {
  const yy = parseInt(line1.substring(18, 20), 10);
  const dayOfYear = parseFloat(line1.substring(20, 32));
  const year = yy < 57 ? 2000 + yy : 1900 + yy;
  return new Date(Date.UTC(year, 0, 1) + (dayOfYear - 1) * 86400000).toISOString();
}

const CURATED_SATELLITES = [
  { key: "iss", file: "sat-stations.tle", match: (n) => n === "ISS (ZARYA)" },
  { key: "css", file: "sat-stations.tle", match: (n) => n === "CSS (TIANHE)" },
  { key: "hst", file: "sat-science.tle", match: (n) => n === "HST" },
  { key: "gps", file: "sat-gps-ops.tle", match: (n) => n.startsWith("GPS ") },
  { key: "geo", file: "sat-geo.tle", match: (n) => n === "GOES 16" },
  { key: "noaa", file: "sat-weather.tle", match: (n) => n === "NOAA 20 (JPSS-1)" },
  { key: "landsat", file: "sat-resource.tle", match: (n) => n === "LANDSAT 8" },
  { key: "sentinel", file: "sat-resource.tle", match: (n) => n === "SENTINEL-2A" },
  { key: "oneweb", file: "sat-oneweb.tle", match: (n) => n.startsWith("ONEWEB-") },
];

const outSatellites = [];
for (const c of CURATED_SATELLITES) {
  const sats = parseTLEFile(readFileSync(path.join(dp, c.file), "utf-8"));
  const found = sats.find((s) => c.match(s.name));
  if (!found) {
    console.warn(`WARNING: curated satellite "${c.key}" not found in ${c.file} — skipping`);
    continue;
  }
  outSatellites.push({
    key: c.key,
    noradId: found.line1.substring(2, 7).trim(),
    name: found.name,
    line1: found.line1,
    line2: found.line2,
    epoch: tleEpochToISO(found.line1),
  });
}

writeFileSync(path.join(out, "stars.json"), JSON.stringify(outStars));
writeFileSync(path.join(out, "constellations.json"), JSON.stringify(outConstellations));
writeFileSync(path.join(out, "deepsky.json"), JSON.stringify(outDeepSky));
writeFileSync(path.join(out, "satellites.json"), JSON.stringify(outSatellites));

console.log("stars:", outStars.length);
console.log("constellations:", outConstellations.length);
console.log("deepsky:", outDeepSky.length);
console.log("named stars:", outStars.filter((s) => s.name).length);
console.log("satellites:", outSatellites.map((s) => s.key).join(", "));
