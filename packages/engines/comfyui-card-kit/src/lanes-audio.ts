import { GraphBuilder, OutputHandle } from './graph.ts'
import type { ModelFacts } from './facts.ts'
import { mintSeed,
  voiceLockSeed } from './graph-helpers.ts'
import { assertModUse } from './mods/guard.ts'
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

/** The yue2 lane — YuE2-3B text-to-music with ABC planning (the
 *  Comfy-Org release, stock nodes only; boarded 2026-09-20). Branch
 *  key = lane_inputs.checkpoint (the latent_node precedent — data
 *  never a family-id switch): ONE checkpoint carries model+clip+vae
 *  (CheckpointLoaderSimple); the music LLM plans ABC
 *  (YuE2GenerateABC, only when mode != off) then conditions
 *  (YuE2GenerateMusic — its seconds output sizes the latent, the
 *  template's own wiring); KSampler dpm_2/sgm_uniform at cfg 1
 *  (guidance lives on the AR side, never the sampler — the card's
 *  guidance_scale knob stays music3's); VAE decode, mp3 save. */
export function yue2T1(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const seed = mintSeed(p)
  const li = model.lane_inputs
  const ckpt = g.node('CheckpointLoaderSimple', { ckpt_name: laneStr(li.checkpoint) })
  const style = p.prompt as string
  const lyrics = (p.lyrics ?? '') as string
  const mode = (p.mode ?? 'full') as string
  // THE PLANNING GATE: mode off composes no planner node at all —
  // GenerateMusic rides an empty abc (the engine's own off mode);
  // full/melody ride YuE2GenerateABC with the same style + lyrics.
  let abc: string | OutputHandle = ''
  if (mode !== 'off') {
    abc = g.node('YuE2GenerateABC', {
      clip: ckpt.out(1), style, lyrics, seed, mode,
      max_abc_tokens: 8192, temperature: 0.7, top_p: 0.9, top_k: 30,
      repetition_penalty: 1.005, penalty_window: 100,
    }).out(0)
  }
  const music = g.node('YuE2GenerateMusic', {
    clip: ckpt.out(1), style, lyrics, abc, seed, mode,
    max_duration: p.duration, temperature: 1.0, top_p: 0.95, top_k: 100,
    repetition_penalty: 1.2,
  })
  const zeroed = g.node('ConditioningZeroOut', { conditioning: music.out(0) })
  const latent = g.node('EmptyYuE2LatentAudio', { batch_size: 1, seconds: music.out(1) })
  const sampled = g.node('KSampler', {
    seed,
    steps: p.n_diffusion_steps,
    cfg: 1,
    sampler_name: 'dpm_2',
    scheduler: 'sgm_uniform',
    denoise: 1.0,
    latent_image: latent.out(),
    model: ckpt.out(0),
    positive: music.out(0),
    negative: zeroed.out(),
  })
  const audio = g.node('VAEDecodeAudio', { samples: sampled.out(), vae: ckpt.out(2) })
  g.node('SaveAudioAdvanced', { audio: audio.out(), filename_prefix: `${runId}/music`, format: 'mp3', 'format.quality': 'V0' })
}

// ── archetype II: the audiocore family ────────────────────────────
// LoadAudiocoreModel (family/model_path/extras from facts) → one
// synth node → SaveAudio. The pin AUTOFILLs ride verbatim; per-card
// param wiring is the only difference between the three lanes.

/** The qvoice USE read (the LOAD half): the mod bag's first entry
 *  wins (max_stack 1) — its .qvoice path + identity strength. A
 *  flat string still rides (pre-seat drafts naming the bare
 *  path). Absent/blank = undefined — the persona branch renders
 *  (a preset timbre, never a clone). */
function qvoiceUse(p: Record<string, unknown>): { path: string; strength: unknown } | undefined {
  const bag = p.qvoice
  if (Array.isArray(bag)) {
    const first = bag[0] as Record<string, unknown> | undefined
    const raw = first?.qvoice
    const path = typeof raw === 'string' ? raw.trim() : ''
    return path ? { path, strength: first?.voice_strength } : undefined
  }
  const flat = typeof bag === 'string' ? bag.trim() : ''
  return flat ? { path: flat, strength: undefined } : undefined
}

/** The tts_t1 block — the shared speak-text lane (moved verbatim
 *  from the tts card; admission stays on the card). THREE HONEST
 *  BRANCHES (the README stroke 2026-09-21 — one branch per
 *  checkpoint, never the same graph): CustomVoice synthesis with
 *  persona + embedding load, Base clone from reference, VoiceDesign
 *  export from the Design entry. */
