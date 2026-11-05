import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
import type { OutputHandle } from '@melite/comfyui-card-kit/graph';
import type { H3Facts } from './actions.js';
/** The learned 3D-conv upscale weights (the schema's upscale_model
 *  seat carries this same single option — one file, one spelling, no
 *  hand-spelled alternatives). */
export declare const REFINE_UPSCALE_MODEL = "minimax_h3_latent_upscaler_3d_bf16.safetensors";
/** The 2x pass's measured memory ceiling, in frames at the film clock
 *  (24 fps). The friction report's §12.2/§13.2 sweep on the operator's
 *  box: 56 f and 90 f pass at 2x (2688×1536, 48 kHz); 141 f OOMs,
 *  needing 1.06 GiB more with 20.13 GiB already resident. H3's memory
 *  grows monotonically with the window, so a window past the measured
 *  OOM point cannot fit at this variant — the door refuses it by name
 *  instead of burning a render to find out. */
export declare const REFINE_2X_OOM_FRAMES = 141;
/** The refine window's default length in seconds — 90 f at 24 fps, the
 *  widest window the sweep measured GREEN at 2x. A default that OOMs is
 *  the F24 burn: the arm used to load the WHOLE staged clip, so any
 *  film longer than ~4 s died at this variant. */
export declare const REFINE_DEFAULT_CLIP_SECONDS = 3.75;
/** The refine auto-tile's default carried overlap, in frames at the
 *  film clock — the film's own seam (SEAM_OVERLAP_FRAMES), which is
 *  also token-exact (5, 22, 39 …), so the default auto-tile takes the
 *  carry face: the windows chain through the film's own latent
 *  continuation across every join. Imported, never hand-typed
 *  (refine-window audit D1: the card must never carry a hand-typed
 *  copy of a measured constant — and the overlap that matches the
 *  generation seam grid is the family contract's own number). */
export declare const REFINE_DEFAULT_OVERLAP_FRAMES = 22;
/** The arm predicate: BAG PRESENCE — the same law as the
 *  replace/repair/extend/reshoot arms (a commission is armed when
 *  its bag is a NON-EMPTY ARRAY). Absent or empty bag = the compose
 *  never sees the chain (byte-stable graphs).
 * @param p the gated compose doc
 * @returns true when the refine bag carries at least one entry */
export declare function refineArmed(p: Record<string, unknown>): boolean;
/** ONE refine window's loader + save seats (the loop's coordinate).
 *  Frames at the film clock (24 fps) — the loader's own units. */
export interface RefineWindowSeat {
    /** the window's frame cap (the loader's `frame_load_cap`) */
    cap: number;
    /** the window's first frame (the loader's `skip_first_frames`) */
    skip: number;
    /** frames trimmed off this window's OWN head (k≥2 carries the
     *  previous window's tail; 0 = the first window, no carry) */
    overlapFrames: number;
    /** this window's SaveVideo prefix (the run tree's own spelling) */
    prefix: string;
}
/** THE FAMILY PLANE, the five seats every refine window rides: the
 *  film's own masked-edit plane (one unet stack with the lora bag,
 *  one clip, the two VAEs). The carry face composes it ONCE for the
 *  whole film; a standalone window builds its own. */
export interface RefinePlane {
    readonly sigmaModel: OutputHandle;
    readonly samplerSel: OutputHandle;
    readonly clip: OutputHandle;
    readonly vaeVideo: OutputHandle;
    readonly vaeAudio: OutputHandle;
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
export declare function renderH3RefineWindow(entry: Record<string, unknown>, p: Record<string, unknown>, facts: H3Facts, g: GraphBuilder, seat: RefineWindowSeat): OutputHandle;
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
export declare function renderH3Refine(entry: Record<string, unknown>, p: Record<string, unknown>, facts: H3Facts, g: GraphBuilder, runId: string): OutputHandle;
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
export declare function refineCarryStanddown(what: string): string;
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
export declare const tokenExactCarry: (frames: number) => boolean;
/** The next token-exact carry at or above a measured span — the rung
 *  a refusal names so the fix is a stated number, not a search.
 * @param frames the measured carry in frames
 * @returns the smallest token-exact carry ≥ `frames` */
export declare const nextTokenExact: (frames: number) => number;
/** The most truthful start for the next window: the film's own 22 f
 *  seam when the previous window can hold it, else the largest
 *  token-exact carry the window can still advance from. The refusal
 *  names this frame, so the fix is one edited Start seconds.
 * @param prev the previous window's origin (cap + skip at the film clock)
 * @returns the next window's start frame, or null when the window is
 *  too short for any carried join */
export declare const lawfulCarryStart: (prev: {
    cap: number;
    skip: number;
}) => number | null;
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
export declare function assertRefineCarryLawful(entries: ReadonlyArray<Record<string, unknown>>, windows: ReadonlyArray<{
    cap: number;
    skip: number;
}>, carries: readonly number[]): void;
export declare function renderH3RefineCarry(entries: ReadonlyArray<Record<string, unknown>>, p: Record<string, unknown>, facts: H3Facts, g: GraphBuilder, windows: ReadonlyArray<{
    cap: number;
    skip: number;
}>, carries: readonly number[], runId: string): OutputHandle;
export declare function renderH3RefineBag(bag: Array<Record<string, unknown>>, p: Record<string, unknown>, facts: H3Facts, g: GraphBuilder, runId: string): OutputHandle;
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
export declare function renderH3RefineWindows(entry: Record<string, unknown>, p: Record<string, unknown>, facts: H3Facts, g: GraphBuilder, runId: string, loop: {
    windows: number;
    overlapFrames: number;
}): OutputHandle;
/** The loop's ARITHMETIC (one owner, the card and the wall both read
 *  it): how many windows cover `totalSeconds`, and where each starts.
 *  `count = ceil((total − overlap) / (clip − overlap))`, clamped to at
 *  least one; the last window may overrun the source (the loader
 *  stops at the file's own end).
 * @param totalSeconds the stated length of the source film
 * @param clipSeconds the single window's length
 * @param overlapSeconds the carried overlap
 * @returns the window count (≥ 1) */
export declare function refineWindowCount(totalSeconds: number, clipSeconds: number, overlapSeconds: number): number;
/** Where each window starts (seconds), in film order.
 * @param count the window count from {@link refineWindowCount}
 * @param clipSeconds the single window's length
 * @param overlapSeconds the carried overlap
 * @param startSeconds the first window's offset
 * @returns the window start offsets, film order */
export declare function refineWindowStarts(count: number, clipSeconds: number, overlapSeconds: number, startSeconds?: number): number[];
//# sourceMappingURL=refine.d.ts.map
