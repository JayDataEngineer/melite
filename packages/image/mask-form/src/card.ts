// card.ts — the mask FORM card, RESHAPED (stroke 78, the operator's
// mods-abstraction law): MASK as a SIMPLE form card whose entire
// complexity lives in MODS. The flat form carries ONLY the lane
// scalars (input_image + the SAM knobs); every WAY TO GET A MASK is
// a card-declared mod kind — and every kind now declares its
// CATEGORY (the stroke-78 law):
//   sam3[] — standalone: SAM3 selection. A CLIP text prompt (what
//            to segment), or RT-DETR person boxes refined by SAM3
//            (via_rtdetr). Optional bbox — a drawn rectangle the
//            selection locks to (the bbox-canvas leaf face: an
//            image preview the user drags a selection on).
//   sam2[] — standalone: the person-parts segmenter (face | hands
//            | body — the closed CLIP vocabulary; the retired
//            studio labeled this arm "sam2"). Optional bbox, same
//            face.
//   draw[] — ORDERED: the painted payload (alpha = strokes). A
//            draw STACKS — it receives the previous outputs and
//            unions onto the combined mask (the ordered chain:
//            each payload composites in bag order), modifying the
//            mask call, never running its own inference. A draw
//            without a standalone source refuses LOUD.
// STANDALONE = applies to the same base image, provides its OWN
// output (each entry is its own mask export; order is void).
// ORDERED = stacks in bag order on the previous outputs. The FIRST
// standalone entry is the primary (saves mask_combined — the union
// anchor); every further entry is a per-name export. The paint face
// is the demoted studio's canvas (stroke 76); the bbox face is new.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { maskT1 } from '@melite/comfyui-card-kit'
import { vocabulary } from '@melite/comfyui-card-kit/vocab'
import type { DeclaredModifierKind } from '@melite/comfyui-cordis'

/** The person-part vocabulary (the closed set — face | hands |
 * body; SAM3's CLIP leg segments the class word). */
const MASK_PARTS = ['face', 'hands', 'body'] as const

// THE ACTION CARD OWNS ITS PINS (the studio's law, shared — the
// same weights, the same lane).
const PINS = {
  checkpoint: 'sam3.1_multiplex_fp16.safetensors',
  unet: 'rt_detr_v4-x-hgnet_fp32.safetensors',
}

// THE SIMPLE FORM (the operator's law: the card IS simple — the
// complexity lives in mods): the input image + the SAM lane's own
// knobs. Every source knob (thresholds, instances, the manifest,
// RT-DETR, payloads, boxes) is mod-owned.
const schema = z.object({
  input_image: z.string().role('path').description('Input').extra('extra', { order: 1, group: 'input', width: 2, tooltip: 'The image every mask selects FROM.', wtype: 'image' }),
  refine_iterations: z.number().description('Refine iterations').min(0).max(8).step(1).default(2).extra('extra', { order: 1, group: 'advanced', width: 1, tooltip: 'SAM3 refine rounds.' }),
  sam_threshold: z.number().description('Mask threshold').min(0.5).max(1).step(0.01).default(0.93).extra('extra', { order: 2, group: 'advanced', width: 1, tooltip: 'SAM3 mask confidence (every source shares it).' }),
  sam_dilation: z.number().description('Dilation').min(0).max(64).step(1).default(0).extra('extra', { order: 3, group: 'advanced', width: 1, tooltip: 'Grow every mask N pixels.' }),
})

// The optional bbox's four entry fields (the bbox-canvas leaf
// writes them; -1 = unset, the selection runs unscoped).
const BBOX_FIELDS = ([
  ['bbox_x', 'Box x', 'Left edge, image pixels.'],
  ['bbox_y', 'Box y', 'Top edge, image pixels.'],
  ['bbox_w', 'Box width', 'Rectangle width, image pixels.'],
  ['bbox_h', 'Box height', 'Rectangle height, image pixels.'],
] as const).map(([name, label, tooltip]) => ({
  name,
  label,
  type: 'number',
  default: -1,
  min: -1,
  step: 1,
  tooltip: `${tooltip} (-1 = no box; use Draw box on the image.)`,
}))

/** Reads an entry's bbox (null when unset; a PRESENT non-number
 * refuses LOUD — never silently skipped, even when the siblings
 * are absent). */
const bboxOf = (e: Record<string, unknown>, key: string): [number, number, number, number] | null => {
  const quad = [e['bbox_x'], e['bbox_y'], e['bbox_w'], e['bbox_h']]
  if (quad.some((v) => v !== undefined && v !== null && (typeof v !== 'number' || !Number.isFinite(v)))) {
    throw new Error(`${key} entry's bbox must be four numbers (bbox_x/y/w/h) — got ${JSON.stringify(quad).slice(0, 60)}`)
  }
  if (quad.some((v) => v === undefined || v === null)) return null
  if (quad.some((v) => (v as number) < 0)) return null
  return quad as [number, number, number, number]
}

