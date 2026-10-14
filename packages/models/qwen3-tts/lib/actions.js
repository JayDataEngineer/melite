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
export const PRESET_SPEAKERS = [
    "none", // no preset — a loaded .qvoice owns the timbre
    "ryan", "serena", "vivian", "aiden", "eric",
    "dylan", "sohee", "ono_anna", "uncle_fu",
];
import { laneTopologyOf as kitLaneTopologyOf, parseTtsFacts as kitParseTtsFacts, ttsParamRows as kitTtsParamRows, speakSegment, cloneSegment, exportSegment, } from "@melite/comfyui-card-kit/tts-segments";
/** The lane topology per variant id — the FAMILY-OWNED data rows
 *  (the branch key is the variant pick, never a family-id switch;
 *  a variant id outside the map is a broken DECL and refuses loud). */
export const LANE_TOPOLOGY = {
    base: { synth_lane: "clone", instruction_control: false },
    // instruction_control is the GRAPH capability (the 1.7B CustomVoice
    // checkpoint wires the instruct input — the size-at-quant reshape
    // keeps it TRUE here because the variant's LARGE cell owns it; the
    // 0.6B cell's SURFACE excludes style_instruction, so the write
    // never carries it onto the small lane — surface laws the write,
    // topology wires the graph, two judges one truth).
    customvoice: { synth_lane: "speak", instruction_control: true },
    voicedesign: { synth_lane: "design", instruction_control: true },
};
/** @param model the resolved row (family ⊕ variant)
 *  @returns the lane topology the dispatch and the card's admission
 *  read */
export function laneTopologyOf(model) {
    return kitLaneTopologyOf(model, LANE_TOPOLOGY, "qwen3-tts");
}
/** The tts facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing model_path refuses field-named here, at
 * registration and at compose.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factories read */
export function parseTtsFacts(raw) {
    return kitParseTtsFacts(raw, "qwen3-tts speak");
}
/** The speak action: the tts lane — three honest branches keyed on
 * the resolved variant topology (persona synthesis, Base clone,
 * VoiceDesign export), never a family-id switch; all three lanes
 * live under this ONE family (the size-at-quant fold). */
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
        // three lanes under ONE family (the size-at-quant fold): the
        // design lane's "speak" IS the export (a persona is born, not
        // performed), the clone lane composes the reference, everything
        // else is persona synthesis.
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
