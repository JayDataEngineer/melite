import { PRESET_SPEAKERS } from "@melite/models-qwen3-tts";
import { laneTopologyOf as kitLaneTopologyOf, parseTtsFacts as kitParseTtsFacts, ttsParamRows as kitTtsParamRows, speakSegment, cloneSegment, exportSegment, } from "@melite/comfyui-card-kit/tts-segments";
/** The lane topology per variant id — the FAMILY-OWNED data rows
 *  (the branch key is the variant pick, never a family-id switch;
 *  a variant id outside the map is a broken DECL and refuses loud). */
export const LANE_TOPOLOGY = {
    base: { synth_lane: "clone", instruction_control: false },
    customvoice: { synth_lane: "speak", instruction_control: true },
    voicedesign: { synth_lane: "design", instruction_control: true },
};
/** @param model the resolved row (family ⊕ variant)
 *  @returns the lane topology the dispatch and the card's admission
 *  read */
export function laneTopologyOf(model) {
    return kitLaneTopologyOf(model, LANE_TOPOLOGY, "qwen3-tts-voicedesign");
}
/** The tts facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing model_path refuses field-named here, at
 * registration and at compose.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factories read */
export function parseTtsFacts(raw) {
    return kitParseTtsFacts(raw, "qwen3-tts-voicedesign speak");
}
/** The speak action: the tts lane — three honest branches keyed on
 * the resolved synth_lane DATA (persona synthesis, Base clone,
 * design export), never a family-id switch. */
export const speak = {
    id: "speak",
    inputs: [],
    outputs: [{ name: "audio", kind: "AUDIO" }],
    // THE DECLARED SURFACE (the write plane, phase 2): the tts card
    // schema's own types and bounds — the family door judges defaults
    // and variant presets against this row. The voice enum is the
    // family's own preset set (PRESET_SPEAKERS above); the seed mints
    // INSIDE build (the voice-lock law — one mint seat, the build's),
    // so it declares plain, not sentinel-ruled.
    params: kitTtsParamRows(false, PRESET_SPEAKERS),
    facts: parseTtsFacts,
    build({ p, model, g, runId }) {
        const lane = laneTopologyOf(model).synth_lane;
        if (lane === "design")
            return exportSegment(p, model, g, runId).out();
        if (lane === "clone")
            return cloneSegment(p, model, g, runId).out();
        return speakSegment(p, model, g, runId).out();
    },
};
/** The export action: the persona SAVE half — fires from any lane
 * when the Design mod's name + the persona description both ride
 * (admission stays on the card). */
export const exportAction = {
    id: "export",
    inputs: [],
    outputs: [{ name: "qvoice", kind: "AUDIO" }],
    // THE DECLARED SURFACE (the write plane, phase 2): the tts card
    // schema's own types and bounds — the family door judges defaults
    // and variant presets against this row. The voice enum is the
    // family's own preset set (PRESET_SPEAKERS above); the seed mints
    // INSIDE build (the voice-lock law — one mint seat, the build's),
    // so it declares plain, not sentinel-ruled.
    params: kitTtsParamRows(true, PRESET_SPEAKERS),
    facts: parseTtsFacts,
    build({ p, model, g, runId }) {
        return exportSegment(p, model, g, runId).out();
    },
};
//# sourceMappingURL=actions.js.map
