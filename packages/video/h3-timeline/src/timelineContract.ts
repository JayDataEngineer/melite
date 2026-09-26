export const SEAM_OVERLAP_FRAMES = 22
export const GRID_BASE_FRAMES = 22
export const GRID_STEP_FRAMES = 17
export const GRID_MAX_FRAMES = 362
export const GRID_REMAINDER = 5
export const IMAGE_BUS_SLOTS = 9

export const REF_CAPS = {
  images: 8,
  videos: 3,
  audios: 3,
} as const

export interface TimelineSpan {
  readonly start: number
  readonly end: number
  readonly transition?: string
}

export interface TimelineCallSpan {
  readonly start_frame: number
  readonly end_frame: number
  readonly transition?: string
}

export function transitionOverlap(transition?: string): number {
  return transition === 'cut' ? 0 : SEAM_OVERLAP_FRAMES
}

export function spanOverlap(span: TimelineSpan): number {
  return transitionOverlap(span.transition)
}

export function spanStanzaFrames(span: TimelineSpan, carry = 0): number {
  const k = Math.round((span.end - span.start + carry - GRID_BASE_FRAMES) / GRID_STEP_FRAMES)
  return Math.min(GRID_MAX_FRAMES, Math.max(GRID_BASE_FRAMES, GRID_BASE_FRAMES + GRID_STEP_FRAMES * k))
}

export interface CarriedSpanGrid {
  readonly generatedStart: number
  readonly generatedEnd: number
  readonly length: number
  readonly lowerEnd: number
  readonly upperEnd: number
}

export function carriedSpanGrid(span: TimelineSpan, carry = SEAM_OVERLAP_FRAMES): CarriedSpanGrid {
  const generatedStart = span.start - carry
  const requestedLength = span.end - span.start + carry
  const length = spanStanzaFrames(span, carry)
  const rawIndex = (requestedLength - GRID_BASE_FRAMES) / GRID_STEP_FRAMES
  const maxIndex = (GRID_MAX_FRAMES - GRID_BASE_FRAMES) / GRID_STEP_FRAMES
  const lowerIndex = Math.max(0, Math.min(maxIndex, Math.floor(rawIndex)))
  const upperIndex = Math.max(0, Math.min(maxIndex, Math.ceil(rawIndex)))
  const endAt = (index: number): number => generatedStart + GRID_BASE_FRAMES + GRID_STEP_FRAMES * index
  return {
    generatedStart,
    generatedEnd: generatedStart + length,
    length,
    lowerEnd: endAt(lowerIndex),
    upperEnd: endAt(upperIndex),
  }
}

export function assertCarriedSpanGrid(span: TimelineSpan, where: string, carry = SEAM_OVERLAP_FRAMES): number {
  const grid = carriedSpanGrid(span, carry)
  const requestedLength = span.end - span.start + carry
  if (grid.length !== requestedLength) {
    const legal = grid.lowerEnd === grid.upperEnd
      ? `${grid.lowerEnd}`
      : `${grid.lowerEnd} and ${grid.upperEnd}`
    throw new Error(
      `${where}: authored range ${span.start}→${span.end} cannot land on the 22+17k carried grid; ` +
      `generated snapped range ${grid.generatedStart}→${grid.generatedEnd}; ` +
      `legal neighboring end frames ${legal} ` +
      `(a carried window's span is 17f — its 22f seam is the generation head; ` +
      `a first or cut window is 22+17f)`,
    )
  }
  return grid.length
}

export function gridSnap(length: number): number {
  const k = Math.round((length - GRID_BASE_FRAMES) / GRID_STEP_FRAMES)
  return Math.min(GRID_MAX_FRAMES, Math.max(GRID_BASE_FRAMES, GRID_BASE_FRAMES + GRID_STEP_FRAMES * k))
}

/** THE GRID PREDICATE, one owner: a length the engine can render is
 *  22+17k inside [22,362]. Every refusal door asks this question, so
 *  knob pins, single windows, cut windows, and carried windows cannot
 *  drift into different laws. */
export function isGridLength(length: number): boolean {
  return Number.isInteger(length) &&
    length >= GRID_BASE_FRAMES &&
    length <= GRID_MAX_FRAMES &&
    (length - GRID_BASE_FRAMES) % GRID_STEP_FRAMES === 0
}

export function assertGridLength(length: unknown, where: string): number {
  if (typeof length !== 'number' || !isGridLength(length)) {
    const nearest = typeof length === 'number' && Number.isFinite(length)
      ? gridSnap(Math.min(GRID_MAX_FRAMES, Math.max(GRID_BASE_FRAMES, Math.round(length))))
      : 124
    throw new Error(
      `${where}: length ${String(length)}f is off-grid — the engine renders ` +
      `22+17k frames in [22,362] (nearest legal: ${nearest}f); ` +
      `the doc-proven geometry is 0→124→243→362`,
    )
  }
  return length
}

/** THE UNIFORM SPAN GATE: one refusal for every window shape. A
 *  carried window generates span+carry frames, so its authored span
 *  must be 17k; a first or cut window generates its span verbatim, so
 *  it must be 22+17k. Both are the same engine grid — a carried span
 *  used to be the only shape that refused, while single/cut spans
 *  were silently snapped (the old two-law gap, closed 2026-09-25).
 *  `spanStanzaFrames` stays the render/film clock and is a no-op
 *  identity for admitted spans. */
