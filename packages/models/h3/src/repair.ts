// The h3 family's REPAIR renderer seat (Tier A, operator order
// 2026-11-12: "Okay do it all" — a masked SECOND pass over a region
// of the source clip: hands, the body, a face. Region-agnostic by
// design: the region rides the RECEIVED mask's own pixels, never a
// card-per-region).
//
// THE REPAIR LAW (three clauses, all operator-seated):
//  1. ZERO NEW PIXEL POSITIONS: the pass re-renders ONLY the masked
//     region of the SAME clip — the source rides its own ref_video
//     seat as the identity anchor (r2v with no still, no mannequin:
//     the person is already right, only the region is wrong). This
//     is why Tier A cannot add detail to small-in-frame hands — the
//     mask adds no canvas (crop-scale is Tier B, blocked on the
//     unvendored producer).
//  2. PARTIAL DENOISE ONLY: a repair is a refine, never a re-render.
//     The scheduler's denoise carries the entry's denoise (default
//     0.32; the reference refine window 0.30–0.35, actions.ts's
//     refine arm the precedent), and a denoise >= 1 refuses LOUD at
//     this door — the same sigmas law that guards the film's refine
//     seat (full denoise would boil the held region into a new
//     take; that is a reshoot, and the reshoot door exists).
//  3. THE MASK IS RECEIVED, NEVER MANUFACTURED (P0-2, defect board
//     row 2, the operator's contract "repair receives a mask and
//     errors without one"): ONE staged PNG (the track run's
//     pixel-max union is the recommended bridge — per-frame motion
//     was manufactured there, at track time), resized to the plan
//     geometry in-graph (the edit door's own F3-16 static arm,
//     verbatim). The inline SAM3 prose door that let a "repair" run
//     with no mask asset in or out is DEAD at this seat.
//
// THE SPINE IS SHARED (the 2026-11-12 unification): every node
// outside this seat's true deltas is emitted by chainEdit.ts's
// renderMaskedEditChain. This seat owns: the three required seats,
// the denoise door, the windowed loader, the received static mask,
// the window's own first frame as the plan anchor, and the partial-
// denoise pole. The windowed re-slice rides the plan node's derived
// shots (planFromSource — the window re-slices exactly like the
// swap's source, which is why the geometry law holds: the received
// mask resizes to the WINDOW's plan geometry, so window_length must equal one plan clip's
// frames — the loader's cap and the plan's clip_seconds are the one
// clock).
import type { GraphBuilder, OutputHandle } from '@melite/comfyui-card-kit/graph'
import type { H3Facts } from './actions.js'
import { chainSaveBoundaries, concatSavedFilms, filmJoinAudio } from './actions.js'
import { contexMaskedTarget, loadVideo, renderMaskedEditChain, resolvePlanTier, sheetRefSlots } from './chainEdit.js'
import type { MaskedChainSeat } from './chainEdit.js'
import { assertGridLength, MAX_COMPOSED_WINDOWS, resolveCarryOverlap } from './timelineContract.js'

/** The repair entry's required seats (the reshoot idiom: an armed
 * doc with an empty seat refuses loud naming the seat). The third
 * is staged media, not text — P0-2 (defect board row 2, the
 * operator's contract "repair receives a mask and errors without
 * one") killed the inline SAM3 manufacture: the mask is RECEIVED as
 * ONE staged PNG, and the refusal names the seat the same way the
 * swap's does. */
const REQUIRED_SEATS = [
  ['source_clip', 'the clip whose region is repaired — ONE staged leaf: the VHS window loader + the core LoadVideo read it by staged name, and the timeline reads it back off the native VIDEO wire'],
  ['repair_prompt', 'the repair action text — what the masked region should become (the R2V prompt seat; agent-composed, user-confirmed)'],
  ['mask', "ONE staged PNG the repair RECEIVES (the operator's contract, defect board row 2: a repair errors without one) — the track run's pixel-max union is the recommended bridge; the chain resizes it to its own geometry in-graph, prose manufactures nothing"],
] as const

/** Reads one required seat NARROWED by its own refusal — the seat
 * is a string or the door never composes (no fallback arm exists:
 * a validated seat re-read through a forgiving helper would be a
 * second, weaker validator below the law — a silent error). */
const requiredSeat = (entry: Record<string, unknown>, seat: string, what: string): string => {
  const v = entry[seat]
  if (typeof v !== 'string' || v.trim() === '') {
    throw new Error(
      `h3-timeline repair: '${seat}' names no media — ${what}; a repair needs all three seats bound (source_clip, repair_prompt, mask)`,
    )
  }
  return v
}

