// flowCardJsonField.tsx — the JSON document param widget (FILE-SIZE
// PIVOT Cut 1c-0; moved VERBATIM from FlowCard.tsx): JsonParamField
// renders a pretty-printed textarea for params whose VALUE is an
// object/array (Timeline beats/keyframes, wan-vace keyframes, image_ops
// bags) and commits the PARSED value on every valid keystroke. Moved
// ahead of the planned Cut-2 slot because flowParamFields.tsx (Cut
// 1c) needs it and the shim-cycle rule forbids a sibling importing from
// the FlowCard shim.

import { useEffect, useState } from "react"
import { FieldLabel, FIELD_CONTROL } from "@melite/ui/field"
import { Textarea } from "@melite/ui/textarea"

/** JSON document field — a param whose VALUE is an object/array (the
 * Timeline card's beats/keyframes documents, wan-vace keyframes, image_ops
 * bags…). Renders a pretty-printed textarea and commits the PARSED value on
 * every valid keystroke; while the text is mid-edit/invalid the draft keeps
 * the last VALID value and the border turns destructive — an invalid
 * document can never silently serialize into a run body (and never stores a
 * string for a list param, which the frontend contract gate would reject).
 * External value changes (preset fills, variant reseeds) re-adopt when they
 * don't match the current text's parse, so the cursor survives own edits. */
export function JsonParamField({ label, tooltip, value, onChange }: {
  label: string
  tooltip?: string
  value: unknown
  onChange: (v: unknown) => void
}) {
  const initial = () =>
    typeof value === "string" ? value : JSON.stringify(value ?? [], null, 2)
  const [text, setText] = useState(initial)
  const [err, setErr] = useState<string | null>(null)
  const jsonEq = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b)
  // Re-sync on EXTERNAL value changes: when the incoming value no longer
  // equals what the current text parses to (or the text doesn't parse),
  // adopt the incoming pretty-print. Own edits parse to the same value and
  // leave the text (and cursor) untouched.
  useEffect(() => {
    if (typeof value === "string") {
      if (text !== value) { setText(value); setErr(null) }
      return
    }
    try {
      if (!jsonEq(JSON.parse(text), value)) {
        setText(JSON.stringify(value ?? [], null, 2)); setErr(null)
      } else if (err) setErr(null)
    } catch {
      setText(JSON.stringify(value ?? [], null, 2)); setErr(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  const handleChange = (t: string) => {
    setText(t)
    if (!t.trim()) { setErr("empty — last valid value kept"); return }
    try {
      onChange(JSON.parse(t)); setErr(null)
    } catch {
      setErr("invalid JSON — last valid value kept")
    }
  }
  return (
    <label className="block">
      <FieldLabel
        label={tooltip ? (
          <abbr title={tooltip} className="no-underline">
            {label}
          </abbr>
        ) : (
          label
        )}
        right={
          <span className={`text-[10px] ${err ? "text-destructive" : "text-muted-foreground/50"}`}>
            {err ?? "JSON"}
          </span>
        }
      />
      <Textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        rows={6}
        spellCheck={false}
        aria-label={label}
        className={`${FIELD_CONTROL} font-mono leading-relaxed resize-y ${
          err ? "!border-destructive/70 focus:!border-destructive" : ""
        }`}
      />
    </label>
  )
}
