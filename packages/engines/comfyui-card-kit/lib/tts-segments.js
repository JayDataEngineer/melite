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
 *  to preserve). THE QVOICE BOOLEAN LAW (operator 2026-10-22): no
 *  voice_name row — the save is the save_qvoice boolean (the
 *  qvoice_save mod's toggle; the build mints the export name).
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
        { name: 'save_qvoice', type: 'boolean' },
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
 *  AudiocoreTTS synthesis — a stated persona rides, an unstated one
 *  OMITS the voice input entirely (the node's own default resolves
 *  it; a family that still declares a voice default fills it, the
 *  qwen3-tts no-default-voice law removed that default), plus the
 *  1:1 generate kwargs (absent rows ride the autofill pin). */
export function speakSegment(p, model, g, runId) {
    const use = qvoiceUse(p);
    if (use)
        return useSegment(p, model, g, runId, use.path, use.strength);
    // THE NONE-VOICE LAW (operator 2026-10-12): CustomVoice needs nothing
    // but the prompt. "none" (or an absent pick) is NOT a speaker name —
    // the voice key is omitted entirely so the engine node's own default
    // resolution runs (qwen3_tts.py: kwargs.get("voice", <default>)).
    // Passing "none" verbatim reached the prefill as a speaker id and
    // died native; the omission is the prompt-only run.
    const stated = p.voice || (typeof model.defaults.voice === 'string' ? model.defaults.voice : '');
    const seed = mintSeed(p);
    const loaded = loadAudiocore(g, model);
    const synth = g.node('AudiocoreTTS', {
        ...AUDIACORE_TTS_AUTOFILL,
        model: loaded,
        prompt: p.text,
        mode: typeof model.defaults.mode === 'string' ? model.defaults.mode : 'tts',
        ...(stated && stated !== 'none' ? { voice: stated } : {}),
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
    // THE OPTIONAL-CLONE LAW (operator 2026-10-12, the qwen3-tts docs
    // ruling: "the voice clone is optional, not required"): the
    // engine's own dispatch (qwen3_tts.py:149) takes the clone path
    // only when the mode forces it OR reference_audio rides — a run
    // with no reference performs the plain-TTS fallthrough (the
    // node's own speaker resolution). The pair is a voice SOURCE,
    // never a requirement: complete pair stated → mode 'clone' with
    // both refs; absent → mode 'tts' and the autofill's empty
    // reference rows ride untouched. A HALF pair never reaches this
    // seat (the card refuses it loud upstream).
    const refAudio = typeof p.ref_audio === 'string' ? p.ref_audio : '';
    const refText = typeof p.ref_text === 'string' ? p.ref_text : '';
    const complete = refAudio !== '' && refText !== '';
    const seed = mintSeed(p);
    const loaded = loadAudiocore(g, model);
    const synth = g.node('AudiocoreTTS', {
        ...AUDIACORE_TTS_AUTOFILL,
        model: loaded,
        prompt: p.text,
        mode: complete
            ? 'clone'
            : (typeof model.defaults.mode === 'string' ? model.defaults.mode : 'tts'),
        ...(complete ? { reference_audio: refAudio, reference_text: refText } : {}),
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
 *  description — the .qvoice persists into the run's own tree (One
 *  copy node after the sample). THE NAME LAW (the named-presence
 *  refinement, operator 2026-10-22: "Make sure that the 'design'
 *  mod has a popup, it can just be 'name' or something so a name
 *  can be used for the save file"): the mod's stated voice_name
 *  names BOTH nodes (the pair law — the studio's write and the
 *  copy's search key share one string); unstated ('' or absent)
 *  falls to the mint `voice-<runId>` (unique per save, the
 *  collision-numbered search key both nodes share), and the
 *  receipt names itself from the saved file. */
export function exportSegment(p, model, g, runId) {
    assertModUse(model, 'qvoice_save');
    const seed = mintSeed(p);
    const loaded = loadAudiocore(g, model);
    const stated = typeof p.voice_name === 'string' ? p.voice_name.trim() : '';
    const name = stated !== '' ? stated : `voice-${runId}`;
    // THE DESIGN WORD, REFUSED AT THE SEAT (the boot-probe 'trim' burn,
    // 2026-10-22): the card's save branch checks blankness, the preview
    // branch delegates to the variant relations — but this kit is the
    // shared library both ride, and an absent persona reached the raw
    // `.trim()` deref as a TypeError naming the method, never the
    // field. The segment names its own required word in the refusal
    // voice every probe harvests; a cast is never a gate.
    if (typeof p.design_prompt !== 'string' || p.design_prompt.trim() === '') {
        throw new Error("required param 'design_prompt' missing or empty (the studio designs a voice from the description — state who speaks)");
    }
    const studio = g.node('AudiocoreVoiceStudio', {
        ...AUDIACORE_STUDIO_AUTOFILL,
        model: loaded,
        mode: 'export_lite',
        name,
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
        voice_name: name,
        dest_prefix: `${runId}/voices`,
        audio: studio.out(),
    });
    return save;
}
/** The design PREVIEW segment (the qvoice boolean law, operator
 *  2026-10-22: a plain design run previews — the persona speaks
 *  the text, the flac lands, and NOTHING persists to the media
 *  tree): the same studio design fire as the export, with NO copy
 *  node — the embedding stays in the engine's own scratch (its
 *  cache law), and the run carries the sample only. The save is
 *  the SAVE QVOICE boolean, never the lane. */
export function designPreviewSegment(p, model, g, runId) {
    assertModUse(model, 'qvoice_save');
    const seed = mintSeed(p);
    const loaded = loadAudiocore(g, model);
    // THE DESIGN WORD, REFUSED AT THE SEAT (the boot-probe 'trim' burn,
    // 2026-10-22 — the preview path's own exposure): same voice as the
    // export segment; the cast is never a gate.
    if (typeof p.design_prompt !== 'string' || p.design_prompt.trim() === '') {
        throw new Error("required param 'design_prompt' missing or empty (the studio designs a voice from the description — state who speaks)");
    }
    const studio = g.node('AudiocoreVoiceStudio', {
        ...AUDIACORE_STUDIO_AUTOFILL,
        model: loaded,
        mode: 'export_lite',
        name: `voice-${runId}`,
        instruct: p.design_prompt.trim(),
        sample_text: p.text,
        temperature: p.temperature,
        top_p: p.top_p,
        speed: p.speed,
        repetition_penalty: p.repetition_penalty,
        seed,
    });
    return saveAudio(g, studio.out(), `${runId}/design`);
}
//# sourceMappingURL=tts-segments.js.map