/** Reads one optional number seat: absent falls to the documented
 * default; a stated non-number REFUSES — a defaulting fallback would
 * swallow a bypassed door's wrong-typed value as a silent error. */
const statedNumber = (p: Record<string, unknown>, k: string, d: number): number => {
  const v = p[k]
  if (v === undefined) return d
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(
      `h3-timeline repair: '${k}' is stated as ${JSON.stringify(v)} — a number seat carries a number (absent falls to ${d}); a wrong-typed value never silently defaults`,
    )
  }
  return v
}

/** ONE repair entry, validated (the single-window arm and the tiled
 *  bag share the walk — one owner of every refusal, the axiom's one
 *  piece of arithmetic). Pure: no node is created, so the tiled bag
 *  can judge its whole grammar before node one lands.
 * @param entry the repair entry (the arm's bound stanza)
 * @param p the walked doc params (the plan tier resolves off it)
 * @returns the entry's resolved seats */
interface RepairPlan {
  readonly sourceClipSeat: string
  readonly repairPromptSeat: string
  readonly maskSeat: string
  readonly denoise: number
  readonly seed: number
  readonly steps: number
  readonly clipSeconds: number
  readonly resolution: string
  readonly windowStart: number
  readonly windowLength: number
  /** the entry's resolved plan-head join (resolveCarryOverlap —
   *  absent = 39; a stated ≠39 refuses at the plan head's own door). */
  readonly overlapFrames: number
}

const planRepairEntry = (
  entry: Record<string, unknown>,
  p: Record<string, unknown>,
): RepairPlan => {
  // NO FALLBACK READS: every required seat narrows through its own
  // refusal; every optional number refuses a wrong-typed stated
  // value instead of silently defaulting (the schema walk types
  // every lawful doc — a wrong-typed value means a bypassed door).
  const sourceClipSeat = requiredSeat(entry, 'source_clip', REQUIRED_SEATS[0][1])
  const repairPromptSeat = requiredSeat(entry, 'repair_prompt', REQUIRED_SEATS[1][1])
  const maskSeat = requiredSeat(entry, 'mask', REQUIRED_SEATS[2][1])
  const denoise = statedNumber(entry, 'denoise', 0.32)
  if (denoise >= 1) {
    throw new Error(
      `h3-timeline repair: denoise ${denoise} >= 1 — a masked second pass is a refine, never a re-render (the partial-denoise window is 0.05–0.50; denoise 1 would boil the held region into a new take — that is a reshoot, and the reshoot door exists)`,
    )
  }
  const seed = statedNumber(entry, 'seed', 0)
  const steps = statedNumber(entry, 'steps', 6)
  const clipSeconds = statedNumber(entry, 'clip_seconds', 6)
  const resolution = resolvePlanTier(entry, p)
  const windowStart = statedNumber(entry, 'window_start', 0)
  const windowLength = statedNumber(entry, 'window_length', 0)
  // No silent clamps (the no-silent-repair law): a negative window
  // is a caller bug — refuse loud, never round it into a render.
  // F3 — THE GRID LAW ON THE WINDOW (2026-11-13): the plan's scene
  // geometry is 22+17k frames, and the mask tracks the WINDOW the
  // loader cuts. An off-grid window length makes the tracked mask
  // stack disagree with the plan's own intervals — the operator's
  // trial-and-error burn — so a STATED length refuses at the compose
  // door naming the nearest legal grid point, never engine-side.
  if (windowLength > 0) assertGridLength(Math.round(windowLength), 'h3-timeline repair window_length')
  if (windowStart < 0 || windowLength < 0) {
    throw new Error(
      `h3-timeline repair: window_start ${windowStart} / window_length ${windowLength} — a window seat never goes negative (frames at the film clock, 24 fps; 0/0 is the whole clip)`,
    )
  }
  return { sourceClipSeat, repairPromptSeat, maskSeat, denoise, seed, steps, clipSeconds, resolution, windowStart, windowLength, overlapFrames: resolveCarryOverlap(entry) }
}

/** The validated entry's chain seat — the loader, the truthful
 *  anchor, and the shared masked-edit spine. The `assemble` terminal
 *  is the caller's: the single-window arm assembles in-chain
 *  (`<runId>/repair`), the tiled bag joins by file (the window
 *  film's own streams ride the join's boundary chain).
 * @param plan the validated entry (planRepairEntry)
 * @param facts the family's lane facts
 * @param g the run's graph builder */
