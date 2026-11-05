// regen-node-vocab — regenerate the estate's derived engine
// vocabulary artifacts from a /object_info census.
//
// TWO LEGS:
//
// FACTS LEG (default, no --boot) — the dead-card wall's inventory
// leg (2026-10-22): read the LIVE engine and write the sorted class
// list into model-facts.json as engine_node_types. It never writes a
// partial or empty list: an engine that does not answer, or answers
// with fewer classes than the facts' pack inventories name, is a
// REFUSAL — a shrunken vocabulary would red every card composing a
// real class.
//
//   node scripts/regen-node-vocab.mjs [--engine http://127.0.0.1:8188]
//
// BOOT LEG (--boot, journey-closure E8, closing upstream-parity F3)
// — derive the hermetic boot double
// tests/walls/fixtures/object_info.boot.json FROM A CENSUS INPUT
// instead of riding as a frozen literal. The class set is DERIVED,
// not hand-kept: the address set comes from composing every facts
// row's card (packages/engines/comfyui-cordis/scripts/
// boot-address-set-probe.ts, the dead-card wall's own probe law),
// and every row's value is re-harvested from the census through the
// SANITIZE STEP (machine media-input rosters and third-party pack
// option/tooltip bytes masked out — the exposure-audit cure,
// 2026-11-15; the census capture itself stays untouched).
// The curated residue the probe cannot reach (the walls' film-graph
// composes — lane-gated branches the fill loop does not unlock) is
// named, with a justification per row, in
// tests/walls/fixtures/object_info.boot.bootstrap.json; a residue
// row the census no longer serves is a REFUSAL. A receipt stamped
// with the census source (path, sha256, class count) lands beside
// the fixture; the derivation arm
// (tests/walls/ts/suites/boot-fixture-derivation.spec.ts) reds when
// the fixture no longer matches its derivation — a stale fixture, an
// over-grown fixture, or a moved census all red with the diff named.
//
//   node scripts/regen-node-vocab.mjs --boot [--census PATH | --live]
//        [--dry-run] [--engine URL]
//
//   --live    harvest the census from the live engine first,
//             refreshing data/tmp/object_info_prod.json (the estate's
//             live capture), then derive from it.
//   --census  derive from this capture instead of the default path.
//   --dry-run compute everything — the diff, the refusals — and
//             write NOTHING.
//   --self-check byte-judge the emit serializer against the COMMITTED
//             fixture: re-serializing its parsed bytes must reproduce
//             the file exactly, or the emit law has drifted.

import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, resolve, dirname } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FACTS = join(ROOT, "packages/engines/comfyui-cordis/data/model-facts.json");
const FIXTURE = join(ROOT, "tests/walls/fixtures/object_info.boot.json");
const RECEIPT = join(ROOT, "tests/walls/fixtures/object_info.boot.receipt.json");
const BOOTSTRAP = join(ROOT, "tests/walls/fixtures/object_info.boot.bootstrap.json");
const DEFAULT_CENSUS = join(ROOT, "data/tmp/object_info_prod.json");
const PROBE = join(ROOT, "packages/engines/comfyui-cordis/scripts/boot-address-set-probe.ts");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? "") : undefined;
};

const die = (msg) => {
  console.error("REFUSED: " + msg);
  process.exit(2);
};

if (flag("--help")) {
  console.log(`regen-node-vocab — regenerate the estate's derived engine vocabulary

  node scripts/regen-node-vocab.mjs [--engine URL]
      the FACTS leg: write engine_node_types into model-facts.json
      from the live engine's /object_info (refuses a shrunken answer).

  node scripts/regen-node-vocab.mjs --boot [--census PATH | --live]
                                           [--dry-run] [--engine URL]
      the BOOT leg (E8): derive the hermetic boot double
      tests/walls/fixtures/object_info.boot.json from a /object_info
      census — the class set from composing every facts row's card
      (the probe address set) plus the receipted bootstrap residue,
      every row's value from the census through the sanitize step
      (machine media-input rosters and third-party pack option/tooltip
      bytes masked; the census capture itself stays untouched) — and
      stamp the census source into object_info.boot.receipt.json.

      --live     harvest the census from the live engine first
                 (refreshes data/tmp/object_info_prod.json).
      --census   derive from this capture (default
                 data/tmp/object_info_prod.json).
      --dry-run  compute the derivation and the diff, write nothing.

The derivation arm (tests/walls/ts/suites/boot-fixture-derivation.spec.ts)
judges the fixture against this law; a stale fixture reds at the next
regen with the diff named.`);
  process.exit(0);
}

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

