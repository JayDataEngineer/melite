// useImageImport — image import (upload / drop / paste / asset tray) +
// the wire picker state.
//
// Split from component.tsx (the 2870-line monolith split): the import
// block + wire-picker block + paste effect, verbatim logic. A manual
// attach writes input_image AND unwires — the mutual-exclusion contract
// (a slot is wired XOR attached, never both).
import { useCallback, useEffect, useState } from "react"
import type { CardStage } from "@melite/contracts"
import { ASSET_DRAG_MIME, readAsDataURL } from "./attach"
import { useToastStore } from "./toast"
import { INPUT_SLOT } from "./constants"

export interface ImageImportOpts {
  stage: CardStage
  onSave: (p: Record<string, unknown>) => void
  /** Wire/unwire the input_image slot (store's setSlotInput, stage-scoped
  * by the caller). Omit to hide the wire affordance entirely. */
  onWireSlot?: (slotKey: string, upstreamId: string | null, outputName?: string | null) => void
  /** ALL stages of the enclosing run, in array order — the wire picker
  * restricts to indices BEFORE this stage. */
  upstreams: CardStage[]
}

export interface ImageImport {
  attachImage: (url: string) => void
  importImageFile: (file: File) => void
  onCanvasDrop: (e: React.DragEvent) => void
  onCanvasDragOver: (e: React.DragEvent) => void
  onCanvasDragLeave: (e: React.DragEvent) => void
  dropHighlight: boolean
  wireOpen: boolean
  setWireOpen: (b: boolean) => void
  priorStages: CardStage[]
  canWire: boolean
}

export function useImageImport({
  stage, onSave, onWireSlot, upstreams,
}: ImageImportOpts): ImageImport {
  const [dropHighlight, setDropHighlight] = useState(false)
  // ── Image import (upload / drop / paste / asset tray) ───────────────────
  // A manual attach (file OR asset) writes input_image AND unwires — the
  // mutual-exclusion contract (a slot is wired XOR attached, never both).
  // The wire side is owned by attachAsset/attachFile's onWireSlot null-out.
  const attachImage = useCallback((url: string) => {
  onSave({ ...stage.params, input_image: url })
  // Clear any stale wire so the falsy-injection guard can't shadow the
  // manual value (the same contract SlotGrid's handleFile enforces).
  onWireSlot?.(INPUT_SLOT, null, null)
  }, [onSave, stage.params, onWireSlot])

  const importImageFile = useCallback((file: File) => {
  if (!file.type.startsWith("image/")) {
  useToastStore.getState().addToast("error", "Drop an image file (PNG / JPEG / WebP).")
  return
  }
  void readAsDataURL(file)
  .then(attachImage)
  .catch((err: unknown) => useToastStore.getState().addToast(
  "error", `Could not read image: ${err instanceof Error ? err.message : String(err)}`,
  ))
  }, [attachImage])

  const onCanvasDrop = (e: React.DragEvent) => {
  // Asset-tray drop: the bespoke MIME carries the URL directly (no
  // FileReader). Checked BEFORE files so a tray drag never falls through
  // to the OS-file branch.
  const asset = e.dataTransfer.getData(ASSET_DRAG_MIME)
  if (asset) {
  try {
  const payload = JSON.parse(asset) as { url?: string }
  if (payload.url) {
  e.preventDefault(); e.stopPropagation(); setDropHighlight(false)
  attachImage(payload.url); return
  }
  } catch { /* malformed payload — fall through to file drop */ }
  }
  const file = e.dataTransfer.files?.[0]
  if (!file || !file.type.startsWith("image/")) return
  e.preventDefault(); e.stopPropagation(); setDropHighlight(false)
  importImageFile(file)
  }
  const onCanvasDragOver = (e: React.DragEvent) => {
  if (e.dataTransfer.types.includes("Files") || e.dataTransfer.types.includes(ASSET_DRAG_MIME)) {
  e.preventDefault(); setDropHighlight(true)
  }
  }
  const onCanvasDragLeave = (e: React.DragEvent) => {
  if (e.relatedTarget === null) setDropHighlight(false)
  }

  // ── Wire picker (link input_image to a previous card's output) ──────────
  const [wireOpen, setWireOpen] = useState(false)
  useEffect(() => {
  if (!wireOpen) return
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setWireOpen(false) }
  window.addEventListener("keydown", onKey)
  return () => window.removeEventListener("keydown", onKey)
  }, [wireOpen])
  const stageIdx = upstreams.findIndex((s) => s.id === stage.id)
  const priorStages = upstreams
  .map((u, i) => ({ u, i }))
  .filter(({ u, i }) => u.id !== stage.id && (stageIdx < 0 || i < stageIdx))
  .map(({ u }) => u)
  const canWire = !!onWireSlot

  // paste an image from the clipboard
  useEffect(() => {
  const onPaste = (e: ClipboardEvent) => {
  const item = Array.from(e.clipboardData?.items ?? []).find((it) => it.type.startsWith("image/"))
  const file = item?.getAsFile()
  if (file) { e.preventDefault(); importImageFile(file) }
  }
  window.addEventListener("paste", onPaste)
  return () => window.removeEventListener("paste", onPaste)
  }, [importImageFile])

  return {
  attachImage, importImageFile, onCanvasDrop, onCanvasDragOver,
  onCanvasDragLeave, dropHighlight, wireOpen, setWireOpen,
  priorStages, canWire,
  }
}
