// Tier 3 — the music card (the music_t1 renderer port).
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
// Instrumental = lyrics "" (MiniMax's own convention — baked, never
// an absent ref). Stock-only: the MiniMax nodes ride upstream core;
// no extension to declare (the retired card carried no requires).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { musicT1 } from '@melite/comfyui-card-kit'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'

export const schema = z.object({
  prompt: z.string().description("Tags / Description").extra('extra', { order: 0, group: "prompt", columns: 1, tooltip: "Structured caption: Genre + Vocal Details + Arrangement. E.g. 'funk, pop, soul, guitar, 105 BPM'.", required: true, wtype: 'textarea', }),
  lyrics: z.string().description("Lyrics").extra('extra', { order: 1, group: "prompt", tooltip: "Lyrics with structure tags: [verse], [chorus], [bridge]. Empty = instrumental.", wtype: 'textarea' }),
  duration: z.number().description("Duration (s)").min(5).max(360).step(1).default(30).extra('extra', { order: 0, group: "generation", width: 1, tooltip: "Target audio length in seconds (5-360).", wtype: 'slider' }),
  guidance_scale: z.number().description("CFG").min(0.1).max(10).step(0.1).default(1.7).extra('extra', { order: 1, group: "generation", width: 1, tooltip: "Classifier-free guidance (KSampler cfg). 1.7 = lane default." }),
  n_diffusion_steps: z.number().description("Diffusion Steps").min(1).max(200).step(1).default(30).extra('extra', { order: 2, group: "generation", width: 1, tooltip: "Flow-matching denoising steps. 30 = lane default. Never 0.", wtype: 'number' }),
  lm_cfg_scale: z.number().description("LM CFG").min(0).max(10).step(0.1).default(1.7).extra('extra', { order: 3, group: "generation", width: 1, tooltip: "Lyric-encoder guidance (MiniMaxMusic3TextEncode cfg_scale). 1.7 = lane default." }),
  seed: z.number().description("Seed").step(1).default(-1).extra('extra', { order: 0, group: "seed", width: 1 }),
})

export const BOARDED: string[] = ['music3']

/** The identity rung (label/description — the authored prose the
 *  emitted tool row carries; the ring's spelling, stated once). */
export const identity = {
  label: 'Music',
  description: 'Generate music — MiniMax Music 3, structured captions (Genre + Vocal Details + Arrangement) with tagged lyrics',
  genre: 'audio',
  icon: 'music',
}

export function registerCard(ctx: Context, comfy: ComfyUIService): void {
  ctx.effect(() => comfy.registerCard({
    id: 'music',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'music',
    boarded: ['music3'],
    tags: ['audio', 'music', 'generate'],
    identity,
    // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
    // discovery export — the card owns its sidebar, surface, and
    // flow-stage declarations; the discovery arms derive from here).
    sidebar: { key: 'audio', order: 5 },
    flowKinds: {
      inputs: { prompt: 'text', lyrics: 'text' },
      outputs: { default: 'audio' },
      requiresModel: false,
    },
    // stock-only card: the MiniMax nodes ride upstream core
    // (comfy_extras.nodes_minimax_music); no requires to declare.
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      if (!p.prompt) {
        throw new Error("required param 'prompt' missing or empty on the music card (the music caption — what the song IS)")
      }
      musicT1(p, model, g, runId)
    },
  }))
}
