// Tier 3 — the sfx card (the sfx_t1 renderer port).
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { sfxT1 } from '@melite/comfyui-card-kit'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'
import { bag } from '@melite/contracts/extraKeys'

const schema = z.object({
  prompt: z.string().description("Sound Description").extra('extra', bag({ order: null, tooltip: "Describe the SOUND itself, not the scene (e.g. 'sharp metallic clang with long decay')", required: true, wtype: 'textarea', })),
  // UPSTREAM 1:1 (defect b, 2026-09-23): MOSS-SFX-v2's pipeline
  // declares num_inference_steps=100 / cfg_scale=4.0
  // (vendor/…/moss_sfx_impl/moss_soundeffect_v2/pipeline_moss_soundeffect.py:162).
  // The old 50/5.0 were the INNER wan_audio layer's defaults — half
  // the sampling budget, over-guided: the operator's low-quality
  // catch. The node's _DEFAULT_* constants stay the layer floor;
  // the CARD carries the pipeline's quality point.
  guidance_scale: z.number().description("CFG").min(0).max(20).step(0.1).default(4).extra('extra', bag({ order: null, tooltip: "Diffusion classifier-free guidance" })),
  n_diffusion_steps: z.number().description("Diffusion Steps").min(1).max(500).step(1).default(100).extra('extra', bag({ order: null, tooltip: "More = higher quality, slower", wtype: 'slider' })),
  duration: z.number().description("Duration (s)").min(0.5).max(300).step(0.5).default(10).extra('extra', bag({ order: null, tooltip: "Output length in seconds" })),
  seed: z.number().description("Seed").step(1).default(-1).extra('extra', bag({ order: null })),
})

export const inject = ['comfyui']

// THE IDENTITY RUNG (native 2026-09-10 — migrated from the frozen
// identity ring; the card owns its label/description/genre/icon).
export const identity = {
  label: 'Sound Effects',
  description: 'Generate sound effects — MOSS-SFX v2, describe the SOUND not the scene',
  genre: 'audio',
  icon: 'bolt',
}

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'sfx',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'sfx',
    boarded: ['moss-sfx'],
    tags: ['audio', 'sfx', 'generate'],
    identity,
    // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
    // discovery export — the card owns its sidebar, surface, and
    // flow-stage declarations; the discovery arms derive from here).
    sidebar: { key: 'audio', order: 7 },
    flowKinds: {
      inputs: { prompt: 'text' },
      outputs: { default: 'audio' },
      requiresModel: false,
    },
    // renders through the authored Audiocore pack; SaveAudio is core.
    requires: ['melite-audio-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      // THE SCHEMA GATE (the h3 admission precedent): the card's
      // own schemastery walk validates types + bounds (duration is
      // 0.5–300 — anything else refuses LOUD, never composes),
      // fills defaults; the composer reads the GATED doc.
      const doc = schema(p) as Record<string, unknown>
      if (!(doc.prompt as string)?.trim()) {
        throw new Error("required param 'prompt' missing or empty on the sfx card (describe the SOUND, not the scene)")
      }
      sfxT1(doc, model, g, runId)
    },
  }))
}
