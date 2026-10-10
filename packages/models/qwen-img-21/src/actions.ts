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
import { loadTextPair, decodeSave, stackLoras, isSpell } from "@melite/comfyui-card-kit";
import { fireLoras, refuseIPAdapterFiring } from "@melite/comfyui-card-kit/guard";
import { diffusionParamRows } from "@melite/comfyui-card-kit/paramRows";
import type { OutputHandle } from "@melite/comfyui-card-kit/graph";
import { parseDiffusionLaneFacts, parseLaneCap, type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

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
    max_references: parseLaneCap(raw, "max_references", "qwen-img-21 t2i"),
  };
}

/** The text-to-image action: the official 2.1 template — ONE
 *  TextEncodeQwenImage21 emitting positive (out 0) and negative
 *  (out 1), EmptyLatentImage at card resolution, KSampler, decode +
 *  save under <run>/gen. Creation order IS node-id order (the recipe
 *  law) and matches the legacy lane arm exactly.
 *
 *  THE REFERENCE ARM (004/C4 — the phantom-port cure's return
 *  condition, read here): a stated reference_images list rides the
 *  encoder's own images.image_N autogrow slots (the dotted-key law,
 *  proven on the edit lane) with the vae splicing them into the
 *  sequence, and the latent comes from the encoder's THIRD output —
 *  sized by the node itself off the first reference (any other size
 *  shifts the sampling). width/height wire to nothing on this arm:
 *  the reference sizes the canvas, the same conditional the edit
 *  lane's region tail carries. */
export const t2i: ComfyActionSpec<T2IParams, T2IFacts> = {
  id: "t2i",
  inputs: [],
  outputs: [{ name: "image", kind: "IMAGE" }],
  // THE DECLARED SURFACE (the write plane, phase 2): types and
  // bounds are the image-gen card schema's own — the family door
  // judges defaults and variant presets against this row; the
  // sampler/scheduler closed sets resolve from the ONE engine
  // vocabulary, never hand-copied.
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
    // THE REFERENCE LIST (004/C4): blank entries contribute no slot;
    // a stated count past the DECL cap refuses LOUD before any image
    // loads — the TS plane maps every stated image to a slot, never
    // drops one quietly.
    const refs = (Array.isArray(p.reference_images) ? p.reference_images : []).filter((s) => s.trim() !== "");
    if (refs.length > facts.max_references) {
      throw new Error(`'reference_images' fires on the image-gen card (this lane takes ${facts.max_references} reference images — the list counts ${refs.length}; drop ${refs.length - facts.max_references}) — the TS plane maps every stated image to a slot, never drops one quietly`);
    }
    const encInputs: Record<string, unknown> = {
      clip,
      prompt: p.prompt,
      negative_prompt: p.negative_prompt ?? "",
      // the resolution input sizes reference images only (t2i with
      // no refs carries none — 1024 is the official template's
      // inert default).
      resolution: 1024,
    };
    if (refs.length > 0) {
      // Dotted images.image_N keys, contiguous from 1 (the live
      // autogrow law — the edit lane's proof); a spelled ref rides
      // verbatim (the wired-tensor law), a path keeps LoadImage.
      for (const [i, ref] of refs.entries()) {
        encInputs[`images.image_${1 + i}`] = isSpell(ref)
          ? ref
          : g.node("LoadImage", { image: ref, upload: "image" }).out(0);
      }
      encInputs.vae = vae;
      const enc = g.node("TextEncodeQwenImage21", encInputs);
      const sampled = g.node("KSampler", {
        seed: p.seed,
        steps: p.steps,
        cfg: p.cfg,
        sampler_name: p.sampler,
        scheduler: p.scheduler,
        denoise: 1.0,
        // the encoder's THIRD output: an empty latent sized by the
        // node itself off the first reference (out 2 — matching
        // sampling at any other size shifts the result).
        latent_image: enc.out(2),
        model: unet,
        positive: enc.out(0),
        negative: enc.out(1),
      });
      return decodeSave(g, sampled.out(), vae, `${runId}/gen`).out();
    }
    // ONE encoder node emits positive AND negative (outputs
    // [CONDITIONING, CONDITIONING, LATENT] — the negative rides out
    // index 1); no refs, no vae input, no reference-latent read.
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
