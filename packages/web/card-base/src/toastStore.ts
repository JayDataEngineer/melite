/**
 * THE ONE TOAST STORE (node-safe half of the one toast system,
 * stroke 37): module state + the dual API (hook selector for React,
 * zustand-classic statics for module-level pushers and tests). NO
 * atom imports — node-env suites (the catalog contract specs) import
 * this half without dragging DSH UI primitives' .css through the
 * door. The renderer half lives in ./toast.tsx (ToastViewport); the
 * store is the system, the viewport is its face.
 *
 * One store for the whole system: pusher modules call the
 * `getState()`/`subscribe()`/`setState()` statics from module context,
 * React seats use the hook selector. The last two private stores (in
 * web-kit/catalog and mask-studio) are gone; their pushers now ride
 * the `contractToast` seam in @melite/catalog, wired by each browser
 * entry to this store.
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

/** How long a toast of a severity holds before it dismisses, in ms.
 *  THE ONE OWNER of that number: the store arms its dismissal timer
 *  from it (the lifetime holds without a viewport mounted) and the
 *  renderer face passes it to the DSH Toast as `holdMs`, so a
 *  duration is spelled once. Errors persist long enough for the
 *  operator to read what broke; success and info clear quickly. */
export function toastHoldMs(type: ToastType): number {
  return type === "error" ? 15_000 : 5_000
}

function addToast(type: ToastType, message: string, _action?: ToastAction): void {
  void _action // accepted, not renderable — see the header law
  const id = nextId++
  entries = [...entries, { id, type, message }]
  if (type === "error") console.error("[toast]", message)
  else console.info("[toast]", message)
  emit()
  // The lifetime is the store's alone: a pushed toast dismisses on
  // this clock whether or not a viewport is mounted to fade it. The
  // Toast's own hold+FADE timer lands later and calls the same
  // idempotent removeToast, so it never shortens this one.
  setTimeout(() => {
    removeToast(id)
  }, toastHoldMs(type))
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
