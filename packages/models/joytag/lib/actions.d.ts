import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the tag segment reads: nothing — the arm
 * is weightless (every wire value comes from params). */
export type TagFacts = Record<string, never>;
/** The gated params doc the tag segment reads (the card's schema
 * walk validated types and bounds — a same-process typed boundary;
 * the arm reads its own subset of the card's union surface). */
export type TagParams = Record<string, unknown>;
/** The weightless door: the family declares no lane_inputs, so
 * there is nothing to parse and nothing that can drift. The raw
 * view rides unvalidated by contract (absent ≡ {}).
 *  @param _raw the resolved lane_inputs (empty for this family)
 *  @returns the vacuous facts shape */
export declare function parseTagFacts(_raw: LaneInputsFacts): TagFacts;
/** The image prompt-inversion action: the JoyTag booru tagger —
 * LoadImage (or the wired spell), CXH_JoyTag with the add/remove
 * tag lists, SaveText under <run>/tags. */
export declare const tag: ComfyActionSpec<TagParams, TagFacts>;
//# sourceMappingURL=actions.d.ts.map
