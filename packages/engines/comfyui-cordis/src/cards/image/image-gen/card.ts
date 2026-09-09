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
import { imageT2I, finalizeImageGen } from '../../../kit.ts'
import { SAMPLERS, SCHEDULERS } from '../../../models/vocab.ts'

const schema = z.object({
  // CARD-OWNED SURFACE (the 1:1 port, 2026-09-08): declaration
  // order = the py field order (frozen form_spec krea-2 referee).
  // loras is NOT here — the krea-2 LoRA knob rides the MOD
  // absorption (mods/loras.ts registers it through
  // ctx.comfyui.registerMod — the py interlock). The hand-inlined
  // families-scoped field was the defect this port removes;
  // compose still consumes p.loras (kit.ts stackLoras).
  prompt: z.string().description("Prompt").extra('extra', { order: 0, group: "prompt", columns: 2, width: 1, required: true, zone: 'params', wtype: 'textarea', }),
  negative_prompt: z.string().description("Negative Prompt").extra('extra', { order: 1, group: "prompt", width: 1, zone: 'params', wtype: 'textarea' }),
  width: z.number().description("Width").min(256).max(2048).step(16).default(1024).extra('extra', { order: 0, group: "resolution", columns: 3, width: 1, zone: 'params', wtype: 'number' }),
  height: z.number().description("Height").min(256).max(2048).step(16).default(1024).extra('extra', { order: 1, group: "resolution", width: 1, zone: 'params', wtype: 'number' }),
  seed: z.number().description("Seed").step(1).default(-1).extra('extra', { order: 4, group: "resolution", width: 1, zone: 'params' }),
  steps: z.number().description("Steps").min(1).max(100).step(1).default(8).extra('extra', { order: 0, group: "sampling", width: 1, zone: 'params', wtype: 'number' }),
  cfg: z.number().description("Guidance Scale").min(1).max(20).step(0.1).default(4.5).extra('extra', { order: 1, group: "sampling", width: 1, tooltip: "How closely the diffusion follows the prompt. Higher = stricter.", zone: 'params' }),
  sampler: SAMPLERS.description("Sampler").extra('extra', { order: 2, group: "sampling", width: 1, zone: 'params', wtype: 'select' }),
  scheduler: SCHEDULERS.description("Scheduler").extra('extra', { order: 3, group: "sampling", width: 1, zone: 'params', wtype: 'select' }),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
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
  }))
}
