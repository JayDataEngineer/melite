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
 *     [SlotSquare DELETED 2026-09-13 — the source-row law: every
 *     studio input rides @melite/card-base's SourceRow (one grammar,
 *     no exceptions); the bespoke slot + its lucide trio died] /
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
  useCallback,
  useEffect,
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

function widthClass(width: string): string | undefined {
  // (Every caller defaults its width prop — undefined never arrives;
  // an unknown token misses the map to undefined, which cn skips.)
  return WIDTHS[width]
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

// ── FilmPlayer — moved to the shared timeline package ───────────────
// The generic-tools stroke (2026-09-17): FilmPlayer lives at
// "@melite-plugin/timeline/ui/timeline" beside MotionTimelineBar — the
// video-preview rail ANY timeline-genre card rides (the bar's playhead
// drives the same FilmPlayerHandle seam). This re-export is a BRIDGE,
// not a second definition: h3's panes keep their one import site.
export { FilmPlayer } from "@melite-plugin/timeline/ui/timeline"
export type { FilmPlayerHandle, FilmPlayerProps } from "@melite-plugin/timeline/ui/timeline"
