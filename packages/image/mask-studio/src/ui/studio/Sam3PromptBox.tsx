// Sam3PromptBox — the Text (SAM3) prompt box. Pure move from
// component.tsx (props shape unchanged).
import { useEffect, useState } from "react"
import { Input, Tooltip } from "@deepseek-ai/dsh-client-ui-primitives"
import { clsx } from "clsx"
import { Loader2, Sparkles } from "./icons"
import { VerbChip } from "./VerbChip"
import styles from "./mask.module.css"

/** The Text (SAM3) prompt box. Rendered when Text is the SOURCE — or when
 * a non-empty sam3_prompt is RIDING ALONG beside a Person/Box run (the
 * brick runs both; the box says so and stays editable). The prompt is a
 * LOCAL DRAFT until Segment — same one-gesture contract as Segm/Bbox
 * (per-keystroke writes would re-hash paint_mask through _recomputeKeys
 * on every letter; the run persists ONCE). */
export function Sam3PromptBox({
  params, onSegment, hasInput, detecting, rideAlong,
}: {
  params: Record<string, unknown>
  onSegment: (prompt: string) => void
  hasInput: boolean
  detecting: boolean
  /** True when Text is NOT the source but a prompt is set — the header
  * says "also running" and the box never steals focus. */
  rideAlong: boolean
}) {
  const [draft, setDraft] = useState((params.sam3_prompt as string) ?? "")
  // Re-sync from the card when the prompt changes externally (revive, an
  // agent write) — but not on every render.
  useEffect(() => {
  setDraft((params.sam3_prompt as string) ?? "")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.sam3_prompt])
  const canRun = hasInput && draft.trim().length > 0
  return (
  <section className={styles.sam3Section}>
  <div className={styles.sam3Head}>
  <span className={styles.sam3Title}>
  <Sparkles className={clsx(styles.sz12, styles.violetInk)} /> Text mask
  {rideAlong && (
  <span className={styles.rideAlong}>
  also running
  </span>
  )}
  </span>
  {detecting && <Loader2 className={clsx(styles.sz12, styles.accentInk, styles.spin)} />}
  </div>
  <Input
  type="text" data-sam3-input
  value={draft}
  onChange={(e) => setDraft(e.target.value)}
  onKeyDown={(e) => { if (e.key === "Enter" && canRun) onSegment(draft) }}
  placeholder="What to mask — e.g. shirt, jeans, hat"
  disabled={!hasInput}
  // Focus the box the moment Text becomes the source (empty draft) —
  // the picker click is the intent to type. A ride-along box (Text not
  // the source, prompt already set) never steals focus.
  autoFocus={!rideAlong && draft === ""}
  className={styles.promptInput}
  />
  <Tooltip label={!hasInput
  ? "Add an image first"
  : draft.trim() ? "Segment by text prompt (scoped to the selection when one is committed)" : "Type what to mask"} side="top">
  {/* ONE VERB UX (stroke 5): the Segment gesture rides the shared
   * VerbChip (wide violet shape, the ride-along tone); the prompt
   * box keeps its draft + Enter wiring — the chip owns bones only. */}
  <VerbChip
  wide tone="violet"
  data-sam3-run
  onClick={() => canRun && onSegment(draft)}
  disabled={!canRun}
  label="Segment"
  />
  </Tooltip>
  <p className={styles.sam3Note}>
  Open-vocabulary segmentation — exports as its own mask (and as the
  Combined mask when Person/Box are off).
  </p>
  </section>
  )
}
