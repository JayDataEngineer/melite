import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
/** The closed facts shape the sfx segment reads. */
export type SfxFacts = {
    readonly model_path: string;
};
/** The gated params doc the sfx segment reads (the card's schema
 * walk validated types and bounds — a same-process typed boundary;
 * the seed arrives minted through the declared seed-sentinel rule,
 * so the ported mint below is a pass-through). */
export type SfxParams = Record<string, unknown>;
/** The sfx facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing model_path refuses field-named here,
 * never composes a LoadAudiocoreModel on an empty directory.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export declare function parseSfxFacts(raw: LaneInputsFacts): SfxFacts;
/** The sfx action: MOSS-SoundEffect — LoadAudiocoreModel on the
 * family's own path + variant extras, AudiocoreTTS mode tts on the
 * prompt with the autofill pin, SaveAudio under <run>/sfx. */
export declare const sfx: ComfyActionSpec<SfxParams, SfxFacts>;
//# sourceMappingURL=actions.d.ts.map
