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
import { loadTextPair, decodeSave, stackLoras } from "@melite/comfyui-card-kit";
import { fireLoras, refuseIPAdapterFiring } from "@melite/comfyui-card-kit/guard";
import { diffusionParamRows } from "@melite/comfyui-card-kit/paramRows";
import type { OutputHandle } from "@melite/comfyui-card-kit/graph";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

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
};

/** The t2i facts door: the resolved lane_inputs parsed into the
 *  closed shape. An unknown encoder class refuses here, never
 *  silently routes to a stock lane.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseT2IFacts(raw: LaneInputsFacts): T2IFacts {
  const text = (key: string): string => {
    const value = raw[key];
    if (typeof value !== "string" || value === "") {
      throw new Error(`qwen-img-21 t2i: lane_inputs.${key} = ${JSON.stringify(value)} — a non-empty string is required`);
    }
    return value;
  };
  const node = raw.text_encode_node;
  if (node !== "TextEncodeQwenImage21") {
    throw new Error(
      `qwen-img-21 t2i: lane_inputs.text_encode_node = ${JSON.stringify(node)} — the t2i action builds on TextEncodeQwenImage21`,
    );
  }
  const shift = raw.sampling_shift;
  if (shift !== undefined && typeof shift !== "number") {
    throw new Error(`qwen-img-21 t2i: lane_inputs.sampling_shift = ${JSON.stringify(shift)} — a number is required`);
  }
  return {
    unet: text("unet"),
    text_encoder: text("text_encoder"),
    vae: text("vae"),
    clip_type: text("clip_type"),
    text_encode_node: node,
    sampling_shift: shift,
  };
}

/** The text-to-image action: the official 2.1 template — ONE
 *  TextEncodeQwenImage21 emitting positive (out 0) and negative
 *  (out 1), EmptyLatentImage at card resolution, KSampler, decode +
 *  save under <run>/gen. Creation order IS node-id order (the recipe
 *  law) and matches the legacy lane arm exactly. */
export const t2i: ComfyActionSpec<T2IParams, T2IFacts> = {
  id: "t2i",
  inputs: [],
  outputs: [{ name: "image", kind: "IMAGE" }],
  // THE DECLARED SURFACE (the write plane, phase 2): types and
  // bounds are the image-gen card schema's own — the family door
  // judges defaults and variant presets against this row; the
  // sampler/scheduler closed sets resolve from the ONE engine
  // vocabulary, never hand-copied.
  params: [...diffusionParamRows()],
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
    // ONE encoder node emits positive AND negative (outputs
    // [CONDITIONING, CONDITIONING, LATENT] — the negative rides out
    // index 1); the resolution input sizes reference images only (t2i
    // carries none — 1024 is the official template's inert default).
    const enc = g.node("TextEncodeQwenImage21", {
      clip,
      prompt: p.prompt,
      negative_prompt: p.negative_prompt ?? "",
      resolution: 1024,
    });
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
