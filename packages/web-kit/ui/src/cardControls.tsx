/**
 * cardControls — THE generic card-form control kit (studio density).
 *
 * Every card tenant (video timeline rail, image reference panel, audio
 * mixer, 3D material picker) renders dense label+control lines. Before
 * this kit each handrolled its own <label>+<input> with private class
 * strings — the timeline card alone carried ~51 copies of the same
 * three class strings across 8 distinct control shapes.
 *
 * ONE kit, TWO densities:
 *   md — the run-panel / Layer A look (text-[10px], gap-2)
 *   sm — the knob fold look (text-[9px], tighter)
 *
 * The class strings are the timeline card's CURRENT ones verbatim —
 * swapping the handrolls for these components changes NOTHING in
 * appearance by design. The win is: one definition site, consistent
 * focus/placeholder/inherit behavior, and cards yet to be built
 * (image strips, audio mixers) get the same look for free.
 *
 * INHERIT SEMANTICS: the *Control components accept `undefined` as a
 * first-class value ("inherit" — the per-call knob pattern). The
 * placeholder reads "inherit", the empty string maps back to undefined
 * in onChange, and selects get an inherit option first.
 */
import type { ReactNode } from "react"
import { cn } from "./utils"

// ── densities ───────────────────────────────────────────────────────

export type ControlDensity = "md" | "sm"

const ROW_CLASS: Record<ControlDensity, string> = {
  md: "flex items-center justify-between gap-2 text-[10px] text-muted-foreground/80",
  sm: "flex items-center justify-between gap-2 text-[9px] text-muted-foreground/80",
}

const INPUT_CLASS =
  "rounded border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-foreground/90 outline-none placeholder:text-muted-foreground/55 focus:border-brand/60"

const SELECT_CLASS =
  "rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[10px] text-foreground/90 outline-none focus:border-brand/60"

// ── ControlRow — the universal label+control line ───────────────────

export interface ControlRowProps {
  /** The visible label text. */
  label: ReactNode
  /** Optional hint appended after the label (the muted tail span). */
  hint?: ReactNode
  /** The control(s) — right side of the row. */
  children: ReactNode
  density?: ControlDensity
  className?: string
}

export function ControlRow({ label, hint, children, density = "md", className }: ControlRowProps) {
  return (
    <label className={cn(ROW_CLASS[density], className)}>
      <span>{label}{hint != null ? hint : null}</span>
      {children}
    </label>
  )
}

// ── SectionLabel — the uppercase group heading (e.g. "Engine (H3)") ─

export interface SectionLabelProps {
  children: ReactNode
  /** Right-aligned metadata (e.g. the window WxH · steps readout). */
  tail?: ReactNode
  className?: string
}

export function SectionLabel({ children, tail, className }: SectionLabelProps) {
  return (
    <div className={cn("flex items-baseline justify-between gap-2", className)}>
      <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/50">
        {children}
      </span>
      {tail != null ? (
        <span className="text-[9px] tabular-nums text-muted-foreground/40">{tail}</span>
      ) : null}
    </div>
  )
}

// ── NumberControl ───────────────────────────────────────────────────

export interface NumberControlProps {
  ariaLabel: string
  value: number | undefined
  onChange: (v: number | undefined) => void
  min?: number
  max?: number
  step?: number
  /** Placeholder when value is undefined — defaults to "inherit". */
  placeholder?: string
  /** Text alignment: right (default) or center (frame counters). */
  align?: "right" | "center"
  /** Tailwind width class for the input — default w-24. */
  width?: string
  disabled?: boolean
  /** Hover hint (passed through to the input). */
  title?: string
  /** Stable test hook (rendered as data-testid). */
  testId?: string
  /** md (default, text-[10px] px-1.5) or sm (inline mini, text-[9px] px-1
   *  — the beat-segment / keyframe frame editors). */
  size?: "md" | "sm"
}

export function NumberControl({
  ariaLabel, value, onChange, min, max, step,
  placeholder = "inherit", align = "right", width = "w-24", disabled, title, testId,
  size = "md",
}: NumberControlProps) {
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
        INPUT_CLASS,
        size === "sm" && "px-1 py-0.5 text-[9px]",
        width,
        align === "right" ? "text-right" : "text-center",
        "tabular-nums",
      )}
    />
  )
}

