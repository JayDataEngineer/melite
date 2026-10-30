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
// The emission is a single graph (no loop, no requeue — one
// top-level prompt): VHS source → VAE encode (video + audio split
// streams — the node rebuilds native joint AV state itself) →
// handoff → decode → the film tail's file law (CreateVideo +
// SaveVideo at <runId>/refine, the extend terminal's own posture).
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import type { OutputHandle } from '@melite/comfyui-card-kit/graph'
import type { H3Facts } from './actions.js'
import { chainSaveBoundaries, concatSavedFilms, filmJoinAudio } from './actions.js'
import { h3MaskedEditPlane, loadVideo } from './chainEdit.js'

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

/** THE WINDOW RENDERER (F24's loop seat, 2026-11-13): one refine
 *  window — the arm's exact 26-node body, with the loader's two
 *  seats and the save prefix lifted out so a loop can walk a film
 *  without a second composer. A k≥2 window trims its carried head
 *  IN-GRAPH with the film's own finalize node (the same
 *  MiniMaxH3FiniteSegmentFinalize the film's windows ride):
 *  picture and sound leave by the same overlap, so the assembled
 *  film never replays the seam it grew from.
 * @param entry the refine entry (seats + dials, unchanged)
 * @param p the walked doc params (the family plane this window rides)
 * @param facts the family's lane facts
 * @param g the run's graph builder
 * @param seat the window's loader seats, overlap, and save prefix
 * @returns the window's SaveVideo passthrough (the loop's ordering wire)
 */
