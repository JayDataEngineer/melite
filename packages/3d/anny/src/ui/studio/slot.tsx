/**
 * SlotSquare — the ONE square for any slot-shaped value. Studio-local
 * copy of the former kit shell (those kit imports are dead): a square
 * thumbnail with label + status line, file drops, and the detach +
 * pick buttons. Same props, same data attributes, DSH-token styling.
 */
import { useRef, useState, type ReactElement, type ReactNode } from "react"
import { Upload, X } from "@melite/card-base/icons"
import { Tip } from "./controls"
import { cx } from "@melite/card-base/chrome"
import styles from "./slot.module.css"

export const ASSET_DRAG_MIME = "application/tech-noir-asset"

/** THE "is this a thumbnail" rule for slot-shaped values. */
export function isImageUrl(value: string): boolean {
  return (
    /^data:image\//i.test(value) ||
    /^blob:/i.test(value) ||
    /^(?:https?:)?\/[^"'<>]*\.(?:png|jpe?g|webp|gif|bmp|avif)(?:[?#]|$)/i.test(value)
  )
}

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
  /** No interactions (drops rejected). */
  disabled?: boolean
  /** Drag-over highlight. */
  selected?: boolean
  /** Empty-state glyph — default Upload (an attach affordance). */
  emptyIcon?: ReactNode
  /** md (detail grid) vs sm (compact strip scale). */
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
    <div className={cx(styles.col, className)}>
      <div
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
        className={cx(
          styles.square,
          size === "sm" ? styles.sizeSm : styles.sizeMd,
          dragOver || selected ? styles.stateHot : value ? styles.stateSet : styles.stateEmpty,
          interactive && (onClick || onPickFile) && !dragOver ? styles.clickable : undefined,
          disabled ? styles.disabled : undefined,
        )}
      >
        {/* Hidden file input — the ONE pick path for every slot square. */}
        <input
          ref={fileRef}
          type="file"
          className={styles.hiddenInput}
          data-slot-input
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ""
            if (file && onPickFile) onPickFile(file)
          }}
        />

        {value ? (
          isImageUrl(value) ? (
            <img src={value} alt={label} className={styles.thumb} />
          ) : (
            <Tip tip={value}>
              <span className={styles.fileName}>
                {value.startsWith("data:") ? `${value.slice(0, 16)}…` : value.split("/").pop()}
              </span>
            </Tip>
          )
        ) : (
          <span className={styles.emptyGlyph}>
            {emptyIcon ?? <Upload className={size === "md" ? styles.emptyMd : styles.emptySm} />}
          </span>
        )}

        {/* Overlay actions — wire button, drag handle, etc. */}
        {actions && !disabled && (
          <span className={styles.actions}>
            {actions}
          </span>
        )}
        {onClear && value && !disabled && (
          <Tip tip="Detach">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClear() }}
              aria-label="Detach"
              className={styles.detachBtn}
            >
              <X className={styles.detachIcon} />
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
              className={styles.pickBtn}
            >
              <Upload className={styles.detachIcon} />
            </button>
          </Tip>
        )}
      </div>

      <Tip tip={label}>
        <span
          className={cx(styles.slotLabel, size === "sm" ? styles.slotLabelSm : undefined)}
          data-slot-label
        >
          {label}
        </span>
      </Tip>
      {badge !== undefined && (
        <Tip tip={typeof badge === "string" ? badge : undefined}>
          <span className={styles.badgeLine}>
            {badge}
          </span>
        </Tip>
      )}
      {metric && (
        <span className={styles.metricLine}>{metric}</span>
      )}
    </div>
  )
}
