// The h3 family's REFINE renderer seat (the refine arm — a
// standalone second pass over a staged source clip): the report-named
// H3 latent-upscale refine chain's minimal emission. The full
// second-pass stack exists engine-side with no card surface — the
// RefineHandoff node (MinimaxH3LatentUpscaler3DRefineHandoff: learned
// 3D-conv latent upscale + the low-sigma MiniMax H3 refinement pass
// in ONE node, sampler/sigmas seats) — and this seat is its one
// door. The deferred ChainUpscale LOOP family
// (MiniMaxH3ChainUpscaleAdapter/Current/Handoff/LoopEnd over a
// CheckpointManager-verified lineage, recursive expand) is the named
// follow-up, not this arm: the loop roots at a prior run's manifest
// and the estate's requeue driver only drives h3_chain rows, so a
// from-scratch clip cannot enter it without new estate surface.
//
// THE REFINE LAW (four clauses):
//  1. ONE VARIANT PATH: scale 2.0 under mode 'scale by multiplier'
//     (the film handoff's own spelling, actions.ts), lock_audio true
//     (the repair's posture — the soundtrack is the source's own,
//     always), bf16 on cuda (the film's own precision/device).
//     Width/height/megapixels/keep_proportion ride the upscaler's own
//     defaults (1280×704, multiplier mode ignores them — the film's
//     own note at its handoff mount).
//  2. PARTIAL DENOISE ONLY: the scheduler's denoise carries the
//     entry's denoise (default 0.32; the researched 0.30–0.35
//     refinement window, the repair's own default), and a denoise >=
//     1 refuses LOUD at this door — the same sigmas law that guards
//     the film's handoff (vendored minimax_h3_refine.py
//     run_h3_refinement: 0 <= sigmas[0] < 1 STRICT; a full-noise
//     sigma discards the learned upscaled latent and the node
//     throws). A full-denoise re-render is a reshoot, and the
//     reshoot door exists.
//  3. THE FAMILY PLANE, NEVER A HAND-ROLLED STACK: the handoff's
//     model seat rides h3MaskedEditPlane (the shared masked-edit
//     plane — UNET + SLA + chunked + the lora bag + AdaLN + sigma
//     shift, the operator's lora law), the sampler rides the plane's
//     euler select, the schedule rides the doc's own sched_name. The
//     entry carries only the refine seats (source_clip,
//     refine_prompt, denoise, steps, seed, clip_seconds,
//     start_seconds, mode, scale) — everything model-shaped stays
//     family-owned.
//  4. A WINDOW, NEVER THE WHOLE CLIP (F24, 2026-10-30): the loader
//     reads clip_seconds from start_seconds (frame_load_cap =
//     round(clip_seconds × 24), skip_first_frames =
//     round(start_seconds × 24)), and VHS trims the soundtrack by the
//     same window. The measured 2x ceiling on the operator's box is
//     90 f green / 141 f OOM, so a 2x multiplier window past the
//     measured OOM point refuses at this door by name; a longer film
//     is covered window by window, and a same-size (scale 1) pass
//     sizes its own.
//
// THE CONTEXT CARRY IS THE FILM'S OWN (round 27, operator order:
// "ZERO DIFFERENCE BETWEEN THE CONTEXT CARRY FROM THE NORMAL GENS AND
// THE REFINE GENS. THERE IS NO REASON IT SHOULD BE DIFFERENT"). A
// staged clip's own latent is gone at encode time, but a MULTI-WINDOW
// refine rebuilds a joint AV latent per window from the staged frames
// + soundtrack (the estate's one source→nested-AV constructor) and
// carries it across every join with `MiniMaxH3FiniteLatentContinuation`
// — the film's exact node, seats and trim
// (renderH3RefineCarry above). Never name a press here "the second
// pass".
//
// The emission is a single graph (no loop, no requeue — one
// top-level prompt): VHS source → the joint AV target (SolidMask →
// FantasticVideoEditLatent → ContexMaskedTarget) →
// [MiniMaxH3FiniteLatentContinuation per carried join] → handoff →
// decode → [the film's finalize head-trim] → the film tail's file law
// (CreateVideo + SaveVideo at <runId>/refine, then the concat for a
// multi-window film).
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import type { OutputHandle } from '@melite/comfyui-card-kit/graph'
import type { H3Facts } from './actions.js'
import { chainSaveBoundaries, concatSavedFilms, filmJoinAudio } from './actions.js'
import { h3MaskedEditPlane, loadVideo } from './chainEdit.js'
import { DOC_FPS_DEFAULT, MAX_COMPOSED_WINDOWS, SEAM_OVERLAP_FRAMES } from './timelineContract.js'

/** The learned 3D-conv upscale weights (the schema's upscale_model
 *  seat carries this same single option — one file, one spelling, no
 *  hand-spelled alternatives). */
export const REFINE_UPSCALE_MODEL = 'minimax_h3_latent_upscaler_3d_bf16.safetensors'

/** The 2x pass's measured memory ceiling, in frames at the film clock
 *  (24 fps). The friction report's §12.2/§13.2 sweep on the operator's
 *  box: 56 f and 90 f pass at 2x (2688×1536, 48 kHz); 141 f OOMs,
 *  needing 1.06 GiB more with 20.13 GiB already resident. H3's memory
 *  grows monotonically with the window, so a window past the measured
 *  OOM point cannot fit at this variant — the door refuses it by name
 *  instead of burning a render to find out. */
export const REFINE_2X_OOM_FRAMES = 141

/** The refine window's default length in seconds — 90 f at 24 fps, the
 *  widest window the sweep measured GREEN at 2x. A default that OOMs is
 *  the F24 burn: the arm used to load the WHOLE staged clip, so any
 *  film longer than ~4 s died at this variant. */
export const REFINE_DEFAULT_CLIP_SECONDS = 3.75

/** The refine auto-tile's default carried overlap, in frames at the
 *  film clock — the film's own seam (SEAM_OVERLAP_FRAMES), which is
 *  also token-exact (5, 22, 39 …), so the default auto-tile takes the
 *  carry face: the windows chain through the film's own latent
 *  continuation across every join. Imported, never hand-typed
 *  (refine-window audit D1: the card must never carry a hand-typed
 *  copy of a measured constant — and the overlap that matches the
 *  generation seam grid is the family contract's own number). */
export const REFINE_DEFAULT_OVERLAP_FRAMES = SEAM_OVERLAP_FRAMES

/** The refine entry's required seats (the reshoot idiom: an armed
 *  doc with an empty seat refuses loud naming the seat). */
const REQUIRED_SEATS = [
  ['source_clip', 'the clip whose frames the second pass refines — ONE staged leaf: the VHS loader reads it by staged name at the film clock, and the encode seats read its frames + soundtrack'],
  ['refine_prompt', 'the refine text — what the upscaled frames should hold (agent-composed, user-confirmed; rides the CLIPTextEncode positive seat — the node refuses without model + positive)'],
] as const

const num = (e: Record<string, unknown>, key: string, d: number): number =>
  typeof e[key] === 'number' ? (e[key] as number) : d

