// The h3 family's EXTEND renderer seat (the h3-timeline card's
// extend arm — the retired extend-video wrapper flow's emission,
// report dev_docs/audits/features/
// extend-video-flow-2026-11-12.md §3; the multi-window unification
// + N-window assembly, dev_docs/audits/features/
// multiwindow-unification-2026-11-12.md): MORE SECONDS of coherent
// motion appended to a prior clip — a fresh continuation, never a
// re-edit of what the clip already shows.
//
// THE EXTEND LAW (four clauses):
//  1. THE ANCHOR IS THE PRIOR CLIP'S LAST FRAME, TAKEN IN-GRAPH:
//     ImageFromBatch(priorFrames, batch_index:
//     LAST_FRAME_BATCH_INDEX) — a POSITIVE out-of-band index the
//     engine clamps onto the final row (min(shape−1, index), core
//     comfy_extras/nodes_images.py), landing on the last frame
//     under every engine build. The 2026-11-19 burn (operator:
//     "Extend is completely broken, it never starts with the last
//     frame of the last video") killed the FIRST cut's
//     batch_index −1: on the live estate the node slices
//     t[batch_index : batch_index+length] with no negative
//     normalization, so −1 yields t[−1:0] — an EMPTY batch — and
//     the AddGuide census law ("batches shorter than 5 frames use
//     only the first image") anchors NOTHING: the forced seam and
//     the r2v pixel anchor both rode a hollow image, and every
//     extension opened free-composed (the poncho-burn class, back
//     from the dead). No frame-count probe, no out-of-graph
//     extraction: the prior clip is read ONCE by the VHS loader
//     (force_rate 24 — the film clock), and its tail frame rides
//     BOTH the plan's picture_1 seat and the r2v
//     ref_images.ref_image_0 seat (the pixel anchor law,
//     actions.ts: cross-run continuity is the anchor).
//     The whole clip also rides ref_videos.ref_video_0 — the
//     repair's own identity-anchor precedent.
//  2. FRESH GENERATION, NOT A REFINE: every window generates at FULL
//     denoise under an all-white SolidMask (mask_meaning
//     'white = generate' — engine core, comfy_extras/
//     nodes_mask.py). Nothing is held: extended seconds are NEW
//     content, so the edit-latent pass contributes no held pixels
//     and the sampler starts from pure noise. This is the opposite
//     pole of the repair (partial denoise over held pixels) — a
//     repair that wanted new seconds would be this door instead.
//  3. THE PLAN IS THE SEAT'S OWN, NEVER A SOURCE RE-SLICE (the
//     multi-window cure, design §3): H3OneClickSwapPlan SLICES its
//     source by clip_seconds (scene detection + cuts) and a
//     non-empty plan_json_input OVERRIDES the literal — wiring it
//     would re-render the PRIOR's own timeline, the opposite of an
//     extension. The seat's literal shots rule; the plan node
//     contributes only engine-owned geometry (width/height/run_name).
//  4. THE LATENT-CARRY LAW (operator, 2026-11-12): windows after
//     the first ride the chain's own context lineage — ONE plan, N
//     shots, the policy's masked_av context (39f) carrying each
//     seam, LoopEnd top_level_requeue + the estate driver owning
//     continuation, ChainAssemble owning the in-chain seams (the
//     blend/overlap machinery the swap's films ride). THE INITIAL
//     BOUNDARY IS THE EXCEPTION: a raw prior has no latents, so
//     that one seam takes the pixel anchor (clause 1) and the join
//     by file — in-chain seams assemble in-chain; raw boundaries
//     join by file.
//
// THE WINDOW COMPOSITION DOOR: stated seconds ≤ one window (362f)
// land on the 22+17k grid verbatim (the single-window law). Beyond
// it, the door composes N uniform grid-legal windows under the
// policy's 39f context overlap — delivered = N·w − (N−1)·39 — and
// REFUSES LOUD when no composition delivers the stated frames
// exactly, naming the neighboring compositions (the single-window
// grid door's own posture; never a silent snap-up). The caller
// re-states the composition's delivered seconds: D frames
// round-trips D/24 → D exactly.
//
// Everything else rides the shared spine (chainEdit.ts
// renderMaskedEditChain — the 2026-11-12 unification) and the
// file-join primitive (actions.ts chainSaveBoundaries +
// concatSavedFilms).
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import type { H3Facts } from './actions.js'
import { chainSaveBoundaries, concatSavedFilms, filmJoinAudio } from './actions.js'
import {
  assertGridLength, solveWindowComposition, CONTEXT_OVERLAP_FRAMES, GRID_MAX_FRAMES, LAST_FRAME_BATCH_INDEX, resolveCarryOverlap } from './timelineContract.js'
