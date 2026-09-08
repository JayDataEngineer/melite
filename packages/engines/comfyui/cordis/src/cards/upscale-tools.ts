// Tier 3 — the upscale-tools card (the seedvr2_t1 submittable arm).
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import z from '@deepseek-ai/schemastery'
import { upscaleLane } from '../kit.ts'

const schema = z.object({
  input_image: z.string(),
  // ride-the-model keys (py ABSENT: no schema default — the
  // compose-door cascade overlays model defaults, then explicit
  // params): resolution/max_resolution/batch_size ride the seedvr2_ema
  // model row (1080/4096/1); seed rides py -1 (model row carries 0,
  // explicit wins — the golden pins explicit 42).
  seed: z.number().default(-1),
  resolution: z.number(),
  max_resolution: z.number(),
  batch_size: z.number(),
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
