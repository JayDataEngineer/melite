import { GraphBuilder, OutputHandle, stripAutofill } from './graph.ts'
import type { PromptGraph, StripTable } from './graph.ts'
import type { ModelFacts } from './facts.ts'
import { loadTextPair, decodeSave, stackLoras, stackControlNets } from './blocks/render-kit.ts'
import { fireLoras, fireControlNets, refuseIPAdapterFiring } from './mods/guard.ts'
import { mintSeed } from './graph-helpers.ts'

// ── archetype I: the image-diffuse family ───────────────────────────
// Loader chain → lora stack → text pair → controlnet stack → latent
// → KSampler → decode → save. Pin defaults ride AUTOFILL; each
// lane's strip table is the engine's calibration,
// moved here verbatim.

/** Pin autofills the image_t2i lane strips post-walk for
 *  (moved verbatim from the image-gen card). */
export const IMAGE_GEN_STRIP: StripTable = {
  CLIPLoader: ['device'],
  KSampler: ['control_after_generate'],
}

export function finalizeImageGen(graph: PromptGraph): PromptGraph {
  return stripAutofill(graph, IMAGE_GEN_STRIP)
}

/** The image_t2i block — the shared text-to-image lane (moved
 *  verbatim from the image-gen card). */
export function imageT2I(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): OutputHandle {
  const li = model.lane_inputs
  // GATE S (the seed-sentinel contract, estate law): -1 is RANDOM —
  // the dice mints HERE in the lane (the skin lane's GATE S
  // precedent: mint at render so every node sharing the seed shares
  // the MINTED value); below -1 or a non-int refuses loud.
  const seed = mintSeed(p)
  let unet: OutputHandle = g.node('UNETLoader', { unet_name: li.unet, weight_dtype: 'default' }).out()
  if (li.sampling_shift) {
    unet = g.node('ModelSamplingAuraFlow', { model: unet, shift: li.sampling_shift }).out()
  }
  unet = stackLoras(g, unet, fireLoras(model, p))
  // THE IP-ADAPTER FIRING GATE (fate 'refused', the ray receipt):
  // no lane builds it in this plane — every stated entry refuses
  // LOUD here, before any node renders (ray's lane silently
  // skipped used entries; this plane never drops a reference
  // image quietly).
  refuseIPAdapterFiring(model, p)
  const { clip, vae } = loadTextPair(g, li)
  // THE 2.1 LANE (2026-09-21, the Comfy-Org Qwen-Image-2.1 release;
  // branch key = lane_inputs.text_encode_node — the latent_node
  // precedent, data never a family-id switch): ONE encoder node
  // emits positive AND negative (outputs [CONDITIONING,
  // CONDITIONING, LATENT] — the negative rides out index 1); the
  // resolution input sizes reference images only (t2i carries none
  // — 1024 is the official template's inert default).
  if (li.text_encode_node === 'TextEncodeQwenImage21') {
    const enc21 = g.node('TextEncodeQwenImage21', {
      clip, prompt: p.prompt, negative_prompt: p.negative_prompt ?? '', resolution: 1024,
    })
    const latent21 = g.node('EmptyLatentImage', { batch_size: 1, width: p.width, height: p.height })
    const sampled21 = g.node('KSampler', {
      seed,
      steps: p.steps,
      cfg: p.cfg,
      sampler_name: p.sampler,
      scheduler: p.scheduler,
      denoise: 1.0,
      latent_image: latent21.out(),
      model: unet,
      positive: enc21.out(0),
      negative: enc21.out(1),
    })
    return decodeSave(g, sampled21.out(), vae, `${runId}/gen`).out()
  }
  // THE CONTROLNET STACK (the z-image restoration): the fired picks
  // wrap the LoRA'd model — ModelPatchLoader → ZImageFunControlnet
  // per entry, array order = apply order. Empty picks = the bare
  // model (the plain path is byte-stable — no new nodes). THE SEAM
  // (the packs.ts lanpaint precedent): the node pair is z-image's —
  // a second controlnet family re-opens node selection inside
  // stackControlNets, never a silent node swap here.
  unet = stackControlNets(g, unet, vae, fireControlNets(model, p))
  const pos = g.node('CLIPTextEncode', { clip, text: p.prompt })
  const neg = g.node('CLIPTextEncode', { clip, text: p.negative_prompt ?? '' })
  const latent = g.node(String(li.latent_node), { batch_size: 1, width: p.width, height: p.height })
  const sampled = g.node('KSampler', {
    seed,
    steps: p.steps,
    cfg: p.cfg,
    sampler_name: p.sampler,
    scheduler: p.scheduler,
    denoise: 1.0,
    latent_image: latent.out(),
    model: unet,
    positive: pos.out(),
    negative: neg.out(),
  })
  return decodeSave(g, sampled.out(), vae, `${runId}/gen`).out()
}

