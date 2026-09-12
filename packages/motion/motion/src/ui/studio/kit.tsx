/**
 * Motion studio kit — the DSH-pure replacement for the
 * shared-chrome pieces the studio consumed from the old kit.
 *
 * WHAT LIVES HERE (and why):
 *   • DSH atoms are imported DIRECTLY at the call sites (Button,
 *     Input, Toast from @deepseek-ai/dsh-client-ui-primitives) —
 *     never re-exported through here.
 *   • Everything DSH ships NO atom for is ported here as native
 *     elements + the studio's own CSS module (kit.module.css):
 *     ViewportAnchor (same docks, same data-dock) / ViewportFrame
 *     (same frame, same data-slot, ref-forwarding — the stage owns
 *     a measured ref) / PaneHeader / PaneShell / SlotSquare
 *     (verbatim drop logic + data-slot-* hooks) / WirePickerModal
 *     (verbatim wire UX + data-wire-* hooks) / useMotionThumbStore
 *     (same selector API + localStorage persistence, zustand-free)
 *     / Tip (DSH Tooltip over a layout-invisible anchor so
 *     ref-less DSH Buttons can carry bubbles without warnings).
 *     Shared chrome (StudioShell + error line, the declaration
 *     door, cn, readAsDataURL) lives in @melite/card-base —
 *     imported, never re-declared here.
 *   • isImageUrl / ASSET_DRAG_MIME are the studio's own rules (the
 *     kit package itself is gone from this package).
 */
import { forwardRef, useRef, useState, useSyncExternalStore } from "react"
import type { ComponentProps, ReactElement, ReactNode } from "react"
import { Tooltip } from "@deepseek-ai/dsh-client-ui-primitives"
import type { CardStage } from "@melite/contracts"
import { Link2, Upload, X } from "@melite/card-base/icons"
import { cn } from "@melite/card-base/chrome"
import s from "./kit.module.css"

// ── helpers (verbatim from the kit's single definitions) ────────────

/** The asset tray's bespoke drag MIME (URL rides the payload). */
export const ASSET_DRAG_MIME = "application/tech-noir-asset"

/** THE "is this a thumbnail" rule for slot-shaped values. */
export function isImageUrl(value: string): boolean {
  return (
    /^data:image\//i.test(value) ||
    /^blob:/i.test(value) ||
    /^(?:https?:)?\/[^"'<>]*\.(?:png|jpe?g|webp|gif|bmp|avif)(?:[?#]|$)/i.test(value)
  )
}

// ── Tip — DSH Tooltip over a layout-invisible anchor ────────────────

export function Tip({ tip, children }: { tip?: string; children: ReactElement }) {
  if (tip === undefined) return children
  return (
    <Tooltip label={tip} side="top" delayMs={300}>
      <span className={s.tipAnchor}>{children}</span>
    </Tooltip>
  )
}

// ── Skeleton — the quiet loading block ──────────────────────────────

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(s.skeleton, className)}
      {...props}
    />
  )
}

// ── ViewportAnchor — floating content at a named dock ───────────────

export type ViewportAnchorDock =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom"
  | "fill"
  | "edge-right"
  | "edge-left"

const DOCK_CLASS: Record<ViewportAnchorDock, string> = {
  "top-right": s.dockTopRight,
  "top-left": s.dockTopLeft,
  "bottom-right": s.dockBottomRight,
  "bottom-left": s.dockBottomLeft,
  "bottom-center": s.dockBottomCenter,
  bottom: s.dockBottom,
  fill: s.dockFill,
  "edge-right": s.dockEdgeRight,
  "edge-left": s.dockEdgeLeft,
}

export interface ViewportAnchorProps extends ComponentProps<"div"> {
  /** Where the content docks (default top-right — the pin shape). */
  dock?: ViewportAnchorDock
}

export function ViewportAnchor({ dock = "top-right", className, ...props }: ViewportAnchorProps): ReactElement {
  return (
    <div
      data-slot="viewport-anchor"
      data-dock={dock}
      className={cn(DOCK_CLASS[dock], className)}
      {...props}
    />
  )
}

// ── ViewportFrame — THE shared viewport box ─────────────────────────

export interface ViewportFrameProps extends ComponentProps<"div"> {
  /** Accessible label for the viewport region (renders as aria-label). */
  label?: string
  /** Shown when there is nothing on the stage. */
  empty?: ReactNode
}

export const ViewportFrame = forwardRef<HTMLDivElement, ViewportFrameProps>(
  function ViewportFrame({ children, label, empty, className, ...props }, ref): ReactElement {
    return (
      <div
        data-slot="viewport-frame"
        aria-label={label}
        ref={ref}
        className={cn(s.frame, className)}
        {...props}
      >
        {children}
        {empty}
      </div>
    )
  },
)

// ── PaneHeader + PaneShell — the shared pane chrome ─────────────────

export type PaneHeaderVariant = "strip" | "preview"

