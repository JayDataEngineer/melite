/**
 * form-fields — DSH-pure replacements for the kit form primitives
 * the action_cards viewers used (kit NumberField, scrub-input,
 * label, tabs, collapsible, scroll-area, tip).
 *
 * Mapping (kit → DSH):
 *   Tip         → the DSH Tooltip atom (same {tip, shortcut, side,
 *                 delayDuration, className, withArrow, children} API;
 *                 shortcut appends to the label — the DSH bubble is
 *                 text-only; side 'left' falls back to 'right', the
 *                 one side DSH has no counterpart for; className /
 *                 withArrow are accepted-but-ignored, no call site
 *                 in this package sets them).
 *   Label       → native <label> passthrough (same data-slot).
 *   ScrubInput  → native <input type="range"> (the kit WAS a native
 *                 range input owning the invisibility contract — this
 *                 keeps that contract byte-identically: same type,
 *                 same data-slot, same aria-hidden={false}).
 *   NumberField → the full scrub + type-exact + range-fill widget,
 *                 ported logic-byte-identical onto the native input
 *                 (the drag gesture IS load-bearing here — SliderRow
 *                 lives on it — so the pointer-capture math rides
 *                 along verbatim).
 *   Tabs / TabsContent → minimal controlled tabs (the kit's Base-UI
 *                 root/panel with value/onValueChange; inactive panes
 *                 stay mounted but hidden, as before).
 *   Collapsible / Trigger / Content → open/onOpenChange state lift
 *                 (the kit's Base-UI root/trigger/panel; the trigger
 *                 is a <button>, the panel unmounts when closed).
 *   ScrollArea  → native overflow viewport (same className/style
 *                 passthrough onto the root).
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import type { ReactElement, ReactNode } from "react"
import { Tooltip } from "@deepseek-ai/dsh-client-ui-primitives"
import type { TooltipSide } from "@deepseek-ai/dsh-client-ui-primitives"
import styles from "./form-fields.module.css"

// ── Tip ─────────────────────────────────────────────────────────

type TipSide = "top" | "bottom" | "left" | "right"

interface TipProps {
  tip?: string
  shortcut?: string
  side?: TipSide
  delayDuration?: number
  className?: string
  withArrow?: boolean
  children: ReactElement<any>
}

const toTooltipSide = (side: TipSide): TooltipSide =>
  side === "left" ? "right" : side

export function Tip({
  tip,
  shortcut,
  side = "top",
  delayDuration = 300,
  className: _className,
  withArrow: _withArrow,
  children,
}: TipProps) {
  if (tip === undefined) return children
  const label = shortcut ? `${tip} (${shortcut})` : tip
  return (
    <Tooltip label={label} side={toTooltipSide(side)} delayMs={delayDuration}>
      {children}
    </Tooltip>
  )
}

// ── Label ───────────────────────────────────────────────────────

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={className}
      {...props}
    />
  )
}

// ── ScrubInput ──────────────────────────────────────────────────

export function ScrubInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      type="range"
      data-slot="scrub-input"
      aria-hidden={false}
      className={className ? `${styles.scrub} ${className}` : styles.scrub}
    />
  )
}

// ── NumberField ─────────────────────────────────────────────────

export interface NumberFieldProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  tooltip?: string
  className?: string
  /** Fires ONCE when an interaction ENDS (drag release / edit commit) with
   * the final value — the persistence hook. */
  onCommit?: (v: number) => void
}

