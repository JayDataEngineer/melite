import { AUDIACORE_STUDIO_AUTOFILL, AUDIACORE_TTS_AUTOFILL, loadAudiocore, mintSeed, qvoiceUse, saveAudio, voiceLockSeed, } from "@melite/comfyui-card-kit";
import { assertModUse } from "@melite/comfyui-card-kit/guard";
import { requireText } from "@melite/comfyui-card-kit/facts";
import { PRESET_SPEAKERS } from "@melite/models-qwen3-tts";
export const LANE_TOPOLOGY = {
    base: { synth_lane: "clone", instruction_control: false },
    customvoice: { synth_lane: "speak", instruction_control: true },
    voicedesign: { synth_lane: "design", instruction_control: true },
};
/** @param model the resolved row (family ⊕ variant)
 *  @returns the lane topology the dispatch and the card's admission
 *  read */
export function laneTopologyOf(model) {
    const key = typeof model.defaults.variant === "string" ? model.defaults.variant : "";
    const topo = LANE_TOPOLOGY[key];
    if (topo === undefined) {
        throw new Error(`qwen3-tts-voicedesign: no lane topology for variant ${JSON.stringify(key)} — the DECL declares no such lane`);
    }
    return topo;
}
/** The tts facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing model_path refuses field-named here, at
 * registration and at compose.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factories read */
export function parseTtsFacts(raw) {
    return { model_path: requireText(raw, "model_path", "qwen3-tts-voicedesign speak") };
}
/** The speak segment: a stated .qvoice performs the text through
 * the studio's clone pipeline (the voice-lock LOAD half); otherwise
 * AudiocoreTTS synthesis with the persona default + the 1:1
 * generate kwargs (absent rows ride the autofill pin). */
function speakSegment(p, model, g, runId) {
    const use = qvoiceUse(p);
    if (use)
        return useSegment(p, model, g, runId, use.path, use.strength);
    const seed = mintSeed(p);
    const loaded = loadAudiocore(g, model);
    const synth = g.node("AudiocoreTTS", {
        ...AUDIACORE_TTS_AUTOFILL,
        model: loaded,
        prompt: p.text,
        mode: typeof model.defaults.mode === "string" ? model.defaults.mode : "tts",
        voice: p.voice || (typeof model.defaults.voice === "string" ? model.defaults.voice : ""),
        instruct: (p.style_instruction ?? ""),
        temperature: p.temperature,
        ...(p.top_p !== undefined && p.top_p !== null ? { top_p: p.top_p } : {}),
        ...(p.top_k !== undefined && p.top_k !== null ? { top_k: p.top_k } : {}),
        ...(p.speed !== undefined && p.speed !== null ? { speed: p.speed } : {}),
        ...(p.repetition_penalty !== undefined && p.repetition_penalty !== null ? { repetition_penalty: p.repetition_penalty } : {}),
        seed,
    });
    return saveAudio(g, synth.out(), `${runId}/tts`);
}
/** The use segment: a saved persona performs the text — the
 * studio's generate mode with the lock seed derived from the
 * artifact path when unstated. */
function useSegment(p, model, g, runId, path, strength) {
    assertModUse(model, "qvoice");
    const loaded = loadAudiocore(g, model);
    const studio = g.node("AudiocoreVoiceStudio", {
        ...AUDIACORE_STUDIO_AUTOFILL,
        model: loaded,
        mode: "generate",
        qvoice_path: path,
        text: p.text,
        instruct: (p.style_instruction ?? ""),
        temperature: p.temperature,
        voice_strength: strength,
        seed: voiceLockSeed(p, path),
    });
    return saveAudio(g, studio.out(), `${runId}/tts`);
}
/** The clone segment: the Base cloner (reference audio +
 * transcript in, the speaker's voice out); a stated .qvoice
 * performs through the studio's generate pipeline instead (the
 * qvoice carry — works across ALL qwen3-tts). */
