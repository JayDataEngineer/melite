// VerbChip — local native port of the shared kit/verbChip (ONE verb UX).
//
// DSH ships no verb atom: native <button> + the package's own CSS
// module. Props API unchanged (onClick, label, busy, icon, tone,
// wide, note, noteIsError, className + native button passthrough)
// and the DOM bones are the same (chip + optional note line). The
// component forwards ref + hover/focus handlers so it stays a valid
// DSH Tooltip anchor (React 19 ref-as-prop).
import type { ButtonHTMLAttributes, ReactElement, ReactNode, Ref } from "react"
import { clsx } from "clsx"
import { Loader2, Sparkles } from "./icons"
import styles from "./mask.module.css"

export interface VerbChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** The queue gesture (compose-first — the tenant mints the draft). */
  onClick: () => void
  /** Phase-derived label (the tenant maps queued/running → text). */
  label: string
  /** In flight: the icon swaps to the spinner. */
  busy?: boolean
  /** The glyph at rest (default Sparkles — the verb affordance). */
  icon?: ReactNode
  /** Accent: brand (default) or violet (the ride-along SAM3 tone). */
  tone?: "brand" | "violet"
  /** Full-width centered shape (the prompt-box run). */
  wide?: boolean
  /** Live feedback under the chip (progress or the loud error). */
  note?: string | null
  /** The note is a failure → role=alert (screen readers hear it). */
  noteIsError?: boolean
  ref?: Ref<HTMLButtonElement>
}

export function VerbChip({
  onClick,
  label,
  busy = false,
  icon,
  tone = "brand",
  wide = false,
  note,
  noteIsError = false,
  className,
  type,
  ref,
  ...rest
}: VerbChipProps): ReactElement {
  const chip = (
    <button
      ref={ref}
      type={type ?? "button"}
      onClick={onClick}
      className={clsx(
        styles.verb,
        !wide && tone === "brand" && styles.verbBrand,
        !wide && tone === "violet" && styles.verbViolet,
        wide && styles.verbWide,
        className,
      )}
      {...rest}
    >
      {busy ? <Loader2 className={styles.sz12} /> : (icon ?? <Sparkles className={styles.sz12} />)}
      {label}
    </button>
  )
  // No note → the bare chip (a single element, so the chip stays a
  // valid DSH Tooltip anchor).
  if (!note) return chip
  return (
    <>
      {chip}
      <p role={noteIsError ? "alert" : "status"} title={note} className={styles.verbNote}>
        {note}
      </p>
    </>
  )
}
