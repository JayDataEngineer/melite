// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the tag action the tagger card binds. The lane's facts
// door is WEIGHTLESS — the DECL declares the managed beta-one tree
// (lane_inputs.model_path, the ghost/run-gate planes), but the
// ACTION parses nothing (parseWeightlessFacts is vacuous: every
// wire value comes from params); the checkpoint rides the variant
// rail's stamped param (upstream takes any repo id or local path —
// the family default stamps beta-one).
// The segment factory is the joycaption arm of the legacy taggerLane
// verbatim — byte-identical graphs on the same doc (proven in
// tests/action.spec.ts). Creation order IS node-id order (the
// recipe law).
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { taggerSaveText, TAGGER_CAPTION_LENGTHS, TAGGER_CAPTION_TYPES, TAGGER_EXTRA_OPTIONS, parseWeightlessFacts, assertTagInput, type WeightlessFacts, type WeightlessParams } from "@melite/comfyui-card-kit";


/** The image prompt-inversion action: the JoyCaption VLM — LoadImage
 * (or the wired spell), the model loader, JJC_JoyCaption on the
 * caption template, SaveText under <run>/tags. */
export const tag: ComfyActionSpec<WeightlessParams, WeightlessFacts> = {
  id: "tag",
  inputs: [],
  outputs: [{ name: "text", kind: "TEXT" }],
  // THE DECLARED SURFACE (the write plane, phase 2): the tagger
  // card schema's own types and bounds — the family door judges
  // defaults and variant presets against this row. The closed sets
  // resolve from the ONE kit vocabularies, never hand-copied;
  // checkpoint is admitted (the family default stamps it, the
  // upstream takes any repo id or local path), and the family door
  // judges the stamp as a string.
  params: [
    { name: "input_image", type: "string" },
    { name: "checkpoint", type: "string" },
    { name: "caption_type", type: "enum", options: TAGGER_CAPTION_TYPES },
    { name: "caption_length", type: "enum", options: TAGGER_CAPTION_LENGTHS },
    { name: "extra_option", type: "enum", options: TAGGER_EXTRA_OPTIONS },
  ],
  facts: parseWeightlessFacts,
  build({ p, g, runId }) {
    const img = assertTagInput(p);
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