function cloneSegment(p, model, g, runId) {
    const use = qvoiceUse(p);
    if (use)
        return useSegment(p, model, g, runId, use.path, use.strength);
    const seed = mintSeed(p);
    const loaded = loadAudiocore(g, model);
    const synth = g.node("AudiocoreTTS", {
        ...AUDIACORE_TTS_AUTOFILL,
        model: loaded,
        prompt: p.text,
        mode: typeof model.defaults.mode === "string" ? model.defaults.mode : "clone",
        reference_audio: p.ref_audio,
        reference_text: p.ref_text,
        temperature: p.temperature,
        ...(p.top_p !== undefined && p.top_p !== null ? { top_p: p.top_p } : {}),
        ...(p.top_k !== undefined && p.top_k !== null ? { top_k: p.top_k } : {}),
        ...(p.speed !== undefined && p.speed !== null ? { speed: p.speed } : {}),
        ...(p.repetition_penalty !== undefined && p.repetition_penalty !== null ? { repetition_penalty: p.repetition_penalty } : {}),
        seed,
    });
    return saveAudio(g, synth.out(), `${runId}/tts`);
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
    params: [
        { name: "text", type: "string" },
        { name: "voice", type: "enum", options: PRESET_SPEAKERS },
        { name: "style_instruction", type: "string" },
        { name: "design_prompt", type: "string" },
        { name: "ref_audio", type: "string" },
        { name: "ref_text", type: "string" },
        { name: "voice_name", type: "string" },
        { name: "temperature", type: "number", bounds: [0.05, 2] },
        { name: "top_p", type: "number", bounds: [0, 1] },
        { name: "top_k", type: "number", bounds: [0, 1000] },
        { name: "speed", type: "number", bounds: [0.5, 2] },
        { name: "repetition_penalty", type: "number", bounds: [0.8, 2] },
        { name: "seed", type: "number" },
    ],
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
/** The export segment: the studio's export_lite on the persona
 * description + the Design mod's name — the .qvoice persists into
 * the run's own tree (One copy node after the sample). */
function exportSegment(p, model, g, runId) {
    assertModUse(model, "qvoice_save");
    const seed = mintSeed(p);
    const loaded = loadAudiocore(g, model);
    const studio = g.node("AudiocoreVoiceStudio", {
        ...AUDIACORE_STUDIO_AUTOFILL,
        model: loaded,
        mode: "export_lite",
        name: p.voice_name.trim(),
        instruct: p.design_prompt.trim(),
        sample_text: p.text,
        temperature: p.temperature,
        top_p: p.top_p,
        speed: p.speed,
        repetition_penalty: p.repetition_penalty,
        seed,
    });
    const save = saveAudio(g, studio.out(), `${runId}/design`);
    g.node("MeliteQVoiceCopy", {
        voice_name: p.voice_name.trim(),
        dest_prefix: `${runId}/voices`,
        audio: studio.out(),
    });
    return save;
}
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
    params: [
        { name: "text", type: "string" },
        { name: "voice", type: "enum", options: PRESET_SPEAKERS },
        { name: "style_instruction", type: "string" },
        { name: "design_prompt", type: "string" },
        { name: "ref_audio", type: "string" },
        { name: "ref_text", type: "string" },
        { name: "voice_name", type: "string" },
        { name: "temperature", type: "number", bounds: [0.05, 2] },
        { name: "top_p", type: "number", bounds: [0, 1] },
        { name: "top_k", type: "number", bounds: [0, 1000] },
        { name: "speed", type: "number", bounds: [0.5, 2] },
        { name: "repetition_penalty", type: "number", bounds: [0.8, 2] },
        { name: "seed", type: "number", rule: "seed-sentinel" },
    ],
    facts: parseTtsFacts,
    build({ p, model, g, runId }) {
        return exportSegment(p, model, g, runId).out();
    },
};
//# sourceMappingURL=actions.js.map
