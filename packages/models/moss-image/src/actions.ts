// actions.ts — the moss-image family's offered actions (the atom
// vocabulary): the t2i action the image-gen card binds. The DECL's
// lane_inputs stay the ONE facts door; the action's parser reads the
// RESOLVED merge (family ⊕ variant ⊕ cell) into the closed typed
// shape, and the segment factory composes the official MOSS-Image
// template topology (the Comfy-Org MOSS workflow): the split loader
// trio over the moss tokenizer, the stock CLIPTextEncode pair, the
// declared ModelSamplingAuraFlow shift, and the
// Flux2Scheduler/KSamplerSelect/CFGGuider/RandomNoise sampling stack.
//
// NO SkipLayerGuidanceDiTSimple arm: the template offers it as an
// OPTIONAL refinement (skip-layer 22) and the hermetic engine's
// boot roster carries no such class — the declared surface is the
// template without the optional arm, so the graph never emits a
// class the engine would refuse.
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { loadTextPair, decodeSave, stackLoras } from "@melite/comfyui-card-kit";
import { fireLoras, refuseIPAdapterFiring } from "@melite/comfyui-card-kit/guard";
import { diffusionParamRows } from "@melite/comfyui-card-kit/paramRows";
import type { OutputHandle } from "@melite/comfyui-card-kit/graph";
import { parseDiffusionLaneFacts, type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

/** The closed facts shape the t2i segment reads. `text_encode_node`
 *  is the branch key as a TYPE: this action encodes through the stock
 *  CLIPTextEncode over the moss tokenizer (CLIPLoader type
 *  "moss_image"), and anything else at the door is drift, not a
 *  route. The shift IS declared on this lane (5.0 — the template's
 *  own), so the door carries it and the build arms
 *  ModelSamplingAuraFlow on it. */
export type T2IFacts = {
  readonly unet: string;
  readonly text_encoder: string;
  readonly vae: string;
  readonly clip_type: string;
  readonly sampling_shift?: number;
  readonly text_encode_node: "CLIPTextEncode";
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
 *  @param raw the resolved lane_inputs (family ⊕ variant ⊕ cell)
 *  @returns the typed facts the segment factory reads */
export function parseT2IFacts(raw: LaneInputsFacts): T2IFacts {
  // shift defaults true: this lane DECLARES its sampling_shift
  // (5.0), and a non-numeric drift refuses at the door.
  const f = parseDiffusionLaneFacts(raw, "moss-image t2i", { key: "text_encode_node", node: "CLIPTextEncode" });
  return {
    unet: f.unet,
    text_encoder: f.text_encoder,
    vae: f.vae,
    clip_type: f.clip_type,
    sampling_shift: f.sampling_shift,
    text_encode_node: f.node,
  };
}

/** The text-to-image action: the official MOSS-Image template —
 * UNETLoader + the declared ModelSamplingAuraFlow shift + CLIPLoader
 * (moss_image) + VAELoader, the stock CLIPTextEncode pair,
 * EmptyFlux2LatentImage at card resolution, and the FLUX.2 advanced
 * sampling stack (Flux2Scheduler → KSamplerSelect, RandomNoise,
 * CFGGuider, SamplerCustomAdvanced) the latent space requires.
 * Creation order IS node-id order (the recipe law).
 *
 * THE NEGATIVE ARM: MOSS's SFT lane runs live guidance (CFG 3), so a
 * STATED negative_prompt encodes through CLIPTextEncode and bites; a
 * BLANK negative composes ConditioningZeroOut over the positive —
 * the true unconditional (encoding an empty string through the 9B
 * tokenizer buys nothing).
 *
 * No reference arm: the create card takes no reference inputs
 * (operator ruling, 2026-10-11) — a stated reference_images key
 * refuses at the card's gated resolve as an unknown param. */
export const t2i: ComfyActionSpec<T2IParams, T2IFacts> = {
  id: "t2i",
  inputs: [],
  outputs: [{ name: "image", kind: "IMAGE" }],
  // THE DECLARED SURFACE (the write plane): types and bounds are the
  // image-gen card schema's own — the family door judges defaults and
  // variant presets against this row; the sampler/scheduler closed
  // sets resolve from the ONE engine vocabulary, never hand-copied.
  params: [...diffusionParamRows()],
  facts: parseT2IFacts,
  build({ p, facts, model, g, runId }) {
    let unet: OutputHandle = g.node("UNETLoader", { unet_name: facts.unet, weight_dtype: "default" }).out();
    // THE DECLARED SHIFT (the krea-2 arm, truthiness-gated): the
    // moss lane pins 5.0, so the sampling model wraps here — the
    // inert 0 spelling would skip the arm.
    if (facts.sampling_shift) {
      unet = g.node("ModelSamplingAuraFlow", { model: unet, shift: facts.sampling_shift }).out();
    }
    unet = stackLoras(g, unet, fireLoras(model, p));
    // THE IP-ADAPTER FIRING GATE: no t2i segment builds it in this
    // plane — every stated entry refuses LOUD before any node renders.
    refuseIPAdapterFiring(model, p);
    const { clip, vae } = loadTextPair(g, facts);
    const positive: OutputHandle = g.node("CLIPTextEncode", { text: p.prompt, clip }).out();
    const negativeText = p.negative_prompt ?? "";
    const negative: OutputHandle = negativeText.trim() === ""
      ? g.node("ConditioningZeroOut", { conditioning: positive }).out()
      : g.node("CLIPTextEncode", { text: negativeText, clip }).out();
    const latent = g.node("EmptyFlux2LatentImage", { width: p.width, height: p.height, batch_size: 1 }).out();
    // THE FLUX.2 SAMPLING STACK (the klein lane's own): the
    // scheduler computes the sigma ladder from steps and the canvas;
    // the declared shift rode ModelSamplingAuraFlow above. The stock
    // scheduler knob declares the card domain but wires nothing on
    // this lane.
    const sigmas = g.node("Flux2Scheduler", { steps: p.steps, width: p.width, height: p.height }).out();
    const sampler = g.node("KSamplerSelect", { sampler_name: p.sampler }).out();
    const noise = g.node("RandomNoise", { noise_seed: p.seed }).out();
    const guider = g.node("CFGGuider", { cfg: p.cfg, model: unet, positive, negative }).out();
    // (burn, 2026-10-20: same dangling-latent class as the flux-klein
    // lane — the canvas rides here, never dangling.)
    const sampled = g.node("SamplerCustomAdvanced", { noise, guider, sampler, sigmas, latent_image: latent });
    return decodeSave(g, sampled.out(0), vae, `${runId}/gen`).out();
  },
};
