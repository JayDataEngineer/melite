/**
 * store/timelineBlobs — IndexedDB blob storage + blob-ref helpers (split
 * from timelineStore.ts; pure move, no logic changes).
 */
// ═══════════════════════════════════════════════════════════════════════════
// IndexedDB for large timeline data (video URLs, frame b64, relay video)
// ═══════════════════════════════════════════════════════════════════════════
export const TL_DB_NAME = 'TechNoirTimelineDB'
export const TL_DB_VERSION = 1
export const TL_STORE = 'blobs'

export let tlDbPromise: Promise<IDBDatabase> | null = null

export function getTLDB(): Promise<IDBDatabase> {
  if (tlDbPromise) return tlDbPromise
  tlDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(TL_DB_NAME, TL_DB_VERSION)
    req.onerror = () => {
      // R-S6 (2026-10-22): a transient open failure (private mode,
      // version race) must not latch — the old code cached the
      // REJECTED promise forever, failing every future blob op for
      // the session with no re-open attempt.
      tlDbPromise = null
      reject(req.error)
    }
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

export async function tlSave(key: string, value: string): Promise<void> {
  const db = await getTLDB()
  const tx = db.transaction(TL_STORE, 'readwrite')
  tx.objectStore(TL_STORE).put(value, key)
  await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error) })
}

export async function tlLoad(key: string): Promise<string | null> {
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

export async function tlClearAll(): Promise<void> {
  const db = await getTLDB()
  const tx = db.transaction(TL_STORE, 'readwrite')
  tx.objectStore(TL_STORE).clear()
  await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error) })
}

// ═══════════════════════════════════════════════════════════════════════════
// Timeline persistence helpers
// ═══════════════════════════════════════════════════════════════════════════

// Fields that may contain large base64 data URLs — stored in IndexedDB
export const BLOB_FIELDS = ['videoUrl', 'firstFrameB64', 'lastFrameB64', 'thumbnailUrl'] as const

export function isDataUrl(val: unknown): val is string {
  return typeof val === 'string' && val.startsWith('data:')
}

// Blob keys use "TLB:" prefix to avoid collision with segment IDs ("seg_")
export const BLOB_PREFIX = 'TLB:'

export function blobKey(segId: string, field: string): string {
  return `${BLOB_PREFIX}${segId}_${field}`
}

export function isBlobRef(val: unknown): val is string {
  return typeof val === 'string' && val.startsWith(BLOB_PREFIX)
}