/** Pin autofills the image_edit lane strips post-walk for
 *  (moved verbatim from the image-edit card). */
export const IMAGE_EDIT_STRIP: StripTable = {
  CLIPLoader: ['device'],
  LoadImage: [],
  KSampler: ['control_after_generate'],
}

export function finalizeImageEdit(graph: PromptGraph): PromptGraph {
  return stripAutofill(graph, IMAGE_EDIT_STRIP)
}

/** THE IMAGE CAPACITY (the max_images law — the card and the lane
 *  RIDE the model's DECL, never a hardcoded count): total image
 *  inputs the lane opens, anchor included (2511's stock node: 3;
 *  2.1's encoder: 16). A lane that never declared max_images gets
 *  the NARROW end (3) — loud-safe by construction: over-refusal is
 *  field-named and names the missing DECL, while guessing roomy
 *  would silently drop refs past the node's own slots. */
export function editImageCap(model?: ModelFacts): number {
  const declared = (model?.lane_inputs as Record<string, unknown> | undefined)?.max_images
  if (typeof declared === 'number' && Number.isFinite(declared) && declared >= 1) return Math.floor(declared)
  return 3
}

/** THE REFERENCE ORDER (the unification: image inputs and
 *  reference images are ONE concept — the anchor plus references).
 *  Legacy named slots (image2/image3 — hidden aliases from the
 *  stock node's vocabulary, still stated by old drafts, agents, and
 *  flow edges) merge FIRST, then the reference_images stack, blanks
 *  dropped — array order IS apply order on every lane. Garbage
 *  refuses LOUD (the never-drop law covers direct lane callers
 *  bypassing the schema door): a non-string ref or a non-list stack
 *  is a caller bug, never a quiet skip. */
export function editRefs(p: Record<string, unknown>): string[] {
  const out: string[] = []
  const pushRef = (s: unknown, key: string): void => {
    if (s === undefined || s === null) return
    if (typeof s === 'string') {
      if (s.trim()) out.push(s)
      return
    }
    throw new Error(`'${key}' fires on the image-edit card (expected an image path string, got ${typeof s}) — the TS plane maps every stated image to a slot, never drops one quietly`)
  }
  pushRef(p.image2, 'image2')
  pushRef(p.image3, 'image3')
  const stack = p.reference_images
  if (stack === undefined || stack === null) return out
  if (!Array.isArray(stack)) {
    throw new Error(`'reference_images' fires on the image-edit card (expected a list of image paths, got ${typeof stack}) — the TS plane maps every stated image to a slot, never drops one quietly`)
  }
  for (const s of stack) pushRef(s, 'reference_images')
  return out
}

/** The firing gate (the MOD FIRING LAW, ported 1:1
 *  moved verbatim from the image-edit card): lane-promise values ride
 *  inert; anything that would change the graph refuses field-named
 *  INSTEAD of silently plain-editing.
 *
 *  THE SECOND SEAT (the max_images law): the gate reads
 *  the CAP off the model (lane_inputs.max_images — the DECL's own
 *  node truth, never a hardcoded count, never a family-id switch).
 *  Refs past cap - 1 refuse LOUD on every lane (2511: 2, 2.1: 15);
 *  the lane re-pins the same ceiling for direct callers. An absent
 *  model refuses (the old law — direct lane callers pin it). */
