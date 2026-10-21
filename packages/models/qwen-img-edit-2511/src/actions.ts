// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the edit action the image-edit card binds. The DECL's
// lane_inputs stay the ONE facts door; the parser reads the RESOLVED
// merge (family ⊕ variant — lightning's re-spelled unet rides here)
// into the closed typed shape, and the segment factory composes the
// 2511 edit lane — the stock TextEncodeQwenImageEditPlus pair,
// ModelSamplingAuraFlow fixed at shift 1.0 (template-pinned lane
// graph), then EITHER the lanpaint arm (input_mask stated → mask
// prep → LanPaint_ImageEncode → LanPaint_KSamplerAdvanced →
// LanPaint_ImageDecode) OR the crop_stitch region detailer OR the
// plain VAEEncode-of-source → KSampler → decode/save under
// <run>/edit — byte-identical to the legacy imageEdit 2511 arm
// (proven in tests/action.spec.ts). Creation order IS node-id order
// (the recipe law). The params doc stays the card's walked shape
// (the one-list merge, the mask bag, the region row beneath flat
// params) — admission is the card's schema walk, never re-judged
// here.
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { loadTextPair, decodeSave, stackLoras, orderedInputImages, regionSegs, detailerSave, isSpell, laneSampler, laneScheduler, type TensorRef } from "@melite/comfyui-card-kit";
import { fireLoras } from "@melite/comfyui-card-kit/guard";
import type { OutputHandle } from "@melite/comfyui-card-kit/graph";
import { parseDiffusionLaneFacts, parseEditCap, type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
import { EDIT_DIFFUSION_BOUNDS, diffusionParamRows } from "@melite/comfyui-card-kit/paramRows";

/** The closed facts shape the 2511 edit segment reads. */
export type EditFacts = {
  readonly unet: string;
  readonly text_encoder: string;
  readonly vae: string;
  readonly clip_type: string;
  readonly text_encode_node: "TextEncodeQwenImageEditPlus";
  readonly max_images: number;
};

/** The gated params doc the edit segment reads (the card's schema
 *  walk validated types and bounds; the bag/region rows ride beneath
 *  flat params exactly as the card schema declares them). */
export type EditParams = Record<string, unknown>;

/** The edit facts door: the resolved lane_inputs parsed into the
 *  closed shape. A drifted encoder class (the 2.1 key on this
 *  family's row) refuses here — the legacy lane's silent else-branch
 *  would have built this lane on wrong weights. `max_images` is the
 *  stock node's own truth (image1/2/3 — 3 total) and floors at 1.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseEditFacts(raw: LaneInputsFacts): EditFacts {
  // The checks + refusal prose live in the kit (J3 consolidation,
  // 2026-10-18); this door projects the parsed core + the edit cap
  // into the family's own typed shape (B4).
  const f = parseDiffusionLaneFacts(raw, "qwen-img-edit-2511 edit", { key: "text_encode_node", node: "TextEncodeQwenImageEditPlus" }, false);
  return { unet: f.unet, text_encoder: f.text_encoder, vae: f.vae, clip_type: f.clip_type, text_encode_node: f.node, max_images: parseEditCap(raw, "qwen-img-edit-2511 edit") };
}

/** The edit action: the anchored instruction-edit lane — loaders →
 *  lora stack → text pair → per-slot LoadImage anchors →
 *  TextEncodeQwenImageEditPlus pair (refs on the stock node's native
 *  image2/image3 optionals) → ModelSamplingAuraFlow 1.0 → the
 *  lanpaint arm, the crop_stitch region detailer, or the plain
 *  VAEEncode-of-source → KSampler → decode + save under <run>/edit. */
/** The knob read: the declared numeric row coerces the wire's
 *  string spill (a JSON form hands "12"; the node's input is a
 *  number — a bare cast rode the string verbatim and the graph
 *  lied), and a stated non-numeric refuses field-named. */
function numOf(v: unknown, d: number, name: string): number {
  if (v === undefined || v === null || v === "") return d;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`qwen-img-edit-2511: '${name}' stated ${JSON.stringify(v)} — not a number`);
  return n;
}

