import { create } from "./createStore"
import type { TimelineSegment, AudioCue, AudioTrackDef, TimelineViewport, PlaybackState, DragState, InOutPoints, ChapterMarker, VideoVariant, ConsistencyAnchor, SegmentStatus } from "@melite/contracts"
import { TRACK_COLORS, DEFAULT_SEGMENT_PARAMS, normalizeSegmentStatus } from "@melite/contracts"
import { getCachedCatalog } from "@melite/catalog"
import {
  copySegmentParams,
  pasteParamsInto,
} from "./segmentClipboard"

let _nextId = 1
function uid(): string {
  return `seg_${_nextId++}_${Date.now().toString(36)}`
}

let _nextVariantId = 1
function variantUid(): string {
  return `var_${_nextVariantId++}_${Date.now().toString(36)}`
}

// E3.2: hard cap on retained variants per segment. New variants past this
// count evict the OLDEST non-primary variant (FIFO). Promoting a variant
// does NOT count against this cap (it stays in the list). The primary
// videoUrl is independent of this list — see promoteVariant.
export const MAX_VARIANTS_PER_SEGMENT = 4

/** E3.2: Input shape for addVariant/setVariants. The store mints `id`
 *  and `createdAt` if absent; callers may pass their own (e.g. tests). */
export type VariantInput = Omit<VideoVariant, 'id' | 'createdAt'> &
  Partial<Pick<VideoVariant, 'id' | 'createdAt'>>

// ═══════════════════════════════════════════════════════════════════════════
// IndexedDB for large timeline data (video URLs, frame b64, relay video)
// ═══════════════════════════════════════════════════════════════════════════
const TL_DB_NAME = 'TechNoirTimelineDB'
const TL_DB_VERSION = 1
const TL_STORE = 'blobs'

let tlDbPromise: Promise<IDBDatabase> | null = null

function getTLDB(): Promise<IDBDatabase> {
  if (tlDbPromise) return tlDbPromise
  tlDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(TL_DB_NAME, TL_DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (ev) => {
      const db = (ev.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(TL_STORE)) {
        db.createObjectStore(TL_STORE)
      }
    }
  })
  return tlDbPromise
}

async function tlSave(key: string, value: string): Promise<void> {
  const db = await getTLDB()
  const tx = db.transaction(TL_STORE, 'readwrite')
  tx.objectStore(TL_STORE).put(value, key)
  await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error) })
}

async function tlLoad(key: string): Promise<string | null> {
  try {
    const db = await getTLDB()
    const tx = db.transaction(TL_STORE, 'readonly')
    const req = tx.objectStore(TL_STORE).get(key)
    return new Promise((res, rej) => { req.onsuccess = () => res(req.result || null); req.onerror = () => rej(req.error) })
  } catch (e) {
    // NO SILENT SWALLOW — IndexedDB failures (quota, corruption, version
    // upgrade) shouldn't make the timeline "silently reset". Log so we know.
    console.error('[timeline] tlLoad failed (IndexedDB):', e)
    return null
  }
}

export async function _tlDelete(key: string): Promise<void> {
  const db = await getTLDB()
  const tx = db.transaction(TL_STORE, 'readwrite')
  tx.objectStore(TL_STORE).delete(key)
  await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error) })
}

async function tlClearAll(): Promise<void> {
  const db = await getTLDB()
  const tx = db.transaction(TL_STORE, 'readwrite')
  tx.objectStore(TL_STORE).clear()
  await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error) })
}

// ═══════════════════════════════════════════════════════════════════════════
// Timeline persistence helpers
// ═══════════════════════════════════════════════════════════════════════════

// Fields that may contain large base64 data URLs — stored in IndexedDB
const BLOB_FIELDS = ['videoUrl', 'firstFrameB64', 'lastFrameB64', 'thumbnailUrl'] as const

function isDataUrl(val: unknown): val is string {
  return typeof val === 'string' && val.startsWith('data:')
}

// Blob keys use "TLB:" prefix to avoid collision with segment IDs ("seg_")
const BLOB_PREFIX = 'TLB:'

function blobKey(segId: string, field: string): string {
  return `${BLOB_PREFIX}${segId}_${field}`
}

function isBlobRef(val: unknown): val is string {
  return typeof val === 'string' && val.startsWith(BLOB_PREFIX)
}

// Save: strip large blobs from segments, store them in IndexedDB
async function persistTimeline(
  segments: TimelineSegment[],
  audioCues: AudioCue[],
  audioTracks: AudioTrackDef[],
  relayVideoUrl: string | null,
  relaySegmentIds: string[],
  relayAssetId: string | null,
  globalConsistencyAnchor: ConsistencyAnchor | null,
) {
  try {
    // Collect blob saves
    const blobSaves: Promise<void>[] = []

    // Strip blobs from segments, replace with keys
    const strippedSegments = segments.map(seg => {
      const clone = { ...seg, params: { ...seg.params } }
      for (const field of BLOB_FIELDS) {
        const val = clone[field] as string | null
        if (isDataUrl(val)) {
          const key = blobKey(seg.id, field)
          blobSaves.push(tlSave(key, val))
          ;(clone as any)[field] = key // placeholder
        }
      }
      // Also handle controlVideoUrl
      if (isDataUrl(clone.controlVideoUrl)) {
        const key = blobKey(seg.id, 'controlVideoUrl')
        blobSaves.push(tlSave(key, clone.controlVideoUrl!))
        clone.controlVideoUrl = key
      }
      // E3.2: handle variant blobs (videoUrl + thumbnailUrl per variant).
      // Each variant's data: URL is stored under a per-variant key so the
      // strip/restore round-trip preserves them across reloads.
      if (Array.isArray(clone.variants) && clone.variants.length > 0) {
        clone.variants = clone.variants.map(v => {
          const vclone = { ...v }
          if (isDataUrl(vclone.videoUrl)) {
            const key = `${BLOB_PREFIX}var_${vclone.id}_videoUrl`
            blobSaves.push(tlSave(key, vclone.videoUrl))
            vclone.videoUrl = key
          }
          if (isDataUrl(vclone.thumbnailUrl)) {
            const key = `${BLOB_PREFIX}var_${vclone.id}_thumbnailUrl`
            blobSaves.push(tlSave(key, vclone.thumbnailUrl))
            vclone.thumbnailUrl = key
          }
          return vclone
        })
      }
      return clone
    })

    // Strip blobs from audio cues
    const strippedCues = audioCues.map(cue => {
      const clone = { ...cue }
      if (isDataUrl(clone.audioUrl)) {
        const key = `${BLOB_PREFIX}cue_${cue.id}_audioUrl`
        blobSaves.push(tlSave(key, clone.audioUrl!))
        clone.audioUrl = key
      }
      if (isDataUrl(clone.audioB64)) {
        const key = `${BLOB_PREFIX}cue_${cue.id}_audioB64`
        blobSaves.push(tlSave(key, clone.audioB64!))
        clone.audioB64 = key
      }
      return clone
    })

    // Relay video blob
    let relayBlobKey: string | null = null
    if (isDataUrl(relayVideoUrl)) {
      relayBlobKey = `${BLOB_PREFIX}relay_video`
      blobSaves.push(tlSave(relayBlobKey, relayVideoUrl))
    }

    // E3.5: strip the global consistency anchor's b64 (a data URL) to a
    // blob ref so the anchor survives reloads without bloating localStorage.
    let anchorBlobKey: string | null = null
    let anchorMeta: ConsistencyAnchor | null = null
    if (globalConsistencyAnchor && isDataUrl(globalConsistencyAnchor.b64)) {
      anchorBlobKey = `${BLOB_PREFIX}anchor_global`
      blobSaves.push(tlSave(anchorBlobKey, globalConsistencyAnchor.b64))
      anchorMeta = { assetId: globalConsistencyAnchor.assetId, b64: anchorBlobKey }
    } else {
      anchorMeta = globalConsistencyAnchor
    }

    // Save metadata to localStorage
    const metadata = {
      segments: strippedSegments,
      audioCues: strippedCues,
      audioTracks,
      relayVideoUrl: relayBlobKey || relayVideoUrl,
      relaySegmentIds,
      relayAssetId,
      globalConsistencyAnchor: anchorMeta,
    }
    localStorage.setItem('tech_noir_timeline', JSON.stringify(metadata))

    // Fire-and-forget blob saves
    Promise.all(blobSaves).catch(err =>
      console.error('[Timeline] Failed to save blobs to IndexedDB:', err)
    )

    console.log('[Timeline] Persisted', segments.length, 'segments,', audioCues.length, 'cues,', blobSaves.length, 'blobs')
  } catch (e) {
    console.error('[Timeline] Failed to persist:', e)
  }
}

