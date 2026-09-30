// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the edit action the image-edit card binds. The DECL's
// lane_inputs stay the ONE facts door; the parser reads the RESOLVED
// merge (family ⊕ variant) into the closed typed shape, and the
// segment factory composes the 2.1 edit lane — QwenImage21Cache (the
// reference-prefix KV cache around the base unet) +
// TextEncodeQwenImage21 on the anchor images through its image_N
// autogrow slots → EmptyLatentImage at target resolution → KSampler
// → decode/save under <run>/edit — byte-identical to the legacy
// imageEdit 2.1 arm (proven in tests/action.spec.ts). Creation order
// IS node-id order (the recipe law). The params doc stays the card's
// walked shape: this arm reads the one-list merge (input_images,
// legacy spellings), the mask bag, and the region row beneath flat
// params, so the doc is loose by contract — admission is the card's
// schema walk, never re-judged here.
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { loadTextPair, decodeSave, stackLoras, orderedInputImages, regionSegs, detailerSave, isSpell, laneSampler, laneScheduler, type TensorRef } from "@melite/comfyui-card-kit";
import { fireLoras } from "@melite/comfyui-card-kit/guard";
import type { OutputHandle } from "@melite/comfyui-card-kit/graph";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
import { SAMPLER_OPTIONS, SCHEDULER_OPTIONS } from "@melite/comfyui-card-kit/vocab";

/** The closed facts shape the 2.1 edit segment reads. */
export type EditFacts = {
  readonly unet: string;
  readonly text_encoder: string;
  readonly vae: string;
  readonly clip_type: string;
  readonly text_encode_node: "TextEncodeQwenImage21";
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
  const text = (key: string): string => {
    const value = raw[key];
    if (typeof value !== "string" || value === "") {
      throw new Error(`qwen-img-edit-21 edit: lane_inputs.${key} = ${JSON.stringify(value)} — a non-empty string is required`);
    }
    return value;
  };
  const node = raw.text_encode_node;
  if (node !== "TextEncodeQwenImage21") {
    throw new Error(
      `qwen-img-edit-21 edit: lane_inputs.text_encode_node = ${JSON.stringify(node)} — this family's edit action builds on TextEncodeQwenImage21`,
    );
  }
  const cap = raw.max_images;
  if (typeof cap !== "number" || !Number.isFinite(cap) || cap < 1) {
    throw new Error(`qwen-img-edit-21 edit: lane_inputs.max_images = ${JSON.stringify(cap)} — a number ≥ 1 is required`);
  }
  return {
    unet: text("unet"),
    text_encoder: text("text_encoder"),
    vae: text("vae"),
    clip_type: text("clip_type"),
    text_encode_node: node,
    max_images: Math.floor(cap),
  };
}

/** The edit action: the cached-reference lane — loaders → lora
 *  stack → text pair → per-slot LoadImage anchors →
 *  QwenImage21Cache + TextEncodeQwenImage21 (pos+neg from one node,
 *  refs on the images.image_N autogrow slots) → EITHER the region
 *  detailer tail (mask_mode crop_stitch) OR EmptyLatentImage at
 *  target resolution → KSampler → decode + save under <run>/edit. */
