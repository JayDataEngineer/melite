// card.ts — the mask FORM card (the stroke-95 rework, the
// operator's design: "Inputs bar, then the Mods bar for the
// different ways we can mask. The mods would open up a popup with
// visual preview"). THE BASE CARD IS TWO BARS AND NOTHING ELSE:
// the Inputs rail (input_image — the declared signature seats it)
// and the Modifiers bar (the add square + the tiles). Every knob
// a mask source owns rides its bag ENTRY (the wire is the
// storage); the mod leaf popup carries the EMBEDDED CANVAS (the
// visual preview — drag a rectangle on sam3/sam2, brush strokes
// on draw) with the entry's own fields under it. The stroke-78
// shape (flat lane scalars + pack-level kindFields rows on the
// card face) was the transfer debt — retired here.
//
// The card-declared mod kinds (the category law stands):
//   sam3[] — standalone: SAM3 selection. A CLIP text prompt (what
//            to segment), or RT-DETR person boxes refined by SAM3
//            (via_rtdetr — the primary's own arm). The entry's
//            optional bbox scopes its selection (the EMBEDDED
//            bbox canvas — faceOwned fields, never raw inputs).
//   sam2[] — standalone: the YOLO + SAM2 arm (YOLO proposes boxes
//            for the labels word, SAM2 refines them into masks).
//            Same embedded bbox canvas. Declares its packs
//            (impact-pack + impact-subpack) and its weights —
//            declared, then auto provisioned.
//   draw[] — ORDERED: the painted payload (alpha = strokes). A
//            draw STACKS — it receives the previous outputs and
//            unions onto the combined mask (the ordered chain),
//            modifying the mask call, never running its own
//            inference. The EMBEDDED paint canvas is the leaf's
//            face (the payload square rides under it — the PNG is
//            the contract either way). A draw without a standalone
//            source refuses LOUD.
// STANDALONE = applies to the same base image, provides its OWN
// output (each entry is its own mask export; order is void).
// ORDERED = stacks in bag order on the previous outputs. The FIRST
// standalone entry is the primary (saves mask_combined — the union
// anchor); every further entry is a per-name export.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { maskT1 } from '@melite/comfyui-card-kit'
import type { DeclaredModifierKind } from '@melite/comfyui-cordis'

// THE ACTION CARD OWNS ITS PINS (the studio's law, shared — the
// same weights, the same lane). sam2 + yolo are the SAM2
// impact-pack arm's pins (the card DECLARES them as provisions
// below — declared, then auto provisioned, the operator's
// 2026-09-19 order).
const PINS = {
  checkpoint: 'sam3.1_multiplex_fp16.safetensors',
  unet: 'rt_detr_v4-x-hgnet_fp32.safetensors',
  sam2: 'sam2.1_hiera_large.pt',
  yolo: 'bbox/yolo11m.pt',
}

// THE YOLO VOCABULARY (the pin's own truth, the operator's
// 2026-10-08 verdict: "why is SAM2 selection a FREEFORM TEXT BOX?
// IN WHAT WORLD DOES THAT MAKE SENSE?"): the pinned yolo11m is
// COCO-trained — these 80 classes are the detector's WHOLE world.
// The labels field is a CLOSED multi-chips select over them (the
// wire a comma-joined string, this order); compose refuses any
// word outside the vocabulary LOUD (a typo would otherwise detect
// nothing, silently).
const YOLO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog',
  'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella',
  'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball', 'kite',
  'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 'bottle',
  'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich',
  'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
  'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote',
  'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book',
  'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush',
] as const

/** Reads one entry's labels AGAINST the vocabulary: a comma-joined
 *  set of COCO classes (this declaration's own order, deduped) —
 *  empty or any unknown word refuses LOUD, naming the offender. */
