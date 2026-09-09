// useImageLoader — cached base/mask image loading + paint-canvas sizing.
//
// Split from useCanvasView (keeps that hook under ~400 lines): loadImage
// + ensurePaintCanvas, verbatim logic and empty dep arrays. Both close
// over stable refs only, so their identities are stable across renders
// (the load effect's input-only dep array relies on that).
import { useCallback } from "react"
import type { StudioRefs } from "./useStudioRefs"

export function useImageLoader({
  imgCacheRef, paintCanvasRef,
}: Pick<StudioRefs, "imgCacheRef" | "paintCanvasRef">) {
  // ── Image loader (cached; crossOrigin so toDataURL works for runs URLs) ─
  const loadImage = useCallback((url: string): Promise<HTMLImageElement | null> => {
  const cache = imgCacheRef.current
  const hit = cache.get(url)
  if (hit && hit.complete && hit.naturalWidth > 0) return Promise.resolve(hit)
  return new Promise((resolve) => {
  const img = new Image()
  img.crossOrigin = "anonymous"
  img.onload = () => { cache.set(url, img); resolve(img) }
  img.onerror = () => resolve(null)
  img.src = url
  })
  }, [])

  const ensurePaintCanvas = useCallback((w: number, h: number) => {
  if (!paintCanvasRef.current) paintCanvasRef.current = document.createElement("canvas")
  const pc = paintCanvasRef.current
  if (pc.width !== w || pc.height !== h) {
  // preserve content across resizes (rare — input image swap)
  if (pc.width && pc.height) {
  const tmp = document.createElement("canvas")
  tmp.width = pc.width; tmp.height = pc.height
  tmp.getContext("2d")!.drawImage(pc, 0, 0)
  pc.width = w; pc.height = h
  pc.getContext("2d")!.drawImage(tmp, 0, 0, w, h)
  } else {
  pc.width = w; pc.height = h
  }
  }
  return pc
  }, [])

  return { loadImage, ensurePaintCanvas }
}
