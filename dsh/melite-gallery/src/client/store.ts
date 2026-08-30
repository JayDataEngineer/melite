/**
 * Gallery open/close state — one module-level observable shared by both slot
 * components (sidebar entry button and overlay panel live in separate slot
 * subtrees; the module singleton is the single source of truth).
 */
export interface GalleryStore {
  /** Subscribe to open-state changes; returns the unsubscriber. */
  subscribe(listener: () => void): () => void
  /** Current open state (useSyncExternalStore-compatible snapshot). */
  isOpen(): boolean
  toggle(): void
  open(): void
  close(): void
}

export function createGalleryStore(): GalleryStore {
  let open = false
  const listeners = new Set<() => void>()
  const emit = (): void => {
    for (const listener of listeners) listener()
  }
  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    isOpen: () => open,
    toggle: () => {
      open = !open
      emit()
    },
    open: () => {
      if (!open) {
        open = true
        emit()
      }
    },
    close: () => {
      if (open) {
        open = false
        emit()
      }
    },
  }
}

/** Singleton: both registered slot components import this one instance. */
export const galleryStore = createGalleryStore()