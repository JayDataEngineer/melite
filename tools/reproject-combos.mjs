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

// THE PARSE IS IMPORTED, never re-hand-rolled here (R4-07): a
// second combo spelling would red this tool and green the wall.
// wiringWall.ts's parseInputSpec is the ONE derivation (both
// legacy spellings + COMBO + COMFY_DYNAMICCOMBO_V3, object-key
// options); this tool maps its enum to strings. Erasable-syntax TS
// imports ride node's --experimental-strip-types (the same
// contract the scripts/ regen doors use) — if that import fails,
// the tool refuses loud rather than falling back to a copy.
const { parseInputSpec } = await import(
  join(REPO, "packages/engines/comfyui-cordis/src/wiringWall.ts")
);
/** One spelling of "the combo values" — the wall's own parse. */
function specOptions(raw) {
  const parsed = parseInputSpec(raw, true);
  return Array.isArray(parsed.enum) ? parsed.enum.map(String) : null;
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
