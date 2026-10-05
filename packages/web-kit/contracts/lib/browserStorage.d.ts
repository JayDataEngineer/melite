/**
 * browserStorage — the ONE place the editor's localStorage becomes IndexedDB.
 *
 * localStorage's ~5MB quota HARD-fails the whole origin once full
 * (QuotaExceededError on setItem), which has repeatedly crashed persistence
 * (flow mirror, LLM key store, CopilotThreadResume). IndexedDB has a
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
/** Test hook — resets the cached connection + cache + install flag. */
export declare function _resetBrowserStorageForTests(): void;
/**
 * Seed the in-memory cache from IndexedDB, migrate any leftover native
 * localStorage into IDB, then install the facade as the global localStorage.
 * Called once from main.tsx BEFORE the app is (dynamically) imported, so
 * every module-eval-time read sees the persisted data. Never throws.
 */
export declare function initBrowserStorage(): Promise<void>;
//# sourceMappingURL=browserStorage.d.ts.map
