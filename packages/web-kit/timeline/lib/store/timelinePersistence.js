import { DEFAULT_SEGMENT_PARAMS, normalizeSegmentStatus } from "@melite/contracts";
import { getCachedCatalog } from "@melite/catalog";
import { BLOB_FIELDS, BLOB_PREFIX, blobKey, isBlobRef, isDataUrl, tlLoad, tlSave } from "./timelineBlobs.js";
// Save: strip large blobs from segments, store them in IndexedDB
export async function persistTimeline(segments, audioCues, audioTracks, relayVideoUrl, relaySegmentIds, relayAssetId, globalConsistencyAnchor) {
    try {
        // Collect blob saves
        const blobSaves = [];
        // Strip blobs from segments, replace with keys
        const strippedSegments = segments.map(seg => {
            const clone = { ...seg, params: { ...seg.params } };
            for (const field of BLOB_FIELDS) {
                const val = clone[field];
                if (isDataUrl(val)) {
                    const key = blobKey(seg.id, field);
                    blobSaves.push(tlSave(key, val));
                    clone[field] = key; // placeholder
                }
            }
            // Also handle controlVideoUrl
            if (isDataUrl(clone.controlVideoUrl)) {
                const key = blobKey(seg.id, 'controlVideoUrl');
                blobSaves.push(tlSave(key, clone.controlVideoUrl));
                clone.controlVideoUrl = key;
            }
            // E3.2: handle variant blobs (videoUrl + thumbnailUrl per variant).
            // Each variant's data: URL is stored under a per-variant key so the
            // strip/restore round-trip preserves them across reloads.
            if (Array.isArray(clone.variants) && clone.variants.length > 0) {
                clone.variants = clone.variants.map(v => {
                    const vclone = { ...v };
                    if (isDataUrl(vclone.videoUrl)) {
                        const key = `${BLOB_PREFIX}var_${vclone.id}_videoUrl`;
                        blobSaves.push(tlSave(key, vclone.videoUrl));
                        vclone.videoUrl = key;
                    }
                    if (isDataUrl(vclone.thumbnailUrl)) {
                        const key = `${BLOB_PREFIX}var_${vclone.id}_thumbnailUrl`;
                        blobSaves.push(tlSave(key, vclone.thumbnailUrl));
                        vclone.thumbnailUrl = key;
                    }
                    return vclone;
                });
            }
            return clone;
        });
        // Strip blobs from audio cues
        const strippedCues = audioCues.map(cue => {
            const clone = { ...cue };
            if (isDataUrl(clone.audioUrl)) {
                const key = `${BLOB_PREFIX}cue_${cue.id}_audioUrl`;
                blobSaves.push(tlSave(key, clone.audioUrl));
                clone.audioUrl = key;
            }
            if (isDataUrl(clone.audioB64)) {
                const key = `${BLOB_PREFIX}cue_${cue.id}_audioB64`;
                blobSaves.push(tlSave(key, clone.audioB64));
                clone.audioB64 = key;
            }
            return clone;
        });
        // Relay video blob
        let relayBlobKey = null;
        if (isDataUrl(relayVideoUrl)) {
            relayBlobKey = `${BLOB_PREFIX}relay_video`;
            blobSaves.push(tlSave(relayBlobKey, relayVideoUrl));
        }
        // E3.5: strip the global consistency anchor's b64 (a data URL) to a
        // blob ref so the anchor survives reloads without bloating localStorage.
        let anchorBlobKey = null;
        let anchorMeta = null;
        if (globalConsistencyAnchor && isDataUrl(globalConsistencyAnchor.b64)) {
            anchorBlobKey = `${BLOB_PREFIX}anchor_global`;
            blobSaves.push(tlSave(anchorBlobKey, globalConsistencyAnchor.b64));
            anchorMeta = { assetId: globalConsistencyAnchor.assetId, b64: anchorBlobKey };
        }
        else {
            anchorMeta = globalConsistencyAnchor;
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
        };
        localStorage.setItem('tech_noir_timeline', JSON.stringify(metadata));
        // Fire-and-forget blob saves
        Promise.all(blobSaves).catch(err => console.error('[Timeline] Failed to save blobs to IndexedDB:', err));
        console.log('[Timeline] Persisted', segments.length, 'segments,', audioCues.length, 'cues,', blobSaves.length, 'blobs');
    }
    catch (e) {
        console.error('[Timeline] Failed to persist:', e);
    }
}
// Load: read metadata from localStorage, restore blobs from IndexedDB
export async function loadPersistedTimeline() {
    try {
        const raw = localStorage.getItem('tech_noir_timeline');
        if (!raw)
            return null;
        const meta = JSON.parse(raw);
        if (!meta.segments)
            return null;
        // Restore segment blobs
        const segments = [];
        for (const seg of meta.segments) {
            const clone = { ...seg, params: { ...seg.params } };
            // Persisted JSON predates the type system — an out-of-union status
            // (e.g. "error") silently breaks the failed-state UI, so normalize
            // at the load boundary.
            clone.status = normalizeSegmentStatus(clone.status);
            for (const field of BLOB_FIELDS) {
                const val = clone[field];
                if (isBlobRef(val)) {
                    const data = await tlLoad(val);
                    clone[field] = data;
                }
            }
            // Restore controlVideoUrl
            if (isBlobRef(clone.controlVideoUrl)) {
                clone.controlVideoUrl = await tlLoad(clone.controlVideoUrl);
            }
            // E3.2: restore variant blobs (videoUrl + thumbnailUrl per variant).
            if (Array.isArray(clone.variants) && clone.variants.length > 0) {
                clone.variants = await Promise.all(clone.variants.map(async (v) => {
                    const vclone = { ...v };
                    if (isBlobRef(vclone.videoUrl)) {
                        vclone.videoUrl = (await tlLoad(vclone.videoUrl)) ?? vclone.videoUrl;
                    }
                    if (isBlobRef(vclone.thumbnailUrl)) {
                        vclone.thumbnailUrl = (await tlLoad(vclone.thumbnailUrl)) ?? vclone.thumbnailUrl;
                    }
                    return vclone;
                }));
            }
            // ── VACE migration ────────────────────────────────────────────────────
            // Drop stale LTX-only params and ensure every VACE field is present.
            // Without this, old persisted timelines crash the VACE-first UI.
            const staleLtxKeys = [
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
            ];
            for (const k of staleLtxKeys)
                delete clone.params[k];
            // Backfill VACE defaults for missing fields
            const D = DEFAULT_SEGMENT_PARAMS;
            if (typeof clone.params.profile !== 'string')
                clone.params.profile = D.profile;
            if (typeof clone.params.motionAmplitude !== 'number')
                clone.params.motionAmplitude = D.motionAmplitude;
            if (typeof clone.params.flfMode !== 'boolean')
                clone.params.flfMode = D.flfMode;
            if (typeof clone.params.resizeMethod !== 'string')
                clone.params.resizeMethod = D.resizeMethod;
            if (!Array.isArray(clone.params.loras))
                clone.params.loras = D.loras;
            if (typeof clone.params.samplingSteps !== 'number')
                clone.params.samplingSteps = D.samplingSteps;
            if (typeof clone.params.guideScale !== 'number')
                clone.params.guideScale = D.guideScale;
            // TeaCache fields (Phase 8)
            if (typeof clone.params.teacacheEnabled !== 'boolean')
                clone.params.teacacheEnabled = D.teacacheEnabled;
            if (typeof clone.params.teacacheThreshold !== 'number')
                clone.params.teacacheThreshold = D.teacacheThreshold;
            // Progressive-resolution fields (Phase 16 — diffusers-engine only).
            // Backfill for segments persisted before these shipped.
            if (typeof clone.params.progressiveEnabled !== 'boolean')
                clone.params.progressiveEnabled = D.progressiveEnabled;
            if (typeof clone.params.progressiveLevels !== 'number')
                clone.params.progressiveLevels = D.progressiveLevels;
            if (typeof clone.params.progressiveDelta !== 'number')
                clone.params.progressiveDelta = D.progressiveDelta;
            if (clone.params.progressiveMode !== 'dct' && clone.params.progressiveMode !== 'dct_rewind') {
                clone.params.progressiveMode = D.progressiveMode;
            }
            // Model membership — the catalog is the ONLY authority. Persisted
            // legacy ids (retired video routes, pre-catalog ids, …) are not catalog
            // routes: the director's model dropdown is catalog-driven
            // (familiesForForm), so anything outside the catalog resets to the
            // default. No hardcoded id lists, no legacy remap tables. (Before
            // the catalog loads every model resets — the dropdown re-seeds the
            // default anyway, so this only affects stale persisted ids.)
            const _cat = getCachedCatalog();
            if (!_cat?.models || typeof clone.params.model !== 'string' || !_cat.models[clone.params.model]) {
                clone.params.model = D.model;
            }
            // Lip-sync fields (Phase 11) — backfill for old persisted segments
            if (typeof clone.lipSyncedVideoUrl !== 'string' && clone.lipSyncedVideoUrl !== null) {
                clone.lipSyncedVideoUrl = null;
            }
            if (typeof clone.lipSyncPreferOriginal !== 'boolean')
                clone.lipSyncPreferOriginal = false;
            // Phase 14 — LTX director flow fields. Backfill for segments
            // persisted before promptBeats/keyframes existed.
            if (!Array.isArray(clone.promptBeats))
                clone.promptBeats = [];
            if (!Array.isArray(clone.keyframes))
                clone.keyframes = [];
            // G1/G2 — Prompt Relay epsilon backfill
            if (typeof clone.params.relayEpsilon !== 'number' || isNaN(clone.params.relayEpsilon)) {
                clone.params.relayEpsilon = 0.01;
            }
            // G3/G4 — Image conditioning backfill
            if (typeof clone.params.guideStrength !== 'number' || isNaN(clone.params.guideStrength)) {
                clone.params.guideStrength = 1.0;
            }
            if (typeof clone.params.guideCrf !== 'number' || isNaN(clone.params.guideCrf)) {
                clone.params.guideCrf = 0;
            }
            segments.push(clone);
        }
        // Restore audio cue blobs
        const audioCues = [];
        for (const cue of meta.audioCues || []) {
            const clone = { ...cue };
            if (isBlobRef(clone.audioUrl)) {
                clone.audioUrl = await tlLoad(clone.audioUrl);
            }
            if (isBlobRef(clone.audioB64)) {
                clone.audioB64 = await tlLoad(clone.audioB64);
            }
            audioCues.push(clone);
        }
        // Restore relay video
        let relayVideoUrl = meta.relayVideoUrl || null;
        if (isBlobRef(relayVideoUrl)) {
            relayVideoUrl = await tlLoad(relayVideoUrl);
        }
        console.log('[Timeline] Loaded', segments.length, 'segments,', audioCues.length, 'cues from localStorage + IndexedDB');
        return {
            segments,
            audioCues,
            audioTracks: meta.audioTracks || [],
            relayVideoUrl,
            relaySegmentIds: meta.relaySegmentIds || [],
            relayAssetId: meta.relayAssetId || null,
            // E3.5: restore the global consistency anchor b64 from its blob ref.
            globalConsistencyAnchor: await (async () => {
                const a = meta.globalConsistencyAnchor;
                if (!a)
                    return null;
                if (isBlobRef(a.b64)) {
                    const b64 = await tlLoad(a.b64);
                    return { assetId: a.assetId, b64: b64 ?? a.b64 };
                }
                return { assetId: a.assetId, b64: a.b64 };
            })(),
        };
    }
    catch (e) {
        console.error('[Timeline] Failed to load persisted state:', e);
        return null;
    }
}
export const PERSIST_DEBOUNCE_MS = 300;
export let _persistTimer = null;
export let _pendingPersist = null;
// Test hook: increments every time persistTimeline actually runs.
export let _persistRunCount = 0;
export function _bumpPersistRunCount() {
    // Module-let mutation requires re-assigning an exported binding; Vitest
    // can read the live value via `import { _persistRunCount }`.
    ;
    _persistRunCount++;
}
export function schedulePersist(state) {
    _pendingPersist = [
        state.segments, state.audioCues, state.audioTracks,
        state.relayVideoUrl, state.relaySegmentIds, state.relayAssetId,
        state.globalConsistencyAnchor,
    ];
    if (_persistTimer !== null)
        clearTimeout(_persistTimer);
    _persistTimer = setTimeout(() => {
        _persistTimer = null;
        // Proven dead false-arm (2026-09-12): schedulePersist always assigns a
        // non-null _pendingPersist in the same sync block that arms this timer,
        // and flushPersist clears the timer in the same sync block that nulls
        // _pendingPersist — single-threaded JS admits no interleaving that
        // could null it mid-flight.
        /* v8 ignore next -- _pendingPersist is always set when the timer is armed (2026-09-12) */
        if (_pendingPersist) {
            const args = _pendingPersist;
            _pendingPersist = null;
            void persistTimeline(...args).then(() => _bumpPersistRunCount());
        }
    }, PERSIST_DEBOUNCE_MS);
}
/** Flush any pending debounced persistence immediately. Returns the
 *  in-flight persistence promise (or a resolved promise if nothing pending). */
export function flushPersist() {
    if (_persistTimer !== null) {
        clearTimeout(_persistTimer);
        _persistTimer = null;
    }
    if (_pendingPersist) {
        const args = _pendingPersist;
        _pendingPersist = null;
        return persistTimeline(...args).then(() => _bumpPersistRunCount());
    }
    return Promise.resolve();
}
// Before the tab closes, synchronously kick off any pending persist so we
// don't lose the last 300ms of edits. (`persistTimeline` is async; the
// browser will keep the page alive briefly for the IDB write to start.)
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => { void flushPersist(); });
}
//# sourceMappingURL=timelinePersistence.js.map