export function NumberField({
  value,
  onChange,
  min,
  max,
  step,
  label,
  tooltip,
  className,
  onCommit,
}: NumberFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState("")

  const hasRange =
    typeof min === "number" && typeof max === "number" && min < max
  const resolvedStep =
    typeof step === "number" && step > 0
      ? step
      : hasRange
        ? (max! - min!) / 100
        : 1
  const decimals = resolvedStep < 1
    ? Math.max(0, -Math.floor(Math.log10(resolvedStep)))
    : 0

  const clamp = useCallback(
    (v: number): number => {
      if (typeof min === "number" && v < min) return min
      if (typeof max === "number" && v > max) return max
      return v
    },
    [min, max],
  )

  // ── Scrub (horizontal drag) ────────────────────────────────────
  const dragState = useRef<{ startX: number; startVal: number; moved: boolean } | null>(null)

  const pxDeltaToValue = useCallback(
    (dx: number, shift: boolean): number => {
      const sensitivity = hasRange
        ? Math.max(resolvedStep, (max! - min!) / 200)
        : resolvedStep
      return dx * sensitivity * (shift ? 0.1 : 1)
    },
    [hasRange, resolvedStep, min, max],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (editing) return
      if (e.button !== 0) return
      dragState.current = {
        startX: e.clientX,
        startVal: Number.isFinite(value) ? value : 0,
        moved: false,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [editing, value],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const st = dragState.current
      if (!st) return
      const dx = e.clientX - st.startX
      if (Math.abs(dx) > 3) st.moved = true
      if (!st.moved) return
      const raw = st.startVal + pxDeltaToValue(dx, e.shiftKey)
      const snapped = Math.round(raw / resolvedStep) * resolvedStep
      onChange(clamp(Number(snapped.toFixed(decimals))))
    },
    [pxDeltaToValue, resolvedStep, decimals, onChange, clamp],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const st = dragState.current
      dragState.current = null
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // pointer already released — safe to ignore
      }
      if (!st) return
      if (!st.moved) {
        setEditing(true)
        return
      }
      onCommit?.(Number.isFinite(value) ? value : 0)
    },
    [onCommit, value],
  )

  // ── Edit (type exact) ──────────────────────────────────────────
  useEffect(() => {
    if (!editing) return
    setText(Number.isFinite(value) ? String(value) : "")
    const el = inputRef.current
    if (el) {
      el.focus()
      el.select()
    }
  }, [editing, value])

  const commitEdit = useCallback(() => {
    setEditing(false)
    const n = Number(text)
    if (text !== "" && Number.isFinite(n)) {
      const v = clamp(Number(n.toFixed(decimals)))
      onChange(v)
      onCommit?.(v)
    }
  }, [text, onChange, onCommit, clamp, decimals])

  const cancelEdit = useCallback(() => {
    setEditing(false)
  }, [])

  // ── Range fill ─────────────────────────────────────────────────
  const fillPct =
    hasRange && Number.isFinite(value)
      ? ((clamp(value) - min!) / (max! - min!)) * 100
      : 0

  const displayValue = Number.isFinite(value) ? String(value) : ""

  return (
    <label className={className ? `${styles.numberField} ${className}` : styles.numberField}>
      {label && (
        <Tip tip={tooltip || label}>
          <span className={styles.fieldLabel}>{label}</span>
        </Tip>
      )}
      <div
        data-numberfield=""
        className={editing ? `${styles.numberBox} ${styles.numberBoxEditing}` : styles.numberBox}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {hasRange && (
          <div
            data-numberfield-fill=""
            className={styles.numberFill}
            style={{ width: `${Math.max(0, Math.min(100, fillPct))}%` }}
          />
        )}
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={editing ? text : displayValue}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              commitEdit()
            } else if (e.key === "Escape") {
              e.preventDefault()
              cancelEdit()
            }
          }}
          style={{ pointerEvents: editing ? "auto" : "none" }}
          className={styles.numberInput}
        />
      </div>
    </label>
  )
}

// ── Tabs ────────────────────────────────────────────────────────

interface TabsContextValue {
  value: string
  onValueChange: (v: string) => void
}

const TabsContext = createContext<TabsContextValue>({ value: "", onValueChange: () => {} })

export function Tabs({
  value,
  onValueChange,
  className,
  children,
}: {
  value: string
  onValueChange: (v: string) => void
  className?: string
  children?: ReactNode
}) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div data-slot="tabs" className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string
  className?: string
  children?: ReactNode
}) {
  const ctx = useContext(TabsContext)
  const active = ctx.value === value
  return (
    <div
      data-slot="tabs-content"
      data-state={active ? "active" : "inactive"}
      className={className ? `${styles.tabsContent} ${className}` : styles.tabsContent}
    >
      {children}
    </div>
  )
}

// ── Collapsible ─────────────────────────────────────────────────

interface CollapsibleState {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CollapsibleContext = createContext<CollapsibleState>({ open: false, onOpenChange: () => {} })

export function Collapsible({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
}) {
  const isOpen = !!open
  return (
    <CollapsibleContext.Provider value={{ open: isOpen, onOpenChange: onOpenChange ?? (() => {}) }}>
      <div data-slot="collapsible" data-state={isOpen ? "open" : "closed"}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  )
}

export function CollapsibleTrigger({
  className,
  onClick,
  children,
  ...props
}: React.ComponentProps<"button">) {
  const ctx = useContext(CollapsibleContext)
  return (
    <button
      type="button"
      data-slot="collapsible-trigger"
      aria-expanded={ctx.open}
      className={className}
      onClick={(e) => {
        onClick?.(e)
        if (!e.defaultPrevented) ctx.onOpenChange(!ctx.open)
      }}
      {...props}
    >
      {children}
    </button>
  )
}

export function CollapsibleContent({
  className,
  children,
}: {
  className?: string
  children?: ReactNode
}) {
  const ctx = useContext(CollapsibleContext)
  // Unmounted when closed (the kit Base-UI panel default). Slider
  // values live in the parent's state, so no state is lost.
  if (!ctx.open) return null
  return (
    <div data-slot="collapsible-content" data-state="open" className={className}>
      {children}
    </div>
  )
}

// ── ScrollArea ──────────────────────────────────────────────────

export function ScrollArea({
  className,
  style,
  children,
}: {
  className?: string
  style?: React.CSSProperties
  children?: ReactNode
}) {
  return (
    <div
      data-slot="scroll-area"
      className={className ? `${styles.scrollRoot} ${className}` : styles.scrollRoot}
      style={style}
    >
      <div data-slot="scroll-area-viewport" className={styles.scrollViewport}>
        {children}
      </div>
    </div>
  )
}
