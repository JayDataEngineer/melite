/**
 * Client-side poster cache for motion assets in the Media sidebar.
 *
 * Motion assets are NPZ files — not directly viewable as an image.
 * MotionPoster renders the midpoint frame ONCE, snapshots it, and
 * stores it here so every subsequent open of the Media sidebar
 * reuses the snapshot instead of re-rendering. This mirrors
 * surfaces/flow/motionThumbStore.ts (the same mechanic the flow
 * card uses to persist its motion-tile screenshots).
 *
 * The mechanic is a lane-local native cache (DSH ships no state library):
 * URL-keyed image data-URLs, best-effort localStorage persistence,
 * setPoster/clearPoster semantics identical to the mesh lane's — the
 * lanes differ only in the storage key below. This module keeps the
 * lane's public hook name + storage key (the key is the user-facing
 * persistence contract: cached posters survive the dedup unchanged).
 */
import { useSyncExternalStore } from "react"
import type { PosterStoreLike as PosterStore } from "../../../poster-shell"

export interface MotionPosterState {
  posters: Record<string, string>
  setPoster: (url: string, dataUrl: string) => void
  clearPoster: (url: string) => void
}

const STORAGE_KEY = "motion-asset-posters"

function load(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
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

type _Patch =
  | Partial<MotionPosterState>
  | ((s: MotionPosterState) => Partial<MotionPosterState>)

const _listeners = new Set<() => void>()

function _subscribe(listener: () => void): () => void {
  _listeners.add(listener)
  return () => {
    _listeners.delete(listener)
  }
}

function _setState(patch: _Patch, replace?: boolean): void {
  const p =
    typeof patch === "function"
      ? (patch as (s: MotionPosterState) => Partial<MotionPosterState>)(_state)
      : patch
  if (replace === true) {
    _state = p as MotionPosterState
  } else {
    _state = { ..._state, ...p }
  }
  _listeners.forEach((l) => l())
}

function _getState(): MotionPosterState {
  return _state
}

function _setPoster(url: string, dataUrl: string): void {
  _setState((state) => {
    const posters = { ...state.posters, [url]: dataUrl }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(posters))
    } catch {
      // Quota error — non-fatal; in-memory cache still serves this session.
    }
    return { posters }
  })
}

function _clearPoster(url: string): void {
  if (!(url in _getState().posters)) return
  _setState((state) => {
    const posters = { ...state.posters }
    delete posters[url]
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(posters))
    } catch {
      // same — non-fatal
    }
    return { posters }
  })
}

let _state: MotionPosterState = {
  posters: load(),
  setPoster: _setPoster,
  clearPoster: _clearPoster,
}

const _initialState: MotionPosterState = _state

function _useMotionPosterStoreHook(): MotionPosterState
function _useMotionPosterStoreHook<T>(selector: (s: MotionPosterState) => T): T
function _useMotionPosterStoreHook<T>(
  selector?: (s: MotionPosterState) => T,
): T | MotionPosterState {
  const getSnapshot = selector
    ? () => selector(_getState())
    : () => _getState() as unknown as T
  return useSyncExternalStore(_subscribe, getSnapshot)
}

// Cast: the shared poster shell (@melite/ui posterShell) types its store
// param as PosterStore (the retired zustand factory's type). The runtime
// surface it uses is getState() only; this cast keeps the call site
// (MotionPoster) compiling untouched while the runtime is fully native.
export const useMotionPosterStore = Object.assign(_useMotionPosterStoreHook, {
  getState: _getState,
  setState: _setState,
  subscribe: _subscribe,
  getInitialState: (): MotionPosterState => _initialState,
  destroy: (): void => {},
}) as unknown as PosterStore