import { outputNameTailOf } from './schema.js'
export { solveWindowComposition, type WindowComposition } from './timelineContract.js'
// the last-frame spelling re-exported from its ONE home (timelineContract —
// actions.ts reads it there too; the public face keeps this name)
export { LAST_FRAME_BATCH_INDEX } from './timelineContract.js'
import { contexMaskedTarget, loadVideo, renderMaskedEditChain, resolvePlanTier, sheetRefSlots } from './chainEdit.js'

/** The tail-frame picker's index: the boot census's OWN max for
 * ImageFromBatch.batch_index (16384 today — the wall derives it from
 * tests/walls/fixtures/object_info.boot.json, never a frozen literal).
 * A positive out-of-band index rides the engine's upper clamp
 * (min(shape−1, index)) onto the clip's FINAL row under every build;
 * the negative spelling slices empty on the live estate (the
 * 2026-11-19 burn — clause 1 above) and is banned family-wide. */
/** The extend entry's required seats (the reshoot/repair idiom: an
 * armed doc with an empty seat refuses loud naming the seat). */
const REQUIRED_SEATS = [
  ['source_clip', 'the clip whose seconds are extended — ONE staged leaf: the VHS loader + the core LoadVideo read it by staged name, and the timeline reads it back off the native VIDEO wire'],
  ['extend_prompt', 'the continuation text — MOTION+SOUND for the appended seconds (the R2V prompt seat; agent-composed, user-confirmed)'],
] as const

/** Reads one optional number seat: absent falls to the documented
 * default; a stated non-number REFUSES — a defaulting fallback would
 * swallow a bypassed door's wrong-typed value as a silent error. */
const statedNumber = (p: Record<string, unknown>, k: string, d: number): number => {
  const v = p[k]
  if (v === undefined) return d
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(
      `h3-timeline extend: '${k}' is stated as ${JSON.stringify(v)} — a number seat carries a number (absent falls to ${d}); a wrong-typed value never silently defaults`,
    )
  }
  return v
}

/** Reads one required seat NARROWED by its own refusal — the seat
 * is a string or the door never composes (no fallback arm exists:
 * a validated seat re-read through a forgiving helper would be a
 * second, weaker validator below the law). */
const requiredSeat = (entry: Record<string, unknown>, seat: string, what: string): string => {
  const v = entry[seat]
  if (typeof v !== 'string' || v.trim() === '') {
    throw new Error(
      `h3-timeline extend: '${seat}' names no media — ${what}; an extend needs both seats bound (source_clip, extend_prompt)`,
    )
  }
  return v
}

/** The extend renderer: validates the bound entry, then composes the
 * fresh-continuation chain plus the join. Like the swap and repair,
 * the film path never reaches here (the card branches on a non-empty
 * extend bag and refuses a bag under an armed reshoot, replace, or
 * repair — one door per doc), and the emission ends in the
 * joined-film SaveVideo.
 * @param entry the extend mod's single bound entry
 * @param p the walked doc params (the lora mod bag + SLA/shift knobs
 * — the family plane this extension renders under)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the join prefixes ride it) */
