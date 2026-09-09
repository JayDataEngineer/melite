// Tier 3 — the input-prep card (the input_prep renderer port).
// The source lane: LoadImage -> [ImageCrop] -> [ImageScale] ->
// SaveImage, or the audio restage LoadAudio -> SaveAudio.
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { inputPrepLane } from '@melite/card-kit'
import type { ComfyUIService } from '@melite/comfyui/service'

const schema = z.object({
  // the staged source filename (the arm stages uploads/artifacts into
  // the ComfyUI input dir before this doc renders)
  // py card.py declares ONLY source — media_type/crop/scale ride the
  // door's explicit-params overlay (non-strict object) so old drafts
  // keep parsing, but they are never declared knobs.
  source: z.string().role('path').description("Source file").extra('extra', { order: 0, group: "input", tooltip: "The file to stage — upload, asset drop, prior-run artifact, or mount path. Image or audio (video is not boarded yet).", required: true, wtype: 'file', }),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'input-prep',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'input_prep',
    // stock-only card (card.py requires = ()): LoadImage/ImageCrop/
    // ImageScale/SaveImage + LoadAudio/SaveAudio are ComfyUI core —
    // no requires to declare.
    boarded: ['input'],
    // ADMISSION EXTRAS (the py class-attr half verbatim: the
    // retired row's admits minus the boarded families' studio
    // writes, which the projection unions from the facts file).
    admits: ['crop', 'media_type', 'scale'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, _model, g, runId) {
      if (typeof p.source !== 'string' || !p.source.trim()) {
        throw new Error("required param 'source' missing on the input-prep card (the staged source — upload, asset drop, prior-run artifact, or input-dir filename)")
      }
      inputPrepLane(p, g, runId)
    },
  }))
}
