import { GraphBuilder, OutputHandle } from './graph.js';
import type { NodeRef, PromptGraph, StripTable } from './graph.js';
import { type ModelFacts } from './facts.js';
/** The lane's solver, honouring an EXPLICIT choice (a cleared select
 *  is not a choice: the lane's own default answers, exactly as the
 *  DECL cascade answers elsewhere). Exported for the family actions
 *  (the atom vocabulary: the same solver read, one vocabulary). */
export declare const laneSampler: (p: Record<string, unknown>) => string;
export declare const laneScheduler: (p: Record<string, unknown>) => string;
/** Pin autofills the image_edit lane strips post-walk for
 *  (moved verbatim from the image-edit card). */
export declare const IMAGE_EDIT_STRIP: StripTable;
export declare function finalizeImageEdit(graph: PromptGraph): PromptGraph;
/** THE IMAGE CAPACITY (the max_images law — the card and the lane
 *  RIDE the model's DECL, never a hardcoded count): total image
 *  inputs the lane opens, anchor included (2511's stock node: 3;
 *  2.1's encoder: 16). A lane that never declared max_images gets
 *  the NARROW end (3) — loud-safe by construction: over-refusal is
 *  field-named and names the missing DECL, while guessing roomy
 *  would silently drop refs past the node's own slots. */
export declare function editImageCap(model?: ModelFacts): number;
/** THE REFERENCE ORDER (the unification: image inputs and
 *  reference images are ONE concept — the anchor plus references).
 *  Legacy named slots (image2/image3 — hidden aliases from the
 *  stock node's vocabulary, still stated by old drafts, agents, and
 *  flow edges) merge FIRST, then the reference_images stack, blanks
 *  dropped — array order IS apply order on every lane. Garbage
 *  refuses LOUD (the never-drop law covers direct lane callers
 *  bypassing the schema door): a non-string ref or a non-list stack
 *  is a caller bug, never a quiet skip. */
export declare function editRefs(p: Record<string, unknown>): string[];
/** THE ONE LIST (the operator's merge, ordered three times, landed
 *  2026-10-10: input images and reference images are ONE concept —
 *  the node's own image_1..image_N autogrow slots, position 0 = the
 *  image being edited, the rest = references the prompt can cite.
 *  input_images IS the ordered list. The legacy spellings (image1
 *  the anchor, image2/image3 the numbered slots, reference_images
 *  the stack) merge into the SAME list — anchor first, numbered
 *  next, stack after — so old drafts recompose byte-stable. A
 *  stated input_images WINS over any legacy keys still riding an
 *  old draft: the legacy spellings fold away (the migration law —
 *  the operator's own history must run forward, never refuse). */
export declare function orderedInputImages(p: Record<string, unknown>): string[];
/** The firing gate (the MOD FIRING LAW, ported 1:1
 *  moved verbatim from the image-edit card): lane-promise values ride
 *  inert; anything that would change the graph refuses field-named
 *  INSTEAD of silently plain-editing.
 *
 *  THE SECOND SEAT (the max_images law): the gate reads
 *  the CAP off the model (lane_inputs.max_images — the DECL's own
 *  node truth, never a hardcoded count, never a family-id switch).
 *  Refs past cap - 1 refuse LOUD on every lane (2511: 2, 2.1: 15);
 *  the lane re-pins the same ceiling for direct callers. An absent
 *  model refuses (the old law — direct lane callers pin it). */
export declare function refuseImageEditFiring(p: Record<string, unknown>, model?: ModelFacts): void;
/** THE REGION SEGS (the generic region detailer's source): the
 * detector proposes (person = segmentation silhouette, face/hand =
 * boxes) or the painted mask converts via MaskToSEGS(combined) —
 * one region per run. grow + context_pad compose as ONE px
 * expansion (the region's working halo). Lane-agnostic.
 *
 * THE LIVE-ENGINE PINS (proven against :8188's own
 * UltralyticsDetectorProvider model list, 2026-09-22): hand is the
 * s-variant this engine ships — the n-variant pin was a stale copy
 * that would refuse at execute time. */
export declare function regionSegs(g: GraphBuilder, region: Record<string, unknown>, image: TensorRef, maskPath: string): OutputHandle;
/** THE REGION DETAILER TAIL: DetailerForEach (crop → edit → paste)
 * reworks each region at mask_detail_size/mask_denoise and saves
 * DIRECTLY — the node returns IMAGE, never a latent (a VAEDecode
 * under it is a wiring bug, not a path). Pixels outside the region
 * never change (the paste touches the seg mask only).
 * Lane-agnostic: the model/clip/vae/conditioning are whatever the
 * active lane built. */
export declare function detailerSave(g: GraphBuilder, p: Record<string, unknown>, region: Record<string, unknown>, io: {
    image: TensorRef;
    segs: OutputHandle;
    model: OutputHandle;
    clip: OutputHandle;
    vae: OutputHandle;
    positive: OutputHandle;
    negative: OutputHandle;
    seed: number;
}, runId: string): NodeRef;
/** A tensor carrier: a node's output handle, or THE SPELL ARM's raw
 *  wire value — a '$name' string naming a FromStage-wired input.
 *  The merge (rewriteSpells) substitutes the upstream producer's
 *  [node, slot] link wherever the spell rides a node input; ROW-4
 *  refuses producer links in Load* file slots, so a spelled tensor
 *  NEVER builds a loader — the spell IS the tensor. */
export type TensorRef = OutputHandle | string;
/** True when the value names a wired stage input (the $spell law):
 *  '$image1' means "the upstream stage's wired output", never a
 *  file on disk. */
export declare const isSpell: (s: string) => boolean;
//# sourceMappingURL=lanes-image.d.ts.map