/** The arm predicate: BAG PRESENCE — the same law as the
 *  replace/repair/extend/reshoot arms (a commission is armed when
 *  its bag is a NON-EMPTY ARRAY). Absent or empty bag = the compose
 *  never sees the chain (byte-stable graphs).
 * @param p the gated compose doc
 * @returns true when the refine bag carries at least one entry */
export function refineArmed(p: Record<string, unknown>): boolean {
  const bag = p.refine
  return Array.isArray(bag) && bag.length > 0
}

/** ONE refine window's loader + save seats (the loop's coordinate).
 *  Frames at the film clock (24 fps) — the loader's own units. */
export interface RefineWindowSeat {
  /** the window's frame cap (the loader's `frame_load_cap`) */
  cap: number
  /** the window's first frame (the loader's `skip_first_frames`) */
  skip: number
  /** frames trimmed off this window's OWN head (k≥2 carries the
   *  previous window's tail; 0 = the first window, no carry) */
  overlapFrames: number
  /** this window's SaveVideo prefix (the run tree's own spelling) */
  prefix: string
}

/** THE FAMILY PLANE, the five seats every refine window rides: the
 *  film's own masked-edit plane (one unet stack with the lora bag,
 *  one clip, the two VAEs). The carry face composes it ONCE for the
 *  whole film; a standalone window builds its own. */
export interface RefinePlane {
  readonly sigmaModel: OutputHandle
  readonly samplerSel: OutputHandle
  readonly clip: OutputHandle
  readonly vaeVideo: OutputHandle
  readonly vaeAudio: OutputHandle
}

/** One entry's dials, read with the arm's own defaults — ONE owner
 *  for the single-window arm, the bag walk and the carry face.
 * @param entry the refine entry
 * @returns the dial set its window renders under (denoise refuses at
 *  or above 1: a second pass is a refine, never a re-render) */
const refineDials = (entry: Record<string, unknown>): {
  denoise: number; seed: number; steps: number; upMode: string; upScale: number
} => {
  const denoise = num(entry, 'denoise', 0.32)
  if (denoise >= 1) {
    throw new Error(
      `h3-timeline refine: denoise ${denoise} >= 1 — a second pass is a refine, never a re-render (the partial-denoise window is 0.05–0.50; a full-noise sigma discards the learned upscaled latent and the vendored node throws — that is a reshoot, and the reshoot door exists)`,
    )
  }
  return {
    denoise,
    seed: num(entry, 'seed', 0),
    steps: num(entry, 'steps', 6),
    upMode: (entry['mode'] as string | undefined) ?? 'scale by multiplier',
    upScale: (entry['scale'] as number | undefined) ?? 2.0,
  }
}

/** An entry's two media seats, bound or the door refuses loud naming
 *  the seat (the reshoot idiom: an armed doc never rides an empty seat).
 * @param entry the refine entry */
const requireRefineEntry = (entry: Record<string, unknown>): void => {
  for (const [seat, what] of REQUIRED_SEATS) {
    const v = entry[seat]
    if (typeof v !== 'string' || v.trim() === '') {
      throw new Error(
        `h3-timeline refine: '${seat}' names no media — ${what}; a refine needs both seats bound (source_clip, refine_prompt)`,
      )
    }
  }
}

/** THE WINDOW CEILING (refine-window audit C1, 2026-11-13): the
 *  measured OOM is a function of the WINDOW first and the upscale
 *  factor second — H3's memory grows with the frame count through the
 *  learned 3D upscaler and the sampler. Only a same-size multiplier
 *  pass (< 2, the capacity cure) is exempt: its upscaler is the
 *  identity, which is what made 144 f fit at 1x. The other two modes
 *  size from the source, so they take the ceiling.
 * @param cap the window's frame count
 * @param dials the entry's sizing seats (mode + scale) */
const judgeRefineWindow = (cap: number, dials: { upMode: string; upScale: number }): void => {
  const sameSize = dials.upMode === 'scale by multiplier' && dials.upScale < 2
  if (!sameSize && cap > REFINE_2X_OOM_FRAMES) {
    const named = dials.upMode === 'scale by multiplier' ? `${dials.upScale}x` : dials.upMode
    throw new Error(
      `h3-timeline refine: a ${cap} f window at ${named} — the 2x pass was measured OOM at ${REFINE_2X_OOM_FRAMES} f and green at ${REFINE_DEFAULT_CLIP_SECONDS * 24} f (2688×1536, 48 kHz; H3 memory grows with the window, so a wider window cannot fit — the ceiling belongs to the WINDOW, whichever sizing mode upsizes). Cut clip_seconds to ${(REFINE_2X_OOM_FRAMES / 24).toFixed(2)} s or less and cover the rest window by window, or lower scale to 1 for a same-size pass`,
    )
  }
}

/** THE JOINT AV TARGET — the estate's one source→nested-AV
 *  constructor, the same three nodes the extend/repair/swap spine
 *  rides (the all-white SolidMask → MiniMaxH3FantasticVideoEditLatent
 *  → MiniMaxH3ContexMaskedTarget). White means "every frame is
 *  editable" (nothing is held; a refine re-renders the window at its
 *  own denoise) and `keep_audio` carries the window's soundtrack into
 *  the joint latent, so the audio stream every downstream node reads
 *  is the source's own. The mask's size comes from the loader's
 *  frames (GetImageSizeAndCount), never from a hand-typed resolution.
 * @param g the run's graph builder
 * @param plane the plane's two VAE seats
 * @param frames the window's loaded frames
 * @param audio the window's loaded soundtrack
 * @returns the nested video+audio target latent the handoff refines */
const refineJointTarget = (
  g: GraphBuilder,
  plane: Pick<RefinePlane, 'vaeVideo' | 'vaeAudio'>,
  frames: OutputHandle,
  audio: OutputHandle,
): OutputHandle => {
  const size = g.node('GetImageSizeAndCount', { image: frames })
  const whiteMask = g.node('SolidMask', {
    value: 1, width: size.out(1), height: size.out(2),
  }).out(0)
  const edit = g.node('MiniMaxH3FantasticVideoEditLatent', {
    grow: 0, keep_audio: true, megapixels: 0,
    vae: plane.vaeVideo, images: frames, mask: whiteMask,
    audio_vae: plane.vaeAudio, audio,
  }).out(0)
  return g.node('MiniMaxH3ContexMaskedTarget', {
    mask_meaning: 'white = generate',
    audio_mode: 'preserve source audio',
    mask_conversion: 'H3 exact (causal/token max)',
    target_latent: edit, mask: whiteMask,
  }).out(0)
}

