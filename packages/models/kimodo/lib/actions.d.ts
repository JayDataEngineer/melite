import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the compose segment reads. */
export type KimodoFacts = {
    readonly model_path: string;
};
/** The gated params doc the compose segment reads (the card's
 * schema walk validated types and bounds — a same-process typed
 * boundary; the seed arrives minted through the declared
 * seed-sentinel rule, so the ported lane's own mint is a
 * pass-through). */
export type KimodoParams = Record<string, unknown>;
/** The compose facts door: the resolved lane_inputs parsed into
 * the closed shape — a missing model_path refuses field-named
 * here, never composes a KimodoLoader on an empty directory.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export declare function parseKimodoFacts(raw: LaneInputsFacts): KimodoFacts;
/** The compose action: the motion_t1 block — Kimodo checkpoint
 * lane + optional preview bake (the prompt admission stays on the
 * card). */
export declare const compose: ComfyActionSpec<KimodoParams, KimodoFacts>;
//# sourceMappingURL=actions.d.ts.map
