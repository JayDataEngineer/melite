import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
/**
 * THE PRESET SPEAKER SET (2026-10-10, the card audit's M2).
 *
 * The nine CustomVoice personas are a CURATED product surface: the
 * vendored node takes a free `speaker_name` string and no local
 * declaration owned the list, so the card retyped it and a person
 * renaming a preset would find the form offering a name the card
 * refuses. It is declared on the action plane — the speak action's
 * `voice` param options — and both the card (tts/card.ts) and the
 * family index re-export read this one owner.
 */
export declare const PRESET_SPEAKERS: readonly string[];
/** The closed facts shape the tts segments read (model_path: the
 * audiocore load key — the ONE engine-general member this family
 * declares). */
export type TtsFacts = {
    readonly model_path: string;
};
/** The gated params doc the tts segments read (the card's schema
 * walk validated types and bounds — a same-process typed
 * boundary). */
export type TtsParams = Record<string, unknown>;
/** The lane topology per variant id (the complexity floor's stroke
 *  1): synth_lane and instruction_control are FAMILY-OWNED lane
 *  facts derived from the resolved variant, never engine-general
 *  members — the branch key is data (the variant pick), never a
 *  family-id switch. A variant id outside the map is a broken DECL
 *  and refuses loud. */
export interface TtsLaneTopology {
    readonly synth_lane: "speak" | "clone" | "design";
    readonly instruction_control: boolean;
}
export declare const LANE_TOPOLOGY: Readonly<Record<string, TtsLaneTopology>>;
/** @param model the resolved row (family ⊕ variant)
 *  @returns the lane topology the dispatch and the card's admission
 *  read */
export declare function laneTopologyOf(model: ModelFacts): TtsLaneTopology;
/** The tts facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing model_path refuses field-named here, at
 * registration and at compose.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factories read */
export declare function parseTtsFacts(raw: LaneInputsFacts): TtsFacts;
/** The speak action: the tts lane — two honest branches keyed on
 * the resolved variant topology (persona synthesis, Base clone),
 * never a family-id switch; the design lane lives on the
 * voicedesign family alone. */
export declare const speak: ComfyActionSpec<TtsParams, TtsFacts>;
/** The export action: the persona SAVE half — fires from any lane
 * when the Design mod's name + the persona description both ride
 * (admission stays on the card). */
export declare const exportAction: ComfyActionSpec<TtsParams, TtsFacts>;
//# sourceMappingURL=actions.d.ts.map
