// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 2): the t2i action the image-gen card binds. The DECL's
// lane_inputs stay the ONE facts door; the parser reads the RESOLVED
// merge (family ⊕ variant — the raw route's re-spelled unet rides
// here) into the closed typed shape, and the segment factory
// composes the stock diffuse topology (CLIPTextEncode pair,
// EmptySD3LatentImage) through the kit's load/save/stack blocks —
// byte-identical to the legacy imageT2I stock arm (proven in
// tests/action.spec.ts). Creation order IS node-id order (the
// recipe law). The lane_inputs keys this segment never reads
// (unet_variant, checkpoint, … the GAP-7 blanks) ride unvalidated;
// the action that reads them declares its own door.
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { loadTextPair, decodeSave, stackLoras, stackControlNets } from "@melite/comfyui-card-kit";
import { fireLoras, fireControlNets, refuseIPAdapterFiring } from "@melite/comfyui-card-kit/guard";
import type { OutputHandle } from "@melite/comfyui-card-kit/graph";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

/** The closed facts shape the t2i segment reads. `latent_node` is
 *  the latent class as a TYPE: this action builds the SD3-shaped
 *  latent, and anything else at the door is drift, not a route. */
export type T2IFacts = {
  readonly unet: string;
  readonly text_encoder: string;
  readonly vae: string;
  readonly clip_type: string;
  readonly latent_node: "EmptySD3LatentImage";
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
 *  closed shape. A drifted latent class refuses here, never
 *  silently routes to another topology. `sampling_shift: 0` is
 *  present-and-inert (truthiness keeps the AuraFlow node out —
 *  the resolved row spells 0, the segment builds nothing).
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseT2IFacts(raw: LaneInputsFacts): T2IFacts {
  const text = (key: string): string => {
    const value = raw[key];
    if (typeof value !== "string" || value === "") {
      throw new Error(`krea-2 t2i: lane_inputs.${key} = ${JSON.stringify(value)} — a non-empty string is required`);
    }
    return value;
  };
  const node = raw.latent_node;
  if (node !== "EmptySD3LatentImage") {
    throw new Error(
      `krea-2 t2i: lane_inputs.latent_node = ${JSON.stringify(node)} — the t2i action builds on EmptySD3LatentImage`,
    );
  }
  const shift = raw.sampling_shift;
  if (shift !== undefined && typeof shift !== "number") {
    throw new Error(`krea-2 t2i: lane_inputs.sampling_shift = ${JSON.stringify(shift)} — a number is required`);
  }
  return {
    unet: text("unet"),
    text_encoder: text("text_encoder"),
    vae: text("vae"),
    clip_type: text("clip_type"),
    latent_node: node,
    sampling_shift: shift,
  };
}

/** The text-to-image action: the stock diffuse topology — CLIP
 *  encoder pair (positive + negative), EmptySD3LatentImage at card
 *  resolution, KSampler, decode + save under <run>/gen. The
 *  controlnet stack call is the REFUSAL seat for krea-2 (it boards
 *  loras only): a stated controlnet bag refuses loud in
 *  fireControlNets; the picks are always empty and the bare model
 *  is byte-stable. */
export const t2i: ComfyActionSpec<T2IParams, T2IFacts> = {
  id: "t2i",
  outputs: [{ name: "image", kind: "IMAGE" }],
  params: [{ name: "seed", rule: "seed-sentinel" }],
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
    // The mod plane's gate (controlnets is ADVANCED-PARAMETER
    // vocabulary, mod-level owned): empty picks build the bare
    // model, byte-stable; a stated bag on a family not boarding the
    // pack refuses in the firing gate, never silently drops.
    unet = stackControlNets(g, unet, vae, fireControlNets(model, p));
    const pos = g.node("CLIPTextEncode", { clip, text: p.prompt });
    const neg = g.node("CLIPTextEncode", { clip, text: p.negative_prompt ?? "" });
    const latent = g.node(facts.latent_node, { batch_size: 1, width: p.width, height: p.height });
    const sampled = g.node("KSampler", {
      seed: p.seed,
      steps: p.steps,
      cfg: p.cfg,
      sampler_name: p.sampler,
      scheduler: p.scheduler,
      denoise: 1.0,
      latent_image: latent.out(),
      model: unet,
      positive: pos.out(),
      negative: neg.out(),
    });
    return decodeSave(g, sampled.out(), vae, `${runId}/gen`).out();
  },
};
