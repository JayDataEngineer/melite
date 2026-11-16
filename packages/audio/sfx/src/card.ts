// Tier 3 — the sfx card (the sfx_t1 renderer port).
// Decl + admission + one kit recipe call — the lane body rides @melite/comfyui-card-kit (sfxT1).
import type { Context } from '@melite/comfyui-card-kit/card-definition'
import z from '@deepseek-ai/schemastery'
import { declaredAction, instantiateAction } from '@melite/comfyui-card-kit'
import type { ModelFacts } from '@melite/comfyui-card-kit/facts'
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces'
import { bag } from '@melite/contracts/extraKeys'
import { seedExtra } from '@melite/comfyui-card-kit/fields'
import { callableSchema, gatedResolve } from '@melite/comfyui-card-kit/admission'
import { primeFamilySeats, seatOf } from './family-seats.ts'

/** THE FAMILY ID IS A LITERAL (the plugin law, L3 cure, 2026-11-16:
 * "The Card can exist without a Family"): the family package
 * resolves through ./family-seats.ts (a guarded dynamic seat,
 * primed at registration) — a missing family package costs its OWN
 * seat, never this card's load. A retyped id breaks the binding on
 * the dev tree (the family-coverage wall judges every boarded
 * entry against the live registry; the seat table skips a module
 * whose DECL id names nothing), never silently at the not-boarded
 * refusal. */
export const BOARDED: string[] = ['moss-sfx']

/** THE SEAT-DRIVEN DISPATCH (the atom vocabulary, stroke 3): the
 * owning family's declared sfx action, resolved through the
 * family's SEAT (family-seats.ts) at call time — the card owns
 * only dispatch; the segment factory lives in the family package
 * (the legacy lane stays the declared fallback + byte-oracle). A
 * family package absent from the install refuses loud HERE, by
 * name; the card itself still loads and registers. */
export function composeFamilyAction(
  family: string,
  p: Record<string, unknown>,
  model: ModelFacts,
  g: GraphBuilder,
  runId: string,
): void {
  const seat = seatOf(family)
  if (seat === undefined) {
    throw new Error(
      `no declared action for family '${family}' on the sfx card — every boarded family (moss-sfx) composes its own declared segment; this address owns none (a family package absent from the install refuses here, by name)`)
  }
  instantiateAction(declaredAction(seat.decl, 'sfx'), p, model, g, runId)
}

/** THE ACTION BINDINGS: the dispatch table compose reads at call
 * time, keyed by OWNING FAMILY (`model.family ?? model.id` — a
 * route id keys nothing, the derived-row law). The row closes over
 * its literal family id and resolves the DECL through the seat, so
 * a pruned family package costs the row's reach, never the table. */
export const ACTION_BINDINGS: Record<string, (p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string) => void> = {
  ['moss-sfx']: (p, model, g, runId) => {
    composeFamilyAction('moss-sfx', p, model, g, runId)
  },
}

const schema = z.object({
  prompt: z.string().description("Sound Description").extra('extra', bag({ order: null, tooltip: "Describe the SOUND itself, not the scene (e.g. 'sharp metallic clang with long decay')", required: true, wtype: 'textarea', })),
  // UPSTREAM 1:1 (defect b, 2026-09-23): MOSS-SFX-v2's pipeline
  // declares num_inference_steps=100 / cfg_scale=4.0
  // (vendor/…/moss_sfx_impl/moss_soundeffect_v2/pipeline_moss_soundeffect.py:171-172).
  // The old 50/5.0 were the INNER wan_audio layer's defaults — half
  // the sampling budget, over-guided: the operator's low-quality
  // catch. The node's INPUT_TYPES defaults and the kit autofill pin
  // the same numbers (residual-defaults cure, 2026-11-10); the
  // pipeline-truth wall judges card, autofill, and node against the
  // pipeline's own parsed values.
  guidance_scale: z.number().description("CFG").min(0).max(20).step(0.1).default(4).extra('extra', bag({ order: null, tooltip: "Diffusion classifier-free guidance" })),
  n_diffusion_steps: z.number().description("Diffusion Steps").min(1).max(500).step(1).default(100).extra('extra', bag({ order: null, tooltip: "More = higher quality, slower", wtype: 'slider' })),
  // THE ENGINE CEILING (audit S2, 2026-11-10): the pipeline refuses
  // seconds > max_inference_seconds=30 with a raise
  // (pipeline_moss_soundeffect.py:203-207) — a longer draft used to
  // die MID-RUN at the engine. The schema bound refuses it HERE, at
  // the bench-write door, before any dispatch; the pipeline-truth
  // wall reads the pipeline's max, never a frozen 30.
  duration: z.number().description("Duration (s)").min(0.5).max(30).step(0.5).default(10).extra('extra', bag({ order: null, tooltip: "Output length in seconds (up to 30 — the engine's ceiling)" })),
  seed: z.number().description("Seed").step(1).default(-1).extra('extra', bag(seedExtra({ order: null }))),
})

const schemaFn = callableSchema(schema)

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
  // THE PLUGIN LAW'S PRIMING (fire-and-forget, image-gen shape): the
  // guarded dynamic import of the boarded family package starts
  // here; registration NEVER waits on the family — a pruned family
  // costs its own seat, never the estate boot.
  void primeFamilySeats()
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'sfx',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'sfx',
    // THE BOARDING LITERAL (the plugin law): the id stated once,
    // judged on the dev tree by the family-coverage wall (a board
    // naming nothing reds there), never derived at load from a
    // package this card must load without.
    boarded: [...BOARDED],
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
    schema: schemaFn,
    compose(p, model, g, runId) {
      // THE SCHEMA GATE (the h3 admission precedent): the card's
      // own schemastery walk validates types + bounds (duration is
      // 0.5–30, the pipeline's max_inference_seconds — anything else
      // refuses LOUD here, never mid-run at the engine),
      // fills defaults; the composer reads the GATED doc.
      const doc = gatedResolve('sfx', schemaFn, ['model'], p)
      if (!(doc.prompt as string)?.trim()) {
        throw new Error("required param 'prompt' missing or empty on the sfx card (describe the SOUND, not the scene)")
      }
      // THE DECLARED ACTION (the atom vocabulary, stroke 3): the
      // boarded family's own sfx action composes; the legacy kit
      // lane is the declared fallback for family-less rows, never a
      // silent second copy.
      const bound = ACTION_BINDINGS[model.family ?? model.id]
      if (bound) bound(doc, model, g, runId)
      else {
        throw new Error(
          `no declared action for family '${String(model.family ?? model.id)}' on the sfx card — every boarded family (moss-sfx) composes its own declared segment; this address owns none`)
      }
    },
  }))
}
