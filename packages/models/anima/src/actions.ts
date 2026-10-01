// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 2): the t2i action the image-gen card binds. The DECL's
// lane_inputs stay the ONE facts door; the parser reads the RESOLVED
// merge into the closed typed shape, and the segment factory
// composes the stock diffuse topology (CLIPTextEncode pair,
// EmptyLatentImage) through the kit's blocks — byte-identical to the
// legacy imageT2I stock arm (proven in tests/action.spec.ts).
// anima boards NO mods: every mod-plane call in this segment is a
// REFUSAL seat, none a graph path — a smuggled loras/controlnets/
// ip_adapters bag refuses loud in the guard, never silently drops
// (the wall law: the calls stay even though the picks are always
// empty). Creation order IS node-id order (the recipe law).
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { loadTextPair, decodeSave, stackLoras, stackControlNets } from "@melite/comfyui-card-kit";
import { fireLoras, fireControlNets, refuseIPAdapterFiring } from "@melite/comfyui-card-kit/guard";
import type { OutputHandle } from "@melite/comfyui-card-kit/graph";
import { requireText, type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
import { diffusionParamRows } from "@melite/comfyui-card-kit/paramRows";

/** The closed facts shape the t2i segment reads. `latent_node` is
 *  the latent class as a TYPE: this action builds the stock latent,
 *  and anything else at the door is drift, not a route. */
export type T2IFacts = {
  readonly unet: string;
  readonly text_encoder: string;
  readonly vae: string;
  readonly clip_type: string;
  readonly latent_node: "EmptyLatentImage";
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
  const text = (key: string): string => requireText(raw, key, "anima t2i");
  const node = raw.latent_node;
  if (node !== "EmptyLatentImage") {
    throw new Error(
      `anima t2i: lane_inputs.latent_node = ${JSON.stringify(node)} — the t2i action builds on EmptyLatentImage`,
    );
  }
  const shift = raw.sampling_shift;
  if (shift !== undefined && typeof shift !== "number") {
    throw new Error(`anima t2i: lane_inputs.sampling_shift = ${JSON.stringify(shift)} — a number is required`);
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
 *  encoder pair (positive + negative), EmptyLatentImage at card
 *  resolution, KSampler, decode + save under <run>/gen. */
export const t2i: ComfyActionSpec<T2IParams, T2IFacts> = {
  id: "t2i",
  inputs: [],
  outputs: [{ name: "image", kind: "IMAGE" }],
  // THE DECLARED SURFACE (the write plane, phase 2): the image-gen
  // card schema's own types and bounds — the family door judges
  // defaults and variant presets against this row; the closed sets
  // resolve from the ONE engine vocabulary, never hand-copied.
  params: [...diffusionParamRows()],
  facts: parseT2IFacts,
  build({ p, facts, model, g, runId }) {
    let unet: OutputHandle = g.node("UNETLoader", { unet_name: facts.unet, weight_dtype: "default" }).out();
    if (facts.sampling_shift) {
      unet = g.node("ModelSamplingAuraFlow", { model: unet, shift: facts.sampling_shift }).out();
    }
    // anima boards no loras: a stated bag refuses loud in fireLoras;
    // the empty picks build the bare model, byte-stable.
    unet = stackLoras(g, unet, fireLoras(model, p));
    // THE IP-ADAPTER FIRING GATE: no t2i segment builds it in this
    // plane — every stated entry refuses LOUD before any node renders.
    refuseIPAdapterFiring(model, p);
    const { clip, vae } = loadTextPair(g, facts);
    // The refusal seat for controlnets (ADVANCED-PARAMETER
    // vocabulary, mod-level owned; anima boards no pack, the picks
    // are always empty — the call stays so a stated bag refuses).
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
