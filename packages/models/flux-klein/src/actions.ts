// actions.ts — the flux-klein family's offered actions (the atom
// vocabulary): the t2i action the image-gen card binds. The DECL's
// lane_inputs stay the ONE facts door; the action's parser reads the
// RESOLVED merge (family ⊕ variant) into the closed typed shape, and
// the segment factory composes the official FLUX.2 Klein 4B template
// topology (comfyui-workflow-templates image_flux2_klein_*): the
// split loader trio, the stock CLIPTextEncode pair, the
// Flux2Scheduler/KSamplerSelect/CFGGuider/RandomNoise sampling stack.
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { loadTextPair, decodeSave, stackLoras } from "@melite/comfyui-card-kit";
import { fireLoras, refuseIPAdapterFiring } from "@melite/comfyui-card-kit/guard";
import { diffusionParamRows } from "@melite/comfyui-card-kit/paramRows";
import type { OutputHandle } from "@melite/comfyui-card-kit/graph";
import { parseDiffusionLaneFacts, type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

/** The closed facts shape the t2i segment reads. `text_encode_node`
 *  is the branch key as a TYPE: this action encodes through the stock
 *  CLIPTextEncode over the flux2 multimodal tokenizer (CLIPLoader
 *  type "flux2"), and anything else at the door is drift, not a
 *  route. No sampling_shift: FLUX.2's shift is computed by the
 *  Flux2Scheduler node itself from steps and the canvas. */
export type T2IFacts = {
  readonly unet: string;
  readonly text_encoder: string;
  readonly vae: string;
  readonly clip_type: string;
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
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseT2IFacts(raw: LaneInputsFacts): T2IFacts {
  // shift=false: this lane declares no sampling_shift (the scheduler
  // node owns the empirical shift), so the door skips its check.
  const f = parseDiffusionLaneFacts(raw, "flux-klein t2i", { key: "text_encode_node", node: "CLIPTextEncode" }, false);
  return {
    unet: f.unet,
    text_encoder: f.text_encoder,
    vae: f.vae,
    clip_type: f.clip_type,
    text_encode_node: f.node,
  };
}

/** The text-to-image action: the official FLUX.2 Klein 4B template —
 * UNETLoader + CLIPLoader(flux2) + VAELoader, ONE CLIPTextEncode for
 * the prompt, EmptyFlux2LatentImage at card resolution, and the
 * advanced sampling stack (Flux2Scheduler → KSamplerSelect,
 * RandomNoise, CFGGuider, SamplerCustomAdvanced) the FLUX.2 sigmas
 * require. Creation order IS node-id order (the recipe law).
 *
 * THE NEGATIVE ARM (the distilled template's own law): a BLANK
 * negative_prompt composes ConditioningZeroOut over the positive —
 * the true unconditional the 4-step distilled checkpoint was trained
 * against (encoding an empty string through the 8GB tokenizer buys
 * nothing); a STATED negative_prompt encodes through CLIPTextEncode —
 * a stated negative is never dropped.
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
  // + the shared tail row (surface parity with qwen-img-21, the
  // wall's pin for this adopter). flux-klein's own graph takes no
  // references — its default workflow conditions through
  // ReferenceLatent only when an edit arms it — so a stated list
  // refuses at the card's phantom-port gate before this action
  // ever sees one.
  params: [...diffusionParamRows(), { name: "reference_images", type: "image_list" }],
  facts: parseT2IFacts,
  build({ p, facts, model, g, runId }) {
    let unet: OutputHandle = g.node("UNETLoader", { unet_name: facts.unet, weight_dtype: "default" }).out();
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
    // THE FLUX.2 SAMPLING STACK (the official template's own): the
    // scheduler computes the empirical time-SNR shift from steps and
    // the canvas; the stock scheduler knob declares the card domain
    // but wires nothing on this lane.
    const sigmas = g.node("Flux2Scheduler", { steps: p.steps, width: p.width, height: p.height }).out();
    const sampler = g.node("KSamplerSelect", { sampler_name: p.sampler }).out();
    const noise = g.node("RandomNoise", { noise_seed: p.seed }).out();
    const guider = g.node("CFGGuider", { cfg: p.cfg, model: unet, positive, negative }).out();
    const sampled = g.node("SamplerCustomAdvanced", { noise, guider, sampler, sigmas });
    return decodeSave(g, sampled.out(0), vae, `${runId}/gen`).out();
  },
};