// Load: read metadata from localStorage, restore blobs from IndexedDB
async function loadPersistedTimeline(): Promise<{
  segments: TimelineSegment[]
  audioCues: AudioCue[]
  audioTracks: AudioTrackDef[]
  relayVideoUrl: string | null
  relaySegmentIds: string[]
  relayAssetId: string | null
  globalConsistencyAnchor: ConsistencyAnchor | null
} | null> {
  try {
    const raw = localStorage.getItem('tech_noir_timeline')
    if (!raw) return null

    const meta = JSON.parse(raw)
    if (!meta.segments) return null

    // Restore segment blobs
    const segments: TimelineSegment[] = []
    for (const seg of meta.segments as TimelineSegment[]) {
      const clone = { ...seg, params: { ...seg.params } }
      // Persisted JSON predates the type system — an out-of-union status
      // (e.g. "error") silently breaks the failed-state UI, so normalize
      // at the load boundary.
      clone.status = normalizeSegmentStatus(clone.status)
      for (const field of BLOB_FIELDS) {
        const val = clone[field] as string | null
        if (isBlobRef(val)) {
          const data = await tlLoad(val)
          ;(clone as any)[field] = data
        }
      }
      // Restore controlVideoUrl
      if (isBlobRef(clone.controlVideoUrl)) {
        clone.controlVideoUrl = await tlLoad(clone.controlVideoUrl)
      }
      // E3.2: restore variant blobs (videoUrl + thumbnailUrl per variant).
      if (Array.isArray(clone.variants) && clone.variants.length > 0) {
        clone.variants = await Promise.all(clone.variants.map(async v => {
          const vclone = { ...v }
          if (isBlobRef(vclone.videoUrl)) {
            vclone.videoUrl = (await tlLoad(vclone.videoUrl)) ?? vclone.videoUrl
          }
          if (isBlobRef(vclone.thumbnailUrl)) {
            vclone.thumbnailUrl = (await tlLoad(vclone.thumbnailUrl)) ?? vclone.thumbnailUrl
          }
          return vclone
        }))
      }
      // ── VACE migration ────────────────────────────────────────────────────
      // Drop stale LTX-only params and ensure every VACE field is present.
      // Without this, old persisted timelines crash the VACE-first UI.
      const staleLtxKeys: Array<keyof typeof clone.params> = [
        'guidePhases', 'epsilon', 'denoisingStrength', 'inputVideoStrength',
        'spatialUpscale', 'perturbationSwitch', 'perturbationLayers',
        'perturbationStartPerc', 'perturbationEndPerc', 'cameraPanX', 'cameraPanY',
        'cameraZoom', 'distilledMode', 'distilledLoraStrength', 'apgSwitch',
        'cfgStarSwitch', 'nagScale', 'nagTau', 'nagAlpha', 'altGuideScale',
        'altScale', 'audioGuideScale', 'audioCfgScale', 'sampleSolver',
        'selfRefinerSetting', 'selfRefinerPlan', 'selfRefinerFUncertainty',
        'selfRefinerCertainPercentage', 'videoPromptType', 'maskingStrength',
        'maskingSource', 'audioPromptType', 'outpaintingEnabled',
        'slidingWindow', 'slidingWindowSize', 'slidingWindowOverlap',
        'enhancePrompt', 'defaultProfile',
      ] as any
      for (const k of staleLtxKeys) delete (clone.params as any)[k]
      // Backfill VACE defaults for missing fields
      const D = DEFAULT_SEGMENT_PARAMS
      if (typeof clone.params.profile !== 'string') clone.params.profile = D.profile
      if (typeof clone.params.motionAmplitude !== 'number') clone.params.motionAmplitude = D.motionAmplitude
      if (typeof clone.params.flfMode !== 'boolean') clone.params.flfMode = D.flfMode
      if (typeof clone.params.resizeMethod !== 'string') clone.params.resizeMethod = D.resizeMethod
      if (!Array.isArray(clone.params.loras)) clone.params.loras = D.loras
      if (typeof clone.params.samplingSteps !== 'number') clone.params.samplingSteps = D.samplingSteps
      if (typeof clone.params.guideScale !== 'number') clone.params.guideScale = D.guideScale
      // TeaCache fields (Phase 8)
      if (typeof clone.params.teacacheEnabled !== 'boolean') clone.params.teacacheEnabled = D.teacacheEnabled
      if (typeof clone.params.teacacheThreshold !== 'number') clone.params.teacacheThreshold = D.teacacheThreshold
      // Progressive-resolution fields (Phase 16 — diffusers-engine only).
      // Backfill for segments persisted before these shipped.
      if (typeof clone.params.progressiveEnabled !== 'boolean') clone.params.progressiveEnabled = D.progressiveEnabled
      if (typeof clone.params.progressiveLevels !== 'number') clone.params.progressiveLevels = D.progressiveLevels
      if (typeof clone.params.progressiveDelta !== 'number') clone.params.progressiveDelta = D.progressiveDelta
      if (clone.params.progressiveMode !== 'dct' && clone.params.progressiveMode !== 'dct_rewind') {
        clone.params.progressiveMode = D.progressiveMode
      }
      // Model membership — the catalog is the ONLY authority. Persisted
      // legacy ids (wan-vace-lightning, wan-vace-base, …) are not catalog
      // routes: the director's model dropdown is catalog-driven
      // (familiesForForm), so anything outside the catalog resets to the
      // default. No hardcoded id lists, no legacy remap tables. (Before
      // the catalog loads every model resets — the dropdown re-seeds the
      // default anyway, so this only affects stale persisted ids.)
      const _cat = getCachedCatalog()
      if (!_cat?.models || typeof clone.params.model !== 'string' || !_cat.models[clone.params.model]) {
        clone.params.model = D.model
      }
      // Lip-sync fields (Phase 11) — backfill for old persisted segments
      if (typeof clone.lipSyncedVideoUrl !== 'string' && clone.lipSyncedVideoUrl !== null) {
        clone.lipSyncedVideoUrl = null
      }
      if (typeof clone.lipSyncPreferOriginal !== 'boolean') clone.lipSyncPreferOriginal = false
      // Phase 14 — LTX director flow fields. Backfill for segments
      // persisted before promptBeats/keyframes existed.
      if (!Array.isArray(clone.promptBeats)) clone.promptBeats = []
      if (!Array.isArray(clone.keyframes)) clone.keyframes = []
      // G1/G2 — Prompt Relay epsilon backfill
      if (typeof clone.params.relayEpsilon !== 'number' || isNaN(clone.params.relayEpsilon)) {
        clone.params.relayEpsilon = 0.01
      }
      // G3/G4 — Image conditioning backfill
      if (typeof clone.params.guideStrength !== 'number' || isNaN(clone.params.guideStrength)) {
        clone.params.guideStrength = 1.0
      }
      if (typeof clone.params.guideCrf !== 'number' || isNaN(clone.params.guideCrf)) {
        clone.params.guideCrf = 0
      }
      segments.push(clone)
    }

    // Restore audio cue blobs
    const audioCues: AudioCue[] = []
    for (const cue of meta.audioCues || []) {
      const clone = { ...cue }
      if (isBlobRef(clone.audioUrl)) {
        clone.audioUrl = await tlLoad(clone.audioUrl)
      }
      if (isBlobRef(clone.audioB64)) {
        clone.audioB64 = await tlLoad(clone.audioB64)
      }
      audioCues.push(clone)
    }

    // Restore relay video
    let relayVideoUrl = meta.relayVideoUrl || null
    if (isBlobRef(relayVideoUrl)) {
      relayVideoUrl = await tlLoad(relayVideoUrl)
    }

    console.log('[Timeline] Loaded', segments.length, 'segments,', audioCues.length, 'cues from localStorage + IndexedDB')

    return {
      segments,
      audioCues,
      audioTracks: meta.audioTracks || [],
      relayVideoUrl,
      relaySegmentIds: meta.relaySegmentIds || [],
      relayAssetId: meta.relayAssetId || null,
      // E3.5: restore the global consistency anchor b64 from its blob ref.
      globalConsistencyAnchor: await (async () => {
        const a = meta.globalConsistencyAnchor
        if (!a) return null
        if (isBlobRef(a.b64)) {
          const b64 = await tlLoad(a.b64)
          return { assetId: a.assetId, b64: b64 ?? a.b64 }
        }
        return { assetId: a.assetId, b64: a.b64 }
      })(),
    }
  } catch (e) {
    console.error('[Timeline] Failed to load persisted state:', e)
    return null
  }
}

