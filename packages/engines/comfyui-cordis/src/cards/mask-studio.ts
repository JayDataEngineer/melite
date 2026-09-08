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

const schema = z.object({
  // the declared knob surface (17 keys — purge S-decls: the py card
  // is deleted, this schema is the declaration). The legacy TS renderer keys (primary_class/prompt,
  // refine_iterations, exports/export_kind, scope_bbox, union_...,
  // primary_via_rtdetr/is_paint) ride the door's explicit-params
  // overlay (non-strict object) so the pinned recipe golden keeps
  // composing byte-identical — they are never declared knobs.
  input_image: z.string().role('path').description(
    'The photo to select from — absolute path or an artifact ref from a previous card.').extra('extra', { required: true }),
  detect_mode: z.union([z.const('body'), z.const('face'), z.const('hands')])
    .default('body').description(
      'What the primary selection targets. body → RT-DETR person boxes; face/hands → MediaPipe landmarks.'),
  detection_threshold: z.number().min(0.05).max(0.95).default(0.35).description(
    'RT-DETR box confidence. Lower catches more instances, noisier boxes.'),
  sam_threshold: z.number().min(0.5).max(1.0).default(0.93).description(
    'SAM3 mask confidence.'),
  sam_dilation: z.number().min(0).max(64).default(0).description(
    'Grow the final mask N pixels — the inpaint bleed margin.'),
  output_mode: z.union([z.const('segm'), z.const('bbox')]).default('segm').description(
    'segm saves masks; bbox saves the drawn-box manifest preview.'),
  instance_filter: z.string().default('all').description(
    "'all' | 'largest' | comma indices '0,2' — which detected instances become masks."),
  max_instances: z.number().min(0).max(100).default(0).description(
    'Cap detected instances (0 = no cap). Read the manifest first to see what is there.'),
  // ABSENT/defaultless optionals (bare = optional at parse,
  // ''-absent at compose via ?? '' — the image-gen precedent).
  sam3_prompt: z.string().description(
    "Open-vocabulary text selection — e.g. 'the red hat', 'left shoe'. Overrides detect_mode when present."),
  export_boxes: z.boolean().default(true).description(
    'Draw RT-DETR boxes on the image — the instance manifest (read it back to filter).'),
  export_face: z.boolean().default(false).description('Export face mask'),
  export_hands: z.boolean().default(false).description('Export hands mask'),
  export_body: z.boolean().default(false).description('Export body mask'),
  export_paint: z.boolean().default(false).description(
    'ON when a brush stroke exists — the painted payload becomes the mask (everything else is ignored).'),
  paint_mask: z.string().role('path').description(
    'The painted PNG (alpha channel = strokes). Required when export_paint is on.'),
  roi: z.string().description(
    '[x, y, w, h] fractions — run-global crop of every selection.'),
  outputs: z.string().default('[]').description(
    'THE recipe form: one entry per mask, filter (where) over selections, per-mask ops. Replaces every export_* toggle when present.'),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerCard({
    id: 'mask-studio',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'mask-studio',
    // stock-only card (card.py declares no requires — the DSL default
    // ()): SAM3_Detect/RTDETR_detect ride comfy_extras core; no
    // extension pack to declare.
    boarded: ['mask-studio'],
    // ADMISSION EXTRAS (the py class-attr half verbatim: the
    // retired row's admits minus the boarded families' studio
    // writes, which the projection unions from the facts file).
    admits: ['export_kind', 'exports', 'primary_class', 'primary_is_paint', 'primary_via_rtdetr', 'refine_iterations', 'scope_bbox', 'union_paint_into_combined'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      if (typeof p.input_image !== 'string' || !p.input_image.trim()) {
        throw new Error("required param 'input_image' missing on the mask-studio card — the mask lane selects FROM an image")
      }
      maskT1(p, model, g, runId)
    },
  })
}
