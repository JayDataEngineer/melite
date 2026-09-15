/**
 * Regold: re-capture the frozen goldens from the CURRENT compose.
 *
 * The goldens are byte-frozen by doctrine — this tool exists only for
 * a sanctioned cause (the operator's ruling). Every run MUST be
 * followed by a causes.md entry in each touched .json.d directory
 * naming the cause; a regold without one is a doctrine violation.
 *
 * Usage: npx tsx scripts/regold-goldens.ts <name> [<name>...]
 * (names = tests/golden_cordis/video_h3-timeline_<name>)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder, deriveDefaults } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { carrier } from "../src/card.ts";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");
const GOLDEN_DIR = join(ROOT, "tests", "golden_cordis");
const FACTS_DIR = join(ROOT, "packages", "engines", "comfyui-cordis", "data");
const facts = loadFacts(join(FACTS_DIR, "model-facts.json"), { getModel, registryIds, registryModel });

const PIN_DEFAULTS = deriveDefaults(
  JSON.parse(readFileSync(join(FACTS_DIR, "object_info.json"), "utf8")),
) as ConstructorParameters<typeof GraphBuilder>[0];

interface Case { card: string; model: string; run_id: string; params: Record<string, unknown> }

const names = process.argv.slice(2);
if (!names.length) {
  console.error("regold: name required (tests/golden_cordis/video_h3-timeline_<name>)");
  process.exit(1);
}

const defs = await loadCardDefs();
for (const name of names) {
  const c = JSON.parse(readFileSync(join(GOLDEN_DIR, `video_h3-timeline_${name}.case.json`), "utf8")) as Case;
  const def = defs.get("h3-timeline")!;
  if (!def) throw new Error("the composition root serves the h3-timeline card");
  const model = facts.models["h3-timeline"]!;
  // mirrors card.spec replay(): carrier pre-fill + shift_video null
  const merged: Record<string, unknown> = {
    ...carrier({ interpolate_enabled: false }),
    shift_video: null,
    ...c.params,
  };
  const g = new GraphBuilder(PIN_DEFAULTS);
  def.compose(merged, model, g, c.run_id);
  const out = def.finalize!(g.toJSON());
  writeFileSync(join(GOLDEN_DIR, `video_h3-timeline_${name}.json`), JSON.stringify(out, null, 2) + "\n");
  console.log(`regold: video_h3-timeline_${name}.json written`);
}
