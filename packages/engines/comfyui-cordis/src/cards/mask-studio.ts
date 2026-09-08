// Tier 3 — the mask-studio card (the mask_t1 renderer port).
// RT-DETR proposes person boxes, SAM3 refines them into masks; the
// painted payload rides LoadImageMask(alpha).
// Decl + admission + one kit recipe call - the lane body lives in
// src/kit.ts (loaders stay lazy there). Two loaders from the
// model's lane rows: CheckpointLoaderSimple (sam3.1 multiplex — its
// MODEL feeds SAM3_Detect, its CLIP feeds the text selections) and
// UNETLoader (rt_detr — feeds RTDETR_detect).
//
// REACHABILITY (the port's one structural truth): python creates the
// three loaders eagerly, but comfy_script's api_format walks the graph
// from the outputs — an unreferenced loader EVAPORATES (a pure-paint
// run renders no LoadImage/CheckpointLoaderSimple/UNETLoader at all).
// The TS builder emits every created node, so the loaders here are
// lazy: creation rides first use, and a loader with no consumer never
// lands. Per-class instance order still mirrors the python source.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { maskT1 } from '../kit.ts'
import { vocabulary } from '../models/vocab.ts'

const schema = z.object({
  // the declared knob surface (17 keys — purge S-decls: the py card
  // is deleted, this schema is the declaration). The legacy TS renderer keys (primary_class/prompt,
  // refine_iterations, exports/export_kind, scope_bbox, union_...,
  // primary_via_rtdetr/is_paint) ride the door's explicit-params
  // overlay (non-strict object) so the pinned recipe golden keeps
  // composing byte-identical — they are never declared knobs.
  input_image: z.string().role('path').description("Input image").extra('extra', { order: null, tooltip: "The photo to select from — absolute path or an artifact ref from a prior run.", required: true, wtype: 'image', }),
  detect_mode: vocabulary(["body", "face", "hands"]).description("Detect").default("body").extra('extra', { order: 0, group: "detect", width: 1, tooltip: "What the primary selection targets. body → RT-DETR person boxes refined by SAM3; face/hands → SAM3 open-vocabulary text selection.", wtype: 'select' }),
  detection_threshold: z.number().description("Detection threshold").min(0.05).max(0.95).step(0.05).default(0.35).extra('extra', { order: 1, group: "detect", width: 1, tooltip: "RT-DETR box confidence. Lower catches more instances, noisier boxes." }),
  sam_threshold: z.number().description("SAM3 threshold").min(0.5).max(1).step(0.01).default(0.93).extra('extra', { order: 2, group: "detect", width: 1, tooltip: "SAM3 mask confidence." }),
  sam_dilation: z.number().description("Dilation (px)").min(0).max(64).step(1).default(0).extra('extra', { order: 3, group: "detect", width: 1, tooltip: "Grow the final mask N pixels — the inpaint bleed margin.", wtype: 'slider' }),
  output_mode: vocabulary(["segm", "bbox"]).description("Output").default("segm").extra('extra', { order: 4, group: "detect", width: 1, tooltip: "segm saves masks; bbox saves the drawn-box manifest preview.", wtype: 'select' }),
  instance_filter: z.string().description("Instance filter").default("all").extra('extra', { order: 5, group: "detect", tooltip: "'all' | 'largest' | comma indices '0,2' — which detected instances the primary keeps." }),
  max_instances: z.number().description("Max instances").min(0).max(100).step(1).default(0).extra('extra', { order: 6, group: "detect", tooltip: "Cap detected instances (0 = no cap). Read the manifest first, then filter.", wtype: 'number' }),
  // ABSENT/defaultless optionals (bare = optional at parse,
  // ''-absent at compose via ?? '' — the image-gen precedent).
  sam3_prompt: z.string().description("SAM3 prompt").extra('extra', { order: 0, group: "refine", tooltip: "Open-vocabulary text selection — e.g. 'the red hat', 'left shoe'. Rides INSTEAD of detect_mode when set.", wtype: 'textarea' }),
  export_boxes: z.boolean().description("Export box manifest").default(true).extra('extra', { order: 0, group: "exports", tooltip: "Draw RT-DETR boxes on the image — the instance manifest (read it, then set instance_filter)." }),
  export_face: z.boolean().description("Export face mask").default(false).extra('extra', { order: 1, group: "exports" }),
  export_hands: z.boolean().description("Export hands mask").default(false).extra('extra', { order: 2, group: "exports" }),
  export_body: z.boolean().description("Export body mask").default(false).extra('extra', { order: 3, group: "exports" }),
  export_paint: z.boolean().description("Export paint mask").default(false).extra('extra', { order: 4, group: "exports", tooltip: "ON when a brush stroke exists — the painted payload becomes its own mask export." }),
  paint_mask: z.string().role('path').description("Paint payload").extra('extra', { order: 5, group: "exports", tooltip: "The painted PNG (alpha channel = strokes). Required when export_paint is true.", wtype: 'image' }),
  roi: z.string().description("Scope ROI").extra('extra', { order: 0, group: "advanced", tooltip: "[x, y, w, h] fractions — run-global crop of every selection. Recipe filters may carry their own; identical scopes only." }),
  outputs: z.string().description("Recipe (outputs)").default("[]").extra('extra', { order: 1, group: "advanced", tooltip: "THE recipe form: one entry per mask, filter (where) over selection (how). Non-empty ⇒ overrides the flat params. See AGENT.md.", wtype: 'textarea' }),
})

export const inject = ['comfyui']

// THE ACTION CARD OWNS ITS PINS (no model row — mask-studio is a
// tool, not weights: RT-DETR proposes, SAM3 refines; stock nodes
// only, the clothing-placement precedent).
const PINS = {
  checkpoint: 'sam3.1_multiplex_fp16.safetensors',
  unet: 'rt_detr_v4-x-hgnet_fp32.safetensors',
}

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'mask-studio',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'mask-studio',
    // stock-only card (card.py declares no requires — the DSL default
    // ()): SAM3_Detect/RTDETR_detect ride comfy_extras core; no
    // extension pack to declare.
    boarded: [],
    requiresModel: false,
    // ADMISSION EXTRAS (the py class-attr half verbatim: the
    // retired row's admits minus the boarded families' studio
    // writes, which the projection unions from the facts file).
    admits: ['export_kind', 'exports', 'primary_class', 'primary_is_paint', 'primary_via_rtdetr', 'refine_iterations', 'scope_bbox', 'union_paint_into_combined'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, _model, g, runId) {
      if (typeof p.input_image !== 'string' || !p.input_image.trim()) {
        throw new Error("required param 'input_image' missing on the mask-studio card — the mask lane selects FROM an image")
      }
      maskT1(p, PINS, g, runId)
    },
  }))
}
