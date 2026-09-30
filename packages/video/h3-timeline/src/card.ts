// Tier 3 — the h3-timeline card (the h3_window renderer port).
//
// CARD SURFACE vs RENDERER VOCABULARY (2026-09-07): the schema below
// mirrors ONLY the retired python card's own fields (H3TimelineCard:
// prompt, image, seed, width, height, length, steps, sharpen_enabled,
// sharpen_strength, interpolate_enabled, shift_video, shift_audio
// 12 keys; the S-decl purge deleted 2026-09-08). The window families (t4r /
// t4_open / t4_chain), the motion-context chaining rail, and the SLA /
// SR / interp leaves are the RENDERER vocabulary the compose body
// still reads: those keys ride the compose door's explicit-params
// overlay (prepareCardParams — the ONE resolver: schema defaults, then the
// selected variant's stamps, then the caller's params), so every
// read below normalizes with its old default and the served shape
// stays byte-identical.
//
// Node creation order follows the SERIALIZED id
// order exactly — comfy-script assigns `<Class>.<index>` ids
// depth-first post-order from the output list (saved, then
// ctx_saved), so the per-class creation sequence below is pinned by
// that walk (observed inversions, kept verbatim: t4r creates the fps
// 24.0 PrimitiveFloat BEFORE the seconds 10.0 one, and the reference
// resizer BEFORE the geometry resizer).
//
// Autofill law: the GraphBuilder auto-fills pin defaults for omitted
// inputs exactly like comfy-script does; the compose strips
// the t4-family leaks post-hoc (_T4_AUTOFILL_STRIP) — the strip rides
// @melite/comfyui-card-kit's finalizeH3 (t4r, like the python's `if not is_t4r`,
// strips nothing; the i2v dead-branch node marks the t4r family in
// the serialized graph).
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
import { declaredAction, finalizeH3, instantiateAction } from '@melite/comfyui-card-kit'
import type { ModelFacts } from '@melite/comfyui-card-kit/facts'

export { assertCarriedSpanGrid, assertGridLength, assertSpanGrid, gridSnap } from '@melite/models-h3/timelineContract'
export { carrier, JSON_ARRAY_PARAMS, schema } from '@melite/models-h3/schema'

// inputs the t4 family templates OMIT whose pin defaults comfy-script
// would auto-fill at serialization — the strip set lives in the card kit (finalizeH3)
// (H3_T4_STRIP; the t4r branch carries all of these explicitly, so it
// never strips).

// (No local CardDefinition augmentation: the service's schemaCarrier
// seat — Schema-typed since ledger row 23 — already carries this.)

/** Schemastery objects are lenient (unknown/missing keys ride); the
 *  family-admission laws are the renderer's own validators, ported:
 *  unknown variant + family-conditional key admission on EXPLICIT
 *  params only (the python gate reads model_fields_set). The t4r
 *  staged-image law rides compose (it reads the merged value). The
 *  renderer-vocabulary keys (variant, k, ctx_*, sla_*, ...) are NOT
 *  declared knobs — old drafts keep working because the schema admits
 *  them and the compose door overlays explicit params last (the
 *  img-to-mesh filename_prefix precedent).*/
// ONE MODEL (the operator's law, 2026-09-20 "we use ONE model" +
// 2026-09-21 "HOW IS MINIMAX H3 AND H3 TIMELINE TWO DIFFERENT
// MODELS?" — LANDED, roadmap §8): the card boards ONE family. The
// old h3 + h3-keyframe family packages are dead — their addresses
// survive as VARIANT ROUTES on the h3 family (timeline →
// h3-timeline — the pre-correction family address; fl2va →
// h3-fl2va, ref2va → h3-ref2va, timeline-ref2va →
// h3-timeline-ref, keyframe → h3-keyframe), so old drafts resolve
// migration-free and the facts rows re-derive through the merged
// family. THE SURVIVOR-ID CORRECTION (operator, 2026-09-22): the
// family is the CHECKPOINT id `h3` — never a lane name (anima
// isn't anima-generate); the card id `h3-timeline` (the usecase
// surface) keeps its own name.
// THE FAMILY ID COMES FROM ITS DECL (the closure gate's RULE 5) —
// and with it the LANE'S FILES, which this card used to own as
// constants of its own.
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

// ── the renderer body — node order IS the python's serialized id order ────
// Every renderer-vocabulary read (a key the 12-knob schema does not
// declare) normalizes with its old schema default, so calls that omit
// it render exactly the frozen graphs. Card-knob reads use the schema
// value directly (always defined post-schema) except the two bare
// keys (prompt/image), which normalize absent.
/** THE MERGED FILM (the merged-graph builder, 2026-09-17): the
 *  execute-lane transport composed each window separately and merged
 *  the graphs post-serialization (namespacing + rewiring the seam
 *  links); the TS flip lost that half — a multi-call doc composed ONE
 *  window and the seams never rode. This is the port: ONE prompt, N
 *  windows under `window${k}_` scopes (GraphBuilder.scoped), REAL seam
 *  edges between scopes (the executor orders windows off the graph),
 *  per-window stanzas in the vocabulary (k, ctx_save_clip_index,
 *  the per-call knobs REPLACE, the span rider per window). The seam
 *  itself is the studio's document law (docModel): transition
 *  'extend' (absent = extend) chains the previous LATENT; 'cut' is a fresh window,
 *  and 'cut' + first_frame_prev_sec opens from the previous VIDEO
 *  tail (the node's context_frames arm). prev_sec scales the carry:
 *  picture snapped to the node's legal context lengths (5/22/39/56
 *  frames — only whole latent steps), audio at 24 frames/second. */
/** ENFORCEMENT-ONLY WALK (2026-09-19, the operator's order: the
 *  schema gates EVERY hop — nothing goes around Schemaster). The
 *  overlays (the single-call lift, the film per-window stanza)
 *  merge user-authored knobs AFTER the compose gate walked the
 *  entry doc; this walk keeps the carrier's REFUSALS (declared
 *  types + bounds on every knob the overlay introduces) and
 *  DISCARDS its default-fills — the stanza's absent-key law (null
 *  length for per-window spans, the family budgets) owns the
 *  semantics. */
const assertOverlayGated = (doc: Record<string, unknown>, where: string): void => {
  try {
    paramSchema(doc)
  } catch (e) {
    throw new Error(`${where}: ${String(e)}`)
  }
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
    admits: ['ctx_*', 'fps_seconds', 'image_name', 'k', 'motion_*', 'noise_seed', 'quant', 'recipe', 'ref_image_size', 'sla_*', 'variant'],
    jsonArrayParams: JSON_ARRAY_PARAMS,
    // the packs the window graph rides (EXTENSION LAW) + the film
    // tail's file boundary (melite-utility-nodes: MeliteUnload +
    // MeliteConcatVideos) + the film audio (melite-audio-nodes: the
    // clips arm's post-generation MeliteFilmAudioMix; the retired
    // in-graph Delay/Mix/Duck chain needed no declaration beyond the
    // same pack).
    requires: [
      'comfyui-h3-motion-context', 'ComfyUI-PlagueKind-Nodes',
      'ComfyUI-Frame-Interpolation', 'ComfyUI-KJNodes',
      'ComfyUI-SeedVR2_VideoUpscaler', 'ComfyUI-LTXVideo',
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
      p = paramSchema(gateInput) as unknown as Record<string, unknown>
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
