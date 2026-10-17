/**
 * compose-equivalence-corpus.spec.ts — THE COMPOSE-EQUIVALENCE
 * CORPUS (journey-closure plan §D1, 2026-10-17; closes ui-truth-gap
 * #2 Remaining, coverage row 92). Hop [1]→[5]: studio state →
 * serialized doc → served-schema walk → the real GraphBuilder +
 * instantiateAction → graph inputs.
 *
 * THE WALL, one line: "for every corpus shape, the studio's
 * serialized doc composes to the same graph inputs the walk's own
 * defaults would state — no seat diverges."
 *
 * THE GAP IT CLOSES (the ui-truth-gap audit's root finding): every
 * prior wall stopped at serialize depth (the contract wall by its
 * own header — "the compose path bypasses the admission gate, so
 * the TEST is the wall") or at hand-built-doc depth (card-gap, the
 * value sweep). The burns lived between them: UI-true, doc-true,
 * engine-deaf. This corpus serializes the studio's OWN state, walks
 * the SERVED schema, composes through the REAL kit, and diffs the
 * graphs at NAMED node inputs.
 *
 * THE MECHANICS per corpus member:
 *   A — the studio's serialized doc: serializeLayerA over
 *       hydrateLayerA(base)+gestures, serializeCalls,
 *       serializeKeyframes, then settled the bench way (per key,
 *       null deletes — estate/drafts/src/bench.ts:969-983's
 *       merge-patch arm, verbatim law) over the persisted base.
 *   B — the walk's own defaults: the same doc's UI truth
 *       (mergeDocLayers — defined-wins, docModel.ts) MINUS the two
 *       recorded lawful transforms (T4_ONLY_KEYS on a derived-t4r
 *       doc — the B1 emit law whose omission this corpus re-proves
 *       at graph depth; FILM_ONLY_KEYS off the film shape — the B6
 *       gate). B never passes through the serializer, so a seat the
 *       serializer invents, drops, or mangles diverges HERE.
 *   The equivalence judge compares A and B at every named node
 *   input (each row's precedent cited inline); the sweep arm pins
 *   the STATED values themselves (the tautology tooth — if A and B
 *   dropped a knob identically, equivalence alone would stay green).
 *
 * THE PRECEDENTS (the corpus inherits, never re-invents):
 *   - ff845f984's corpus arm (tests/walls/ts/suites/
 *     run-composability.spec.ts): mirror-vs-door on identical
 *     inputs, verdicts must agree. THIS corpus extends the same
 *     equivalence class one hop further — to the graph.
 *   - 87c5d5140 (ONE CLOCK): the sampler-clock seats — the
 *     container CreateVideo.fps, the stamps'
 *     MeliteAudioSlice.duration_seconds, the gold inverse in
 *     ComfyMathExpression.expression — inherited as the corpus's
 *     clock members (a stated-16 film AND an unstated-clock film;
 *     the unstated member is where a serializer clock-stamp dies).
 *   - efd0e2a74 (THE VALUE SWEEP): the hop-5-blind knobs at their
 *     named inputs — the nine H3SLAAttention leaves, r2v
 *     ref_image_size, the ImageSharpenKJ.method dict, the interp
 *     pair — inherited as stated knobs on the t4r and second-pass
 *     members.
 *   - the R2 door arm (studio-contract-wall.spec.ts): the hermetic
 *     boot + settle + real-door pattern this file extends through
 *     walk → GraphBuilder → instantiateAction → named inputs.
 *   - door.spec's declared-input sweep: the film-graph edges —
 *     every composed graph is judged against the FROZEN boot
 *     fixture's declarations (deriveWiringDoc + assertWiringAgainst
 *     over tests/walls/fixtures/object_info.boot.json — read, never
 *     edited).
 *
 * THE RED-PROOF (plan §D1): re-introduce the fps 16 stamp in
 * serializeLayerA (the one-clock cure deleted it — the studio's
 * readers once fell to DEFAULT_SEGMENT_PARAMS.fps = 16) → the
 * equivalence arm reds at the named clock inputs (CreateVideo.fps,
 * MeliteAudioSlice.duration_seconds, the gold expression) on every
 * unstated-clock member; restore → green.
 *
 * SCOPING (recorded): the mod bag's id→wire translation is the
 * estate door's resolution (the walk reads {name, strength} —
 * actions.ts:918; the studio stores {id, strength} — docHydrate),
 * walled estate-side; the corpus members carry no bag and both
 * composes ride the family default stack. The refine rider's id
 * resolution is the same door plane (the sweep's row B shape —
 * second_pass_enabled without a stated refine id — is the
 * precedent's own payload).
 *
 * Run: npx vitest run --project node tests/walls/ts/suites/compose-equivalence-corpus.spec.ts
 */