export function assertSpanGrid(span: TimelineSpan, where: string, carry = 0): number {
  if (carry > 0) return assertCarriedSpanGrid(span, where, carry)
  const length = span.end - span.start
  if (!isGridLength(length)) {
    throw new Error(
      `${where}: authored range ${span.start}→${span.end} has length ${length}f, which cannot land on the 22+17k grid ` +
      `(nearest legal: ${gridSnap(length)}f); the doc-proven geometry is 0→124→243→362 ` +
      `(a first or cut window is 22+17f; a carried window's span is 17f — its 22f seam is the generation head)`,
    )
  }
  return length
}

export function deliveredFrames(call: TimelineCallSpan, index: number): number {
  const span = call.end_frame - call.start_frame
  if (index === 0 || call.transition === 'cut') return span
  return Math.max(0, span - SEAM_OVERLAP_FRAMES)
}

export function imageReferenceCap(hasLastFrame: boolean): number {
  return hasLastFrame ? REF_CAPS.images - 1 : REF_CAPS.images
}

export function splitRefList(value: string | undefined): string[] {
  if (!value) return []
  const out: string[] = []
  let i = 0
  while (i < value.length) {
    while (i < value.length && (value[i] === ',' || value[i] === ' ' || value[i] === '\t')) i++
    if (i >= value.length) break
    const start = i
    const isData = value.startsWith('data:', i)
    let mimeComma = false
    while (i < value.length) {
      if (value[i] === ',') {
        if (isData && !mimeComma) {
          mimeComma = true
          i++
          continue
        }
        break
      }
      i++
    }
    let end = i
    while (end > start && (value[end - 1] === ' ' || value[end - 1] === '\t')) end--
    out.push(value.slice(start, end))
  }
  return out
}

export function normalizeDeclaredRefs(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '')
  }
  if (typeof value === 'string') return splitRefList(value)
  return []
}

export function joinRefList(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const entries = value.map(String).map((entry) => entry.trim()).filter(Boolean)
    return entries.length > 0 ? entries.join(', ') : undefined
  }
  if (typeof value === 'string' && value.trim()) return value.trim()
  return undefined
}

export function mergeDeclaredRefs(declared: readonly string[], perCall: readonly string[]): string[] {
  return [...declared, ...perCall.filter((entry) => !declared.includes(entry))]
}

export function refGenreOf(name: string, url?: string): 'image' | 'video' | 'audio' | 'other' {
  const lowerName = name.toLowerCase()
  if (/^video_w\d+_/.test(lowerName)) {
    if (lowerName.endsWith('_last_frame') || lowerName.includes('_prev')) return 'image'
    return 'video'
  }
  const source = `${lowerName} ${url ? url.toLowerCase().split('?')[0] : ''}`
  const extension = (source.split('.').pop() as string).split(/[^a-z0-9]/)[0] as string
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif'].includes(extension)) return 'image'
  if (['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v'].includes(extension)) return 'video'
  if (['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'opus'].includes(extension)) return 'audio'
  return 'other'
}

export const KNOB_ORDER = [
  'steps', 'denoise', 'sampler_name', 'sched_name',
  'shift_video', 'shift_audio',
  'sla_sparsity', 'sla_block_size',
  'sla_min_seq_len', 'sla_dense_last_steps',
  'sla_protect_audio', 'sla_stabilize_motion',
  'sla_reference_protection', 'sla_dense_backend',
  'sla_dense_steps', 'sla_disable_fp16_accum',
  'sharpen_enabled', 'sharpen_method', 'sharpen_strength',
  'sharpen_radius', 'sharpen_threshold', 'sharpen_iterations',
  'interpolate_enabled', 'interp_model', 'interp_multiplier',
  'length',
] as const

export type KnobKey = (typeof KNOB_ORDER)[number]
export const CALL_KNOB_KEYS: ReadonlySet<string> = new Set(KNOB_ORDER)

export const CALL_KEYS: ReadonlySet<string> = new Set([
  'text', 'start_frame', 'end_frame', 'image', 'clip', 'audio',
  'transition', 'knobs', 'refs',
  'ref_image', 'image_name', 'ref_images', 'ref_videos', 'ref_audios',
  'beats', 'last_frame', 'first_frame_prev_sec', 'seam_carry',
])

export const LEGACY_KNOB_KEY = {
  sampling_steps: 'steps',
  sampler: 'sampler_name',
  scheduler: 'sched_name',
  h3_sla_sparsity: 'sla_sparsity',
  h3_sla_block_size: 'sla_block_size',
  h3_sla_min_seq_len: 'sla_min_seq_len',
  h3_sla_dense_last_steps: 'sla_dense_last_steps',
  h3_sla_protect_audio: 'sla_protect_audio',
  h3_sla_stabilize_motion: 'sla_stabilize_motion',
  h3_sla_reference_protection: 'sla_reference_protection',
  h3_sla_dense_backend: 'sla_dense_backend',
  h3_sla_dense_steps: 'sla_dense_steps',
  h3_sla_disable_fp16_accum: 'sla_disable_fp16_accum',
  interpolate_model: 'interp_model',
  interpolate_multiplier: 'interp_multiplier',
} as const satisfies Record<string, KnobKey>

export function migrateCallKnobKey(key: string): string {
  return (LEGACY_KNOB_KEY as Record<string, string>)[key] ?? key
}
