// TuneSection — the rail's TUNE expander (numeric knobs + scope mirror).
//
// Extracted from MaskSourceControls (the 2870-line monolith split) so the
// rail file stays under ~400 lines. The extraction is behavior-neutral:
// tuneOpen + the numeric draft + its resync effect moved WITH the JSX that
// reads them (the section is always mounted, never keyed — state lifetime
// is identical to when it lived in the parent).
import { useEffect, useState } from "react"
import { Button, Tooltip } from "@deepseek-ai/dsh-client-ui-primitives"
import { clsx } from "clsx"
import { ChevronDown, Focus, X } from "./icons"
import { NumberField } from "./NumberField"
import styles from "./mask.module.css"
import type { MaskSource } from "./constants"

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
  // Local draft for the numeric scrub params. Dragging a NumberField fires
  // onChange on every pointer step — if that wrote straight to the card,
  // updateStageParams → _recomputeKeys would hash paint_mask (a multi-MB
  // data URL) 60×/sec and freeze the editor (the "stuck on detect" lag,
  // 2026-08-10). The draft absorbs the burst; onCommit (drag release /
  // Enter) is the ONE persist. Source/class taps are click, not scrub —
  // they write immediately (one recompute per click is fine).
  const [draft, setDraft] = useState({
  detection_threshold: (params.detection_threshold as number) ?? 0.35,
  sam_threshold: (params.sam_threshold as number) ?? 0.93,
  sam_dilation: (params.sam_dilation as number) ?? 0,
  })
  // Re-sync from the card when the params change externally (agent write,
  // revive, a different card opened) — but NOT on every render, only when
  // the backing value actually moves.
  useEffect(() => {
  setDraft({
  detection_threshold: (params.detection_threshold as number) ?? 0.35,
  sam_threshold: (params.sam_threshold as number) ?? 0.93,
  sam_dilation: (params.sam_dilation as number) ?? 0,
  })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.detection_threshold, params.sam_threshold, params.sam_dilation])
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
  <NumberField label="Threshold" tooltip="Detection confidence — YOLO (Person/Box) and SAM3 (Text)"
  value={draft.detection_threshold}
  onChange={(v) => setDraft((d) => ({ ...d, detection_threshold: v }))}
  onCommit={(v) => onChange("detection_threshold", v)}
  min={0.05} max={0.95} step={0.05} />
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
  <NumberField label="SAM refine" tooltip="SAM mask refinement threshold — tighter masks"
  value={draft.sam_threshold}
  onChange={(v) => setDraft((d) => ({ ...d, sam_threshold: v }))}
  onCommit={(v) => onChange("sam_threshold", v)}
  min={0.5} max={0.99} step={0.01} />
  <NumberField label="Dilation" tooltip="Dilate the mask by N px"
  value={draft.sam_dilation}
  onChange={(v) => setDraft((d) => ({ ...d, sam_dilation: v }))}
  onCommit={(v) => onChange("sam_dilation", v)}
  min={0} max={50} step={1} />
  </div>
  ) : (
  <div className={styles.refineStack}>
  <NumberField label="Dilation" tooltip="Grow each rectangle by N px"
  value={draft.sam_dilation}
  onChange={(v) => setDraft((d) => ({ ...d, sam_dilation: v }))}
  onCommit={(v) => onChange("sam_dilation", v)}
  min={0} max={50} step={1} />
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
