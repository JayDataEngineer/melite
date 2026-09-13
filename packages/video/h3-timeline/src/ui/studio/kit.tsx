/**
 * h3-timeline studio kit — the DSH-pure replacement for the
 * shared-chrome pieces the studio consumed.
 *
 * WHAT LIVES HERE (and why):
 *   • DSH atoms are imported DIRECTLY at the call sites (Button,
 *     Input, Switch, Tooltip from
 *     @deepseek-ai/dsh-client-ui-primitives) — never re-exported
 *     through here.
 *   • Everything DSH ships NO atom for is ported here as native
 *     elements + the studio's own CSS module (studio.module.css):
 *     ControlRow / SectionLabel / NumberControl / TextControl /
 *     SelectControl / TriControl / CheckControl (the two-state
 *     boolean — DSH's Switch, the catalog's two-state atom) /
 *     SliderControl / SelectMenu (native <select>: the custom
 *     popover's keyboard/click-outside contract comes free) /
 *     SlotSquare (verbatim drop logic + data-slot-* hooks) /
 *     EmptyState / PaneHeader / PaneShell / StudioShell (the
 *     STANDALONE variant — rail renders inline, no StudioRail
 *     portal; kept local deliberately, not the card-base shell) /
 *     defineShellDeclaration (the narrow ViewportKind/BarKind seam
 *     table — h3's own vocabulary) / FilmPlayer (native <video
 *     controls> exposing the same FilmPlayerHandle) / Tip (DSH
 *     Tooltip over a layout-invisible anchor so React-18-ref-less
 *     DSH Buttons can carry bubbles without warnings).
 *   • Shared chrome (cn, readAsDataURL, glyphs) is imported from
 *     @melite/card-base — never re-declared here.
 *   • isImageUrl / ASSET_DRAG_MIME are the studio's own rules (the
 *     kit package itself is gone from this package).
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import type { ReactElement, ReactNode } from "react"
import { cn } from "@melite/card-base/chrome"
import { TriStateAtom } from "@melite/card-base"
import {
  Switch,
  Tooltip,
} from "@deepseek-ai/dsh-client-ui-primitives"
import { Upload, X, TriangleAlert } from "@melite/card-base/icons"
import s from "./studio.module.css"

/** The w-* width vocabulary the width props name (call sites keep
 *  their historical strings; the map resolves them to real classes). */
const WIDTHS: Record<string, string> = {
  "w-12": s.w12,
  "w-14": s.w14,
  "w-16": s.w16,
  "w-24": s.w24,
  "w-28": s.w28,
  "w-32": s.w32,
  "w-36": s.w36,
  "w-40": s.w40,
  "w-[4.5rem]": s.w45,
  "w-full": s.wFull,
}

function widthClass(width: string | undefined): string | undefined {
  return width === undefined ? undefined : WIDTHS[width]
}

// ── helpers (verbatim from the kit's single definitions) ────────────

