/**
 * Motion studio kit — the DSH-pure replacement for the
 * shared-chrome pieces the studio consumed from the old kit.
 *
 * WHAT LIVES HERE (and why):
 *   • DSH atoms are imported DIRECTLY at the call sites (Button,
 *     Input, Toast from @deepseek-ai/dsh-client-ui-primitives) —
 *     never re-exported through here.
 *   • SlotSquare — the POSE-SHAPE square (verbatim drop logic +
 *     data-slot-* hooks). NOT a duplicate of @melite/card-base's
 *     SourceRow: the pose square is a thumbnail shell for a mesh
 *     or a pose file, with drag-over highlight, a detach affordance
 *     and a wire affordance — its own domain, so it stays local.
 *   • useMotionThumbStore — the client-side motion thumbnail cache
 *     (same selector API + localStorage persistence, zustand-free).
 *   • EVERYTHING ELSE WAS PROMOTED (2026-09-18, the operator's
 *     ruling: "DSH does not work via two separate skeletons"). The
 *     kit re-declared, byte-for-byte, pieces the estate already
 *     owned: ASSET_DRAG_MIME (card-base/chrome — the estate's drag
 *     contract, consumed by card-base, CardsTab and input-square),
 *     isImageUrl, Tip, Skeleton, ViewportAnchor, ViewportFrame,
 *     PaneHeader, PaneShell, Skeleton and WirePickerModal — all now
 *     re-exported from @melite/card-base (Skeleton promoted 2026-09-18
 *     into layout.tsx, the pane grammar's loading face; motion's was
 *     the estate's only copy). ViewportAnchor / ViewportFrame re-export
 *     from the @melite/card-base/preview subpath (the seam body,
 *     img-to-mesh and CardsTab already ride). Their CSS was
 *     byte-identical too (the dock/frame classes diffed clean against
 *     viewportChrome.module.css), so the duplicate module died with
 *     the code.
 */
import { useRef, useState, useSyncExternalStore } from "react"
import type { ReactElement, ReactNode } from "react"
import { Upload, X } from "@melite/card-base/icons"
import { isImageUrl, Tip } from "@melite/card-base"
import { ASSET_DRAG_MIME, cn } from "@melite/card-base/chrome"
import s from "./kit.module.css"

// ── The estate's pieces, re-exported (the bridge; new call sites
// import from @melite/card-base directly) ────────────────────────────

export {
  isImageUrl, PaneHeader, PaneShell, Skeleton, Tip, WirePickerModal,
} from "@melite/card-base"
export type { WirePickerModalProps, PaneHeaderVariant } from "@melite/card-base"
export { ASSET_DRAG_MIME } from "@melite/card-base/chrome"
export { ViewportAnchor, ViewportFrame } from "@melite/card-base/preview"
export type {
  ViewportAnchorDock, ViewportAnchorProps, ViewportFrameProps,
} from "@melite/card-base/preview"

// ── SlotSquare — the square slot shell (verbatim drop logic) ────────

export interface SlotSquareProps {
  /** Short slot key shown under the square (e.g. "input_image"). */
  label: string
  /** Attached URL → thumbnail. null/undefined = empty placeholder. */
  value?: string | null
  /** Wired-state badge — the upstream card's title, etc. */
  badge?: ReactNode
  /** Secondary mono line ("not run yet"…). */
  metric?: string
  /** Small buttons overlaid on the square (wire button, drag handle…). */
  actions?: ReactNode
  /** File picker (hidden input) — same value shape as onDropFile. */
  onPickFile?: (file: File) => void
  /** OS file dropped on the square. */
  onDropFile?: (file: File) => void
  /** Asset-tray drop (ASSET_DRAG_MIME payload URL). */
  onDropAsset?: (url: string) => void
  /** The X (title "Detach") — fired when value/badge is set. */
  onClear?: () => void
  /** e.g. open the wire picker. */
  onClick?: () => void
  /** No interactions (opacity-50, drops rejected). */
  disabled?: boolean
  /** Drag-over highlight. */
  selected?: boolean
  /** Empty-state glyph — default Upload (an attach affordance). */
  emptyIcon?: ReactNode
  /** md (h-20, detail grid) vs sm (h-9, compact strip scale). */
  size?: "sm" | "md"
  className?: string
}