/** THE WINDOW BODY — one refine window, whichever door composed it:
 *  joint AV target → (carry) → the 2x handoff → decode → (head-trim).
 *  THE CARRY IS THE FILM'S OWN NODE, with the film's own seats
 *  (iteration, overlap_frames, continue_audio_latent true, the
 *  model + sigmas the sampler will ride, previous_latent = the
 *  previous window's joint latent): the carried tail is copied into
 *  this window's head, the zero-prefix mask pins it (gradient false),
 *  the audio prefix takes the same Soft AV half-cosine release, and
 *  the returned model is the drift-controlled one the handoff samples
 *  with — one mechanism for normal gens and refine gens.
 *
 *  WHAT rides as `previous_latent` (settled round 27): the previous
 *  window's JOINT TARGET — the latent its handoff refined. A refine
 *  has no base-rate sample (its only sample IS the 2x handoff's), and
 *  the joint-AV upscaler the handoff wraps takes a base-rate latent,
 *  so the film's own 2x-arm law applies: carry the base grid and let
 *  each window's upscale re-derive the high grid (actions.ts's F44
 *  seam currency — `seamLatent = upscaleOn ? sampled.out(0)` — is the
 *  symmetry owner). The head-trim then drops the carried duplicate,
 *  exactly as the film's windows do, and the tail is the plain file
 *  concat — no alpha blend anywhere on either path.
 * @param g the run's graph builder
 * @param entry the window's entry (prompt + dials)
 * @param p the walked doc params (the scheduler name)
 * @param plane the family plane (shared by a carry film)
 * @param seat the window's loader seats + carried head + save prefix
 * @param iteration the window's index in its emission (the
 *  continuation's own `iteration` seat; only read when carrying)
 * @param previousLatent the previous window's joint target — present
 *  exactly when this window carries
 * @returns the window's SaveVideo passthrough plus the joint target
 *  the NEXT window carries */
const composeRefineWindow = (
  g: GraphBuilder,
  entry: Record<string, unknown>,
  p: Record<string, unknown>,
  plane: RefinePlane,
  seat: RefineWindowSeat,
  iteration: number,
  previousLatent?: OutputHandle,
): { save: OutputHandle; target: OutputHandle } => {
  const dials = refineDials(entry)
  requireRefineEntry(entry)
  judgeRefineWindow(seat.cap, dials)
  const [srcFrames, srcAudio] = loadVideo(
    g, entry['source_clip'] as string, seat.cap, seat.skip,
  )
  const target = refineJointTarget(g, plane, srcFrames, srcAudio)
  const positive = g.node('CLIPTextEncode', {
    text: entry['refine_prompt'] as string, clip: plane.clip,
  }).out(0)
  const noise = g.node('RandomNoise', { noise_seed: dials.seed }).out(0)
  const sched = g.node('BasicScheduler', {
    model: plane.sigmaModel, scheduler: p.sched_name as string,
    steps: dials.steps, denoise: dials.denoise,
  }).out(0)
  let cond = positive
  let mdl = plane.sigmaModel
  let lat = target
  if (previousLatent !== undefined) {
    /* v8 ignore next 5 -- unreachable by construction: every caller passes previousLatent exactly for k ≥ 1, where overlapFrames = carries[k−1], and the tokenExactCarry door (≥ 5) has already refused every smaller carry; the guard stays as the window body's own contract against a future wiring slip */
    if (seat.overlapFrames <= 0) {
      throw new Error(
        `h3-timeline refine: window ${iteration} arrived with a previous latent but no carried head — a carry without frames to carry is a wiring bug, not a doc to fix`,
      )
    }
    const cont = g.node('MiniMaxH3FiniteLatentContinuation', {
      positive: cond, target_latent: lat, iteration,
      overlap_frames: seat.overlapFrames, continue_audio_latent: true,
      model: mdl, sigmas: sched, previous_latent: previousLatent,
    })
    cond = cont.out(0)
    lat = cont.out(1)
    mdl = cont.out(3)
  }
  const upscaled = g.node('MinimaxH3LatentUpscaler3DRefineHandoff', {
    latent: lat, noise, sampler: plane.samplerSel, sigmas: sched,
    model: mdl, positive: cond,
    model_name: REFINE_UPSCALE_MODEL,
    mode: dials.upMode, scale: dials.upScale,
    width: 1280, height: 704, megapixels: 1,
    keep_proportion: true, align: 32,
    lock_audio: true, cfg: 1.0, device: 'cuda', precision: 'bf16',
    offload_after_upscale: false,
  }).out(0)
  let vdec = g.node('VAEDecode', { samples: upscaled, vae: plane.vaeVideo }).out(0)
  let adec = g.node('VAEDecodeAudio', { samples: upscaled, vae: plane.vaeAudio }).out(0)
  if (seat.overlapFrames > 0) {
    // THE CARRIED HEAD: the film's own finalize node, the film's own
    // seats (iteration 1, the carried span, audio trimmed with the
    // picture) — the seam is never replayed and never blended.
    const fin = g.node('MiniMaxH3FiniteSegmentFinalize', {
      sampled_latent: upscaled, images: vdec, audio: adec,
      iteration: 1, overlap_frames: seat.overlapFrames, trim_audio_head: true,
    })
    vdec = fin.out(1)
    adec = fin.out(2)
  }
  const created = g.node('CreateVideo', {
    images: vdec, audio: filmJoinAudio(g, adec), fps: 24, bit_depth: 8,
  })
  return {
    save: g.node('SaveVideo', {
      video: created.out(), filename_prefix: seat.prefix,
      format: 'mp4', codec: 'h264',
    }).out(0),
    target,
  }
}

/** THE WINDOW RENDERER (F24's loop seat, 2026-11-13): one standalone
 *  refine window — its own family plane, no predecessor, no carry.
 *  The bag's N≥2 walk composes the SAME body per entry; the loop's
 *  zero-carry walk composes it with the head-trim alone (independent
 *  windows: a hard cut, never a blend).
 * @param entry the refine entry (seats + dials, unchanged)
 * @param p the walked doc params (the family plane this window rides)
 * @param facts the family's lane facts
 * @param g the run's graph builder
 * @param seat the window's loader seats, carried head, and save prefix
 * @returns the window's SaveVideo passthrough (the loop's ordering wire)
 */
export function renderH3RefineWindow(
  entry: Record<string, unknown>,
  p: Record<string, unknown>,
  facts: H3Facts,
  g: GraphBuilder,
  seat: RefineWindowSeat,
): OutputHandle {
  if (!Number.isInteger(seat.cap) || seat.cap < 1) {
    throw new Error(
      `h3-timeline refine: a ${seat.cap} f window — a refine window needs frames (the loop's cap is the loader's frame_load_cap at 24 fps; the safe default is ${REFINE_DEFAULT_CLIP_SECONDS} s = 90 f)`,
    )
  }
  if (!Number.isInteger(seat.skip) || seat.skip < 0) {
    throw new Error(
      `h3-timeline refine: a window starting at frame ${seat.skip} — a window starts at or after the clip's first frame (the loop's skip is the loader's skip_first_frames)`,
    )
  }
  const plane = h3MaskedEditPlane(g, p, facts, seat.cap / 24)
  return composeRefineWindow(g, entry, p, plane, seat, 0).save
}

/** ONE entry's window ORIGIN seats (the loader's coordinates, derived
 *  from the seconds the entry states — the film clock, 24 fps). One
 *  owner for the single-window arm and the bag carrier, so both doors
 *  judge a stated length/start identically.
 * @param entry the refine entry (clip_seconds, start_seconds)
 * @returns the window's frame cap and first frame */
