// card.ts — the mask FORM card (stroke 64, docs/design/mods-contracts.md
// CONTRACTS B+C): MASK as a simple form card with MODs as ways to get
// different kinds of masks — action oriented (the operator's words).
//
// THE SHAPE (vs the studio): no takeover UI, no canvas — the flat
// form carries ONLY what is not a mask source (input_image,
// output_mode, refine_iterations); every WAY TO GET A MASK is a
// card-declared mod kind (CONTRACT A, stroke 63) on the mod row:
//   mask_detect[]  — { primary_class, via_rtdetr? }  the RT-DETR +
//                    SAM3 source (first entry = the primary)
//   mask_subject[] — { name, prompt }                the SAM3 CLIP
//                    text selection
//   mask_paint[]   — { name, payload }               the painted
//                    payload (alpha = strokes)
// THE BAG IS THE RECIPE (CONTRACT B): apply order = array order
// (the mod system's existing law); compose() walks the bags into
// the SAME maskT1 lane the studio rides (exports/export_kind zip,
// paint union, box manifest) — one lane, two faces.
//
// The parts kind (face/hands/body) rides the CLIP text lane with a
// CLOSED VOCABULARY (stroke 68 — the file-read finding: the studio's
// export_face/hands/body booleans are declared knobs no lane arm
// consumes; parts have always been class words through SAM3's CLIP
// leg. The vocabulary is a TYPE, not a str a wall validates — the
// SAMPLERS law).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { maskT1 } from '@melite/comfyui-card-kit'
import type { ModelFacts } from '@melite/comfyui-cordis'
import { vocabulary } from '@melite/comfyui-card-kit/vocab'
import type { DeclaredModifierKind } from '@melite/comfyui-cordis'

/** The person-part vocabulary (the closed set — face | hands |
 *  body; SAM3's CLIP leg segments the class word). */
const MASK_PARTS = ['face', 'hands', 'body'] as const

// THE ACTION CARD OWNS ITS PINS (the studio's law, shared — the
// same weights, the same lane).
const PINS = {
  checkpoint: 'sam3.1_multiplex_fp16.safetensors',
  unet: 'rt_detr_v4-x-hgnet_fp32.safetensors',
}

const schema = z.object({
  input_image: z.string().role('path').description('Input').extra('extra', { order: 1, group: 'input', width: 2, tooltip: 'The image the mask selects FROM.', wtype: 'image' }),
  output_mode: vocabulary(['segm', 'bbox']).description('Output').default('segm').extra('extra', { order: 2, group: 'input', width: 1, tooltip: 'segm saves masks; bbox saves the drawn-box manifest.', wtype: 'select' }),
  refine_iterations: z.number().description('Refine iterations').min(0).max(8).step(1).default(2).extra('extra', { order: 1, group: 'advanced', width: 1, tooltip: 'SAM3 refine rounds.' }),
})

