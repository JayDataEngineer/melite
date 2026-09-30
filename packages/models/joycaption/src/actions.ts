// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the tag action the tagger card binds. The lane is
// WEIGHTLESS — no lane_inputs exist for this family, so the facts
// door is vacuous (nothing to parse, nothing to drift); the
// checkpoint rides the variant rail's stamped param (upstream takes
// any repo id or local path — the family default stamps beta-one).
// The segment factory is the joycaption arm of the legacy taggerLane
// verbatim — byte-identical graphs on the same doc (proven in
// tests/action.spec.ts). Creation order IS node-id order (the
// recipe law).
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { taggerSaveText } from "@melite/comfyui-card-kit";
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

/** The image prompt-inversion action: the JoyCaption VLM — LoadImage
 * (or the wired spell), the model loader, JJC_JoyCaption on the
 * caption template, SaveText under <run>/tags. */
export const tag: ComfyActionSpec<TagParams, TagFacts> = {
  id: "tag",
  outputs: [{ name: "text", kind: "TEXT" }],
  params: [],
  facts: parseTagFacts,
  build({ p, g, runId }) {
    const img = typeof p.input_image === "string" ? p.input_image : "";
    if (!img.trim()) {
      throw new Error("required param 'input_image' missing or blank on the tagger card (the tagger inverts an image; nothing to tag is a refusal)");
    }
    const src = img.startsWith("$") ? img : g.node("LoadImage", { image: img }).out();
    const predictor = g.node("JJC_DownloadAndLoadJoyCaptionModel", {
      model: p.checkpoint,
      memory_mode: "Default",
      keep_loaded: false,
    });
    const caption = g.node("JJC_JoyCaption", {
      model: predictor.out(),
      image: src,
      caption_type: p.caption_type,
      caption_length: p.caption_length,
      extra_option1: p.extra_option,
      extra_option2: "",
      extra_option3: "",
      extra_option4: "",
      extra_option5: "",
      person_name: "",
      max_new_tokens: 512,
      temperature: 0.6,
      top_p: 0.9,
      top_k: 0,
    });
    return taggerSaveText(g, caption.out(1), `${runId}/tags`).out();
  },
};
