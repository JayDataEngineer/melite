// Tier 3 — the image-gen card (the image_t2i renderer port).
// Decl (contract-derived: id/skeleton/boarded/schema) + admission +
// one kit recipe call — the lane body lives in src/kit.ts.
//
// CARD UI ON SCHEMAMASTERY META (2026-09-08, Phase-2 pilot): the
// knob UI contract rides the schema itself — .description() is the
// label/tooltip, .min()/.max() the ranges, .extra() the x-extensions
// (x-families here). The model knob is deliberately NOT in this
// schema: the {model:} door owns admission (the 422 refusal is
// wall-pinned) and the served UI preselect derives from boarded[0]
// — one source (the boarded array), two projections. The chrome
// serve path walks this meta; the py manifest no longer declares
// this card's UI.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { imageT2I, finalizeImageGen } from '../kit.ts'

const schema = z.object({
  prompt: z.string().description('Prompt').extra('extra', { required: true }),
  negative_prompt: z.string().description('Negative Prompt'),
  width: z.number().min(256).max(2048).default(1024).description('Width'),
  height: z.number().min(256).max(2048).default(1024).description('Height'),
  steps: z.number().min(1).max(100).default(8).description('Steps'),
  cfg: z.number().min(1).max(20).default(4.5).description(
    'How closely the diffusion follows the prompt. Higher = stricter.'),
  sampler: z.string().description(
    'Sampler — options resolve from the $samplers vocabulary at serve time'),
  scheduler: z.string().description(
    'Scheduler — options resolve from the $schedulers vocabulary at serve time'),
  seed: z.number().min(-1).step(1).default(-1).description('Seed'),
  loras: z.array(z.object({ name: z.string(), strength: z.number() }))
    .description('LoRAs')
    .extra('extra', { families: ['krea-2'] }),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerCard({
    id: 'image-gen',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'generate',
    // stock-only card (Cordis card 1 verdict): every node is core
    // — no requires to declare.
    boarded: ['krea-2', 'z-image', 'anima'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      if (!p.prompt || !(p.prompt as string).trim()) {
        throw new Error("required param 'prompt' missing or empty on the image-gen card (what the picture IS)")
      }
      imageT2I(p, model, g, runId)
    },
    finalize: finalizeImageGen,
  })
}