export function SlotSquare({
  label,
  value,
  badge,
  metric,
  actions,
  onPickFile,
  onDropFile,
  onDropAsset,
  onClear,
  onClick,
  disabled = false,
  selected = false,
  emptyIcon,
  size = "md",
  className,
}: SlotSquareProps): ReactElement {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const interactive = !disabled && (onPickFile || onDropFile || onDropAsset || onClick || onClear)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const asset = e.dataTransfer.getData(ASSET_DRAG_MIME)
    if (asset) {
      try {
        const payload = JSON.parse(asset) as { url?: string }
        if (payload.url && onDropAsset) {
          onDropAsset(payload.url)
          return
        }
      } catch {
        /* malformed payload — fall through to file drop */
      }
    }
    const file = e.dataTransfer.files?.[0]
    if (file && onDropFile) onDropFile(file)
  }

  return (
    <div className={cn(s.slotCol, className)}>
      <div
        // data-slot-square = THE square: the interactive element. Every
        // consumer (tests + SlotGrid) drops on it and reads its size
        // classes — the attribute must ride the square, not the label
        // wrapper (2026-08-09 HEAD-consistency fix).
        data-slot-square
        onClick={disabled ? undefined : onClick}
        onDragOver={(e) => {
          if (disabled) return
          if (e.dataTransfer.types.includes(ASSET_DRAG_MIME) || e.dataTransfer.types.includes("Files")) {
            e.preventDefault()
            setDragOver(true)
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          s.slotSquare,
          size === "sm" ? s.slotSm : s.slotMd,
          dragOver || selected
            ? s.slotHot
            : value
              ? s.slotFilled
              : s.slotEmpty,
          interactive && (onClick || onPickFile) && !dragOver && s.slotHover,
          disabled && s.slotDisabled,
        )}
      >
        {/* Hidden file input — the ONE pick path for every slot square. */}
        <input
          ref={fileRef}
          type="file"
          className={s.hiddenInput}
          data-slot-input
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ""
            if (file && onPickFile) onPickFile(file)
          }}
        />

        {value ? (
          isImageUrl(value) ? (
            <img src={value} alt={label} className={s.slotImg} />
          ) : (
            <Tip tip={value}>
              <span className={s.slotUrl}>
                {value.startsWith("data:") ? `${value.slice(0, 16)}…` : value.split("/").pop()}
              </span>
            </Tip>
          )
        ) : (
          <span className={s.slotEmptyGlyph}>
            {emptyIcon ?? <Upload className={size === "md" ? s.sz20 : s.sz12} aria-hidden />}
          </span>
        )}

        {/* Overlay actions — wire button, drag handle, etc. */}
        {actions && !disabled && (
          <span className={s.slotActions}>
            {actions}
          </span>
        )}
        {onClear && value && !disabled && (
          <Tip tip="Detach">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClear() }}
              aria-label="Detach"
              className={s.slotClear}
            >
              <X className={s.sz12} aria-hidden />
            </button>
          </Tip>
        )}
        {onPickFile && !disabled && (
          <Tip tip={`Pick a file for ${label}`}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
              aria-label={`Pick a file for ${label}`}
              data-slot-pick
              className={s.slotPick}
            >
              <Upload className={s.sz12} aria-hidden />
            </button>
          </Tip>
        )}
      </div>

      <Tip tip={label}>
        <span
          className={cn(s.slotLabel, size === "sm" && s.slotLabelSm)}
          data-slot-label
        >
          {label}
        </span>
      </Tip>
      {badge !== undefined && (
        <Tip tip={typeof badge === "string" ? badge : undefined}>
          <span className={s.slotBadge}>
            {badge}
          </span>
        </Tip>
      )}
      {metric && (
        <span className={s.slotMetric}>{metric}</span>
      )}
    </div>
  )
}


// ── useMotionThumbStore — the client-side motion thumbnail cache ─────
// Same selector API as the kit store (`useMotionThumbStore((s) =>
// s.setThumbnail)`), zustand-free: a module-level map + localStorage
// persistence behind useSyncExternalStore. UI-only cache — ZERO impact
// on the flow's cacheKey, run params, or backend submission.

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
    // Corrupt JSON — start fresh.
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
  thumbListeners.forEach((l) => l())
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
    // Best-effort persist — quota errors are non-fatal (the thumbnail
    // just won't survive a reload).
    localStorage.setItem(THUMB_STORAGE_KEY, JSON.stringify(thumbState))
  } catch {
    // fall through — in-memory cache still works for this session.
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

export function useMotionThumbStore<T>(selector: (s: MotionThumbState) => T): T {
  const thumbnails = useSyncExternalStore(subscribeThumbs, getThumbsSnapshot, getThumbsSnapshot)
  return selector({ ...thumbApi, thumbnails })
}