// THE CARD-DECLARED KINDS (CONTRACT A — served VERBATIM on the one
// features.modifiers channel) with their CATEGORIES (stroke 78).
const MODS: readonly DeclaredModifierKind[] = [
  {
    kind: 'sam3',
    label: 'SAM3',
    param_key: 'sam3',
    category: 'standalone',
    cardinality: 'list',
    max_stack: 8,
    // THE BBOX FACE (stroke 78): the selection preview — the Draw
    // box verb fills the entry's four bbox fields.
    leaf_face: 'bbox-canvas',
    kindFields: [
      // RT-DETR is SAM3's own arm (person boxes + the manifest)
      { name: 'detection_threshold', label: 'Detection threshold', type: 'number', default: 0.35, min: 0.05, max: 0.95, step: 0.05, tooltip: 'RT-DETR box confidence. Lower catches more instances, noisier boxes.' },
      { name: 'max_instances', label: 'Max instances', type: 'number', default: 0, min: 0, max: 100, step: 1, tooltip: 'Cap detected instances (0 = no cap). Read the manifest first, then narrow.' },
      { name: 'export_boxes', label: 'Export box manifest', type: 'boolean', default: true, tooltip: 'Draw RT-DETR boxes on the image — the instance manifest.' },
    ],
    fields: [
      { name: 'name', label: 'Export name', type: 'string', default: 'sam3', tooltip: "The saved mask's name (mask_<name>)." },
      { name: 'prompt', label: 'Prompt', type: 'string', default: '', tooltip: 'The SAM3 CLIP text selection — what to segment (empty + RT-DETR = the person-box lane).' },
      { name: 'via_rtdetr', label: 'Via RT-DETR boxes', type: 'boolean', default: false, tooltip: 'Propose person boxes with RT-DETR, refine with SAM3 (the box-manifest lane).' },
      ...BBOX_FIELDS,
    ],
  },
  {
    kind: 'sam2',
    label: 'SAM2',
    param_key: 'sam2',
    category: 'standalone',
    cardinality: 'list',
    max_stack: 3,
    leaf_face: 'bbox-canvas',
    fields: [
      { name: 'name', label: 'Export name', type: 'string', default: 'sam2', tooltip: "The saved mask's name (mask_<name>)." },
      { name: 'part', label: 'Part', type: 'select', default: 'face', tooltip: 'The person part to segment (its own mask export).', options: MASK_PARTS.map((p) => ({ value: p, label: p[0]!.toUpperCase()! + p.slice(1) })) },
      ...BBOX_FIELDS,
    ],
  },
  {
    kind: 'draw',
    label: 'Draw',
    param_key: 'draw',
    category: 'ordered',
    cardinality: 'list',
    max_stack: 4,
    // THE PAINT FACE (paint-leaf-canvas.md): the brush verb rides
    // the payload field — the demoted studio's canvas, ported.
    leaf_face: 'paint-canvas',
    fields: [
      { name: 'name', label: 'Export name', type: 'string', default: 'draw', tooltip: "The saved mask's name (mask_<name>)." },
      { name: 'payload', label: 'Paint payload', type: 'path', wtype: 'image', default: '', tooltip: 'The painted PNG (alpha channel = strokes).' },
    ],
  },
]

