// regen-node-vocab — regenerate the facts' derived node vocabulary
// from the live engine (2026-10-22, the dead-card wall's inventory
// leg; roadmap: the LIVE-PROVEN floor retires into this block).
//
// GET /object_info is the engine's own answer to "which node classes
// do you serve" — the ground truth the per-pack inventories in
// extension_node_types approximate (hers staleness left the wall a
// hand-listed LIVE_PROVEN floor). This script reads the engine and
// writes the sorted class list into model-facts.json as
// engine_node_types. It never writes a partial or empty list: an
// engine that does not answer, or answers with fewer classes than
// the facts' pack inventories name, is a REFUSAL — a shrunken
// vocabulary would red every card composing a real class.
//
// Run: node scripts/regen-node-vocab.mjs [--engine http://127.0.0.1:8188]
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const engineFlag = args.indexOf("--engine");
const engine = engineFlag >= 0 ? (args[engineFlag + 1] ?? "") : "http://127.0.0.1:8188";
const FACTS = new URL("../packages/engines/comfyui-cordis/data/model-facts.json", import.meta.url);

const die = (msg) => {
  console.error("REFUSED: " + msg);
  process.exit(2);
};

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