// ── Undo/Redo history ─────────────────────────────────────────────────────────
const _history: { segments: TimelineSegment[]; audioCues: AudioCue[] }[] = []
let _historyIdx = -1
const MAX_HISTORY = 50

function pushHistory(segments: TimelineSegment[], audioCues: AudioCue[]) {
  _history.splice(_historyIdx + 1)
  _history.push({
    segments: segments.map(s => ({ ...s, params: { ...s.params } })),
    audioCues: audioCues.map(c => ({ ...c })),
  })
  if (_history.length > MAX_HISTORY) _history.shift()
  _historyIdx = _history.length - 1
}




interface TimelineStore {
  segments: TimelineSegment[]
  audioCues: AudioCue[]
  audioTracks: AudioTrackDef[]
  addAudioTrack: (label?: string) => AudioTrackDef
  removeAudioTrack: (id: string) => void
  viewport: TimelineViewport
  /** G10: Display time format — 'seconds' (default) or 'frames'. */
  timeFormat: 'seconds' | 'frames'
  playback: PlaybackState
  drag: DragState
  selectedSegmentId: string | null
  /** G8: Multi-select set. The "primary" selection (`selectedSegmentId`)
   *  is always a member when this set is non-empty. Shift-click extends,
   *  ctrl/cmd-click toggles individual segments. */
  selectedSegmentIds: Set<string>
  /** E3.11: Active status filter on the storyboard grid. Null = no
   *  filter (show all segments). Set by clicking a status pill on the
   *  flow ribbon. UI-only state — not persisted (resets to 'all'
   *  on reload). */
  storyboardStatusFilter: SegmentStatus | null
  /** G8: Marked in/out range in seconds. Null = no range marked. */
  inOutPoints: InOutPoints | null
  /** E2.7: Chapter markers on the timeline. Ordered by `time`. */
  markers: ChapterMarker[]
  selectedAudioCueId: string | null

  // Relay state — the single continuous video from Director prompt relay
  relayVideoUrl: string | null
  relaySegmentIds: string[]
  relayAssetId: string | null

  /** E3.5: Global consistency anchor — a face/character reference image
   *  that all segments inherit unless they have a per-segment override.
   *  Set via the toolbar slot; persisted across reloads. */
  globalConsistencyAnchor: ConsistencyAnchor | null

  initialized: boolean
  initialize: () => Promise<void>

  addSegment: (partial?: Partial<TimelineSegment>) => TimelineSegment
  removeSegment: (id: string) => void
  updateSegment: (id: string, patch: Partial<TimelineSegment>) => void
  reorderSegments: (orderedIds: string[]) => void
  /** E3.2: Add a variant take to a segment's `variants[]` array. If the
   *  array is over MAX_VARIANTS_PER_SEGMENT after the push, the OLDEST
   *  non-primary variant is evicted (FIFO). The variant's `id` is minted
   *  here (caller passes variant data without an id). Returns the stored
   *  variant (with id). No-op if the segment doesn't exist. */
  addVariant: (segId: string, variant: VariantInput) => VideoVariant | null
  /** E3.2: Remove a variant by id. Does NOT touch the segment's primary
   *  `videoUrl` — to swap the primary, use `promoteVariant` instead. No-op
   *  if the segment or variant doesn't exist. */
  removeVariant: (segId: string, variantId: string) => void
  /** E3.2: Promote a variant to the segment's primary `videoUrl`. The
   *  outgoing primary is demoted into `variants[]` (as a fresh variant
   *  with a new id and the original seed), and the promoted variant is
   *  removed from `variants[]`. Thumbnail, assetId, and seed on the
   *  promoted variant also become the segment's primary fields. No-op if
   *  the segment or variant doesn't exist, or if the segment has no
   *  current `videoUrl` to demote (in which case we still promote). */
  promoteVariant: (segId: string, variantId: string) => void
  /** E3.2: Bulk-set a segment's variants array. Used by the "Generate 4"
   *  button to write all four results in one atomic store update (instead
   *  of four addVariant calls that would each trigger history+persist).
   *  Eviction applies. No-op if the segment doesn't exist. */
  setVariants: (segId: string, variants: VariantInput[]) => void
  /** E2.6: Toggle the lock state of a segment. Locked segments resist
   *  drag/trim/remove. Returns the new lock state. */
  toggleSegmentLock: (id: string) => boolean
  /** E2.6: Assign every segment in the current multi-select set to the
   *  same (new) groupId so they move as a unit. Returns the new groupId
   *  or null if the selection was empty. */
  groupSelectedSegments: () => string | null
  /** E2.6: Clear the groupId from every segment matching `groupId`,
   *  dissolving the group. */
  ungroupSegments: (groupId: string) => void
  /** E2.5: Mute/unmute an audio track. Muted tracks contribute no audio
   *  during playback or render. */
  setTrackMuted: (trackId: string, muted: boolean) => void
  /** E2.5: Solo/unsolo an audio track. Soloing a track implicitly mutes
   *  every other track. Solo on a muted track is ignored (mute wins). */
  setTrackSolo: (trackId: string, solo: boolean) => void
  /** G9: Split the segment at the playhead position. The segment under the
   *  playhead is split into two: [start, playhead) and [playhead, end).
   *  Params, prompt, etc. are copied to both halves. Prompt beats and
   *  keyframes before the split stay on the first half; those after go to
   *  the second. Video URLs are cleared (the split invalidates the render).
   *  No-op if the playhead is at a segment boundary or outside a segment. */
  splitSegmentAtPlayhead: () => void
  /** E2.3: Remove a segment AND close the gap it leaves behind by shifting
   *  every later segment left by the deleted segment's duration. Locked
   *  segments are still shifted (their content isn't modified — only their
   *  start time). No-op if the target doesn't exist or is locked (locked
   *  segments resist deletion; use removeSegment after unlocking). */
  rippleDelete: (id: string) => void
  /** E2.3: Roll edit — drag the shared boundary between two adjacent clips.
   *  `delta` seconds are subtracted from the left clip's duration and added
   *  to the right clip's start, while the right clip's duration shrinks
   *  (or vice-versa for negative delta). Total timeline length is preserved.
   *  `delta` is clamped so neither clip drops below `minDuration` (0.5s).
   *  No-op if either id is unknown, either is locked, or the clips aren't
   *  actually adjacent in time. */
  rollEdit: (leftId: string, rightId: string, deltaSeconds: number) => void
  /** G11: Serialize the timeline (segments + audio cues + tracks) to a
   *  JSON string. Returns the JSON string ready for download. */
  exportTimeline: () => string
  /** G11: Import a timeline from a JSON string. Replaces the current
   *  timeline entirely. Returns true on success, false on parse error. */
  importTimeline: (json: string) => boolean
  undo: () => void
  redo: () => void

  addAudioCue: (cue: Omit<AudioCue, 'id'>) => AudioCue
  removeAudioCue: (id: string) => void
  updateAudioCue: (id: string, patch: Partial<AudioCue>) => void

