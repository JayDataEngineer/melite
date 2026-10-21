// Tier 3 — the input-prep card (the input_prep renderer port).
// The source lane: LoadImage -> [ImageCrop] -> [UpscaleModelLoader
// -> ImageUpscaleWithModel] -> [ImageScale] -> SaveImage, or the
// audio restage LoadAudio -> SaveAudio.
// Decl + admission + family dispatch — the lane body rides the input
// family's own declared action (packages/models/input/src/actions.ts,
// pinned to committed goldens in that family's tests/golden/).
import type { Context } from '@melite/comfyui-card-kit/card-definition'
import z from '@deepseek-ai/schemastery'
import { declaredAction, instantiateAction } from '@melite/comfyui-card-kit'
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces'
import { vocabulary } from '@melite/comfyui-card-kit/vocab'
import { bag } from '@melite/contracts/extraKeys'
import { DECL as inputDecl, SCALE_METHODS, SCALE_MODEL_OPTIONS, MIN_DIM } from '@melite/models-input'
import type { ModelFacts } from '@melite/comfyui-card-kit/facts'
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import { callableSchema, gatedResolve } from '@melite/comfyui-card-kit/admission'

// THE FAMILY BINDINGS (the atom vocabulary, stroke 3): the declared
// action composes the whole segment; an unbound family refuses loud
// at the dispatch. Keyed by OWNING FAMILY (`model.family ??
// model.id` — a route id keys nothing, the derived-row law).
export const ACTION_BINDINGS: Record<string, (p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string) => void> = {
  [inputDecl.id]: (p, model, g, runId) => {
    instantiateAction(declaredAction(inputDecl, 'prep'), p, model, g, runId)
  },
}

// Exported for the estate parity wall (param-bounds-parity judges
// the card's schema against the input family's prep ParamSpec, the
// image-gen/edit precedent — the schema is the read plane).
export const schema = z.object({
  // the staged source filename (the arm stages uploads/artifacts into
  // the ComfyUI input dir before this doc renders)
  // the declaration carries ONLY source — media_type/crop/scale ride the
  // door's explicit-params overlay (non-strict object) so old drafts
  // keep parsing, but they are never declared knobs.
  source: z.string().role('path').description("Source file").extra('extra', bag({ order: 0, group: "input", tooltip: "The file to stage — upload, asset drop, prior-run artifact, or mount path. Image or audio (video is not boarded yet).", required: true, wtype: 'file', })),
  // THE SNIFF OWNS THE LANE (audit input-prep-total F6, INFO stand-down,
  // 2026-11-10): media_type is DECLARED (the visible_when rails key on it)
  // but the studio seats no select for it — pickSource's sniff is its only
  // writer. An extension-less source cannot be lane-flipped by hand; only an
  // agent's patch can. Documented, not seated, by auditor-sanctioned choice.
  media_type: vocabulary(["image", "audio"]).description("Media type").default("image").extra('extra', bag({ order: 1, group: "input", width: 1, wtype: 'select' })),
  crop_x: z.number().description("Crop X").min(-1).step(1).default(-1).extra('extra', bag({ order: 0, group: "transform", wtype: 'number', visible_when: 'media_type=image' })),
  crop_y: z.number().description("Crop Y").min(-1).step(1).default(-1).extra('extra', bag({ order: 1, group: "transform", wtype: 'number', visible_when: 'media_type=image' })),
  crop_width: z.number().description("Crop Width").min(-1).step(1).default(-1).extra('extra', bag({ order: 2, group: "transform", wtype: 'number', visible_when: 'media_type=image' })),
  crop_height: z.number().description("Crop Height").min(-1).step(1).default(-1).extra('extra', bag({ order: 3, group: "transform", wtype: 'number', visible_when: 'media_type=image' })),
  scale_width: z.number().description("Scale Width").min(-1).step(1).default(-1).extra('extra', bag({ order: 4, group: "transform", wtype: 'number', visible_when: 'media_type=image' })),
  scale_height: z.number().description("Scale Height").min(-1).step(1).default(-1).extra('extra', bag({ order: 5, group: "transform", wtype: 'number', visible_when: 'media_type=image' })),
  scale_method: vocabulary([...SCALE_METHODS]).description("Scale Method").default("lanczos").extra('extra', bag({ order: 6, group: "transform", wtype: 'select', visible_when: 'media_type=image' })),
  // THE MODEL CHOICE (operator directive, 2026-11-08 — the studio
  // card: "parameters to upscale / downscale optionally, letting
  // you choose the model"): the standard ComfyUI upscale-model
  // roster led by the "" unstated sentinel (a declared member —
  // schemastery validates a default against its closed union).
  // GROUNDED: the live engine's UpscaleModelLoader COMBO is EMPTY
  // today (options: [] — no model files installed in
  // models/upscale_models); the declared vocabulary is the standard
  // set a user installs there, and the ENGINE refuses loud if a
  // picked file is absent — that refusal is the honest face, never
  // a silent drop. The family's SCALE_MODEL_OPTIONS export is the
  // one truth (this vocabulary and the prep action's enum options
  // cite it; the vocab-rails-subset wall seats the site LOCAL for
  // the same empty-combo reason).
  scale_model: vocabulary([...SCALE_MODEL_OPTIONS]).description("Upscale Model").default("").extra('extra', bag({ order: 7, group: "transform", wtype: 'select', visible_when: 'media_type=image' })),
})