// ── TextControl ─────────────────────────────────────────────────────

export interface TextControlProps {
  ariaLabel: string
  value: string | undefined
  onChange: (v: string | undefined) => void
  placeholder?: string
  width?: string
  disabled?: boolean
}

export function TextControl({
  ariaLabel, value, onChange, placeholder = "inherit", width = "w-24", disabled,
}: TextControlProps) {
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
      className={cn(INPUT_CLASS, width, "text-right")}
    />
  )
}

// ── SelectControl ───────────────────────────────────────────────────

export interface ControlSelectOption {
  value: string
  label?: string
}

export interface SelectControlProps {
  ariaLabel: string
  value: string | undefined
  onChange: (v: string | undefined) => void
  options: readonly (string | ControlSelectOption)[]
  /** First option's label when value is "" — defaults to "inherit".
   *  Omit the prop entirely to have NO empty option. */
  emptyLabel?: string | false
  width?: string
  disabled?: boolean
  /** Hover hint (passed through to the select). */
  title?: string
  /** Stable test hook (rendered as data-testid). */
  testId?: string
  /** Render option text in mono (e.g. the ref-size rows). */
  mono?: boolean
}

export function SelectControl({
  ariaLabel, value, onChange, options, emptyLabel = "inherit", width = "w-full",
  disabled, title, testId, mono,
}: SelectControlProps) {
  return (
    <select
      aria-label={ariaLabel}
      disabled={disabled}
      title={title}
      data-testid={testId}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      className={cn(SELECT_CLASS, width, mono && "font-mono")}
    >
      {emptyLabel !== false ? <option value="">{emptyLabel}</option> : null}
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o } : o
        return <option key={opt.value} value={opt.value}>{opt.label ?? opt.value}</option>
      })}
    </select>
  )
}

// ── TriControl — inherit / on / off (the h3 boolean-knob pattern) ───

export interface TriControlProps {
  ariaLabel: string
  value: boolean | undefined
  onChange: (v: boolean | undefined) => void
  width?: string
  disabled?: boolean
}

export function TriControl({ ariaLabel, value, onChange, width = "w-full", disabled }: TriControlProps) {
  return (
    <select
      aria-label={ariaLabel}
      disabled={disabled}
      value={value === undefined ? "" : String(value)}
      onChange={(e) => {
        const v = e.target.value
        onChange(v === "" ? undefined : v === "true")
      }}
      className={cn(SELECT_CLASS, width)}
    >
      <option value="">inherit</option>
      <option value="true">on</option>
      <option value="false">off</option>
    </select>
  )
}

// ── SliderControl — range + value readout ───────────────────────────

export interface SliderControlProps {
  ariaLabel: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  /** Formatter for the readout — default raw number. */
  format?: (v: number) => string
  width?: string
  disabled?: boolean
}

export function SliderControl({
  ariaLabel, value, onChange, min, max, step, format, width = "w-24", disabled,
}: SliderControlProps) {
  return (
    <span className="flex items-center gap-2">
      <input
        type="range"
        aria-label={ariaLabel}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(width, "accent-brand")}
      />
      <span className="w-10 text-right font-mono text-[10px] tabular-nums text-foreground/80">
        {format ? format(value) : value}
      </span>
    </span>
  )
}

// ── CheckControl ────────────────────────────────────────────────────

export interface CheckControlProps {
  ariaLabel: string
  checked: boolean
  onChange: (v: boolean) => void
  /** h-3.5 w-3.5 (default) or h-3 w-3 for the tightest rows. */
  size?: "md" | "sm"
  disabled?: boolean
}

export function CheckControl({ ariaLabel, checked, onChange, size = "md", disabled }: CheckControlProps) {
  return (
    <input
      type="checkbox"
      aria-label={ariaLabel}
      disabled={disabled}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className={cn("shrink-0 accent-brand", size === "md" ? "h-3.5 w-3.5" : "h-3 w-3")}
    />
  )
}
