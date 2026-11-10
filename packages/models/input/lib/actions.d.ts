import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the prep segment reads: nothing — the
 * lane is weightless (every wire value comes from params). */
export type PrepFacts = Record<string, never>;
export type PrepParams = Record<string, unknown>;
import { SCALE_METHODS, MIN_DIM, UPSCALE_MODELS, SCALE_MODEL_OPTIONS } from "./scale-vocab.js";
export { SCALE_METHODS, MIN_DIM, UPSCALE_MODELS, SCALE_MODEL_OPTIONS };
/** The weightless door: the family declares no lane_inputs, so
 * there is nothing to parse and nothing that can drift. The raw
 * view rides unvalidated by contract (absent ≡ {}).
 *  @param _raw the resolved lane_inputs (empty for this family)
 *  @returns the vacuous facts shape */
export declare function parsePrepFacts(_raw: LaneInputsFacts): PrepFacts;
/** The staged-source transform action: audio passthrough
 * (LoadAudio→SaveAudio) or image LoadImage→[crop]→[model upscale]→
 * [scale]→SaveImage under <run>/input_prep. */
export declare const prep: ComfyActionSpec<PrepParams, PrepFacts>;
//# sourceMappingURL=actions.d.ts.map
