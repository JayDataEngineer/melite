import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the remesh segment reads. The segment
 * reads NOTHING off the row (the AutoRemesher binary owns its own
 * weights), so the door is the weightless vacuous parse: present
 * to keep the action contract's one-door law, refusing nothing.
 *  @param _raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the empty facts shape */
export declare function parseAutoRemesherFacts(_raw: LaneInputsFacts): Record<string, never>;
/** The gated params doc the remesh segment reads (the card's
 * schema walk validated types and bounds — a same-process typed
 * boundary). */
export type AutoRemesherParams = Record<string, unknown>;
/** The remesh action: the single AutoRemesher node — GLB in,
 * remeshed GLB out under <run>/remeshed (the family constant
 * shape, never a knob). */
export declare const remesh: ComfyActionSpec<AutoRemesherParams, Record<string, never>>;
//# sourceMappingURL=actions.d.ts.map
