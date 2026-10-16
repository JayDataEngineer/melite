// actions.ts — the family's offered actions (the atom vocabulary's
// first declaration, the stroke-1 pilot: the t2i action the
// image-gen card binds). The DECL's lane_inputs stay the ONE facts
// door; the action's parser reads the RESOLVED merge (family ⊕
// variant — what the service hands compose) into the closed typed
// shape, and the segment factory composes the official 2.1 template
// topology through the kit's load/save blocks — byte-identical to
// the legacy lane arm (proven in tests/action.spec.ts). Extra
// lane_inputs keys the t2i segment never reads (latent_node,
// max_images — the edit lane's facts) ride unvalidated here; the
// action that reads them declares its own door.
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { loadTextPair, decodeSave, stackLoras, isSpell, type TensorRef } from "@melite/comfyui-card-kit";
import { fireLoras, refuseIPAdapterFiring } from "@melite/comfyui-card-kit/guard";
import { diffusionParamRows } from "@melite/comfyui-card-kit/paramRows";
import type { OutputHandle } from "@melite/comfyui-card-kit/graph";
import { parseDiffusionLaneFacts, type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

/** The closed facts shape the t2i segment reads. `text_encode_node`
 *  is the branch key as a TYPE: this action builds the 2.1 encoder
 *  graph, and anything else at the door is drift, not a route. */
export type T2IFacts = {
  readonly unet: string;
  readonly text_encoder: string;
  readonly vae: string;
  readonly clip_type: string;
  readonly text_encode_node: "TextEncodeQwenImage21";
  readonly sampling_shift?: number;
};

/** The gated params doc the t2i segment reads (the card's schema
 *  walk validated types and bounds — a same-process typed
 *  boundary). */
export type T2IParams = {
  prompt: string;
  negative_prompt?: string;
  width: number;
  height: number;
  seed: number;
  steps: number;
  cfg: number;
  sampler: string;
  scheduler: string;
  /** audit 004/C4 (2026-10-22): the family's own reference seat —
   *  the only t2i whose encoder reads references. Absent/empty
   *  keeps the bare-template graph. */
  reference_images?: string[];
};

/** The t2i facts door: the resolved lane_inputs parsed into the
 *  closed shape. An unknown encoder class refuses here, never
 *  silently routes to a stock lane.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseT2IFacts(raw: LaneInputsFacts): T2IFacts {
  // The checks + refusal prose live in the kit (J2 consolidation,
  // 2026-10-18); this door projects the parsed core into the
  // family's own typed shape (the self-containment contract, B4).
  const f = parseDiffusionLaneFacts(raw, "qwen-img-21 t2i", { key: "text_encode_node", node: "TextEncodeQwenImage21" });
  return {
    unet: f.unet,
    text_encoder: f.text_encoder,
    vae: f.vae,
    clip_type: f.clip_type,
    text_encode_node: f.node,
    sampling_shift: f.sampling_shift,
  };
}

/** The text-to-image action: the official 2.1 template — ONE
 *  TextEncodeQwenImage21 emitting positive (out 0) and negative
 *  (out 1), EmptyLatentImage at card resolution, KSampler, decode +
 *  save under <run>/gen. Creation order IS node-id order (the
 *  recipe law) and matches the legacy lane arm exactly. THE
 *  REFERENCE SEAT (audit 004/C4, 2026-10-22 — supersedes the
 *  2026-10-11 no-seat ruling): stated reference_images ride
 *  per-slot LoadImage anchors into the encoder's images.image_N
 *  autogrow slots (the edit lane's proven wiring) with vae on the
 *  encoder for the reference-latent splice; unstated keeps the
 *  bare-template graph byte-identical. */
export const t2i: ComfyActionSpec<T2IParams, T2IFacts> = {
  id: "t2i",
  inputs: [],
  outputs: [{ name: "image", kind: "IMAGE" }],
  // THE DECLARED SURFACE (the write plane, phase 2): types and
  // bounds are the image-gen card schema's own — the family door
  // judges defaults and variant presets against this row; the
  // sampler/scheduler closed sets resolve from the ONE engine
  // vocabulary, never hand-copied.
  // + the family's own tail row (audit 004/C4): the reference seat
  // rides AFTER the shared block — the edit families' own head/tail
  // rows are the precedent.
  params: [...diffusionParamRows(), { name: "reference_images", type: "image_list" }],
  facts: parseT2IFacts,
  build({ p, facts, model, g, runId }) {
    let unet: OutputHandle = g.node("UNETLoader", { unet_name: facts.unet, weight_dtype: "default" }).out();
    if (facts.sampling_shift) {
      unet = g.node("ModelSamplingAuraFlow", { model: unet, shift: facts.sampling_shift }).out();
    }
    unet = stackLoras(g, unet, fireLoras(model, p));
    // THE IP-ADAPTER FIRING GATE: no t2i segment builds it in this
    // plane — every stated entry refuses LOUD before any node renders.
    refuseIPAdapterFiring(model, p);
    const { clip, vae } = loadTextPair(g, facts);
    const encInputs: Record<string, unknown> = {
      clip,
      prompt: p.prompt,
      negative_prompt: p.negative_prompt ?? "",
      resolution: 1024,
    };
    // THE REFERENCE ARM (audit 004/C4): per-slot LoadImage anchors
    // onto the encoder's dotted images.image_N autogrow keys (the
    // executor's dynamic-path split nests them into the images
    // dict — a bare image_1 kwarg dies), vae on the encoder for the
    // splice. Creation order rides contiguous, no gaps.
    const refs = (p.reference_images ?? []).filter((r) => typeof r === "string" && r.trim() !== "");
    if (refs.length > 0) {
      encInputs.vae = vae;
      refs.forEach((ref, i) => {
        const loaded: TensorRef = isSpell(ref)
          ? ref
          : g.node("LoadImage", { image: ref }).out(0);
        encInputs[`images.image_${1 + i}`] = loaded;
      });
    }
    // ONE encoder node emits positive AND negative (outputs
    // [CONDITIONING, CONDITIONING, LATENT] — the negative rides out
    // index 1).
    const enc = g.node("TextEncodeQwenImage21", encInputs);
    const latent = g.node("EmptyLatentImage", { batch_size: 1, width: p.width, height: p.height });
    const sampled = g.node("KSampler", {
      seed: p.seed,
      steps: p.steps,
      cfg: p.cfg,
      sampler_name: p.sampler,
      scheduler: p.scheduler,
      denoise: 1.0,
      latent_image: latent.out(),
      model: unet,
      positive: enc.out(0),
      negative: enc.out(1),
    });
    return decodeSave(g, sampled.out(), vae, `${runId}/gen`).out();
  },
};
