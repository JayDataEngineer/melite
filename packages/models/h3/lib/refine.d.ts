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
 * @param runId the run tree's id (the refine filename rides it) */
export declare function renderH3Refine(entry: Record<string, unknown>, p: Record<string, unknown>, facts: H3Facts, g: GraphBuilder, runId: string): void;
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
 *  WHY THERE IS NO `MiniMaxH3FiniteLatentContinuation` HERE (the
 *  carry question, settled 2026-11-13 against the installed pack):
 *  the film's own seam node carries a JOINT AV latent — its body
 *  splits video AND audio out of ONE latent dict
 *  (`_h3_streams(target_latent)`, experimental_latent_guide.py:98-190,
 *  installed at data/runtime/comfyui/custom_nodes/
 *  comfyui-minimax-h3-timeline-director/) — while the refine handoff
 *  consumes SPLIT `latent` + `audio_latent` streams. The census holds
 *  no joint-AV constructor (`model-facts.json`), so nothing can build
 *  the dict the node expects from a refine window's encoders; wiring
 *  it would be a graph that cannot run. The seam therefore stays the
 *  honest fallback the skill labels (head-trim + in-graph join), and
 *  the real carry is the separate-run chain path (upscale[]'s store)
 *  or the Continuum pack's same-execution `refine_state`, never a
 *  hand-wired continuation on this seat. The wall pins the absence so
 *  a future agent does not re-wire it blind.
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
