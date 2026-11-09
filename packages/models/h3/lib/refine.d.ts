import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
import type { OutputHandle } from '@melite/comfyui-card-kit/graph';
import type { H3Facts } from './actions.js';
/** The learned 3D-conv upscale weights (the schema's upscale_model
 *  seat carries this same single option — one file, one spelling, no
 *  hand-spelled alternatives). */
export declare const REFINE_UPSCALE_MODEL = "minimax_h3_latent_upscaler_3d_bf16.safetensors";
/** The 2x pass's measured too-long line, in frames at the film clock
 *  (24 fps). The friction report's §12.2/§13.2 sweep on the operator's
 *  box: 56 f and 90 f pass at 2x (2688×1536, 48 kHz); 141 f OOMs,
 *  needing 1.06 GiB more with 20.13 GiB already resident. H3's memory
 *  grows monotonically with the window, so there is no OOM mystery
 *  and no ceiling to press (operator 2026-11-15: "There is no OOM
 *  error — we have the CARRY CONTEXT, so the OOM is just the WINDOWS
 *  BEING TOO LONG"): a window past this point is just too long, and
 *  the door refuses it by name instead of burning a render to find
 *  out. */
export declare const REFINE_2X_OOM_FRAMES = 141;
/** The refine window's default length in seconds — 2.33 s at 24 fps
 *  rounds to 56 f, the 2 s class's rung of the engine's 22+17k token
 *  grid (5, 22, 39, 56, 73, 90 …). The design is the ~2 s window
 *  joined by the context carry (FRICTION_3 W-7, operator: "for the
 *  refine flow it is two seconds, not five bro. That is the POINT of
 *  the context carry"): the carry is what makes a short window
 *  seamless, so the design never needs a wider window at all. A default that OOMs is the F24 burn: the arm used to load
 *  the WHOLE staged clip, so any film longer than ~4 s died at this
 *  variant. */
export declare const REFINE_DEFAULT_CLIP_SECONDS = 2.33;
/** The hard-cut workaround's wide window, in frames — 90 f measured
 *  GREEN at 2x on the operator's box (2688×1536, 48 kHz). It existed
 *  for ONE reason: while the carry was dead, wider windows meant
 *  fewer hard-cut seams. The carry is served now (F3-14 cured,
 *  2026-11-15), so the fewer-seams frame is retired — there is no
 *  wide-window advice to give, a too-long window is just too long.
 *  The constant stays as the measured-green datapoint (history), and
 *  the export stays because the parity walls pin the number: NO door
 *  reads it and no served copy offers it as a choice. */
export declare const REFINE_WORKAROUND_WIDE_FRAMES = 90;
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
/** THE CARRY RE-ARM (F3-14 engine cure, 2026-11-15, operator order):
 *  the carried refine is LIVE again. The engine death the stand-down
 *  refused (window 1 dying at its handoff with `ValueError:
 *  Drift-Control AV packed mask does not match its audio stream`) is
 *  cured at the handoff that burned: the vendored
 *  MinimaxH3LatentUpscaler3DRefineHandoff clone-strips any foreign
 *  dynamic denoise-mask patch (the Drift-Control AV function seeded
 *  for the carried window's streams) before its guider samples the
 *  enlarged grid — the estate python wall
 *  tests/test_h3_refine_handoff_strip.py judges the cure live, pins
 *  the burn's verbatim ValueError, and reds if the strip ever leaves
 *  the pass. The shape judges (token-exact carries, one film, no
 *  gaps, the 141 f ceiling) stay law. */
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