export function ttsT1(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  // THE LANE-BRANCH LAW (2026-09-20, the audit's finding): branch
  // key = lane_inputs DATA (synth_lane — speak/clone/design), never
  // a family-id switch — the latent_node/text_encode_node
  // precedent. An absent key falls to the speak lane (''-absent).
  const li = model.lane_inputs
  const lane = typeof li.synth_lane === 'string' ? li.synth_lane : ''
  if (lane === 'design') return ttsDesignT1(p, model, g, runId)
  if (lane === 'clone') return ttsCloneT1(p, model, g, runId)
  ttsSpeakT1(p, model, g, runId)
}
export function ttsSpeakT1(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  // THE USE BRANCH (the voice-lock LOAD half, the round-trip stroke
  // 2026-09-20): a stated .qvoice performs the text through the
  // studio's clone pipeline. The AudiocoreTTS voice_file path is
  // DEAD at the C ABI (speaker_embedding hard-fails in
  // build_speech_request — "not yet wired", a documented refusal)
  // and its QWEN3VOICE parser reads a format the exporter never
  // wrote; the studio's Python engine is the one live consumer.
  const use = qvoiceUse(p)
  if (use) return ttsUseT1(p, model, g, runId, use.path, use.strength)
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
    // wires "" (served "").
    instruct: (p.style_instruction ?? '') as string,
    temperature: p.temperature,
    seed,
    // NO top_p/speed (not knobs — the AUTOFILL spread above owns
    // 0.9/1.0; they ride from the pin, never from params).
  })
  saveAudio(g, synth.out(), `${runId}/tts`)
}

/** The tts_use_t1 block — a saved persona performs the text: the
 *  studio's generate mode (the qwen-tts Python pipeline; lite →
 *  Base + generate_voice_clone ICL with the stored ref_code +
 *  embedding, wdelta → the CV combo pipeline). instruct rides as
 *  the combo's style direction; the loader gates the family. */
export function ttsUseT1(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string, path: string, strength: unknown): void {
  assertModUse(model, 'qvoice')
  const loaded = loadAudiocore(g, model)
  const studio = g.node('AudiocoreVoiceStudio', {
    ...AUDIACORE_STUDIO_AUTOFILL,
    model: loaded,
    mode: 'generate',
    qvoice_path: path,
    text: p.text,
    // the combo pipeline's style direction (style_instruction is
    // the card's honest instruct row — ''-absent when unstated)
    instruct: (p.style_instruction ?? '') as string,
    temperature: p.temperature,
    voice_strength: strength,
    // THE LOCK SEED (operator catch f): derived from the artifact
    // path when unstated — same voice, same render seed, every time
    seed: voiceLockSeed(p, path),
  })
  saveAudio(g, studio.out(), `${runId}/tts`)
}

/** The tts_clone_t1 block — the 0.6B Base cloner (the README
 *  stroke: reference audio + transcript in, the speaker's voice
 *  out). No persona, no instruct, no embedding load — unwired,
 *  never merely hidden. Admission stays on the card. */
export function ttsCloneT1(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const seed = mintSeed(p)
  const loaded = loadAudiocore(g, model)
  const synth = g.node('AudiocoreTTS', {
    ...AUDIACORE_TTS_AUTOFILL,
    model: loaded,
    prompt: p.text,
    mode: laneStr(model.defaults.mode, 'tts'),
    reference_audio: p.ref_audio,
    reference_text: p.ref_text,
    temperature: p.temperature,
    seed,
  })
  saveAudio(g, synth.out(), `${runId}/tts`)
}

/** The tts_design_t1 block — the 1.7B VoiceDesign exporter (the
 *  SAVE half, moved from the dead voice-lock card into the TTS
 *  card's Design mod): the entry's name + VoiceDesign prompt +
 *  sampling ride VoiceStudio export_lite on the larger checkpoint;
 *  the card text voices the sample. Admission stays on the card. */
export function ttsDesignT1(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  // FLAT READ (2026-09-23, the unrunnable-lane fix): the qvoice_save
  // PACK CONTRACT (comfyui-cordis mods/packs.ts) admits
  // voice_name/style_instruction + design sampling as FLAT params.
  // The old nested read (p.qvoice_save[0].voice_name) demanded the
  // one shape phase-1 admission refuses as an unknown param — the
  // design lane could never run. The lane now reads exactly what the
  // pack admits; required-field admission stays on the card.
  assertModUse(model, 'qvoice_save')
  const seed = mintSeed(p)
  const loaded = loadAudiocore(g, model)
  const studio = g.node('AudiocoreVoiceStudio', {
    ...AUDIACORE_STUDIO_AUTOFILL,
    model: loaded,
    mode: 'export_lite',
    name: (p.voice_name as string).trim(),
    instruct: (p.style_instruction as string).trim(),
    sample_text: p.text,
    temperature: p.temperature,
    top_p: p.top_p,
    speed: p.speed,
    repetition_penalty: p.repetition_penalty,
    seed,
  })
  saveAudio(g, studio.out(), `${runId}/design`)
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

