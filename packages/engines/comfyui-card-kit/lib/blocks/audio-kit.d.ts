import { GraphBuilder, OutputHandle, type NodeRef } from '../graph.ts';
import type { ModelFacts } from '../facts.ts';
/** The AudiocoreTTS optional-input defaults the engine pin autofills
 *  (object_info pin). Renderer-passed inputs merge OVER these. */
export declare const AUDIACORE_TTS_AUTOFILL: {
    readonly duration_seconds: 10;
    readonly guidance_scale: 5;
    readonly instruct: "";
    readonly language: "";
    readonly num_inference_steps: 50;
    readonly reference_audio: "";
    readonly reference_text: "";
    readonly repetition_penalty: 1.05;
    readonly speaker_name: "";
    readonly speed: 1;
    readonly temperature: 0.8;
    readonly top_k: 0;
    readonly top_p: 0.9;
    readonly voice: "";
    readonly voice_file: "";
    readonly voice_pca_strengths: "";
};
/** The AudiocoreVoiceStudio optional-input defaults the engine pin
 *  autofills (object_info pin). Renderer-passed inputs merge OVER
 *  these. */
export declare const AUDIACORE_STUDIO_AUTOFILL: {
    readonly emotion: "";
    readonly language: "";
    readonly name: "";
    readonly qvoice_path: "";
    readonly repetition_penalty: 1.05;
    readonly sample_text: "";
    readonly seed: 0;
    readonly speed: 1;
    readonly temperature: 0.9;
    readonly text: "Hello! This is a voice preview.";
    readonly top_k: 50;
    readonly top_p: 1;
    readonly voice_strength: 1;
    readonly voices_dir: "";
};
/** Lane rows are generated data (facts) — read a string field, cast
 *  as read (the row is per-lane shaped; the card knows its fields). */
export declare function laneStr(v: unknown, fallback?: string): string;
/** The audiocore weight load: LoadAudiocoreModel from lane rows +
 *  the model's variant default. The extras JSON spacing ({"variant":
 *  "x"} — with colon spacing; an empty variant bakes extras "". */
export declare function loadAudiocore(g: GraphBuilder, model: ModelFacts): OutputHandle;
/** The audio-lane tail: SaveAudio under the prefix.
 *  @param g the graph builder
 *  @param audio the audio handle to persist
 *  @param filenamePrefix the run-scoped filename prefix
 *  @returns the SaveAudio node's ref — the lane's terminal output */
export declare function saveAudio(g: GraphBuilder, audio: OutputHandle, filenamePrefix: string): NodeRef;
//# sourceMappingURL=audio-kit.d.ts.map