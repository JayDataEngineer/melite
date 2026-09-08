import { toast as sonnerToast } from "sonner"
import { create } from 'zustand'

export type ToastType = 'error' | 'success' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastStore {
  toasts: Toast[]
  addToast: (type: ToastType, message: string, action?: ToastAction) => void
  removeToast: (id: number) => void
}

let nextId = 0

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (type, message, action) => {
    // Errors persist 15s (the operator must SEE them — real gateway errors
    // are long, and a 5s auto-dismiss could vanish before they're read);
    // success/info auto-dismiss at 5s. Both also carry sonner's closeButton.
    const duration = type === 'error' ? 15_000 : 5_000
    const opts = action ? { duration, action } : { duration }
    // Delegate to sonner for actual rendering (mounted by <Toaster/>).
    if (type === 'error') sonnerToast.error(message, opts)
    else if (type === 'success') sonnerToast.success(message, opts)
    else sonnerToast(message, opts)
    // Keep the zustand store in sync for any code that reads toasts.
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, duration)
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
