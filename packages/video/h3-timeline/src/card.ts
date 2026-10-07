// Tier 3 — the h3-timeline card.
//
// CARD SURFACE vs RENDERER VOCABULARY: the schema below declares
// the card's own fields; the window families (t4r / t4_open /
// t4_chain), the motion-context chaining rail and the SLA / SR /
// interp leaves are the RENDERER vocabulary the compose body reads,
// and those keys ride the compose door's explicit-params overlay
// (prepareCardParams — the ONE resolver: schema defaults, then the
// selected variant's stamps, then the caller's params), so every
// read normalizes with its own default.
//
// Node creation order matches the SERIALIZED id order — the id-order
// test pins the walk. Two sequences that read inverted are the
// reference's own (t4r creates the fps 24.0 PrimitiveFloat before
// the seconds 10.0 one; the reference resizer comes before the
// geometry resizer) — kept verbatim, never corrected.
//
// Autofill law: the GraphBuilder auto-fills pin defaults for omitted
// inputs exactly like the reference renderers do; the compose strips
// the t4-family leaks post-hoc (_T4_AUTOFILL_STRIP) — the strip rides
// the h3 family's own finalizeH3 (t4r strips nothing; the i2v
// dead-branch node marks the t4r family in the serialized graph).
import type { Context } from '@deepseek-ai/cordis'
import { DECL as h3Decl } from '@melite/models-h3'
import type { Family } from '@melite/models-h3/schema'
import {
  FAMILIES,
  JSON_ARRAY_PARAMS,
  coerceWireBoolean,
  paramSchema,
  schema,
} from '@melite/models-h3/schema'
import { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'
import { gatedResolve } from '@melite/comfyui-cordis'
import { declaredAction, instantiateAction } from '@melite/comfyui-card-kit'
import { finalizeH3 } from '@melite/models-h3'
import { assertOverlayGated } from '@melite/models-h3'
import type { ModelFacts } from '@melite/comfyui-card-kit/facts'

export { assertCarriedSpanGrid, assertGridLength, assertSpanGrid, gridSnap } from '@melite/models-h3/timelineContract'
export { carrier, JSON_ARRAY_PARAMS, schema } from '@melite/models-h3/schema'

// THE CARRIER'S CALLABLE FACE — ONE cast serving the compose strict
// resolve's judge: schemastery schemas are callable (Schema.resolve)
// but carry a typed data parameter, while the card seam takes
// unknown. The full `schema()` normalizer CANNOT run here (its t4r
// admission judges Object.keys(raw) as explicit injects, and the
// merged carrier doc's walked defaults would read as injects), so
// the strict resolve walks the carrier `paramSchema` — same
// carrier the schemaCarrier registration hands the door.
const schemaFn = paramSchema as unknown as (v: unknown) => Record<string, unknown>

// inputs the t4 family templates OMIT whose pin defaults the engine
// would auto-fill at serialization — the strip set lives with the lane, in the
// h3 family (models/h3/src/finalize.ts, re-homed family-side 2026-09-30)
// (H3_T4_STRIP; the t4r branch carries all of these explicitly, so it
// never strips).

// (No local CardDefinition augmentation: the service's schemaCarrier
// seat — Schema-typed since ledger row 23 — already carries this.)

/** The card's boarding roster: ONE family. The retired h3 and
 *  h3-keyframe family packages survive as VARIANT ROUTES on the h3
 *  family (timeline → h3-timeline, fl2va → h3-fl2va, ref2va →
 *  h3-ref2va, timeline-ref2va → h3-timeline-ref, keyframe →
 *  h3-keyframe), so old drafts resolve migration-free. The family is
 *  the CHECKPOINT id `h3` — never a lane name; the card id
 *  `h3-timeline` (the usecase surface) keeps its own name. The id
 *  comes from the family's own DECL, and with it the lane's files. */
export const BOARDED: string[] = [h3Decl.id]

// THE VARIANT ROUTES (the TTS fold's VARIANT_ADDRESSES pattern):
// agents pick no matrix variant — the tool's closed model enum
// additionally offers the folded lanes' compose addresses so the
// single-shot + keyframe lanes stay agent-reachable (the drafts
// door resolves route mids through the facts rows).
export const VARIANT_ADDRESSES: string[] = ['h3-timeline', 'h3-fl2va', 'h3-ref2va', 'h3-timeline-ref', 'h3-keyframe']

/** THE FAMILY ACTION BINDING (the atom vocabulary's video stroke):
 *  the h3 family's declared film action composes the whole lane-true
 *  segment from the gated, lifted doc this card's plane produced —
 *  resolved off the DECL at boarding (the interlock: an unbound
 *  family refuses loud, never a legacy fallback). */
export const ACTION_BINDINGS: Record<string, (p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string) => void> = {
  [h3Decl.id]: (p, model, g, runId) => {
    instantiateAction(declaredAction(h3Decl, 'film'), p, model, g, runId)
  },
}

export const identity = {
  label: 'Generate Video',
  description: 'THE video interface — multi-window film with SLA sparse attention, joint video+audio per window, auto-stitched into one mp4. The calls document IS the timeline.',
  genre: 'video',
  icon: 'video',
  principles: [
    'Describe MOTION and SOUND together — H3 generates both in one pass',
    'Draft at 768x448x56f (~2.3s); produce at 1344x768x124f (~5.2s)',
    'Length snaps to the 17k+5 frame grid at 24fps',
    'For timelines: repeat the ambient soundscape verbatim in every window; add one new layer where the story needs it',
    "Same seed across a shot's re-rolls keeps the world texture",
    'SLA at sparsity 0.90 gives ~1.75x speedup with no quality loss — use it by default',
  ],
}

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  registerCard(ctx, ctx.comfyui)
}