const repairSeat = (
  plan: RepairPlan,
  p: Record<string, unknown>,
  facts: H3Facts,
  g: GraphBuilder,
): Omit<MaskedChainSeat, 'assemble'> => {
  // ── the staged media: the WINDOW loader (cap + skip on the same
  // VHS seat, so frames and audio stay in sync) and the inline
  // per-frame SAM3 mask that replaces the swap's staged PNG ──
  const [srcFrames, srcAudio] = loadVideo(g, plan.sourceClipSeat, Math.round(plan.windowLength), Math.round(plan.windowStart))
  // picture_1 for the plan head: the window's own first frame. The
  // plan node REQUIRES a picture (its describer vocabulary); the
  // repair's "replacement" is the source's own person, so the
  // window's lead frame is the truthful anchor — and the geometry
  // law (grid snap + tier scaling off source_frames) stays
  // engine-owned either way.
  const anchorFrame = g.node('ImageFromBatch', {
    image: srcFrames, batch_index: 0, length: 1,
  }).out(0)
  return {
    p, facts,
    clipSeconds: plan.clipSeconds,
    overlapFrames: plan.overlapFrames,
    resolution: plan.resolution, seed: plan.seed, steps: plan.steps,
    roles: '',
    sourceClip: plan.sourceClipSeat,
    windowStart: plan.windowStart,
    picture1: anchorFrame,
    srcFrames, srcAudio,
    // the ignored literal fallback — the plan node's WINDOW-RE-SLICED
    // shots ride plan_json_input (the repair's geometry law)
    planJson: JSON.stringify({ shots: [{ id: 'repair', prompt: plan.repairPromptSeat }] }),
    planFromSource: true,
    denoise: plan.denoise,
    body: ({ cur, clip, vaeVideo, vaeAudio, mutedChainAudio, sliceAudio, refImages }) => {
      // ── P0-2 (defect board row 2): the mask is RECEIVED, never
      // manufactured — the inline SAM3 prose door (and its F7
      // per-scene slice of a TRACKED stack) died with the contract.
      // The static arm verbatim (the edit door's own F3-16 cure):
      // the staged PNG's own shape is the TRACK's shape, not the
      // chain's — resize to the plan geometry in-graph, never trust
      // the file. The recommended bridge (the track run's pixel-max
      // union) arrives already grown; prose manufactures nothing. ──
      const raw = g.node('LoadImage', { image: plan.maskSeat }).out(0)
      // D-16 (defect board 2026-11-18): the door once wired
      // `ImageResize` — a class NO engine build owns (1817 classes,
      // none so named; the refusal landed at compose time, after the
      // authoring pass). Core `ImageScale` is the exact-fit resize
      // the law always meant: it resizes to width/height with no
      // proportion-keeping arm — the mask fills the chain canvas.
      // D-21 (defect board 2026-11-18): the resize rides the IMAGE
      // plane and the conversion rides LAST — ImageScale is
      // IMAGE→IMAGE, and a MASK socket fed an IMAGE is the
      // prompt-validation death the engine serves after compose
      // passes. Same two nodes; the ORDER is the law.
      const fitted = g.node('ImageScale', {
        image: raw, width: cur.out(8), height: cur.out(9),
        upscale_method: 'bilinear', crop: 'disabled',
      }).out(0)
      const editMask = g.node('ImageToMask', {
        image: fitted, channel: 'red',
      }).out(0)
      // ── the masked second-pass body: NO still, NO mannequin — the
      // source clip rides its own ref_video seat (the identity
      // anchor of a repair is the person already in the frame — the
      // zero-new-pixels law) ──
      const r2v = g.node('MiniMaxH3ReferenceToVideo', {
        prompt: plan.repairPromptSeat,
        width: cur.out(8), height: cur.out(9), length: cur.out(6),
        ref_image_size: 'match',
        clip, vae: vaeVideo, audio_vae: vaeAudio,
        'ref_videos.ref_video_0': srcFrames,
        'ref_video_audios.ref_video_audio_0': mutedChainAudio,
        // THE SHEET (P0-1): repair mounts NO image anchor — the
        // declared ref_images ride from slot 0, stated exactly as
        // the gen door states them (an input slot, nothing more).
        ...sheetRefSlots(refImages, 0),
      })
      const slice = g.node('H3SourceSlice', {
        source_fps: 24, crop: 'center',
        state: cur.out(0), latent: r2v.out(1),
        audio_vae: vaeAudio, source_frames: srcFrames, source_audio: sliceAudio,
      })
      const target = contexMaskedTarget(g, { vaeVideo, vaeAudio }, {
        frames: slice.out(0), audio: slice.out(1), mask: editMask, keepAudio: true,
      })
      return { conditioning: r2v.out(0), targetLatent: target }
    },
  }
}