// THE HERMETIC ENGINE, FIRST IMPORT (the boot-models first-import
// law): the object_info mock registers before any estate barrel
// evaluates, so no path in this file can dial a live engine. The
// corpus itself never primes — its walk is the card's own schema
// walk — and the FROZEN fixture is read directly for the wiring
// judge (door.spec's declared-input sweep pattern).
import "../../../../tests/helpers/hermetic-engine.ts"
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { serializeLayerA, hydrateLayerA } from "../../../../packages/video/h3-timeline/src/ui/studio/docHydrate.ts"
import { mergeDocLayers } from "../../../../packages/video/h3-timeline/src/ui/studio/docModel.ts"
import { hydrateCalls, serializeCalls, hydrateKeyframes, serializeKeyframes } from "../../../../packages/video/h3-timeline/src/ui/studio/docCalls.ts"
import { film } from "@melite/models-h3/actions"
import { schema as h3schemaFn } from "@melite/models-h3/schema"
import { T4_ONLY_KEYS, FILM_ONLY_KEYS, deriveWindowFamily } from "@melite/models-h3/timelineContract"
import { GraphBuilder } from "@melite/comfyui-card-kit/graph"
import { instantiateAction } from "@melite/comfyui-card-kit"
import type { ModelFacts } from "@melite/comfyui-card-kit/facts"
import { deriveWiringDoc, assertWiringAgainst } from "@melite/comfyui-cordis/comfyui-wiring"

/** The window driver's model row — the interpreter's own contract
 *  (facts door + seed mint + segment factory), verbatim from the
 *  precedent walls' WINDOW_MODEL (door.spec.ts:29,
 *  studio-contract-wall.spec.ts:53): the production path, both
 *  composes ride the SAME facts so a divergence is a doc knob, not
 *  a facts drift. */
const WINDOW_MODEL: ModelFacts = {
  id: "h3",
  card: "h3-timeline",
  defaults: {},
  lane_inputs: {
    unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
  },
  variants: [],
  variant_groups: [],
  outputs: [],
}

/** The serialized graph's node map — every arm's read shape. */
type Doc = Record<string, { class_type: string; inputs: Record<string, unknown> }>

