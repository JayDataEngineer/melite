// Tier 3 — the input-prep card (the input_prep renderer port).
// The source lane: LoadImage -> [ImageCrop] -> [ImageScale] ->
// SaveImage, or the audio restage LoadAudio -> SaveAudio.
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { inputPrepLane } from '@melite/comfyui-card-kit'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'
import { vocabulary } from '@melite/comfyui-card-kit/vocab'

const schema = z.object({
  // the staged source filename (the arm stages uploads/artifacts into
  // the ComfyUI input dir before this doc renders)
  // the declaration carries ONLY source — media_type/crop/scale ride the
  // door's explicit-params overlay (non-strict object) so old drafts
  // keep parsing, but they are never declared knobs.
  source: z.string().role('path').description("Source file").extra('extra', { order: 0, group: "input", tooltip: "The file to stage — upload, asset drop, prior-run artifact, or mount path. Image or audio (video is not boarded yet).", required: true, wtype: 'file', }),
  media_type: vocabulary(["image", "audio"]).description("Media type").default("image").extra('extra', { order: 1, group: "input", width: 1, wtype: 'select' }),
  crop_x: z.number().description("Crop X").min(-1).step(1).default(-1).extra('extra', { order: 0, group: "transform", wtype: 'number', visible_when: 'media_type=image' }),
  crop_y: z.number().description("Crop Y").min(-1).step(1).default(-1).extra('extra', { order: 1, group: "transform", wtype: 'number', visible_when: 'media_type=image' }),
  crop_width: z.number().description("Crop Width").min(-1).step(1).default(-1).extra('extra', { order: 2, group: "transform", wtype: 'number', visible_when: 'media_type=image' }),
  crop_height: z.number().description("Crop Height").min(-1).step(1).default(-1).extra('extra', { order: 3, group: "transform", wtype: 'number', visible_when: 'media_type=image' }),
  scale_width: z.number().description("Scale Width").min(-1).step(1).default(-1).extra('extra', { order: 4, group: "transform", wtype: 'number', visible_when: 'media_type=image' }),
  scale_height: z.number().description("Scale Height").min(-1).step(1).default(-1).extra('extra', { order: 5, group: "transform", wtype: 'number', visible_when: 'media_type=image' }),
  scale_method: z.string().description("Scale Method").default("lanczos").extra('extra', { order: 6, group: "transform", wtype: 'text', visible_when: 'media_type=image' }),
})

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
    boarded: ['input'],
    tags: ['image', 'input', 'prepare'],
    identity,
    // THE DISCOVERY ROWS (authored 2026-09-10 — the card postdates
    // the frozen discovery export's forms table, so it never had a
    // frozen forms row: sidebar order 12 fills the retired gap in
    // the image cluster; hidden (a flow-staging utility, never a
    // rail card); the flow stage stages one source file).
    sidebar: { key: 'image', order: 12, hidden: true },
    flowKinds: {
      inputs: { source: 'text' },
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
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, _model, g, runId) {
      // THE SCHEMA GATE (the music/sfx/tts admission precedent —
      // the card's own declaration validates the last hop into the
      // engine): schemastery walk enforces the declared type (source
      // is a string — anything else refuses LOUD, never composes);
      // the schema declares no bounds and no defaults (source is the
      // only knob; crop/media_type/scale ride admits, inert). The
      // composer's reads below are reads of the GATED doc.
      const doc = schema(p) as unknown as Record<string, unknown>
      if (typeof doc.source !== 'string' || !doc.source.trim()) {
        throw new Error("required param 'source' missing on the input-prep card (the staged source — upload, asset drop, prior-run artifact, or input-dir filename)")
      }
      const cropValues = [doc['crop_x'], doc['crop_y'], doc['crop_width'], doc['crop_height']] as number[]
      const hasCrop = cropValues.some((value) => value >= 0)
      if (hasCrop && cropValues.some((value) => value < 0)) {
        throw new Error('input-prep crop needs all four values; unset fields are -1')
      }
      if (hasCrop && (cropValues[0] < 0 || cropValues[1] < 0 || cropValues[2] <= 0 || cropValues[3] <= 0)) {
        throw new Error('input-prep crop needs non-negative x/y and positive width/height')
      }
      const scaleWidth = doc['scale_width'] as number
      const scaleHeight = doc['scale_height'] as number
      const hasScale = scaleWidth >= 0 || scaleHeight >= 0
      if (hasScale && (scaleWidth <= 0 || scaleHeight <= 0)) {
        throw new Error('input-prep scale needs positive width and height; -1 unsets both')
      }
      const legacyCrop = typeof doc['crop'] === 'object' && doc['crop'] !== null && !Array.isArray(doc['crop'])
        ? doc['crop']
        : undefined
      const legacyScale = typeof doc['scale'] === 'object' && doc['scale'] !== null && !Array.isArray(doc['scale'])
        ? doc['scale']
        : undefined
      const crop = legacyCrop ?? (hasCrop ? {
        x: cropValues[0],
        y: cropValues[1],
        width: cropValues[2],
        height: cropValues[3],
      } : undefined)
      const scale = legacyScale ?? (hasScale ? {
        width: scaleWidth,
        height: scaleHeight,
        method: doc['scale_method'],
      } : undefined)
      inputPrepLane({ ...doc, crop, scale }, g, runId)
    },
  }))
}
