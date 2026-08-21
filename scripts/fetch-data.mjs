// Downloads the raw astronomical catalogs used by scripts/build-data.mjs
// into dataprep/. Safe to re-run; overwrites existing files.
//
// Sources:
//  - d3-celestial (Olaf Frohn, BSD license): star positions/magnitudes to
//    mag 6 (Hipparcos-derived), constellation lines/names, Messier +
//    bright deep-sky objects. https://github.com/ofrohn/d3-celestial
//  - HYG Database (astronexus, CC-BY-SA/public-domain-ish, see its own
//    LICENSE): adds real distance (parsecs) and spectral class per star
//    by Hipparcos number. https://github.com/astronexus/HYG-Database

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dp = path.join(__dirname, "..", "dataprep");
mkdirSync(dp, { recursive: true });

const CELESTIAL = "https://raw.githubusercontent.com/ofrohn/d3-celestial/master";
const HYG = "https://raw.githubusercontent.com/astronexus/HYG-Database/master/hyg/CURRENT";

const files = [
  [`${CELESTIAL}/data/stars.6.json`, "stars.6.json"],
  [`${CELESTIAL}/data/starnames.json`, "starnames.json"],
  [`${CELESTIAL}/data/constellations.json`, "constellations.json"],
  [`${CELESTIAL}/data/constellations.lines.json`, "constellations.lines.json"],
  [`${CELESTIAL}/data/messier.json`, "messier.json"],
  [`${CELESTIAL}/data/dsos.bright.json`, "dsos.bright.json"],
  [`${CELESTIAL}/LICENSE`, "LICENSE_d3celestial.txt"],
  [`${HYG}/hygdata_v41.csv`, "hygdata_v41.csv"],
  [`${HYG}/LICENSE`, "LICENSE_hyg.txt"],
];

for (const [url, name] of files) {
  process.stdout.write(`Fetching ${name}... `);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(path.join(dp, name), buf);
  console.log(`${(buf.length / 1024).toFixed(0)} KB`);
}

console.log("\nDone. Now run: node scripts/build-data.mjs");
