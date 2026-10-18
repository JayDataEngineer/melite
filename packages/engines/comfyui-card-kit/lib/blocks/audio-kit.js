/** The AudiocoreTTS optional-input defaults the engine pin autofills
 *  (object_info pin). Renderer-passed inputs merge OVER these. */
export const AUDIACORE_TTS_AUTOFILL = {
    duration_seconds: 10.0,
    guidance_scale: 5.0,
    instruct: '',
    language: '',
    num_inference_steps: 50,
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