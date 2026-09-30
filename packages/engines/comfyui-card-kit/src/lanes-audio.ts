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

// musicT1 IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30): the
// music3 family composes its own lane in its declared action
// (packages/models/music3/src/actions.ts, pinned to committed goldens in
// that family's tests/golden/). This arm is deleted; the family is the
// only home of the lane.
// yue2T1 IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30): the
// yue2 family composes its own lane in its declared action
// (packages/models/yue2/src/actions.ts, pinned to committed goldens in
// that family's tests/golden/). This arm is deleted; the family is the
// only home of the lane.

// ── archetype II: the audiocore family ────────────────────────────
// LoadAudiocoreModel (family/model_path/extras from facts) → one
// synth node → SaveAudio. The pin AUTOFILLs ride verbatim; per-card
// param wiring is the only difference between the three lanes.

export interface QVoiceUse {
  path: string
  strength: number | undefined
}

const QVOICE_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/

function qvoiceStrength(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const n = typeof value === 'number'
    ? value
    : typeof value === 'string' && QVOICE_NUMBER.test(value.trim())
      ? Number(value.trim())
      : Number.NaN
  if (!Number.isFinite(n) || n < 0 || n > 2) {
    throw new Error("qvoice voice_strength must be a finite number from 0 to 2")
  }
  return n
}

function qvoiceRow(value: unknown, fallbackStrength: unknown): QVoiceUse | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') {
    const path = value.trim()
    return path ? { path, strength: qvoiceStrength(fallbackStrength) } : undefined
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return undefined
    if (value.length !== 1) throw new Error('qvoice accepts one media entry')
    return qvoiceRow(value[0], fallbackStrength)
  }
  if (typeof value !== 'object') {
    throw new Error('qvoice must be a path or one-entry qvoice bag')
  }
  const record = value as Record<string, unknown>
  if (Object.keys(record).length === 1 && Object.prototype.hasOwnProperty.call(record, 'item')) {
    const item = record['item']
    if (Array.isArray(item) && item.length === 0) return undefined
    return qvoiceRow(item, fallbackStrength)
  }
  const pathValue = record['qvoice']
  if (typeof pathValue !== 'string') {
    throw new Error('qvoice bag entry requires a string qvoice path')
  }
  const path = pathValue.trim()
  if (!path) return undefined
  const strength = record['voice_strength'] ?? fallbackStrength
  return { path, strength: qvoiceStrength(strength) }
}

export function qvoiceUse(p: Record<string, unknown>): QVoiceUse | undefined {
  return qvoiceRow(p['qvoice'], p['voice_strength'])
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
    // THE 1:1 GENERATE KWARGS (operator 2026-09-23): the card
    // declares top_p/top_k/speed/repetition_penalty — absent rows
    // ride the AUTOFILL pin (the node's own defaults), stated rows
    // override. One surface, no second owner.
    ...(p.top_p !== undefined && p.top_p !== null ? { top_p: p.top_p } : {}),
    ...(p.top_k !== undefined && p.top_k !== null ? { top_k: p.top_k } : {}),
    ...(p.speed !== undefined && p.speed !== null ? { speed: p.speed } : {}),
    ...(p.repetition_penalty !== undefined && p.repetition_penalty !== null ? { repetition_penalty: p.repetition_penalty } : {}),
    seed,
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

/** The tts_clone_t1 block — the Base cloner (either size; the
 * README stroke: reference audio + transcript in, the speaker's
 * voice out). THE QVOICE CARRY (operator 2026-09-23, the 1:1 law:
 * qvoice works across ALL qwen3-tts): a stated .qvoice on the
 * clone lane performs through the studio's generate pipeline —
 * upstream's design-then-clone flow, the exported voice IS the
 * clone prompt (lite → Base + generate_voice_clone ICL with the
 * stored ref_code). No persona, no instruct, never merely
 * hidden. Admission stays on the card. */
export function ttsCloneT1(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const use = qvoiceUse(p)
  if (use) return ttsUseT1(p, model, g, runId, use.path, use.strength)
  const seed = mintSeed(p)
  const loaded = loadAudiocore(g, model)
  const synth = g.node('AudiocoreTTS', {
    ...AUDIACORE_TTS_AUTOFILL,
    model: loaded,
    prompt: p.text,
    mode: laneStr(model.defaults.mode, 'clone'),
    reference_audio: p.ref_audio,
    reference_text: p.ref_text,
    temperature: p.temperature,
    ...(p.top_p !== undefined && p.top_p !== null ? { top_p: p.top_p } : {}),
    ...(p.top_k !== undefined && p.top_k !== null ? { top_k: p.top_k } : {}),
    ...(p.speed !== undefined && p.speed !== null ? { speed: p.speed } : {}),
    ...(p.repetition_penalty !== undefined && p.repetition_penalty !== null ? { repetition_penalty: p.repetition_penalty } : {}),
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
  // THE LANE'S OWN PROMPT ROW (operator 2026-09-23, three variants
  // three inputs): the design prompt rides the CARD as
  // design_prompt (the task-named "Voice Persona & Timbre" row) —
  // the pack owns the export name + design sampling, never the
  // prompt (one knob, one owner). Required-field admission stays
  // on the card.
  assertModUse(model, 'qvoice_save')
  const seed = mintSeed(p)
  const loaded = loadAudiocore(g, model)
  const studio = g.node('AudiocoreVoiceStudio', {
    ...AUDIACORE_STUDIO_AUTOFILL,
    model: loaded,
    mode: 'export_lite',
    name: (p.voice_name as string).trim(),
    instruct: (p.design_prompt as string).trim(),
    sample_text: p.text,
    temperature: p.temperature,
    top_p: p.top_p,
    speed: p.speed,
    repetition_penalty: p.repetition_penalty,
    seed,
  })
  saveAudio(g, studio.out(), `${runId}/design`)
  // THE QVOICE PERSISTENCE LAW (operator 2026-09-25: ".qvoice files are
  // preserved like the other media"): the studio mints the voice on the
  // engine's models mount — every other run artifact persists in the
  // run's own tree where run_status rows, artifact routes, and the
  // cross-roots media tab serve it; the .qvoice alone stayed outside.
  // One copy node lands it at <runId>/voices/<name>.qvoice (the mount
  // original stays for the clone lanes). Order rides the studio's own
  // audio output — never read, only proof the mint preceded the copy.
  g.node('MeliteQVoiceCopy', {
    voice_name: (p.voice_name as string).trim(),
    dest_prefix: `${runId}/voices`,
    audio: studio.out(),
  })
}

// sfxT1 IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30): the
// moss-sfx family composes its own lane in its declared action
// (packages/models/moss-sfx/src/actions.ts, pinned to committed goldens in
// that family's tests/golden/). This arm is deleted; the family is the
// only home of the lane.