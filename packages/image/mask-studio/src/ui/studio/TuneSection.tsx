// TuneSection — the rail's TUNE expander (the schema-bound knobs +
// scope mirror).
//
// Hour 15, stroke C: the numeric knobs RIDE THE SERVED SPEC now
// (/v1/form-spec?model=mask-studio — detection_threshold,
// sam_threshold, sam_dilation are declared fields). The hand-rolled
// NumberField rows and their draft absorber died: the settle law
// moved into card-base's SpecSliderAtom (the drag burst protection
// the draft existed for — one persist per release, the multi-MB
// rehash freeze stays dead). The expander and the scope chip are
// document chrome; they stay.
import { useMemo, useState, type ReactElement } from "react"
import { Button, Tooltip } from "@deepseek-ai/dsh-client-ui-primitives"
import { clsx } from "clsx"
import { ChevronDown, Focus, X } from "@melite/card-base/icons"
import { SpecFieldRow, fieldsOf, useFormSpec, type FormSpecDoc, type SpecField } from "@melite/card-base"
import styles from "./mask.module.css"
import type { MaskSource } from "./constants"

/** The tune keys, in rail order — the layout stays studio logic
 * (Shared vs Refine is a source fact, not a schema fact); the FIELDS
 * (type/min/max/step/label) come from the declaration. */
const TUNE_KEYS = ["detection_threshold", "sam_threshold", "sam_dilation"] as const

function tuneFields(spec: FormSpecDoc | null): SpecField[] {
  if (spec === null) return []
  // the fields derive off the served schema envelope (the parameter
  // audit: the flat row died — the walk is the one truth)
  const byName = new Map(fieldsOf(spec).map((f) => [f.name, f]))
  return TUNE_KEYS.flatMap((k) => {
    const f = byName.get(k)
    return f === undefined ? [] : [f]
  })
}

export function TuneSection({
  params, source, scopeLabel, hasScope, onChange, onClearScope,
}: {
  params: Record<string, unknown>
  source: MaskSource
  /** "Full image" | "Sel W×H" | "Scoped (card)" — the marquee mirror. */
  scopeLabel: string
  hasScope: boolean
  onChange: (key: string, value: unknown) => void
  onClearScope: () => void
}) {
  const isDetect = source === "person" || source === "box"
  // TUNE (2026-08-16 diet — "I want to throw up when I see that left
  // sidebar"): the numeric knobs live behind ONE expander, CLOSED by
  // default. The rail leads with what the user actually picks — source,
  // classes — not set-once thresholds. Always MOUNTED (hidden, not
  // unmounted) so the scope state stays in the DOM.
  const [tuneOpen, setTuneOpen] = useState(false)
  // The served declaration (fetch once — the spec is the card's
  // emission, stable for the session).
  // the served spec rides the shared hook; the tune subset derives
  // per render (spec door refusal — the section renders its chrome
  // empty)
  const { spec } = useFormSpec("mask-studio")
  const fields = useMemo(() => (spec === null ? [] : tuneFields(spec)), [spec])
  const byName = new Map(fields.map((f) => [f.name, f]))
  const row = (name: string): ReactElement | null => {
    const f = byName.get(name)
    if (f === undefined) return null
    return (
      <SpecFieldRow
        f={f}
        value={params[name]}
        onEdit={(key, v) => { onChange(key, v) }}
      />
    )
  }
  return (
    <section className={styles.tuneSection} data-tune-section>
      <Button variant="ghost"
        type="button" data-tune-toggle
        onClick={() => setTuneOpen((v) => !v)}
        aria-expanded={tuneOpen}
        className={styles.tuneToggle}
      >
        Tune
        <ChevronDown className={clsx(styles.sz12, !tuneOpen && styles.tuneChevClosed, styles.tuneChev)} />
      </Button>
      <div className={clsx(styles.tuneBody, !tuneOpen && styles.tuneHidden)}>
        {/* SHARED — the two knobs more than one producer reads. Threshold is
        * literally ONE param feeding YOLO and SAM3 (the brick reuses it);
        * Scope is the marquee's always-visible answer. */}
        <div>
          <div className={styles.groupHead}>
            <span className={styles.groupTitle}>
              Shared
            </span>
            <span className={styles.groupNote}>person + text</span>
          </div>
          {row("detection_threshold")}
          <Tooltip label="The marquee (R tool) scopes every producer — Person/Box crop to it, Text constrains to it. Clearing it returns to the full image." side="top">
            <div
              data-scope-chip
              className={styles.scopeChip}
            >
              <span className={styles.scopeChipLabel}>
                <Focus className={styles.sz12} /> Scope
              </span>
              <span className={styles.scopeVal}>
                <span className={styles.scopeValText}>{scopeLabel}</span>
                {hasScope && (
                  <Button variant="ghost"
                    type="button" data-clear-scope onClick={onClearScope} aria-label="Clear scope"
                    className={styles.scopeClear}
                  >
                    <X className={styles.sz12} />
                  </Button>
                )}
              </span>
            </div>
          </Tooltip>
        </div>

        {/* REFINE — Person/Box only, and only the knobs the mode actually
        * reads: Box skips SAM (no refine field — dilation grows the
        * rectangles instead), Person gets both. */}
        {isDetect && (
          <div>
            <div className={styles.refineTitle}>
              Refine
            </div>
            {source === "person" ? (
              <div className={styles.refineGrid}>
                {row("sam_threshold")}
                {row("sam_dilation")}
              </div>
            ) : (
              <div className={styles.refineStack}>
                {row("sam_dilation")}
                <p className={styles.refineNote}>
                  Box mode skips SAM refinement — switch to Person for traced masks.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
