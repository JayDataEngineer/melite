import { GraphBuilder } from './graph.ts'
import type { ModelFacts } from './facts.ts'
import { mintSeed } from './graph-helpers.ts'
import { fireKnob } from './mods/guard.ts'
import {
  AUDIACORE_TTS_AUTOFILL,
  AUDIACORE_STUDIO_AUTOFILL,
  loadAudiocore,
  saveAudio,
  laneStr,
} from './blocks/audio-kit.ts'

/** The music_t1 block — the MiniMax Music 3 lane (moved verbatim
 *  from the music card; admission stays on the card). */
export function musicT1(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const seed = mintSeed(p)
  const li = model.lane_inputs
  const unet = g.node('UNETLoader', { unet_name: laneStr(li.unet), weight_dtype: 'default' }).out()
  const clip = g.node('CLIPLoader', { clip_name: laneStr(li.text_encoder), model_options: 'default', type: laneStr(li.clip_type) }).out()
  const vae = g.node('VAELoader', { vae_name: laneStr(li.vae) }).out()
  const cond = g.node('MiniMaxMusic3TextEncode', {
    clip,
    caption: p.prompt,
    lyrics: p.lyrics ?? '',
    seed,
    max_duration: p.duration,
    cfg_scale: p.lm_cfg_scale,
    top_k: 50,
  })
  const zeroed = g.node('ConditioningZeroOut', { conditioning: cond.out(0) })
  const latent = g.node('EmptyMiniMaxMusic3LatentAudio', { batch_size: 1, seconds: p.duration })
  const sampled = g.node('KSampler', {
    seed,
    steps: p.n_diffusion_steps,
    cfg: p.guidance_scale,
    sampler_name: 'euler',
    scheduler: 'simple',
    denoise: 1.0,
    latent_image: latent.out(),
    model: unet,
    positive: cond.out(0),
    negative: zeroed.out(),
  })
  const audio = g.node('VAEDecodeAudio', { samples: sampled.out(), vae })
  g.node('SaveAudioAdvanced', { audio: audio.out(), filename_prefix: `${runId}/music`, format: 'mp3', 'format.quality': 'V0' })
}

// ── archetype II: the audiocore family ────────────────────────────
// LoadAudiocoreModel (family/model_path/extras from facts) → one
// synth node → SaveAudio. The pin AUTOFILLs ride verbatim; per-card
// param wiring is the only difference between the three lanes.

/** The tts_t1 block — the shared speak-text lane (moved verbatim
 *  from the tts card; admission stays on the card). */
export function ttsT1(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const seed = mintSeed(p)
  const loaded = loadAudiocore(g, model)
  const synth = g.node('AudiocoreTTS', {
    ...AUDIACORE_TTS_AUTOFILL,
    model: loaded,
    prompt: p.text,
    mode: laneStr(model.defaults.mode, 'tts'),
    // the model's default persona fills an unstated doc voice
    voice: (p.voice as string) || laneStr(model.defaults.voice),
    // schema-required keys render ''-absent at compose (image-gen
    // precedent) — bare strings normalize here so an absent row still
    // wires "" (the golden pins "").
    instruct: (p.style_instruction ?? '') as string,
    temperature: p.temperature,
    seed,
    voice_file: fireKnob(model, 'qvoice', 'qvoice', p.qvoice),
    voice_pca_strengths: fireKnob(model, 'qvoice', 'voice_pca_strengths', p.voice_pca_strengths),
    // NO top_p/speed (py: not knobs — the AUTOFILL spread above owns
    // 0.9/1.0; the golden pins them from the pin, never from params).
  })
  saveAudio(g, synth.out(), `${runId}/tts`)
}

/** The sfx_t1 block — the sound-effect lane (moved verbatim from the
 *  sfx card; admission stays on the card). */
export function sfxT1(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const seed = mintSeed(p)
  const loaded = loadAudiocore(g, model)
  const synth = g.node('AudiocoreTTS', {
    ...AUDIACORE_TTS_AUTOFILL,
    model: loaded,
    prompt: (p.prompt as string).trim(),
    mode: 'tts',
    guidance_scale: p.guidance_scale,
    num_inference_steps: p.n_diffusion_steps,
    duration_seconds: p.duration,
    seed,
  })
  saveAudio(g, synth.out(), `${runId}/sfx`)
}

/** The voicelock_t1 block — the persona export lane (moved verbatim
 *  from the voice-lock card; admission stays on the card). */
export function voicelockT1(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const seed = mintSeed(p)
  const loaded = loadAudiocore(g, model)
  const studio = g.node('AudiocoreVoiceStudio', {
    ...AUDIACORE_STUDIO_AUTOFILL,
    model: loaded,
    mode: 'export_lite',
    name: (p.voice_name as string).trim(),
    instruct: (p.style_instruction as string).trim(),
    temperature: p.temperature,
    top_p: p.top_p,
    speed: p.speed,
    repetition_penalty: p.repetition_penalty,
    seed,
  })
  saveAudio(g, studio.out(), `${runId}/voicelock`)
}
