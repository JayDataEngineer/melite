// EmptyStateImport — the image-import card. Pure move from component.tsx
// (props shape unchanged).
import { useRef } from "react"
import { Button } from "@deepseek-ai/dsh-client-ui-primitives"
import { clsx } from "clsx"
import { ImageUp, Link2 } from "@melite/card-base/icons"
import { ASSET_DRAG_MIME } from "./attach"
import styles from "./mask.module.css"

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
  className={styles.emptyState}
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
  <div className={styles.emptyIcon}>
  <ImageUp className={clsx(styles.sz28, styles.accentInk)} />
  </div>
  <div>
  <div className={styles.emptyTitle}>Drop an image to mask</div>
  <div className={styles.emptySub}>
  Drag &amp; drop, paste, or upload — or drag in from assets{onWire ? ", or wire from a previous card" : ""}.
  </div>
  </div>
  <div className={styles.emptyRow}>
  <Button variant="ghost"
  type="button"
  onClick={() => inputRef.current?.click()}
  className={styles.uploadBtn}
  >
  <ImageUp className={styles.sz14} /> Upload image
  </Button>
  {onWire && (
  <Button variant="ghost"
  type="button"
  onClick={onWire}
  data-empty-wire
  className={styles.wireBtn}
  >
  <Link2 className={styles.sz14} /> Wire from card
  </Button>
  )}
  </div>
  <input
  ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className={styles.hiddenInput}
  onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = "" }}
  />
  </div>
  )
}
