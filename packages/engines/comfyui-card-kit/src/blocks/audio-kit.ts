// Tier 2 — the audio render-kit blocks (the compose audio
// lane port). The Audiocore lanes (tts / sfx) leave the
// vendored pack's unspecified optional inputs to the engine pin
// AUTOFILL — no strip pass runs there, so the
// graphs carry those default rows verbatim. These tables are the
// lane-local calibration (they mirror the autofill-strip behavior):
// SSOT is the live engine node set (object_info via the SDK client)
// a pin refresh that moves a default must update every consumer,
// never a quiet edit here.
import { GraphBuilder, OutputHandle } from '../graph.ts'
import type { ModelFacts, LaneInputsFacts } from '../facts.ts'

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
} as const

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
} as const

/** Lane rows are generated data (facts) — read a string field, cast
 *  as read (the row is per-lane shaped; the card knows its fields). */
export function laneStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

/** The audiocore weight load: LoadAudiocoreModel from lane rows +
 *  the model's variant default. The extras JSON spacing ({"variant":
 *  "x"} — with colon spacing; an empty variant bakes extras "". */
export function loadAudiocore(g: GraphBuilder, model: ModelFacts): OutputHandle {
  const li: LaneInputsFacts = model.lane_inputs
  const variant = laneStr(model.defaults.variant)
  const extras = variant ? JSON.stringify({ variant }) : ''
  return g.node('LoadAudiocoreModel', {
    family: laneStr(li.family),
    model_path: laneStr(li.model_path),
    extras,
  }).out()
}

/** The audio-lane tail: SaveAudio under the prefix. */
export function saveAudio(g: GraphBuilder, audio: OutputHandle, filenamePrefix: string): void {
  g.node('SaveAudio', { audio, filename_prefix: filenamePrefix })
}
