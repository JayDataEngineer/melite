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

/**
 * The Audiocore voice bank: the studio node's own default
 * `voices_dir` (melite-audio-nodes/nodes.py:743) and the directory
 * the estate's save lanes write personas into (`export_path` in the
 * saved runs' graphs, e.g. /mnt/data/models/audio/voices/x.qvoice).
 * A bare persona name resolves here — the engine's load branch reads
 * only ComfyUI's input directory or a real host path (nodes.py:885
 * via _resolve_input_path, nodes.py:327), so a bare name ridden into
 * the graph verbatim dies as `no such file: <name>`.
 */
export const QVOICE_BANK_ROOT = '/mnt/data/models/audio/voices'

/** The qvoice reference's ONE spelling at the wire: a bare persona
 *  name expands to the bank path; a value the caller already spelled
 *  as a path (absolute, run-relative, or an uploaded input leaf that
 *  carries the .qvoice extension) rides verbatim.
 *  @param ref the persona reference as stated on the doc
 *  @returns the path the AudiocoreVoiceStudio seat receives
 */
export function resolveQvoicePath(ref: string): string {
  const path = ref.trim()
  if (path === '') return path
  if (path.startsWith('/') || path.includes('/')) return path
  if (path.endsWith('.qvoice')) return path
  return QVOICE_BANK_ROOT + '/' + path + '.qvoice'
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
    return path ? { path: resolveQvoicePath(path), strength: qvoiceStrength(fallbackStrength) } : undefined
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
  const path = resolveQvoicePath(pathValue)
  if (!path) return undefined
  const strength = record['voice_strength'] ?? fallbackStrength
  return { path, strength: qvoiceStrength(strength) }
}

export function qvoiceUse(p: Record<string, unknown>): QVoiceUse | undefined {
  return qvoiceRow(p['qvoice'], p['voice_strength'])
}

// TTST1 IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30): the qwen3-tts
// family composes its own lane in its declared action (pinned to committed
// goldens in that family's tests/golden/). This arm is deleted; the family is
// the only home of the lane.
// THE TTS LANE IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30):
// the qwen3-tts and qwen3-tts-voicedesign families compose their own
// speak/clone/use/export lanes in their declared actions (pinned to
// committed goldens in those families' tests/golden/). These sub-arms
// go with the lane; the qvoice READER above stays — the families' own
// actions read their qvoice through it (admission, not lane).

// TTSDESIGNT1 IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30): the qwen3-tts-voicedesign
// family composes its own lane in its declared action (pinned to committed
// goldens in that family's tests/golden/). This arm is deleted; the family is
// the only home of the lane.
// sfxT1 IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30): the
// moss-sfx family composes its own lane in its declared action
// (packages/models/moss-sfx/src/actions.ts, pinned to committed goldens in
// that family's tests/golden/). This arm is deleted; the family is the
// only home of the lane.
