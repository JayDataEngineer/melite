import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the compose segment reads. */
export type Yue2Facts = {
    readonly checkpoint: string;
};
/** The gated params doc the compose segment reads (the card's
 * schema walk validated types and bounds — a same-process typed
 * boundary; the seed arrives minted through the declared
 * seed-sentinel rule, so the ported mint below is a pass-through). */
export type Yue2Params = Record<string, unknown>;
/** The compose facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing checkpoint refuses field-named here,
 * never composes with an empty filename.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export declare function parseYue2Facts(raw: LaneInputsFacts): Yue2Facts;
/** The compose action: YuE2-3B — CheckpointLoaderSimple on the
 * family's own file, YuE2GenerateABC planning (mode off composes no
 * planner — the engine's own off mode), YuE2GenerateMusic (its
 * seconds output sizes the latent), KSampler dpm_2/sgm_uniform at
 * cfg 1 (guidance lives on the AR side), VAEDecodeAudio,
 * SaveAudioAdvanced mp3 under <run>/music. */
export declare const compose: ComfyActionSpec<Yue2Params, Yue2Facts>;
//# sourceMappingURL=actions.d.ts.map