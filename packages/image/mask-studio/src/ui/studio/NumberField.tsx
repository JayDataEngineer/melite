// NumberField — local native port of the shared kit/NumberField.
//
// DSH ships no number atom (DSH's own number fields are bare native
// inputs — that IS the DSH pattern). Props API is unchanged (value,
// onChange, min, max, step, label, tooltip, className, onCommit) so
// callers move verbatim: onChange carries the live numeric value,
// onCommit fires ONCE per finished interaction (Enter / blur) with the
// final value — the persistence hook the tune draft relies on.
import { useCallback, useState } from "react"
import { Tooltip } from "@deepseek-ai/dsh-client-ui-primitives"
import { clsx } from "clsx"
import styles from "./mask.module.css"

export interface NumberFieldProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  tooltip?: string
  className?: string
  /** Fires ONCE when an interaction ENDS (Enter / blur) with the final
   * value — the persistence hook. */
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
  const [text, setText] = useState<string | null>(null)

  const clamp = useCallback(
    (v: number): number => {
      if (typeof min === "number" && v < min) return min
      if (typeof max === "number" && v > max) return max
      return v
    },
    [min, max],
  )

  // While focused the raw keystrokes stay local (typing "0." must not
  // collapse to 0 mid-word); blur/Enter parses + clamps + persists.
  const shown = text ?? (Number.isFinite(value) ? String(value) : "")
  const commit = useCallback(() => {
    if (text === null) return
    setText(null)
    const n = Number(text)
    if (text !== "" && Number.isFinite(n)) {
      const v = clamp(n)
      onChange(v)
      onCommit?.(v)
    }
  }, [text, onChange, onCommit, clamp])

  const labelNode = label ? <span className={styles.nfLabelText}>{label}</span> : null
  return (
    <label className={clsx(styles.nfWrap, className)}>
      {labelNode && (
        <span className={styles.nfLabelRow}>
          {tooltip ? (
            <Tooltip label={tooltip} side="top">
              {labelNode}
            </Tooltip>
          ) : (
            labelNode
          )}
        </span>
      )}
      <span className={styles.nfBox} data-numberfield="">
        <input
          type="number"
          className={styles.nfInput}
          value={shown}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (e.target.value !== "" && Number.isFinite(n)) {
              onChange(clamp(n))
              setText(null)
            } else {
              setText(e.target.value)
            }
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              ;(e.target as HTMLInputElement).blur()
            } else if (e.key === "Escape") {
              e.preventDefault()
              setText(null)
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          onFocus={(e) => {
            setText(e.target.value)
          }}
        />
      </span>
    </label>
  )
}
