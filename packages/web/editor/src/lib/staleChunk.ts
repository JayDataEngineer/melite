/**
 * staleChunk — stale-chunk self-healing (the card-view crash, 2026-09-06).
 *
 * The editor's dist is REBUILT under OPEN tabs during estate work (the
 * deck host serves editor/dist with cache-control: no-cache, so every
 * fresh page load is current — but a tab that booted BEFORE a rebuild
 * holds the OLD main bundle in memory). Lazy chunks are content-hashed
 * (one dynamic chunk per plugin card studio), so the first card open
 * after a rebuild fetches a DEAD hash → 404 → "Failed to fetch
 * dynamically imported module" → the root ErrorBoundary crashed the
 * whole surface ("Something crashed").
 *
 * The heal: a chunk-load failure means THIS page's module graph is
 * stale, and a full reload picks up the fresh index — so reload
 * EXACTLY ONCE, loop-guarded by a sessionStorage stamp. A torn dist
 * (rebuild landing mid-reload) must not reload-storm: the guard
 * refuses, the boundary stays up, the manual Reload button works.
 *
 * THREE nets, one guard:
 *   1. installStaleChunkReload() — vite's `vite:preloadError` window
 *      event: fires when __vitePreload fails a module or dep fetch,
 *      including awaited dynamic imports inside event handlers where
 *      NO React boundary can ever catch (flowParamEditor's catalog
 *      imports are exactly that shape).
 *   2. ErrorBoundary.componentDidCatch — lazy ROUTES (card studios,
 *      any React.lazy surface): the rejection surfaces as a render
 *      error and the boundary self-heals instead of parking on the
 *      crash screen.
 *   3. bootstrap()'s catch in main.tsx — boot-time imports.
 *
 * Wall: src/__tests__/stale-chunk.test.tsx (message table, guard
 * behavior, all three nets).
 */

/** Guard window: a second stale reload inside this span is refused. */
const RELOAD_WINDOW_MS = 30_000

/** sessionStorage stamp key — exported for the tests + diagnostics. */
export const STALE_CHUNK_RELOAD_KEY = 'melite.stale-chunk.reloaded-at'

// The cross-browser message table (each engine words the same fetch
// failure differently; vite's preload helper has two of its own).
const CHUNK_ERROR_PATTERNS: readonly RegExp[] = [
  /Failed to fetch dynamically imported module/i, // Chrome/Edge
  /Importing a module script failed/i, // Firefox
  /error loading dynamically imported module/i, // Safari
  /Unable to preload CSS/i, // vite __vitePreload — css dep
  /Unable to preload dependency/i, // vite __vitePreload — js dep
]

/** True when the error is a failed dynamic-chunk fetch (the stale-dist
 * signature) rather than a real code error. */
export function isChunkLoadError(err: unknown): boolean {
  const msg =
    err instanceof Error ? err.message
    : typeof err === 'string' ? err
    : String(err ?? '')
  return CHUNK_ERROR_PATTERNS.some((re) => re.test(msg))
}

function recentlyReloaded(): boolean {
  try {
    const stamp = window.sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY)
    const t = stamp === null ? NaN : Number(stamp)
    return Number.isFinite(t) && Date.now() - t < RELOAD_WINDOW_MS
  } catch {
    return false // storage unavailable: never loop-guard (a stale tab heals)
  }
}

function attemptStaleReload(): boolean {
  if (typeof window === 'undefined') return false
  if (recentlyReloaded()) return false
  try {
    window.sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, String(Date.now()))
  } catch {
    // best effort — the reload below is the cure, the stamp only guards
  }
  window.location.reload()
  return true
}

/** Reload once on a stale-chunk failure. True = a reload was issued;
 * false = not a chunk error, or the loop guard refused. Callers keep
 * their normal failure path when this returns false. */
export function reloadOnStaleChunk(err: unknown): boolean {
  return isChunkLoadError(err) && attemptStaleReload()
}

let installed = false

/** Net #1: install the vite preload-failure listener. Idempotent;
 * call early in boot (main.tsx bootstrap). */
export function installStaleChunkReload(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  window.addEventListener('vite:preloadError', () => {
    // The event fires ONLY on a failed preload/module fetch — no need
    // to inspect the payload before attempting the guarded reload.
    attemptStaleReload()
  })
}