export const edit: ComfyActionSpec<EditParams, EditFacts> = {
  id: "edit",
  inputs: [],
  outputs: [{ name: "image", kind: "IMAGE" }],
  // THE DECLARED SURFACE (the write plane, phase 2): the
  // image-edit card schema's own types and bounds — the family
  // door judges defaults and variant presets against this row;
  // the closed sets resolve from the ONE engine vocabulary. The
  // lanpaint_* knobs are mod-owned (the advanced tier —
  // mods/lanpaint registers them) and ride the mod plane, not
  // this surface.
  params: [
    { name: "input_images", type: "image_list" },
    { name: "image1", type: "string" },
    { name: "image2", type: "string" },
    { name: "image3", type: "string" },
    { name: "reference_images", type: "image_list" },
    ...diffusionParamRows(EDIT_DIFFUSION_BOUNDS),
    { name: "match_input_resolution", type: "boolean" },
    { name: "use_stock_nodes", type: "boolean" },
    { name: "double_reference", type: "boolean" },
  ],
  facts: parseEditFacts,
  build({ p, facts, model, g, runId }) {
    const seed = p.seed as number;
    let unet: OutputHandle = g.node("UNETLoader", { unet_name: facts.unet, weight_dtype: "default" }).out();
    unet = stackLoras(g, unet, fireLoras(model, p));
    const { clip, vae } = loadTextPair(g, facts);
    // THE ONE LIST (the merge) + THE SHARED CEILING (the
    // max_images law): counts the WHOLE list (anchor included)
    // against the DECL cap before any image loads — never drops
    // quiet, never orphans LoadImages. The card's anchor gate pins
    // the empty list; this re-pin covers direct action callers.
    const list = orderedInputImages(p);
    if (list.length === 0) {
      throw new Error(`required param 'input_images' missing on the image-edit card (the first image is the one being edited — the list cannot be empty; legacy drafts may state image1 alone instead)`);
    }
    const cap = facts.max_images;
    if (list.length > cap) {
      throw new Error(`'input_images' fires on the image-edit card (this lane takes ${cap} input images total — the first is the one being edited, ${cap - 1} references — but the list counts ${list.length}; drop ${list.length - cap}) — the TS plane maps every stated image to a slot, never drops one quietly`);
    }
    const anchor = list[0];
    const refs = list.slice(1);
    const image: TensorRef = isSpell(anchor)
      ? anchor
      : g.node("LoadImage", { image: anchor }).out(0);
    const loaded: TensorRef[] = refs.map((s) =>
      isSpell(s) ? s : g.node("LoadImage", { image: s }).out(0));
    // THE REGION ROW (one merge — the gate's own merge twin): the
    // bag merges UNDER flat params (explicit flat keys win). One
    // region per run; every region arm below reads this row.
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
    // THE NEVER-LIE GUARD (the firing law + the latent law,
    // 2026-11-08): no edit lane takes a stated size anymore — this
    // lane rides the source's own resolution through VAEEncode, and
    // the 2.1 lane samples the encoder's own anchor-sized latent. A
    // stated knob that does nothing is a lying stack. Refuse
    // field-named, symmetric with the 2.1 lane's guard.
    if (p.width !== undefined || p.height !== undefined) {
      throw new Error("'width'/'height' fire on the image-edit card but no edit lane takes a stated size (the latent law, 2026-11-08): the 2511 lane edits at the source's own resolution and the 2.1 lane samples the encoder's own anchor-sized latent — clear them and re-run");
    }
    // THE NODE-SHAPE ASSERT (not a second cap — a lying-DECL
    // guard): this lane builds the stock TextEncodeQwenImageEditPlus
    // graph, whose reference slots are image2/image3 and nothing
    // else. A lane routing here with max_images past the node's own
    // 3 would silently drop refs — refuse LOUD instead. Conditional
    // spreads keep blank refs out of the inputs entirely
    // (byte-stable plain graphs).
    if (cap > 3) {
      throw new Error(`'input_images' fires on the image-edit card (this lane routes to the stock TextEncodeQwenImageEditPlus node — 3 image slots and nothing else — but declares max_images ${cap}; fix the DECL) — the TS plane maps every stated image to a slot, never drops one quietly`);
    }
    const ref2 = loaded[0] ?? null;
    const ref3 = loaded[1] ?? null;
    const pos = g.node("TextEncodeQwenImageEditPlus", {
      clip, image1: image, vae, prompt: p.prompt,
      ...(ref2 ? { image2: ref2 } : {}),
      ...(ref3 ? { image3: ref3 } : {}),
    });
    const neg = g.node("TextEncodeQwenImageEditPlus", {
      clip, image1: image, vae, prompt: p.negative_prompt ?? "",
      ...(ref2 ? { image2: ref2 } : {}),
      ...(ref3 ? { image3: ref3 } : {}),
    });
    // FIXED 1.0 (template-pinned lane graph — not a knob, not the
    // wire, never sampling_shift).
    const shifted = g.node("ModelSamplingAuraFlow", { model: unet, shift: 1.0 }).out();
    // ── THE LANPAINT ARM: input_mask stated (+ the anchor) switches
    // to the lanpaint sampler — mask prep in-graph (LoadImageMask
    // alpha → GrowMask → FeatherMask → InvertMask; a spelled mask
    // rides the tensor inputs verbatim) → LanPaint_ImageEncode →
    // LanPaint_KSamplerAdvanced (NumSteps 5 fixed, Lambda/StepSize
    // off the knobs, Beta/Friction 1/15 their example-canonical
    // values) → LanPaint_ImageDecode → SaveImage. crop_stitch falls
    // through to the region detailer below. ──
    if (maskPath && !cropStitch) {
      let m: TensorRef = isSpell(maskPath)
        ? maskPath
        : g.node("LoadImageMask", { image: maskPath, channel: "alpha" }).out();
      const grow = numOf(merged.mask_grow, 8, "mask_grow");
      if (grow !== 0) m = g.node("GrowMask", { mask: m, expand: grow, tapered_corners: true }).out();
      const feather = numOf(merged.mask_feather, 8, "mask_feather");
      if (feather > 0) {
        m = g.node("FeatherMask", { mask: m, left: feather, top: feather, right: feather, bottom: feather }).out();
      }
      if ((merged.mask_invert ?? false) === true) m = g.node("InvertMask", { mask: m }).out();
      const lpLatent = g.node("LanPaint_ImageEncode", { image, vae, mask: m }).out();
      const promptMode = ((p.lanpaint_prompt_mode ?? "negative") as string) === "positive"
        ? "Prompt First"
        : "Image First";
      const lpSampled = g.node("LanPaint_KSamplerAdvanced", {
        model: shifted, add_noise: "enable", noise_seed: seed,
        steps: numOf(p.lanpaint_num_steps, 20, "lanpaint_num_steps"), cfg: p.cfg,
        sampler_name: laneSampler(p), scheduler: laneScheduler(p),
        positive: pos.out(), negative: neg.out(), latent_image: lpLatent,
        start_at_step: 0, end_at_step: 10000, return_with_leftover_noise: "disable",
        LanPaint_NumSteps: 5,
        LanPaint_Lambda: numOf(p.lanpaint_lambda, 0.5, "lanpaint_lambda"),
        LanPaint_StepSize: numOf(p.lanpaint_step_size, 1.0, "lanpaint_step_size"),
        // The engine build carries no Beta/Friction/EarlyStop/
        // InnerThreshold/InnerPatience/MinStepFrac inputs (the
        // live /object_info row declares exactly the 19 above) —
        // the compose restates nothing the node cannot spell.
        LanPaint_PromptMode: promptMode, LanPaint_Info: "LanPaint KSampler Adv.",
        Inpainting_mode: "🖼️ Image Inpainting",
      });
      const lpDecoded = g.node("LanPaint_ImageDecode", {
        samples: lpSampled.out(), vae, image, mask: m, blend_overlap: 9,
      });
      return g.node("SaveImage", { images: lpDecoded.out(), filename_prefix: `${runId}/edit` }).out();
    }
    // ── THE CROP_STITCH ARM: the generic region detailer — region
    // source → SEGS → DetailerForEach (crop → edit → paste) on this
    // lane's shifted model and EditPlus conditioning. ──
    if (cropStitch) {
      const segs = regionSegs(g, merged, image, maskPath);
      return detailerSave(g, p, merged, {
        image, segs, model: shifted, clip, vae,
        positive: pos.out(), negative: neg.out(), seed,
      }, runId).out();
    }
    const encoded = g.node("VAEEncode", { pixels: image, vae }).out();
    const sampled = g.node("KSampler", {
      seed,
      steps: p.steps,
      cfg: p.cfg,
      // the lane's own solver read (an unstated/empty row rides the
      // lane default, never "").
      sampler_name: laneSampler(p),
      scheduler: laneScheduler(p),
      denoise: 1.0,
      latent_image: encoded,
      model: shifted,
      positive: pos.out(),
      negative: neg.out(),
    });
    return decodeSave(g, sampled.out(), vae, `${runId}/edit`).out();
  },
};
