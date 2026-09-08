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
  // py card.py truth (card-decls.json, 17 keys): the declared knob
  // surface. The legacy TS renderer keys (primary_class/prompt,
  // refine_iterations, exports/export_kind, scope_bbox, union_...,
  // primary_via_rtdetr/is_paint) ride the door's explicit-params
  // overlay (non-strict object) so the pinned recipe golden keeps
  // composing byte-identical — they are never declared knobs.
  input_image: z.string(),
  detect_mode: z.string().default('body'),
  detection_threshold: z.number().default(0.35),
  sam_threshold: z.number().default(0.93),
  sam_dilation: z.number().default(0),
  output_mode: z.string().default('segm'),
  instance_filter: z.string().default('all'),
  max_instances: z.number().default(0),
  // ABSENT/defaultless optionals (bare = optional at parse,
  // ''-absent at compose via ?? '' — the image-gen precedent).
  sam3_prompt: z.string(),
  export_boxes: z.boolean().default(true),
  export_face: z.boolean().default(false),
  export_hands: z.boolean().default(false),
  export_body: z.boolean().default(false),
  export_paint: z.boolean().default(false),
  paint_mask: z.string(),
  roi: z.string(),
  outputs: z.string().default('[]'),
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
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      if (typeof p.input_image !== 'string' || !p.input_image.trim()) {
        throw new Error("required param 'input_image' missing on the mask-studio card — the mask lane selects FROM an image")
      }
      maskT1(p, model, g, runId)
    },
  })
}