/** THE "is this a thumbnail" rule for slot-shaped values. */
export function isImageUrl(value: string): boolean {
  return (
    /^data:image\//i.test(value) ||
    /^blob:/i.test(value) ||
    /^(?:https?:)?\/[^"'<>]*\.(?:png|jpe?g|webp|gif|bmp|avif)(?:[?#]|$)/i.test(value)
  )
}

/** The asset tray's bespoke drag MIME (URL rides the payload). */
export const ASSET_DRAG_MIME = "application/tech-noir-asset"

// ── Tip — DSH Tooltip over a layout-invisible anchor ────────────────

export function Tip({ tip, children }: { tip?: string; children: ReactElement }) {
  if (tip === undefined) return children
  return (
    <Tooltip label={tip} side="top" delayMs={300}>
      <span className={s.tipAnchor}>{children}</span>
    </Tooltip>
  )
}

// ── ControlRow — the universal label+control line ───────────────────

export type ControlDensity = "md" | "sm"

export function ControlRow({
  label,
  hint,
  children,
  density = "md",
  className,
}: {
  label: ReactNode
  hint?: ReactNode
  children: ReactNode
  density?: ControlDensity
  className?: string
}) {
  return (
    <label className={cn(density === "sm" ? s.ctlRowSm : s.ctlRow, className)}>
      <span>{label}{hint != null ? hint : null}</span>
      {children}
    </label>
  )
}

// ── SectionLabel — the uppercase group heading ──────────────────────

export function SectionLabel({
  children,
  tail,
  className,
}: {
  children: ReactNode
  tail?: ReactNode
  className?: string
}) {
  return (
    <div className={cn(s.sectionLabel, className)}>
      <span className={s.sectionLabelText}>{children}</span>
      {tail != null ? <span className={s.sectionLabelTail}>{tail}</span> : null}
    </div>
  )
}

// ── NumberControl — native number input, inherit-aware ──────────────

export function NumberControl({
  ariaLabel, value, onChange, min, max, step,
  placeholder = "inherit", align = "right", width = "w-24", disabled, title, testId,
  size = "md",
}: {
  ariaLabel: string
  value: number | undefined
  onChange: (v: number | undefined) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  align?: "right" | "center"
  width?: string
  disabled?: boolean
  title?: string
  testId?: string
  size?: "md" | "sm"
}) {
  return (
    <input
      type="number"
      aria-label={ariaLabel}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      title={title}
      data-testid={testId}
      placeholder={placeholder}
      value={typeof value === "number" ? value : ""}
      onChange={(e) => {
        const n = Number(e.target.value)
        onChange(e.target.value.trim() === "" || !Number.isFinite(n) ? undefined : n)
      }}
      className={cn(
        s.ctlInput,
        size === "sm" && s.ctlInputSm,
        widthClass(width),
        align === "right" ? s.alignR : s.alignC,
      )}
    />
  )
}

// ── TextControl — native text input, inherit-aware ──────────────────

export function TextControl({
  ariaLabel, value, onChange, placeholder = "inherit", width = "w-24", disabled,
}: {
  ariaLabel: string
  value: string | undefined
  onChange: (v: string | undefined) => void
  placeholder?: string
  width?: string
  disabled?: boolean
}) {
  return (
    <input
      type="text"
      aria-label={ariaLabel}
      disabled={disabled}
      placeholder={placeholder}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => {
        const v = e.target.value.trim()
        onChange(v === "" ? undefined : v)
      }}
      className={cn(s.ctlInput, s.alignR, widthClass(width))}
    />
  )
}

// ── SelectControl — native select, inherit-aware ────────────────────

export interface ControlSelectOption {
  value: string
  label?: string
}

export function SelectControl({
  ariaLabel, value, onChange, options, emptyLabel = "inherit", width = "w-full",
  disabled, title, testId, mono,
}: {
  ariaLabel: string
  value: string | undefined
  onChange: (v: string | undefined) => void
  options: readonly (string | ControlSelectOption)[]
  emptyLabel?: string | false
  width?: string
  disabled?: boolean
  title?: string
  testId?: string
  mono?: boolean
}) {
  return (
    <select
      aria-label={ariaLabel}
      disabled={disabled}
      title={title}
      data-testid={testId}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      className={cn(s.ctlSelect, widthClass(width), mono && s.mono)}
    >
      {emptyLabel !== false ? <option value="">{emptyLabel}</option> : null}
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o } : o
        return <option key={opt.value} value={opt.value}>{opt.label ?? opt.value}</option>
      })}
    </select>
  )
}

// ── TriControl — inherit / on / off (card-base's TriStateAtom in
// rail clothing: h3's width/disabled ergonomics over the shared
// semantics — one spelling of tri-state everywhere) ────────────────

export function TriControl({
  ariaLabel, value, onChange, width = "w-full", disabled,
}: {
  ariaLabel: string
  value: boolean | undefined
  onChange: (v: boolean | undefined) => void
  width?: string
  disabled?: boolean
}) {
  return (
    <span className={cn(widthClass(width), "inline-block")}>
      <TriStateAtom
        label={ariaLabel}
        name={ariaLabel}
        value={value}
        disabled={disabled}
        onEdit={(_name, v) => { onChange(v === undefined ? undefined : v === true) }}
      />
    </span>
  )
}

