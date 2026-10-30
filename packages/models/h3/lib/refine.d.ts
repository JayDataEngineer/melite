import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
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
/** The refine renderer: validates the bound entry, then composes
 *  the standalone second pass. Like the swap, the film path never
 *  reaches here (the card branches on a non-empty refine bag, and a
 *  bag under an armed reshoot — or beside any edit arm — refuses
 *  loud: one door per doc), and the emission ends in SaveVideo (the
 *  extend terminal's own file law — no ChainAssemble: a refine has
 *  no loop lineage to assemble).
 * @param entry the refine mod's single bound entry
 * @param p the walked doc params (the lora mod bag + scheduler knobs
 * — the family plane this refine renders under)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the refine filename rides it) */
export declare function renderH3Refine(entry: Record<string, unknown>, p: Record<string, unknown>, facts: H3Facts, g: GraphBuilder, runId: string): void;
//# sourceMappingURL=refine.d.ts.map
