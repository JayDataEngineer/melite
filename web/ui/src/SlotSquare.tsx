// SlotSquare — the ONE square for any slot-shaped value (2026-08-08).
//
// be reusable. Because when we design the look for it, the look for it
// will be reused for the sub-card system (i.e. loras and such)". This
// component is the flow-agnostic shell: a square thumbnail with a
// label + status line, file/asset drops, and an actions slot. The flow
// wiring layer (SlotGrid) and the future modifier sub-cards both render
// this shell — they add their own actions (wire button, drag handle) via
// `actions`.
//
// The look mirrors the existing SubcardGrid tiles (F7): rounded-lg, thin
// border (border-sidebar-border/60), tiny labels, opacity-50 disabled.
// md = h-20 (2026-08-08: "the little square can be bigger, that way it's
// more clear") — used by BOTH the drilldown input squares AND the modifier
// sub-card tiles (2026-08-08: "This horizontal card view can also be
// applied to the modifiers — stay unified"); sm = h-9 compact strip scale.
//
// Drop contract (the asset tray's bespoke MIME): application/tech-noir-asset
// carries a JSON payload with the URL directly → onDropAsset; an OS file
// drop → onDropFile. The consumer owns FileReader + error toasts
// (readAsDataURL lives here for reuse).
import { useRef, useState } from "react"
import { Upload, X } from "lucide-react"
import { cn } from "./utils"
import { Tip } from "./tip"
import type { ReactNode } from "react"

export const ASSET_DRAG_MIME = "application/tech-noir-asset"

/** THE "is this a thumbnail" rule for slot-shaped values — data: image
 * URLs, and http(s)/root-relative server asset URLs (the real artifact
 * shape: /v1/assets/runs/{rid}/{rel}). Shared by the square and the
 * wire picker so every artifact renders the same way. */
export function isImageUrl(value: string): boolean {
 return (
 /^data:image\//i.test(value) ||
 // blob: — the fresh-upload object-URL preview (the upload rail's
 // local mirror while the PARAM carries the estate path)
 /^blob:/i.test(value) ||
 /^(?:https?:)?\/[^"'<>]*\.(?:png|jpe?g|webp|gif|bmp|avif)(?:[?#]|$)/i.test(value)
 )
}

/** Read a File / Blob and resolve its data: URL. THE one read path for
 * every slot-shaped attach (SlotGrid, InputCardEditor). */
export function readAsDataURL(file: Blob): Promise<string> {
 return new Promise((resolve, reject) => {
 const reader = new FileReader()
 reader.onload = () => resolve(reader.result as string)
 reader.onerror = () => reject(reader.error ?? new Error("read failed"))
 reader.readAsDataURL(file)
 })
}

export interface SlotSquareProps {
 /** Short slot key shown under the square (e.g. "input_image"). */
 label: string
 /** Attached URL → thumbnail. null/undefined = empty placeholder. */
 value?: string | null
 /** Wired-state badge — the upstream card's title, etc. */
 badge?: React.ReactNode
 /** Secondary mono line ("not run yet"…). */
 metric?: string
 /** Small buttons overlaid on the square (wire button, drag handle…). */
 actions?: React.ReactNode
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
 /** Empty-state glyph — default Upload (an attach affordance); modifier
 * tiles pass a kind icon (Zap for LoRA — a modifier is not an attach). */
 emptyIcon?: ReactNode
 /** md (h-20, detail grid — the drilldown squares + modifier tiles) vs sm
 * (h-9, compact strip scale). */
 size?: "sm" | "md"
 className?: string
}

const SIZES = {
 sm: "h-9 w-9",
 md: "h-20 w-20",
} as const

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
}: SlotSquareProps) {
 const fileRef = useRef<HTMLInputElement | null>(null)
 const [dragOver, setDragOver] = useState(false)
 const interactive = !disabled && (onPickFile || onDropFile || onDropAsset || onClick || onClear)

 function handleDrop(e: React.DragEvent) {
 e.preventDefault()
 setDragOver(false)
 if (disabled) return
 // Prefer the asset tray's bespoke MIME — its payload carries the URL
 // directly (no fetch/conversion needed).
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
 <div className={cn("flex flex-col items-center gap-1", className)}>
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
 "relative flex items-center justify-center overflow-hidden rounded-lg border transition-all",
 SIZES[size],
 dragOver || selected
 ? "border-brand/70 bg-brand/10"
 : value
 ? "border-brand/40 bg-brand/[0.06]"
 : "border-dashed border-sidebar-border/60 bg-background/40",
 interactive && (onClick || onPickFile) && !dragOver && "hover:border-brand/40 hover:bg-sidebar-accent/40",
 disabled && "opacity-50",
 )}
 >
 {/* Hidden file input — the ONE pick path for every slot square. */}
 <input
 ref={fileRef}
 type="file"
 className="hidden"
 data-slot-input
 onChange={(e) => {
 const file = e.target.files?.[0]
 e.target.value = ""
 if (file && onPickFile) onPickFile(file)
 }}
 />

 {value ? (
 isImageUrl(value) ? (
 <img src={value} alt={label} className="h-full w-full object-cover" />
 ) : (
 <Tip tip={value}>
 <span
 className="max-w-full truncate px-1 font-mono text-[8px] text-muted-foreground"
 >
 {value.startsWith("data:") ? `${value.slice(0, 16)}…` : value.split("/").pop()}
 </span>
 </Tip>
 )
 ) : (
 <span className="text-muted-foreground/30">
 {emptyIcon ?? <Upload className={size === "md" ? "h-5 w-5" : "h-3 w-3"} />}
 </span>
 )}

 {/* Overlay actions — wire button, drag handle, etc. */}
 {actions && !disabled && (
 <span className="absolute bottom-0.5 right-0.5 flex items-center gap-0.5">
 {actions}
 </span>
 )}
 {onClear && value && !disabled && (
 <Tip tip="Detach">
 <button
 type="button"
 onClick={(e) => { e.stopPropagation(); onClear() }}
 aria-label="Detach"
 className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded bg-background/90 text-muted-foreground/70 hover:text-destructive"
 >
 <X className="h-3 w-3" />
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
 className="absolute bottom-0.5 left-0.5 flex h-5 w-5 items-center justify-center rounded bg-background/90 text-muted-foreground/70 hover:text-brand"
 >
 <Upload className="h-3 w-3" />
 </button>
 </Tip>
 )}
 </div>

 <Tip tip={label}>
 <span
 className={cn(
 "max-w-full truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60",
 size === "sm" && "text-[8px]",
 )}
 data-slot-label
 >
 {label}
 </span>
 </Tip>
 {badge !== undefined && (
 <Tip tip={typeof badge === "string" ? badge : undefined}>
 <span className="max-w-full truncate text-[9px] leading-tight text-brand/90">
 {badge}
 </span>
 </Tip>
 )}
 {metric && (
 <span className="max-w-full truncate font-mono text-[8px] text-muted-foreground/50">{metric}</span>
 )}
 </div>
 )
}
