// Tier 3 — the image-edit card (the image_edit renderer port).
// The anchored edit lane: loaders → lora stack → text pair → per
// -slot LoadImage anchors → TextEncodeQwenImageEditPlus pair →
// VAEEncode (the anchor itself) → KSampler → VAEDecode → SaveImage
// under "<runId>/edit" (the lane-local prefix — NOT image-gen's
// /gen). Creation order IS node-id order (pinned by
// tests/golden_cordis/image_qwen-img-edit_*).
//
// SURFACE (py referee: cordis/data/card-decls.json image-edit
// schemaMeta[], 34 keys — card.py core + Lanpaint/Loras/MaskMod
// absorption; model.py defaults ride the service cascade, never the
// schema): the schema below mirrors the referee key-for-key.
// Defaults ride-the-model (the image-gen P2 precedent): a py-ABSENT
// default is a bare atom (no .default()), and compose reads the key
// with `?? ''` / `?? []` normalization — never a TS-pinned ''/0/[].
//
// WIRING (kit: imageEdit over render-kit.ts — loadTextPair,
// decodeSave, stackLoras): image2/image3 ride the STOCK node's native optional
// slots (comfy_extras nodes_qwen TextEncodeQwenImageEditPlus takes
// image1/2/3) via conditional LoadImages — blank slots stay out of
// the inputs entirely, so plain graphs are byte-stable. use_stock_
// nodes rides inert both ways: this plane builds the stock graph and
// nothing else (the stock-only verdict below), so true asks for
// exactly what it gets and false's patches can never trigger (every
// patch trigger refuses). Everything else that would change the
// graph (reference_images slot mapping, double_reference's second
// encode, the lanpaint sampler + knobs, the outpaint pad chain, the
// mask prep/region flow) REFUSES field-named instead of silently
// plain-editing (the retired python MOD FIRING LAW, ported 1:1 —
// admission is the surface, firing is compose's call).
import type { Context } from '@deepseek-ai/cordis'
import { z } from '../atoms.ts'
import { imageEdit, refuseImageEditFiring, finalizeImageEdit } from '../kit.ts'

const schema = z.object({
  prompt: z.string(),
  negative_prompt: z.string(),
  // the staged anchor filename — the arm stages uploads/artifacts
  // into the ComfyUI input dir before this doc renders (the wire
  // name is the card-primary image1; input_image/image are retired
  // python aliases, not ported to this plane).
  image1: z.string(),
  // optional reference slots (the lanpaint brick's slots 2-3): bare
  // atoms (py rides them) — a stated slot loads and wires, a blank
  // one stays out of the encode inputs entirely.
  image2: z.string(),
  image3: z.string(),
  // the list-form twin of the brick (py default []): admitted, never
  // silently mapped — list→slot precedence is undocumented python-
  // side, so a non-empty list refuses (see refuseFiring).
  reference_images: z.array(z.string()).default([]),
  seed: z.number().default(-1),
  steps: z.number().default(4),
  cfg: z.number().default(1.0),
  sampler: z.string(),
  scheduler: z.string(),
  // picks arrive RESOLVED (filename-shaped): the python road
  // resolves catalog ids through the runtime-catalog door before
  // the step doc; this plane has no catalog, so name IS the lora
  // filename wired to lora_name (the image-gen TS convention).
  loras: z.array(z.object({ name: z.string(), strength: z.number() })),
  // edit tuning (qwen-scoped — single family, no families= filter):
  // the stock-graph flag rides inert (this plane IS stock-only, see
  // the registerCard verdict); the second encode refuses (below).
  use_stock_nodes: z.boolean().default(false),
  double_reference: z.boolean().default(false),
  // lanpaint flavor (py LanpaintMod absorption): the force flag plus
  // the sampler knobs. Defaults are the py lane promises verbatim;
  // any firing value refuses — the lanpaint sampler nodes are not in
  // this plane's block vocabulary, and this stroke invents no wiring.
  lanpaint_enabled: z.boolean().default(false),
  lanpaint_num_steps: z.number().default(20),
  lanpaint_step_size: z.number().default(1.0),
  lanpaint_lambda: z.number().default(0.5),
  lanpaint_beta: z.number().default(0.5),
  lanpaint_friction: z.number().default(0.5),
  lanpaint_prompt_mode: z.string().default('negative'),
  // outpaint pads (canvas expansion is part of the inpaint flow):
  // any nonzero pad (or off-promise overlap) refuses — the pad chain
  // nodes are not in this plane's block vocabulary.
  outpaint_top: z.number().default(0),
  outpaint_right: z.number().default(0),
  outpaint_bottom: z.number().default(0),
  outpaint_left: z.number().default(0),
  outpaint_overlap: z.number().default(16),
  // mask flow (py MaskMod absorption): the mod bag (any stated bag
  // refuses — z.any so the door admits the tile shape instead of
  // refusing it as a type error), the attached region slot (bare —
  // py rides it), and the honor + host-side prep knobs. Defaults are
  // the py lane promises verbatim; any firing value refuses.
  mask: z.any(),
  input_mask: z.string(),
  mask_mode: z.string().default('auto'),
  mask_context_pad: z.number().default(64),
  mask_grow: z.number().default(8),
  mask_feather: z.number().default(8),
  mask_threshold: z.number().default(0),
  mask_invert: z.boolean().default(false),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerCard({
    id: 'image-edit',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'edit',
    // stock-only lane (the python_module verdict, image-gen's card-1
    // lesson): TextEncodeQwenImageEditPlus is comfy_extras.nodes_qwen
    // and ModelSamplingAuraFlow is comfy_extras.nodes_model_advanced
    // — both core; the qweneditutils/vnccs_utils rows in the
    // extension map over-claim core nodes. No requires to declare.
    boarded: ['qwen-img-edit-2511'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      if (!p.prompt || !(p.prompt as string).trim()) {
        throw new Error("required param 'prompt' missing or empty on the image-edit card (WHAT to change, not the whole image)")
      }
      if (!p.image1 || !(p.image1 as string).trim()) {
        throw new Error("required param 'image1' missing on the image-edit card (the edit is anchored on it)")
      }
      refuseImageEditFiring(p)
      imageEdit(p, model, g, runId)
    },
    finalize: finalizeImageEdit,
  })
}
