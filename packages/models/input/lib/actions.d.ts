import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the prep segment reads: nothing — the
 * lane is weightless (every wire value comes from params). */
export type PrepFacts = Record<string, never>;
export type PrepParams = Record<string, unknown>;
/** The closed upscale-method set (the dropdown law, 2026-10-24):
 *  ComfyUI core ImageScale's own combo values, grounded in the live
 *  engine's object_info (not memory). The input-prep card's
 *  scale_method vocabulary serves THIS export — one truth, two
 *  consumers, so a card-authored copy cannot drift from what the
 *  engine accepts. */
export declare const SCALE_METHODS: readonly ["nearest-exact", "bilinear", "area", "bicubic", "lanczos"];
/** The minimum sane dimension (the blank-image law, 2026-10-24): a
 *  crop or scale side below 8px upscales to a blank — the live
 *  receipt is run-c5eb3f2ec512 (scale 2x1 → a 2x1 beige strip the
 *  lane served as the run's image). 8 is the universal latent
 *  divisor: no downstream model in the estate can process a side
 *  below 8px, so nothing legitimate composes smaller. The
 *  input-prep card's gate serves THIS export — one truth. */
export declare const MIN_DIM = 8;
/** The weightless door: the family declares no lane_inputs, so
 * there is nothing to parse and nothing that can drift. The raw
 * view rides unvalidated by contract (absent ≡ {}).
 *  @param _raw the resolved lane_inputs (empty for this family)
 *  @returns the vacuous facts shape */
export declare function parsePrepFacts(_raw: LaneInputsFacts): PrepFacts;
/** The staged-source transform action: audio passthrough
 * (LoadAudio→SaveAudio) or image LoadImage→[crop]→[scale]→SaveImage
 * under <run>/input_prep. */
export declare const prep: ComfyActionSpec<PrepParams, PrepFacts>;
//# sourceMappingURL=actions.d.ts.map