function refineWindowOrigin(entry: Record<string, unknown>): { cap: number; skip: number } {
  const clipSeconds = num(entry, 'clip_seconds', REFINE_DEFAULT_CLIP_SECONDS)
  const startSeconds = num(entry, 'start_seconds', 0)
  if (!(clipSeconds > 0)) {
    throw new Error(
      `h3-timeline refine: clip_seconds ${clipSeconds} — a refine window needs frames (the seat is the loader's frame_load_cap: seconds × 24 at the film clock; the safe default is ${REFINE_DEFAULT_CLIP_SECONDS} s = 90 f)`,
    )
  }
  if (!(startSeconds >= 0)) {
    throw new Error(
      `h3-timeline refine: start_seconds ${startSeconds} — a window starts at or after the clip's first frame (the seat is the loader's skip_first_frames); advance it window by window to cover a long film`,
    )
  }
  return { cap: Math.max(1, Math.round(clipSeconds * 24)), skip: Math.round(startSeconds * 24) }
}

/** The refine renderer: validates the bound entry, then composes
 *  the standalone single-window second pass. Like the swap, the film
 *  path never reaches here (the card branches on a non-empty refine
 *  bag, and a bag under an armed reshoot — or beside any edit arm —
 *  refuses loud: one door per doc), and the emission ends in
 *  SaveVideo (the extend terminal's own file law — no
 *  ChainAssemble: a refine has no loop lineage to assemble).
 * @param entry the refine mod's single bound entry
 * @param p the walked doc params (the lora mod bag + scheduler knobs
 * — the family plane this refine renders under)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the refine filename rides it)
 * @returns the window's SaveVideo passthrough (the bag carrier's
 * N=1 delegate returns the same handle; statement callers ignore it) */
export function renderH3Refine(
  entry: Record<string, unknown>,
  p: Record<string, unknown>,
  facts: H3Facts,
  g: GraphBuilder,
  runId: string,
): OutputHandle {
  const { cap, skip } = refineWindowOrigin(entry)
  return renderH3RefineWindow(entry, p, facts, g, {
    cap,
    skip,
    overlapFrames: 0,
    prefix: `${runId}/refine`,
  })
}

/** THE BAG CARRIER (GAPS-19, 2026-11-01 plan): N stated entries ARE N
 *  windows of ONE film — the film tail's own tiling, entry-driven.
 *  N=1 delegates to the single-window arm byte-identically (no
 *  boundary, no concat — the sequential-press law: press, judge,
 *  press stays lawful and byte-cheap). N≥2 composes one
 *  `renderH3RefineWindow` body per entry, ordered by the film's
 *  unload boundary chain (`chainSaveBoundaries`) and assembled
 *  IN-GRAPH by the file join (`concatSavedFilms`) at
 *  `<runId>/refine` — the F24 loop's own tail, now entry-driven
 *  instead of count-driven. No new engine surface, no harness media,
 *  no ffmpeg.
 *
 *  THE BAG LAWS (admission-enforced continuity, the film path's own
 *  property restated for entries — all refusals at compose, zero GPU):
 *  1. ONE FILM PER BAG — every entry's source_clip names the SAME
 *     staged leaf; the tiling joins windows of one timeline, so a
 *     two-source join refuses loud (a second source is a second card).
 *  2. NO GAPS, NO FULL OVERLAP — in stated order, entry k≥1 satisfies
 *     `0 ≤ prevSkip + prevCap − skip < prevCap`: consecutive windows
 *     overlap (the walk's own minus-a-second-or-two law) but never
 *     leave a hole (a gap silently drops source seconds) and never
 *     start at or before the previous window (out of order — the
 *     compose never silently sorts).
 *  3. THE CEILING — more than MAX_COMPOSED_WINDOWS entries refuses
 *     (the extend solver's own window ceiling).
 *  Per-entry seats stay per-entry: each entry carries its own
 *  refine_prompt (required — no doc-level fallback) and may pin its
 *  own denoise/steps/seed/clip_seconds/start_seconds/mode/scale;
 *  renderH3RefineWindow's existing per-window validation (REQUIRED_
 *  SEATS, denoise < 1, the 141 f ceiling) judges each window unchanged.
 *
 *  THE CARRY IS THE FILM'S OWN SEAM NODE (round 27, operator order:
 *  "ZERO DIFFERENCE BETWEEN THE CONTEXT CARRY FROM THE NORMAL GENS
 *  AND THE REFINE GENS"): a carried bag mounts
 *  MiniMaxH3FiniteLatentContinuation on every join with the film's
 *  seats, and each window's joint AV target is built by the estate's
 *  one source→nested-AV constructor (SolidMask →
 *  FantasticVideoEditLatent → ContexMaskedTarget, the
 *  extend/repair/swap spine) — never a refine-only carry, never an
 *  alpha blend. The carried head is trimmed by the film's finalize
 *  node and the tail is the plain file concat, the film's own join.
 *
 * @param bag the refine mod's bound entries, stated film order
 * @param p the walked doc params (the family plane every window rides)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (window + film prefixes ride it)
 * @returns the terminal SaveVideo passthrough — the assembled film
 * at `<runId>/refine` (N=1: the single window's own save) */
/** THE CARRY STAND-DOWN (F3-14, operator burn 2026-11-05 — two
 *  presses, both died the same way): the engine path that would carry
 *  a refine film's own continuation between windows is DEAD — window
 *  0 renders and bills, then window 1 dies at its handoff with
 *  `ValueError: Drift-Control AV packed mask does not match its audio
 *  stream` (the Drift-Control mask state splits the packed mask by
 *  the install-time stream shapes, drift_control_av.py:159, and a
 *  continuation-carried latent's audio prefix no longer lands; the
 *  node is MinimaxH3LatentUpscaler3DRefineHandoff). The door refuses
 *  the carried shape instead of billing a partial; the hard cut
 *  (overlap_frames 0, or abutting starts) is the lawful press today.
 *  The engine cure is owed (ROADMAP F3-14): seed the mask state from
 *  the sampling latent, or strip the foreign denoise-mask patch in
 *  the handoff. Removing this refusal IS the toggle that re-arms the
 *  carry walk.
 * @param what the carried shape the press stated, in frames
 * @returns the refusal sentence (the caller throws it) */
function refineCarryStanddown(what: string): string {
  return `h3-timeline refine: ${what} would carry the film's own continuation between windows — and that carry is DEAD in the engine today (F3-14, operator burn 2026-11-05): the carried window dies at its handoff with "ValueError: Drift-Control AV packed mask does not match its audio stream" (the Drift-Control mask state splits the packed mask by the install-time stream shapes, drift_control_av.py:159, and a continuation-carried latent's audio prefix no longer lands; the node is MinimaxH3LatentUpscaler3DRefineHandoff). Window 0 renders and bills BEFORE that failure, so the door refuses the carry shape instead of billing a partial. The hard cut serves today: state overlap_frames 0 (the auto-tile) or start the next window at the previous window's end (the bag) — the plain concat of independent windows, no continuation. The carried refine is owed the engine cure (ROADMAP F3-14).`
}