export const edit: ComfyActionSpec<EditParams, EditFacts> = {
  id: "edit",
  inputs: [],
  outputs: [{ name: "image", kind: "IMAGE" }],
  // THE DECLARED SURFACE (the write plane, phase 2): the
  // image-edit card schema's own types and bounds — the family
  // door judges defaults and variant presets against this row;
  // the closed sets resolve from the ONE engine vocabulary. The
  // lanpaint knobs are mod-owned (the advanced tier) and ride the
  // mod plane, not this surface.
  params: [
    { name: "input_images", type: "image_list" },
    { name: "image1", type: "string" },
    { name: "image2", type: "string" },
    { name: "image3", type: "string" },
    { name: "reference_images", type: "image_list" },
    { name: "prompt", type: "string" },
    { name: "negative_prompt", type: "string" },
    { name: "width", type: "number" },
    { name: "height", type: "number" },
    { name: "seed", type: "number", rule: "seed-sentinel" },
    { name: "steps", type: "number", bounds: [1, 50] },
    { name: "cfg", type: "number", bounds: [0.1, 10] },
    { name: "sampler", type: "enum", options: SAMPLER_OPTIONS },
    { name: "scheduler", type: "enum", options: SCHEDULER_OPTIONS },
    { name: "use_stock_nodes", type: "boolean" },
    { name: "double_reference", type: "boolean" },
  ],
  facts: parseEditFacts,
  build({ p, facts, model, g, runId }) {
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
      : g.node("LoadImage", { image: anchor, upload: "image" }).out(0);
    // Each stated ref loads ahead of the encodes (creation order IS
    // node-id order); blank refs contribute no input at all. A
    // spelled ref rides verbatim — same wired-tensor law as the
    // anchor; a file keeps its LoadImage.
    const loaded: TensorRef[] = refs.map((s) =>
      isSpell(s) ? s : g.node("LoadImage", { image: s, upload: "image" }).out(0));
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
    // The 2.1 base has NO separate edit weights: the edit rides
    // QwenImage21Cache (the reference-prefix KV cache wrapped
    // around the SAME unet) + TextEncodeQwenImage21 conditioned on
    // the anchor images through its own image_N autogrow slots,
    // sampled on an EmptyLatentImage at the TARGET resolution (the
    // official template graph). vae rides the encoder's optional
    // input (reference latents splice); one encoder node emits
    // pos+neg.
    const cached = g.node("QwenImage21Cache", { model: unet, device: "auto", dtype: "default" }).out();
    // THE AUTOGROW KEYS (the live v0.37 law, proven on the engine:
    // execute(clip, prompt, negative_prompt, vae, resolution,
    // images) — the slots ride DOTTED 'images.image_N' node-input
    // keys, the executor's dynamic-path split nests them into the
    // images dict; a bare 'image_1' reaches execute() as a kwarg
    // and dies).
    const images21: Record<string, TensorRef> = { "images.image_1": image };
    // THE ORDER RIDES CONTIGUOUSLY: refs map onto images.image_2+
    // in order — no gaps, no second concept (the ceiling above
    // already enforced the DECL cap).
    loaded.forEach((ref, i) => {
      images21[`images.image_${2 + i}`] = ref;
    });
    const enc21 = g.node("TextEncodeQwenImage21", {
      clip, vae, prompt: p.prompt, negative_prompt: p.negative_prompt ?? "", resolution: 1024,
      ...images21,
    });
    // THE REGION DETAILER: the SAME generic arm as the 2511 tail,
    // riding THIS lane's own model and conditioning (the
    // reference vision tokens live in the conditioning — each crop
    // edits against the anchor, the plain arm's contract). No
    // EmptyLatentImage on this path: DetailerForEach encodes and
    // sizes each crop itself (width/height would wire to nothing —
    // the card's gate refuses them field-named).
    if (cropStitch) {
      const segs = regionSegs(g, merged, image, maskPath);
      return detailerSave(g, p, merged, {
        image, segs, model: cached, clip, vae,
        positive: enc21.out(0), negative: enc21.out(1), seed,
      }, runId).out();
    }
    const latent21 = g.node("EmptyLatentImage", {
      batch_size: 1,
      width: ((p.width as number | undefined) ?? 1024),
      height: ((p.height as number | undefined) ?? 1024),
    });
    const sampled21 = g.node("KSampler", {
      seed,
      steps: p.steps,
      cfg: p.cfg,
      sampler_name: laneSampler(p),
      scheduler: laneScheduler(p),
      denoise: 1.0,
      latent_image: latent21.out(),
      model: cached,
      positive: enc21.out(0),
      negative: enc21.out(1),
    });
    return decodeSave(g, sampled21.out(), vae, `${runId}/edit`).out();
  },
};