const relative = (p) => (p.startsWith(ROOT) ? p.slice(ROOT.length + 1) : p);

/** The fixture's format law (B1's additive-growth serializer):
 *  sorted keys at every level, one-space indent, ensure_ascii
 *  (non-ASCII as lowercase \uXXXX, astral as surrogate pairs),
 *  one trailing newline. The derivation arm byte-judges the fixture
 *  against this serializer. */
const ensureAsciiJson = (value) =>
  JSON.stringify(value, (_key, v) => {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      return Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]));
    }
    return v;
  }, 1).replace(/[\u007f-\uffff]/g, (c) =>
    "\\u" + c.codePointAt(0).toString(16).padStart(4, "0")) + "\n";

if (flag("--self-check")) {
  // THE FORMAT LAW, byte-judged: the emit serializer must reproduce
  // the committed fixture exactly (sorted keys, one-space indent,
  // ensure_ascii, one trailing newline) — the same law B1's growth
  // harvested under. A drift here would emit a fixture whose BYTES
  // no consumer's diff tools recognize.
  const raw = readFileSync(FIXTURE, "utf8");
  const out = ensureAsciiJson(JSON.parse(raw));
  if (out !== raw) {
    const at = [...out].findIndex((c, i) => c !== raw[i]);
    die(`self-check FAILED: re-serializing the committed fixture is not byte-identical ` +
      `(${out.length} vs ${raw.length} bytes, first diff at ${at})`);
  }
  console.log(`self-check OK: the emit serializer reproduces ${relative(FIXTURE)} byte-identical (${raw.length} bytes)`);
  process.exit(0);
}

if (!flag("--boot")) {
  // ── THE FACTS LEG (unchanged law, 2026-10-22) ──
  const engineFlag = args.indexOf("--engine");
  const engine = engineFlag >= 0 ? (args[engineFlag + 1] ?? "") : "http://127.0.0.1:8188";

  const facts = JSON.parse(readFileSync(FACTS, "utf8"));

  const res = await fetch(new URL("/object_info", engine)).catch(() => null);
  if (!res || !res.ok) die(`the engine at ${engine} does not answer /object_info — no vocabulary written`);
  const info = (await res.json());
  const classes = Object.keys(info).sort();
  if (!Array.isArray(classes) || classes.length === 0) die("the engine answered with no node classes");

  const prior = new Set([
    ...Object.values(facts.extension_node_types ?? {}).flat(),
    ...Object.values(facts.core_node_types ?? {}).flat(),
  ]);
  if (prior.size > 0) {
    const missing = [...prior].filter((c) => !classes.includes(c));
    if (missing.length > 0) {
      die(`the engine serves ${missing.length} class(es) the facts' pack inventories name — ` +
        `the engine is older than the facts, no vocabulary written: ${missing.slice(0, 5).join(", ")}`);
    }
  }

  facts.engine_node_types = classes;
  writeFileSync(FACTS, JSON.stringify(facts, null, 2) + "\n");
  console.log(`engine_node_types written: ${classes.length} classes from ${engine}`);
  process.exit(0);
}

// ── THE BOOT LEG (E8) ─────────────────────────────────────────────

const dryRun = flag("--dry-run");
const live = flag("--live");
const engineFlag = args.indexOf("--engine");
const engine = engineFlag >= 0 ? (args[engineFlag + 1] ?? "") : "http://127.0.0.1:8188";

// 1. THE CENSUS INPUT — live harvest or capture path.
let censusPath = DEFAULT_CENSUS;
let censusOrigin = "capture";
if (live) {
  const res = await fetch(new URL("/object_info", engine)).catch(() => null);
  if (!res || !res.ok) die(`--live: the engine at ${engine} does not answer /object_info — no census harvested`);
  const info = await res.json();
  const count = Object.keys(info).length;
  if (count === 0) die("--live: the engine answered with no node classes");
  if (!dryRun) writeFileSync(DEFAULT_CENSUS, JSON.stringify(info, null, 1) + "\n");
  censusPath = DEFAULT_CENSUS;
  censusOrigin = "live";
  console.log(`census harvested from ${engine}: ${count} classes -> ${relative(DEFAULT_CENSUS)}${dryRun ? " (dry-run: not written)" : ""}`);
} else {
  const override = value("--census");
  if (override !== undefined) {
    censusPath = resolve(override);
    if (!existsSync(censusPath)) die(`--census: ${override} does not exist`);
  } else if (!existsSync(censusPath)) {
    die(`the census capture ${relative(DEFAULT_CENSUS)} is absent — harvest one with --live while the lane is up`);
  }
}

