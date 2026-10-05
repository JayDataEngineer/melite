/**
 * store/timelineBlobs — IndexedDB blob storage + blob-ref helpers (split
 * from timelineStore.ts; pure move, no logic changes).
 */
// ═══════════════════════════════════════════════════════════════════════════
// IndexedDB for large timeline data (video URLs, frame b64, relay video)
// ═══════════════════════════════════════════════════════════════════════════
export const TL_DB_NAME = 'TechNoirTimelineDB';
export const TL_DB_VERSION = 1;
export const TL_STORE = 'blobs';
export let tlDbPromise = null;
export function getTLDB() {
    if (tlDbPromise)
        return tlDbPromise;
    tlDbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(TL_DB_NAME, TL_DB_VERSION);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
        req.onupgradeneeded = (ev) => {
            const db = ev.target.result;
            if (!db.objectStoreNames.contains(TL_STORE)) {
                db.createObjectStore(TL_STORE);
            }
        };
    });
    return tlDbPromise;
}
export async function tlSave(key, value) {
    const db = await getTLDB();
    const tx = db.transaction(TL_STORE, 'readwrite');
    tx.objectStore(TL_STORE).put(value, key);
    await new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}
export async function tlLoad(key) {
    try {
        const db = await getTLDB();
        const tx = db.transaction(TL_STORE, 'readonly');
        const req = tx.objectStore(TL_STORE).get(key);
        return new Promise((res, rej) => { req.onsuccess = () => res(req.result || null); req.onerror = () => rej(req.error); });
    }
    catch (e) {
        // NO SILENT SWALLOW — IndexedDB failures (quota, corruption, version
        // upgrade) shouldn't make the timeline "silently reset". Log so we know.
        console.error('[timeline] tlLoad failed (IndexedDB):', e);
        return null;
    }
}
export async function _tlDelete(key) {
    const db = await getTLDB();
    const tx = db.transaction(TL_STORE, 'readwrite');
    tx.objectStore(TL_STORE).delete(key);
    await new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}
export async function tlClearAll() {
    const db = await getTLDB();
    const tx = db.transaction(TL_STORE, 'readwrite');
    tx.objectStore(TL_STORE).clear();
    await new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}
// ═══════════════════════════════════════════════════════════════════════════
// Timeline persistence helpers
// ═══════════════════════════════════════════════════════════════════════════
// Fields that may contain large base64 data URLs — stored in IndexedDB
export const BLOB_FIELDS = ['videoUrl', 'firstFrameB64', 'lastFrameB64', 'thumbnailUrl'];
export function isDataUrl(val) {
    return typeof val === 'string' && val.startsWith('data:');
}
// Blob keys use "TLB:" prefix to avoid collision with segment IDs ("seg_")
export const BLOB_PREFIX = 'TLB:';
export function blobKey(segId, field) {
    return `${BLOB_PREFIX}${segId}_${field}`;
}
export function isBlobRef(val) {
    return typeof val === 'string' && val.startsWith(BLOB_PREFIX);
}
//# sourceMappingURL=timelineBlobs.js.map