// ── CheckControl — the two-state boolean (DSH Switch) ───────────────

export function CheckControl({
  ariaLabel, checked, onChange, disabled,
}: {
  ariaLabel: string
  checked: boolean | undefined
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <Switch
      label={ariaLabel}
      disabled={disabled}
      checked={checked === true}
      onChange={onChange}
    />
  )
}

// ── SliderControl — native range + value readout ────────────────────

export function SliderControl({
  ariaLabel, value, onChange, min, max, step, format, width = "w-24", disabled,
}: {
  ariaLabel: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  format?: (v: number) => string
  width?: string
  disabled?: boolean
}) {
  return (
    <span className={s.sliderWrap}>
      <input
        type="range"
        aria-label={ariaLabel}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(widthClass(width), s.slider)}
      />
      <span className={s.sliderReadout}>
        {format ? format(value) : value}
      </span>
    </span>
  )
}

// ── SelectMenu — native select (the custom popover's keyboard + ─────
// click-outside contract comes free with the platform control). The
// box styling rides buttonClassName (its historical role);
// popoverClassName is accepted and ignored (no popover exists).

export interface SelectMenuOption<T extends string> {
  value: T
  label: string
}

export function SelectMenu<T extends string>({
  value,
  options,
  onChange,
  className,
  buttonClassName,
  popoverClassName: _popoverClassName,
  disabled,
  ...rest
}: {
  value: T
  options: SelectMenuOption<T>[]
  onChange: (v: T) => void
  className?: string
  buttonClassName?: string
  popoverClassName?: string
  disabled?: boolean
  'aria-label'?: string
  title?: string
}) {
  void _popoverClassName
  return (
    <span className={cn(s.selMenu, className)}>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(s.selMenuBox, buttonClassName)}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </span>
  )
}

// ── SlotSquare — the square slot shell (verbatim drop logic) ────────

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
}: {
  label: string
  value?: string | null
  badge?: ReactNode
  metric?: string
  actions?: ReactNode
  onPickFile?: (file: File) => void
  onDropFile?: (file: File) => void
  onDropAsset?: (url: string) => void
  onClear?: () => void
  onClick?: () => void
  disabled?: boolean
  selected?: boolean
  emptyIcon?: ReactNode
  size?: "sm" | "md"
  className?: string
}) {
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
        <span className={cn(s.slotLabel, size === "sm" && s.slotLabelSm)} data-slot-label>
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

// ── EmptyState — the shared nothing-here block ──────────────────────

export function EmptyState({
  icon,
  title,
  hint,
  variant = "pane",
  className,
}: {
  icon?: ReactNode
  title: ReactNode
  hint?: ReactNode
  variant?: "overlay" | "pane"
  className?: string
}) {
  return (
    <div
      data-slot="empty-state"
      data-variant={variant}
      className={cn(variant === "overlay" ? s.emptyOverlay : s.emptyPane, className)}
    >
      {icon}
      <p className={s.emptyTitle}>{title}</p>
      {hint != null ? <p className={s.emptyHint}>{hint}</p> : null}
    </div>
  )
}

// ── PaneHeader + PaneShell — the shared pane chrome ─────────────────

export type PaneHeaderVariant = "strip" | "preview"

export function PaneHeader({
  title,
  meta,
  hint,
  lead,
  variant = "strip",
  className,
}: {
  title?: ReactNode
  meta?: ReactNode
  hint?: ReactNode
  lead?: ReactNode
  variant?: PaneHeaderVariant
  className?: string
}) {
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
    <div data-slot="pane-header" data-variant="strip" className={cn(s.paneHeaderStrip, className)}>
      {lead}
      {title != null ? <span className={s.paneTitle}>{title}</span> : null}
      {meta != null ? <span className={s.paneMetaNum}>{meta}</span> : null}
      {hint != null ? <span className={s.paneHint}>{hint}</span> : null}
    </div>
  )
}