/** THE CARRY'S TOKEN LAW (F62, 2026-11-14): the H3 VAE maps frames to
 *  latent tokens non-linearly — 2 tokens cover the first 5 frames,
 *  then every 5 further tokens cover 17 frames (the timeline
 *  director's own `_video_latent_t`, experimental_latent_guide.py:
 *  43-44 — one law, cited, mirrored here for the compose door's own
 *  refusal). A carried overlap is TOKEN-EXACT only when
 *  `frames >= 5 && (frames - 5) % 17 === 0` (5, 22 — the film's own
 *  seam —, 39, …): only then does the protected latent prefix decode
 *  to exactly the stated frame span. A non-exact overlap cannot
 *  continue the stream and REFUSES at the compose (FRICTION F26): the
 *  face that used to catch it, a crossfade of the two independent
 *  renders, is a double exposure at the seam — never a softer cut.
 * @param frames the carried overlap in frames at the film clock
 * @returns true when the span is token-exact */
export const tokenExactCarry = (frames: number): boolean =>
  Number.isInteger(frames) && frames >= 5 && (frames - 5) % 17 === 0

/** The next token-exact carry at or above a measured span — the rung
 *  a refusal names so the fix is a stated number, not a search.
 * @param frames the measured carry in frames
 * @returns the smallest token-exact carry ≥ `frames` */
export const nextTokenExact = (frames: number): number =>
  frames <= 5 ? 5 : 5 + 17 * Math.ceil((frames - 5) / 17)

/** The most truthful start for the next window: the film's own 22 f
 *  seam when the previous window can hold it, else the largest
 *  token-exact carry the window can still advance from. The refusal
 *  names this frame, so the fix is one edited Start seconds.
 * @param prev the previous window's origin (cap + skip at the film clock)
 * @returns the next window's start frame, or null when the window is
 *  too short for any carried join */
export const lawfulCarryStart = (prev: { cap: number; skip: number }): number | null => {
  for (const carry of [22, 5, 39, 56, 73, 90, 107, 124, 141]) {
    if (carry < prev.cap) return prev.skip + prev.cap - carry
  }
  return null
}

/** THE TILING SEATS — the two seats that set a member's geometry
 *  (mode + scale). Prompts and dials stay per-window (the film's own
 *  freedom: every window composes its own conditioning), but one
 *  film joins one shape, so a bag that states different tiling seats
 *  refuses.
 * @param a the entry the face reads (bag[0])
 * @param b the entry compared against it
 * @returns one entry per differing tiling seat, empty when they agree */
const refineTilingDiff = (a: Record<string, unknown>, b: Record<string, unknown>): string[] => {
  const out: string[] = []
  const modeA = (a['mode'] as string | undefined) ?? 'scale by multiplier'
  const modeB = (b['mode'] as string | undefined) ?? 'scale by multiplier'
  if (modeA !== modeB) out.push(`mode ('${modeA}' vs '${modeB}')`)
  const scaleA = num(a, 'scale', 2.0)
  const scaleB = num(b, 'scale', 2.0)
  if (scaleA !== scaleB) out.push(`scale (${String(scaleA)} vs ${String(scaleB)})`)
  return out
}

/** THE CARRY FACE — N windows of ONE film, each join riding the
 *  FILM'S OWN SEAM NODE (round 27; operator order: "ZERO DIFFERENCE
 *  BETWEEN THE CONTEXT CARRY FROM THE NORMAL GENS AND THE REFINE
 *  GENS"). Every window composes the single-press body (joint AV
 *  target → [MiniMaxH3FiniteLatentContinuation] → the 2x handoff →
 *  decode → head-trim → SaveVideo); window k's continuation receives
 *  window k−1's joint target as `previous_latent` with the film's
 *  seats (iteration, the carried overlap, continue_audio_latent true,
 *  the model + sigmas the handoff samples with), and the film tail is
 *  the film's own join — the finalize head-trim per window, then the
 *  plain file concat ordered by the unload boundary chain. No
 *  crossfade, no list-seat copy, no refine-only carry: the same node,
 *  the same overlap, the same audio release, the same trim.
 *
 *  PER-ENTRY CONDITIONING IS LAWFUL: each window composes its own
 *  CLIPTextEncode/RandomNoise/BasicScheduler from ITS entry, so a bag
 *  of different prompts refines window by window (the film's own
 *  freedom). Only the tiling seats must agree — they set the member
 *  geometry and one film joins one shape.
 * @param entries the bag's entries, film order (one per window)
 * @param p the walked doc params
 * @param facts the family's lane facts
 * @param g the run's graph builder
 * @param windows each window's cap + skip, film order (≥ 2)
 * @param carries each join's carried overlap in frames (one per join)
 * @param runId the run tree's id (member + film prefixes ride it)
 * @returns the assembled film's SaveVideo passthrough */
/** THE CARRY LAW, judged without emitting (the stand-down and the
 *  carrier share one judge): the entries tile the stated windows one
 *  per window, every join is token-exact, each window passes its own
 *  seat/ceiling door, and the tiling seats (mode + scale) agree across
 *  the film. Called by `renderH3RefineCarry` before its walk and by
 *  the bag/loop before the F3-14 stand-down, so a malformed shape
 *  keeps its own better voice and the stand-down owns only lawful
 *  carries.
 * @param entries the film's entries, film order (one per window)
 * @param windows each window's cap + skip, film order (≥ 2)
 * @param carries each join's carried overlap in frames (one per join) */
function assertRefineCarryLawful(
  entries: ReadonlyArray<Record<string, unknown>>,
  windows: ReadonlyArray<{ cap: number; skip: number }>,
  carries: readonly number[],
): void {
  if (entries.length !== windows.length) {
    throw new Error(
      `h3-timeline refine: the carry face names ${entries.length} entries over ${windows.length} windows — one entry per window, film order`,
    )
  }
  if (windows.length < 2 || carries.length !== windows.length - 1) {
    throw new Error(
      `h3-timeline refine: the carry face tiles ${windows.length} windows over ${carries.length} joins — at least two windows and one carried join each, in film order`,
    )
  }
  if (!carries.every(tokenExactCarry)) {
    throw new Error(
      `h3-timeline refine: the carry face carries ${carries.join(', ')} f — every join must be token-exact (frames >= 5 and (frames - 5) % 17 === 0: 5, 22, 39 …; the H3 VAE maps 5 frames to 2 latent tokens, then 17 frames to every 5 further tokens); a non-exact overlap refuses — the crossfade of two independent renders is the ghost, never a silent snap`,
    )
  }
  for (let k = 0; k < windows.length; k += 1) {
    const w = windows[k]!
    if (!Number.isInteger(w.cap) || w.cap < 1) {
      throw new Error(`h3-timeline refine: the carry face's window ${k} carries cap ${w.cap} f — a whole frame count at or above one`)
    }
    if (!Number.isInteger(w.skip) || w.skip < 0) {
      throw new Error(`h3-timeline refine: the carry face's window ${k} starts at skip ${w.skip} — a whole frame offset at or above zero`)
    }
    const dials = refineDials(entries[k]!)
    requireRefineEntry(entries[k]!)
    judgeRefineWindow(w.cap, dials)
    if (k === 0) continue
    const carry = carries[k - 1]!
    if (carry >= w.cap) {
      throw new Error(
        `h3-timeline refine: window ${k} carries ${carry} f of its ${w.cap} f — the carried head must leave frames of its own to refine (a window at or below the carried span re-renders nothing)`,
      )
    }
    if (carry >= windows[k - 1]!.cap) {
      throw new Error(
        `h3-timeline refine: the join into window ${k} carries ${carry} f but window ${k - 1} holds only ${windows[k - 1]!.cap} f — a carry cannot exceed the window it comes from`,
      )
    }
    const diffs = refineTilingDiff(entries[0]!, entries[k]!)
    if (diffs.length > 0) {
      throw new Error(
        `h3-timeline refine: window ${k} states ${diffs.join('; ')} against window 0's — the members would save at different shapes and one film joins one shape (the tiling seats are mode + scale; prompts and dials stay per-window)`,
      )
    }
  }
}