export interface PaneHeaderProps {
  /** The pane title (omit when the row is pure chrome). */
  title?: ReactNode
  /** Small readout beside the title (counts, frames, fps). */
  meta?: ReactNode
  /** Right-aligned hint or action cluster (ml-auto). */
  hint?: ReactNode
  /** Leading cluster before the title (transport controls). */
  lead?: ReactNode
  variant?: PaneHeaderVariant
  className?: string
}

export function PaneHeader({ title, meta, hint, lead, variant = "strip", className }: PaneHeaderProps): ReactElement {
  if (variant === "preview") {
    return (
      <div data-slot="pane-header" data-variant="preview" className={cn(s.paneHeaderPreview, className)}>
        {lead}
        {title != null ? <span className={s.paneTitle}>{title}</span> : null}
        {meta != null ? <span className={s.paneMeta}>{meta}</span> : null}
        {hint}
      </div>
    )
  }
  return (
    <div
      data-slot="pane-header"
      data-variant="strip"
      className={cn(s.paneHeaderStrip, className)}
    >
      {lead}
      {title != null ? (
        <span className={s.paneTitle}>{title}</span>
      ) : null}
      {meta != null ? (
        <span className={s.paneMetaNum}>{meta}</span>
      ) : null}
      {hint != null ? <span className={s.paneHint}>{hint}</span> : null}
    </div>
  )
}

export function PaneShell({ children, className }: { children: ReactNode; className?: string }): ReactElement {
  return (
    <div data-slot="pane-shell" className={cn(s.paneShell, className)}>
      {children}
    </div>
  )
}

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

// ── WirePickerModal — the shared "link to a previous output" picker ─

export interface WirePickerModalProps {
  /** Slot key being wired (display only — "Wire {slot} from …"). */
  slot: string
  /** Prior stages by ARRAY INDEX (the caller already filtered forward
   *  of the current stage — F4: wires only point backwards). */
  priorStages: CardStage[]
  /** Currently-wired upstream id (undefined = nothing wired). */
  currentId?: string
  /** Currently-selected named output (null = primary assetUrls[0]). */
  currentOutput?: string | null
  /** Pick an upstream (+ optional named output). The caller writes the
   *  wire AND clears the slot param (mutual-exclusion). */
  onPick: (upstreamId: string, outputName?: string | null) => void
  /** Unwire — the slot returns to manual-attach / empty. */
  onUnwire: () => void
  onClose: () => void
}

export function WirePickerModal({
  slot,
  priorStages,
  currentId,
  currentOutput,
  onPick,
  onUnwire,
  onClose,
}: WirePickerModalProps): ReactElement {
  return (
    <div
      className={s.wireScrim}
      onClick={onClose}
      data-wire-modal
    >
      <div
        className={s.wireCard}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={s.wireHead}>
          <Link2 className={s.wireHeadIcon} />
          <span className={s.wireHeadTitle}>
            Wire {slot} from an earlier card
          </span>
          <button
            type="button"
            onClick={onClose}
            className={s.wireClose}
            aria-label="Close wire picker"
          >
            <X className={s.sz14} />
          </button>
        </div>
        {currentId && (
          <button
            type="button"
            onClick={onUnwire}
            data-wire-unwire
            className={s.wireUnwire}
          >
            Unwire — this slot will ask for a file or wire again
          </button>
        )}
        <ul className={s.wireList}>
          {priorStages.length === 0 && (
            <li className={s.wireEmpty}>
              No earlier cards yet — add a card before this one to wire from it.
            </li>
          )}
          {priorStages.map((u, i) => {
            const named = u.result?.artifacts ?? {}
            const namedEntries = Object.entries(named)
            const multi = namedEntries.length > 1
            const rows: Array<{ outputName: string | null; thumb?: string; label: string }> = multi
              ? namedEntries.map(([name, url]) => ({ outputName: name, thumb: url, label: name }))
              : [{ outputName: null, thumb: u.result?.assetUrls[0], label: "primary" }]
            return rows.map((row, ri) => {
              const selected = u.id === currentId && (currentOutput ?? null) === (row.outputName ?? null)
              return (
                <li key={u.id + (ri > 0 ? `:${row.outputName}` : "")}>
                  <button
                    type="button"
                    onClick={() => onPick(u.id, row.outputName)}
                    data-wire-option={row.outputName ?? "primary"}
                    className={cn(s.wireOption, selected && s.wireOptionSelected)}
                  >
                    <span className={s.wireIndex}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {row.thumb && isImageUrl(row.thumb) ? (
                      <img src={row.thumb} alt="" className={s.wireThumb} />
                    ) : (
                      <div className={s.wireThumbEmpty}>
                        <Link2 className={s.sz14} />
                      </div>
                    )}
                    <div className={s.wireMeta}>
                      <div className={s.wireTitle}>
                        {u.title}
                        {multi && <span className={s.wireOutput}>· {row.label}</span>}
                      </div>
                      <div className={s.wireSub}>
                        {u.result ? (row.thumb ?? "no artifacts") : "not run yet"}
                      </div>
                    </div>
                    {selected && (
                      <span className={s.wireWired}>
                        wired
                      </span>
                    )}
                  </button>
                </li>
              )
            })
          })}
        </ul>
      </div>
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
