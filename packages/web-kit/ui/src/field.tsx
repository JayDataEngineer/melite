// field.tsx — the ONE parameter-field grammar (operator order,
// 2026-09-06: "THESE ARE DIFFERTN CSS FORMATS. YOU ARE HANDROLLING AND
// NOT REUSING [REDACTED 2026-11-05] WHY" … "THE WORDS AND THE MAGINS.. DIFFERENT!").
//
// Every param surface — the numbers grid, selects, chips, free text,
// textareas, booleans, JSON docs, and NumberField's own label — renders
// its label through <FieldLabel/> and its control box with
// FIELD_CONTROL (+ append-only extras like "leading-relaxed"). A new
// widget takes these tokens; it never authors its own label/control
// classes. That is what makes Width, Sampler, and Prompt read as ONE
// form: same words, same margins, same box.
//
// MARGIN LAW (2026-09-06, "Why is the SPACING DIFFERENT between the
// WORDS and the INPUT PART"): the label→control gap has exactly ONE
// owner — the FieldLabel ROW (mb-1). FIELD_LABEL is pure text style
// (no margin token): the span never carries its own margin, so no
// structure can double-stack 4px+4px. NumberField renders FieldLabel
// too — same row, same single margin, no special case.
import type { ReactElement, ReactNode } from "react"
import { Tip } from "./tip"

/** The label WORD style — pure text, NO margin (the row owns spacing). */
export const FIELD_LABEL =
 "block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70"

/** The control box under every label. Inputs, selects, textareas.
 * `block` is load-bearing (2026-09-06: "Why is the SPACING DIFFERENT
 * between the WORDS and the INPUT PART"): a native <select> renders
 * inline-block and its baseline strut adds ~3px above the box — the
 * label→control gap must come from the FieldLabel row's mb-1 alone,
 * never from inline layout quirks. */
export const FIELD_CONTROL =
 "block w-full rounded border border-sidebar-border/60 bg-background/60 px-1.5 py-0.5 text-[11px] text-foreground outline-none focus:border-brand/60"

/** Label row — ONE component, ONE class, ONE margin (the mb-1 here is
 * the ONLY label→control spacing in the whole form). `tooltip` (the
 * spec's field tooltip) wraps the label in the shared Tip; `right`
 * rides the same baseline (the Enhance buttons), keeping the label
 * line's height identical whether or not a button is present. */
export function FieldLabel({
 label,
 tooltip,
 right,
}: {
 label: ReactNode
 tooltip?: string | null
 right?: ReactElement
}): ReactElement {
 const text = (
 <span className={FIELD_LABEL}>{label}</span>
 )
 return (
 <div className="mb-1 flex items-center justify-between gap-2">
 {tooltip ? <Tip tip={tooltip}>{text}</Tip> : text}
 {right}
 </div>
 )
}