export function refuseImageEditFiring(p: Record<string, unknown>, model?: ModelFacts): void {
  const blank = (v: unknown): boolean =>
    v === undefined || v === null ||
    (typeof v === 'string' && !v.trim()) ||
    (v instanceof Array && v.length === 0)
  const fire = (key: string, cond: boolean, why: string): void => {
    if (cond) {
      throw new Error(`'${key}' fires on the image-edit card (${why}) — the TS plane builds the stock plain-edit graph only; refusing instead of silently plain-editing`)
    }
  }
  const refs = editRefs(p)
  // THE ABSENT-MODEL LAW (verbatim pre-unification behavior): with
  // no model pinned the gate cannot know the lane's cap, so ANY
  // stated ref refuses — direct lane callers pin the model.
  fire('reference_images', model === undefined && refs.length > 0, 'no model pinned — direct lane callers pin the model (the gate reads the lane cap off lane_inputs.max_images)')
  const cap = editImageCap(model)
  fire('reference_images', refs.length > cap - 1, `this lane takes ${cap - 1} references (anchor + ${cap - 1} = max_images ${cap}) — drop ${refs.length - (cap - 1)} or switch the model lane`)
  fire('double_reference', p.double_reference === true, 'the second encode needs nodes this plane does not build')
  // THE LANPAINT LAW (revived 2026-09-15 — the arm above builds it):
  // a stated region switches to the lanpaint sampler; forcing it
  // with no region stated refuses (nothing to regenerate). The
  // retired knobs (beta/friction — upstream fixed them 1/15) refuse
  // off-default LOUD: the fields stay declared for form-spec
  // but wire to no input, and this plane never drops a stated knob
  // quietly.
  const bagN = Array.isArray(p.mask) ? (p.mask as unknown[]).length : 0
  const bagMask = bagN === 1
    ? (((p.mask as Array<Record<string, unknown>>)[0]?.input_mask ?? '') as string)
    : ''
  // a single-entry bag's region counts (the arm merges it); an empty
  // bag states nothing — the force flag must not pass on an empty bag
  // and then silently plain-edit.
  const maskStated = !blank(p.input_mask) || !blank(bagMask)
  // THE LANE-SCOPED REGION LAW (roadmap §10, the second wave): the
  // lanpaint arm rides the 2511 lane only — the 2.1 arm returns
  // before it, and a stated region there would silently plain-edit
  // (the lying-stack crime the firing law bans). Refuse field-named.
  fire('input_mask', maskStated && model?.lane_inputs?.text_encode_node === 'TextEncodeQwenImage21',
    'the lanpaint region rides the 2511 lane only — the 2.1 lane has no lanpaint sampler and would silently plain-edit; clear the mask or switch the model lane')
  fire('lanpaint_enabled', p.lanpaint_enabled === true && !maskStated, 'force LanPaint with no region stated — state input_mask (the region to regenerate)')
  fire('lanpaint_beta', ((p.lanpaint_beta ?? 0.5) as number) !== 0.5, 'retired upstream — scraed/LanPaint fixes Beta 1.0, the pack knob wires to no input; back it to 0.5 or order a pack change')
  fire('lanpaint_friction', ((p.lanpaint_friction ?? 0.5) as number) !== 0.5, 'retired upstream — scraed/LanPaint fixes Friction 15, the pack knob wires to no input; back it to 0.5 or order a pack change')
  fire('outpaint_top', ((p.outpaint_top ?? 0) as number) !== 0, 'canvas expansion needs the outpaint pad chain this plane does not build')
  fire('outpaint_right', ((p.outpaint_right ?? 0) as number) !== 0, 'canvas expansion needs the outpaint pad chain this plane does not build')
  fire('outpaint_bottom', ((p.outpaint_bottom ?? 0) as number) !== 0, 'canvas expansion needs the outpaint pad chain this plane does not build')
  fire('outpaint_left', ((p.outpaint_left ?? 0) as number) !== 0, 'canvas expansion needs the outpaint pad chain this plane does not build')
  fire('outpaint_overlap', ((p.outpaint_overlap ?? 16) as number) !== 16, 'outpaint knob off its lane promise with no outpaint chain to carry it')
  fire('mask', bagN > 1, 'one region per run — the lanpaint sampler takes a single mask')
  fire('mask', !blank(p.mask) && !Array.isArray(p.mask), 'the mask bag is a list — state one entry ([{input_mask, ...}]) or use the flat input_mask')
  fire('mask_mode', ((p.mask_mode ?? 'auto') as string) !== 'auto', 'only auto rides — crop_stitch/full_frame need chains this plane does not build; the lanpaint arm inpaints the region inline')
  fire('mask_context_pad', ((p.mask_context_pad ?? 64) as number) !== 64, 'context padding belongs to the unbuilt crop_stitch chain — the lanpaint arm needs none')
  fire('mask_threshold', ((p.mask_threshold ?? 0) as number) !== 0, 'no core node re-binarizes — the soft feathered falloff rides as-is')
}