export function PaneShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div data-slot="pane-shell" className={cn(s.paneShell, className)}>
      {children}
    </div>
  )
}

// ── FilmPlayer — one film, one native player ────────────────────────
// The kit's Vidstack build is gone with the kit; the surface is a
// native <video controls> exposing the same FilmPlayerHandle seam the
// timeline bar's playhead drives (seekTo/current/duration/play/pause/
// toggle) and the same time/duration/playing reports. Time reports
// keep both sources (the element's timeupdate clock + a 4Hz poll
// while playing) so a silent event path never freezes the bar.

export interface FilmPlayerHandle {
  seekTo: (sec: number) => void
  current: () => number
  duration: () => number
  play: () => void
  pause: () => void
  toggle: () => void
}

export interface FilmPlayerProps {
  src: string
  onTime?: (sec: number) => void
  onDuration?: (sec: number) => void
  onPlayingChange?: (playing: boolean) => void
  onEnded?: () => void
  muted?: boolean
  loop?: boolean
  autoPlay?: boolean
  poster?: string
  className?: string
  "data-testid"?: string
}

export const FilmPlayer = forwardRef<FilmPlayerHandle, FilmPlayerProps>(
  function FilmPlayer(
    { src, onTime, onDuration, onPlayingChange, onEnded, muted, loop, autoPlay, poster, className, "data-testid": tid },
    ref,
  ) {
    const videoRef = useRef<HTMLVideoElement>(null)

    const pendingSeekRef = useRef<number | null>(null)
    const seekRafRef = useRef<number | null>(null)

    const seekTo = useCallback((sec: number) => {
      pendingSeekRef.current = sec
      if (seekRafRef.current != null) return
      seekRafRef.current = requestAnimationFrame(() => {
        seekRafRef.current = null
        const target = pendingSeekRef.current
        pendingSeekRef.current = null
        const el = videoRef.current
        if (target == null || !el) return
        const d = el.duration
        const t = Math.max(0, Number.isFinite(d) && d > 0 ? Math.min(target, d) : target)
        el.currentTime = t
      })
    }, [])

    useEffect(
      () => () => {
        if (seekRafRef.current != null) cancelAnimationFrame(seekRafRef.current)
      },
      [],
    )

    useImperativeHandle(
      ref,
      (): FilmPlayerHandle => ({
        seekTo,
        current: () => videoRef.current?.currentTime ?? 0,
        duration: () => {
          const d = videoRef.current?.duration
          return Number.isFinite(d) ? (d ?? 0) : 0
        },
        play: () => void videoRef.current?.play(),
        pause: () => void videoRef.current?.pause(),
        toggle: () => {
          const el = videoRef.current
          if (!el) return
          if (el.paused) void el.play()
          else el.pause()
        },
      }),
      [seekTo],
    )

    const onTimeRef = useRef(onTime)
    onTimeRef.current = onTime
    const handleTime = useCallback((t: number) => {
      onTimeRef.current?.(t)
    }, [])
    useEffect(() => {
      const id = window.setInterval(() => {
        const el = videoRef.current
        if (!el || el.paused || el.ended) return
        const t = el.currentTime
        if (Number.isFinite(t) && t >= 0) onTimeRef.current?.(t)
      }, 250)
      return () => window.clearInterval(id)
    }, [])

    return (
      <video
        ref={videoRef}
        className={className}
        data-testid={tid}
        src={src}
        muted={muted}
        loop={loop}
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        controls
        poster={poster}
        onTimeUpdate={(e) => handleTime(e.currentTarget.currentTime)}
        onPlay={() => onPlayingChange?.(true)}
        onPause={() => onPlayingChange?.(false)}
        onEnded={() => onEnded?.()}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          if (Number.isFinite(d) && d > 0) onDuration?.(d)
        }}
      />
    )
  },
)
