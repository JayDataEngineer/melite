// actions.ts — the flux-klein family's offered actions (the atom
// vocabulary): the t2i action the image-gen card binds. The DECL's
// lane_inputs stay the ONE facts door; the action's parser reads the
// RESOLVED merge (family ⊕ variant) into the closed typed shape, and
// the segment factory composes the official FLUX.2 Klein 4B template
// topology (comfyui-workflow-templates image_flux2_klein_*): the
// split loader trio, the stock CLIPTextEncode pair, the
// Flux2Scheduler/KSamplerSelect/CFGGuider/RandomNoise sampling stack,
// and the ReferenceLatent reference arm.
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { loadTextPair, decodeSave, stackLoras, isSpell } from "@melite/comfyui-card-kit";
import { fireLoras, refuseIPAdapterFiring } from "@melite/comfyui-card-kit/guard";
import { diffusionParamRows } from "@melite/comfyui-card-kit/paramRows";
import type { OutputHandle } from "@melite/comfyui-card-kit/graph";
import { parseDiffusionLaneFacts, parseLaneCap, type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

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
  readonly max_references: number;
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
  reference_images?: string[];
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
    max_references: parseLaneCap(raw, "max_references", "flux-klein t2i"),
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
 * THE REFERENCE ARM (006/U1, the reference-guided t2i lane Klein is
 * reference-native for): a stated reference_images list scales each
 * image to 1 megapixel (the official edit template's own scaling),
 * encodes it through the VAE, and chains ReferenceLatent onto the
 * positive conditioning; the FIRST reference's GetImageSize sizes the
 * canvas — width/height wire to nothing on this arm, the same
 * conditional the qwen-img-21 lane carries. */
export const t2i: ComfyActionSpec<T2IParams, T2IFacts> = {
  id: "t2i",
  inputs: [],
  outputs: [{ name: "image", kind: "IMAGE" }],
  // THE DECLARED SURFACE (the write plane): types and bounds are the
  // image-gen card schema's own — the family door judges defaults and
  // variant presets against this row; the sampler/scheduler closed
  // sets resolve from the ONE engine vocabulary, never hand-copied.
  params: [...diffusionParamRows(), { name: "reference_images", type: "image_list" }],
  facts: parseT2IFacts,
  build({ p, facts, model, g, runId }) {
    let unet: OutputHandle = g.node("UNETLoader", { unet_name: facts.unet, weight_dtype: "default" }).out();
    unet = stackLoras(g, unet, fireLoras(model, p));
    // THE IP-ADAPTER FIRING GATE: no t2i segment builds it in this
    // plane — every stated entry refuses LOUD before any node renders.
    refuseIPAdapterFiring(model, p);
    const { clip, vae } = loadTextPair(g, facts);
    // THE REFERENCE LIST (the qwen-img-21 lane's own law): blank
    // entries contribute no slot; a stated count past the DECL cap
    // refuses LOUD before any image loads — the TS plane maps every
    // stated image to a slot, never drops one quietly.
    const refs = (Array.isArray(p.reference_images) ? p.reference_images : []).filter((s) => s.trim() !== "");
    if (refs.length > facts.max_references) {
      throw new Error(`'reference_images' fires on the image-gen card (this lane takes ${facts.max_references} reference images — the list counts ${refs.length}; drop ${refs.length - facts.max_references}) — the TS plane maps every stated image to a slot, never drops one quietly`);
    }
    let positive: OutputHandle = g.node("CLIPTextEncode", { text: p.prompt, clip }).out();
    const negativeText = p.negative_prompt ?? "";
    const negative: OutputHandle = negativeText.trim() === ""
      ? g.node("ConditioningZeroOut", { conditioning: positive }).out()
      : g.node("CLIPTextEncode", { text: negativeText, clip }).out();
    // The canvas: card resolution, or the first reference's own size
    // (numbers before handles — the same slot takes either; the
    // reference arm reassigns both).
    let width: number | OutputHandle = p.width;
    let height: number | OutputHandle = p.height;
    for (const [i, ref] of refs.entries()) {
      const image: string | OutputHandle = isSpell(ref)
        ? ref
        : g.node("LoadImage", { image: ref, upload: "image" }).out(0);
      const scaled = g.node("ImageScaleToTotalPixels", { upscale_method: "nearest-exact", megapixels: 1, image });
      if (i === 0) {
        const size = g.node("GetImageSize", { image: scaled.out() });
        width = size.out(0);
        height = size.out(1);
      }
      const encoded = g.node("VAEEncode", { pixels: scaled.out(), vae });
      positive = g.node("ReferenceLatent", { conditioning: positive, latent: encoded.out() }).out();
    }
    const latent = g.node("EmptyFlux2LatentImage", { width, height, batch_size: 1 }).out();
    // THE FLUX.2 SAMPLING STACK (the official template's own): the
    // scheduler computes the empirical time-SNR shift from steps and
    // the canvas; the stock scheduler knob declares the card domain
    // but wires nothing on this lane.
    const sigmas = g.node("Flux2Scheduler", { steps: p.steps, width, height }).out();
    const sampler = g.node("KSamplerSelect", { sampler_name: p.sampler }).out();
    const noise = g.node("RandomNoise", { noise_seed: p.seed }).out();
    const guider = g.node("CFGGuider", { cfg: p.cfg, model: unet, positive, negative }).out();
    const sampled = g.node("SamplerCustomAdvanced", { noise, guider, sampler, sigmas });
    return decodeSave(g, sampled.out(0), vae, `${runId}/gen`).out();
  },
};
