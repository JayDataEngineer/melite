/**
 * createPosterStore — the poster-cache factory (2026-09-05 dedup order).
 *
 * The mesh lane (@melite-plugin/3d meshPosterStore) and the motion lane
 * (@melite-plugin/motion motionPosterStore) shipped byte-adjacent copies
 * of the same zustand store: URL-keyed image data-URLs, best-effort
 * localStorage persistence, identical set/clear semantics — differing
 * only in the storage key. Per the audit order ("share most render
 * code"), the mechanic lives HERE once and each lane keeps its public
 * hook name as a one-line factory call.
 *
 * UI-only cache — zero impact on the run protocol, cacheKeys, or
 * backend state. Persisted to localStorage so posters survive reloads.
 * Keyed by the artifact URL (the MediaAsset id). Best-effort: a quota
 * error just means the poster won't survive a reload (the in-memory
 * copy still works for the session).
 */
import { create } from "zustand"
import type { StoreApi, UseBoundStore } from "zustand"

export interface PosterState {
  posters: Record<string, string>
  setPoster: (url: string, dataUrl: string) => void
  clearPoster: (url: string) => void
}

export type PosterStore = UseBoundStore<StoreApi<PosterState>>

function load(storageKey: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>
    }
  } catch {
    // Corrupt JSON — start fresh.
  }
  return {}
}

/** One poster cache: a zustand hook with `posters` / `setPoster` /
 *  `clearPoster`, persisted best-effort under `storageKey`. The key is
 *  the lane's public contract — changing it orphans every user's
 *  cached posters (they silently re-render once, nothing breaks). */
export function createPosterStore(storageKey: string): PosterStore {
  return create<PosterState>((set) => ({
    posters: load(storageKey),
    setPoster: (url, dataUrl) =>
      set((state) => {
        const posters = { ...state.posters, [url]: dataUrl }
        try {
          localStorage.setItem(storageKey, JSON.stringify(posters))
        } catch {
          // Quota error — non-fatal; in-memory cache still serves this session.
        }
        return { posters }
      }),
    clearPoster: (url) =>
      set((state) => {
        if (!(url in state.posters)) return state
        const posters = { ...state.posters }
        delete posters[url]
        try {
          localStorage.setItem(storageKey, JSON.stringify(posters))
        } catch {
          // same — non-fatal
        }
        return { posters }
      }),
  }))
}
