import { stripEmptyAutofill } from "../graph.js";
/** The AudiocoreTTS optional-input defaults the engine pin autofills
 *  (object_info pin). Renderer-passed inputs merge OVER these. The
 *  SFX keys carry the vendored pipeline's own quality point
 *  (guidance_scale 4.0 / num_inference_steps 100 — the pipeline's
 *  __call__ defaults, pipeline_moss_soundeffect.py:171-172; the old
 *  5.0/50 was the inner wan_audio layer's floor, the 2026-09-23
 *  quality catch). The moss-sfx pipeline-truth wall judges this pin
 *  against the pipeline's parsed values. */
export const AUDIACORE_TTS_AUTOFILL = {
    duration_seconds: 10.0,
    guidance_scale: 4.0,
    instruct: '',
    language: '',
    num_inference_steps: 100,
    reference_audio: '',
    reference_text: '',
    repetition_penalty: 1.05,
    speaker_name: '',
    speed: 1.0,
    temperature: 0.8,
    top_k: 0,
    top_p: 0.9,
    voice: '',
    voice_file: '',
    voice_pca_strengths: '',
};
/** The AudiocoreVoiceStudio optional-input defaults the engine pin
 *  autofills (object_info pin). Renderer-passed inputs merge OVER
 *  these. */
export const AUDIACORE_STUDIO_AUTOFILL = {
    emotion: '',
    language: '',
    name: '',
    qvoice_path: '',
    repetition_penalty: 1.05,
    sample_text: '',
    seed: 0,
    speed: 1.0,
    temperature: 0.9,
    text: 'Hello! This is a voice preview.',
    top_k: 50,
    top_p: 1.0,
    voice_strength: 1.0,
    voices_dir: '',
};
/** The Audiocore lanes' EMPTY-STRING strip table (the tts dossier's
 *  B1 cure, 2026-11-12): the vendored nodes declare their unset
 *  optionals with default "" (nodes.py INPUT_DECLARATIONS), the
 *  GraphBuilder's live object_info autofill writes those rows onto
 *  every node it mints, and the engine's runtime defense re-dropped
 *  them — the wire lied by nine rows on a plain studio compose. The
 *  tts card's finalize runs stripEmptyAutofill with THIS table (the
 *  h3 finalizeH3 precedent: the pass lives beside its lane). The key
 *  sets are the node classes' own empty-default declarations —
 *  including rows the hand tables above do not carry (the studio's
 *  speaker/reference_text/style_instruction arrive only through the
 *  live pin autofill) and qvoice_path (the dossier's N3 gap: the
 *  export arm never reads it, but the receipt stays honest). The
 *  walls tier derives this roster off the vendored nodes.py and
 *  refuses a drift — a new empty-default pin the strip misses. */
export const TTS_STRIP = {
    AudiocoreTTS: [
        'instruct', 'language', 'reference_audio', 'reference_text',
        'speaker_name', 'voice', 'voice_file', 'voice_pca_strengths',
    ],
    AudiocoreVoiceStudio: [
        'emotion', 'instruct', 'language', 'name', 'qvoice_path',
        'reference_audio', 'reference_text', 'sample_text', 'speaker',
        'style_instruction', 'voices_dir',
    ],
};
/** The tts card's finalize (the B1 cure): strip the empty-string
 *  autofill rows at the compose door — service.ts's `def.finalize`
 *  seam. The engine's own kw defense stays as the backstop; the
 *  serialized graph is the receipt, and it now carries only what
 *  the run actually states. */
export function finalizeTts(graph) {
    return stripEmptyAutofill(graph, TTS_STRIP);
}
/** Lane rows are generated data (facts) — read a string field, cast
 *  as read (the row is per-lane shaped; the card knows its fields). */
export function laneStr(v, fallback = '') {
    return typeof v === 'string' ? v : fallback;
}
/** The audiocore weight load: LoadAudiocoreModel from lane rows +
 *  the model's variant default. The extras JSON spacing ({"variant":
 *  "x"} — with colon spacing; an empty variant bakes extras "". */
export function loadAudiocore(g, model) {
    const li = model.lane_inputs;
    const variant = laneStr(model.defaults.variant);
    const extras = variant ? JSON.stringify({ variant }) : '';
    return g.node('LoadAudiocoreModel', {
        family: laneStr(li.family),
        model_path: laneStr(li.model_path),
        extras,
    }).out();
}
/** The audio-lane tail: SaveAudio under the prefix.
 *  @param g the graph builder
 *  @param audio the audio handle to persist
 *  @param filenamePrefix the run-scoped filename prefix
 *  @returns the SaveAudio node's ref — the lane's terminal output */
export function saveAudio(g, audio, filenamePrefix) {
    return g.node('SaveAudio', { audio, filename_prefix: filenamePrefix });
}
//# sourceMappingURL=audio-kit.js.map
