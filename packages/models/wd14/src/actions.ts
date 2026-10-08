// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the tag action the tagger card binds. The lane is
// WEIGHTLESS — no lane_inputs exist for this family, so the facts
// door is vacuous (nothing to parse, nothing to drift); the
// checkpoint rides the variant rail's stamped param. The segment
// factory is the wd14 arm of the legacy taggerLane verbatim —
// byte-identical graphs on the same doc (proven in
// tests/action.spec.ts). Creation order IS node-id order (the
// recipe law).
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { taggerSaveText, parseWeightlessFacts, assertTagInput, type WeightlessFacts, type WeightlessParams } from "@melite/comfyui-card-kit";


/** The image prompt-inversion action: the WD14 booru interrogator —
 * LoadImage (or the wired spell), WD14Tagger|pysssss at the
 * confidence floors, SaveText under <run>/tags. */
export const tag: ComfyActionSpec<WeightlessParams, WeightlessFacts> = {
  id: "tag",
  inputs: [],
  outputs: [{ name: "text", kind: "TEXT" }],
  // THE DECLARED SURFACE (the write plane, phase 2): the tagger
  // card schema's own types and bounds — the family door judges
  // defaults and variant presets against this row. checkpoint is
  // admitted (the variant rail stamps it), not rendered, and the
  // family door judges the stamp as a string.
  params: [
    { name: "input_image", type: "string" },
    { name: "checkpoint", type: "string" },
    { name: "threshold", type: "number", bounds: [0, 1] },
    { name: "character_threshold", type: "number", bounds: [0, 1] },
    { name: "exclude_tags", type: "string" },
    { name: "replace_underscore", type: "boolean" },
    { name: "trailing_comma", type: "boolean" },
  ],
  facts: parseWeightlessFacts,
  build({ p, g, runId }) {
    const img = assertTagInput(p);
    // THE SPELLED ANCHOR (same law — the arm bypasses the loader
    // for a wired image; the card admits the spell).
    const src = img.startsWith("$") ? img : g.node("LoadImage", { image: img }).out();
    const tags = g.node("WD14Tagger|pysssss", {
      image: src,
      model: p.checkpoint,
      threshold: p.threshold,
      character_threshold: p.character_threshold,
      replace_underscore: p.replace_underscore,
      trailing_comma: p.trailing_comma,
      exclude_tags: p.exclude_tags,
    });
    return taggerSaveText(g, tags.out(0), `${runId}/tags`).out();
  },
};