const labelsOf = (e: Record<string, unknown>, key: string): string => {
  const raw = e['labels']
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error(`${key} needs 'labels' (pick YOLO classes — the chips) — got ${JSON.stringify(raw).slice(0, 40)}`)
  }
  const words = raw.split(',').map((w) => w.trim()).filter((w) => w !== '')
  const unknown = words.filter((w) => !(YOLO_CLASSES as readonly string[]).includes(w))
  if (unknown.length > 0) {
    throw new Error(`${key}: 'labels' carries non-YOLO words ${JSON.stringify(unknown)} — the detector knows only the 80 COCO classes (person, car, dog, …)`)
  }
  return [...YOLO_CLASSES].filter((c) => words.includes(c)).join(',')
}

// THE SIMPLE FORM (the stroke-95 law: the card IS the two bars —
// the input rail + the mods section; the flat schema carries the
// INPUT ONLY). Every source knob — thresholds, instances, refine,
// dilation, the manifest — is mod-owned bag state.
const schema = z.object({
  input_image: z.string().role('path').description('Input').extra('extra', { order: 1, group: 'input', width: 2, tooltip: 'The image every mask selects FROM.', wtype: 'image' }),
})

// The optional bbox's four entry fields (the EMBEDDED bbox canvas
// writes them; -1 = unset, the selection runs unscoped — the four
// are FACE-OWNED: the leaf hides them under the canvas and shows
// them only when the host degrades to plain inputs).
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
  faceOwned: true,
  tooltip: `${tooltip} (drawn on the image in the popup.)`,
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
// The stroke-95 law: NO kindFields — every knob is an ENTRY field
// (the popup owns it; the section renders tiles only).
const MODS: readonly DeclaredModifierKind[] = [
  {
    kind: 'sam3',
    label: 'SAM3',
    param_key: 'sam3',
    category: 'standalone',
    cardinality: 'list',
    max_stack: 8,
    // THE EMBEDDED BBOX CANVAS (stroke 95): the selection preview
    // at the top of the leaf popup — the drawn rectangle fills the
    // entry's four faceOwned bbox fields.
    leaf_face: 'bbox-canvas',
    fields: [
      { name: 'name', label: 'Export name', type: 'string', default: 'sam3', tooltip: "The saved mask's name (mask_<name>)." },
      { name: 'prompt', label: 'Prompt', type: 'string', default: '', tooltip: 'The SAM3 CLIP text selection — what to segment (empty + RT-DETR = the person-box lane).' },
      { name: 'via_rtdetr', label: 'Via RT-DETR boxes', type: 'boolean', default: false, tooltip: 'Propose person boxes with RT-DETR, refine with SAM3 (the box-manifest lane — the FIRST entry anchors it).' },
      { name: 'refine_iterations', label: 'Refine iterations', type: 'number', default: 2, min: 0, max: 8, step: 1, tooltip: 'This selection\'s SAM3 refine rounds.' },
      { name: 'sam_threshold', label: 'Mask threshold', type: 'number', default: 0.93, min: 0.5, max: 1, step: 0.01, tooltip: 'This selection\'s SAM3 mask confidence.' },
      { name: 'sam_dilation', label: 'Dilation', type: 'number', default: 0, min: 0, max: 64, step: 1, tooltip: 'Grow this mask N pixels.' },
      // RT-DETR knobs — the entry's own arm (via RT-DETR boxes);
      // the manifest reads the first entry that rides the lane.
      { name: 'detection_threshold', label: 'Detection threshold', type: 'number', default: 0.35, min: 0.05, max: 0.95, step: 0.05, tooltip: 'RT-DETR box confidence (this entry\'s Via-RT-DETR arm + the manifest). Lower catches more instances, noisier boxes.' },
      { name: 'max_instances', label: 'Max instances', type: 'number', default: 0, min: 0, max: 100, step: 1, tooltip: 'Cap detected instances (0 = no cap). Read the manifest first, then narrow.' },
      { name: 'export_boxes', label: 'Export box manifest', type: 'boolean', default: true, tooltip: 'Draw this entry\'s RT-DETR boxes on the manifest image — the instance readback.' },
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
    // THE EMBEDDED BBOX CANVAS (stroke 95): same face as sam3.
    leaf_face: 'bbox-canvas',
    // THE DECLARED DEPENDENCIES (the operator's 2026-09-19 order —
    // "declared, then auto provisioned"): the SAM2 arm rides the
    // impact-pack chain (YOLO proposes, SAM2 refines), so the kind
    // declares BOTH packs — the compose door refuses without them
    // (an unused sam2 bag never fires the gate), and RunRescue
    // offers the install through the manage seat.
    requires: ['comfyui-impact-pack', 'comfyui-impact-subpack'],
    fields: [
      { name: 'name', label: 'Export name', type: 'string', default: 'sam2', tooltip: "The saved mask's name (mask_<name>)." },
      { name: 'labels', label: 'YOLO classes', type: 'select', multi: true, options: YOLO_CLASSES.map((c) => ({ value: c, label: c })), default: 'person', tooltip: 'The COCO classes the YOLO detector proposes (Impact Pack) — SAM2 refines each box. Pick any set; the wire is the comma-joined list.' },
      { name: 'yolo_threshold', label: 'YOLO threshold', type: 'number', default: 0.5, min: 0.05, max: 0.95, step: 0.05, tooltip: 'This entry\'s YOLO box confidence. Lower catches more instances, noisier boxes.' },
      { name: 'sam_threshold', label: 'Mask threshold', type: 'number', default: 0.93, min: 0.5, max: 1, step: 0.01, tooltip: 'This selection\'s SAM2 mask confidence.' },
      { name: 'sam_dilation', label: 'Dilation', type: 'number', default: 0, min: 0, max: 64, step: 1, tooltip: 'Grow this mask N pixels.' },
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
    // THE EMBEDDED PAINT CANVAS (stroke 95): the brush rides at
    // the top of the leaf popup — the payload field under it IS
    // the contract (the PNG's alpha = strokes).
    leaf_face: 'paint-canvas',
    fields: [
      { name: 'name', label: 'Export name', type: 'string', default: 'draw', tooltip: "The saved mask's name (mask_<name>)." },
      { name: 'payload', label: 'Paint payload', type: 'path', wtype: 'image', default: '', tooltip: 'The painted PNG (alpha channel = strokes) — painted in the popup, or uploaded/dropped/picked here.' },
    ],
  },
]

export const identity = {
  label: 'Mask',
  description: 'Simple mask: pick the input, then ADD sources — sam3 (text selection, optional box), sam2 (YOLO proposes + SAM2 refines, optional box), draw (painted, stacks onto the rest). Each popup previews the image and carries its own knobs.',
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

/** One declared field row's validation-relevant face (the bounds
 *  read FROM the declaration — single source of truth, never
 *  re-typed at the read site). DefaultedField is the total face:
 *  every field read through scalarOf declares a default — the
 *  declaration is a file-const literal, so drift is a TYPECHECK
 *  failure, never a runtime arm. */
type DeclaredField = { name: string; label?: string; type?: unknown; min?: unknown; max?: unknown; default?: unknown }
type DefaultedField = DeclaredField & { default: number | boolean | string }

/** Reads one entry scalar AGAINST its declared field (the stroke-95
 *  per-entry law): absent/null → the declared default; a value of
 *  the wrong JS type or outside the declared bounds refuses LOUD
 *  (naming the entry and the field — never a silent clamp). */
const scalarOf = (where: string, entry: Record<string, unknown>, f: DefaultedField): number | boolean | string => {
  const key = f.name
  const v = entry[key]
  if (v === undefined || v === null) {
    return f.default
  }
  if (f.type === 'boolean') {
    if (typeof v !== 'boolean') {
      throw new Error(`${where}: '${key}' must be a boolean — got ${JSON.stringify(v).slice(0, 40)}`)
    }
    return v
  }
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`${where}: '${key}' must be a number — got ${JSON.stringify(v).slice(0, 40)}`)
  }
  if (typeof f.min === 'number' && v < f.min) {
    throw new Error(`${where}: '${key}' must be within ${String(f.min)}–${String(f.max)} — got ${String(v)}`)
  }
  if (typeof f.max === 'number' && v > f.max) {
    throw new Error(`${where}: '${key}' must be within ${String(f.min)}–${String(f.max)} — got ${String(v)}`)
  }
  return v
}

// THE INJECT DECLARATION (the loader's law, cardDefs.ts L11-14):
// the card module must declare `inject = ['comfyui']` at module
// level — passing only { apply } drops the inject and the service
// dies with "cannot get property comfyui without inject".
export const inject: string[] = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'mask',
    skeleton: 'mask',
    boarded: [],
    tags: ['image', 'mask', 'edit', 'form'],
    requiresModel: false,
    identity,
    // THE DECLARED WEIGHTS (the operator's 2026-09-19 order —
    // "declared, then auto provisioned"): the SAM2 arm's two weight
    // files — the sam2 checkpoint (SAMLoader reads models/sams/)
    // and the YOLO detector (the subpack provider reads
    // models/ultralytics/bbox/). Hashes minted by direct download
    // 2026-09-19 (the supply-chain law: a declared hash is a
    // VERIFIED hash, never copied from a README).
    provisions: [
      {
        name: 'sam2.1_hiera_large.pt',
        url: 'https://huggingface.co/facebook/sam2.1-hiera-large/resolve/main/sam2.1_hiera_large.pt',
        folder: 'sams',
        sha256: '2647878d5dfa5098f2f8649825738a9345572bae2d4350a2468587ece47dd318',
        size_bytes: 898083611,
      },
      {
        name: 'yolo11m.pt',
        url: 'https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11m.pt',
        folder: 'ultralytics/bbox',
        sha256: 'd5ffc1a674953a08e11a8d21e022781b1b23a19b730afc309290bd9fb5305b95',
        size_bytes: 40684120,
      },
    ],
    sidebar: { key: 'image', order: 9 },
    // no surface row — a FORM card (layout serves null)
    flowKinds: {
      inputs: { input_image: 'image' },
      outputs: { default: 'seg' },
      requiresModel: false,
    },
    // THE MOD-OWNED NAMES ride admits (the compose door's explicit-
    // params overlay — the three bags; every knob lives INSIDE a
    // bag entry, never flat on the doc).
    admits: ['sam3', 'sam2', 'draw'],
    mods: MODS,
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, _model, g, runId) {
      // THE SCHEMA GATE (the music/sfx/tts admission precedent):
      // the card's own declaration validates the last hop — here
      // the input's presence (the lane scalars all live in the
      // bags now; the composer's reads below are reads of GATED
      // bag entries through scalarOf).
      const doc = schema(p) as unknown as Record<string, unknown>
      if (typeof doc.input_image !== 'string' || !doc.input_image.trim()) {
        throw new Error("required param 'input_image' missing on the mask card — the mask lane selects FROM an image")
      }
      const sam3 = bagOf(doc, 'sam3', 'mask')
      const sam2 = bagOf(doc, 'sam2', 'mask')
      const draw = bagOf(doc, 'draw', 'mask')
      if (sam3.length === 0 && sam2.length === 0 && draw.length === 0) {
        throw new Error('no mask sources on the mask card — add at least one modifier (sam3, sam2, or draw)')
      }
      if (draw.length > 0 && sam3.length === 0 && sam2.length === 0) {
        throw new Error('a draw stacks ONTO a mask — add a standalone source first (sam3 or sam2), then the draw')
      }

      // THE DECLARED FIELDS, indexed (every read below validates
      // against the declaration — the bounds are DATA, never
      // re-typed per key). Total by construction: the kinds carry
      // const-literal field rows, and every name read through
      // num()/bool() exists on its kind (a drift is a typecheck
      // failure — scalarOf remains the loud arm for WIRE data).
      const fieldsOfKind = new Map(MODS.map((m) => [m.kind, m.fields! as DeclaredField[]]))
      // (get() is total here by the same construction — num()/bool()
      // only ever ask for 'sam3' | 'sam2', both const rows above)
      const fieldOf = (kind: string, name: string): DefaultedField =>
        fieldsOfKind.get(kind)!.find((f) => f.name === name) as DefaultedField
      const num = (where: string, entry: Record<string, unknown>, kind: string, name: string): number =>
        scalarOf(where, entry, fieldOf(kind, name)) as number
      const bool = (where: string, entry: Record<string, unknown>, kind: string, name: string): boolean =>
        scalarOf(where, entry, fieldOf(kind, name)) as boolean

      // the unified standalone source stream: [kind, index] in
      // cross-bag order (sam3's bag first — the declared MODS order)
      type Src = { kind: 'sam3' | 'sam2'; entry: Record<string, unknown>; i: number }
      const sources: Src[] = [
        ...sam3.map((entry, i) => ({ kind: 'sam3' as const, entry, i })),
        ...sam2.map((entry, i) => ({ kind: 'sam2' as const, entry, i })),
      ]
      const nameOf = (s: Src, fallback: string): string => {
        const n = s.entry['name']
        if (n === undefined || n === null || n === '') return fallback
        if (typeof n !== 'string') {
          throw new Error(`${whereOf(s)}: 'name' must be a string — got ${JSON.stringify(n)}`)
        }
        return n
      }
      const whereOf = (s: Src): string => `${s.kind} entry ${s.i}`

      // ── the primary (the first standalone source): its own tune
      // threads the lane's flat reads (the lane's primary arm);
      // every source after it is a per-name export with a per-entry
      // tune on its trip. ──
      const primary = sources[0]
      // the primary anchors mask_combined (no named export of its
      // own) — its name is still a DECLARED field: validate it loud
      // (a wrong-typed name on any entry is a mistake, never a
      // silent skip)
      nameOf(primary, 'combined')
      const lane: Record<string, unknown> = {
        input_image: doc.input_image,
        sam_threshold: num(whereOf(primary), primary.entry, primary.kind, 'sam_threshold'),
        sam_dilation: num(whereOf(primary), primary.entry, primary.kind, 'sam_dilation'),
      }
      if (primary.kind === 'sam3') {
        lane['refine_iterations'] = num(whereOf(primary), primary.entry, 'sam3', 'refine_iterations')
      }
      // THE PRIMARY SCOPE (the first entry's drawn box — threads as
      // the lane's scope_bbox; every SELECTION primary honors it).
      const primaryBox = bboxOf(primary.entry, primary.kind)
      if (primaryBox) lane['scope_bbox'] = primaryBox
      if (primary.kind === 'sam3') {
        // the RT-DETR knobs thread from the primary (its own arm)
        lane['detection_threshold'] = num(whereOf(primary), primary.entry, 'sam3', 'detection_threshold')
        lane['max_instances'] = num(whereOf(primary), primary.entry, 'sam3', 'max_instances')
        if (bool(whereOf(primary), primary.entry, 'sam3', 'via_rtdetr')) {
          lane['primary_via_rtdetr'] = true
        } else {
          const prompt = primary.entry['prompt']
          if (typeof prompt !== 'string' || prompt === '') {
            throw new Error("sam3 entry 0 needs a 'prompt' (or 'Via RT-DETR boxes') — the first source anchors mask_combined")
          }
          lane['primary_prompt'] = prompt
        }
      } else {
        // sam2 rides the YOLO + SAM2 arm (the detector proposes the
        // class set, SAM2 refines) — never the CLIP text lane.
        lane['primary_via_sam2'] = true
        lane['primary_sam2_labels'] = labelsOf(primary.entry, 'sam2 entry 0')
        lane['yolo_threshold'] = num(whereOf(primary), primary.entry, 'sam2', 'yolo_threshold')
      }

      // THE BOX MANIFEST (card-wide, OR-ed per entry — the declared
      // default is ON): the RT-DETR readback draws when any sam3
      // entry asks for it. A via_rtdetr entry does NOT force the
      // draw (its boxes still feed the primary's own arm — the
      // proposal lane fires through primary_via_rtdetr either way).
      const manifestEntries = sam3.filter((e, i) => bool(`sam3 entry ${i}`, e, 'sam3', 'export_boxes') !== false)
      if (manifestEntries.length > 0) lane['export_boxes'] = true
      // the RT-DETR knobs thread from the sam3 PRIMARY alone (its own
      // arm — via_rtdetr OR the manifest; set above). There is NO
      // second owner: a sam2 primary implies ZERO sam3 entries (the
      // sam3 bag sorts first in the source stream), and zero sam3
      // entries means no manifest to own — the arm cannot exist.

      // ── every source after the primary: its own export, carrying
      // its own per-entry tune (the trip's 4th arm). ──
      const exports: Array<[string, string, unknown?, unknown?]> = []
      const exportKind: string[] = []
      for (let s = 1; s < sources.length; s++) {
        const src = sources[s]
        const tune: Record<string, unknown> = {
          threshold: num(whereOf(src), src.entry, src.kind, 'sam_threshold'),
          dilation: num(whereOf(src), src.entry, src.kind, 'sam_dilation'),
        }
        if (src.kind === 'sam3') {
          tune['refine'] = num(whereOf(src), src.entry, 'sam3', 'refine_iterations')
          // via_rtdetr is the PRIMARY's arm — a later entry asking
          // for it is a mistake (its boxes would silently vanish):
          // refuse LOUD, the entry owns a prompt instead.
          if (bool(whereOf(src), src.entry, 'sam3', 'via_rtdetr') === true) {
            throw new Error(`sam3 entry ${src.i}: 'via_rtdetr' is the primary's arm — the RT-DETR readback rides the first source; give this entry a 'prompt'`)
          }
          const prompt = src.entry['prompt']
          if (typeof prompt !== 'string' || prompt === '') {
            throw new Error(`sam3 entry ${src.i} needs a 'prompt' (a string — the RT-DETR box lane is the primary's own arm) — got ${String(JSON.stringify(prompt)).slice(0, 40)}`)
          }
          const bbox = bboxOf(src.entry, 'sam3')
          exports.push([nameOf(src, `sam3_${src.i + 1}`), prompt, bbox ?? undefined, tune])
          exportKind.push('text')
        } else {
          tune['yolo_threshold'] = num(whereOf(src), src.entry, 'sam2', 'yolo_threshold')
          const bbox = bboxOf(src.entry, 'sam2')
          exports.push([nameOf(src, `sam2_${src.i + 1}`), labelsOf(src.entry, `sam2 entry ${src.i}`), bbox ?? undefined, tune])
          exportKind.push('sam2')
        }
      }

      // ── THE ORDERED DRAW STACK (bag order): each payload is its
      // own paint export AND one hop in the union chain onto
      // mask_combined (the kit composites them in array order —
      // the previous outputs flow into the next). ──
      const paintMasks: string[] = []
      for (let i = 0; i < draw.length; i++) {
        const payload = draw[i]!['payload']
        if (typeof payload !== 'string' || payload === '') {
          throw new Error(`draw entry ${i} needs a 'payload' — the painted PNG is the mask`)
        }
        const dn = draw[i]!['name']
        if (dn !== undefined && dn !== null && dn !== '' && typeof dn !== 'string') {
          throw new Error(`draw entry ${i}: 'name' must be a string — got ${JSON.stringify(dn)}`)
        }
        const name = typeof dn === 'string' && dn !== '' ? dn : `draw_${i + 1}`
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