  setRelayVideo: (url: string | null, segmentIds: string[], assetId?: string | null) => void
  /** E3.5: Set the global consistency anchor (face/character reference).
   *  Pass null to clear. All segments inherit this unless they have a
   *  per-segment `consistencyAnchor` override. */
  setGlobalConsistencyAnchor: (anchor: ConsistencyAnchor | null) => void
  /** E3.5: Resolve the effective anchor for a segment — the per-segment
   *  override if set, otherwise the global anchor. Returns null if
   *  neither is set. */
  getEffectiveConsistencyAnchor: (segId: string) => ConsistencyAnchor | null
  setViewport: (patch: Partial<TimelineViewport>) => void
  /** E3.11: Set the storyboard status filter. Pass null to clear. */
  setStoryboardStatusFilter: (status: SegmentStatus | null) => void
  /** G10: Toggle between 'seconds' and 'frames' display. */
  setTimeFormat: (fmt: 'seconds' | 'frames') => void
  setPlayback: (patch: Partial<PlaybackState>) => void
  setDrag: (patch: Partial<DragState>) => void
  setSelectedSegment: (id: string | null) => void
  setSelectedAudioCue: (id: string | null) => void
  /** E4.1: Snapshot the primary-selected segment's params + prompt +
   *  negativePrompt into the module-level clipboard. Returns true if a
   *  segment was selected and copied, false otherwise (no-op). */
  copySelectedSegmentParams: () => boolean
  /** E4.1: Paste the clipboard into a single segment by id. Returns true
   *  on a successful apply, false if the clipboard is empty or the
   *  target segment doesn't exist. Records history + schedules persist. */
  pasteParamsToSegment: (id: string) => boolean
  /** E4.1: Convenience — paste the clipboard into the primary-selected
   *  segment. Returns false if no selection or no clipboard. */
  pasteParamsToSelected: () => boolean
  /** E4.5: Duplicate a segment N times, bumping `seed` by 1 on each
   *  copy (source.seed + i for the i-th copy, 1-indexed). Copies are
   *  inserted IMMEDIATELY after the source; later segments shift right
   *  by (count × source.duration) seconds. Clears render state on each
   *  copy (videoUrl, thumbnail, status → 'empty') since a different
   *  seed means a different render. Returns the new segments (empty
   *  array on unknown id or count ≤ 0). */
  duplicateWithOffset: (sourceId: string, count: number) => TimelineSegment[]

  // ── G8: Multi-select + in/out points ────────────────────────────────
  /** G8: Extend the multi-select set to include `id` and all segments
   *  between the current anchor (`selectedSegmentId`) and `id`. The
   *  anchor stays the primary selection. No-op if `id` is the anchor. */
  selectSegmentRange: (id: string) => void
  /** G8: Toggle `id` in the multi-select set. If the set becomes empty,
   *  clears `selectedSegmentId`. If toggled on and no primary is set,
   *  promotes `id` to primary. */
  toggleSegmentInSelection: (id: string) => void
  /** G8: Clear the multi-select set (single-select mode). */
  clearMultiSelection: () => void
  /** G8: Select all segments (ctrl/cmd+A). */
  selectAllSegments: () => void
  /** G8: Mark the in point at the playhead position. If an out point
   *  already exists before the playhead, it's cleared first. */
  markInAtPlayhead: () => void
  /** G8: Mark the out point at the playhead position. If no in point
   *  is set, defaults to 0. If the playhead is before the in point,
   *  the in point is moved to 0. */
  markOutAtPlayhead: () => void
  /** G8: Mark a selection spanning the segment(s) under the playhead.
   *  Multiple segments can be hit if the playhead is on a boundary. */
  markSelectionFromPlayhead: () => void
  /** G8: Explicit in/out set (e.g. for retake range pre-fill). */
  setInOutPoints: (start: number, end: number) => void
  /** G8: Clear the in/out range. */
  clearInOutPoints: () => void

  /** E2.7: Add a chapter marker at the given time (defaults to the
   *  current playhead). Returns the new marker. The label defaults to
   *  "Marker N" but callers can override. */
  addMarker: (time?: number, label?: string) => ChapterMarker
  /** E2.7: Remove a marker by id. */
  removeMarker: (id: string) => void
  /** E2.7: Patch an existing marker (e.g. rename, retime). */
  updateMarker: (id: string, patch: Partial<ChapterMarker>) => void
  /** E2.7: Remove all markers. */
  clearMarkers: () => void

  reset: () => void
}

const DEFAULT_VIEWPORT: TimelineViewport = {
  scrollX: 0,
  pixelsPerSecond: 60,
  canvasWidth: 1200,
  canvasHeight: 400,
}

const DEFAULT_PLAYBACK: PlaybackState = {
  isPlaying: false,
  currentTime: 0,
  totalDuration: 5,
  loopRegion: false,
}

const DEFAULT_DRAG: DragState = {
  isDragging: false,
  segmentId: null,
  mouseX: 0,
  mouseY: 0,
  originalOrder: 0,
  ghostOrder: 0,
}

// ─── E2.12: Debounced persistence ──────────────────────────────────────
// State mutators fire repeatedly during a single user gesture (e.g. a drag
// emits dozens of `updateSegment` calls per second). Calling `persistTimeline`
// — which JSON-stringifies the timeline and writes blobs to IndexedDB — on
// every tick made the UI janky and queued many overlapping async IDB writes.
// `schedulePersist` debounces those calls into a single trailing write
// (PERSIST_DEBOUNCE_MS). `flushPersist` is the synchronous-ish escape hatch
// used by tests and the beforeunload handler so no pending state is lost
// when the tab closes mid-debounce.
type PersistArgs = Parameters<typeof persistTimeline>

const PERSIST_DEBOUNCE_MS = 300
let _persistTimer: ReturnType<typeof setTimeout> | null = null
let _pendingPersist: PersistArgs | null = null
// Test hook: increments every time persistTimeline actually runs.
export let _persistRunCount = 0
function _bumpPersistRunCount() {
  // Module-let mutation requires re-assigning an exported binding; Vitest
  // can read the live value via `import { _persistRunCount }`.
  ;(_persistRunCount as number)++
}

function schedulePersist(state: Pick<TimelineStore, 'segments' | 'audioCues' | 'audioTracks' | 'relayVideoUrl' | 'relaySegmentIds' | 'relayAssetId' | 'globalConsistencyAnchor'>) {
  _pendingPersist = [
    state.segments, state.audioCues, state.audioTracks,
    state.relayVideoUrl, state.relaySegmentIds, state.relayAssetId,
    state.globalConsistencyAnchor,
  ]
  if (_persistTimer !== null) clearTimeout(_persistTimer)
  _persistTimer = setTimeout(() => {
    _persistTimer = null
    // Proven dead false-arm (2026-09-12): schedulePersist always assigns a
    // non-null _pendingPersist in the same sync block that arms this timer,
    // and flushPersist clears the timer in the same sync block that nulls
    // _pendingPersist — single-threaded JS admits no interleaving that
    // could null it mid-flight.
    /* v8 ignore next -- _pendingPersist is always set when the timer is armed (2026-09-12) */
    if (_pendingPersist) {
      const args = _pendingPersist
      _pendingPersist = null
      void persistTimeline(...args).then(() => _bumpPersistRunCount())
    }
  }, PERSIST_DEBOUNCE_MS)
}

/** Flush any pending debounced persistence immediately. Returns the
 *  in-flight persistence promise (or a resolved promise if nothing pending). */
export function flushPersist(): Promise<void> {
  if (_persistTimer !== null) {
    clearTimeout(_persistTimer)
    _persistTimer = null
  }
  if (_pendingPersist) {
    const args = _pendingPersist
    _pendingPersist = null
    return persistTimeline(...args).then(() => _bumpPersistRunCount())
  }
  return Promise.resolve()
}

