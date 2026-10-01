import { useSyncExternalStore } from "react"
import { Tip } from "@melite/card-base/client"

export {
  isImageUrl, PaneHeader, PaneShell, Skeleton, Tip, WirePickerModal,
} from "@melite/card-base/client"
export type { WirePickerModalProps, PaneHeaderVariant } from "@melite/card-base/client"
export { ASSET_DRAG_MIME } from '@melite/card-base/client'
export { ViewportAnchor, ViewportFrame } from '@melite/card-base/client'
export type {
  ViewportAnchorDock, ViewportAnchorProps, ViewportFrameProps,
} from '@melite/card-base/client'

const THUMB_STORAGE_KEY = "motion-card-thumbnails"

function loadThumbs(): Record<string, string> {
  try {
    const raw = localStorage.getItem(THUMB_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>
    }
  } catch {
    return {}
  }
  return {}
}

interface MotionThumbState {
  thumbnails: Record<string, string>
  setThumbnail: (stageId: string, dataUrl: string) => void
  clearThumbnail: (stageId: string) => void
}

let thumbState: Record<string, string> = loadThumbs()
const thumbListeners = new Set<() => void>()

function emitThumbs() {
  thumbListeners.forEach((listener) => listener())
}

function subscribeThumbs(listener: () => void): () => void {
  thumbListeners.add(listener)
  return () => {
    thumbListeners.delete(listener)
  }
}

function getThumbsSnapshot(): Record<string, string> {
  return thumbState
}

function persistThumbs() {
  try {
    localStorage.setItem(THUMB_STORAGE_KEY, JSON.stringify(thumbState))
  } catch {
    return
  }
}

function setThumbnail(stageId: string, dataUrl: string): void {
  thumbState = { ...thumbState, [stageId]: dataUrl }
  persistThumbs()
  emitThumbs()
}

function clearThumbnail(stageId: string): void {
  if (!(stageId in thumbState)) return
  const next = { ...thumbState }
  delete next[stageId]
  thumbState = next
  persistThumbs()
  emitThumbs()
}

const thumbApi: Omit<MotionThumbState, "thumbnails"> = { setThumbnail, clearThumbnail }

export function useMotionThumbStore<T>(selector: (state: MotionThumbState) => T): T {
  const thumbnails = useSyncExternalStore(subscribeThumbs, getThumbsSnapshot, getThumbsSnapshot)
  return selector({ ...thumbApi, thumbnails })
}
