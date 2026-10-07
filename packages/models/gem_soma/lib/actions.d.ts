import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the rig segment reads: nothing — the lane
 * is weightless (every wire value comes from params). */
export type SomaRigFacts = Record<string, never>;
/** The gated params doc the segment reads (the card's schema walk
 * validated types and bounds — a same-process typed boundary; the
 * arm reads its own subset of the card's surface). */
export interface SomaRigParams {
    mesh_glb: string;
    preserve_texture?: boolean;
    decimate_ratio: number;
    file_format?: string;
}
/** The weightless door: the family declares no lane_inputs, so there
 * is nothing to parse and nothing that can drift.
 *  @param _raw the resolved lane_inputs (empty for this family)
 *  @returns the vacuous facts shape */
export declare function parseSomaRigFacts(_raw: LaneInputsFacts): SomaRigFacts;
/** The SOMA-77 rig: the mesh in, the template's hand-painted weights
 *  applied through the autorig pack's export node. */
export declare const rig: ComfyActionSpec<SomaRigParams, SomaRigFacts>;
//# sourceMappingURL=actions.d.ts.map