// THE CARD-DECLARED KINDS (CONTRACT A — served VERBATIM on the one
// features.modifiers channel; the mod section renders them, the
// leaf never learns the declarer). kindFields are the section's own
// scalars (sam_threshold / sam_dilation — committed FLAT by the
// section, admitted past the schema via `admits` below).
const MODS: readonly DeclaredModifierKind[] = [
  {
    kind: 'mask_detect',
    label: 'Detect',
    param_key: 'mask_detect',
    cardinality: 'list',
    max_stack: 8,
    kindFields: [
      { name: 'sam_threshold', label: 'Threshold', type: 'number', default: 0.93, min: 0.5, max: 1, step: 0.01, tooltip: 'SAM3 mask confidence.' },
      { name: 'sam_dilation', label: 'Dilation', type: 'number', default: 0, min: 0, max: 64, step: 1, tooltip: 'Grow the final mask N pixels.' },
    ],
    fields: [
      { name: 'primary_class', label: 'Class', type: 'string', default: 'person', tooltip: 'The class the detector locks (first entry is the primary).' },
      { name: 'via_rtdetr', label: 'Via RT-DETR boxes', type: 'boolean', default: false, tooltip: 'Propose person boxes with RT-DETR, refine with SAM3 (the box-manifest lane).' },
    ],
  },
  {
    kind: 'mask_subject',
    label: 'Subject',
    param_key: 'mask_subject',
    cardinality: 'list',
    max_stack: 8,
    fields: [
      { name: 'name', label: 'Export name', type: 'string', default: 'subject', tooltip: 'The saved mask\'s name (mask_<name>).' },
      { name: 'prompt', label: 'Prompt', type: 'string', default: '', tooltip: 'The SAM3 CLIP text selection — what to segment.' },
    ],
  },
  {
    kind: 'mask_parts',
    label: 'Parts',
    param_key: 'mask_parts',
    cardinality: 'list',
    max_stack: 3,
    fields: [
      { name: 'part', label: 'Part', type: 'select', default: 'face', tooltip: 'The person part to segment (its own mask export).', options: MASK_PARTS.map((p) => ({ value: p, label: p[0]!.toUpperCase()! + p.slice(1) })) },
    ],
  },
  {
    kind: 'mask_paint',
    label: 'Paint',
    param_key: 'mask_paint',
    cardinality: 'list',
    max_stack: 4,
    fields: [
      { name: 'name', label: 'Export name', type: 'string', default: 'paint', tooltip: 'The saved mask\'s name (mask_<name>).' },
      { name: 'payload', label: 'Paint payload', type: 'path', wtype: 'image', default: '', tooltip: 'The painted PNG (alpha channel = strokes).' },
    ],
  },
]

export const identity = {
  label: 'Mask Form',
  description: 'Action form card: pick the input, then ADD ways to get a mask — detect (RT-DETR + SAM3), subject (text selection), paint (payload). Drag to set apply order.',
  genre: 'image',
  icon: 'mask',
  ability: 'tool',
}

/** The bag reader (the wire is the storage): params[param_key] is
 *  the array; non-object entries refuse LOUD (never a silent skip
 *  — a drifted bag is drift, not an empty recipe). */
const bagOf = (p: Record<string, unknown>, key: string, cardId: string): Array<Record<string, unknown>> => {
  const v = p[key]
  if (v === undefined || v === null) return []
  if (!Array.isArray(v)) {
    throw new Error(`param '${key}' on the ${cardId} card must be the mod bag (an array) — got ${typeof v}`)
  }
  return v.map((e, i) => {
    if (typeof e !== 'object' || e === null || Array.isArray(e)) {
      throw new Error(`param '${key}' entry ${i} on the ${cardId} card must be an object (a mod entry) — got ${JSON.stringify(e).slice(0, 60)}`)
    }
    return e as Record<string, unknown>
  })
}