export function renderH3RefineCarry(
  entries: ReadonlyArray<Record<string, unknown>>,
  p: Record<string, unknown>,
  facts: H3Facts,
  g: GraphBuilder,
  windows: ReadonlyArray<{ cap: number; skip: number }>,
  carries: readonly number[],
  runId: string,
): OutputHandle {
  assertRefineCarryLawful(entries, windows, carries)
  // ── ONE shared plane for the whole film (the film's own posture:
  // one unet stack, one clip, the two VAEs; the boundary chain below
  // orders the saves, never a second unet) ──
  const plane = h3MaskedEditPlane(g, p, facts, windows[0]!.cap / 24)
  // ── the film's own walk: window k≥2 carries window k−1's joint
  // target through the film's seam node, saves its trimmed member
  // under its own prefix, and the boundary chain orders every save
  // before the concat reads the files back ──
  const saves: OutputHandle[] = []
  const prefixes: string[] = []
  let previous: OutputHandle | undefined
  for (let k = 0; k < windows.length; k += 1) {
    const prefix = `${runId}/refine_w${k}`
    const body = composeRefineWindow(g, entries[k]!, p, plane, {
      cap: windows[k]!.cap,
      skip: windows[k]!.skip,
      overlapFrames: k === 0 ? 0 : carries[k - 1]!,
      prefix,
    }, k, previous)
    saves.push(body.save)
    prefixes.push(prefix)
    previous = body.target
  }
  const boundary = chainSaveBoundaries(g, saves)
  return concatSavedFilms(g, prefixes, boundary, `${runId}/refine`)
}

