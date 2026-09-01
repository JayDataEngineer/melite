/**
 * NumberField — the ONE numeric parameter control (2026-08-10).
 *
 * Unifies the two conflicting interfaces ParamEditor used to carry:
 * • the bare <input type="number"> (compact, type-only, no drag)
 * • the full-width <input type="range"> slider (drag-only, no exact entry,
 * ate a whole row when it should have been a grid cell)
 *
 * One widget, three interactions, always grid-cell compact:
 * 1. DRAG the value horizontally → scrubs ±delta (cursor: ew-resize).
 * Shift = fine (0.1×). Snaps to `step`. A bounded range (min/max)
 * crosses its full span in ~200px of travel; an unbounded field uses
 * 1px-per-step so seed/steps move at integer speed.
 * 2. CLICK the value (no drag) → edit-in-place → type exact → Enter/blur
 * commits, Esc cancels. This is the precision path the slider lacked.
 * 3. RANGE FILL — when min/max are known, a thin tinted bar fills behind
 * the number to show position in the range (the slider's one real
 * visual benefit, without its real-estate cost).
 *
 * The schema drives everything: min/max/step from `specFields` feed the
 * drag sensitivity, the snap, the fill, and the display precision. Fields
 * with no declared bounds (seed, batch_size) just drag at integer/step
 * speed with no fill bar.
 *
 * Pro-tool lineage: Blender / Figma / Houdini / Resolve numeric fields all
 * work this way. One mental model, compact, drag + type + position.
 */
import { useCallback, useRef, useState, useEffect } from "react"
import { cn } from "./utils"
import { Tip } from "./tip"

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
 * the final value — the persistence hook. Use this for store writes so
 * a drag doesn't fire onChange (and any expensive recompute it triggers)
 * on every pointer step. When omitted, the field is onChange-only (the
 * draft pattern PipelineCard's ParamGrid uses). */
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

 // ── Scrub (horizontal drag) ────────────────────────────────────────
 // The container owns the pointer while NOT editing. A 3px travel
 // distinguishes drag from click (same threshold as the card's DnD
 // sensor). On a clean click (no travel), we flip to edit mode and focus
 // the input; the input then owns interaction until blur.
 const dragState = useRef<{ startX: number; startVal: number; moved: boolean } | null>(null)

 // Drag sensitivity: bounded ranges cross their full span in ~200px;
 // unbounded fields use 1px-per-step. Shift = 0.1× (fine).
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
 if (editing) return // input owns it — let text selection happen
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
 // Clean click → enter edit mode (focus + select happens in the
 // editing useEffect below).
 setEditing(true)
 return
 }
 // Drag ended — persist the final value. `value` is the latest prop
 // (onChange during the move already updated the parent's state and
 // React flushed before this pointer-up event landed).
 onCommit?.(Number.isFinite(value) ? value : 0)
 },
 [onCommit, value],
 )

 // ── Edit (type exact) ──────────────────────────────────────────────
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

 // ── Range fill (the slider's one visual gift, minus its real estate) ──
 const fillPct =
 hasRange && Number.isFinite(value)
 ? ((clamp(value) - min!) / (max! - min!)) * 100
 : 0

 const displayValue = Number.isFinite(value) ? String(value) : ""

 return (
 <label className={cn("flex flex-col gap-0.5", className)}>
 {label && (
 <Tip tip={tooltip || label}>
 <span
 className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground/60"
 >
 {label}
 </span>
 </Tip>
 )}
 <div
 data-numberfield=""
 className={cn(
 "relative flex items-center rounded border border-sidebar-border/60 bg-background/60 transition-colors",
 // ew-resize advertises the drag affordance; flips to text when
 // the input is actively editing.
 editing ? "cursor-text border-brand/60" : "cursor-ew-resize select-none",
 "focus-within:border-brand/60 hover:border-brand/40",
 )}
 onPointerDown={onPointerDown}
 onPointerMove={onPointerMove}
 onPointerUp={onPointerUp}
 >
 {hasRange && (
 <div
 data-numberfield-fill=""
 className="pointer-events-none absolute inset-y-0 left-0 rounded-l bg-brand/15"
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
 // pointer-events off unless editing — the container owns the
 // scrub. This is what lets a click (no drag) flip to edit mode
 // instead of the input swallowing the focus on mousedown.
 style={{ pointerEvents: editing ? "auto" : "none" }}
 className="relative w-full bg-transparent px-1.5 py-0.5 text-[11px] tabular-nums text-foreground outline-none"
 />
 </div>
 </label>
 )
}
