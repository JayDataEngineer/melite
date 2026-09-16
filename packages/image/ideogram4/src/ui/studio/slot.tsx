/**
 * IdeoCanvasSlot — the ideogram_canvas FIELD SLOT for the flow card
 * system (ParamFields → CardDetailModal/CardStudio zoom drilldown, and
 * every DSH chat action card via the /editor/?meliteCards= embed).
 *
 * This is the resurrected IdeogramCanvasSlot adapter (deleted with
 * web/editor/src/surfaces/generate/Slots.tsx in 44cd7e3b): it bridges the
 * draft param contract (prompt = assembled caption JSON string; width/
 * height = their own params) to the full-featured IdeogramCanvasEditor
 * (this directory — canvas, inspector, style, JSON, PNG re-inflation, AI
 * layout). flattenCaption/assembleCaption live in ideoHelpers.ts.
 */
import { memo, useCallback, useMemo } from "react"
import { assembleCaption, flattenCaption } from "./ideoHelpers"
import { IdeogramCanvasEditor } from "./component"

export interface IdeoCanvasSlotProps {
  /** The field name — always "prompt" for this form, passed for symmetry. */
  name: string
  /** Current caption value (JSON string or object; may be empty). */
  value: unknown
  /** Sibling params — the canvas reads width/height for aspect ratio. */
  width: number
  height: number
  /** Commit merged param changes ({ prompt?, width?, height? }) to the draft. */
  commit(next: Record<string, unknown>): void
}

export const IdeoCanvasSlot = memo(function IdeoCanvasSlot({
  name, value, width, height, commit,
}: IdeoCanvasSlotProps) {
  // Flatten caption → editor flat values. Stable unless the caption or dims change.
  const flatValues = useMemo(
    () => flattenCaption(value, width, height),
    [value, width, height],
  )

  // Bridge editor setValues → draft commit. The seat keeps the
  // React.Dispatch signature (plain objects AND updaters), but every
  // producer seats a functional updater — never a plain object —
  // so the seat calls it directly (the plain-object alternate was
  // deleted as unreachable, 2026-09-16). Producers, all functional:
  // component writeBack / applyAspect / background field (fn
  // literals), setStyle (typed updater-fed, sole feeder StylePanel
  // seats fn literals), IdeoPanels StylePanel set + applyPreset.
  const setValues = useCallback(
    (source: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>)) => {
      const next = (source as (p: Record<string, unknown>) => Record<string, unknown>)(flatValues)
      const patch: Record<string, unknown> = {}
      // Width/height are separate form fields, not part of the caption.
      if (typeof next.width === "number" && next.width !== width) patch.width = next.width
      if (typeof next.height === "number" && next.height !== height) patch.height = next.height
      // Reassemble caption from the flat fields and emit as the wire STRING
      // (the generate_ideogram family requires a non-empty prompt; the graph
      // template crosses it resolve:json).
      patch[name] = JSON.stringify(assembleCaption(next))
      commit(patch)
    },
    [flatValues, commit, name, width, height],
  )

  return <IdeogramCanvasEditor values={flatValues} setValues={setValues} />
})
