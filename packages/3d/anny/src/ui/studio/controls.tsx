/**
 * Anny studio controls — local copies of the former kit form seams
 * (those kit imports are dead). Same props at every call site:
 * VerbChip rides the DSH Button atom; SelectMenu keeps its custom
 * dropdown behavior; NumberField/Checkbox are native with module
 * chrome; Tip wraps the DSH Tooltip atom.
 */
import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from "react"
import { Button, Tooltip } from "@deepseek-ai/dsh-client-ui-primitives"
import { ChevronDown, Loader2, Sparkles } from "./icons"
import { cx } from "./cx"
import styles from "./controls.module.css"

/* ── Tip ──────────────────────────────────────────────────────── */

interface TipProps {
  /** Short label shown in the bubble. Undefined renders bare. */
  tip?: string
  side?: "top" | "bottom" | "right"
  children: ReactElement
}

export function Tip({ tip, side = "top", children }: TipProps) {
  if (tip === undefined) return children
  return (
    <Tooltip label={tip} side={side} delayMs={300}>
      {children}
    </Tooltip>
  )
}

/* ── VerbChip ─────────────────────────────────────────────────── */

export interface VerbChipProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** The queue gesture (compose-first — the tenant mints the draft). */
  onClick: () => void
  /** Phase-derived label (the tenant maps queued/running → text). */
  label: string
  /** In flight: the icon swaps to the spinner. */
  busy?: boolean
  /** The glyph at rest (default Sparkles — the verb affordance). */
  icon?: ReactNode
  /** Live feedback under the chip (progress or the loud error). */
  note?: string | null
  /** The note is a failure → role=alert (screen readers hear it). */
  noteIsError?: boolean
}

export function VerbChip({
  onClick,
  label,
  busy = false,
  icon,
  note,
  noteIsError = false,
  className,
  ...rest
}: VerbChipProps): ReactElement {
  return (
    <>
      <Button
        variant="ghost"
        type="button"
        onClick={onClick}
        className={cx(styles.verbChip, className)}
        {...rest}
      >
        {busy
          ? <Loader2 className={cx(styles.verbIcon, styles.spin)} />
          : (icon ?? <Sparkles className={styles.verbIcon} />)}
        {label}
      </Button>
      {note && (
        <p
          role={noteIsError ? "alert" : "status"}
          title={note}
          className={styles.verbNote}
        >
          {note}
        </p>
      )}
    </>
  )
}

/* ── SelectMenu ───────────────────────────────────────────────── */

export interface SelectOption<T extends string> {
  value: T
  label: string
}

interface SelectMenuProps<T extends string> {
  value: T
  options: SelectOption<T>[]
  onChange: (v: T) => void
  className?: string
  buttonClassName?: string
  popoverClassName?: string
  disabled?: boolean
  "aria-label"?: string
  title?: string
}

export function SelectMenu<T extends string>({
  value,
  options,
  onChange,
  className,
  buttonClassName,
  popoverClassName,
  disabled,
  ...rest
}: SelectMenuProps<T>): ReactElement {
  const [open, setOpen] = useState(false)
  const initialHover = Math.max(0, options.findIndex((o) => o.value === value))
  const [hover, setHover] = useState<number>(initialHover)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (open) setHover(Math.max(0, options.findIndex((o) => o.value === value)))
  }, [open, value, options])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (popRef.current?.contains(t) || btnRef.current?.contains(t)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { close(); return }
      if (e.key === "ArrowDown") { e.preventDefault(); setHover((h) => Math.min(options.length - 1, h + 1)) }
      else if (e.key === "ArrowUp") { e.preventDefault(); setHover((h) => Math.max(0, h - 1)) }
      else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        const o = options[hover]
        if (o) { onChange(o.value); close() }
      }
    }
    window.addEventListener("mousedown", onDown)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("mousedown", onDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [open, hover, options, onChange, close])

  return (
    <div className={cx(styles.selectWrap, className)}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cx(styles.selectButton, buttonClassName)}
        {...rest}
      >
        <span className={styles.selectCurrent}>{current?.label ?? value}</span>
        <ChevronDown className={styles.selectChevron} />
      </button>
      {open && (
        <div
          ref={popRef}
          role="listbox"
          className={cx(styles.selectPop, popoverClassName)}
        >
          {options.map((o, i) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => { onChange(o.value); close() }}
              onMouseEnter={() => setHover(i)}
              className={cx(
                styles.selectOption,
                o.value === value ? styles.selectOptionActive : undefined,
                i === hover && o.value !== value ? styles.selectOptionHover : undefined,
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── NumberField ──────────────────────────────────────────────── */

export interface NumberFieldProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  tooltip?: string
  className?: string
}

/** The numeric knob: label + tooltip over a native number input.
 *  Same props as the former kit field; the drag-scrub sugar is
 *  gone, the write channel (parsed number on change) is not. */
export function NumberField({
  value,
  onChange,
  min,
  max,
  step,
  label,
  tooltip,
  className,
}: NumberFieldProps): ReactElement {
  const field = (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      step={step}
      aria-label={label}
      title={tooltip}
      onChange={(e) => {
        const n = Number(e.target.value)
        onChange(Number.isFinite(n) ? n : 0)
      }}
      className={styles.numberInput}
    />
  )
  if (!label) return field
  const labeled = (
    <label className={cx(styles.knobLabel, className)}>
      {label}
      {field}
    </label>
  )
  // The kit field renders label + tooltip as its FieldLabel row;
  // the knob labels in this studio already carry their own text,
  // so only wrap the bubble when a tooltip exists.
  if (!tooltip) return labeled
  return (
    <Tip tip={tooltip}>
      {labeled}
    </Tip>
  )
}

/* ── Checkbox ─────────────────────────────────────────────────── */

export function Checkbox({ className, ...props }: React.ComponentProps<"input">): ReactElement {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      className={cx(styles.checkbox, className)}
      {...props}
    />
  )
}
