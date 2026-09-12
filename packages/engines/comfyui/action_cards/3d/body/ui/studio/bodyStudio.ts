/**
 * bodyStudio — the BODY CARD's state (2026-08-21: moved out of the dead
 * @melite/viewers "shared viewer state" package — there is no Body Studio
 * Thing; the body card is a CARD, and this is its store, owned by the
 * card's plugin like every other card owns its params).
 *
 * Two slices of character state:
 *
 *   - editing:  the character the body card is sculpting. Live-updates
 *               the preview canvas on every slider drag.
 *   - library:  named, saved characters persisted to localStorage so the
 *               user can build a cast and reload it across sessions.
 *               The agent's body_* tools + Pose's "Load Body" read it.
 *
 * The previous "applied" slice was removed - the workflow is now
 * save-then-load rather than apply-to-scene.
 *
 * Persistence follows the same manual localStorage pattern as enhancement.ts
 * and timeline.ts (no zustand/middleware).
 */
import type { Character, } from "@melite/contracts"
import { useSyncExternalStore } from "react"

export interface SavedCharacter extends Character {
  id: string
  name: string
  createdAt: number
  /** Optional thumbnail (data URL) - captured from the preview canvas. */
  thumbnail?: string
}

/**
 * Reconstruct a Character from a flat param bag (the shape a body flow
 * card carries in stage.params). The inverse of the write-back in
 * BodyCardEditor (the studio tenant): card params ↔ Character round-trip.
 *
 * Tolerant by design — a freshly-added body card may carry only
 * identityModel (null coeffs/morphs = "use model defaults"), and the
 * BodyShapePanel seeds the neutral coeffs from the identity space on open.
 */
export function characterFromParams(p: Record<string, unknown>): Character {
  return {
    identityModel:
      (p.identityModel as Character["identityModel"]) ?? "anny",
    coeffs: Array.isArray(p.coeffs) ? (p.coeffs as number[]).slice() : null,
    localChanges:
      p.localChanges && typeof p.localChanges === "object"
        ? { ...(p.localChanges as Record<string, number>) }
        : null,
    customTargets:
      p.customTargets && typeof p.customTargets === "object"
        ? { ...(p.customTargets as Record<string, number>) }
        : null,
  }
}

interface BodyStudioState {
  /** Character being edited in Body Studio right now. */
  editing: Character
  /** Named saved characters (library). */
  library: SavedCharacter[]

  // Editing mutations
  setEditing: (c: Character) => void
  patchEditing: (patch: Partial<Character>) => void
  resetEditing: () => void

  // Library mutations
  saveToLibrary: (name: string, thumbnail?: string) => SavedCharacter
  loadFromLibrary: (id: string) => void
  deleteFromLibrary: (id: string) => void
  renameInLibrary: (id: string, name: string) => void
}

// v2: added customTargets field (community MakeHuman .target blends) to
// SavedCharacter. Old v1 library entries are migrated on load - missing
// customTargets defaults to null.
const STORAGE_KEY = "tech_noir_body_studio_v2"

const DEFAULT_CHARACTER: Character = {
  // Anny is the only model exposed in Body Studio for now - the others
  // (SOMA, MHR) aren't as good for editing. Pose Studio still supports
  // all three for rendering/skinning.
  identityModel: "anny",
  coeffs: null,
  localChanges: null,
  customTargets: null,
}

// ── Persistence ─────────────────────────────────────────────────────────────

interface PersistedState {
  library: SavedCharacter[]
}

function loadPersisted(): PersistedState {
  // Fall back to the v1 storage key if v2 hasn't been written yet, so
  // users with an existing library don't lose their saved characters
  // when the customTargets field is added to the schema.
  const V1_KEY = "tech_noir_body_studio_v1"
  try {
    let raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) raw = localStorage.getItem(V1_KEY)
    if (!raw) return { library: [] }
    const parsed = JSON.parse(raw) as PersistedState
    if (!parsed || !Array.isArray(parsed.library)) return { library: [] }
    // Migrate: pre-v2 SavedCharacters don't have customTargets. Default
    // to null so they load cleanly into the new schema.
    for (const c of parsed.library) {
      if (c.customTargets === undefined) c.customTargets = null
    }
    return parsed
  } catch (e) {
    // NO SILENT SWALLOW — corrupted localStorage shouldn't make saved
    // characters "just vanish". Log so it's debuggable.
    console.error("[bodyStudio] failed to parse persisted library:", e)
    return { library: [] }
  }
}