export function registerCard(ctx: Context, comfy: ComfyUIService): void {
  ctx.effect(() => comfy.registerCard({
    id: 'h3-timeline',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'h3-film',
    // BOARDING (resolved 2026-09-07): the card boards
    // all three families.
    // video_h3_open-cascade composing model 'h3' through this card.
    boarded: [...BOARDED],
    // THE video door (2026-09-21, operator order — video-gen
    // retired): a blind "make a video" must find THIS card first.
    tags: ['video', 'generate', 'text-to-video', 'timeline', 'edit'],
    identity,
    // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
    // discovery export — the card owns its sidebar, surface, and
    // flow-stage declarations; the discovery arms derive from here).
    sidebar: { key: 'video', order: 6 },
    // THE BAR CLAIM (gap 4, stroke 67): the timeline IS this card's
    // output history — the shared history strip would duplicate it.
    preview: { historyStrip: false },
    surface: { size: 'huge', layout: 'studio' },
    flowKinds: {
      // THE RAIL (the operator's law, 2026-09-20): first frame +
      // last frame + the reference buses — one shared rail; the
      // kinds are the SLOT kinds (the rail seats image/file slots,
      // never names). THE NAMING LAW rider (2026-10-09, "fix it
      // all"): the reference stacks are REAL input seats on the
      // flow — ref_images accumulates image producers
      // (image_list), ref_videos video producers (video_list),
      // ref_audios audio producers (audio_list: a music/sfx/tts
      // stage can voice the film). Before this the ports sat
      // outside the input category entirely — the picker could
      // not offer them and the lattice refused the wire. The
      // renderer's guide-image spelling (image_name) is the
      // retired alias: lattice-derivable for old graphs, offered
      // by no face.
      inputs: {
        image: 'image',
        last_frame: 'image',
        ref_images: 'image_list',
        ref_videos: 'video_list',
        ref_audios: 'audio_list',
      },
      legacyAliases: { image_name: 'image' },
      outputs: { default: 'video' },
      requiresModel: false,
    },
    flowOutputBindings: [{ channel: 'default', node: '*', nodeClass: 'SaveVideo' }],
    // ADMISSION EXTRAS (the class-attr half verbatim: the
    // retired row's admits minus the boarded families' studio
    // writes, which the projection unions from the facts file —
    // trailing-* ride verbatim, the gate matches them as prefixes).
    // + the AXIS KEYS this card's own families stamp (the h3-timeline
    // family declares Variant/Quant/Recipe groups — the axis seeding
    // writes `variant`/`quant`/`recipe` onto every fresh stage; the
    // admission covers the card's own served surface, image-gen's
    // recipe-knob law).
    admits: ['ctx_*', 'fps_seconds', 'image_name', 'k', 'noise_seed', 'quant', 'recipe', 'ref_image_size', 'sla_*', 'variant'],
    jsonArrayParams: JSON_ARRAY_PARAMS,
    // the packs the window graph rides (EXTENSION LAW) + the film
    // tail's file boundary (melite-utility-nodes: MeliteUnload +
    // MeliteConcatVideos) + the film audio (melite-audio-nodes: the
    // clips arm's post-generation MeliteFilmAudioMix; the retired
    // in-graph Delay/Mix/Duck chain needed no declaration beyond the
    // same pack). (2026-10-15: ComfyUI-Frame-Interpolation and
    // ComfyUI-LTXVideo are GONE — every class this card's graphs
    // address from them is mis-attributed: FrameInterpolate,
    // FrameInterpolationModelLoader and CreateVideo are ENGINE CORE
    // (core_node_types), LTX_lora_loader is PlagueKind's, already
    // required above. Neither pack owns a class any graph uses.)
    requires: [
      'comfyui-h3-motion-context', 'Comfyui-PlagueKind-Nodes',
      'ComfyUI-KJNodes',
      'ComfyUI-SeedVR2_VideoUpscaler',
      'melite-utility-nodes', 'melite-audio-nodes',
    ],
    schema,
    // the emitter carrier (this card's schema is the hand-written
    // normalizer — params_schema walks the declared object's .dict)
    schemaCarrier: paramSchema,
    compose(p, model, g, runId) {
      // THE SCHEMA GATE (the music/sfx/tts admission precedent — the
      // schemaCarrier equivalent: this card is WRAPPED, so the served
      // carrier paramSchema owns the declared knob bounds; the full
      // schema() normalizer's family-admission runs at the compose
      // door (service def.schema) on truly-explicit keys and CANNOT
      // re-run here — the door's cascade materializes carrier defaults
      // (sr_switch, interp_multiplier, ...) which the t4r admission
      // would refuse as injects): the carrier walk enforces declared
      // types + bounds (width 448–1344, steps 4–30 — anything else
      // refuses LOUD, never composes), fills defaults (seed 42),
      // admits renderer/mod keys inert (calls, loras, noise_seed ride
      // verbatim). THE WIRE LAWS LIVE IN THE FIELDS (hour 20): the
      // interpolate_enabled transform coerces the legacy string
      // default + wire literals, the length transform drops the null
      // absent-on-wire sentinel — no gate-side prefill, the trio's
      // one-line pattern. The composer's reads below are reads of the
      // GATED doc.
      // The wire law is SHARED (coerceWireBoolean — the same
      // definition schema() uses, hour 20). NO SILENT REPAIR
      // (2026-09-20): an explicit null length used to be deleted
      // here so the walk would silently fill the default — the same
      // quiet-fix the door now refuses ('nulled-param'). The card's
      // own gate voices the same refusal: send a number or omit the
      // key, never null.
      const gateInput = coerceWireBoolean(p as Record<string, unknown>)
      if (gateInput.length === null) {
        throw new Error('length is null — send a real frame count or omit the key; the 17k+5 grid default fills natively (never null)')
      }
      // T6'S STRICT RESOLVE: the carrier walk refuses a key that is
      // neither a declared knob nor a rider. The rider list is the
      // composer's own non-knob reads: the studio shot vocab
      // (calls, audio_clips, keyframes, refs, document), the lora
      // bag, the per-window fences, the derive keys (variant,
      // quant, recipe, refine — refine is injected by the door
      // AFTER this walk), the schema's __steps_pinned stamp (007
      // L3 — the walk's own explicit-steps fact, read by the film
      // build's single-window marriage) and the context prefix class
      // (ctx_* — the compat law's own list at schema.ts names it;
      // motion_* is gone: no reader, no producer, no draft carries it).
      p = gatedResolve('h3-timeline', schemaFn, [
        'calls', 'audio_clips', 'keyframes', 'fps', 'audio_stem', 'document', 'loras',
        'refs', 'variant', 'quant', 'recipe', 'refine', 'model', '__steps_pinned', 'ctx_*',
      ], gateInput)
      // THE SINGLE-CALL LIFT runs FIRST (the guard below reads the
      // lifted anchor): a one-call doc's row IS the window — its
      // prompt, image (the anchor), refs (the reference bundle) and
      // knobs ride the call, never a parallel run-level vocabulary.
      {
        const liftRows = Array.isArray(p.calls) ? p.calls as Array<Record<string, unknown>> : null
        if (liftRows !== null && liftRows.length === 1 && !Array.isArray((liftRows[0] as { calls?: unknown }).calls)) {
          const single = liftRows[0]
          const knobs = (single.knobs ?? {}) as Record<string, unknown>
          p = { ...p, ...knobs }
          const img = (single.image ?? single.ref_image ?? single.image_name) as string | undefined
          if (typeof img === 'string' && img !== '') p.image = img
          if (single.refs !== undefined) p.refs = single.refs
          if (typeof single.text === 'string' && single.text.trim() !== '') p.prompt = single.text.trim()
        }
      }
      assertOverlayGated(p, 'h3-timeline single-call lift')
      const bound = ACTION_BINDINGS[model.family ?? model.id]
      if (bound) bound(p, model, g, runId)
      else {
        throw new Error(
          `no declared action for family '${String(model.family ?? model.id)}' on the h3-timeline card — every boarded family (h3) composes its own declared segment; this address owns none`)
      }
    },
    // the t4-family strip pass rides the kit (python: `if not is_t4r`).
    finalize: finalizeH3,
  }))
}
