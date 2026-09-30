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
import { taggerSaveText, TAGGER_CAPTION_TASKS } from "@melite/comfyui-card-kit";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

/** The closed facts shape the tag segment reads: nothing — the arm
 * is weightless (every wire value comes from params). */
export type TagFacts = Record<string, never>;

/** The gated params doc the tag segment reads (the card's schema
 * walk validated types and bounds — a same-process typed boundary;
 * the arm reads its own subset of the card's union surface). */
export type TagParams = Record<string, unknown>;

/** The weightless door: the family declares no lane_inputs, so
 * there is nothing to parse and nothing that can drift. The raw
 * view rides unvalidated by contract (absent ≡ {}).
 *  @param _raw the resolved lane_inputs (empty for this family)
 *  @returns the vacuous facts shape */
export function parseTagFacts(_raw: LaneInputsFacts): TagFacts {
  return {};
}

/** The image prompt-inversion action: the Florence-2 captioner —
 * LoadImage (or the wired spell), the fp16 model loader, Florence2Run
 * on the stated vision task, SaveText under <run>/tags. */
export const tag: ComfyActionSpec<TagParams, TagFacts> = {
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
  facts: parseTagFacts,
  build({ p, g, runId }) {
    const img = typeof p.input_image === "string" ? p.input_image : "";
    if (!img.trim()) {
      throw new Error("required param 'input_image' missing or blank on the tagger card (the tagger inverts an image; nothing to tag is a refusal)");
    }
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
