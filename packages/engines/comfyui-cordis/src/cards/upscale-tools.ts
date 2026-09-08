// Tier 3 — the upscale-tools card (the seedvr2_t1 submittable arm).
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import z from '@deepseek-ai/schemastery'
import { upscaleLane } from '../kit.ts'

const schema = z.object({
  input_image: z.string().role('path').description(
    'The frame to restore. Absolute mount path.'),
  // ride-the-model keys (py ABSENT: no schema default — the
  // compose-door cascade overlays model defaults, then explicit
  // params): resolution/max_resolution/batch_size ride the seedvr2_ema
  // model row (1080/4096/1); seed rides py -1 (model row carries 0,
  // explicit wins — the golden pins explicit 42). RANGE RULE
  // (2026-09-08 Phase-2): whoever owns the default owns the floor —
  // ride-keys carry HINT-ONLY ranges via extra (the served editor
  // floors) so the cascade stays authoritative; only schema-defaulted
  // knobs (seed) get validating min/max.
  seed: z.number().min(-1).step(1).default(-1).description('Seed'),
  resolution: z.number().description(
    '1080 = FHD rail. SeedVR2 redraws detail at this size.').extra(
      'extra', { min: 256, max: 2160 }),
  max_resolution: z.number().description(
    'The hard ceiling — inputs already past it pass through.').extra(
      'extra', { min: 512, max: 4096 }),
  batch_size: z.number().description(
    'Video frames ride batches; images are batch 1.').extra(
      'extra', { min: 1, max: 16 }),
  // NO dit_model/vae_model (py card declares no such knobs — the
  // weights ride lane_inputs.unet/vae; old drafts naming them still
  // parse via the door's non-strict overlay but compose never reads
  // them).
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerCard({
    id: 'upscale-tools',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'generate',
    boarded: ['seedvr2_ema'],
    requires: ['ComfyUI-SeedVR2_VideoUpscaler', 'ComfyUI-KJNodes', 'comfyui_nvidia_rtx_nodes'],
    // ADMISSION EXTRAS + SPELLS (the py class-attr halves verbatim:
    // admits minus studio writes, and the $spell-eligible file slot
    // for two-card-flow handoff).
    admits: ['filename_prefix'],
    spells: ['input_image'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      if (!p.input_image || !(p.input_image as string).trim()) {
        throw new Error("required param 'input_image' missing or empty on the upscale-tools card (what gets upscaled)")
      }
      // THE ESTATE-FILE CONTRACT (retired compose.py:70-90 verbatim
      // semantics): a file-typed param must EXIST at compose time —
      // absolute mount path expected. A $spell ("$image") names a
      // WIRED STAGE INPUT, never a file: rides verbatim, the runtime
      // rewrites it against the wired input (row 4, the two-card
      // flow's handoff). Compile-time, never inference-time.
      const ref = String(p.input_image).trim()
      if (!ref.startsWith('$')) {
        const abs = ref.startsWith('/') ? ref : resolve(ref)
        if (!(existsSync(abs) && statSync(abs).isFile())) {
          throw new Error(`input_image '${ref}' is not a file on this estate (absolute mount path expected)`)
        }
      }
      upscaleLane(p, model, g, runId)
    },
  })
}
