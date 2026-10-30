import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
import type { H3Facts } from './actions.js';
/** The learned 3D-conv upscale weights (the schema's upscale_model
 *  seat carries this same single option — one file, one spelling, no
 *  hand-spelled alternatives). */
export declare const REFINE_UPSCALE_MODEL = "minimax_h3_latent_upscaler_3d_bf16.safetensors";
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