export function renderH3RefineBag(
  bag: Array<Record<string, unknown>>,
  p: Record<string, unknown>,
  facts: H3Facts,
  g: GraphBuilder,
  runId: string,
): OutputHandle {
  // The card door arms on bag presence (refineArmed) — an empty bag
  // here is a wiring bug, never user input. Refuse loud at the seam.
  if (!Array.isArray(bag) || bag.length === 0) {
    throw new Error(
      'h3-timeline refine: the bag arrived empty at the family carrier — the card door arms on a non-empty refine bag, so this is a compose-wiring bug, not a doc to fix',
    )
  }
  // THE SEQUENTIAL-PRESS LAW (F36): one entry IS the arm's own
  // single-window emission — byte-identical, no boundary, no concat.
  // The walk posture (press, judge, press) stays lawful through this
  // delegate, and a doc that needs no tiling pays nothing for it.
  // THE ONE-ENTRY AUTO-TILE (F67, 2026-11-15 — the operator: "the AI
  // can make windows, but the human operator can't"): a LONE entry
  // stating windows > 1 tiles ITSELF through the F24 loop renderer —
  // the compose derives every window's start (start_seconds + k ×
  // (cap − overlap)), so the human states a window SIZE and a COUNT
  // instead of hand-tiling N entries with frame-exact starts the
  // 0.25-step dials cannot reach. windows = 1 keeps the delegate
  // above byte-identically (a lone window has no join, so a stated
  // overlap_frames rides along unused — the seat's own tooltip says
  // so, never a silent second meaning). A windows > 1 seat on ANY
  // entry of a MULTI-entry bag refuses below — two tilings stated,
  // and the bag already IS one.
  if (bag.length === 1) {
    const entry = bag[0]!
    const stated: unknown = entry['windows']
    const windows = typeof stated === 'number' ? stated : 1
    if (windows !== 1) {
      if (!Number.isInteger(windows) || windows < 2 || windows > MAX_COMPOSED_WINDOWS) {
        throw new Error(
          `h3-timeline refine: windows ${String(stated)} — one entry auto-tiles a whole number of windows from 2 to ${MAX_COMPOSED_WINDOWS} (1 is the single-window walk posture: judge each window before pressing the next); hand-tiled entries are the bag's own shape for mixed-seat films`,
        )
      }
      const rawOverlap: unknown = entry['overlap_frames']
      const overlap = rawOverlap === undefined ? REFINE_DEFAULT_OVERLAP_FRAMES : rawOverlap
      if (!Number.isInteger(overlap) || (overlap as number) < 0) {
        throw new Error(
          `h3-timeline refine: overlap_frames ${String(rawOverlap)} — the carried overlap is whole frames at or above zero (22 is the film's own seam and token-exact: 5, 22, 39 … the film's own continuation carries each join; any other overlap of 1 or more refuses — a crossfade of two independent renders is not served; 0 abuts with the hard cut)`,
        )
      }
      return renderH3RefineWindows(entry, p, facts, g, runId, { windows, overlapFrames: overlap as number })
    }
    return renderH3Refine(entry, p, facts, g, runId)
  }
  if (bag.some((e) => typeof e['windows'] === 'number' && (e['windows'] as number) > 1)) {
    throw new Error(
      'h3-timeline refine: a multi-entry bag states windows above 1 — the bag already IS the tiling (each entry is one window, placed by its own start_seconds); state windows on ONE lone entry to auto-tile, or tile the entries by hand',
    )
  }
  if (bag.length > MAX_COMPOSED_WINDOWS) {
    throw new Error(
      `h3-timeline refine: the bag carries ${bag.length} entries — the film's composed-window ceiling is ${MAX_COMPOSED_WINDOWS} (${(MAX_COMPOSED_WINDOWS * (REFINE_DEFAULT_CLIP_SECONDS - 22 / 24)).toFixed(2)} s at the default window); refine a shorter film or raise clip_seconds inside the measured ${REFINE_2X_OOM_FRAMES} f ceiling`,
    )
  }
  // LAW 1 — ONE FILM PER BAG: the staged leaf is per-entry text, so
  // compare the named leaves. An entry naming NO leaf skips this
  // comparison on purpose: the window renderer's own REQUIRED_SEATS
  // refusal owns that voice (missing seat, not mixed sources).
  const leaves = new Set<string>()
  for (const entry of bag) {
    const leaf = entry['source_clip']
    if (typeof leaf === 'string' && leaf.trim() !== '') leaves.add(leaf.trim())
  }
  if (leaves.size > 1) {
    const named = [...leaves].map((l) => `'${l}'`).join(', ')
    throw new Error(
      `h3-timeline refine: the bag's entries name ${leaves.size} different source clips (${named}) — ONE FILM PER BAG: a multi-entry refine tiles windows of ONE staged leaf into one film (the boundary chain + file join join windows of one timeline); two sources are two films, and a second card is the honest door for a second source`,
    )
  }
  // LAW 2 — NO GAPS, NO FULL OVERLAP (the no-drop law): derive every
  // window's origin first (the same validation the single-window arm
  // runs, per entry), then judge consecutive entries in STATED order.
  const origins = bag.map((entry) => refineWindowOrigin(entry))
  for (let k = 1; k < origins.length; k += 1) {
    const prev = origins[k - 1]!
    const cur = origins[k]!
    const overlap = prev.skip + prev.cap - cur.skip
    if (overlap < 0) {
      throw new Error(
        `h3-timeline refine: window ${k} starts at frame ${cur.skip} but window ${k - 1} ends at frame ${prev.skip + prev.cap} — a ${-(overlap)} f gap silently drops source seconds (the no-drop law: consecutive windows overlap, never a hole; state window ${k} at or before frame ${prev.skip + prev.cap})`,
      )
    }
    if (cur.skip <= prev.skip) {
      throw new Error(
        `h3-timeline refine: window ${k} starts at frame ${cur.skip}, at or before window ${k - 1}'s start (frame ${prev.skip}) — out of order and fully covering the previous window (the compose never silently sorts; in film order every entry starts strictly after the one before it, carrying its tail as overlap)`,
      )
    }
  }
  // Every entry binds BOTH seats before any join judgment: a bag whose
  // second window names no prompt is malformed whichever join it would
  // have taken, and the seat's own door says so (the carry refusal
  // below owns stated-but-different seats, never an absent one).
  for (const entry of bag) {
    for (const [seat, what] of REQUIRED_SEATS) {
      const v = entry[seat]
      if (typeof v !== 'string' || v.trim() === '') {
        throw new Error(
          `h3-timeline refine: '${seat}' names no media — ${what}; a refine needs both seats bound (source_clip, refine_prompt)`,
        )
      }
    }
  }
  // THE TILING: one window body per entry, prefix k 0-based (the F24
  // loop's walled spelling). THE JOIN FACE is decided by the carries:
  // a bag whose every join CARRIES (≥ 1 f) rides the carry face — the
  // film's own continuation per join, head-trim + plain concat — and
  // a bag with ANY zero-carry join keeps the independent walk
  // (head-trim for the overlaps it states, then the concat: a hard
  // cut where nothing is carried). N=1 never reaches here (the
  // sequential-press delegate above).
  const originsCarries: number[] = []
  for (let k = 1; k < origins.length; k += 1) {
    originsCarries.push(origins[k - 1]!.skip + origins[k - 1]!.cap - origins[k]!.skip)
  }
  const blendJoins = originsCarries.length > 0 && originsCarries.every((o) => o >= 1)
  // THE GHOST IS NOT A FALLBACK (FRICTION F26, operator burn
  // 2026-11-03: "YOU TOLD ME YOU FIXED THIS"): a carried bag whose
  // join is off the token grid cannot continue the stream — and the
  // face that used to catch it, the F61 overlap join composed here as
  // the blend fallback, was a linear crossfade of two INDEPENDENT
  // renders: a double exposure at the seam. The measured burn: a
  // hand-placed 20 f carry silently switched the mechanism and
  // shipped the ghost. It refuses instead, naming the measured carry
  // and the start that lands the film's own 22 f seam.
  if (blendJoins) {
    const offGrid = originsCarries.findIndex((c) => !tokenExactCarry(c))
    if (offGrid !== -1) {
      const carry = originsCarries[offGrid]!
      const prev = origins[offGrid]!
      const next = origins[offGrid + 1]!
      const lawful = lawfulCarryStart(prev)
      const clockFps = num(p, 'fps', DOC_FPS_DEFAULT)
      const rung = nextTokenExact(carry)
      throw new Error(
        `h3-timeline refine: the join between windows ${offGrid} and ${offGrid + 1} carries ${carry} f (derived: ${prev.skip} + ${prev.cap} − ${next.skip}) — not token-exact, so the model cannot continue the stream across it (5 frames = 2 latent tokens, then 17 frames = every 5 further tokens: 5, 22, 39, 56 …). A crossfade of the two independent renders would hide the mismatch behind a double exposure (the ghost) and is not served. ${lawful === null
    ? `This window is too short for any carried join — state zero carry (abut the windows) or one entry with windows above 1.`
    : `State window ${offGrid + 1} at frame ${lawful} (${(lawful / clockFps).toFixed(3)} s) for a 22 f carry — the film's own seam — (the nearest rung above the measured span is ${rung} f), or make the join zero-carry (start window ${offGrid + 1} at frame ${prev.skip + prev.cap}, the hard cut).`}`,
      )
    }
    // THE CARRY STAND-DOWN (F3-14): the shape above is exactly the
    // engine path that dies at window 1's handoff. Judge the shape
    // first (a malformed bag keeps its own better voice), then refuse
    // before a single node is emitted (the wall asserts g stays
    // empty), so the press never bills window 0.
    assertRefineCarryLawful(bag, origins, originsCarries)
    const spans = originsCarries
      .map((carry, k) => `window ${k}→${k + 1} carries ${carry} f`)
      .join(', ')
    throw new Error(refineCarryStanddown(`the carried join${originsCarries.length === 1 ? '' : 's'} (${spans})`))
  }
  const prefixes: string[] = []
  const saves: OutputHandle[] = []
  for (let k = 0; k < bag.length; k += 1) {
    const prefix = `${runId}/refine_w${k}`
    saves.push(renderH3RefineWindow(bag[k]!, p, facts, g, {
      cap: origins[k]!.cap,
      skip: origins[k]!.skip,
      overlapFrames: k === 0 ? 0 : originsCarries[k - 1]!,
      prefix,
    }))
    prefixes.push(prefix)
  }
  // THE FILM TAIL (one boundary chain, one join face here): one unload
  // boundary per window save, the final token transitively depending
  // on EVERY save (the §20 memory law — N windows must never
  // co-reside), then the abutting concat into the one terminal film.
  const boundary = chainSaveBoundaries(g, saves)
  return concatSavedFilms(g, prefixes, boundary, `${runId}/refine`)
}

/** THE LOOP (F24's one-press cure, 2026-11-13): N windows over ONE
 *  source clip, each saved `<runId>/refine_w<k>`, ordered by the
 *  film's unload boundary chain and assembled IN-GRAPH by the file
 *  join — no harness media, no ffmpeg. Window k starts at
 *  `start + k × (cap − overlap)` frames, and every k≥2 window's own
 *  clip is head-trimmed by `overlapFrames` (the seam never replays).
 * @param entry the refine entry (dials; source_clip/refine_prompt)
 * @param p the walked doc params
 * @param facts the family's lane facts
 * @param g the run's graph builder
 * @param runId the run tree's id (window + film prefixes ride it)
 * @param loop the window count and the carried overlap (frames)
 * @returns the assembled film's SaveVideo passthrough at `<runId>/refine`
 *
 *  THE CARRY (round 27, operator order): every join above 0 f rides
 *  `MiniMaxH3FiniteLatentContinuation` — the film's own seam node with
 *  the film's own seats — over the joint AV latent the estate's one
 *  source→nested-AV constructor builds (SolidMask →
 *  FantasticVideoEditLatent → ContexMaskedTarget). The head is trimmed
 *  by the film's finalize node and the tail is the plain file concat:
 *  the refine and the normal gens carry context the SAME way (
 *  `renderH3RefineCarry` above owns the walk).
 */
