/**
 * toast — the catalog's native toast store (2026-09-12, the kit
 * retirement): module state + listeners, no sonner, no zustand. Same
 * API the contract stores drove on the kit (addToast/removeToast +
 * getState()), same timing law (errors persist 15s, success/info 5s).
 * Rendering rides the DSH Toast surface at the app seam; errors also
 * log to console so nothing is silent when no renderer is mounted.
 */
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
const listeners = new Set<() => void>()
let state: ToastStore

const notify = (): void => { for (const l of listeners) l() }
const setState = (patch: Partial<ToastStore>): void => {
  state = { ...state, ...patch }
  notify()
}

state = {
  toasts: [],

  addToast: (type, message, action) => {
    // Errors persist 15s (the operator must SEE them — real gateway
    // errors are long, and a 5s auto-dismiss could vanish before they
    // are read); success/info auto-dismiss at 5s. Same law as the kit.
    const duration = type === 'error' ? 15_000 : 5_000
    if (type === 'error') console.error('[toast]', message, action ?? '')
    else console.info('[toast]', message)
    const id = nextId++
    setState({ toasts: [...state.toasts, { id, type, message }] })
    setTimeout(() => {
      setState({ toasts: state.toasts.filter((t) => t.id !== id) })
    }, duration)
  },

  removeToast: (id) => setState({ toasts: state.toasts.filter((t) => t.id !== id) }),
}

export const useToastStore = {
  getState: (): ToastStore => state,
  setState,
  subscribe: (l: () => void): (() => void) => {
    listeners.add(l)
    return () => { listeners.delete(l) }
  },
}
