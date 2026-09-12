// toast — local minimal port of useToastStore (the shared kit/toast).
// DSH ships no toast store atom (its Toast is a presentational banner
// with owner-managed visibility). Only the surface useImageImport
// touches is preserved: useToastStore.getState().addToast(type,
// message). Errors stay loud via console.error (never swallowed);
// the in-memory list keeps the read shape for any code that reads
// toasts.
export type ToastType = "error" | "success" | "info"

export interface ToastItem {
  id: number
  type: ToastType
  message: string
}

let nextId = 0
let toasts: ToastItem[] = []
const listeners = new Set<() => void>()

function emit(): void {
  for (const fn of listeners) fn()
}

export const useToastStore = {
  getState(): {
    toasts: ToastItem[]
    addToast: (type: ToastType, message: string) => void
    removeToast: (id: number) => void
  } {
    return {
      toasts,
      addToast: (type, message) => {
        if (type === "error") console.error(message)
        const id = nextId++
        toasts = [...toasts, { id, type, message }]
        emit()
        const duration = type === "error" ? 15_000 : 5_000
        setTimeout(() => {
          toasts = toasts.filter((t) => t.id !== id)
          emit()
        }, duration)
      },
      removeToast: (id) => {
        toasts = toasts.filter((t) => t.id !== id)
        emit()
      },
    }
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },
}
