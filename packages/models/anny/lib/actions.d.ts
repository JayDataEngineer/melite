import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the compose segment reads. The segment
 * reads NOTHING off the row (the anny bake is parametric — no
 * checkpoint loads), so the door is the weightless vacuous parse
 * (the tagger precedent): present to keep the action contract's
 * one-door law, refusing nothing.
 *  @param _raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the empty facts shape */
export declare function parseAnnyFacts(_raw: LaneInputsFacts): Record<string, never>;
/** The gated params doc the compose segment reads (the card's
 * schema walk validated types and bounds — a same-process typed
 * boundary). */
export type AnnyParams = Record<string, unknown>;
/** The compose action: the body's three arms + the 8-view
 * turnaround sheet (the anny_t1 segment, family-owned). */
export declare const compose: ComfyActionSpec<AnnyParams, Record<string, never>>;
/** The estimator facts door: the estimation chain reads NOTHING off
 *  a lane (no checkpoint, no encoder — the MHR regression and the
 *  SAM chain are checkpoint-free python), so the door is the
 *  weightless vacuous parse, exactly like compose's.
 *  @param _raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the empty facts shape */
export declare function parseEstimatorFacts(_raw: LaneInputsFacts): Record<string, never>;
/** The commercial photo→body chain (the hmr-estimate verb's
 *  commercial engine — the flow 'anny-hmr-commercial'):
 *  SAM 3D Body → grounded anny GLB, every link license-cleared for
 *  sale (SOMA-X Apache-2.0; sam-3d-body SAM License §1(a)/§5(a)).
 *  The person_index stays FIXED at the loudest detection (0) — the
 *  verb's own person picker is a chip knob, never a bench surface
 *  (SubActionMod law). */
export declare const estimate_commercial: ComfyActionSpec<{
    readonly photo: string;
}, Record<string, never>>;
/** The verbatim bake (the preset-load verb's backend — the flow
 *  'anny-params'): authored 11-dim rows and re-instantiated
 *  estimated params bake bit-exact (AnnyParamsToGlb — the body is
 *  parametric end-to-end, stroke 89). params_json rides verbatim —
 *  the bake validator (bake_params) judged the json at the flow's
 *  initial gate; the action never re-parses what the door owns. */
export declare const bake: ComfyActionSpec<{
    readonly params_json: string;
}, Record<string, never>>;
//# sourceMappingURL=actions.d.ts.map
