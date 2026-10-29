// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the edit action the image-edit card binds. The DECL's
// lane_inputs stay the ONE facts door; the parser reads the RESOLVED
// merge (family ⊕ variant) into the closed typed shape, and the
// segment factory composes the Fibo 2.0 edit lane — TextEncodeFibo2
// (positive AND negative from ONE node; the VAE seat splices
// reference latents into both conditionings; images ride the
// images.image_N autogrow slots) → KSampler on the ENCODER'S OWN
// emitted latent (its third output — trained-size, 128-channel) →
// decode/save under <run>/edit. Creation order IS node-id order
// (the recipe law). The params doc stays the card's walked shape:
// this arm reads the one-list merge (input_images, legacy
// spellings), the mask bag, and the region row beneath flat params,
// so the doc is loose by contract — admission is the card's schema
// walk, never re-judged here.
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { loadTextPair, decodeSave, stackLoras, orderedInputImages, regionSegs, detailerSave, isSpell, laneSampler, laneScheduler, deliverableSizeOf, refuseDeliverableSize, type TensorRef } from "@melite/comfyui-card-kit";
import { fireLoras } from "@melite/comfyui-card-kit/guard";
import type { OutputHandle } from "@melite/comfyui-card-kit/graph";
import { parseDiffusionLaneFacts, parseEditCap, type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
import { EDIT_DIFFUSION_BOUNDS, diffusionParamRows } from "@melite/comfyui-card-kit/paramRows";

/** The closed facts shape the Fibo 2.0 edit segment reads. */
export type EditFacts = {
  readonly unet: string;
  readonly text_encoder: string;
  readonly vae: string;
  readonly clip_type: string;
  readonly text_encode_node: "TextEncodeFibo2";
  readonly max_images: number;
};

/** The gated params doc the edit segment reads (the card's schema
 *  walk validated types and bounds; the bag/region rows ride beneath
 *  flat params exactly as the card schema declares them). */
export type EditParams = Record<string, unknown>;

/** The edit facts door: the resolved lane_inputs parsed into the
 *  closed shape. A drifted encoder class refuses here, never
 *  silently routes to another lane's topology. `max_images` is the
 *  node's own truth (16 total, anchor included) and floors at 1 —
 *  a degenerate cap is a DECL bug.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseEditFacts(raw: LaneInputsFacts): EditFacts {
  // The checks + refusal prose live in the kit (J3 consolidation,
  // 2026-10-18); this door projects the parsed core + the edit cap
  // into the family's own typed shape (B4).
  const f = parseDiffusionLaneFacts(raw, "fibo2-edit edit", { key: "text_encode_node", node: "TextEncodeFibo2" }, false);
  return { unet: f.unet, text_encoder: f.text_encoder, vae: f.vae, clip_type: f.clip_type, text_encode_node: f.node, max_images: parseEditCap(raw, "fibo2-edit edit") };
}

/** The edit action: the Fibo 2.0 lane — loaders → lora stack → text
 *  pair → per-slot LoadImage anchors → TextEncodeFibo2 (the vae seat
 *  connected: reference latents splice into BOTH conditionings; an
 *  empty negative rides the trained null caption) → EITHER the
 *  region detailer tail (mask_mode crop_stitch) OR KSampler on the
 *  encoder's own emitted latent → decode + save under <run>/edit. */
export const edit: ComfyActionSpec<EditParams, EditFacts> = {
  id: "edit",
  inputs: [],
  outputs: [{ name: "image", kind: "IMAGE" }],
  // THE DECLARED SURFACE (the write plane): the image-edit card
  // schema's own types and bounds — no use_stock_nodes/
  // double_reference (the qwen lanes' own tuning pair), no width/
  // height/batch (the latent law; the encoder's batch_size stays
  // pinned at 1 in the build).
  params: [
    { name: "input_images", type: "image_list" },
    { name: "image1", type: "string" },
    { name: "image2", type: "string" },
    { name: "image3", type: "string" },
    { name: "reference_images", type: "image_list" },
    ...diffusionParamRows(EDIT_DIFFUSION_BOUNDS),
    { name: "match_input_resolution", type: "boolean" },
  ],
  facts: parseEditFacts,
  build({ p, facts, model, g, runId }) {
    // THE SIZE DOOR (the resize order, operator 2026-11-12): the
    // shared deliverable-size refusal — the same law the firing gate
    // owns (match ON + stated refuses with the flip in the voice;
    // match OFF demands both integer axes ≥ 16). The NEVER-LIE
    // GUARD's blanket refusal died here (it threw on ANY stated pair
    // before the deliverable tail below ever ran).
    refuseDeliverableSize(p);
    // THE VARIANT PAIR IS NEVER SILENTLY SUBSTITUTED (the
    // required-defaults contract): steps and cfg are variant-class —
    // a family default may not stand in for a variant's face (dev
    // 30/5, turbo 8/1). Unstated on the served doc, they refuse loud
    // in the compose's own voice; a GraphBuilder drops an undefined
    // key and the engine would refuse the prompt with no name.
    if (p.steps === undefined || p.cfg === undefined) {
      throw new Error(`required param 'steps' missing on the image-edit card, and required param 'cfg' missing on the image-edit card — both are variant-class: the variant row carries its own pair (dev 30/5, edit-turbo 8/1) and a family default never substitutes for it; pick a variant (its resolver defaults stage the pair) or state both explicitly`);
    }
    const seed = p.seed as number;
    let unet: OutputHandle = g.node("UNETLoader", { unet_name: facts.unet, weight_dtype: "default" }).out();
    unet = stackLoras(g, unet, fireLoras(model, p));
    const { clip, vae } = loadTextPair(g, facts);
    // THE ONE LIST (the merge): orderedInputImages refuses mixed
    // vocabularies loud; the anchor is position 0, the references
    // are the rest. THE SHARED CEILING (the max_images law — ONE
    // check) counts the WHOLE list (anchor included) against the
    // DECL cap before any image loads — never drops quiet, never
    // orphans LoadImages. The card's anchor gate pins the empty
    // list; this re-pin covers direct action callers.
    const list = orderedInputImages(p);
    if (list.length === 0) {
      throw new Error(`required param 'input_images' missing on the image-edit card (the first image is the one being edited — the list cannot be empty; legacy drafts may state image1 alone instead)`);
    }
    const cap = facts.max_images;
    if (list.length > cap) {
      throw new Error(`'input_images' fires on the image-edit card (this lane takes ${cap} input images total — the first is the one being edited, ${cap - 1} references — but the list counts ${list.length}; drop ${list.length - cap}) — the TS plane maps every stated image to a slot, never drops one quietly`);
    }
    // THE SPELL ARM rides the anchor verbatim (the wired-tensor
    // law: a $name names a wired stage input, never a file);
    // files/URLs/estate paths keep the LoadImage handoff.
    const anchor = list[0];
    const refs = list.slice(1);
    const image: TensorRef = isSpell(anchor)
      ? anchor
      : g.node("LoadImage", { image: anchor }).out(0);
    // Each stated ref loads ahead of the encodes (creation order IS
    // node-id order); blank refs contribute no input at all. A
    // spelled ref rides verbatim — same wired-tensor law as the
    // anchor; a file keeps its LoadImage.
    const loaded: TensorRef[] = refs.map((s) =>
      isSpell(s) ? s : g.node("LoadImage", { image: s }).out(0));
    // THE REGION ROW (one merge — the gate's own merge twin): the
    // bag merges UNDER flat params (explicit flat keys win). One
    // region per run; the region arm below reads this row.
    const bag = Array.isArray(p.mask) ? (p.mask as Array<Record<string, unknown>>) : [];
    const merged: Record<string, unknown> = { ...p };
    const bagObj = bag.length === 1 && typeof bag[0] === "object" && bag[0] !== null ? bag[0] : null;
    if (bagObj) {
      for (const [k, v] of Object.entries(bagObj)) {
        if (merged[k] === undefined) merged[k] = v;
      }
    }
    const maskPath = ((merged.input_mask ?? "") as string).trim();
    const mode = (merged.mask_mode ?? "auto") as string;
    const cropStitch = (mode === "full_frame" ? "auto" : mode) === "crop_stitch";
    // THE ENCODER CALL (the family's whole conditioning seam): ONE
    // TextEncodeFibo2 emits positive (out 0) AND negative (out 1) —
    // an empty negative_prompt rides the model's trained null
    // caption, so CFG works without a stated negative. The vae seat
    // stays connected: the node splices reference latents into BOTH
    // conditionings (the reference image IS the edit's context).
    // Images ride the images.image_N autogrow slots contiguously —
    // anchor first, references in list order, cited in-prompt as
    // <image_N>. width/height stay at the node's 0 (the trained
    // size, the first image's aspect) and batch at 1: no edit lane
    // takes a stated size (the latent law), no batch face exists.
    const imagesFibo: Record<string, TensorRef> = { "images.image_1": image };
    for (let i = 0; i < loaded.length; i++) {
      imagesFibo[`images.image_${2 + i}`] = loaded[i]!;
    }
    const enc = g.node("TextEncodeFibo2", {
      clip, vae,
      prompt: p.prompt,
      negative_prompt: p.negative_prompt ?? "",
      width: 0,
      height: 0,
      batch_size: 1,
      ...imagesFibo,
    });
    // THE REGION DETAILER: the SAME generic arm as the qwen edit
    // tails, riding THIS lane's own model and conditioning (the
    // reference latents live in the conditioning — each crop edits
    // against the anchor, the plain arm's contract). No
    // EmptyLatentImage on this path: DetailerForEach encodes and
    // sizes each crop itself (width/height would wire to nothing —
    // the card's gate refuses them field-named).
    if (cropStitch) {
      const segs = regionSegs(g, merged, image, maskPath);
      return detailerSave(g, p, merged, {
        image, segs, model: unet, clip, vae,
        positive: enc.out(0), negative: enc.out(1), seed,
      }, runId, deliverableSizeOf(p)).out();
    }
    // THE ENCODER'S LATENT (the latent law, 2026-11-08): KSampler
    // samples enc's own third output — the node emits a 128-channel
    // zero latent at the trained size ("width/height 0 = the first
    // image's aspect at ~1MP"; any other size shifts the edit).
    // There is no stated size anymore: the output IS the trained
    // frame for the anchor's aspect.
    const sampled = g.node("KSampler", {
      seed,
      steps: p.steps,
      cfg: p.cfg,
      sampler_name: laneSampler(p),
      scheduler: laneScheduler(p),
      denoise: 1.0,
      latent_image: enc.out(2),
      model: unet,
      positive: enc.out(0),
      negative: enc.out(1),
    });
    return decodeSave(g, sampled.out(), vae, `${runId}/edit`, deliverableSizeOf(p)).out();
  },
};
