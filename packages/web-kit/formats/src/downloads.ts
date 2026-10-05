/** downloads - browser download triggers for pose artifacts
 * (ex-lib/text-to-pose export helpers). */
import type { PoseMotion } from "./textToPose.ts"

// ── Export helpers ─────────────────────────────────────────────────────────

/**
 * Trigger a browser download from a base64-encoded payload.
 * Mirrors Kimodo demo's _download_bytes_to_browser (ui.py).
 */
export function downloadBase64Payload(
  b64: string,
  filename: string,
  mimeType = "application/octet-stream",
): void {
  let binStr: string
  try {
    binStr = atob(b64)
  } catch {
    console.error("downloadBase64Payload: invalid base64 string")
    return
  }
  const bytes = new Uint8Array(binStr.length)
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i)
  const blob = new Blob([bytes], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Download the SOMA-77 motion as an .npz file (poses + rotmats + deformed verts).
 */
export function downloadMotionNpz(motion: PoseMotion, filename = "motion.npz"): void {
  if (!motion.soma_npz_b64) throw new Error("No NPZ data in motion result")
  downloadBase64Payload(motion.soma_npz_b64, filename, "application/octet-stream")
}

/**
 * Capture the largest <canvas> on the page as a PNG download.
 * Used for screenshots of the 3D viewer.
 */
export function downloadCanvasScreenshot(filename = "pose.png"): void {
  const canvases = Array.from(document.querySelectorAll("canvas"))
  if (!canvases.length) return
  const canvas = canvases.reduce((best, cur) => {
    const ba = (best?.width || 0) * (best?.height || 0)
    const ca = (cur.width || 0) * (cur.height || 0)
    return ca > ba ? cur : best
  }, null as HTMLCanvasElement | null)
  if (!canvas) return
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, "image/png")
}
