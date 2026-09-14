/**
 * THE ONE TOAST STORE (node-safe half of the one toast system,
 * stroke 37): module state + the dual API (hook selector for React,
 * zustand-classic statics for module-level pushers and tests). NO
 * atom imports — node-env suites (the catalog contract specs) import
 * this half without dragging DSH UI primitives' .css through the
 * door. The renderer half lives in ./toast.tsx (ToastViewport); the
 * store is the system, the viewport is its face.
 *
 * History: founded 2026-09-12 (the ideo/motion copies collapsed
 * here). Stroke 36: the shell mounts the viewport — chrome is
 * shell-owned. Stroke 37: the LAST two private stores died —
 * web-kit/catalog's (whose toasts NEVER rendered: pushed from module
 * context with no viewport anywhere, console-only) and
 * mask-studio's (whose drop-errors never rendered either). Their
 * pushers migrated here verbatim via the static surface.
 *
 * ONE API, two faces (the zustand-classic dual shape):
 *   - hook:      useToastStore((s) => s.addToast)   — inside React
 *   - statics:   useToastStore.getState().addToast(type, msg)
 *                useToastStore.getState().toasts
 *                useToastStore.subscribe(l) / .setState(patch)
 *                — module-level pushers (contract stores, import
 *                hooks) and test reset.
 *
 * Rendering: the DSH Toast atom (presentational banner — the atom is
 * the surface, this module is the system). ToastViewport claims
 * rendering: the FIRST live viewport renders, every other mounted
 * viewport renders nothing, and ownership re-broadcasts when owners
 * unmount — so the shell, the cards console, or any future seat may
 * mount one and the document still renders toasts exactly once.
 *
 * Timing law (verbatim from the kit): errors persist 15s (the
 * operator must SEE them), success/info auto-dismiss at 5s. Errors
 * also console.error so nothing is silent even with no viewport.
 *
 * The third addToast argument (action {label, onClick}) is ACCEPTED
 * and ignored: the DSH Toast atom owns the surface and ships no
 * action chrome — the kit store dropped it the same way. When the
 * atom grows an action prop, store and render it here.
 *
 * Per-seam subpath: `@melite/card-base/toast-store`.
 */
import { useSyncExternalStore } from "react"

export type ToastType = "error" | "success" | "info"

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastEntry {
  id: number
  type: ToastType
  message: string
}

export interface ToastStore {
  toasts: ToastEntry[]
  addToast: (type: ToastType, message: string, action?: ToastAction) => void
  removeToast: (id: number) => void
}

let nextId = 1
let entries: ToastEntry[] = []
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSnapshot(): ToastEntry[] {
  return entries
}

function addToast(type: ToastType, message: string, _action?: ToastAction): void {
  void _action // accepted, not renderable — see the header law
  // Errors persist 15s (the operator must SEE them); success/info
  // auto-dismiss at 5s — the kit store's durations, verbatim.
  const id = nextId++
  entries = [...entries, { id, type, message }]
  if (type === "error") console.error("[toast]", message)
  else console.info("[toast]", message)
  emit()
  const duration = type === "error" ? 15_000 : 5_000
  setTimeout(() => {
    removeToast(id)
  }, duration)
}

export function removeToast(id: number): void {
  if (!entries.some((t) => t.id === id)) return
  entries = entries.filter((t) => t.id !== id)
  emit()
}

// the patchable api field — the zustand-classic setState contract
// lets tests swap addToast (the retry spec stubs it mid-suite)
let liveAddToast: ToastStore["addToast"] = addToast

function getStore(): ToastStore {
  return { toasts: entries, addToast: liveAddToast, removeToast }
}

function setStoreState(patch: Partial<ToastStore>): void {
  if (patch.addToast !== undefined) liveAddToast = patch.addToast
  if (patch.toasts !== undefined) entries = patch.toasts
  emit()
}

/** The hook half — inside React: `useToastStore((s) => s.addToast)`.
 *  The static half (getState/subscribe/setState) hangs off the same
 *  function, the zustand-classic shape — module-level pushers and
 *  tests use those without calling the hook. */
export const useToastStore = Object.assign(
  function useToastStore<T>(selector: (s: ToastStore) => T): T {
    const toasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
    return selector({ addToast: liveAddToast, removeToast, toasts })
  },
  {
    getState: getStore,
    setState: setStoreState,
    subscribe,
  },
)
