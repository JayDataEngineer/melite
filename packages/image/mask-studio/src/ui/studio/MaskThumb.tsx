// MaskThumb — the small tinted mask thumbnail canvas. Pure move from
// component.tsx (props shape unchanged).
import { useEffect, useRef } from "react"
import { makeTinted } from "./canvas-ops"

// ── Mask thumbnail (small canvas, redraws on content/version change) ──────
export function MaskThumb({
  url, color, imgCache, paintCanvas, paintVersion,
}: {
  /** Artifact URL (data URL / runs URL). Null for the live paint row. */
  url: string | null
  color: string
  imgCache: Map<string, HTMLImageElement>
  paintCanvas: HTMLCanvasElement | null
  paintVersion: number
}) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
  const c = ref.current; if (!c) return
  const ctx = c.getContext("2d"); if (!ctx) return
  const W = c.width, H = c.height
  ctx.clearRect(0, 0, W, H)
  // checkerboard so transparent regions read as "empty"
  const s = 6
  for (let y = 0; y < H; y += s) for (let x = 0; x < W; x += s) {
  ctx.fillStyle = ((x / s + y / s) % 2 === 0) ? "#1a1a2e" : "#151523"
  ctx.fillRect(x, y, s, s)
  }
  let src: CanvasImageSource | null = null
  if (url) {
  const img = imgCache.get(url)
  if (img && img.complete && img.naturalWidth > 0) src = img
  } else if (paintCanvas && paintVersion > 0) {
  src = paintCanvas
  }
  if (src) {
  const tinted = makeTinted(src, color, W, H)
  ctx.drawImage(tinted, 0, 0)
  }
  }, [url, color, imgCache, paintCanvas, paintVersion])
  // 72×48 (bumped 40×28 → subcard size at tenant #3): the bottom bar's
  // subcards are the OUTPUT readout — big enough to read a mask at a
  // glance, small enough that six fit in a row.
  return <canvas ref={ref} width={72} height={48} className="h-12 w-[72px] shrink-0 rounded-sm border border-black/40" />
}
