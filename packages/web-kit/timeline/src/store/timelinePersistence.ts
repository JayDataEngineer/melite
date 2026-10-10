/**
 * store/timelinePersistence — localStorage metadata + IndexedDB blob
 * strip/restore and the debounced persistence scheduler (split from
 * timelineStore.ts; pure move, no logic changes).
 */
import type { AudioCue, AudioTrackDef, ConsistencyAnchor, TimelineSegment } from "@melite/contracts"
import { DEFAULT_SEGMENT_PARAMS, normalizeSegmentStatus } from "@melite/contracts"
import { getCachedCatalog } from "@melite/catalog"
import { BLOB_FIELDS, BLOB_PREFIX, blobKey, isBlobRef, isDataUrl, tlLoad, tlSave } from "./timelineBlobs.ts"
import type { TimelineStore } from "./timelineStoreTypes.ts"

// Save: strip large blobs from segments, store them in IndexedDB
export async function persistTimeline(
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

    // R-S6 (2026-10-22): the blobs land BEFORE the metadata. The old
    // order wrote metadata first and left blob saves fire-and-forget —
    // a quota/IDB failure (or a tab close inside the beforeunload
    // flush, which the browser will not wait out) left metadata
    // holding TLB: refs to blobs that never landed, and the next open
    // restored holes. Awaiting blobs first means a failure keeps the
    // PREVIOUS consistent metadata instead of new metadata pointing
    // at missing blobs.
    try {
      await Promise.all(blobSaves)
    } catch (err) {
      console.error('[Timeline] Failed to save blobs to IndexedDB — metadata NOT advanced (previous consistent state kept):', err)
      return
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

    console.log('[Timeline] Persisted', segments.length, 'segments,', audioCues.length, 'cues,', blobSaves.length, 'blobs')
  } catch (e) {
    console.error('[Timeline] Failed to persist:', e)
  }
}

// Load: read metadata from localStorage, restore blobs from IndexedDB
export async function loadPersistedTimeline(): Promise<{
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

    // R-S9 (2026-10-22): a payload that parses but carries no segments
    // is CORRUPT-or-legacy, not absent. The old silent null booted an
    // empty timeline, and the first edit's persist then OVERWROTE the
    // only copy of the payload with empty — evidence destroyed, no log
    // pointing at the load. Quarantine keeps the raw under a
    // .corrupt-<ts> key so the operator can recover it.
    const quarantine = (why: string, payload: string): void => {
      console.warn(`[Timeline] Persisted payload not loadable (${why}) — quarantined under tech_noir_timeline.corrupt-<ts>; booting empty`)
      try {
        localStorage.setItem(`tech_noir_timeline.corrupt-${Date.now()}`, payload)
      } catch (e) {
        console.error('[Timeline] Quarantine write failed (payload lost):', e)
      }
    }

    const meta = JSON.parse(raw)
    if (!meta.segments || !Array.isArray(meta.segments)) {
      quarantine(meta.segments === undefined ? 'no segments array' : 'segments not an array', raw)
      return null
    }

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
          // R-S6 (2026-10-22): a missing variant blob now nulls the
          // field (the same clean non-preview state every other face
          // produces) — it used to KEEP the TLB:… placeholder, a fake
          // ref that leaked into render paths expecting data:/null.
          if (isBlobRef(vclone.videoUrl)) {
            vclone.videoUrl = await tlLoad(vclone.videoUrl)
          }
          if (isBlobRef(vclone.thumbnailUrl)) {
            vclone.thumbnailUrl = await tlLoad(vclone.thumbnailUrl)
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
      // legacy ids (retired video routes, pre-catalog ids, …) are not catalog
      // routes: the director's model dropdown is catalog-driven
      // (familiesForForm), so anything outside the catalog resets to the
      // default. No hardcoded id lists, no legacy remap tables. (Before
      // the catalog loads every model resets — the dropdown re-seeds the
      // default anyway, so this only affects stale persisted ids.)
      const _cat = getCachedCatalog()
      // R-E2 (2026-10-22): the COLD case and the INVALID case are
      // different laws. A catalog that has not loaded yet (cold
      // open, network down) is NO AUTHORITY — the persisted model
      // rides untouched, or a cold restore silently wiped every
      // segment's model to the default. Only a LOADED catalog
      // judges: an id outside its (possibly empty) model table
      // resets. No hardcoded id lists, no legacy remap tables.
      if (_cat && (typeof clone.params.model !== 'string' || !_cat.models || !_cat.models[clone.params.model])) {
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
          // R-S6: the anchor nulls its b64 on a missing blob too (same
          // uniform law — the TLB:… placeholder never reaches render).
          const b64 = await tlLoad(a.b64)
          return { assetId: a.assetId, b64 }
        }
        return { assetId: a.assetId, b64: a.b64 }
      })(),
    }
  } catch (e) {
    console.error('[Timeline] Failed to load persisted state:', e)
    // R-S9: quarantine the unparseable raw too — the payload may hold
    // the operator's only copy (half-written setItem, disk corruption).
    try {
      const raw2 = localStorage.getItem('tech_noir_timeline')
      if (raw2) localStorage.setItem(`tech_noir_timeline.corrupt-${Date.now()}`, raw2)
    } catch {
      // storage itself is failing — nothing more to preserve
    }
    return null
  }
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
export type PersistArgs = Parameters<typeof persistTimeline>

export const PERSIST_DEBOUNCE_MS = 300
export let _persistTimer: ReturnType<typeof setTimeout> | null = null
export let _pendingPersist: PersistArgs | null = null
// Test hook: increments every time persistTimeline actually runs.
export let _persistRunCount = 0
export function _bumpPersistRunCount() {
  // Module-let mutation requires re-assigning an exported binding; Vitest
  // can read the live value via `import { _persistRunCount }`.
  ;(_persistRunCount as number)++
}

export function schedulePersist(state: Pick<TimelineStore, 'segments' | 'audioCues' | 'audioTracks' | 'relayVideoUrl' | 'relaySegmentIds' | 'relayAssetId' | 'globalConsistencyAnchor'>) {
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
