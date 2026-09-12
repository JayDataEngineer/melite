/**
 * Client-side poster cache for mesh assets in the Media sidebar.
 *
 * Mesh assets are GLB files — the tile can NOT show the run's `thumbnail`:
 * for a Trellis (image→mesh) run that thumbnail is the INPUT image, not the
 * output mesh. MeshPoster renders the actual GLB once at a 3/4 angle,
 * snapshots it to a JPEG, and stores it here so every subsequent open of
 * the Media sidebar reuses the snapshot instead of re-rendering.
 *
 * The mechanic is a lane-local native cache (DSH ships no state library):
 * URL-keyed image data-URLs, best-effort localStorage persistence,
 * setPoster/clearPoster semantics identical to the motion lane's — the
 * lanes differ only in the storage key below. This module keeps the
 * lane's public hook name + storage key (the key is the user-facing
 * persistence contract: cached posters survive the dedup unchanged).
 */
import { useSyncExternalStore } from "react"
import type { PosterStoreLike as PosterStore } from "../../../poster-shell"

export interface MeshPosterState {
  posters: Record<string, string>
  setPoster: (url: string, dataUrl: string) => void
  clearPoster: (url: string) => void
}

const STORAGE_KEY = "mesh-asset-posters"

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
  | Partial<MeshPosterState>
  | ((s: MeshPosterState) => Partial<MeshPosterState>)

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
      ? (patch as (s: MeshPosterState) => Partial<MeshPosterState>)(_state)
      : patch
  if (replace === true) {
    _state = p as MeshPosterState
  } else {
    _state = { ..._state, ...p }
  }
  _listeners.forEach((l) => l())
}

function _getState(): MeshPosterState {
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

let _state: MeshPosterState = {
  posters: load(),
  setPoster: _setPoster,
  clearPoster: _clearPoster,
}

const _initialState: MeshPosterState = _state

function _useMeshPosterStoreHook(): MeshPosterState
function _useMeshPosterStoreHook<T>(selector: (s: MeshPosterState) => T): T
function _useMeshPosterStoreHook<T>(
  selector?: (s: MeshPosterState) => T,
): T | MeshPosterState {
  const getSnapshot = selector
    ? () => selector(_getState())
    : () => _getState() as unknown as T
  return useSyncExternalStore(_subscribe, getSnapshot)
}

// Cast: the shared poster shell (@melite/ui posterShell) types its store
// param as PosterStore (the retired zustand factory's type). The runtime
// surface it uses is getState() only; this cast keeps the call site
// (MeshPoster) compiling untouched while the runtime is fully native.
export const useMeshPosterStore = Object.assign(_useMeshPosterStoreHook, {
  getState: _getState,
  setState: _setState,
  subscribe: _subscribe,
  getInitialState: (): MeshPosterState => _initialState,
  destroy: (): void => {},
}) as unknown as PosterStore
