// Tier 3 — the music card (the music_t1 renderer port).
// Decl + admission + one kit recipe call — the lane body rides @melite/comfyui-card-kit (musicT1/yue2T1).
// Instrumental = lyrics "" (MiniMax's own convention — baked, never
// an absent ref). Stock-only: the MiniMax + YuE2 nodes ride upstream
// core; no extension to declare (the retired card carried no requires).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { declaredAction, instantiateAction } from '@melite/comfyui-card-kit'
import { DECL as music3Decl } from '@melite/models-music3'
import { DECL as yue2Decl } from '@melite/models-yue2'
import type { ModelFacts } from '@melite/comfyui-card-kit/facts'
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import { vocabulary } from '@melite/comfyui-card-kit/vocab'
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces'
import { bag } from '@melite/contracts/extraKeys'
import type { gatedResolve } from '@melite/comfyui-card-kit/admission'

export const schema = z.object({
  prompt: z.string().description("Tags / Description").extra('extra', bag({ order: 0, group: "prompt", columns: 1, tooltip: "Structured caption: Genre + Vocal Details + Arrangement. E.g. 'funk, pop, soul, guitar, 105 BPM'.", required: true, wtype: 'textarea', })),
  lyrics: z.string().description("Lyrics").extra('extra', bag({ order: 1, group: "prompt", tooltip: "Lyrics with structure tags: [verse], [chorus], [bridge]. Empty = instrumental.", wtype: 'textarea' })),
  duration: z.number().description("Duration (s)").min(5).max(360).step(1).default(30).extra('extra', bag({ order: 0, group: "generation", width: 1, tooltip: "Target audio length in seconds (5-360). music3: exact length; YuE2: max length (the song may end earlier).", wtype: 'slider' })),
  mode: vocabulary(["full", "melody", "off"]).description("ABC Planning").default("full").extra('extra', bag({ order: 1, group: "generation", width: 1, tooltip: "YuE2 only: plan a symbolic score before generating. full = melody + chords; melody = melody only (cover-recommended); off = direct generation.", wtype: 'select', visible_when: 'model=yue2' })),
  guidance_scale: z.number().description("CFG").min(0.1).max(10).step(0.1).default(1.7).extra('extra', bag({ order: 2, group: "generation", width: 1, tooltip: "Classifier-free guidance (KSampler cfg). 1.7 = lane default.", visible_when: 'model=music3' })),
  n_diffusion_steps: z.number().description("Diffusion Steps").min(1).max(200).step(1).default(30).extra('extra', bag({ order: 3, group: "generation", width: 1, tooltip: "Denoising steps. 30 = lane default. Never 0.", wtype: 'number' })),
  lm_cfg_scale: z.number().description("LM CFG").min(0.1).max(10).step(0.1).default(1.7).extra('extra', bag({ order: 4, group: "generation", width: 1, tooltip: "Lyric-encoder guidance (MiniMaxMusic3TextEncode cfg_scale). 1.7 = lane default.", visible_when: 'model=music3' })),
  seed: z.number().description("Seed").step(1).default(-1).extra('extra', bag({ order: 0, group: "seed", width: 1 })),
})

/** The schema's callable face — ONE cast serving both seams (the
 *  registration's schema carrier and the compose strict resolve's
 *  judge): schemastery schemas are callable (Schema.resolve) but
 *  carry a typed data parameter, while both card-seam consumers
 *  take unknown. */
const schemaFn = schema as unknown as (v: unknown) => Record<string, unknown>

// THE FAMILY IDS COME FROM THEIR DECLS (the closure gate's RULE 5):
// a retyped id breaks the card at RUNTIME — not-boarded — with every
// wall green. image-gen has done it this way all along.
export const BOARDED: string[] = [music3Decl.id, yue2Decl.id]

/** THE ACTION BINDINGS (the atom vocabulary, stroke 3): the owning
 * family's declared compose action per boarded family — the card
 * owns only dispatch; the segment factories live in the family
 * packages (the legacy lanes stay the declared fallback +
 * byte-oracle). Keyed by OWNING FAMILY (`model.family ?? model.id`
 * at dispatch — a route id keys nothing, the derived-row law). */
export const ACTION_BINDINGS: Record<string, (p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string) => void> = {
  [music3Decl.id]: (p, model, g, runId) => {
    instantiateAction(declaredAction(music3Decl, 'compose'), p, model, g, runId)
  },
  [yue2Decl.id]: (p, model, g, runId) => {
    instantiateAction(declaredAction(yue2Decl, 'compose'), p, model, g, runId)
  },
}

/** The identity rung (label/description — the authored prose the
 *  emitted tool row carries; the ring's spelling, stated once). */
export const identity = {
  label: 'Music',
  description: 'Generate music — MiniMax Music 3 (structured captions with tagged lyrics) or YuE2-3B (style + lyrics with ABC planning)',
  genre: 'audio',
  icon: 'music',
}

export function registerCard(ctx: Context, comfy: ComfyUIService): void {
  ctx.effect(() => comfy.registerCard({
    id: 'music',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'music',
    // (A-C3, 2026-09-28: the literals were the drift class — a DECL
    // rename silently diverged from this hand list. The spread is
    // the derivation; closure-gate RULE 5 pins it.)
    boarded: [...BOARDED],
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
    // stock-only card: the MiniMax + YuE2 nodes ride upstream core
    // (comfy_extras.nodes_minimax_music / nodes_yue2); no requires.
    schema: schemaFn,
    compose(p, model, g, runId) {
      // THE SCHEMA GATE (the h3 admission precedent — the card's
      // own declaration validates the last hop into the engine):
      // schemastery walk enforces declared types + bounds (a
      // duration=900 draft refuses LOUD here, never composes),
      // fills defaults, admits legacy keys inert. The composer's
      // reads below are reads of the GATED doc.
      const doc = gatedResolve('music', schemaFn, ['model'], p)
      if (!doc.prompt) {
        throw new Error("required param 'prompt' missing or empty on the music card (the music caption — what the song IS)")
      }
      // THE LANE BRANCH (data never a family-id switch — the
      // latent_node precedent): yue2's rail resolves a checkpoint
      // row (one file carries model+clip+vae); music3's resolves
      // the unet/clip/vae trio. THE DECLARED ACTIONS (the atom
      // vocabulary, stroke 3): each boarded family's own compose
      // action composes first — the data branch below is the
      // declared legacy-lane fallback for family-less rows, never a
      // silent second copy.
      const bound = ACTION_BINDINGS[model.family ?? model.id]
      if (bound) {
        bound(doc, model, g, runId)
      } else {
        throw new Error(
          `no declared action for family '${String(model.family ?? model.id)}' on the music card — every boarded family (music3, yue2) composes its own declared segment; this address owns none`)
      }
    },
  }))
}