const schemaFn = callableSchema(schema)

// THE OVERSIZE CEILING (audit input-prep-total F3, 2026-11-10): the
// 16k class — above any engine-sane transform target (a 4× model
// upscale of a 4k source). The schema envelope stays unbounded above
// (the parity wall pins both spellings: the card's served f.max null,
// the family ParamSpec's MAX_SAFE_INTEGER), so the ceiling rides as a
// compose-time gate — the MIN_DIM floor's own class: scale_width 1e9
// is refused in card voice, never composed raw to the engine.
export const MAX_DIM = 16384

/** The four flat crop keys, in the schema's own order (the ceiling
 * walk names the offending member from this list). */
const CROP_KEYS = ['crop_x', 'crop_y', 'crop_width', 'crop_height'] as const

export const inject = ['comfyui']

// THE IDENTITY RUNG (native 2026-09-10 — migrated from the frozen
// identity ring; the card owns its label/description/genre/icon).
export const identity = {
  label: 'Input Prep',
  description: 'Source intake: attach an image or audio file (upload, asset drop, prior run) — staged, optionally transformed, emitted as a media artifact for downstream cards to wire.',
  genre: 'image',
  icon: 'upload',
  principles: [
    'A source is data, not inference: the graph loads, optionally transforms, and saves — no model ever loads.',
    'Every source form the editor speaks validates at phase 1 (compile time): data: URLs, artifact URLs, input-dir names, absolute paths.',
    'Transforms ride the declared applicability matrix (image: crop+scale) — anything else refuses loudly, never silently drops.',
  ],
}

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'input-prep',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'input_prep',
    // stock-only card (requires = ()): LoadImage/ImageCrop/
    // ImageScale/SaveImage + LoadAudio/SaveAudio are ComfyUI core
    // no requires to declare.
    boarded: [inputDecl.id],
    tags: ['image', 'input', 'prepare'],
    identity,
    // THE DISCOVERY ROWS (authored 2026-09-10 — the card postdates
    // the frozen discovery export's forms table, so it never had a
    // frozen forms row: sidebar order 12 fills the retired gap in
    // the image cluster; hidden (a flow-staging utility, never a
    // rail card); the flow stage stages one source file).
    sidebar: { key: 'image', order: 12, hidden: true },
    flowKinds: {
      // PRODUCER-ONLY (2026-10-09 — the text-seat trap): inputs is
      // EMPTY on purpose. source is dual-media file intake
      // (image-or-audio, role path / wtype file) — the single-kind
      // grammar cannot honestly seat it (source: 'text' offered a
      // picker seat no text producer can ever fill: text links
      // cannot land in LoadImage/LoadAudio file slots under ROW-4,
      // so the seat was an unwireable lie). Nothing wires INTO a
      // source card — it produces image/audio for downstream
      // stages to consume. A file arrives via the form/params
      // face, never a producer link.
      inputs: {},
      outputs: { image: 'image', audio: 'audio' },
      requiresModel: false,
    },
    flowOutputBindings: [
      {
        channel: 'image',
        node: 'SaveImage.0',
        nodeClass: 'SaveImage',
        when: (params) => params['media_type'] !== 'audio',
      },
      {
        channel: 'audio',
        node: 'SaveAudio.0',
        nodeClass: 'SaveAudio',
        when: (params) => params['media_type'] === 'audio',
      },
    ],
    // ADMISSION EXTRAS (the class-attr half verbatim: the
    // retired row's admits minus the boarded families' studio
    // writes, which the projection unions from the facts file).
    admits: ['crop', 'scale'],
    schema: schemaFn,
    compose(p, model, g, runId) {
      // THE SCHEMA GATE (the music/sfx/tts admission precedent —
      // the card's own declaration validates the last hop into the
      // engine): schemastery walk enforces the declared types and
      // bounds on every declared knob (source, media_type, the four
      // crop keys, the scale rail — anything else refuses LOUD,
      // never composes); the riders admit the two LEGACY overlay
      // objects only (crop/scale — old drafts keep parsing; 'model'
      // is no rider: nothing reads it, so the gate refuses it loud
      // rather than passing a dead key through). The composer's
      // reads below are reads of the GATED doc.
      const doc = gatedResolve('input-prep', schemaFn, ['crop', 'scale'], p)
      if (typeof doc.source !== 'string' || !doc.source.trim()) {
        throw new Error("required param 'source' missing on the input-prep card (the staged source — upload, asset drop, prior-run artifact, or input-dir filename)")
      }
      const cropValues = [doc['crop_x'], doc['crop_y'], doc['crop_width'], doc['crop_height']] as number[]
      const hasCrop = cropValues.some((value) => value >= 0)
      const scaleWidth = doc['scale_width'] as number
      const scaleHeight = doc['scale_height'] as number
      const hasScale = scaleWidth >= 0 || scaleHeight >= 0
      const legacyCrop = typeof doc['crop'] === 'object' && doc['crop'] !== null && !Array.isArray(doc['crop'])
        ? doc['crop'] as Record<string, unknown>
        : undefined
      const legacyScale = typeof doc['scale'] === 'object' && doc['scale'] !== null && !Array.isArray(doc['scale'])
        ? doc['scale'] as Record<string, unknown>
        : undefined
      // THE APPLICABILITY GATE (audit input-prep-total F1,
      // 2026-11-10): the audio lane (LoadAudio → SaveAudio) takes no
      // image transforms. The passthrough used to validate then
      // silently drop them — the pinned declared-surface verdict that
      // contradicted this card's own law (principles[2]: "anything
      // else refuses loudly, never silently drops"). The studio's
      // re-switch seat (component.tsx pickSource) is the primary cure;
      // this refusal is the backstop for docs that bypass it (agent
      // patches, old drafts, hand-built rows).
      if (doc['media_type'] === 'audio') {
        const seated: string[] = []
        if (hasCrop) seated.push('crop_x/crop_y/crop_width/crop_height')
        if (hasScale) seated.push('scale_width/scale_height')
        if (doc['scale_model'] !== '') seated.push('scale_model')
        if (legacyCrop !== undefined) seated.push('legacy crop row')
        if (legacyScale !== undefined) seated.push('legacy scale row')
        if (seated.length > 0) {
          throw new Error(`input-prep: the audio lane (LoadAudio → SaveAudio) takes no image transforms — seated ${seated.join(', ')} refuse loud (the card never silently drops); clear them or flip the source back to an image`)
        }
      }
      if (hasCrop && cropValues.some((value) => value < 0)) {
        throw new Error('input-prep crop needs all four values; unset fields are -1')
      }
      if (hasCrop && (cropValues[0] < 0 || cropValues[1] < 0 || cropValues[2] <= 0 || cropValues[3] <= 0)) {
        throw new Error('input-prep crop needs non-negative x/y and positive width/height')
      }
      // THE BLANK-IMAGE LAW (2026-10-24, volley item f): a crop side
      // below MIN_DIM upscales to a blank (the 1x1-crop receipt) —
      // refused here in the card's voice, before any GPU is spent.
      if (hasCrop && (cropValues[2] < MIN_DIM || cropValues[3] < MIN_DIM)) {
        throw new Error(`input-prep crop needs width and height of at least ${MIN_DIM}px (got ${cropValues[2]}x${cropValues[3]}) — smaller crops upscale to a blank`)
      }
      if (hasScale && (scaleWidth <= 0 || scaleHeight <= 0)) {
        throw new Error('input-prep scale needs positive width and height; -1 unsets both')
      }
      // THE BLANK-IMAGE LAW (2026-10-24, volley item f): a scale
      // target below MIN_DIM on a side IS the reported blank
      // (run-c5eb3f2ec512: scale 2x1 → a 2x1 beige strip the lane
      // served as the run's image) — refused here, never composed.
      if (hasScale && (scaleWidth < MIN_DIM || scaleHeight < MIN_DIM)) {
        throw new Error(`input-prep scale needs width and height of at least ${MIN_DIM}px (got ${scaleWidth}x${scaleHeight}) — smaller targets upscale to a blank`)
      }
      // THE OVERSIZE CEILING (audit input-prep-total F3, 2026-11-10):
      // refused here on BOTH paths — the flat keys the schema walk
      // passed, and the LEGACY overlay objects that ride the admits
      // raw (the schema cannot see inside the row). The oversize class
      // is an engine abort (OOM in engine dialect), never a resize.
      if (hasCrop) {
        const over = CROP_KEYS.map((key, i) => cropValues[i] > MAX_DIM ? `${key}=${cropValues[i]}` : null)
          .find((named) => named !== null)
        if (over !== undefined) {
          throw new Error(`input-prep crop needs values of at most ${MAX_DIM}px (got ${over}) — bigger boxes are an engine abort, not a crop`)
        }
      }
      if (hasScale && (scaleWidth > MAX_DIM || scaleHeight > MAX_DIM)) {
        throw new Error(`input-prep scale needs width and height of at most ${MAX_DIM}px (got ${scaleWidth}x${scaleHeight}) — bigger targets are an engine abort, never a resize`)
      }
      if (!hasCrop && legacyCrop !== undefined) {
        const over = (['x', 'y', 'width', 'height'] as const)
          .map((key) => (legacyCrop[key] as number) > MAX_DIM ? `${key}=${legacyCrop[key]}` : null)
          .find((named) => named !== null)
        if (over !== undefined) {
          throw new Error(`input-prep: the legacy crop row carries a member above the ${MAX_DIM}px ceiling (got ${over}) — refused at the gate, never composed`)
        }
      }
      if (!hasScale && legacyScale !== undefined
        && ((legacyScale['width'] as number) > MAX_DIM || (legacyScale['height'] as number) > MAX_DIM)) {
        throw new Error(`input-prep: the legacy scale row carries a member above the ${MAX_DIM}px ceiling (got ${legacyScale['width']}x${legacyScale['height']}) — refused at the gate, never composed`)
      }
      // THE DISPLAY-TRUTH LAW (audit input-prep F3,
      // 2026-10-20): the studio seeds its user layer from the row
      // and the run patch carries the whole layer, so an old draft
      // with a nested crop/scale object re-sends it on EVERY run
      // press — and legacy-first precedence composed the stale
      // object over every fresh flat edit (display read the flat
      // keys, the engine cropped the legacy box). Flat keys outrank
      // the object whenever any is seated; the object only composes
      // when NO flat key rides the doc (old drafts keep parsing).
      const crop = hasCrop ? {
        x: cropValues[0],
        y: cropValues[1],
        width: cropValues[2],
        height: cropValues[3],
      } : legacyCrop
      const scale = hasScale ? {
        width: scaleWidth,
        height: scaleHeight,
        method: doc['scale_method'],
      } : legacyScale
      const gated = { ...doc, crop, scale }
      const bound = ACTION_BINDINGS[model.family ?? model.id]
      if (bound) bound(gated, model, g, runId)
      else {
        throw new Error(
          `no declared action for family '${String(model.family ?? model.id)}' on the input-prep card — every boarded family (input) composes its own declared segment; this address owns none`)
      }
    },
  }))
}