export function renderH3RefineWindow(
  entry: Record<string, unknown>,
  p: Record<string, unknown>,
  facts: H3Facts,
  g: GraphBuilder,
  seat: RefineWindowSeat,
): OutputHandle {
  for (const [seat, what] of REQUIRED_SEATS) {
    const v = entry[seat]
    if (typeof v !== 'string' || v.trim() === '') {
      throw new Error(
        `h3-timeline refine: '${seat}' names no media — ${what}; a refine needs both seats bound (source_clip, refine_prompt)`,
      )
    }
  }
  const denoise = num(entry, 'denoise', 0.32)
  if (denoise >= 1) {
    throw new Error(
      `h3-timeline refine: denoise ${denoise} >= 1 — a second pass is a refine, never a re-render (the partial-denoise window is 0.05–0.50; a full-noise sigma discards the learned upscaled latent and the vendored node throws — that is a reshoot, and the reshoot door exists)`,
    )
  }
  const seed = num(entry, 'seed', 0)
  const steps = num(entry, 'steps', 6)

  // THE CAPACITY SEATS (the F24 burn, 2026-10-30): the node serves
  // three sizing modes and a [1, 4] multiplier. A stated seat rides
  // verbatim (the knob bounds are the card's own); absent keeps the
  // shipped 2x so every existing doc composes byte-identically.
  const upMode = (entry['mode'] as string | undefined) ?? 'scale by multiplier'
  const upScale = (entry['scale'] as number | undefined) ?? 2.0

  // ── THE WINDOW (F24's cure, round 6): a refine refines a WINDOW of
  // the staged clip, never the whole film. The pass used to load every
  // frame of the source and hand the full latent to the 2x handoff,
  // so any clip past ~90 f died engine-side (141 f OOM, §13.2). The
  // window is the loader's own two seats: frame_load_cap stops the
  // read and skip_first_frames offsets it — VHS trims the soundtrack
  // by the same window (load_video_nodes.py: `start_time =
  // skip_first_frames * target_frame_time`, `lazy_get_audio(video,
  // start_time, frame_load_cap * target_frame_time)`), so the encode
  // seats read the WINDOW's frames and the WINDOW's audio, in sync.
  // A long film is covered by advancing start_seconds window by
  // window (the card's section states the stepping law).
  const clipSeconds = seat.cap / 24
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
  const windowFrames = seat.cap
  const skipFrames = seat.skip
  // THE CEILING IS THE WINDOW'S (refine-window audit C1, 2026-11-13):
  // the measured OOM is a function of the WINDOW first and the upscale
  // factor second — H3's memory grows with the frame count through the
  // learned 3D upscaler and the sampler. The first cut guarded only
  // `scale by multiplier` ≥ 2, so a target-dimensions or megapixels
  // window walked past the same ceiling into the measured OOM with no
  // refusal. Only a same-size multiplier pass (< 2, the capacity cure)
  // is exempt: its upscaler is the identity, which is what made 144 f
  // fit at 1x. The other two modes size from the source and cannot be
  // judged ≤ 1x before the read, so they take the ceiling.
  const sameSize = upMode === 'scale by multiplier' && upScale < 2
  if (!sameSize && windowFrames > REFINE_2X_OOM_FRAMES) {
    const named = upMode === 'scale by multiplier' ? `${upScale}x` : upMode
    throw new Error(
      `h3-timeline refine: a ${windowFrames} f window at ${named} — the 2x pass was measured OOM at ${REFINE_2X_OOM_FRAMES} f and green at ${REFINE_DEFAULT_CLIP_SECONDS * 24} f (2688×1536, 48 kHz; H3 memory grows with the window, so a wider window cannot fit — the ceiling belongs to the WINDOW, whichever sizing mode upsizes). Cut clip_seconds to ${(REFINE_2X_OOM_FRAMES / 24).toFixed(2)} s or less and cover the rest window by window, or lower scale to 1 for a same-size pass`,
    )
  }

  // ── the staged media (the shared loader law, force-rate-24 VHS —
  // never a private LoadVideo pair) + the family's own plane ──
  // (the REQUIRED_SEATS loop above proved source_clip a non-empty
  // string — the cast restates the proven, never a fallback: there
  // is no default clip, and the sibling str() fallback would be a
  // dead branch here, uncovered by any honest door)
  const [srcFrames, srcAudio] = loadVideo(
    g, entry['source_clip'] as string, windowFrames, skipFrames,
  )
  const { sigmaModel, samplerSel, clip, vaeVideo, vaeAudio } =
    h3MaskedEditPlane(g, p, facts, clipSeconds)

  // ── the split-stream encode (the node's own contract:
  // _resolve_h3_sources rebuilds native joint AV from plain 24ch
  // video + the matching audio latent) ──
  const videoLatent = g.node('VAEEncode', { pixels: srcFrames, vae: vaeVideo }).out(0)
  const audioLatent = g.node('VAEEncodeAudio', { audio: srcAudio, vae: vaeAudio }).out(0)
  const positive = g.node('CLIPTextEncode', {
    text: entry['refine_prompt'] as string, clip,
  }).out(0)
  const noise = g.node('RandomNoise', { noise_seed: seed }).out(0)
  const sched = g.node('BasicScheduler', {
    model: sigmaModel, scheduler: p.sched_name as string,
    steps, denoise,
  }).out(0)

  // ── THE HANDOFF (the report-named chain: learned 2x upscale +
  // the low-sigma refinement pass, one node — its output is final/
  // decode-ready, no external guider or second sampler) ──
  // THE CAPACITY SEATS ride the handoff verbatim — the window above is
  // what keeps a 2x pass inside memory; a ≤1x pass sizes its own.
  const upscaled = g.node('MinimaxH3LatentUpscaler3DRefineHandoff', {
    latent: videoLatent, audio_latent: audioLatent,
    noise, sampler: samplerSel, sigmas: sched,
    model: sigmaModel, positive,
    model_name: REFINE_UPSCALE_MODEL,
    // THE FLAT CLASS (F23 blocker, round-6 audit): THIS handoff
    // declares `mode` as a plain combo and `scale` as its OWN required
    // top-level FLOAT (production /object_info + the vendored
    // minimax_h3_refine.py:349-353) — there is no `mode.scale` seat on
    // it. The dotted spelling belongs to MinimaxH3LatentUpscaler3D
    // (COMFY_DYNAMICCOMBO_V3, chainUpscale.ts), a DIFFERENT node; the
    // round-5 cure crossed the two and reintroduced
    // required_input_missing on this member.
    mode: upMode, scale: upScale,
    // Multiplier mode ignores these (the film's own note at its
    // handoff mount) — they ride the upscaler's own defaults.
    width: 1280, height: 704, megapixels: 1,
    keep_proportion: true, align: 32,
    lock_audio: true, cfg: 1.0, device: 'cuda', precision: 'bf16',
    offload_after_upscale: false,
  }).out(0)

  // ── decode + the film tail's file law ──
  let vdec = g.node('VAEDecode', { samples: upscaled, vae: vaeVideo }).out(0)
  let adec = g.node('VAEDecodeAudio', { samples: upscaled, vae: vaeAudio }).out(0)
  if (seat.overlapFrames > 0) {
    // THE CARRIED HEAD (the loop's seam law): a k≥2 window's opening
    // overlap is the previous window's tail re-rendered, so this
    // window's OWN clip never replays it — the film's finalize node,
    // hard audio trim (the carried seam leaves picture AND sound).
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
  return g.node('SaveVideo', {
    video: created.out(), filename_prefix: seat.prefix,
    format: 'mp4', codec: 'h264',
  }).out(0)
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
 * @param runId the run tree's id (the refine filename rides it) */
export function renderH3Refine(
  entry: Record<string, unknown>,
  p: Record<string, unknown>,
  facts: H3Facts,
  g: GraphBuilder,
  runId: string,
): void {
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
  renderH3RefineWindow(entry, p, facts, g, {
    cap: Math.max(1, Math.round(clipSeconds * 24)),
    skip: Math.round(startSeconds * 24),
    overlapFrames: 0,
    prefix: `${runId}/refine`,
  })
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
  for (let k = 0; k < loop.windows; k += 1) {
    const prefix = `${runId}/refine_w${k}`
    saves.push(renderH3RefineWindow(entry, p, facts, g, {
      cap, skip: startFrames + k * step,
      overlapFrames: k === 0 ? 0 : loop.overlapFrames,
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
