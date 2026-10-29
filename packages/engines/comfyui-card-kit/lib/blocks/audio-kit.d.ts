import { GraphBuilder, OutputHandle, type NodeRef } from '../graph.js';
import { type PromptGraph, type StripTable } from '../graph.js';
import type { ModelFacts } from '../facts.js';
/** The AudiocoreTTS optional-input defaults the engine pin autofills
 *  (object_info pin). Renderer-passed inputs merge OVER these. The
 *  SFX keys carry the vendored pipeline's own quality point
 *  (guidance_scale 4.0 / num_inference_steps 100 — the pipeline's
 *  __call__ defaults, pipeline_moss_soundeffect.py:171-172; the old
 *  5.0/50 was the inner wan_audio layer's floor, the 2026-09-23
 *  quality catch). The moss-sfx pipeline-truth wall judges this pin
 *  against the pipeline's parsed values. */
export declare const AUDIACORE_TTS_AUTOFILL: {
    readonly duration_seconds: 10;
    readonly guidance_scale: 4;
    readonly instruct: "";
    readonly language: "";
    readonly num_inference_steps: 100;
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
export declare const TTS_STRIP: StripTable;
/** The tts card's finalize (the B1 cure): strip the empty-string
 *  autofill rows at the compose door — service.ts's `def.finalize`
 *  seam. The engine's own kw defense stays as the backstop; the
 *  serialized graph is the receipt, and it now carries only what
 *  the run actually states. */
export declare function finalizeTts(graph: PromptGraph): PromptGraph;
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
