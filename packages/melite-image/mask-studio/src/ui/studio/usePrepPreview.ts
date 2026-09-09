// usePrepPreview — the VIEW-ONLY prep preview (docs/design/mask-prep.md
// §9). Split from component.tsx (the 2870-line monolith split): the prep
// state + the debounced compute effect, verbatim logic and dep array.
// Never writes stage params (writesKeys untouched): the knobs live on the
// Inpaint card; this previews the effective mask.
import { useEffect, useState } from "react"
import type { RefObject } from "react"
import { applyPrep, coverage as maskCoverage, maskFromImageData } from "@melite/formats"
import type { StudioRefs } from "./useStudioRefs"

export interface PrepPreviewOpts {
  artifacts: Record<string, string>
  hasPaint: boolean
  paintVersion: number
  refs: StudioRefs
  redrawRef: RefObject<() => void>
}

export interface PrepPreview {
  prepPreviewOn: boolean
  setPrepPreviewOn: (f: (v: boolean) => boolean) => void
  prepGrow: number
  setPrepGrow: (n: number) => void
  prepFeather: number
  setPrepFeather: (n: number) => void
  prepCoveragePct: number | null
  prepSourceLabel: string
}

export function usePrepPreview({
  artifacts, hasPaint, paintVersion, refs, redrawRef,
}: PrepPreviewOpts): PrepPreview {
  const { imgCacheRef, imgSizeRef, paintCanvasRef, prepOverlayRef } = refs
  // ── Prep preview (VIEW-ONLY — docs/design/mask-prep.md §9) ─────────────
  // Never writes stage params (writesKeys untouched): the knobs live on
  // the Inpaint card; this panel previews the effective mask so the user
  // understands what grow/feather do BEFORE wiring the card.
  const [prepPreviewOn, setPrepPreviewOn] = useState(false)
  const [prepGrow, setPrepGrow] = useState(8)
  const [prepFeather, setPrepFeather] = useState(8)
  const [prepCoveragePct, setPrepCoveragePct] = useState<number | null>(null)
  const [prepSourceLabel, setPrepSourceLabel] = useState<string>("")

  // ── Prep preview computation (debounced; VIEW-ONLY) ────────────────────
  // Resolves the SAME producer priority the brick uses (run output
  // mask_combined → live paint), extracts the raw mask (red channel for
  // white-on-black artifacts, alpha for the paint canvas), runs the parity
  // twin's chain, and tints the result cyan into a persistent overlay
  // canvas that redraw() composites. Never touches stage params.
  useEffect(() => {
  if (!prepPreviewOn) {
  const had = prepOverlayRef.current !== null
  prepOverlayRef.current = null
  setPrepCoveragePct(null)
  setPrepSourceLabel("")
  if (had) redrawRef.current?.()
  return
  }
  const t = window.setTimeout(() => {
  const { w, h } = imgSizeRef.current
  if (!w || !h) return
  const runMaskUrl = artifacts.mask_combined ?? artifacts.mask_sam3 ?? null
  const usePaint = !runMaskUrl
  let src: CanvasImageSource | null = null
  if (usePaint) {
  if (!hasPaint || !paintCanvasRef.current) {
  prepOverlayRef.current = null
  setPrepCoveragePct(null)
  setPrepSourceLabel("no raw mask yet — paint or run Detect/SAM3")
  redrawRef.current?.()
  return
  }
  src = paintCanvasRef.current
  } else {
  const img = imgCacheRef.current.get(runMaskUrl)
  if (!img || !img.complete || img.naturalWidth === 0) return
  src = img
  }
  const tmp = document.createElement("canvas")
  tmp.width = w; tmp.height = h
  const tctx = tmp.getContext("2d", { willReadFrequently: true })
  if (!tctx) return
  tctx.drawImage(src, 0, 0, w, h)
  const idata = tctx.getImageData(0, 0, w, h)
  const mat = maskFromImageData(idata, usePaint ? "alpha" : "red")
  let out: ReturnType<typeof applyPrep>
  try {
  out = applyPrep(mat, {
  grow: prepGrow, feather: prepFeather, threshold: 0, invert: false,
  })
  } catch (e) {
  prepOverlayRef.current = null
  setPrepCoveragePct(null)
  setPrepSourceLabel(e instanceof Error ? e.message : String(e))
  redrawRef.current?.()
  return
  }
  if (!prepOverlayRef.current) prepOverlayRef.current = document.createElement("canvas")
  const oc = prepOverlayRef.current
  if (oc.width !== w || oc.height !== h) { oc.width = w; oc.height = h }
  const octx = oc.getContext("2d")
  if (!octx) return
  const oimg = octx.createImageData(w, h)
  for (let i = 0; i < w * h; i++) {
  const v = out.mask.data[i]
  oimg.data[i * 4 + 0] = 34
  oimg.data[i * 4 + 1] = 211
  oimg.data[i * 4 + 2] = 238
  oimg.data[i * 4 + 3] = Math.round(v * 255)
  }
  octx.putImageData(oimg, 0, 0)
  setPrepCoveragePct(maskCoverage(out.mask) * 100)
  setPrepSourceLabel(usePaint ? "paint layer" : "last run (mask_combined)")
  redrawRef.current?.()
  }, 150)
  return () => window.clearTimeout(t)
  }, [prepPreviewOn, prepGrow, prepFeather, artifacts, hasPaint, paintVersion])

  return {
  prepPreviewOn, setPrepPreviewOn, prepGrow, setPrepGrow,
  prepFeather, setPrepFeather, prepCoveragePct, prepSourceLabel,
  }
}