// Before the tab closes, synchronously kick off any pending persist so we
// don't lose the last 300ms of edits. (`persistTimeline` is async; the
// browser will keep the page alive briefly for the IDB write to start.)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => { void flushPersist() })
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  segments: [],
  audioCues: [],
  audioTracks: [],
  viewport: { ...DEFAULT_VIEWPORT },
  timeFormat: 'seconds',
  playback: { ...DEFAULT_PLAYBACK },
  drag: { ...DEFAULT_DRAG },
  selectedSegmentId: null,
  selectedSegmentIds: new Set<string>(),
  storyboardStatusFilter: null,
  inOutPoints: null,
  markers: [],
  selectedAudioCueId: null,
  relayVideoUrl: null,
  relaySegmentIds: [],
  relayAssetId: null,
  globalConsistencyAnchor: null,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return
    const loaded = await loadPersistedTimeline()
    if (loaded) {
      // Restore _nextId to avoid ID collisions
      const allIds = [
        ...loaded.segments.map(s => s.id),
        ...loaded.audioCues.map(c => c.id),
        ...loaded.audioTracks.map(t => t.id),
      ]
      for (const id of allIds) {
        const numMatch = id.match(/^seg_(\d+)_/)
        if (numMatch) {
          const num = parseInt(numMatch[1], 10)
          if (num >= _nextId) _nextId = num + 1
        }
      }

      const totalDuration = loaded.segments.reduce((t, seg) => Math.max(t, seg.start + seg.duration), 0)
      set({
        segments: loaded.segments,
        audioCues: loaded.audioCues,
        audioTracks: loaded.audioTracks,
        relayVideoUrl: loaded.relayVideoUrl,
        relaySegmentIds: loaded.relaySegmentIds,
        relayAssetId: loaded.relayAssetId,
        globalConsistencyAnchor: loaded.globalConsistencyAnchor,
        playback: { isPlaying: false, currentTime: 0, totalDuration, loopRegion: false },
        initialized: true,
      })
      // Seed undo history with loaded state
      pushHistory(loaded.segments, loaded.audioCues)
    } else {
      set({ initialized: true })
    }
  },

  addSegment: (partial) => {
    const state = get()
    const order = state.segments.length
    const seg: TimelineSegment = {
      id: uid(),
      order,
      start: order * 5,
      duration: 5,
      prompt: '',
      negativePrompt: '',
      thumbnailUrl: null,
      videoUrl: null,
      firstFrameB64: null,
      lastFrameB64: null,
      params: { ...DEFAULT_SEGMENT_PARAMS },
      trimStart: 0,
      sourceStepId: null,
      status: 'empty',
      error: null,
      controlVideoUrl: null,
      lipSyncedVideoUrl: null,
      lipSyncPreferOriginal: false,
      // LTX director flow (Phase 14) — empty by default. Backend picks the
      // legacy vace_director chain when both are empty, and the scheduled
      // path when promptBeats is non-empty (or keyframes has 2+ entries).
      promptBeats: [],
      keyframes: [],
      ...partial,
    }
    set((s) => {
      const segments = [...s.segments, seg]
      const totalDuration = segments.reduce((t, seg) => Math.max(t, seg.start + seg.duration), 0)
      pushHistory(segments, s.audioCues)
      return { segments, playback: { ...s.playback, totalDuration } }
    })
    schedulePersist(get())
    return seg
  },

  removeSegment: (id) => {
    set((s) => {
      // E2.6: refuse to remove a locked segment. The UI also hides the
      // remove button, but the store is the source of truth.
      const target = s.segments.find((seg) => seg.id === id)
      if (target?.locked) return {}
      const segments = s.segments.filter((seg) => seg.id !== id).map((seg, i) => ({ ...seg, order: i }))
      pushHistory(segments, s.audioCues)
      // Invalidate relay if removed segment was part of it
      const relayActive = s.relaySegmentIds.includes(id)
      // G8: also clean up multi-select set + in/out can stay (time-based, not id-based)
      const nextSelectedIds = new Set(s.selectedSegmentIds)
      nextSelectedIds.delete(id)
      return {
        segments,
        selectedSegmentId: s.selectedSegmentId === id ? null : s.selectedSegmentId,
        selectedSegmentIds: nextSelectedIds,
        ...(relayActive ? { relayVideoUrl: null, relaySegmentIds: [] } : {}),
      }
    })
    schedulePersist(get())
  },

  updateSegment: (id, patch) => {
    set((s) => {
      const segments = s.segments.map((seg) => seg.id === id ? { ...seg, ...patch } : seg)
      pushHistory(segments, s.audioCues)
      return { segments }
    })
    schedulePersist(get())
  },

  reorderSegments: (orderedIds) => {
    set((s) => {
      const map = new Map(s.segments.map((seg) => [seg.id, seg]))
      let cursor = 0
      const segments = orderedIds.map((id, i) => {
        const seg = map.get(id)
        if (!seg) return null
        const newSeg = { ...seg, order: i, start: cursor }
        cursor += seg.duration
        return newSeg
      }).filter(Boolean) as TimelineSegment[]
      const totalDuration = segments.reduce((t, seg) => Math.max(t, seg.start + seg.duration), 0)
      pushHistory(segments, s.audioCues)
      return { segments, playback: { ...s.playback, totalDuration } }
    })
    schedulePersist(get())
  },

  // ── E3.2: Variant CRUD ────────────────────────────────────────────────────
  // These power the "Generate 4" → picker flow. Variants are stored on the
  // segment as `variants: VideoVariant[]`; the segment's primary `videoUrl`
  // is independent until the user explicitly promotes a variant. Eviction
  // is FIFO beyond MAX_VARIANTS_PER_SEGMENT so the picker never grows
  // unbounded (mirrors E1.3's "keep last 4 per segment" eviction policy).
  addVariant: (segId, variant) => {
    // Check segment existence BEFORE minting an id, so unknown segId is a
    // clean no-op that returns null (callers can detect the failure).
    if (!get().segments.some((seg) => seg.id === segId)) return null
    const stored: VideoVariant = {
      id: variant.id ?? variantUid(),
      seed: variant.seed,
      videoUrl: variant.videoUrl,
      assetId: variant.assetId,
      createdAt: variant.createdAt ?? Date.now(),
      thumbnailUrl: variant.thumbnailUrl ?? null,
      // E3.3: default to 'seed' for back-compat with E3.2 callers + the
      // Generate-4 flow. Retake/lipsync/manual explicitly set their kind.
      kind: variant.kind ?? 'seed',
    }
    set((s) => {
      const target = s.segments.find((seg) => seg.id === segId)
      // Proven dead (2026-09-12): the caller synchronously verified the
      // target via get() and returned null otherwise; no await or
      // re-entrancy sits between, so the updater always finds it.
      /* v8 ignore next -- target always exists: sync get-then-set, no interleave (2026-09-12) */
      if (!target) return {}
      const existing = Array.isArray(target.variants) ? [...target.variants] : []
      existing.push(stored)
      // FIFO eviction past the cap (drop the oldest by createdAt).
      while (existing.length > MAX_VARIANTS_PER_SEGMENT) {
        existing.shift()
      }
      const segments = s.segments.map((seg) =>
        seg.id === segId ? { ...seg, variants: existing } : seg,
      )
      pushHistory(segments, s.audioCues)
      return { segments }
    })
    schedulePersist(get())
    return stored
  },

  removeVariant: (segId, variantId) => {
    set((s) => {
      const target = s.segments.find((seg) => seg.id === segId)
      if (!target || !Array.isArray(target.variants)) return {}
      const next = target.variants.filter((v) => v.id !== variantId)
      if (next.length === target.variants.length) return {} // no-op
      const segments = s.segments.map((seg) =>
        seg.id === segId ? { ...seg, variants: next } : seg,
      )
      pushHistory(segments, s.audioCues)
      return { segments }
    })
    schedulePersist(get())
  },

  promoteVariant: (segId, variantId) => {
    set((s) => {
      const target = s.segments.find((seg) => seg.id === segId)
      if (!target || !Array.isArray(target.variants)) return {}
      const promoted = target.variants.find((v) => v.id === variantId)
      if (!promoted) return {}
      // Demote the outgoing primary into the variants list as a fresh
      // variant entry. We mint a new id (not reuse the promoted variant's
      // id) so the entry has a stable identity in the picker UI. The seed
      // comes from the segment's params (the seed used to generate the
      // current primary); if absent, fall back to 0. E3.3: the demoted
      // entry's kind defaults to 'seed' — we don't track the primary's
      // provenance separately, so this loses kind info on demote. That's
      // acceptable: variants IN the list always carry their true kind.
      const demotedEntry: VideoVariant | null = target.videoUrl
        ? {
            id: variantUid(),
            seed: target.params?.seed ?? 0,
            videoUrl: target.videoUrl,
            assetId: target.assetId,
            createdAt: Date.now(),
            thumbnailUrl: target.thumbnailUrl ?? null,
            kind: 'seed',
          }
        : null
      // Remove the promoted variant from the list, then optionally prepend
      // the demoted primary. Prepending keeps the most recently demoted
      // take at the front of the picker (matches "recents first" UX).
      const remaining = target.variants.filter((v) => v.id !== variantId)
      const nextVariants = demotedEntry ? [demotedEntry, ...remaining] : remaining
      // Eviction still applies — demotion can push us over the cap.
      while (nextVariants.length > MAX_VARIANTS_PER_SEGMENT) {
        nextVariants.pop()
      }
      // Promote: swap primary fields with the variant's. We keep the
      // segment's existing `duration`, `start`, `prompt`, etc. — only the
      // video-asset fields move.
      const segments = s.segments.map((seg) => {
        if (seg.id !== segId) return seg
        return {
          ...seg,
          videoUrl: promoted.videoUrl,
          assetId: promoted.assetId ?? seg.assetId,
          thumbnailUrl: promoted.thumbnailUrl ?? seg.thumbnailUrl,
          // Reflect the promoted seed in params so a subsequent "regenerate"
          // picks up where this take left off.
          params: { ...seg.params, seed: promoted.seed },
          variants: nextVariants,
          status: 'ready' as const,
        }
      })
      pushHistory(segments, s.audioCues)
      return { segments }
    })
    schedulePersist(get())
  },

  setVariants: (segId, variants) => {
    set((s) => {
      const target = s.segments.find((seg) => seg.id === segId)
      if (!target) return {}
      const stored: VideoVariant[] = variants.map((v) => ({
        id: v.id ?? variantUid(),
        seed: v.seed,
        videoUrl: v.videoUrl,
        assetId: v.assetId,
        createdAt: v.createdAt ?? Date.now(),
        thumbnailUrl: v.thumbnailUrl ?? null,
        // E3.3: default to 'seed' for back-compat.
        kind: v.kind ?? 'seed',
      }))
      // FIFO eviction past the cap.
      while (stored.length > MAX_VARIANTS_PER_SEGMENT) {
        stored.shift()
      }
      const segments = s.segments.map((seg) =>
        seg.id === segId ? { ...seg, variants: stored } : seg,
      )
      pushHistory(segments, s.audioCues)
      return { segments }
    })
    schedulePersist(get())
  },

  toggleSegmentLock: (id) => {
    let newLock = false
    set((s) => {
      const segments = s.segments.map((seg) => {
        if (seg.id !== id) return seg
        newLock = !seg.locked
        return { ...seg, locked: newLock }
      })
      pushHistory(segments, s.audioCues)
      return { segments }
    })
    schedulePersist(get())
    return newLock
  },

  groupSelectedSegments: () => {
    const s = get()
    const ids = Array.from(s.selectedSegmentIds)
    if (ids.length < 2) return null  // grouping a single segment is meaningless
    const gid = `grp_${Date.now().toString(36)}`
    set((s) => {
      const segments = s.segments.map((seg) =>
        s.selectedSegmentIds.has(seg.id) ? { ...seg, groupId: gid } : seg,
      )
      pushHistory(segments, s.audioCues)
      return { segments }
    })
    schedulePersist(get())
    return gid
  },

  ungroupSegments: (groupId) => {
    set((s) => {
      const segments = s.segments.map((seg) =>
        seg.groupId === groupId ? { ...seg, groupId: null } : seg,
      )
      pushHistory(segments, s.audioCues)
      return { segments }
    })
    schedulePersist(get())
  },

  setTrackMuted: (trackId, muted) => {
    set((s) => ({
      audioTracks: s.audioTracks.map((t) =>
        t.id === trackId ? { ...t, muted } : t,
      ),
    }))
    schedulePersist(get())
  },

  setTrackSolo: (trackId, solo) => {
    set((s) => ({
      audioTracks: s.audioTracks.map((t) =>
        t.id === trackId ? { ...t, solo } : t,
      ),
    }))
    schedulePersist(get())
  },

  splitSegmentAtPlayhead: () => {
    const state = get()
    const playhead = state.playback.currentTime
    // Find the segment under the playhead.
    const seg = state.segments.find(
      s => playhead >= s.start && playhead < s.start + s.duration,
    )
    if (!seg) return // playhead outside any segment

    const splitOffset = playhead - seg.start // seconds into the segment
    const segFrames = seg.params.frames
    const segFps = seg.params.fps

    // Don't split if within 0.1s of a boundary (avoids micro-segments).
    if (splitOffset < 0.1 || splitOffset > seg.duration - 0.1) return

    // Split frames proportionally (rounded to nearest frame).
    const splitFrame = Math.round(splitOffset * segFps)
    const firstFrames = Math.max(1, splitFrame)
    const secondFrames = Math.max(1, segFrames - splitFrame)

    // Partition prompt beats and keyframes.
    const partitionTimeBased = <T extends { time: number }>(items: T[]): [T[], T[]] => {
      const before = items.filter(i => i.time < splitOffset)
      const after = items
        .filter(i => i.time >= splitOffset)
        .map(i => ({ ...i, time: i.time - splitOffset }))
      return [before, after]
    }
    const [beatsBefore, beatsAfter] = partitionTimeBased(seg.promptBeats ?? [])
    const [kfsBefore, kfsAfter] = partitionTimeBased(seg.keyframes ?? [])

    const firstHalf: TimelineSegment = {
      ...seg,
      params: { ...seg.params, frames: firstFrames },
      duration: firstFrames / segFps,
      promptBeats: beatsBefore,
      keyframes: kfsBefore,
      // Clear renders — the split invalidates the old video.
      videoUrl: null,
      thumbnailUrl: null,
      status: 'empty',
      error: null,
    }
    const secondHalf: TimelineSegment = {
      ...seg,
      id: uid(),
      order: seg.order + 1,
      start: seg.start + splitOffset,
      duration: secondFrames / segFps,
      params: { ...seg.params, frames: secondFrames, seed: seg.params.seed + 1 },
      promptBeats: beatsAfter,
      keyframes: kfsAfter,
      videoUrl: null,
      thumbnailUrl: null,
      assetId: undefined,
      status: 'empty',
      error: null,
    }

    set((s) => {
      const segments = [
        ...s.segments.slice(0, seg.order),
        firstHalf,
        secondHalf,
        ...s.segments.slice(seg.order + 1).map((seg, _i) => ({
          ...seg,
          order: seg.order + 1,
        })),
      ]
      pushHistory(segments, s.audioCues)
      return { segments }
    })
    schedulePersist(get())
  },

  rippleDelete: (id) => {
    set((s) => {
      const target = s.segments.find((seg) => seg.id === id)
      // Locked segments resist deletion (same contract as removeSegment).
      if (!target || target.locked) return {}

      const targetEnd = target.start + target.duration
      const shift = target.duration

      // Remove the target; shift everything that starts at or after the
      // target's end left by `shift`. We deliberately shift on `start >= targetEnd`
      // (not `> target.start`) so neighbours that touched the target's end
      // get pulled in to fill the gap exactly. Segments that started before
      // the target's end (overlaps) are left alone — ripple shouldn't
      // try to resolve overlaps, that's the user's job.
      const next = s.segments
        .filter((seg) => seg.id !== id)
        .map((seg) => {
          if (seg.start >= targetEnd) {
            return { ...seg, start: Math.max(0, seg.start - shift) }
          }
          return seg
        })
        .map((seg, i) => ({ ...seg, order: i }))

      pushHistory(next, s.audioCues)

      const nextSelectedIds = new Set(s.selectedSegmentIds)
      nextSelectedIds.delete(id)
      const relayActive = s.relaySegmentIds.includes(id)
      return {
        segments: next,
        selectedSegmentId: s.selectedSegmentId === id ? null : s.selectedSegmentId,
        selectedSegmentIds: nextSelectedIds,
        ...(relayActive ? { relayVideoUrl: null, relaySegmentIds: [] } : {}),
      }
    })
    schedulePersist(get())
  },

  rollEdit: (leftId, rightId, deltaSeconds) => {
    set((s) => {
      const left = s.segments.find((seg) => seg.id === leftId)
      const right = s.segments.find((seg) => seg.id === rightId)
      // Both must exist and be unlocked.
      if (!left || !right || left.locked || right.locked) return {}

      // Must be adjacent: left ends where right starts (within 1ms).
      const leftEnd = left.start + left.duration
      if (Math.abs(leftEnd - right.start) > 0.001) return {}

      const minDuration = 0.5
      // Clamp delta so neither clip drops below minDuration.
      const maxGrow = right.duration - minDuration        // how much left can grow
      const maxShrink = left.duration - minDuration       // how much left can shrink
      const clampedDelta = Math.max(-maxShrink, Math.min(maxGrow, deltaSeconds))
      if (clampedDelta === 0) return {}

      const next = s.segments.map((seg) => {
        if (seg.id === leftId) {
          return { ...seg, duration: seg.duration + clampedDelta }
        }
        if (seg.id === rightId) {
          // Right clip shifts right by delta and loses that much duration.
          return {
            ...seg,
            start: seg.start + clampedDelta,
            duration: seg.duration - clampedDelta,
          }
        }
        return seg
      })

      pushHistory(next, s.audioCues)
      return { segments: next }
    })
    schedulePersist(get())
  },

  exportTimeline: () => {
    const state = get()
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      segments: state.segments,
      audioCues: state.audioCues,
      audioTracks: state.audioTracks,
    }
    return JSON.stringify(data, null, 2)
  },

  importTimeline: (json) => {
    try {
      const data = JSON.parse(json)
      if (!data || !Array.isArray(data.segments)) return false
      set((s) => {
        const segments = data.segments.map((seg: TimelineSegment, i: number) => ({
          ...seg,
          order: i, // ensure sequential ordering
          status: normalizeSegmentStatus(seg.status), // imported JSON may carry out-of-union statuses
        })) as TimelineSegment[]
        const audioCues = Array.isArray(data.audioCues) ? data.audioCues : []
        const audioTracks = Array.isArray(data.audioTracks) && data.audioTracks.length > 0
          ? data.audioTracks
          : s.audioTracks
        const totalDuration = segments.reduce(
          (t: number, seg: TimelineSegment) => Math.max(t, seg.start + seg.duration), 0,
        )
        pushHistory(segments, audioCues)
        return {
          segments,
          audioCues,
          audioTracks,
          selectedSegmentId: null,
          selectedSegmentIds: new Set<string>(),
          storyboardStatusFilter: null,
          inOutPoints: null,
          playback: { ...s.playback, totalDuration, currentTime: 0, isPlaying: false },
        }
      })
      schedulePersist(get())
      return true
    } catch (e) {
      // NO SILENT SWALLOW — import can fail on malformed JSON, schema
      // mismatch, or invalid segment shape. Log the actual error so the
      // user feedback ("import failed") has a matching dev-side trace.
      console.error('[timeline] importTimeline failed:', e)
      return false
    }
  },

  addAudioTrack: (label) => {
    const state = get()
    const idx = state.audioTracks.length
    const color = TRACK_COLORS[idx % TRACK_COLORS.length]
    const track: AudioTrackDef = {
      id: uid(),
      label: label || `Audio ${idx + 1}`,
      color,
      height: 48,
    }
    set((s) => ({ audioTracks: [...s.audioTracks, track] }))
    schedulePersist(get())
    return track
  },

  removeAudioTrack: (id) => {
    set((s) => ({
      audioTracks: s.audioTracks.filter((t) => t.id !== id),
      audioCues: s.audioCues.filter((c) => c.track !== id),
      selectedAudioCueId: s.selectedAudioCueId && s.audioCues.find(c => c.id === s.selectedAudioCueId)?.track === id ? null : s.selectedAudioCueId,
    }))
    schedulePersist(get())
  },

  addAudioCue: (cue) => {
    const full: AudioCue = { ...cue, id: uid() }
    set((s) => ({ audioCues: [...s.audioCues, full] }))
    schedulePersist(get())
    return full
  },

  removeAudioCue: (id) => {
    set((s) => ({
      audioCues: s.audioCues.filter((c) => c.id !== id),
      selectedAudioCueId: s.selectedAudioCueId === id ? null : s.selectedAudioCueId,
    }))
    schedulePersist(get())
  },

  updateAudioCue: (id, patch) => {
    set((s) => ({
      audioCues: s.audioCues.map((c) => c.id === id ? { ...c, ...patch } : c),
    }))
    schedulePersist(get())
  },

  setRelayVideo: (url, segmentIds, assetId) => {
    set({ relayVideoUrl: url, relaySegmentIds: segmentIds, relayAssetId: assetId })
    schedulePersist(get())
  },

  // E3.5: Consistency anchor — global face/character reference.
  setGlobalConsistencyAnchor: (anchor) => {
    set({ globalConsistencyAnchor: anchor })
    schedulePersist(get())
  },

  getEffectiveConsistencyAnchor: (segId) => {
    const s = get()
    const seg = s.segments.find((x) => x.id === segId)
    // Per-segment override wins; otherwise fall back to the global anchor.
    if (seg?.consistencyAnchor) return seg.consistencyAnchor
    return s.globalConsistencyAnchor
  },

  setViewport: (patch) => set((s) => ({ viewport: { ...s.viewport, ...patch } })),
  setStoryboardStatusFilter: (status) => set({ storyboardStatusFilter: status }),
  setTimeFormat: (fmt) => set({ timeFormat: fmt }),
  setPlayback: (patch) => set((s) => ({ playback: { ...s.playback, ...patch } })),
  setDrag: (patch) => set((s) => ({ drag: { ...s.drag, ...patch } })),
  // G8: Single-select clears the multi-select set — this is the "plain
  // click" path. Shift-click and ctrl/cmd-click use the dedicated actions.
  setSelectedSegment: (id) => set({
    selectedSegmentId: id,
    selectedSegmentIds: new Set<string>(id ? [id] : []),
  }),
  setSelectedAudioCue: (id) => set({ selectedAudioCueId: id }),

  // ── E4.1: Copy/paste segment params ──────────────────────────────────
  // The clipboard lives in lib/segment-clipboard (module-level, NOT
  // persisted). These store actions are thin wrappers: they resolve the
  // selected/target segment, delegate to the clipboard helpers, and
  // apply the patch through updateSegment so history + persist fire
  // exactly once per paste.
  copySelectedSegmentParams: () => {
    const { selectedSegmentId, segments } = get()
    if (!selectedSegmentId) return false
    const seg = segments.find((s) => s.id === selectedSegmentId)
    if (!seg) return false
    copySegmentParams(seg)
    return true
  },
  pasteParamsToSegment: (id) => {
    const seg = get().segments.find((s) => s.id === id)
    if (!seg) return false
    const patch = pasteParamsInto(seg)
    if (!patch) return false
    get().updateSegment(id, patch)
    return true
  },
  pasteParamsToSelected: () => {
    const id = get().selectedSegmentId
    if (!id) return false
    return get().pasteParamsToSegment(id)
  },

  // ── E4.5: Duplicate-with-offset (seed bump) ──────────────────────────
  // Each copy gets source.seed + i (1-indexed). Copies are inserted as
  // a contiguous block right after the source; later segments shift
  // right by (count × source.duration). Render state is cleared on
  // every copy (different seed → different render).
  duplicateWithOffset: (sourceId, count) => {
    if (count <= 0) return []
    const src = get().segments.find((s) => s.id === sourceId)
    if (!src) return []
    const copies: TimelineSegment[] = []
    for (let i = 1; i <= count; i++) {
      copies.push({
        ...src,
        id: uid(),
        // order + start are finalized in the set() below (we need the
        // contiguous insertion math), but we pre-compute the params
        // here since they don't depend on sibling state.
        params: {
          ...src.params,
          seed: src.params.seed + i,
        },
        // Each copy is a fresh unrendered segment.
        videoUrl: null,
        lipSyncedVideoUrl: null,
        thumbnailUrl: null,
        assetId: undefined,
        status: 'empty',
        error: null,
        // A duplicate shouldn't inherit the source's variants — those
        // are alternate takes of the original render, not this new one.
        variants: [],
        // Locked + groupId are intentionally NOT inherited — duplicates
        // are free-floating clones until the user re-groups them.
        locked: false,
        groupId: null,
      })
    }
    set((s) => {
      const idx = s.segments.findIndex((seg) => seg.id === sourceId)
      // Proven dead (2026-09-12): the caller synchronously read the same
      // segment list via get() and returned [] unless idx >= 0; no await
      // or re-entrancy sits between, so the updater always finds it.
      /* v8 ignore next -- idx always >= 0: sync get-then-set, no interleave (2026-09-12) */
      if (idx < 0) return {}
      const before = s.segments.slice(0, idx + 1)   // includes the source
      const after = s.segments.slice(idx + 1)
      const totalInsertedDuration = copies.reduce((t, c) => t + c.duration, 0)
      // Shift later segments right.
      const shiftedAfter = after.map((seg) => ({
        ...seg,
        start: seg.start + totalInsertedDuration,
      }))
      // Assign order + start for the copies (contiguous block after src).
      let cursor = src.start + src.duration
      const orderedCopies = copies.map((c, i) => {
        const copy = { ...c, order: idx + 1 + i, start: cursor }
        cursor += c.duration
        return copy
      })
      // Re-index orders for everything after the inserted block.
      const finalSegments = [
        ...before.map((seg, i) => ({ ...seg, order: i })),
        ...orderedCopies,
        ...shiftedAfter.map((seg, i) => ({ ...seg, order: before.length + orderedCopies.length + i })),
      ]
      const totalDuration = finalSegments.reduce(
        (t, seg) => Math.max(t, seg.start + seg.duration), 0,
      )
      pushHistory(finalSegments, s.audioCues)
      return {
        segments: finalSegments,
        playback: { ...s.playback, totalDuration },
      }
    })
    schedulePersist(get())
    // Return the STORED copies (order + start finalized in the set()
    // above), not the pre-insertion images — callers positioning from
    // the return value must see the same starts the store holds.
    // (2026-09-12: the old code returned `copies` with every start still
    // at the source's, so returned starts disagreed with the store.)
    const ids = new Set(copies.map((c) => c.id))
    return get().segments.filter((s) => ids.has(s.id)).sort((x, y) => x.order - y.order)
  },

  // ── G8: Multi-select + in/out points ────────────────────────────────
  selectSegmentRange: (id) => set((s) => {
    const segs = s.segments
    const anchorId = s.selectedSegmentId
    if (!anchorId || anchorId === id) {
      // No anchor or same segment — just single-select.
      return { selectedSegmentId: id, selectedSegmentIds: new Set<string>([id]) }
    }
    const anchorIdx = segs.findIndex(seg => seg.id === anchorId)
    const targetIdx = segs.findIndex(seg => seg.id === id)
    if (anchorIdx < 0 || targetIdx < 0) {
      return { selectedSegmentId: id, selectedSegmentIds: new Set<string>([id]) }
    }
    const [lo, hi] = anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx]
    const rangeIds = segs.slice(lo, hi + 1).map(seg => seg.id)
    return {
      selectedSegmentId: anchorId,  // anchor stays primary
      selectedSegmentIds: new Set<string>(rangeIds),
    }
  }),
  toggleSegmentInSelection: (id) => set((s) => {
    const next = new Set(s.selectedSegmentIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    // If the set is empty, clear the primary too.
    if (next.size === 0) {
      return { selectedSegmentIds: next, selectedSegmentId: null }
    }
    // Promote to primary if there isn't one already in the set. When the
    // toggle just REMOVED the primary (ctrl-click off), `id` is no longer
    // a member — fall back to a remaining member so the primary honors
    // the interface invariant (always a member while the set is
    // non-empty). A toggled-ON id still becomes primary. (2026-09-12)
    let primary = s.selectedSegmentId && next.has(s.selectedSegmentId)
      ? s.selectedSegmentId
      : id
    if (!next.has(primary)) primary = [...next][0] as string
    return { selectedSegmentIds: next, selectedSegmentId: primary }
  }),
  clearMultiSelection: () => set((s) => ({
    selectedSegmentIds: new Set<string>(s.selectedSegmentId ? [s.selectedSegmentId] : []),
  })),
  selectAllSegments: () => set((s) => {
    const all = new Set(s.segments.map(seg => seg.id))
    return {
      selectedSegmentIds: all,
      selectedSegmentId: s.segments[0]?.id ?? null,
    }
  }),
  markInAtPlayhead: () => set((s) => {
    const t = s.playback.currentTime
    const existing = s.inOutPoints
    // If there's an existing out point before the playhead, clear it.
    if (existing && existing.end <= t) {
      return { inOutPoints: { start: t, end: t + 1 } }
    }
    return {
      inOutPoints: {
        start: t,
        end: existing ? Math.max(existing.end, t + 0.1) : t + 1,
      },
    }
  }),
  markOutAtPlayhead: () => set((s) => {
    const t = s.playback.currentTime
    const existing = s.inOutPoints
    if (!existing) {
      // No in point — default to 0 and mark out here.
      return { inOutPoints: { start: 0, end: t } }
    }
    // If the playhead is before the in point, push in back to 0.
    const start = t < existing.start ? 0 : existing.start
    return { inOutPoints: { start, end: Math.max(t, start + 0.1) } }
  }),
  markSelectionFromPlayhead: () => set((s) => {
    const t = s.playback.currentTime
    // Find segments overlapping the playhead.
    const hit = s.segments.filter(seg => t >= seg.start && t < seg.start + seg.duration)
    if (hit.length === 0) return {}
    const start = Math.min(...hit.map(seg => seg.start))
    const end = Math.max(...hit.map(seg => seg.start + seg.duration))
    return { inOutPoints: { start, end } }
  }),
  setInOutPoints: (start, end) => set({
    inOutPoints: { start: Math.min(start, end), end: Math.max(start, end) },
  }),
  clearInOutPoints: () => set({ inOutPoints: null }),

  // ── E2.7: Chapter markers ───────────────────────────────────────────
  addMarker: (time, label) => {
    const s = get()
    const t = typeof time === "number" ? Math.max(0, time) : s.playback.currentTime
    const autoLabel = `Marker ${s.markers.length + 1}`
    const marker: ChapterMarker = {
      id: uid(),
      time: t,
      label: label ?? autoLabel,
    }
    // Keep markers sorted by time for binary-search-like rendering.
    const markers = [...s.markers, marker].sort((a, b) => a.time - b.time)
    set({ markers })
    schedulePersist(get())
    return marker
  },

  removeMarker: (id) => {
    set((s) => ({ markers: s.markers.filter((m) => m.id !== id) }))
    schedulePersist(get())
  },

  updateMarker: (id, patch) => {
    set((s) => ({
      markers: s.markers
        .map((m) => (m.id === id ? { ...m, ...patch } : m))
        .sort((a, b) => a.time - b.time),
    }))
    schedulePersist(get())
  },

  clearMarkers: () => {
    set({ markers: [] })
    schedulePersist(get())
  },

  reset: () => {
    set({
      segments: [],
      audioCues: [],
      audioTracks: [],
      viewport: { ...DEFAULT_VIEWPORT },
      timeFormat: 'seconds',
      playback: { ...DEFAULT_PLAYBACK },
      drag: { ...DEFAULT_DRAG },
      selectedSegmentId: null,
      selectedSegmentIds: new Set<string>(),
      storyboardStatusFilter: null,
      inOutPoints: null,
      markers: [],
      selectedAudioCueId: null,
      relayVideoUrl: null,
      relaySegmentIds: [],
      relayAssetId: null,
      globalConsistencyAnchor: null,
      // Reset initialized so subsequent initialize() calls re-load state.
      // Without this, tests that reset() between cases would see initialize()
      // return early — and production code paths that reset+initialize would
      // skip reloading.
      initialized: false,
    })
    // Clear persisted data
    localStorage.removeItem('tech_noir_timeline')
    // NO SILENT SWALLOW — if IndexedDB cleanup fails we want to know about it,
    // not silently leave stale blobs behind. The catch is fire-and-forget only
    // because the user already confirmed the reset; the error still logs so
    // bugs in the IDB layer don't disappear.
    tlClearAll().catch((e: unknown) =>
      console.error("[Timeline] tlClearAll failed (IndexedDB):", e)
    )
  },

  undo: () => {
    if (_historyIdx <= 0) return
    _historyIdx--
    const snap = _history[_historyIdx]
    // Proven dead false-arm (2026-09-12): the bound above guarantees
    // _historyIdx >= 0 after decrement, and the push/shift/undo
    // transitions maintain 0 <= _historyIdx <= _history.length - 1
    // whenever the list is non-empty — the slot always holds a snapshot.
    /* v8 ignore next -- snap always defined inside the history bounds (2026-09-12) */
    if (snap) {
      set({ segments: snap.segments, audioCues: snap.audioCues })
      schedulePersist(get())
    }
  },

  redo: () => {
    if (_historyIdx >= _history.length - 1) return
    _historyIdx++
    const snap = _history[_historyIdx]
    // Proven dead false-arm (2026-09-12): same bounds argument as undo —
    // the guard guarantees _historyIdx <= _history.length - 1, so the
    // slot always holds a snapshot.
    /* v8 ignore next -- snap always defined inside the history bounds (2026-09-12) */
    if (snap) {
      set({ segments: snap.segments, audioCues: snap.audioCues })
      schedulePersist(get())
    }
  },
}))