// THE INJECT DECLARATION (the loader's law, cardDefs.ts L11-14):
// the card module must declare `inject = ['comfyui']` at module
// level — passing only { apply } drops the inject and the service
// dies with "cannot get property comfyui without inject".
export const inject: string[] = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'mask-form',
    skeleton: 'mask-form',
    boarded: [],
    tags: ['image', 'mask', 'edit', 'form'],
    requiresModel: false,
    identity,
    provisions: [],
    sidebar: { key: 'image', order: 9 },
    // no surface row — a FORM card (layout serves null; the studio
    // keeps its takeover until parity retires it, CONTRACT D)
    flowKinds: {
      inputs: { input_image: 'image' },
      outputs: { default: 'seg' },
      requiresModel: false,
    },
    // THE MOD-OWNED NAMES ride admits (the compose door's explicit-
    // params overlay — the bags + the section's kindFields scalars
    // never touch the flat schema).
    admits: ['mask_detect', 'mask_subject', 'mask_parts', 'mask_paint', 'sam_threshold', 'sam_dilation'],
    mods: MODS,
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, _model, g, runId) {
      if (typeof p.input_image !== 'string' || !p.input_image.trim()) {
        throw new Error("required param 'input_image' missing on the mask-form card — the mask lane selects FROM an image")
      }
      const detect = bagOf(p, 'mask_detect', 'mask-form')
      const subject = bagOf(p, 'mask_subject', 'mask-form')
      const paint = bagOf(p, 'mask_paint', 'mask-form')
      const parts = bagOf(p, 'mask_parts', 'mask-form')
      if (detect.length === 0 && subject.length === 0 && paint.length === 0 && parts.length === 0) {
        throw new Error('no mask sources on the mask-form card — add at least one modifier (detect, subject, parts, or paint)')
      }
      // THE BAG WALK (CONTRACT B): apply order = array order — the
      // first detect entry is the PRIMARY; every further entry is a
      // per-name export; subject entries are text-lane exports;
      // paint entries are paint exports (payload → paint_mask, the
      // first unions into combined when a primary exists).
      const lane: Record<string, unknown> = {
        input_image: p.input_image,
        sam_threshold: p.sam_threshold,
        sam_dilation: p.sam_dilation,
        refine_iterations: p.refine_iterations,
        export_boxes: p.output_mode === 'bbox',
      }
      const exports: Array<[string, string]> = []
      const exportKind: string[] = []
      if (detect.length > 0) {
        const first = detect[0]
        if (typeof first['primary_class'] !== 'string' || (first['primary_class'] as string) === '') {
          throw new Error("mask_detect entry 0 needs a 'primary_class' — the detector locks a class")
        }
        lane['primary_class'] = first['primary_class'] as string
        if (first['via_rtdetr'] === true) lane['primary_via_rtdetr'] = true
        for (let i = 1; i < detect.length; i++) {
          const cls = detect[i]['primary_class']
          if (typeof cls !== 'string' || cls === '') {
            throw new Error(`mask_detect entry ${i} needs a 'primary_class'`)
          }
          exports.push([`detect_${i}`, cls])
          exportKind.push('text')
        }
      }
      for (let i = 0; i < subject.length; i++) {
        const prompt = subject[i]['prompt']
        if (typeof prompt !== 'string' || prompt === '') {
          throw new Error(`mask_subject entry ${i} needs a 'prompt' — the text selection is the source`)
        }
        const name = typeof subject[i]['name'] === 'string' && (subject[i]['name'] as string) !== '' ? subject[i]['name'] as string : `subject_${i + 1}`
        exports.push([name, prompt])
        exportKind.push('text')
      }
      // THE PARTS LANE (stroke 68): a closed vocabulary through the
      // CLIP text lane — each entry is its own mask export.
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]['part']
        if (typeof part !== 'string' || !(MASK_PARTS as readonly string[]).includes(part)) {
          throw new Error(`mask_parts entry ${i} needs a 'part' of ${MASK_PARTS.join(' | ')} — got ${JSON.stringify(part)}`)
        }
        exports.push([`part_${part}`, part])
        exportKind.push('text')
      }
      for (let i = 0; i < paint.length; i++) {
        const payload = paint[i]['payload']
        if (typeof payload !== 'string' || payload === '') {
          throw new Error(`mask_paint entry ${i} needs a 'payload' — the painted PNG is the source`)
        }
        const name = typeof paint[i]['name'] === 'string' && (paint[i]['name'] as string) !== '' ? paint[i]['name'] as string : `paint_${i + 1}`
        exports.push([name, ''])
        exportKind.push('paint')
        if (lane['paint_mask'] === undefined) {
          lane['paint_mask'] = payload
          // the first paint unions into combined when a primary exists
          if (detect.length > 0) lane['union_paint_into_combined'] = true
        }
      }
      if (exports.length > 0) {
        lane['exports'] = exports
        lane['export_kind'] = exportKind
      }
      maskT1(lane, PINS, g, runId)
    },
  }))
}