export function renderH3Extend(
  entry: Record<string, unknown>,
  p: Record<string, unknown>,
  facts: H3Facts,
  g: GraphBuilder,
  runId: string,
): void {
  // NO FALLBACK READS: every required seat narrows through its own
  // refusal (a validated seat re-read through a forgiving helper is
  // a second, weaker validator below the law — a silent error). An
  // absent optional seat falls to its documented default; a STATED
  // seat of the wrong type refuses loud (the schema walk types every
  // lawful doc, so a wrong-typed value means a bypassed door).
  const sourceClipSeat = requiredSeat(entry, 'source_clip', REQUIRED_SEATS[0][1])
  const extendPromptSeat = requiredSeat(entry, 'extend_prompt', REQUIRED_SEATS[1][1])
  const seed = statedNumber(entry, 'seed', 0)
  const steps = statedNumber(entry, 'steps', 6)
  const overlapFrames = resolveCarryOverlap(entry)
  const resolution = resolvePlanTier(entry, p)
  const statedFrames = Math.round(statedNumber(entry, 'extend_seconds', 56 / 24) * 24)
  // THE COMPOSITION DOOR: one window keeps the landed grid law
  // verbatim; beyond it the solver composes N uniform windows and
  // refuses every non-exact landing by name. The solver ALWAYS
  // carries the policy's 39f overlap (every law-home pins 39 —
  // SKILL.md, the registry row, CONTEXT_OVERLAP_FRAMES, the refusal
  // text); the entry knob never rides seam math. A multi-window
  // extend under a knob ≠ 39 would compose exact-DELIVERY numbers
  // the chain then stitches at a different carry — the exactness
  // guarantee breaks silently — so it refuses loud instead (the
  // dsh-docs audit's MED-1).
  const composition = statedFrames <= GRID_MAX_FRAMES
    ? { windows: 1, windowFrames: assertGridLength(statedFrames, 'h3-timeline extend'), deliveredFrames: statedFrames }
    : solveWindowComposition(statedFrames, 'h3-timeline extend')
  if (composition.windows > 1 && overlapFrames !== CONTEXT_OVERLAP_FRAMES) {
    throw new Error(
      `h3-timeline extend: overlap_frames ${overlapFrames} — the multi-window composition law carries the policy's ${CONTEXT_OVERLAP_FRAMES}f context overlap (every law-home pins 39; the knob feeds only the single-window plan head); re-state overlap_frames 39`,
    )
  }
  const clipSeconds = composition.windowFrames / 24

  // ── the staged media: the WHOLE prior clip on the VHS seat
  // (force_rate 24 — the one clock) and its LAST FRAME as the
  // in-graph anchor (a positive out-of-band index the engine clamps
  // to the final row — see LAST_FRAME_BATCH_INDEX) ──
  const [priorFrames, priorAudio] = loadVideo(g, sourceClipSeat)
  const lastFrame = g.node('ImageFromBatch', {
    image: priorFrames, batch_index: LAST_FRAME_BATCH_INDEX, length: 1,
  }).out(0)

  // ── THE SEAT'S OWN PLAN (clause 3): N continuation shots — the
  // literal rules, plan_json_input stays UNWIRED (the plan node's
  // source slicing is the swap's semantics, never a continuation's;
  // the cure for the re-slice bug the unification's survey found) ──
  const shots = Array.from({ length: composition.windows }, (_k, i): { id: string; prompt: string } => ({
    id: `extend-${i + 1}`, prompt: extendPromptSeat,
  }))
  const planJson = JSON.stringify({ shots })

  const { trimmed, assemblePath, planShape } = renderMaskedEditChain(g, {
    p, facts,
    clipSeconds,
    overlapFrames,
    resolution, seed, steps,
    roles: '',
    sourceClip: sourceClipSeat,
    windowStart: 0,
    picture1: lastFrame,
    srcFrames: priorFrames,
    srcAudio: priorAudio,
    planJson,
    planFromSource: false,
    denoise: 1,
    // THE LATENT-CARRY TERMINAL (clause 4): N ≥ 2 windows assemble
    // IN-CHAIN — ChainAssemble owns the seams under the policy's
    // overlap (fresh content's soundtrack assembles from the
    // checkpointed H3 sound); one window joins by file directly.
    assemble: composition.windows >= 2
      ? { audioSource: 'generated', filename: `${runId}/extend_chain` }
      : null,
    body: ({ cur, clip, vaeVideo, vaeAudio, mutedChainAudio, sliceAudio, refImages }) => {
      // The everywhere-generate mask: an all-white SolidMask sized
      // to the chain's own geometry (nothing held — extended
      // seconds are new content). `.out(0)`: a mask SEAT takes an
      // output LINK `[key, slot]` — a bare node handle serializes
      // `{"id": ...}` and the engine dies at reshape (the F10 burn,
      // 2026-11-12; repair.ts's GrowMaskWithBlur is the pattern).
      const whiteMask = g.node('SolidMask', {
        value: 1, width: cur.out(8), height: cur.out(9),
      }).out(0)
      // ── the fresh-continuation body: the anchor rides BOTH
      // reference seats — the last frame as the pixel anchor
      // (ref_image_0) and the whole clip as the motion identity
      // (ref_video_0), the swap/repair spine's own seats ──
      const r2v = g.node('MiniMaxH3ReferenceToVideo', {
        prompt: extendPromptSeat,
        width: cur.out(8), height: cur.out(9), length: cur.out(6),
        ref_image_size: 'match',
        clip, vae: vaeVideo, audio_vae: vaeAudio,
        'ref_images.ref_image_0': lastFrame,
        'ref_videos.ref_video_0': priorFrames,
        'ref_video_audios.ref_video_audio_0': mutedChainAudio,
        // THE SHEET (P0-1): the pixel anchor owns slot 0 — the
        // declared sheet follows (the seam pin below is untouched:
        // it rides the conditioning AFTER the r2v, not this slot).
        ...sheetRefSlots(refImages, 1),
      })
      const slice = g.node('H3SourceSlice', {
        source_fps: 24, crop: 'center',
        state: cur.out(0), latent: r2v.out(1),
        audio_vae: vaeAudio, source_frames: priorFrames, source_audio: sliceAudio,
      })
      const target = contexMaskedTarget(g, { vaeVideo, vaeAudio }, {
        frames: slice.out(0), audio: slice.out(1), mask: whiteMask, keepAudio: false,
      })
      // ── THE FORCED SEAM (operator's cure, 2026-11-19): the r2v
      // ref_image ride above is a SOFT prior — the model is free to
      // introduce new content in the appended clip's FIRST frame, and
      // the poncho burn did exactly that (a second figure at full
      // size on the first extended frame: a hard pop, no entry). Pin
      // the source's LAST frame at frame_idx 0 through the same
      // H3-native guide lane the reshoot pins its warp with
      // (MiniMaxH3AddGuide, one frame → guide_frames 1): the first
      // appended frame is then FORCED to be the clip's last frame,
      // so anything new must develop from it frame by frame instead
      // of appearing whole.
      const guided = g.node('MiniMaxH3AddGuide', {
        positive: r2v.out(0),
        vae: vaeVideo,
        latent: target,
        image: lastFrame,
        frame_idx: 0,
      }).out(0)
      return { conditioning: guided, targetLatent: target }
    },
  })

  // ── THE SHAPE-TRUE JOIN (the F34 cure, 2026-11-13; qa8
  // run-89976b95026b-8f22c399): the raw prior joins the chain's
  // output at the CHAIN PLAN'S OWN SHOT GEOMETRY — the plan node
  // derives the canvas from the SOURCE'S OWN FRAMES (its aspect)
  // under the stated tier, so an extension whose tier short edge
  // differs from the prior's own (the burn: a 1344×768 source under
  // the default 736p tier rendered the extension at 1280×736 and the
  // engine's concat refused `Expected size 768 but got size 736`)
  // aligns HERE instead of crashing mid-render. The canvas is read
  // off the plan's own width/height outputs — never assumed from a
  // declared width/height row — and nearest-exact keeps the align
  // pixel-verbatim when the plan canvas already equals the source's
  // own (the extension never rewrites history). ──
  const alignedPrior = g.node('ImageScale', {
    image: priorFrames,
    width: planShape.width,
    height: planShape.height,
    upscale_method: 'nearest-exact',
    crop: 'disabled',
  }).out(0)

  // ── THE JOIN (the file-join primitive; the initial raw boundary
  // is the exception the latent carry cannot cross — clause 4) ──
  if (assemblePath !== null) {
    // MULTI-WINDOW: the prior re-muxes at x0 (the join grammar needs
    // an output-dir file; the prior's frames + its own soundtrack
    // ride verbatim — the extension never rewrites history); the
    // ASSEMBLED extension rides the concat's append seat — an exact
    // saved-file path (ChainAssemble's video_path output, wired:
    // the DAG itself proves the assembly completed before the join).
    const priorCreated = g.node('CreateVideo', {
      images: alignedPrior, audio: filmJoinAudio(g, priorAudio), fps: 24, bit_depth: 8,
    })
    const priorSaved = g.node('SaveVideo', {
      video: priorCreated.out(), filename_prefix: `${runId}/x0`,
      format: 'mp4', codec: 'h264',
    }).out()
    const after = chainSaveBoundaries(g, [priorSaved])
    // THE OUTPUT-NAME FILE TAIL (2026-11-19): the delivered extend
    // film is BORN named (`extend_film_<slug>`) — x0/x1 parts stay
    // machinery prefixes (chain intermediates).
    concatSavedFilms(g, [`${runId}/x0`], after, `${runId}/extend_film${outputNameTailOf(p)}`, {
      append: assemblePath,
    })
    return
  }
  // SINGLE-WINDOW (the landed shape): both parts save at prefixes,
  // the boundary chain orders them, the concat joins, the container
  // delivers <runId>/extend_film.
  const newCreated = g.node('CreateVideo', {
    images: trimmed.out(0), audio: filmJoinAudio(g, trimmed.out(1)), fps: 24, bit_depth: 8,
  })
  const newSaved = g.node('SaveVideo', {
    video: newCreated.out(), filename_prefix: `${runId}/x1`,
    format: 'mp4', codec: 'h264',
  }).out()
  const priorCreated = g.node('CreateVideo', {
    images: alignedPrior, audio: filmJoinAudio(g, priorAudio), fps: 24, bit_depth: 8,
  })
  const priorSaved = g.node('SaveVideo', {
    video: priorCreated.out(), filename_prefix: `${runId}/x0`,
    format: 'mp4', codec: 'h264',
  }).out()
  const after = chainSaveBoundaries(g, [newSaved, priorSaved])
  concatSavedFilms(g, [`${runId}/x0`, `${runId}/x1`], after, `${runId}/extend_film${outputNameTailOf(p)}`)
}
