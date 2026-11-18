// Tier 3 — the voice-change card (the Seed-VC lane).
// Decl + admission + the boarded family's own declared convert
// action — the lane body rides @melite/models-seed-vc (actions.ts).
import type { Context } from '@melite/comfyui-card-kit/card-definition'
import z from '@deepseek-ai/schemastery'
import { declaredAction, instantiateAction } from '@melite/comfyui-card-kit'
import type { ModelFacts } from '@melite/comfyui-card-kit/facts'
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph'
// LOAD-BEARING (the sfx precedent): this import pulls the
// service-faces module's `declare module '@deepseek-ai/cordis'`
// augmentation (ctx.comfyui / ctx.models) into the compilation —
// remove it and Context loses the comfyui seat at the type level.
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces'
import { bag } from '@melite/contracts/extraKeys'
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
export const BOARDED: string[] = ['seed-vc']

/** THE VARIANT ADDRESSES: NONE — the singing lane is a RECIPE
 * stamp (f0_condition=true), never a second route. The wrapper
 * loads both DiT bodies at init; one route serves both lanes. */
export const VARIANT_ADDRESSES: string[] = []

/** LARGE DEFAULT: DEFAULT_MODEL is the default everywhere the tool
 *  row and the form need a first pick (the speech lane — f0 unset). */
export const DEFAULT_MODEL: string = 'seed-vc'

/** THE SEAT-DRIVEN DISPATCH (the atom vocabulary): the owning
 * family's declared convert action, resolved through the family's
 * SEAT at call time — the card owns only dispatch; the segment
 * factory lives in the family package. A family package absent
 * from the install refuses loud HERE, by name; the card itself
 * still loads and registers. */
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
      `no declared action for family '${family}' on the voice-change card — the boarded Seed-VC family (seed-vc) composes its own declared segment; this address owns none (a family package absent from the install refuses here, by name)`)
  }
  instantiateAction(declaredAction(seat.decl, 'convert'), p, model, g, runId)
}

/** THE ACTION BINDINGS: the dispatch table compose reads at call
 * time, keyed by OWNING FAMILY (`model.family ?? model.id` — a
 * route id keys nothing, the derived-row law). Both routes (the
 * speech lane and the singing f0 lane) close over the one family
 * id; the variant's wire_defaults stamp the f0 pick. */
export const ACTION_BINDINGS: Record<string, (p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string) => void> = {
  ['seed-vc']: (p, model, g, runId) => {
    composeFamilyAction('seed-vc', p, model, g, runId)
  },
}

const schema = z.object({
  source_audio: z.string().role('path').description("Source Audio").extra('extra', bag({ order: null, required: true, tooltip: "The clip to convert — its WORDS and rhythm are kept; the voice is replaced by the reference", wtype: 'file', media: 'audio' })),
  ref_audio: z.string().role('path').description("Reference Audio").extra('extra', bag({ order: null, required: true, tooltip: "The voice to borrow — 5-25 seconds of a clean single speaker performs best (its words are NOT used, only the timbre)", wtype: 'file', media: 'audio' })),
  // UPSTREAM 1:1 (the node's own INPUT_TYPES, seedvcnode.py
  // SeedVCRun): steps 30 [1,200], speed 1.0 [0.5,2],
  // inference_cfg_rate 0.7 [0,1], pitch_shift 0 [-24,24], and the
  // booleans f0_condition false / auto_f0_adjust true /
  // unload_model true. The knob defaults ARE the node's defaults —
  // a stated nothing composes the upstream template, never a
  // half-remembered variant of it.
  steps: z.number().description("Steps").min(1).max(200).step(1).default(30).extra('extra', bag({ order: null, tooltip: "Diffusion steps — 30 is the upstream template's own default; more refines timbre detail at linear cost" })),
  speed: z.number().description("Speed").min(0.5).max(2).step(0.1).default(1).extra('extra', bag({ order: null, tooltip: "Length adjust — 1.0 preserves the source's rhythm exactly (the voice-changer contract); below 1 speeds the delivery up, above 1 slows it" })),
  inference_cfg_rate: z.number().description("CFG Rate").min(0).max(1).step(0.1).default(0.7).extra('extra', bag({ order: null, tooltip: "How hard the conversion clamps to the reference timbre — 0.7 is upstream's default" })),
  // THE LANE SWITCH: f0_condition=true is the SINGING conversion
  // (the 44.1k base-f0 DiT, RMVPE pitch tracking, the 44k BigVGAN);
  // false is the SPEECH conversion (the 22.05k small-wavenet DiT).
  // The singing RECIPE stamps this true (plane canon L1: the stamp
  // rides wire_defaults on the Recipe plane) — never restate it
  // there unless the brief asks.
  f0_condition: z.boolean().description("F0 Condition").default(false).extra('extra', bag({ order: null, tooltip: "Track the source's pitch through the conversion — turn on for singing (upstream: 'Must set to true for singing voice conversion'). The Singing (F0) preset stamps this for you" })),
  auto_f0_adjust: z.boolean().description("Auto F0 Adjust").default(true).extra('extra', bag({ order: null, tooltip: "Adapt the source's pitch contour toward the reference speaker's range (on = natural fit; off = keep the source's exact melody — pair with pitch_shift)" })),
  pitch_shift: z.number().description("Pitch Shift").min(-24).max(24).step(1).default(0).extra('extra', bag({ order: null, tooltip: "Semitones — shift the converted voice up (positive) or down; 0 keeps the reference's own register" })),
  unload_model: z.boolean().description("Unload Model").default(true).extra('extra', bag({ order: null, tooltip: "Free the ~5GB conversion pack (both voice models + vocoders + whisper) after each run. Turn off ONLY for tight back-to-back chains on a big card" })),
})

