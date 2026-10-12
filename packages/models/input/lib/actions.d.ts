import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the prep segment reads: nothing — the
 * lane is weightless (every wire value comes from params). */
export type PrepFacts = Record<string, never>;
/** The staged-source row the prep segment reads (the card's schema
 * walk validated types and bounds — a same-process typed boundary;
 * crop/scale rows are re-validated here because the node build reads
 * their members raw). */
/** The closed upscale-method set (the dropdown law, 2026-10-24):
 *  ComfyUI core ImageScale's own combo values, grounded in the live
 *  engine's object_info (not memory). The input-prep card's
 *  scale_method vocabulary serves THIS export — one truth, two
 *  consumers, so a card-authored copy cannot drift from what the
 *  engine accepts. */
export declare const SCALE_METHODS: readonly ["nearest-exact", "bilinear", "area", "bicubic", "lanczos"];
export type PrepParams = Record<string, unknown>;
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