const censusRaw = readFileSync(censusPath, "utf8");
const census = JSON.parse(censusRaw);
const censusClasses = new Set(Object.keys(census));
const censusStamp = {
  path: relative(censusPath),
  sha256: sha256(censusRaw),
  mtime_ms: statSync(censusPath).mtimeMs,
  class_count: censusClasses.size,
  origin: censusOrigin,
};

// 2. THE ADDRESS SET — compose every facts row's card (the probe).
const run = spawnSync(process.execPath, [
  "--experimental-strip-types", "--no-warnings", PROBE, "--facts", FACTS,
], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
if (run.error !== undefined) die(`the address-set probe failed to spawn: ${run.error.message}`);
if (run.status !== 0) {
  die(`the address-set probe exited ${run.status}: ${(run.stderr || "").trim().slice(0, 600)}`);
}
const manifestStart = run.stdout.indexOf("{");
if (manifestStart < 0) die(`the address-set probe printed no manifest: ${(run.stdout || "").trim().slice(0, 200)}`);
const manifest = JSON.parse(run.stdout.slice(manifestStart));
if (!Array.isArray(manifest.refused) || manifest.refused.length > 0) {
  die(`the address-set derivation is INCOMPLETE (${manifest.refused?.length ?? "?"} refused rows) — ` +
    `a partial fixture is never written; the dead-card wall owns these rows:\n  ${(manifest.refused ?? []).join("\n  ")}`);
}
const addressClasses = new Set(Object.keys(manifest.classes));

// 3. THE BOOTSTRAP RESIDUE — the receipted rows the probe's fill
// loop cannot reach (the walls' film-graph composes ride lane-gated
// branches). Curated in the committed seed file, one justification
// per row; a residue row the census no longer serves is a refusal.
const bootstrapRaw = readFileSync(BOOTSTRAP, "utf8");
const bootstrap = JSON.parse(bootstrapRaw);
const bootstrapRows = bootstrap.bootstrap ?? {};
const bootstrapOutsideCensus = Object.keys(bootstrapRows).filter((c) => !censusClasses.has(c));
if (bootstrapOutsideCensus.length > 0) {
  die(`the bootstrap residue names ${bootstrapOutsideCensus.length} class(es) the census does not serve — ` +
    `prune them from ${relative(BOOTSTRAP)} or harvest a fresher census: ${bootstrapOutsideCensus.join(", ")}`);
}
const fixtureClasses = new Set([...addressClasses, ...Object.keys(bootstrapRows)]);

// THE ADDRESS-SET CENSUS GATE: a card the facts serve can address a
// class the census does not (a pack not yet on the engine — the
// TextEncodeFibo2 seat, 2026-10-23). The bootstrap guard above voices
// its own class list; without this gate the diff at step 4 crashed
// with 'Cannot read properties of undefined (reading replace)' — an
// unnamed TypeError instead of a refusal. A partial fixture is never
// written; the refusal names every missing class and its cure (the
// engine must serve what the composed cards address).
const addressOutsideCensus = [...addressClasses].filter((c) => !censusClasses.has(c)).sort();
if (addressOutsideCensus.length > 0) {
  die(`the address set names ${addressOutsideCensus.length} class(es) the census does not serve — ` +
    `a card's pack is absent from the engine; no vocabulary written: ${addressOutsideCensus.join(", ")}`);
}

// 3.5 THE SANITIZE STEP (the exposure-audit cure, 2026-11-15): the
// census is a live machine capture; the double it feeds is a tracked
// file. Its combo rosters enumerate THIS machine's media directories
// (personal filenames) and third-party packs carry their own upstream
// prompt/tooltip prose — neither re-enters the tracked tree. Two
// structural masks, always on (a --no-sanitize escape would be the
// hole the audit closed):
//   M1 MEDIA-INPUT MASK — a combo whose detail carries an upload
//      marker (`*upload*` key, ComfyUI's disk-enumeration flag) lists
//      a machine media directory at boot; the sanitized-boot premise
//      is an EMPTY media-input tree, so the roster emits empty.
//   M2 THIRD-PARTY ROSTER MASK — a non-melite custom_node pack's
//      option rosters and tooltip prose are upstream content; the
//      schema row (input names, types, groups) stays verbatim, the
//      content bytes do not ride. A COMFY_DYNAMICCOMBO_V3 head IS
//      schema: its declared option grid (option keys + typed inputs,
//      default/min/max/step) rides verbatim on third-party rows too
//      — the served-grid judges (h3 value-roundtrip ARM 51) diff
//      against that grid — and only its `tooltip` prose bytes are
//      stripped. Legacy rosters and upload-marker rosters still
//      empty (the original mask shape).
// The derivation wall byte-judges both masks on the fixture.
const isThirdPartyPack = (pythonModule) =>
  typeof pythonModule === "string" && pythonModule.startsWith("custom_nodes.") &&
  !pythonModule.startsWith("custom_nodes.melite-");
const comboRoster = (spec) => {
  // both /object_info combo spellings: a legacy array roster head, or
  // a string head with the roster in the detail object
  if (Array.isArray(spec) && Array.isArray(spec[0])) return { roster: spec[0], detail: spec[1] };
  if (Array.isArray(spec) && typeof spec[0] === "string" && spec[1] !== null &&
      typeof spec[1] === "object" && Array.isArray(spec[1].options)) {
    return { roster: spec[1].options, detail: spec[1] };
  }
  return null;
};
const hasUploadMarker = (detail) => detail !== null && typeof detail === "object" &&
  Object.keys(detail).some((k) => /upload/i.test(k) && (detail[k] === true || typeof detail[k] === "string"));
/** A COMFY_DYNAMICCOMBO_V3 head carries the node's DECLARED option
 *  grid — option keys plus typed inputs (name, type, default/min/max/
 *  step) — the schema plane M2 keeps verbatim, never upstream prose.
 *  The grid's only prose bytes are `tooltip` keys inside each input's
 *  detail; stripV3Tooltips removes exactly those (the JJC_JoyCaption
 *  class the audit caught, now scoped to the prose, not the grid). */
const V3_COMBO_HEAD = "COMFY_DYNAMICCOMBO_V3";
const isV3Combo = (spec) => Array.isArray(spec) && spec[0] === V3_COMBO_HEAD;
const stripV3Tooltips = (detail) => {
  if (detail === null || typeof detail !== "object") return;
  const options = Array.isArray(detail.options) ? detail.options : [];
  for (const opt of options) {
    if (opt === null || typeof opt !== "object") continue;
    const inputs = opt.inputs;
    if (inputs === null || typeof inputs !== "object") continue;
    for (const group of ["required", "optional"]) {
      const groupInputs = inputs[group];
      if (groupInputs === null || typeof groupInputs !== "object") continue;
      for (const inputSpec of Object.values(groupInputs)) {
        if (Array.isArray(inputSpec) && inputSpec[1] !== null &&
            typeof inputSpec[1] === "object" && "tooltip" in inputSpec[1]) {
          delete inputSpec[1].tooltip;
        }
      }
    }
  }
};
const sanitizeRow = (row) => {
  const out = structuredClone(row);
  const thirdParty = isThirdPartyPack(out.python_module);
  for (const group of ["required", "optional"]) {
    const inputs = out.input?.[group];
    if (inputs === null || typeof inputs !== "object") continue;
    for (const spec of Object.values(inputs)) {
      const combo = comboRoster(spec);
      if (combo === null) continue;
      if (isV3Combo(spec)) {
        // the declared V3 grid is schema: it rides (third-party or
        // not), minus its tooltip prose; an upload marker on a V3
        // row is a disk enumeration wearing the grid spelling — the
        // M1 empty-roster law still applies over it
        if (hasUploadMarker(combo.detail)) {
          spec[1].options = [];
        } else if (thirdParty) {
          stripV3Tooltips(spec[1]);
        }
        continue;
      }
      if (hasUploadMarker(combo.detail) || thirdParty) {
        // the masked row is ALWAYS the modern spelling with an empty
        // roster: a legacy ARRAY head emptied in place would parse as
        // an enum PRESENT but EMPTY (the value judges refuse every
        // wired value against it), while an empty modern roster parses
        // as enum absent — the wiring judges only what the
        // declaration says (the parseInputSpec tolerated shape)
        if (Array.isArray(spec[0])) {
          spec[0] = "COMBO";
          spec[1] = { ...(combo.detail !== null && typeof combo.detail === "object" ? combo.detail : {}), options: [] };
        } else {
          spec[1].options = [];
        }
      }
    }
  }
  if (thirdParty && typeof out.description === "string") out.description = "";
  return out;
};
const sanitized = {};
for (const c of censusClasses) sanitized[c] = sanitizeRow(census[c]);
const sanitizedClasses = new Set(Object.keys(sanitized));

// 4. THE DIFF against the committed fixture, then the emit.
const priorFixtureRaw = readFileSync(FIXTURE, "utf8");
const priorFixture = JSON.parse(priorFixtureRaw);
const priorKeys = new Set(Object.keys(priorFixture));
const added = [...fixtureClasses].filter((c) => !priorKeys.has(c)).sort();
const pruned = [...priorKeys].filter((c) => !fixtureClasses.has(c)).sort();
const canonicalRow = (v) => ensureAsciiJson(v).replace(/\n$/, "");
const updated = [...fixtureClasses].filter((c) => priorKeys.has(c)
  && canonicalRow(priorFixture[c]) !== canonicalRow(sanitized[c])).sort();

const emitted = {};
for (const c of [...fixtureClasses].sort()) emitted[c] = sanitized[c];
// The emit is CANONICAL (sorted at every level). The frozen literal
// B1 grew by APPENDING (41 unsorted rows after the sorted 58), so the
// first derived regen canonicalizes the order — one-time, named here,
// consumer-proven by the scoped suites (JSON parse is order-blind).
const priorOrder = Object.keys(priorFixture);
const newOrderPriorOnly = Object.keys(emitted).filter((k) => priorKeys.has(k));
const reordered = priorOrder.filter((k, i) => newOrderPriorOnly[i] !== k).length;
const fixtureBytes = ensureAsciiJson(emitted);

const receipt = {
  derived_at: new Date().toISOString(),
  tool: "scripts/regen-node-vocab.mjs --boot",
  source: censusStamp,
  bootstrap_seed: {
    path: relative(BOOTSTRAP),
    sha256: sha256(bootstrapRaw),
    rows: Object.keys(bootstrapRows).length,
  },
  derivation: {
    facts_path: relative(FACTS),
    addressed_class_count: addressClasses.size,
    bootstrap_class_count: Object.keys(bootstrapRows).length,
    fixture_class_count: fixtureClasses.size,
    rows_probed: manifest.row_count,
    refused_rows: 0,
  },
  delta: { added, pruned, updated, reordered_keys: reordered },
};

console.log(`address set: ${addressClasses.size} classes (probed ${manifest.row_count} rows) + bootstrap residue ${Object.keys(bootstrapRows).length}`);
console.log(`fixture: ${fixtureClasses.size} classes — added ${added.length}, pruned ${pruned.length}, rows updated from census ${updated.length}`);
if (added.length) console.log(`  added: ${added.join(", ")}`);
if (pruned.length) console.log(`  pruned: ${pruned.join(", ")}`);
if (updated.length) console.log(`  updated: ${updated.length} rows (${updated.slice(0, 8).join(", ")}${updated.length > 8 ? ", ..." : ""})`);
if (reordered) console.log(`  canonicalized order: ${reordered} prior rows moved (one-time, the frozen literal grew appended-unsorted)`);

if (dryRun) {
  console.log("dry-run: nothing written");
  process.exit(0);
}
writeFileSync(FIXTURE, fixtureBytes);
writeFileSync(RECEIPT, JSON.stringify(receipt, null, 1) + "\n");
console.log(`fixture written: ${relative(FIXTURE)} (${fixtureBytes.length} bytes)`);
console.log(`receipt written: ${relative(RECEIPT)} (census ${censusStamp.sha256.slice(0, 12)}, ${censusStamp.class_count} classes, origin ${censusOrigin})`);