/** The repair renderer: validates the bound entry, then composes the
 * masked second-pass chain. Like the swap, the film path never
 * reaches here (the card branches on a non-empty repair bag, refuses
 * a bag under an armed reshoot or replace — one door per doc), and
 * the emission ends in MiniMaxH3ChainAssemble.
 * @param entry the repair mod's single bound entry
 * @param p the walked doc params (the lora mod bag + SLA/shift knobs
 * — the family plane this repair renders under)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the assemble filename rides it)
 * @returns nothing; the chain's nodes are emitted onto `g` */
export function renderH3Repair(
  entry: Record<string, unknown>,
  p: Record<string, unknown>,
  facts: H3Facts,
  g: GraphBuilder,
  runId: string,
): void {
  const plan = planRepairEntry(entry, p)
  renderMaskedEditChain(g, {
    ...repairSeat(plan, p, facts, g),
    assemble: {
      // a repair is a VISUAL second pass: the soundtrack is the
      // source's own, always (audio_source 'source' — the swap's
      // keep_audio switch has no repair pole to flip)
      audioSource: 'source',
      filename: `${runId}/repair`,
    },
  })
}

/** THE TILED REPAIR BAG — the windows arc (the honesty row's owed
 *  design, `windows: [...]` on the bag + the film-with-splice
 *  emission, landed in the GAPS-19 shape the refine bag proved): N ≥ 2
 *  hand-tiled windows, EACH its own masked-edit chain on the one
 *  spine (the seat's file-join posture — no in-chain assemble), each
 *  saved `<runId>/repair_w<k>`, joined into ONE `<runId>/repair` film
 *  by the film tail's own join primitives (chainSaveBoundaries orders
 *  every save; concatSavedFilms stitches). Outside the tracked mask
 *  the pixels ARE the source's own, so a window cut at its boundary
 *  is not the refine arm's pop-risk seam — the file splice is the
 *  honest join for this face. A ONE-entry bag never reaches here (the
 *  card keeps the single-window emission byte-identical); the carrier
 *  refuses it by name so the lib face cannot silently reroute.
 * @param bag the repair bag's entries, film order (the card's alias
 * door passes the armed bag verbatim)
 * @param p the walked doc params (the lora mod bag + SLA/shift knobs)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the joined film's prefix rides it)
 * @returns nothing; the window chains, the boundary chain, and the
 * joined film are emitted onto `g` */
