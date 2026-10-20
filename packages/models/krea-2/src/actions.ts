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
import { loadTextPair, decodeSave, stackLoras, stackControlNets, statedRegion, regionSegs, genDetailerSave } from "@melite/comfyui-card-kit";
import { fireLoras, fireControlNets, refuseIPAdapterFiring } from "@melite/comfyui-card-kit/guard";
import type { OutputHandle } from "@melite/comfyui-card-kit/graph";
import { parseDiffusionLaneFacts, type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
import { diffusionParamRows } from "@melite/comfyui-card-kit/paramRows";

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
  // The checks + refusal prose live in the kit (J2 consolidation,
  // 2026-10-18); this door projects the parsed core into the
  // family's own typed shape (the self-containment contract, B4).
  const f = parseDiffusionLaneFacts(raw, "krea-2 t2i", { key: "latent_node", node: "EmptySD3LatentImage" });
  return { unet: f.unet, text_encoder: f.text_encoder, vae: f.vae, clip_type: f.clip_type, latent_node: f.node, sampling_shift: f.sampling_shift };
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
    // THE GEN DETAILER (the gen detailer serve, operator 2026-11-07,
    // the mod SERVES): a stated region rides the crop_stitch arm —
    // the SAME generic DetailerForEach tail as the edit lanes, over
    // this lane's own conditioning — instead of the plain decode.
    // The card's gate already taught mode-without-region and
    // region-without-crop_stitch; the build branches on the kit's
    // ONE stated-region read, so gate and arm never disagree.
    const region = statedRegion(p as unknown as Record<string, unknown>);
    if (region !== null) {
      const decoded = g.node("VAEDecode", { samples: sampled.out(), vae }).out();
      const segs = regionSegs(g, region.merged, decoded, region.maskPath);
      return genDetailerSave(g, p as unknown as Record<string, unknown>, region.merged, {
        image: decoded, segs, model: unet, clip, vae,
        positive: pos.out(), negative: neg.out(), seed: p.seed,
      }, runId).out();
    }
    return decodeSave(g, sampled.out(), vae, `${runId}/gen`).out();
  },
};
