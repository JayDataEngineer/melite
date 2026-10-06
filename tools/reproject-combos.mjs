#!/usr/bin/env node
// tools/reproject-combos.mjs — re-project the pinned-combos
// fixture (and the owner-local engine cache) from the SERVING
// engine. The wall arm in vocab-rails-subset.spec.ts compares
// fixture ↔ cache and cache ↔ engine; when the engine arm reds,
// THIS is the cure it names — the projection is a mechanism the
// repo owns, never a hand edit of pinned values.
//
// Law: the fixture's KEY SET is curated (a new key joins by
// editing the fixture once, deliberately); each key's VALUES are
// always a projection of the live engine — this tool overwrites
// them. It refuses loud when no engine answers on :8188 (a
// projection needs the serving truth; guessing is banned).
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = join(REPO, "tests", "walls", "fixtures", "pinned-combos.min.json");
const CACHE = join(REPO, "data", "tmp", "object_info_prod.json");
const URL_ = process.env["MELITE_OBJECT_INFO"] ?? "http://127.0.0.1:8188/object_info";

let doc;
try {
  const res = await fetch(URL_, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`engine answered ${res.status}`);
  doc = await res.json();
} catch (e) {
  console.error(`reproject-combos: no serving engine at ${URL_} (${e.message}) — start the engine, then re-run.`);
  process.exit(1);
}

/** Both combo spellings: legacy array-head and ["COMBO", {options}]
 *  (options dict or list) — same parse the walls read. */
function specOptions(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const head = raw[0];
  if (Array.isArray(head)) return head.map(String);
  if (head === "COMBO") {
    const opts = raw[1]?.["options"];
    if (Array.isArray(opts)) return opts.map(String);
    if (opts !== null && typeof opts === "object") return Object.keys(opts).map(String);
    return null;
  }
  return null;
}

const fx = JSON.parse(readFileSync(FIXTURE, "utf8"));
const out = {};
const drift = [];
for (const key of Object.keys(fx)) {
  const dot = key.lastIndexOf(".");
  const [cls, inp] = [key.slice(0, dot), key.slice(dot + 1)];
  const node = doc[cls];
  const raw = node?.input?.required?.[inp] ?? node?.input?.optional?.[inp];
  const vals = specOptions(raw);
  if (vals === null) {
    console.error(`reproject-combos: ${key} is no longer a combo the engine serves — curate the key set deliberately (edit the fixture, never this tool).`);
    process.exit(1);
  }
  if (JSON.stringify(fx[key]) !== JSON.stringify(vals)) drift.push(`${key}: ${fx[key].length} -> ${vals.length}`);
  out[key] = vals;
}
writeFileSync(FIXTURE, JSON.stringify(out) + "\n");
mkdirSync(dirname(CACHE), { recursive: true });
writeFileSync(CACHE, JSON.stringify(doc) + "\n");
console.log(`reproject-combos: ${Object.keys(out).length} keys projected from ${URL_}`);
console.log(drift.length ? `drift corrected:\n  ${drift.join("\n  ")}` : "no drift (fixture already matched the engine)");