export function renderH3RepairBag(
  bag: readonly unknown[],
  p: Record<string, unknown>,
  facts: H3Facts,
  g: GraphBuilder,
  runId: string,
): void {
  if (!Array.isArray(bag)) {
    throw new Error(
      'h3-timeline repair: the repair bag is present but is not an array — the tiled bag is a list of window stanzas',
    )
  }
  // THE CEILING (one owner: MAX_COMPOSED_WINDOWS — the film's
  // composed-window ceiling, the same number every tiling face
  // refuses at): more windows than the ceiling refuses naming the
  // number and the cure.
  if (bag.length > MAX_COMPOSED_WINDOWS) {
    throw new Error(
      `h3-timeline repair: the bag carries ${bag.length} entries — the film's composed-window ceiling is ${MAX_COMPOSED_WINDOWS}; repair a shorter film or state fewer, longer windows (the single-window arm's clip_seconds ceiling is 15 s = 360 f)`,
    )
  }
  // THE N=1 DELEGATE LAW (GAPS-19's T7): one entry rides the
  // single-window emission — the edit door's own alias translation —
  // never the tiled tail (a CreateVideo/boundary/concat tail where
  // the single-window emission forbids one is the regression the
  // refine bag's wall catches for its own face).
  if (bag.length < 2) {
    throw new Error(
      `h3-timeline repair: the bag carries ${bag.length} entr${bag.length === 1 ? 'y' : 'ies'} — one window rides the single-window emission (the alias resolves into ONE edit entry, whole-film by default); the tiled bag starts at two windows`,
    )
  }
  // THE GRAMMAR, EVERY ENTRY, BEFORE NODE ONE (a bag that refuses
  // half-composed would leave the graph a partial film):
  const plans: RepairPlan[] = bag.map((entry, k) => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(
        `h3-timeline repair: the bag's window ${k} is not a knob stanza (got ${Array.isArray(entry) ? 'an array' : entry === null ? 'null' : `a bare ${typeof entry}`}) — every entry is a repair stanza (source_clip, repair_prompt, mask, window_seconds)`,
      )
    }
    const stanza = entry as Record<string, unknown>
    // THE SERVED DIALECT (the served-docs tool law's own acceptance
    // test — "does the agent type window_start? if yes, the
    // interface failed"): the frame seats are the single-window
    // arm's INTERNAL arithmetic. A tiled entry states its window in
    // SECONDS; the carrier derives every start. A stated frame seat
    // refuses — never silently ignored (the statedNumber law).
    if (stanza.window_start !== undefined || stanza.window_length !== undefined) {
      throw new Error(
        `h3-timeline repair: window ${k} states window_start/window_length — the tiled bag states windows in SECONDS (window_seconds); the frame seats are the single-window arm's internal arithmetic, and the carrier derives every start from the stated spans`,
      )
    }
    const plan = planRepairEntry(stanza, p)
    // THE WINDOW, STATED IN SECONDS: required in a tiled entry. The
    // carrier converts ×24 at the film clock and judges the engine
    // grid (22+17k frames) — an unstated span, a wrong-typed span,
    // or an off-grid span refuses at the compose door naming the
    // nearest legal length, never engine-side.
    const seconds = statedNumber(stanza, 'window_seconds', 0)
    if (seconds <= 0) {
      throw new Error(
        `h3-timeline repair: window ${k} states no window_seconds — a tiled bag's every entry states its window's length in seconds (window_seconds); the whole-film tiling is the edit door's own (one entry, carry splits on the film's timeline)`,
      )
    }
    const windowLength = Math.round(seconds * 24)
    assertGridLength(windowLength, `h3-timeline repair window ${k} window_seconds`)
    // THE BUDGET: the join consumes ONE trimmed window per entry —
    // a window past the entry's own clip budget slices into scenes
    // the file join would silently drop. Refuse naming both numbers
    // and the cure (the band tops at 15 s = 360 f).
    if (windowLength > Math.round(plan.clipSeconds * 24)) {
      throw new Error(
        `h3-timeline repair: window ${k} states ${windowLength} f (${seconds} s) against a ${plan.clipSeconds} s clip budget (${Math.round(plan.clipSeconds * 24)} f) — the tiled join consumes ONE window per entry, and a window past the budget renders as multiple scenes the join would drop. Raise the entry's clip_seconds (the plan band tops at 15 s = 360 f) or state a shorter window`,
      )
    }
    return { ...plan, windowLength }
  })
  // ONE FILM: every window repairs the SAME clip — differing sources
  // are two films, and the concat would splice across them.
  const first = plans[0]!
  for (const [k, plan] of plans.entries()) {
    if (k > 0 && plan.sourceClipSeat !== first.sourceClipSeat) {
      throw new Error(
        `h3-timeline repair: window ${k} repairs '${plan.sourceClipSeat}' but window 0 repairs '${first.sourceClipSeat}' — the tiling joins windows of ONE timeline; two sources are two films (state one source_clip per bag)`,
      )
    }
  }
  // THE FILM-ORDER LAW, BY DERIVATION: the joined film IS the
  // windows in film order, so window 0 opens at the head and every
  // next window opens where the last ends. The starts are the
  // carrier's own arithmetic (the served doc never types a frame
  // seat), so the windows always abut — no dropped seconds, no
  // doubled render, nothing to misorder.
  let cursor = 0
  const seated: RepairPlan[] = plans.map((plan) => {
    const s = { ...plan, windowStart: cursor }
    cursor += plan.windowLength
    return s
  })
  // ── the emission: N window chains (the spine's file-join posture
  // — no in-chain assemble), each saved `<runId>/repair_w<k>`, the
  // boundary chain ordering every save, the concat joining ONE
  // `<runId>/repair` film (the film tail's own law, one spelling). ──
  const saves: OutputHandle[] = []
  const prefixes: string[] = []
  for (const [k, plan] of seated.entries()) {
    const prefix = `${runId}/repair_w${k}`
    const { trimmed } = renderMaskedEditChain(g, { ...repairSeat(plan, p, facts, g), assemble: null })
    const created = g.node('CreateVideo', {
      images: trimmed.out(0), audio: filmJoinAudio(g, trimmed.out(1)), fps: 24, bit_depth: 8,
    })
    saves.push(
      g.node('SaveVideo', {
        video: created.out(), filename_prefix: prefix,
        format: 'mp4', codec: 'h264',
      }).out(),
    )
    prefixes.push(prefix)
  }
  const boundary = chainSaveBoundaries(g, saves)
  concatSavedFilms(g, prefixes, boundary, `${runId}/repair`)
}
