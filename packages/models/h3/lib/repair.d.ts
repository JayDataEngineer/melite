import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
import type { H3Facts } from './actions.js';
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
 * @param runId the run tree's id (the assemble filename rides it) */
export declare function renderH3Repair(entry: Record<string, unknown>, p: Record<string, unknown>, facts: H3Facts, g: GraphBuilder, runId: string): void;
//# sourceMappingURL=repair.d.ts.map
