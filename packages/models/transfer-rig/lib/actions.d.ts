import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the transfer segment reads. The segment
 * reads NOTHING off the row (the transfer is path-based), so the
 * door is the weightless vacuous parse: present to keep the action
 * contract's one-door law, refusing nothing.
 *  @param _raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the empty facts shape */
export declare function parseTransferRigFacts(_raw: LaneInputsFacts): Record<string, never>;
/** The gated params doc the transfer segment reads (the card's
 * schema walk validated types and bounds — a same-process typed
 * boundary). */
export type TransferRigParams = Record<string, unknown>;
/** The transfer action: the rig copy — KimodoTransferWeights +
 * SaveRiggedModel (GPU KNN weight transfer from a rigged donor
 * onto the clothed target). */
export declare const transfer: ComfyActionSpec<TransferRigParams, Record<string, never>>;
//# sourceMappingURL=actions.d.ts.map