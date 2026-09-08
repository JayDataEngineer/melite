// EmptyStateImport — the image-import card. Pure move from component.tsx
// (props shape unchanged).
import { useRef } from "react"
import { ImageUp, Link2 } from "lucide-react"
import { Button } from "@melite/ui/button"
import { ASSET_DRAG_MIME, Input } from "@melite/ui"

// ── Empty state: the proper image-import card (the #1 fix) ────────────────
// same image input stuff"): Upload (file picker), drop (OS file OR asset
// tray), and Wire (link to a previous card's output). The wire button is
// gated on `onWire` being passed — display-only mounts (tests) omit it.
export function EmptyStateImport({
  onPick, onDropAsset, onWire,
}: {
  onPick: (file: File) => void
  /** Asset-tray drop (ASSET_DRAG_MIME payload URL). */
  onDropAsset: (url: string) => void
  /** Open the wire picker. Omit to hide the wire affordance. */
  onWire?: () => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  return (
  <div
  className="flex flex-col items-center justify-center gap-3 p-8 text-center"
  data-empty-state
  // Accept asset-tray drops directly on the empty card (the canvas
  // wrapper also handles drops, but the empty state is the prominent
  // target before any image lands).
  onDragOver={(e) => {
  if (e.dataTransfer.types.includes(ASSET_DRAG_MIME) || e.dataTransfer.types.includes("Files")) {
  e.preventDefault()
  }
  }}
  onDrop={(e) => {
  const asset = e.dataTransfer.getData(ASSET_DRAG_MIME)
  if (asset) {
  try {
  const payload = JSON.parse(asset) as { url?: string }
  if (payload.url) { e.preventDefault(); e.stopPropagation(); onDropAsset(payload.url); return }
  } catch { /* malformed — fall through to file */ }
  }
  const file = e.dataTransfer.files?.[0]
  if (file && file.type.startsWith("image/")) {
  e.preventDefault(); e.stopPropagation(); onPick(file)
  }
  }}
  >
  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/15">
  <ImageUp className="h-7 w-7 text-brand" />
  </div>
  <div>
  <div className="text-sm font-medium text-foreground/90">Drop an image to mask</div>
  <div className="mt-0.5 text-[11px] text-muted-foreground/70">
  Drag &amp; drop, paste, or upload — or drag in from assets{onWire ? ", or wire from a previous card" : ""}.
  </div>
  </div>
  <div className="flex items-center gap-2">
  <Button variant="ghost"
  type="button"
  onClick={() => inputRef.current?.click()}
  className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-brand/90"
  >
  <ImageUp className="h-3.5 w-3.5" /> Upload image
  </Button>
  {onWire && (
  <Button variant="ghost"
  type="button"
  onClick={onWire}
  data-empty-wire
  className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1.5 text-[12px] font-medium text-foreground/80 transition-colors hover:bg-sidebar/60 hover:text-brand"
  >
  <Link2 className="h-3.5 w-3.5" /> Wire from card
  </Button>
  )}
  </div>
  <Input
  ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
  onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = "" }}
  />
  </div>
  )
}
