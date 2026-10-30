import { GraphBuilder, OutputHandle } from './graph.js';
import type { NodeRef, PromptGraph, StripTable } from './graph.js';
import type { LaneInputsFacts } from './facts.js';
/** The per-export TUNE (stroke 95 — every knob a mask source owns
 *  rides its bag entry; the card threads each export's own tune as
 *  the trip's fourth arm). Absent arms ride the lane-flat values
 *  (the primary's tune). */
/** The one tune vocabulary (the audit's G1: vocab + finite-check
 *  share this list — a new key added to the type but not here is a
 *  compile-time refusal, never a silent unvalidated flow). */
/** The tune bag's SHAPE — the type is the owner. */
/** THE 512-HINT STRIP (the red-box hunt's third bug, 2026-10-08):
 *  SAM3_Detect's node definition declares a bboxes DEFAULT of
 *  {0,0,512,512} (a widget seed for the UI), and the GraphBuilder
 *  autofills it onto every detect that passes no hint — a latent
 *  quarter-blind hazard on any image larger than 512px (audit
 *  2026-10-09: the observed empty mask was the 0.93 threshold, NOT
 *  this hint — 0.93 → 0.00% with and without it, 0.5 → 6.5%; the
 *  strip is correct hardening all the same). The engine's node
 *  default is Layer B truth — never edited — so the strip lives
 *  HERE: delete bboxes ONLY when it still equals the autofilled
 *  default verbatim. Non-default quads and link handles (RT-DETR's
 *  own boxes) survive untouched. KNOWN EDGE: a region drawn
 *  EXACTLY (0,0,512,512) loses its hint at runtime — benign,
 *  because the scopeMask multiply still bounds the mask to the
 *  drawn box, independent of the hint. */
export declare function finalizeMask(graph: PromptGraph): PromptGraph;
export declare const TAGGER_STRIP: StripTable;
export declare function finalizeTagger(graph: PromptGraph): PromptGraph;
export declare const TAGGER_CAPTION_TASKS: string[];
export declare const TAGGER_CAPTION_TYPES: string[];
export declare const TAGGER_CAPTION_LENGTHS: string[];
export declare const TAGGER_EXTRA_OPTIONS: string[];
/** The closed facts shape a weightless arm reads: nothing — the arm
 * is weightless (every wire value comes from params; the DRY sweep
 * C2 cure, 2026-10-18, deduped from four byte-identical family
 * doors). */
export type WeightlessFacts = Record<string, never>;
/** The gated params doc a weightless arm reads (the card's schema
 * walk validated types and bounds — a same-process typed boundary;
 * the arm reads its own subset of the card's union surface). */
export type WeightlessParams = Record<string, unknown>;
/** The weightless door: a family that declares no lane_inputs has
 * nothing to parse and nothing that can drift. The raw view rides
 * unvalidated by contract (absent ≡ {}).
 *  @param _raw the resolved lane_inputs (empty for the family)
 *  @returns the vacuous facts shape */
export declare function parseWeightlessFacts(_raw: LaneInputsFacts): WeightlessFacts;
/** The tagger card's input_image guard, verbatim from the four arms
 * (folded by the C2 cure): required, string, non-blank — the tagger
 * inverts an image, so nothing to tag is a refusal.
 *  @param p the arm's params doc
 *  @returns the validated input reference (a wired spell or a path) */
export declare function assertTagInput(p: {
    input_image?: unknown;
}): string;
/** The SaveText tail (every arm's consensus — moved verbatim from
 *  the tagger card). */
export declare function taggerSaveText(g: GraphBuilder, text: OutputHandle, prefix: string): NodeRef;
//# sourceMappingURL=lanes-image-tools.d.ts.map