function persistLibrary(library: SavedCharacter[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ library }))
  } catch (e) {
    // Non-critical (localStorage may be full — thumbnails are large) but NO
    // SILENT SWALLOW: log so we know saves are silently dropping.
    console.error("[bodyStudio] failed to persist library:", e)
  }
}

let _nextId = 1
function uid(): string {
  return `bc_${_nextId++}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

// ── Native store (DSH ships no state library — no zustand) ─────────────────
// Module-level state + listener set + useSyncExternalStore hook. Shallow-
// merge setState preserves the old call sites: useBodyStudio(selector) and
// useBodyStudio.getState(). Actions are stable module functions, so selector
// snapshots stay referentially stable between mutations.
const _listeners = new Set<() => void>()

function _subscribe(listener: () => void): () => void {
  _listeners.add(listener)
  return () => {
    _listeners.delete(listener)
  }
}

function _notify(): void {
  _listeners.forEach((l) => l())
}

type _Patch =
  | Partial<BodyStudioState>
  | ((s: BodyStudioState) => Partial<BodyStudioState>)

function _setState(patch: _Patch, replace?: boolean): void {
  const p =
    typeof patch === "function"
      ? (patch as (s: BodyStudioState) => Partial<BodyStudioState>)(_state)
      : patch
  if (replace === true) {
    _state = p as BodyStudioState
  } else {
    _state = { ..._state, ...p }
  }
  _notify()
}

function _getState(): BodyStudioState {
  return _state
}

function _setEditing(c: Character): void {
  _setState({ editing: c })
}

function _patchEditing(patch: Partial<Character>): void {
  _setState((s) => ({ editing: { ...s.editing, ...patch } }))
}

function _resetEditing(): void {
  _setState({ editing: { ...DEFAULT_CHARACTER } })
}

function _saveToLibrary(name: string, thumbnail?: string): SavedCharacter {
  const trimmed = name.trim()
  const cur = _getState()
  const character: SavedCharacter = {
    id: uid(),
    name: trimmed || `Character ${cur.library.length + 1}`,
    createdAt: Date.now(),
    identityModel: cur.editing.identityModel,
    coeffs: cur.editing.coeffs ? [...cur.editing.coeffs] : null,
    localChanges: cur.editing.localChanges
      ? { ...cur.editing.localChanges }
      : null,
    customTargets: cur.editing.customTargets
      ? { ...cur.editing.customTargets }
      : null,
    ...(thumbnail ? { thumbnail } : {}),
  }
  const library = [...cur.library, character]
  persistLibrary(library)
  _setState({ library })
  return character
}

function _loadFromLibrary(id: string): void {
  const found = _getState().library.find((c) => c.id === id)
  if (!found) return
  _setState({
    editing: {
      identityModel: found.identityModel,
      coeffs: found.coeffs ? [...found.coeffs] : null,
      localChanges: found.localChanges ? { ...found.localChanges } : null,
      customTargets: found.customTargets ? { ...found.customTargets } : null,
    },
  })
}

function _deleteFromLibrary(id: string): void {
  const library = _getState().library.filter((c) => c.id !== id)
  persistLibrary(library)
  _setState({ library })
}

function _renameInLibrary(id: string, name: string): void {
  const library = _getState().library.map((c) =>
    c.id === id ? { ...c, name: name.trim() || c.name } : c,
  )
  persistLibrary(library)
  _setState({ library })
}

let _state: BodyStudioState = {
  editing: { ...DEFAULT_CHARACTER },
  library: loadPersisted().library,

  setEditing: _setEditing,

  patchEditing: _patchEditing,

  resetEditing: _resetEditing,

  saveToLibrary: _saveToLibrary,

  loadFromLibrary: _loadFromLibrary,

  deleteFromLibrary: _deleteFromLibrary,

  renameInLibrary: _renameInLibrary,
}

const _initialState: BodyStudioState = _state

function _useBodyStudioHook(): BodyStudioState
function _useBodyStudioHook<T>(selector: (s: BodyStudioState) => T): T
function _useBodyStudioHook<T>(
  selector?: (s: BodyStudioState) => T,
): T | BodyStudioState {
  const getSnapshot = selector
    ? () => selector(_getState())
    : () => _getState() as unknown as T
  return useSyncExternalStore(_subscribe, getSnapshot)
}

export const useBodyStudio = Object.assign(_useBodyStudioHook, {
  getState: _getState,
  setState: _setState,
  subscribe: _subscribe,
  getInitialState: (): BodyStudioState => _initialState,
  destroy: (): void => {},
})
