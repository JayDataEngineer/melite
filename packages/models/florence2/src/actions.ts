// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the tag action the tagger card binds. The lane is
// WEIGHTLESS — no lane_inputs exist for this family, so the facts
// door is vacuous (nothing to parse, nothing to drift); the
// checkpoint rides the variant rail's stamped param (upstream
// downloads on first run). The segment factory is the florence2 arm
// of the legacy taggerLane verbatim — byte-identical graphs on the
// same doc (proven in tests/action.spec.ts). Creation order IS
// node-id order (the recipe law).
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { taggerSaveText, TAGGER_CAPTION_TASKS, parseWeightlessFacts, assertTagInput, type WeightlessFacts, type WeightlessParams } from "@melite/comfyui-card-kit";


/** The image prompt-inversion action: the Florence-2 captioner —
 * LoadImage (or the wired spell), the fp16 model loader, Florence2Run
 * on the stated vision task, SaveText under <run>/tags. */
export const tag: ComfyActionSpec<WeightlessParams, WeightlessFacts> = {
  id: "tag",
  inputs: [],
  outputs: [{ name: "text", kind: "TEXT" }],
  // THE DECLARED SURFACE (the write plane, phase 2): the tagger
  // card schema's own types and bounds — the family door judges
  // defaults and variant presets against this row. The closed task
  // set resolves from the ONE kit vocabulary, never hand-copied;
  // checkpoint is admitted (the variant rail stamps it), not
  // rendered, and the family door judges the stamp as a string.
  params: [
    { name: "input_image", type: "string" },
    { name: "checkpoint", type: "string" },
    { name: "caption_task", type: "enum", options: TAGGER_CAPTION_TASKS },
  ],
  facts: parseWeightlessFacts,
  build({ p, g, runId }) {
    const img = assertTagInput(p);
    const src = img.startsWith("$") ? img : g.node("LoadImage", { image: img }).out();
    const fl2 = g.node("DownloadAndLoadFlorence2Model", {
      model: p.checkpoint,
      precision: "fp16",
    });
    const run = g.node("Florence2Run", {
      image: src,
      florence2_model: fl2.out(),
      text_input: "",
      task: p.caption_task,
      fill_mask: true,
    });
    return taggerSaveText(g, run.out(2), `${runId}/tags`).out();
  },
};
