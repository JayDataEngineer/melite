import { type ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { LaneInputsFacts, ModelFacts } from "@melite/comfyui-card-kit/facts";
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
export type { TtsFacts, TtsParams, TtsLaneTopology } from "@melite/comfyui-card-kit/tts-segments";
import type { TtsFacts, TtsLaneTopology, TtsParams } from "@melite/comfyui-card-kit/tts-segments";
/** The lane topology per variant id — the FAMILY-OWNED data rows
 *  (the branch key is the variant pick, never a family-id switch;
 *  a variant id outside the map is a broken DECL and refuses loud). */
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
/** The speak action: the tts lane — three honest branches keyed on
 * the resolved variant topology (persona synthesis, Base clone,
 * VoiceDesign export), never a family-id switch; all three lanes
 * live under this ONE family (the size-at-quant fold). */
export declare const speak: ComfyActionSpec<TtsParams, TtsFacts>;
/** The export action: the persona SAVE half — fires from any lane
 * when the SAVE QVOICE boolean + the persona description both ride
 * (admission stays on the card). */
export declare const exportAction: ComfyActionSpec<TtsParams, TtsFacts>;
//# sourceMappingURL=actions.d.ts.map
