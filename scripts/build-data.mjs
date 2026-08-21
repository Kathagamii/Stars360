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

writeFileSync(path.join(out, "stars.json"), JSON.stringify(outStars));
writeFileSync(path.join(out, "constellations.json"), JSON.stringify(outConstellations));
writeFileSync(path.join(out, "deepsky.json"), JSON.stringify(outDeepSky));

console.log("stars:", outStars.length);
console.log("constellations:", outConstellations.length);
console.log("deepsky:", outDeepSky.length);
console.log("named stars:", outStars.filter((s) => s.name).length);