/** The image_edit block — the anchored instruction-edit lane (moved
 *  verbatim from the image-edit card). */
export function imageEdit(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const seed = mintSeed(p)
  const li = model.lane_inputs
  let unet: OutputHandle = g.node('UNETLoader', { unet_name: li.unet, weight_dtype: 'default' }).out()
  unet = stackLoras(g, unet, fireLoras(model, p))
  const { clip, vae } = loadTextPair(g, li)
  const image = g.node('LoadImage', { image: p.image1, upload: 'image' }).out(0)
  // THE REFERENCES (the unification — ONE order for both arms):
  // legacy named slots first, then the stack, blanks dropped.
  // THE SHARED CEILING (the max_images law — ONE check, both arms)
  // runs BEFORE any ref loads: anchor + refs past the DECL cap
  // refuses field-named, never drops quiet and never orphans
  // LoadImages. The gate pins the same ceiling at the compose
  // door; this re-pin covers direct lane callers.
  const refs = editRefs(p)
  const cap = editImageCap(model)
  if (1 + refs.length > cap) {
    throw new Error(`'reference_images' fires on the image-edit card (this lane takes ${cap - 1} references — anchor + refs count ${1 + refs.length}, max_images ${cap}; drop ${1 + refs.length - cap}) — the TS plane maps every stated image to a slot, never drops one quietly`)
  }
  // Each stated ref loads ahead of the encodes (creation order IS
  // node-id order); blank refs contribute no input at all (stable).
  const loaded = refs.map((s) => g.node('LoadImage', { image: s, upload: 'image' }).out(0))
  // ── THE 2.1 EDIT LANE (2026-09-21, the Comfy-Org release; branch
  // key = lane_inputs.text_encode_node, the latent_node precedent)
  // ── the 2.1 base has NO separate edit weights: the edit rides
  // QwenImage21Cache (the reference-prefix KV cache wrapped around
  // the SAME unet) + TextEncodeQwenImage21 conditioned on the anchor
  // images through its own image_N autogrow slots, sampled on an
  // EmptyLatentImage at the TARGET resolution (the official
  // image_qwen_image_2_1_image_edit template graph — NOT the 2511
  // VAEEncode-of-source lane). vae rides the encoder's optional
  // input (reference latents splice); one encoder node emits pos+neg.
  if (li.text_encode_node === 'TextEncodeQwenImage21') {
    // (the 2.1 edit arm — the target-resolution knobs are ITS; see
    // the block comment above)
    const cached = g.node('QwenImage21Cache', { model: unet, device: 'auto', dtype: 'default' }).out()
    // THE AUTOGROW KEYS (the live v0.37 law, proven on the engine:
    // execute(clip, prompt, negative_prompt, vae, resolution, images)
    // — the slots ride DOTTED 'images.image_N' node-input keys, the
    // executor's dynamic-path split nests them into the images dict;
    // a bare 'image_1' reaches execute() as a kwarg and dies)
    const images21: Record<string, OutputHandle> = { 'images.image_1': image }
    // THE ORDER RIDES CONTIGUOUSLY (the unification): refs map onto
    // images.image_2+ in order — no gaps, no second concept (the
    // shared ceiling above already enforced the DECL cap).
    loaded.forEach((ref, i) => {
      images21[`images.image_${2 + i}`] = ref
    })
    const enc21 = g.node('TextEncodeQwenImage21', {
      clip, vae, prompt: p.prompt, negative_prompt: p.negative_prompt ?? '', resolution: 1024,
      ...images21,
    })
    const latent21 = g.node('EmptyLatentImage', {
      batch_size: 1,
      width: ((p.width as number | undefined) ?? 1024),
      height: ((p.height as number | undefined) ?? 1024),
    })
    const sampled21 = g.node('KSampler', {
      seed,
      steps: p.steps,
      cfg: p.cfg,
      sampler_name: p.sampler || 'euler',
      scheduler: p.scheduler || 'simple',
      denoise: 1.0,
      latent_image: latent21.out(),
      model: cached,
      positive: enc21.out(0),
      negative: enc21.out(1),
    })
    decodeSave(g, sampled21.out(), vae, `${runId}/edit`)
    return
  }
  // THE NEVER-LIE GUARD (the firing law): width/height are the 2.1
  // lane's target-resolution knobs — stated on the 2511 lane they
  // would wire to nothing (the 2511 edit rides the source's own
  // resolution through VAEEncode), and a stated knob that does
  // nothing is a lying stack. Refuse field-named.
  if (p.width !== undefined || p.height !== undefined) {
    throw new Error("'width'/'height' fire on the image-edit card only on the Qwen Image 2.1 lane (target-resolution edit) — the 2511 lane edits at the source's own resolution; clear them or switch the model lane")
  }
  // THE 2511 MAPPING (the unification's narrow end): refs ride the
  // stock node's native image2/image3 optionals (the shared ceiling
  // above already enforced the DECL cap — this arm only ever sees
  // what fits). THE NODE-SHAPE ASSERT (not a second cap — a lying-
  // DECL guard): this arm builds the stock TextEncodeQwenImageEditPlus
  // graph, whose reference slots are image2/image3 and nothing else.
  // A lane routing here with max_images past the node's own 3 would
  // silently drop refs — refuse LOUD instead. Conditional spreads
  // keep blank refs out of the inputs entirely (byte-stable plain
  // graphs).
  if (cap > 3) {
    throw new Error(`'reference_images' fires on the image-edit card (this lane routes to the stock TextEncodeQwenImageEditPlus node — image1/2/3 and nothing else — but declares max_images ${cap}; fix the DECL) — the TS plane maps every stated image to a slot, never drops one quietly`)
  }
  const ref2 = loaded[0] ?? null
  const ref3 = loaded[1] ?? null
  const pos = g.node('TextEncodeQwenImageEditPlus', {
    clip, image1: image, vae, prompt: p.prompt,
    ...(ref2 ? { image2: ref2 } : {}),
    ...(ref3 ? { image3: ref3 } : {}),
  })
  const neg = g.node('TextEncodeQwenImageEditPlus', {
    clip, image1: image, vae, prompt: p.negative_prompt ?? '',
    ...(ref2 ? { image2: ref2 } : {}),
    ...(ref3 ? { image3: ref3 } : {}),
  })
  // FIXED 1.0 (template-pinned lane graph — not a knob, not the
  // wire, never li.sampling_shift; see the doc's 2026-09-06
  // audit note on ImageEditDoc).
  const shifted = g.node('ModelSamplingAuraFlow', { model: unet, shift: 1.0 }).out()
  // ── THE LANPAINT ARM (revived 2026-09-15, operator order "bring
  // them back") ──
  // input_mask stated (+ image1) switches the builder to the
  // lanpaint sampler — the LanPaintMod SLOT LAW. Upstream's node
  // API moved since the pack was written (scraed/LanPaint, engine
  // commit 32cf848): step_size/lambda/beta/friction retired as live
  // inputs — LanPaint_KSamplerAdvanced keeps NumSteps + Lambda +
  // StepSize and FIXES Beta 1.0 / Friction 15 (hidden DEFAULT; old
  // prompts passing them are accepted and ignored — the extension's
  // own comment). The mapping, every drift named:
  //   steps <- lanpaint_num_steps (20 = their z-image example's 20)
  //   LanPaint_NumSteps <- 5 (upstream default; no pack knob exists)
  //   LanPaint_Lambda <- lanpaint_lambda (PACK 0.5 vs upstream 5.0:
  //     a lighter known-region pull than their example — raise the
  //     slider to taste, ceiling 2)
  //   LanPaint_StepSize <- lanpaint_step_size (pack 1.0 vs upstream
  //     0.2; 0.2 is reachable, floor 0.1)
  //   Beta/Friction <- 1 / 15 explicit (their example-canonical
  //     fixed values; the pack knobs stay declared for form-spec
  //     and refuse off-default LOUD — never a silent drop)
  //   PromptMode: negative -> "Image First", positive ->
  //     "Prompt First" (their README: image context vs prompt
  //     emphasis at the cost of image quality)
  //   Inpainting_mode: the image literal. add_noise enable,
  //     noise_seed = the minted seed, start 0 / end 10000,
  //     leftover-noise disable (their example wiring).
  // Mask prep in-graph (the host-side chain, node form):
  // LoadImageMask alpha -> GrowMask -> FeatherMask -> InvertMask.
  // No core node re-binarizes — non-zero mask_threshold still
  // refuses. Polarity: LanPaint 1 = regenerate; mask-studio white
  // region = regenerate. Consistent.
  // The bag merges UNDER flat params (explicit flat keys win; the
  // flattened bag -> flat the same way). One region per run.
  const bag = Array.isArray(p.mask) ? (p.mask as Array<Record<string, unknown>>) : []
  const merged: Record<string, unknown> = { ...p }
  const bagObj = bag.length === 1 && typeof bag[0] === 'object' && bag[0] !== null ? bag[0] : null
  if (bagObj) {
    for (const [k, v] of Object.entries(bagObj)) {
      if (merged[k] === undefined) merged[k] = v
    }
  }
  const maskPath = ((merged.input_mask ?? '') as string).trim()
  if (maskPath) {
    let m = g.node('LoadImageMask', { image: maskPath, channel: 'alpha' }).out()
    const grow = (merged.mask_grow ?? 8) as number
    if (grow !== 0) m = g.node('GrowMask', { mask: m, expand: grow, tapered_corners: true }).out()
    const feather = (merged.mask_feather ?? 8) as number
    if (feather > 0) {
      m = g.node('FeatherMask', { mask: m, left: feather, top: feather, right: feather, bottom: feather }).out()
    }
    if ((merged.mask_invert ?? false) === true) m = g.node('InvertMask', { mask: m }).out()
    const lpLatent = g.node('LanPaint_ImageEncode', { image, vae, mask: m }).out()
    const promptMode = ((p.lanpaint_prompt_mode ?? 'negative') as string) === 'positive'
      ? 'Prompt First'
      : 'Image First'
    const lpSampled = g.node('LanPaint_KSamplerAdvanced', {
      model: shifted, add_noise: 'enable', noise_seed: seed,
      steps: (p.lanpaint_num_steps ?? 20) as number, cfg: p.cfg,
      sampler_name: p.sampler || 'euler', scheduler: p.scheduler || 'simple',
      positive: pos.out(), negative: neg.out(), latent_image: lpLatent,
      start_at_step: 0, end_at_step: 10000, return_with_leftover_noise: 'disable',
      LanPaint_NumSteps: 5,
      LanPaint_Lambda: (p.lanpaint_lambda ?? 0.5) as number,
      LanPaint_StepSize: (p.lanpaint_step_size ?? 1.0) as number,
      LanPaint_Beta: 1, LanPaint_Friction: 15,
      LanPaint_EarlyStop: 1, LanPaint_InnerThreshold: 0, LanPaint_InnerPatience: 1, LanPaint_MinStepFrac: 1.0,
      LanPaint_PromptMode: promptMode, LanPaint_Info: 'LanPaint KSampler Adv.',
      Inpainting_mode: '🖼️ Image Inpainting',
    })
    const lpDecoded = g.node('LanPaint_ImageDecode', {
      samples: lpSampled.out(), vae, image, mask: m, blend_overlap: 9,
    })
    g.node('SaveImage', { images: lpDecoded.out(), filename_prefix: `${runId}/edit` })
    return
  }
  const encoded = g.node('VAEEncode', { pixels: image, vae }).out()
  const sampled = g.node('KSampler', {
    seed,
    steps: p.steps,
    cfg: p.cfg,
    // the road's _step_doc coercions (doc.sampler or "euler"):
    // an unstated/empty row rides the lane default, never "".
    sampler_name: p.sampler || 'euler',
    scheduler: p.scheduler || 'simple',
    denoise: 1.0,
    latent_image: encoded,
    model: shifted,
    positive: pos.out(),
    negative: neg.out(),
  })
  decodeSave(g, sampled.out(), vae, `${runId}/edit`)
}
