// The h3 family's EXTEND renderer seat (the extend-video flow's
// emission, report dev_docs/audits/features/
// extend-video-flow-2026-11-12.md §3; the multi-window unification
// + N-window assembly, dev_docs/audits/features/
// multiwindow-unification-2026-11-12.md): MORE SECONDS of coherent
// motion appended to a prior clip — a fresh continuation, never a
// re-edit of what the clip already shows.
//
// THE EXTEND LAW (four clauses):
//  1. THE ANCHOR IS THE PRIOR CLIP'S LAST FRAME, TAKEN IN-GRAPH:
//     ImageFromBatch(priorFrames, batch_index: -1) — the engine's
//     own negative-index support (comfy_extras/nodes_images.py:
//     "if batch_index < 0: batch_index += s_in.shape[0]", clamped).
//     No frame-count probe, no out-of-graph extraction: the prior
//     clip is read ONCE by the VHS loader (force_rate 24 — the film
//     clock), and its tail frame rides BOTH the plan's picture_1
//     seat and the r2v ref_images.ref_image_0 seat (the pixel
//     anchor law, actions.ts: cross-run continuity is the anchor).
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
import { chainSaveBoundaries, concatSavedFilms } from './actions.js'
import {
  assertGridLength, GRID_BASE_FRAMES, GRID_STEP_FRAMES, GRID_MAX_FRAMES,
} from './timelineContract.js'
import { loadVideo, renderMaskedEditChain } from './chainEdit.js'

/** The chain policy's masked_av context — the overlap every seam
 * after the first carries (the same 39 the swap's clips ride; the
 * entry's overlap_frames knob feeds the plan node's slicing, the
 * policy owns the carry). */
const CONTEXT_OVERLAP_FRAMES = 39

/** The plan's scene cap (chain_nodes: a 32-scene cap refuses
 * mis-authored loops). */
const MAX_WINDOWS = 32

/** The extend entry's required seats (the reshoot/repair idiom: an
 * armed doc with an empty seat refuses loud naming the seat). */
const REQUIRED_SEATS = [
  ['source_clip', 'the clip whose seconds are extended — ONE staged leaf: the VHS loader + the core LoadVideo read it by staged name, and the timeline reads it back off the native VIDEO wire'],
  ['extend_prompt', 'the continuation text — MOTION+SOUND for the appended seconds (the R2V prompt seat; agent-composed, user-confirmed)'],
] as const

const num = (p: Record<string, unknown>, k: string, d: number): number =>
  typeof p[k] === 'number' ? (p[k] as number) : d

const str = (p: Record<string, unknown>, k: string): string =>
  typeof p[k] === 'string' ? (p[k] as string) : ''

/** The smallest 22+17k grid length ≥ x (capped at 362); null when x
 * exceeds the grid — that window count cannot carry the total. */
const gridCeil = (x: number): number | null => {
  const k = Math.ceil((x - GRID_BASE_FRAMES) / GRID_STEP_FRAMES)
  const length = Math.max(GRID_BASE_FRAMES, GRID_BASE_FRAMES + GRID_STEP_FRAMES * k)
  return length > GRID_MAX_FRAMES ? null : length
}

/** The largest 22+17k grid length ≤ x (floored at 22, capped 362). */
const gridFloor = (x: number): number => Math.min(
  GRID_MAX_FRAMES,
  GRID_BASE_FRAMES + GRID_STEP_FRAMES * Math.floor((x - GRID_BASE_FRAMES) / GRID_STEP_FRAMES),
)

/** One legal composition of the stated extension. */
export interface WindowComposition {
  readonly windows: number
  readonly windowFrames: number
  readonly deliveredFrames: number
}

/** THE COMPOSITION SOLVER (pure; the door's whole law beyond one
 * window): across every legal window count, the grid lengths on
 * both sides of the exact requirement — the smallest that delivers
 * ≥ stated (ceil) and the largest that delivers ≤ stated (floor) —
 * looking for an EXACT delivery; else a loud refusal naming the
 * neighboring compositions (max under, min over).
 * @param totalFrames the stated extension, frames at the film clock
 * @param where the refusal's voice ('h3-timeline extend')
 * @param overlap the per-seam context overlap (the policy's 39)
 * @returns the exact composition */