// ---------------------------------------------------------------------------
// THE NAMED-INPUT LIST — every row derived from a precedent wall, none
// invented here. The equivalence arm judges ALL rows on every member;
// the sweep arm pins the stated values at the cited rows.
// ---------------------------------------------------------------------------
const NAMED_INPUTS: ReadonlyArray<{ cls: string; input: string; why: string }> = [
  // THE MODEL SEATS — the facts door's three weights (door.spec "the
  // h3 film action's facts door"). Both composes share WINDOW_MODEL,
  // so a divergence here means a doc knob reached a weight seat.
  { cls: "UNETLoader", input: "unet_name", why: "the facts door's unet" },
  { cls: "CLIPLoader", input: "clip_name", why: "the facts door's clip" },
  { cls: "VAELoader", input: "vae_name", why: "the facts door's video+audio VAEs" },
  // THE LATENT SEATS — the generator's geometry (upstream-parity
  // census: r2v opens ["", 1344, 768, 124, "match"]; door.spec
  // "FRAMES ARE LAYER B" — the span owns the length, never a stale
  // doc row).
  { cls: "MiniMaxH3ReferenceToVideo", input: "width", why: "the latent geometry" },
  { cls: "MiniMaxH3ReferenceToVideo", input: "height", why: "the latent geometry" },
  { cls: "MiniMaxH3ReferenceToVideo", input: "length", why: "FRAMES ARE LAYER B (door.spec)" },
  { cls: "MiniMaxH3ImageToVideo", input: "width", why: "the non-reference generator's geometry" },
  { cls: "MiniMaxH3ImageToVideo", input: "height", why: "the non-reference generator's geometry" },
  { cls: "MiniMaxH3ImageToVideo", input: "length", why: "FRAMES ARE LAYER B, the non-reference seat (door.spec)" },
  // THE SAMPLER CLOCK — 87c5d5140's seats (ONE CLOCK, EVERY SEAT).
  { cls: "CreateVideo", input: "fps", why: "ONE CLOCK — the container clock" },
  { cls: "MeliteAudioSlice", input: "duration_seconds", why: "ONE CLOCK — the stamps" },
  { cls: "ComfyMathExpression", input: "expression", why: "ONE CLOCK — the gold seconds→frames inverse" },
  // THE VALUE SWEEP — efd0e2a74 row A: the nine SLA leaves at
  // H3SLAAttention + ref_image_size at the r2v node.
  { cls: "H3SLAAttention", input: "sparsity_ratio", why: "THE VALUE SWEEP row A" },
  { cls: "H3SLAAttention", input: "block_size", why: "THE VALUE SWEEP row A" },
  { cls: "H3SLAAttention", input: "min_seq_len", why: "THE VALUE SWEEP row A" },
  { cls: "H3SLAAttention", input: "dense_last_steps", why: "THE VALUE SWEEP row A" },
  { cls: "H3SLAAttention", input: "protect_audio", why: "THE VALUE SWEEP row A" },
  { cls: "H3SLAAttention", input: "dense_steps", why: "THE VALUE SWEEP row A" },
  { cls: "H3SLAAttention", input: "dense_backend", why: "THE VALUE SWEEP row A" },
  { cls: "H3SLAAttention", input: "disable_fp16_accum", why: "THE VALUE SWEEP row A" },
  { cls: "H3SLAAttention", input: "stabilize_motion", why: "THE VALUE SWEEP row A (the stated word, never the fallback)" },
  { cls: "MiniMaxH3ReferenceToVideo", input: "ref_image_size", why: "THE VALUE SWEEP row A" },
  // THE VALUE SWEEP — efd0e2a74 row B: the sharpen leaves ride the
  // ImageSharpenKJ method dict; the interp pair rides its own seats.
  { cls: "ImageSharpenKJ", input: "method", why: "THE VALUE SWEEP row B (the method dict)" },
  { cls: "FrameInterpolationModelLoader", input: "model_name", why: "THE VALUE SWEEP row B" },
  { cls: "FrameInterpolate", input: "multiplier", why: "THE VALUE SWEEP row B" },
  // THE STEPS MARRIAGE — door.spec "THE USER'S STEPS NEVER LOSES TO
  // THE BAG": the scheduler's count is a judged seat.
  { cls: "BasicScheduler", input: "steps", why: "the steps marriage (door.spec)" },
]

/** One named input read out of one node, links resolved one hop: a
 *  [nodeId, slot] value reads as the SOURCE node's class + the fed
 *  output's underlying value (the two-clocks arm's exact read shape
 *  — the clock rides PrimitiveFloat feeds). */
function readSeat(
  doc: Doc,
  id: string,
  input: string,
): { raw: unknown; feedClass?: string; feedValue?: unknown } {
  const node = doc[id]
  const v = node.inputs[input]
  if (Array.isArray(v) && typeof v[0] === "string") {
    const src = doc[v[0] as string]
    if (src !== undefined) {
      // the fed VALUE: a PrimitiveFloat-style feeder carries it at
      // `value` (the two-clocks arm's read); otherwise the slot key
      const fed = src.inputs.value !== undefined ? src.inputs.value : src.inputs[String(v[1] ?? 0)]
      return { raw: v, feedClass: src.class_type, feedValue: fed }
    }
  }
  return { raw: v }
}

/** The per-class census of a named input across a whole graph —
 *  order-stable (node insertion follows render order, the
 *  two-clocks arm's order-bound lesson). */
function namedCensus(doc: Doc, cls: string, input: string): Array<ReturnType<typeof readSeat>> {
  return Object.entries(doc)
    .filter(([, n]) => n.class_type === cls)
    .map(([id, n]) => readSeat(doc, id, input))
}

