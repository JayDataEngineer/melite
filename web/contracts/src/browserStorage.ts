/**
 * browserStorage — the ONE place the editor's localStorage becomes IndexedDB.
 *
 * localStorage's ~5MB quota HARD-fails the whole origin once full
 * (QuotaExceededError on setItem), which has repeatedly crashed persistence
 * (pipeline mirror, LLM key store, CopilotThreadResume). IndexedDB has a
 * ~hundreds-of-MB quota and never fails the app on write.
 *
 * How this works:
 *   • Every module that reads localStorage SYNCHRONOUSLY at module-eval time
 *     (storePersistence rehydrate, tagMap, rightPanelStore, bodyStudio,
 *     motionThumbStore/PosterStore, CopilotTab lazy inits) must see the seeded
 *     cache, so main.tsx runs `initBrowserStorage()` and THEN dynamically
 *     imports the app. No app module evaluates before the seed is in memory.
 *   • `initBrowserStorage()` opens a single-key/value IndexedDB store, dumps
 *     it into an in-memory Map, migrates any leftover native localStorage keys
 *     into IDB (fresher IDB data wins, stale native keys never regress it),
 *     clears native localStorage once the migration fully succeeds (frees the
 *     5MB quota), then swaps `globalThis.localStorage` to the facade below.
 *   • The facade implements the real `Storage` interface (getItem/setItem/
 *     removeItem/clear/key/length). Reads are served synchronously from the
 *     in-memory cache; writes write-through to IndexedDB fire-and-forget —
 *     NEVER throws synchronously (the app's existing try/catch sites simply
 *     never fire), and failures are logged NO-SILENT-SWALLOW.
 *   • IndexedDB unavailable (private mode / sandboxed iframe): the facade
 *     degrades to in-memory-only for the session, exactly like the previous
 *     per-store degradation contracts.
 */

const DB_NAME = 'melite:browser-storage:v1'
const DB_VERSION = 1
const STORE = 'kv'

let dbPromise: Promise<IDBDatabase> | null = null
let cache = new Map<string, string>()
let installed = false

/** Test hook — resets the cached connection + cache + install flag. */
export function _resetBrowserStorageForTests(): void {
  installed = false
  cache = new Map()
  dbPromise = null
}

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB unavailable'))
        return
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

/** Full dump of the store as [key, value] pairs. */
async function idbDump(): Promise<Array<[string, string]>> {
  const db = await openDb()
  const tx = db.transaction(STORE, 'readonly')
  const req = tx.objectStore(STORE).openCursor()
  return new Promise((resolve, reject) => {
    const out: Array<[string, string]> = []
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) {
        resolve(out)
        return
      }
      out.push([String(cursor.key), String(cursor.value)])
      cursor.continue()
    }
    req.onerror = () => reject(req.error)
  })
}

async function idbPut(key: string, value: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).put(value, key)
  await new Promise<void>((res, rej) => {
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
    tx.onabort = () => rej(tx.error)
  })
}

async function idbRemove(key: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).delete(key)
  await new Promise<void>((res, rej) => {
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
    tx.onabort = () => rej(tx.error)
  })
}

async function idbClear(): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).clear()
  await new Promise<void>((res, rej) => {
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
    tx.onabort = () => rej(tx.error)
  })
}

// ── The facade — a real Storage over the in-memory cache ────────────────────
function writeFailure(key: string, e: unknown): void {
  console.error(`[storage] failed to persist '${key}' to IndexedDB:`, e)
}

const facade = {
  get length(): number {
    return cache.size
  },
  key(index: number): string | null {
    if (index < 0 || index >= cache.size) return null
    let i = 0
    for (const k of cache.keys()) {
      if (i === index) return k
      i++
    }
    return null
  },
  getItem(key: string): string | null {
    return cache.has(key) ? (cache.get(key) as string) : null
  },
  setItem(key: string, value: string): void {
    cache.set(key, String(value))
    idbPut(key, String(value)).catch((e: unknown) => writeFailure(key, e))
  },
  removeItem(key: string): void {
    cache.delete(key)
    idbRemove(key).catch((e: unknown) => writeFailure(key, e))
  },
  clear(): void {
    cache.clear()
    idbClear().catch((e: unknown) => writeFailure('*', e))
  },
} as Storage

/**
 * Seed the in-memory cache from IndexedDB, migrate any leftover native
 * localStorage into IDB, then install the facade as the global localStorage.
 * Called once from main.tsx BEFORE the app is (dynamically) imported, so
 * every module-eval-time read sees the persisted data. Never throws.
 */
export async function initBrowserStorage(): Promise<void> {
  if (installed) return

  // 1. Seed the cache from IndexedDB.
  try {
    const entries = await idbDump()
    for (const [k, v] of entries) cache.set(k, v)
  } catch (e) {
    // NO SILENT SWALLOW — IDB unavailable/corrupt shouldn't look like "no
    // saved data exists".
    console.error('[storage] failed to load IndexedDB cache:', e)
  }

  // 2. One-shot migration of native localStorage → IDB. Fresher IDB data wins;
  //    stale native keys never regress it. Clears native once fully migrated
  //    (frees the ~5MB quota that was the original failure mode).
  try {
    const native = globalThis.localStorage
    if (native && typeof native.length === 'number') {
      const jobs: Array<Promise<void>> = []
      let anyMigrated = false
      let failed = false
      for (let i = 0; i < native.length; i++) {
        const k = native.key(i)
        if (!k) continue
        const v = native.getItem(k)
        if (v == null || cache.has(k)) continue
        anyMigrated = true
        cache.set(k, v)
        jobs.push(idbPut(k, v).catch(() => { failed = true }))
      }
      if (jobs.length > 0) await Promise.all(jobs)
      if (anyMigrated && !failed) {
        try { native.clear() } catch { /* storage disabled — nothing to clear */ }
      }
    }
  } catch (e) {
    // NO SILENT SWALLOW — a failed migration shouldn't look like "nothing to do".
    console.error('[storage] failed to migrate native localStorage:', e)
  }

  // 3. Install the facade.
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      value: facade,
      configurable: true,
      writable: true,
    })
    installed = true
  } catch (e) {
    // NO SILENT SWALLOW — a non-configurable global (rare) shouldn't silently
    // leave the app on localStorage while the user believes it's moved.
    console.error('[storage] failed to install IndexedDB-backed localStorage:', e)
    installed = true
  }
}
