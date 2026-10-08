import { requireText } from "./facts.js";
import { mintSeed, voiceLockSeed } from "./graph-helpers.js";
import { assertModUse } from "./mods/guard.js";
import { AUDIACORE_TTS_AUTOFILL, AUDIACORE_STUDIO_AUTOFILL, loadAudiocore, saveAudio, } from "./blocks/audio-kit.js";
import { qvoiceUse } from "./lanes-audio.js";
/** @param model the resolved row (family ⊕ variant)
 *  @param topology the family's LANE_TOPOLOGY data
 *  @param label the refusing family tag, message-prefixed
 *  @returns the lane topology the dispatch and the card's admission
 *  read
 *  @throws Error when the resolved variant has no topology row (a
 *  broken DECL refuses loud, never a silent default) */
export function laneTopologyOf(model, topology, label) {
    const key = typeof model.defaults.variant === 'string' ? model.defaults.variant : '';
    const topo = topology[key];
    if (topo === undefined) {
        throw new Error(`${label}: no lane topology for variant ${JSON.stringify(key)} — the DECL declares no such lane`);
    }
    return topo;
}
/** The tts facts door: the resolved lane_inputs parsed into the
 *  closed shape — a missing model_path refuses field-named here, at
 *  registration and at compose.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @param label the refusing door's name (family + action)
 *  @returns the typed facts the segment factories read */
export function parseTtsFacts(raw, label) {
    return { model_path: requireText(raw, 'model_path', label) };
}
/** The 13-row surface both TTS actions declare. The seed row is the
 *  one seam: `speak` carries it PLAIN (the voice-lock law — the mint
 *  sits inside build, branch-local, never sentinel-pre-minted);
 *  `export` carries the sentinel rule (its single mint has no lock
 *  to preserve).
 *  @param sentinelSeed true for the export action's seed row
 *  @param presetSpeakers the family's voice enum options
 *  @returns the declared param rows */
export function ttsParamRows(sentinelSeed, presetSpeakers) {
    return [
        { name: 'text', type: 'string' },
        { name: 'voice', type: 'enum', options: presetSpeakers },
        { name: 'style_instruction', type: 'string' },
        { name: 'design_prompt', type: 'string' },
        { name: 'ref_audio', type: 'string' },
        { name: 'ref_text', type: 'string' },
        { name: 'voice_name', type: 'string' },
        { name: 'temperature', type: 'number', bounds: [0.05, 2] },
        { name: 'top_p', type: 'number', bounds: [0, 1] },
        { name: 'top_k', type: 'number', bounds: [0, 1000] },
        { name: 'speed', type: 'number', bounds: [0.5, 2] },
        { name: 'repetition_penalty', type: 'number', bounds: [0.8, 2] },
        sentinelSeed
            ? { name: 'seed', type: 'number', rule: 'seed-sentinel' }
            : { name: 'seed', type: 'number' },
    ];
}
/** The speak segment: a stated .qvoice performs the text through
 *  the studio's clone pipeline (the voice-lock LOAD half); otherwise
 *  AudiocoreTTS synthesis with the persona default + the 1:1
 *  generate kwargs (absent rows ride the autofill pin). */
export function speakSegment(p, model, g, runId) {
    const use = qvoiceUse(p);
    if (use)
        return useSegment(p, model, g, runId, use.path, use.strength);
    const seed = mintSeed(p);
    const loaded = loadAudiocore(g, model);
    const synth = g.node('AudiocoreTTS', {
        ...AUDIACORE_TTS_AUTOFILL,
        model: loaded,
        prompt: p.text,
        mode: typeof model.defaults.mode === 'string' ? model.defaults.mode : 'tts',
        voice: p.voice || (typeof model.defaults.voice === 'string' ? model.defaults.voice : ''),
        instruct: (p.style_instruction ?? ''),
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
 *  studio's generate mode with the lock seed derived from the
 *  artifact path when unstated. */
export function useSegment(p, model, g, runId, path, strength) {
    assertModUse(model, 'qvoice');
    const loaded = loadAudiocore(g, model);
    const studio = g.node('AudiocoreVoiceStudio', {
        ...AUDIACORE_STUDIO_AUTOFILL,
        model: loaded,
        mode: 'generate',
        qvoice_path: path,
        text: p.text,
        instruct: (p.style_instruction ?? ''),
        temperature: p.temperature,
        voice_strength: strength,
        seed: voiceLockSeed(p, path),
    });
    return saveAudio(g, studio.out(), `${runId}/tts`);
}
/** The clone segment: the Base cloner (reference audio +
 *  transcript in, the speaker's voice out); a stated .qvoice
 *  performs through the studio's generate pipeline instead (the
 *  qvoice carry — works across ALL qwen3-tts). */
export function cloneSegment(p, model, g, runId) {
    const use = qvoiceUse(p);
    if (use)
        return useSegment(p, model, g, runId, use.path, use.strength);
    const seed = mintSeed(p);
    const loaded = loadAudiocore(g, model);
    const synth = g.node('AudiocoreTTS', {
        ...AUDIACORE_TTS_AUTOFILL,
        model: loaded,
        prompt: p.text,
        mode: typeof model.defaults.mode === 'string' ? model.defaults.mode : 'clone',
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
/** The export segment: the studio's export_lite on the persona
 *  description + the Design mod's name — the .qvoice persists into
 *  the run's own tree (One copy node after the sample). */
export function exportSegment(p, model, g, runId) {
    assertModUse(model, 'qvoice_save');
    const seed = mintSeed(p);
    const loaded = loadAudiocore(g, model);
    const studio = g.node('AudiocoreVoiceStudio', {
        ...AUDIACORE_STUDIO_AUTOFILL,
        model: loaded,
        mode: 'export_lite',
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
    g.node('MeliteQVoiceCopy', {
        voice_name: p.voice_name.trim(),
        dest_prefix: `${runId}/voices`,
        audio: studio.out(),
    });
    return save;
}
//# sourceMappingURL=tts-segments.js.map