// ---------------------------------------------------------------------------
// THE CORPUS — the canonical shapes (upstream-parity's census roster:
// single_image t4r, single_ref2va, film_extend, film_cut, second_pass,
// keyframed), each a persisted base + the studio gestures that rode
// after it. Hand-authored BY DESIGN — a corpus is a fixed roster; the
// named inputs, the family laws, and the default fills all derive
// from the real contract/walk, never from this file's lists.
// ---------------------------------------------------------------------------
interface CorpusMember {
  name: string
  base: Record<string, unknown>
  gestures: Record<string, unknown>
  /** classes that MUST be present in both composes — the vacuous-truth
   *  guard (door.spec's length-guard lesson: an unguarded filter over
   *  an empty census judges nothing). */
  expects: Array<{ cls: string; min: number; why: string }>
}

const DIALOGUE_CLIP = {
  id: "a", name: "line.flac", src: "/media/line.flac",
  start_frame: 0, dur_frames: 64, class: "dialogue" as const, text: "Run.",
}

const CORPUS: ReadonlyArray<CorpusMember> = [
  {
    name: "single-window t4r (the anchor guide; the Final Cut residue healed; the sweep row A stated)",
    // the persisted doc still carries the Final Cut pick's post
    // stamps (the residue); the studio's state cleared them (the D8
    // heal's gesture — undefined = the clear) and stated the sweep
    // row A knobs over the t4r arm's fallback poles where the
    // precedent did (stabilize_motion TRUE over the false fallback).
    base: {
      seed: 7, width: 768, height: 448, steps: 12,
      sr_switch: true, second_pass_enabled: true,
      calls: [{ text: "the courier steps in", start_frame: 0, end_frame: 90, image: "anchor.png" }],
    },
    gestures: {
      sr_switch: undefined, second_pass_enabled: undefined,
      sla_sparsity: 0.9, sla_block_size: "64", sla_min_seq_len: 7680,
      sla_dense_last_steps: 4, sla_protect_audio: false,
      sla_dense_steps: "1-3", sla_dense_backend: "pytorch",
      sla_disable_fp16_accum: true, sla_stabilize_motion: true,
      ref_image_size: "match",
    },
    expects: [
      { cls: "H3SLAAttention", min: 1, why: "SLA mounts on the t4r arm" },
      { cls: "MiniMaxH3ReferenceToVideo", min: 1, why: "the r2v generator composes on the anchor arm" },
      { cls: "CreateVideo", min: 1, why: "the container composes" },
      { cls: "ComfyMathExpression", min: 1, why: "the t4r gold inverse composes" },
    ],
  },
  {
    name: "single-window ref2va (the declared reference surface + trims + audio ref)",
    base: {
      seed: 7, width: 768, height: 448,
      ref_videos: ["/media/motion.mp4"], ref_video_trims: [{ start_time: 2, duration: 5 }],
      ref_audios: ["/media/voice.flac"], ref_image_size: "max",
      calls: [{ text: "the harbour holds its breath", start_frame: 0, end_frame: 90, image: "anchor.png" }],
    },
    gestures: { ref_images: ["/media/style.png"] },
    expects: [
      { cls: "MiniMaxH3ReferenceToVideo", min: 1, why: "the r2v generator composes" },
      { cls: "Video Slice", min: 1, why: "the ref2va lane slices the video ref (the census's lane classes)" },
    ],
  },
  {
    name: "2-window extend film (the carried seam; the stated 16 clock; the dialogue stamp; duck_depth_db on the film shape)",
    base: {
      seed: 7, fps: 16, width: 768, height: 448, duck_depth_db: -14,
      calls: [
        { text: "first", start_frame: 0, end_frame: 90 },
        { text: "second", start_frame: 90, end_frame: 175 },
      ],
      audio_clips: [DIALOGUE_CLIP],
    },
    gestures: {},
    expects: [
      { cls: "MeliteAudioSlice", min: 1, why: "the dialogue pin composes on the film" },
      { cls: "CreateVideo", min: 1, why: "the container composes" },
    ],
  },
  {
    name: "2-window cut film (the transition cut; the UNSTATED clock and geometry — the walk's own defaults ride)",
    // NO fps, NO width/height stated: the walk's declared defaults
    // (24 / the geometry rows) are what both composes must state.
    // The dialogue stamp + the absent clock is the one-clock wall's
    // SEAT 6 shape (the fallback arm of the stamps' own ternary).
    base: {
      seed: 7,
      calls: [
        { text: "first", start_frame: 0, end_frame: 90 },
        { text: "second", start_frame: 90, end_frame: 146, transition: "cut" },
      ],
      audio_clips: [DIALOGUE_CLIP],
    },
    gestures: {},
    expects: [
      { cls: "MeliteAudioSlice", min: 1, why: "the stamp composes at the absent clock" },
      { cls: "CreateVideo", min: 1, why: "the container composes" },
    ],
  },
  {
    name: "second-pass doc (t4_open; the sweep row B stated; the full post chain armed)",
    base: {
      seed: 7, width: 768, height: 448, steps: 12,
      calls: [{ text: "a text window", start_frame: 0, end_frame: 90 }],
    },
    gestures: {
      second_pass_enabled: true,
      sharpen_enabled: true, sharpen_method: "adaptive_usm", sharpen_strength: 0.4,
      sharpen_radius: 2.5, sharpen_threshold: 0.9, sharpen_iterations: 2,
      interpolate_enabled: true, interp_model: "rife47.pth", interp_multiplier: 3,
      sr_switch: true, sr_model: "seedvr2_ema_3b_fp16.safetensors", sr_resolution: 1080,
    },
    expects: [
      { cls: "ImageSharpenKJ", min: 1, why: "the sharpen leaf composes under the master" },
      { cls: "FrameInterpolationModelLoader", min: 1, why: "the interp loader composes" },
      { cls: "FrameInterpolate", min: 1, why: "the interp node composes" },
    ],
  },
  {
    name: "keyframed doc (the pin channel rides MiniMaxH3AddGuide; derived t4r)",
    base: {
      seed: 7, width: 768, height: 448,
      calls: [{ text: "the courier steps in", start_frame: 0, end_frame: 90 }],
      keyframes: [{ image: "pin.png", frame: 45 }],
    },
    gestures: {},
    expects: [
      { cls: "MiniMaxH3AddGuide", min: 1, why: "the pin composes as the guide chain (the census's keyframed row)" },
    ],
  },
]

