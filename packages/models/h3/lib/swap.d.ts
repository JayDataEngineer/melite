import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
import type { H3Facts } from './actions.js';
/** The swap renderer: validates the bound entry, then composes the
 * masked-edit chain per the reference map above. The film path
 * never reaches here (the card branches ONLY on a non-empty replace
 * bag, and refuses a bag under an armed reshoot — one door per doc).
 * @param entry the replace mod's single bound entry
 * @param p the walked doc params (the lora mod bag + SLA/shift knobs —
 * the family plane this swap renders under)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the assemble filename rides it) */
export declare function renderH3Swap(entry: Record<string, unknown>, p: Record<string, unknown>, facts: H3Facts, g: GraphBuilder, runId: string): void;
//# sourceMappingURL=swap.d.ts.map