export function renderH3RefineWindows(
  entry: Record<string, unknown>,
  p: Record<string, unknown>,
  facts: H3Facts,
  g: GraphBuilder,
  runId: string,
  loop: { windows: number; overlapFrames: number },
): OutputHandle {
  if (!Number.isInteger(loop.windows) || loop.windows < 1) {
    throw new Error(
      `h3-timeline refine: ${loop.windows} windows — a refine loop renders at least one window (the count derives from total_seconds and the window step)`,
    )
  }
  if (loop.windows > MAX_COMPOSED_WINDOWS) {
    throw new Error(
      `h3-timeline refine: ${loop.windows} windows — the film's composed-window ceiling is ${MAX_COMPOSED_WINDOWS} (${(MAX_COMPOSED_WINDOWS * (REFINE_DEFAULT_CLIP_SECONDS - 22 / 24)).toFixed(2)} s at the default window); refine a shorter film or raise clip_seconds inside the measured ${REFINE_2X_OOM_FRAMES} f ceiling`,
    )
  }
  if (!Number.isInteger(loop.overlapFrames) || loop.overlapFrames < 0) {
    throw new Error(
      `h3-timeline refine: overlap ${loop.overlapFrames} f — the carried overlap is a whole frame count at or above zero (the film's own seam is 22 f)`,
    )
  }
  const clipSeconds = num(entry, 'clip_seconds', REFINE_DEFAULT_CLIP_SECONDS)
  if (!(clipSeconds > 0)) {
    throw new Error(
      `h3-timeline refine: clip_seconds ${clipSeconds} — a refine window needs frames (the seat is the loader's frame_load_cap: seconds × 24 at the film clock; the safe default is ${REFINE_DEFAULT_CLIP_SECONDS} s = 90 f)`,
    )
  }
  const startFrames = Math.round(num(entry, 'start_seconds', 0) * 24)
  const cap = Math.max(1, Math.round(clipSeconds * 24))
  const step = cap - loop.overlapFrames
  if (step <= 0) {
    throw new Error(
      `h3-timeline refine: overlap ${loop.overlapFrames} f against a ${cap} f window — a carried overlap shorter than the window is the only walk that advances (step ${step} f)`,
    )
  }
  const prefixes: string[] = []
  const saves: OutputHandle[] = []
  // THE JOIN FACE has exactly TWO faces: a carried loop (windows ≥ 2,
  // overlap ≥ 1) walks the film's own continuation per join (the
  // carry face: MiniMaxH3FiniteLatentContinuation with the film's
  // seats, head-trim + plain concat); a one-window loop or a
  // zero-overlap loop keeps the independent walk (head-trim + concat,
  // a hard cut where nothing is carried).
  const blend = loop.windows >= 2 && loop.overlapFrames >= 1
  // THE GHOST IS NOT A FALLBACK (FRICTION F26, operator burn
  // 2026-11-03): a stated overlap that is not token-exact (5, 22 —
  // the film's own seam —, 39 …) cannot continue the stream, and the
  // face that used to catch it, the F61 overlap join, is a linear
  // crossfade of two INDEPENDENT renders — a double exposure at the
  // seam. It refuses, naming the grid and the next rung.
  if (blend && !tokenExactCarry(loop.overlapFrames)) {
    const rung = nextTokenExact(loop.overlapFrames)
    throw new Error(
      `h3-timeline refine: the loop carries a ${loop.overlapFrames} f overlap — not token-exact, so the model cannot continue the stream across it (5 frames = 2 latent tokens, then 17 frames = every 5 further tokens: 5, 22, 39, 56 …). A crossfade of the two independent renders would hide the mismatch behind a double exposure (the ghost) and is not served. State overlap_frames 22 — the film's own seam — (the nearest rung above ${loop.overlapFrames} f is ${rung} f), another rung of the grid, or 0 for the abutting hard cut.`,
    )
  }
  if (blend) {
    const windows = Array.from({ length: loop.windows }, (_, k) => ({
      cap, skip: startFrames + k * step,
    }))
    const carries = new Array<number>(loop.windows - 1).fill(loop.overlapFrames)
    const entries = new Array<Record<string, unknown>>(loop.windows).fill(entry)
    // THE CARRY STAND-DOWN (F3-14): the carried joins die at window
    // 1's handoff in the engine today; refuse before a node is
    // emitted. The zero-overlap loop (the hard cut) never reaches here.
    assertRefineCarryLawful(entries, windows, carries)
    const joins = loop.windows - 1
    throw new Error(refineCarryStanddown(
      `a ${loop.windows}-window loop at a ${loop.overlapFrames} f overlap (${joins} carried join${joins === 1 ? '' : 's'})`,
    ))
  }
  for (let k = 0; k < loop.windows; k += 1) {
    const prefix = `${runId}/refine_w${k}`
    saves.push(renderH3RefineWindow(entry, p, facts, g, {
      cap, skip: startFrames + k * step,
      overlapFrames: 0,
      prefix,
    }))
    prefixes.push(prefix)
  }
  const boundary = chainSaveBoundaries(g, saves)
  return concatSavedFilms(g, prefixes, boundary, `${runId}/refine`)
}

/** The loop's ARITHMETIC (one owner, the card and the wall both read
 *  it): how many windows cover `totalSeconds`, and where each starts.
 *  `count = ceil((total − overlap) / (clip − overlap))`, clamped to at
 *  least one; the last window may overrun the source (the loader
 *  stops at the file's own end).
 * @param totalSeconds the stated length of the source film
 * @param clipSeconds the single window's length
 * @param overlapSeconds the carried overlap
 * @returns the window count (≥ 1) */
export function refineWindowCount(
  totalSeconds: number,
  clipSeconds: number,
  overlapSeconds: number,
): number {
  const step = clipSeconds - overlapSeconds
  if (!(step > 0)) {
    throw new Error(
      `h3-timeline refine: overlap ${overlapSeconds} s against a ${clipSeconds} s window — a carried overlap shorter than the window is the only walk that advances (step ${step} s)`,
    )
  }
  if (!(totalSeconds > 0)) {
    throw new Error(
      `h3-timeline refine: total_seconds ${totalSeconds} — an auto walk states the source film's length (the compose door cannot stat the staged clip: the window count needs a number, never a guess)`,
    )
  }
  return Math.max(1, Math.ceil((totalSeconds - overlapSeconds) / step))
}

/** Where each window starts (seconds), in film order.
 * @param count the window count from {@link refineWindowCount}
 * @param clipSeconds the single window's length
 * @param overlapSeconds the carried overlap
 * @param startSeconds the first window's offset
 * @returns the window start offsets, film order */
export function refineWindowStarts(
  count: number,
  clipSeconds: number,
  overlapSeconds: number,
  startSeconds = 0,
): number[] {
  const step = clipSeconds - overlapSeconds
  return Array.from({ length: count }, (_, k) => startSeconds + k * step)
}
