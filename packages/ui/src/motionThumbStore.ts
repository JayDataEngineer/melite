/**
 * Client-side thumbnail cache for motion cards.
 *
 * Motion card outputs are NPZ files (3D motion data) — not directly viewable
 * as an image. When the MotionCardEditor renders the mesh in the drilldown,
 * it captures a canvas screenshot and stores it here so the collapsed tile
 * can show a visual preview instead of a broken-image icon.
 *
 * This is a UI-only cache — it has ZERO impact on the pipeline's cacheKey,
 * run params, or backend submission. It persists to localStorage so thumbnails
 * survive page reloads. If a thumbnail is missing (run completed but the
 * drilldown was never opened), the tile shows a motion-genre placeholder.
 */
import { create } from "zustand"

const STORAGE_KEY = "motion-card-thumbnails"

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

interface MotionThumbState {
  thumbnails: Record<string, string>
  setThumbnail: (stageId: string, dataUrl: string) => void
  clearThumbnail: (stageId: string) => void
}

export const useMotionThumbStore = create<MotionThumbState>((set) => ({
  thumbnails: load(),
  setThumbnail: (stageId, dataUrl) =>
    set((state) => {
      const thumbnails = { ...state.thumbnails, [stageId]: dataUrl }
      try {
        // Best-effort persist — quota errors are non-fatal (the thumbnail
        // just won't survive a reload).
        localStorage.setItem(STORAGE_KEY, JSON.stringify(thumbnails))
      } catch {
        // fall through — in-memory cache still works for this session.
      }
      return { thumbnails }
    }),
  clearThumbnail: (stageId) =>
    set((state) => {
      if (!(stageId in state.thumbnails)) return state
      const thumbnails = { ...state.thumbnails }
      delete thumbnails[stageId]
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(thumbnails))
      } catch {
        // same — non-fatal
      }
      return { thumbnails }
    }),
}))