export const identity = {
  label: 'Mask Form',
  description: 'Simple mask form: pick the input, then ADD sources — sam3 (text selection, optional box), sam2 (person parts, optional box), draw (painted, stacks onto the rest).',
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
    // no surface row — a FORM card (layout serves null)
    flowKinds: {
      inputs: { input_image: 'image' },
      outputs: { default: 'seg' },
      requiresModel: false,
    },
    // THE MOD-OWNED NAMES ride admits (the compose door's explicit-
    // params overlay — the bags + the section's kindFields scalars
    // never touch the flat schema).
    admits: ['sam3', 'sam2', 'draw', 'detection_threshold', 'max_instances', 'export_boxes'],
    mods: MODS,
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, _model, g, runId) {
      if (typeof p.input_image !== 'string' || !p.input_image.trim()) {
        throw new Error("required param 'input_image' missing on the mask-form card — the mask lane selects FROM an image")
      }
      const sam3 = bagOf(p, 'sam3', 'mask-form')
      const sam2 = bagOf(p, 'sam2', 'mask-form')
      const draw = bagOf(p, 'draw', 'mask-form')
      if (sam3.length === 0 && sam2.length === 0 && draw.length === 0) {
        throw new Error('no mask sources on the mask-form card — add at least one modifier (sam3, sam2, or draw)')
      }
      if (draw.length > 0 && sam3.length === 0 && sam2.length === 0) {
        throw new Error('a draw stacks ONTO a mask — add a standalone source first (sam3 or sam2), then the draw')
      }

      // THE STANDALONE WALK: sources in bag order — the FIRST
      // standalone entry is the primary (mask_combined, the union
      // anchor); every entry after it is a per-name export.
      const lane: Record<string, unknown> = {
        input_image: p.input_image,
        sam_threshold: p.sam_threshold,
        sam_dilation: p.sam_dilation,
        refine_iterations: p.refine_iterations,
        // RT-DETR knobs (sam3's kindFields) thread when committed
        // (absent rides the kit fallbacks); the manifest defaults ON
        detection_threshold: p.detection_threshold,
        max_instances: p.max_instances,
        export_boxes: p.export_boxes !== false,
      }

      // the unified standalone source stream: [kind, index] in
      // cross-bag order (sam3's bag first — the declared MODS order)
      type Src = { kind: 'sam3' | 'sam2'; entry: Record<string, unknown>; i: number }
      const sources: Src[] = [
        ...sam3.map((entry, i) => ({ kind: 'sam3' as const, entry, i })),
        ...sam2.map((entry, i) => ({ kind: 'sam2' as const, entry, i })),
      ]
      const nameOf = (s: Src, fallback: string): string => {
        const n = s.entry['name']
        return typeof n === 'string' && n !== '' ? n : fallback
      }

      const exports: Array<[string, string, unknown?]> = []
      const exportKind: string[] = []

      // ── the primary (the first standalone source) ──
      const primary = sources[0]
      if (primary.kind === 'sam3') {
        if (primary.entry['via_rtdetr'] === true) {
          lane['primary_via_rtdetr'] = true
        } else {
          const prompt = primary.entry['prompt']
          if (typeof prompt !== 'string' || prompt === '') {
            throw new Error("sam3 entry 0 needs a 'prompt' (or 'Via RT-DETR boxes') — the first source anchors mask_combined")
          }
          lane['primary_prompt'] = prompt
        }
      } else {
        // sam2 parts ride the CLIP text lane (the class word)
        const part = primary.entry['part']
        if (typeof part !== 'string' || !MASK_PARTS.includes(part as (typeof MASK_PARTS)[number])) {
          throw new Error(`sam2 entry 0 needs a 'part' (face | hands | body) — got ${JSON.stringify(part)}`)
        }
        lane['primary_prompt'] = part
      }

      // ── every source after the primary: its own export ──
      for (let s = 1; s < sources.length; s++) {
        const src = sources[s]
        if (src.kind === 'sam3') {
          const prompt = src.entry['prompt']
          if (typeof prompt !== 'string') {
            throw new Error(`sam3 entry ${src.i} needs a 'prompt' (a string) — got ${String(JSON.stringify(prompt)).slice(0, 40)}`)
          }
          const bbox = bboxOf(src.entry, 'sam3')
          exports.push([nameOf(src, `sam3_${src.i + 1}`), prompt, bbox ?? undefined])
          exportKind.push('text')
        } else {
          const part = src.entry['part']
          if (typeof part !== 'string' || !MASK_PARTS.includes(part as (typeof MASK_PARTS)[number])) {
            throw new Error(`sam2 entry ${src.i} needs a 'part' (face | hands | body) — got ${JSON.stringify(part)}`)
          }
          const bbox = bboxOf(src.entry, 'sam2')
          exports.push([nameOf(src, `sam2_${src.i + 1}`), part, bbox ?? undefined])
          exportKind.push('text')
        }
      }
      if (exports.length > 0) {
        lane['exports'] = exports
        lane['export_kind'] = exportKind
      }

      // ── THE ORDERED DRAW STACK (bag order): each payload is its
      // own paint export AND one hop in the union chain onto
      // mask_combined (the kit composites them in array order —
      // the previous outputs flow into the next). ──
      const paintMasks: string[] = []
      for (let i = 0; i < draw.length; i++) {
        const payload = draw[i]['payload']
        if (typeof payload !== 'string' || payload === '') {
          throw new Error(`draw entry ${i} needs a 'payload' — the painted PNG is the mask`)
        }
        const name = typeof draw[i]['name'] === 'string' && (draw[i]['name'] as string) !== '' ? draw[i]['name'] as string : `draw_${i + 1}`
        exports.push([name, payload])
        exportKind.push('paint')
        paintMasks.push(payload)
      }
      if (exports.length > 0) {
        lane['exports'] = exports
        lane['export_kind'] = exportKind
      }
      if (paintMasks.length > 0) lane['paint_masks'] = paintMasks

      maskT1(lane, PINS, g, runId)
    },
  }))
}
