// Tier 3 — the ideogram4 card (the ideogram_t2i renderer port): the
// Comfy-Org official Ideogram v4 template chain — dual-guided
// (conditional + CFGOverride-trimmed unconditional) sampling.
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { ideogramLane, finalizeIdeogram } from '@melite/card-kit'
import { SAMPLERS } from '@melite/card-kit/vocab'

const schema = z.object({
  prompt: z.string().description("Prompt").extra('extra', { order: 0, group: "prompt", columns: 2, width: 1, required: true, wtype: 'textarea', }),
  // ride-the-model keys (no schema default — the compose-door
  // cascade overlays model defaults): HINT-ONLY ranges via extra
  // (RANGE RULE 2026-09-08: whoever owns the default owns the floor).
  width: z.number().description("Width").min(256).max(2048).step(16).extra('extra', { order: 0, group: "resolution", columns: 3, width: 1, min: 256, max: 2048, wtype: 'number' }),
  height: z.number().description("Height").min(256).max(2048).step(16).extra('extra', { order: 1, group: "resolution", width: 1, min: 256, max: 2048, wtype: 'number' }),
  seed: z.number().description("Seed").step(1).default(-1).extra('extra', { order: 4, group: "resolution", width: 1 }),
  steps: z.number().description("Steps").min(1).max(100).step(1).extra('extra', { order: 0, group: "sampling", width: 1, min: 1, max: 100, wtype: 'number' }),
  cfg: z.number().description("Guidance Scale").min(1).max(20).step(0.1).extra('extra', { order: 1, group: "sampling", width: 1, tooltip: "How closely the diffusion follows the prompt. Higher = stricter." }),
  mu: z.number().description("Mu").min(-10).max(10).step(0.05).extra('extra', { order: 2, group: "sampling", width: 1, tooltip: "Ideogram4 scheduler mean shift — the official Default preset is 0.5." }),
  std: z.number().description("Std").min(0.1).max(5).step(0.05).extra('extra', { order: 3, group: "sampling", width: 1, tooltip: "Ideogram4 scheduler spread — the official Default preset is 1.75." }),
  sampler: SAMPLERS.description("Sampler").extra('extra', { order: 4, group: "sampling", width: 1, wtype: 'select' }),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'ideogram4',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'generate',
    // stock-only: the whole chain is core/custom-script nodes.
    boarded: ['ideogram'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      if (!p.prompt || !(p.prompt as string).trim()) {
        throw new Error("required param 'prompt' missing or empty on the ideogram4 card (what the picture IS)")
      }
      ideogramLane(p, model, g, runId)
    },
    finalize: finalizeIdeogram,
  }))
}
