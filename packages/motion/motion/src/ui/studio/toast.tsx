/**
 * useToastStore + ToastViewport — studio-local toast store (the old
 * kit `useToastStore` import is dead). Same selector API:
 * `useToastStore((s) => s.addToast)`. Rendering rides the DSH Toast
 * atom; mount one <ToastViewport/> per studio root.
 */
import { useSyncExternalStore } from "react"
import { Toast } from "@deepseek-ai/dsh-client-ui-primitives"

export type ToastType = "error" | "success" | "info"

interface ToastEntry {
  id: number
  type: ToastType
  message: string
}

export interface ToastStore {
  toasts: ToastEntry[]
  addToast: (type: ToastType, message: string) => void
  removeToast: (id: number) => void
}

let nextId = 1
let entries: ToastEntry[] = []
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): ToastEntry[] {
  return entries
}

function addToast(type: ToastType, message: string): void {
  // Errors persist 15s (the operator must SEE them); success/info
  // auto-dismiss at 5s — the kit store's durations, verbatim.
  const id = nextId++
  entries = [...entries, { id, type, message }]
  emit()
  const duration = type === "error" ? 15_000 : 5_000
  setTimeout(() => {
    removeToast(id)
  }, duration)
}

function removeToast(id: number): void {
  if (!entries.some((t) => t.id === id)) return
  entries = entries.filter((t) => t.id !== id)
  emit()
}

const api: Omit<ToastStore, "toasts"> = { addToast, removeToast }

export function useToastStore<T>(selector: (s: ToastStore) => T): T {
  const toasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return selector({ ...api, toasts })
}

/** Mount once per studio root — renders the live entries through
 *  the DSH Toast atom (body-portaled banner, owner unmounts onDone). */
export function ToastViewport() {
  const toasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  if (toasts.length === 0) return null
  return (
    <>
      {toasts.map((t) => (
        <Toast
          key={t.id}
          text={t.message}
          holdMs={t.type === "error" ? 15_000 : 5_000}
          onDone={() => removeToast(t.id)}
        />
      ))}
    </>
  )
}