const schemaFn = callableSchema(schema)

export const inject = ['comfyui']

// THE IDENTITY RUNG (native — the card owns its
// label/description/genre/icon).
export const identity = {
  label: 'Voice Change',
  description: 'Seed-VC voice conversion — re-voice speech or singing into a reference voice; content and rhythm preserved',
  genre: 'audio',
  icon: 'audio-lines',
}

export function apply(ctx: Context): void {
  // THE PLUGIN LAW'S PRIMING (fire-and-forget, sfx shape): the
  // guarded dynamic import of the boarded family package starts
  // here; registration NEVER waits on the family — a pruned family
  // costs its own seat, never the estate boot.
  void primeFamilySeats()
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'voice-change',
    skeleton: 'vc',
    boarded: [...BOARDED, ...VARIANT_ADDRESSES],
    tags: ['audio', 'voice', 'convert'],
    identity,
    sidebar: { key: 'audio', order: 9 },
    flowKinds: {
      // THE KNOB-ALIGNED PORTS (the flow-contract law: port keys ⊆
      // schema keys): both media seats are REAL wire seats — an
      // upstream tts/music stage's audio output can feed either the
      // source or the reference.
      inputs: { source_audio: 'audio', ref_audio: 'audio' },
      outputs: { default: 'audio' },
      requiresModel: true,
    },
    flowOutputBindings: [
      {
        channel: 'default',
        node: 'SaveAudio.0',
        nodeClass: 'SaveAudio',
      },
    ],
    // SeedVCRun rides the upstream ComfyUI_Seed-VC pack; LoadAudio
    // and SaveAudio are core.
    requires: ['ComfyUI_Seed-VC'],
    // the per-family pack face (the facts file's frozen
    // requires_by_family mirrors THIS declaration): seed-vc rides
    // the one upstream pack — its SeedVCRun node.
    requiresByFamily: {
      'seed-vc': ['ComfyUI_Seed-VC'],
    },
    schema: schemaFn,
    compose(p, model, g, runId) {
      // THE SCHEMA GATE (the h3 admission precedent): the card's
      // own schemastery walk validates types + bounds, fills
      // defaults; the composer reads the GATED doc.
      const doc = gatedResolve('voice-change', schemaFn, ['model'], p)
      if (!(doc.source_audio as string)?.trim()) {
        throw new Error("required param 'source_audio' missing or empty on the voice-change card (state the clip to convert — its words and rhythm are kept)")
      }
      if (!(doc.ref_audio as string)?.trim()) {
        throw new Error("required param 'ref_audio' missing or empty on the voice-change card (state the voice to borrow — 5-25 seconds of a clean single speaker performs best)")
      }
      const bound = ACTION_BINDINGS[model.family ?? model.id]
      if (bound) bound(doc, model, g, runId)
      else {
        throw new Error(
          `no declared action for family '${String(model.family ?? model.id)}' on the voice-change card — the boarded Seed-VC family (seed-vc) composes its own declared segment; this address owns none`)
      }
    },
  }))
}