export function solveWindowComposition(
  totalFrames: number,
  where: string,
  overlap: number = CONTEXT_OVERLAP_FRAMES,
): WindowComposition {
  let bestUnder: WindowComposition | null = null
  let bestOver: WindowComposition | null = null
  for (let windows = 1; windows <= MAX_WINDOWS; windows++) {
    const exact = (totalFrames + (windows - 1) * overlap) / windows
    for (const windowFrames of [gridFloor(exact), gridCeil(exact)] as const) {
      if (windowFrames === null) continue
      const delivered = windows * windowFrames - (windows - 1) * overlap
      if (delivered === totalFrames) return { windows, windowFrames, deliveredFrames: delivered }
      const composition: WindowComposition = { windows, windowFrames, deliveredFrames: delivered }
      if (delivered < totalFrames) {
        if (bestUnder === null || delivered > bestUnder.deliveredFrames) bestUnder = composition
      } else if (bestOver === null || delivered < bestOver.deliveredFrames) {
        bestOver = composition
      }
    }
  }
  const neighbor = (c: WindowComposition | null): string =>
    c === null ? '' :
      ` nearest: ${c.windows} windows of ${c.windowFrames}f deliver ${c.deliveredFrames}f (${(c.deliveredFrames / 24).toFixed(3)}s);`
  throw new Error(
    `${where}: stated ${totalFrames}f composes nowhere exactly — ` +
      `N uniform 22+17k windows under the ${overlap}f context overlap compose exactly nowhere;` +
      `${neighbor(bestUnder)}${neighbor(bestOver)}` +
      ` re-state extend_seconds as a composition's delivered seconds ` +
      `(D frames round-trips D/24 exactly; a single window keeps the 22+17k grid door)`,
  )
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
  for (const [seat, what] of REQUIRED_SEATS) {
    const v = entry[seat]
    if (typeof v !== 'string' || v.trim() === '') {
      throw new Error(
        `h3-timeline extend: '${seat}' names no media — ${what}; an extend needs both seats bound (source_clip, extend_prompt)`,
      )
    }
  }
  const seed = num(entry, 'seed', 0)
  const steps = num(entry, 'steps', 6)
  const overlapFrames = num(entry, 'overlap_frames', 39)
  const resolution = str(entry, 'resolution') || '736p'
  const statedFrames = Math.round(num(entry, 'extend_seconds', 56 / 24) * 24)
  // THE COMPOSITION DOOR: one window keeps the landed grid law
  // verbatim; beyond it the solver composes N uniform windows and
  // refuses every non-exact landing by name.
  const composition = statedFrames <= GRID_MAX_FRAMES
    ? { windows: 1, windowFrames: assertGridLength(statedFrames, 'h3-timeline extend'), deliveredFrames: statedFrames }
    : solveWindowComposition(statedFrames, 'h3-timeline extend', overlapFrames)
  const clipSeconds = composition.windowFrames / 24

  // ── the staged media: the WHOLE prior clip on the VHS seat
  // (force_rate 24 — the one clock) and its LAST FRAME as the
  // in-graph anchor (negative batch index, engine core) ──
  const [priorFrames, priorAudio] = loadVideo(g, str(entry, 'source_clip'))
  const lastFrame = g.node('ImageFromBatch', {
    image: priorFrames, batch_index: -1, length: 1,
  }).out(0)

  // ── THE SEAT'S OWN PLAN (clause 3): N continuation shots — the
  // literal rules, plan_json_input stays UNWIRED (the plan node's
  // source slicing is the swap's semantics, never a continuation's;
  // the cure for the re-slice bug the unification's survey found) ──
  const shots = Array.from({ length: composition.windows }, (_k, i): { id: string; prompt: string } => ({
    id: `extend-${i + 1}`, prompt: str(entry, 'extend_prompt'),
  }))
  const planJson = JSON.stringify({ shots })

  const { trimmed, assemblePath } = renderMaskedEditChain(g, {
    p, facts,
    clipSeconds,
    overlapFrames,
    resolution, seed, steps,
    roles: '',
    sourceClip: str(entry, 'source_clip'),
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
    body: ({ cur, clip, vaeVideo, vaeAudio, mutedChainAudio, sliceAudio }) => {
      // The everywhere-generate mask: an all-white SolidMask sized
      // to the chain's own geometry (nothing held — extended
      // seconds are new content).
      const whiteMask = g.node('SolidMask', {
        value: 1, width: cur.out(8), height: cur.out(9),
      }).out(0)
      // ── the fresh-continuation body: the anchor rides BOTH
      // reference seats — the last frame as the pixel anchor
      // (ref_image_0) and the whole clip as the motion identity
      // (ref_video_0), the swap/repair spine's own seats ──
      const r2v = g.node('MiniMaxH3ReferenceToVideo', {
        prompt: str(entry, 'extend_prompt'),
        width: cur.out(8), height: cur.out(9), length: cur.out(6),
        ref_image_size: 'match',
        clip, vae: vaeVideo, audio_vae: vaeAudio,
        'ref_images.ref_image_0': lastFrame,
        'ref_videos.ref_video_0': priorFrames,
        'ref_video_audios.ref_video_audio_0': mutedChainAudio,
      })
      const slice = g.node('H3SourceSlice', {
        source_fps: 24, crop: 'center',
        state: cur.out(0), latent: r2v.out(1),
        audio_vae: vaeAudio, source_frames: priorFrames, source_audio: sliceAudio,
      })
      const edit = g.node('MiniMaxH3FantasticVideoEditLatent', {
        grow: 0, keep_audio: false, megapixels: 0,
        vae: vaeVideo, images: slice.out(0), mask: whiteMask,
        audio_vae: vaeAudio, audio: slice.out(1),
      }).out(0)
      const target = g.node('MiniMaxH3ContexMaskedTarget', {
        mask_meaning: 'white = generate',
        audio_mode: 'generate all audio',
        mask_conversion: 'H3 exact (causal/token max)',
        target_latent: edit, mask: whiteMask,
      }).out(0)
      return { conditioning: r2v.out(0), targetLatent: target }
    },
  })

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
      images: priorFrames, audio: priorAudio, fps: 24, bit_depth: 8,
    })
    const priorSaved = g.node('SaveVideo', {
      video: priorCreated.out(), filename_prefix: `${runId}/x0`,
      format: 'mp4', codec: 'h264',
    }).out()
    const after = chainSaveBoundaries(g, [priorSaved])
    concatSavedFilms(g, [`${runId}/x0`], after, `${runId}/extend_film`, {
      append: assemblePath,
    })
    return
  }
  // SINGLE-WINDOW (the landed shape): both parts save at prefixes,
  // the boundary chain orders them, the concat joins, the container
  // delivers <runId>/extend_film.
  const newCreated = g.node('CreateVideo', {
    images: trimmed.out(0), audio: trimmed.out(1), fps: 24, bit_depth: 8,
  })
  const newSaved = g.node('SaveVideo', {
    video: newCreated.out(), filename_prefix: `${runId}/x1`,
    format: 'mp4', codec: 'h264',
  }).out()
  const priorCreated = g.node('CreateVideo', {
    images: priorFrames, audio: priorAudio, fps: 24, bit_depth: 8,
  })
  const priorSaved = g.node('SaveVideo', {
    video: priorCreated.out(), filename_prefix: `${runId}/x0`,
    format: 'mp4', codec: 'h264',
  }).out()
  const after = chainSaveBoundaries(g, [newSaved, priorSaved])
  concatSavedFilms(g, [`${runId}/x0`, `${runId}/x1`], after, `${runId}/extend_film`)
}