// ---------------------------------------------------------------------------
// THE PIPELINE — A: serialize + settle; B: the UI truth minus the
// recorded lawful transforms. Both walk the served schema and compose
// through the real kit.
// ---------------------------------------------------------------------------

/** THE BENCH SETTLEMENT (estate/drafts/src/bench.ts:969-983's
 *  merge-patch arm, verbatim law: per key, null deletes) — the view
 *  the run press actually reads. */
function settle(base: Record<string, unknown>, saved: Record<string, unknown>): Record<string, unknown> {
  const settled: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(saved)) {
    if (v === null) delete settled[k]
    else settled[k] = v
  }
  return settled
}

/** Compose one doc through the served schema walk + the real kit. */
function compose(doc: Record<string, unknown>, runId: string): Doc {
  const g = new GraphBuilder()
  instantiateAction(film, h3schemaFn(doc), WINDOW_MODEL, g, runId)
  return g.toJSON() as Doc
}

/** Member A-doc: the studio's serialized doc, settled the bench way. */
function serializedDoc(member: CorpusMember): Record<string, unknown> {
  const state = {
    ...hydrateLayerA(member.base),
    ...member.gestures,
    calls: hydrateCalls(member.base),
    keyframes: hydrateKeyframes(member.base.keyframes),
  }
  const saved = serializeLayerA(state as never, member.base)
  const savedCalls = serializeCalls(state.calls)
  const savedKfs = serializeKeyframes(state.keyframes)
  const settled = settle(member.base, saved as Record<string, unknown>)
  return {
    ...settled,
    calls: savedCalls,
    ...(savedKfs.length > 0 ? { keyframes: savedKfs } : {}),
  }
}

/** Member B-doc: the walk's own defaults — the UI truth
 *  (mergeDocLayers, defined-wins) minus the two recorded lawful
 *  transforms. NEVER serialized: a serializer invention, drop, or
 *  mangle can only diverge here. */
