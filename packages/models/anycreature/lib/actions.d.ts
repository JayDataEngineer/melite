import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the bind segment reads: nothing — the lane
 * is weightless (the skeletons ride in the caller's own GLB). */
export type SpeciesBindFacts = Record<string, never>;
/** The gated params doc the segment reads (the card's schema walk
 * validated types and bounds — a same-process typed boundary). */
export interface SpeciesBindParams {
    mesh_glb: string;
    creature_glb: string;
    height_ratio: number;
    max_influences: number;
    strip_body?: boolean;
}
/** The weightless door: the family declares no lane_inputs, so there
 * is nothing to parse and nothing that can drift.
 *  @param _raw the resolved lane_inputs (empty for this family)
 *  @returns the vacuous facts shape */
export declare function parseSpeciesBindFacts(_raw: LaneInputsFacts): SpeciesBindFacts;
/** The anyCreature species bind: the caller's mesh onto the caller's
 *  creature template, persisted as a rigged GLB. */
export declare const bind: ComfyActionSpec<SpeciesBindParams, SpeciesBindFacts>;
//# sourceMappingURL=actions.d.ts.map
