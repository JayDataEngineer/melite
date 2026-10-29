import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
import type { H3Facts } from './actions.js';
/** One legal composition of the stated extension. */
export interface WindowComposition {
    readonly windows: number;
    readonly windowFrames: number;
    readonly deliveredFrames: number;
}
/** THE COMPOSITION SOLVER (pure; the door's whole law beyond one
 * window): across every legal window count, the grid lengths on
 * both sides of the exact requirement — the smallest that delivers
 * ≥ stated (ceil) and the largest that delivers ≤ stated (floor) —
 * looking for an EXACT delivery; else a loud refusal naming the
 * neighboring compositions (max under, min over).
 * @param totalFrames the stated extension, frames at the film clock
 * @param where the refusal's voice ('h3-timeline extend')
 * @param overlap the per-seam context overlap (the policy's 39)
 * @returns the exact composition */
export declare function solveWindowComposition(totalFrames: number, where: string, overlap?: number): WindowComposition;
/** The extend renderer: validates the bound entry, then composes the
 * fresh-continuation chain plus the join. Like the swap and repair,
 * the film path never reaches here (the card branches on a non-empty
 * extend bag and refuses a bag under an armed reshoot, replace, or
 * repair — one door per doc), and the emission ends in the
 * joined-film SaveVideo.
 * @param entry the extend mod's single bound entry
 * @param p the walked doc params (the lora mod bag + SLA/shift knobs
 * — the family plane this extension renders under)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the join prefixes ride it) */
export declare function renderH3Extend(entry: Record<string, unknown>, p: Record<string, unknown>, facts: H3Facts, g: GraphBuilder, runId: string): void;
//# sourceMappingURL=extend.d.ts.map