function walkDefaultsDoc(member: CorpusMember): Record<string, unknown> {
  const stated = mergeDocLayers(member.base, {
    ...hydrateLayerA(member.base),
    ...member.gestures,
    calls: hydrateCalls(member.base),
    keyframes: hydrateKeyframes(member.base.keyframes),
  })
  const family = deriveWindowFamily(stated)
  if (family === "t4r") {
    // THE B1 EMIT LAW's receipt, at graph depth: the studio omits
    // every T4_ONLY member on a derived-t4r doc because the walk
    // REFUSES them (the Final Cut brick); B records the same
    // transform or B is not the walk's own defaults at all.
    for (const k of T4_ONLY_KEYS) delete stated[k]
  }
  if (family !== "t4_chain") {
    // THE FILM-ONLY GATE's receipt (B6): duck_depth_db reads only
    // inside the film boundary; off the film shape the walk refuses.
    for (const k of FILM_ONLY_KEYS) delete stated[k]
  }
  return stated
}

describe("THE COMPOSE-EQUIVALENCE CORPUS (studio state → walk → graph inputs, no seat diverges)", () => {
  it("every corpus member composes TWO ways and the graphs agree at every named node input", () => {
    const divergences: string[] = []
    for (const [mi, member] of CORPUS.entries()) {
      const docA = compose(serializedDoc(member), `d1_a_${mi}`)
      const docB = compose(walkDefaultsDoc(member), `d1_b_${mi}`)
      // THE PRESENCE GUARD first: the seats this member exists to
      // judge must exist in BOTH graphs (else the equivalence loop
      // below would silently judge nothing).
      for (const e of member.expects) {
        const aCount = Object.values(docA).filter((n) => n.class_type === e.cls).length
        const bCount = Object.values(docB).filter((n) => n.class_type === e.cls).length
        expect(
          aCount >= e.min && bCount >= e.min,
          `${member.name}: expected ≥${e.min} ${e.cls} in both composes (A=${aCount}, B=${bCount}) — ${e.why}; the equivalence loop would judge nothing`,
        ).toBe(true)
      }
      for (const { cls, input, why } of NAMED_INPUTS) {
        const a = namedCensus(docA, cls, input)
        const b = namedCensus(docB, cls, input)
        if (a.length === 0 && b.length === 0) continue // the class rides another member's lane
        if (a.length !== b.length) {
          divergences.push(`${member.name} :: ${cls}.${input} (${why}): the class census diverges — studio A=${a.length}, walk-defaults B=${b.length}`)
          continue
        }
        for (const [i] of a.entries()) {
          const sa = a[i]!
          const sb = b[i]!
          const same =
            sa.feedClass !== undefined || sb.feedClass !== undefined
              ? sa.feedClass === sb.feedClass && sa.feedValue === sb.feedValue
              : JSON.stringify(sa.raw) === JSON.stringify(sb.raw)
          if (!same) {
            divergences.push(
              `${member.name} :: ${cls}.${input} (${why}) [${i}]: studio=${JSON.stringify(sa.feedClass !== undefined ? { feed: sa.feedClass, value: sa.feedValue } : sa.raw)} vs walk-defaults=${JSON.stringify(sb.feedClass !== undefined ? { feed: sb.feedClass, value: sb.feedValue } : sb.raw)}`,
            )
          }
        }
      }
      // THE RENDER-CLOCK FEED EDGE (the two-clocks arm's read shape):
      // every ComfyMathExpression's values.a must feed the same
      // PrimitiveFloat seconds in both graphs.
      const exprsA = Object.entries(docA).filter(([, n]) => n.class_type === "ComfyMathExpression")
      const exprsB = Object.entries(docB).filter(([, n]) => n.class_type === "ComfyMathExpression")
      expect(exprsA.length).toBe(exprsB.length)
      for (const [i] of exprsA.entries()) {
        const fa = readSeat(docA, exprsA[i]![0], "values.a")
        const fb = readSeat(docB, exprsB[i]![0], "values.a")
        if (fa.feedClass !== fb.feedClass || fa.feedValue !== fb.feedValue) {
          divergences.push(
            `${member.name} :: ComfyMathExpression.values.a (the render-clock feed) [${i}]: studio=${fa.feedClass}:${String(fa.feedValue)} vs walk-defaults=${fb.feedClass}:${String(fb.feedValue)}`,
          )
        }
      }
    }
    expect(
      divergences,
      `the studio's serialized doc composes to graph inputs the walk's own defaults do not state:\n${divergences.join("\n")}`,
    ).toEqual([])
  })

  it("THE VALUE SWEEP inherited: the stated knobs land at their named inputs through the FULL pipeline (serialize → settle → walk → compose)", () => {
    // The precedent swept hand-built docs; these rows sweep the
    // SERIALIZED studio state — a serializer drop or mangle of any
    // stated knob reds here even when both composes would drop it
    // identically (the tautology tooth).
    const [t4r, , extend, cut, secondPass] = CORPUS
    // MEMBER 1 — the sweep row A at H3SLAAttention + the r2v seat.
    {
      const doc = compose(serializedDoc(t4r!), "d1_sweep_t4r")
      const sla = Object.values(doc).find((n) => n.class_type === "H3SLAAttention")
      expect(sla, "H3SLAAttention composes on the t4r arm").toBeDefined()
      expect(sla!.inputs.sparsity_ratio).toBe(0.9)
      expect(sla!.inputs.block_size).toBe("64")
      expect(sla!.inputs.min_seq_len).toBe(7680)
      expect(sla!.inputs.dense_last_steps).toBe(4)
      expect(sla!.inputs.protect_audio).toBe(false)
      expect(sla!.inputs.dense_steps).toBe("1-3")
      expect(sla!.inputs.dense_backend).toBe("pytorch")
      expect(sla!.inputs.disable_fp16_accum).toBe(true)
      // the STATED word over the t4r arm's false fallback — never a
      // fallback coincidence (the precedent's own lesson)
      expect(sla!.inputs.stabilize_motion).toBe(true)
      const r2v = Object.values(doc).find((n) => n.class_type === "MiniMaxH3ReferenceToVideo")
      expect(r2v!.inputs.ref_image_size).toBe("match")
      // the stated steps ride the marriage seat; the stated geometry
      // rides the latent seats
      const sched = Object.values(doc).find((n) => n.class_type === "BasicScheduler")
      expect(sched!.inputs.steps).toBe(12)
      // THE T4 RECEIPT at graph depth: the healed residue arms no
      // post chain on the reference lane
      expect(Object.values(doc).some((n) => n.class_type === "ImageSharpenKJ")).toBe(false)
      // THE UNSTATED CLOCK (the gold inverse): the doc states no fps,
      // so the expression must carry the walk's own 24 — a serializer
      // clock-stamp reds here by name
      const gold = Object.values(doc).find((n) => n.class_type === "ComfyMathExpression")
      expect(String(gold!.inputs.expression)).toContain("* 24")
      expect(String(gold!.inputs.expression)).not.toContain("* 16")
    }
    // MEMBER 3 — the stated 16 clock: the stamps book 4.0s and the
    // container carries 16 (ONE CLOCK's seats, through the pipeline).
    {
      const doc = compose(serializedDoc(extend!), "d1_sweep_extend")
      const slice = Object.values(doc).find((n) => n.class_type === "MeliteAudioSlice")
      expect(slice, "the dialogue pin composes").toBeDefined()
      expect(slice!.inputs.duration_seconds).toBe(4)
      const fpsFloat = Object.values(doc).find(
        (n) => n.class_type === "PrimitiveFloat" && n.inputs.value === 16,
      )
      expect(fpsFloat, "the container's clock node carries the stated 16").toBeDefined()
      // the film shape honors the FILM_ONLY knob (it rode serialize +
      // settle and armed the mix desk)
      expect(
        Object.values(doc).some((n) => n.class_type === "MeliteFilmAudioMix"),
        "the film mix desk composes on the film shape",
      ).toBe(true)
    }
    // MEMBER 4 — the ABSENT clock: the walk's own default (24) books
    // the stamps — a serializer clock-stamp reds here by name.
    {
      const doc = compose(serializedDoc(cut!), "d1_sweep_cut")
      const slice = Object.values(doc).find((n) => n.class_type === "MeliteAudioSlice")
      expect(slice!.inputs.duration_seconds).toBeCloseTo(64 / 24, 3)
      const cv = Object.values(doc).find((n) => n.class_type === "CreateVideo")
      expect(cv, "the container composes").toBeDefined()
      const fpsSeat = readSeat(doc, Object.entries(doc).find(([, n]) => n.class_type === "CreateVideo")![0], "fps")
      expect(fpsSeat.feedClass ?? "scalar").toBe("PrimitiveFloat")
      expect(fpsSeat.feedValue).toBe(24)
    }
    // MEMBER 5 — the sweep row B: the sharpen dict + the interp pair.
    {
      const doc = compose(serializedDoc(secondPass!), "d1_sweep_post")
      const sharp = Object.values(doc).find((n) => n.class_type === "ImageSharpenKJ")
      expect(sharp, "the sharpen leaf composes under the master").toBeDefined()
      const method = sharp!.inputs.method as Record<string, unknown>
      expect(method.method).toBe("adaptive_usm")
      expect(method.strength).toBe(0.4)
      expect(method.radius).toBe(2.5)
      expect(method.threshold).toBe(0.9)
      expect(method.iterations).toBe(2)
      const interpLoader = Object.values(doc).find((n) => n.class_type === "FrameInterpolationModelLoader")
      expect(interpLoader!.inputs.model_name).toBe("rife47.pth")
      const interp = Object.values(doc).find((n) => n.class_type === "FrameInterpolate")
      expect(interp!.inputs.multiplier).toBe(3)
    }
  })

  it("THE FAMILY LAWS hold at graph depth: t4r arms no post chain, the film shape alone arms the mix desk", () => {
    // The corpus's two family-conditional members, judged by CLASS
    // PRESENCE (the graph is the receipt): the emit law's omission
    // (B1) lands as "no post chain nodes on the t4r lanes"; the
    // film-only gate (B6) lands as "the mix desk exists only under
    // the film boundary".
    const [, ref2va, , cut, , keyframed] = CORPUS
    for (const member of [ref2va!, keyframed!]) {
      const doc = compose(serializedDoc(member), `d1_family_${member.name.slice(0, 12)}`)
      for (const post of ["ImageSharpenKJ", "FrameInterpolate", "SeedVR2VideoUpscaler"]) {
        expect(
          Object.values(doc).some((n) => n.class_type === post),
          `${member.name}: ${post} composed on a t4r lane — the emit law's omission died`,
        ).toBe(false)
      }
    }
    const cutDoc = compose(serializedDoc(cut!), "d1_family_cut")
    expect(
      Object.values(cutDoc).some((n) => n.class_type === "MeliteFilmAudioMix"),
      "the cut film arms the mix desk (the film boundary)",
    ).toBe(true)
  })

  it("THE FILM-GRAPH EDGES: every composed graph wires clean against the FROZEN boot declarations", () => {
    // door.spec's declared-input sweep, ridden by the whole corpus:
    // every class the compose emits must live on the engine (the
    // frozen fixture) and every input it wires must be DECLARED —
    // a bare grown-slot key or an invented input reds here,
    // hermetically (the 2026-10-16 live burn's class).
    const fixture = JSON.parse(
      readFileSync(new URL("../../fixtures/object_info.boot.json", import.meta.url), "utf8"),
    ) as Record<string, unknown>
    const wiring = deriveWiringDoc(fixture)
    for (const [mi, member] of CORPUS.entries()) {
      const docA = compose(serializedDoc(member), `d1_wire_a_${mi}`)
      expect(
        () => assertWiringAgainst(wiring.nodes, wiring.inputs, "h3-timeline", docA),
        `${member.name}: the studio's serialized doc wired a stale graph`,
      ).not.toThrow()
      const docB = compose(walkDefaultsDoc(member), `d1_wire_b_${mi}`)
      expect(
        () => assertWiringAgainst(wiring.nodes, wiring.inputs, "h3-timeline", docB),
        `${member.name}: the walk's-own-defaults doc wired a stale graph`,
      ).not.toThrow()
    }
  })
})
