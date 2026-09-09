// canvas-ops — pure canvas helpers for the mask-studio tenant.
//
// Pure move from component.tsx (the 2870-line monolith split): makeTinted +
// producedMasks, verbatim. No DOM state, no react — safe to import from any
// sibling (MaskThumb, the canvas view hook).
import { DETECTOR_DEFS, SAM3_COLOR } from "./constants"
import type { ProducedMask } from "./constants"

// ── Helpers ──────────────────────────────────────────────────────────────
/** Tint a mask: draw src, then source-in the fill so only opaque regions
 * keep the tint (transparent elsewhere). Returns a fresh canvas each call. */
export function makeTinted(src: CanvasImageSource, color: string, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas")
  c.width = w; c.height = h
  const cx = c.getContext("2d")!
  cx.drawImage(src, 0, 0, w, h)
  cx.globalCompositeOperation = "source-in"
  cx.fillStyle = color
  cx.fillRect(0, 0, w, h)
  cx.globalCompositeOperation = "source-over"
  return c
}

/** The produced-mask set — every artifact the run brought back, in display
 * order (combined first, then per-class detectors, then sam3). The strip +
 * canvas overlay both derive from this; nothing is user-togglable. */
export function producedMasks(artifacts: Record<string, string>): ProducedMask[] {
  const out: ProducedMask[] = []
  for (const d of DETECTOR_DEFS) {
  const url = artifacts[d.key]
  if (url) out.push({ key: d.key, label: d.label, color: d.color, url })
  }
  const sam3Url = artifacts.mask_sam3
  if (sam3Url) out.push({ key: "mask_sam3", label: "SAM3", color: SAM3_COLOR, url: sam3Url })
  return out
}
