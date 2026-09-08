// useStageRail — the THREE-STAGE rail state + writers (stage 1 BBox count
// + isolated run, stage 2 type drafts, stage 3 ADD commit).
//
// Split from component.tsx (the 2870-line monolith split): the three-stage
// block, verbatim logic. Owns bboxCount / typeDraft / promptDraft /
// stageGeom state.
import { useState } from "react"
import type { CardStage } from "@melite/contracts"
import type { StudioRefs } from "./useStudioRefs"

export type StageType = "face" | "hands" | "body" | "text" | "paint"
export type StageGeometry = "segm" | "bbox"

export interface StageRailOpts {
  stage: CardStage
  refs: StudioRefs
  onSave: (p: Record<string, unknown>) => void
  onRun?: () => void
}

export interface StageRail {
  bboxCount: number
  /** Stage 1's count write — "I CAN SELECT THE NUMBER BEFOREHAND": the
  * stepper persists max_instances THE MOMENT it moves (0 = all), so the
  * cap rides the NEXT run however it's launched (stage-1 play, ADD,
  * canvas gesture). Not an onSave on every tap of the same value. */
  setBboxCountCapped: (n: number) => void
  /** Stage 1's isolated run — detect_mode keeps the last class (YOLO
   * needs one), output_mode=bbox, exports OFF, boxes ON: the run's ONLY
   * product is the manifest. Carries the chosen count (max_instances)
   * and stays FULL-IMAGE (roi "") — the manifest is the vocabulary. */
  runBboxIsolated: () => void
  typeDraft: StageType | null
  promptDraft: string
  setPromptDraft: (v: string) => void
  stageGeom: StageGeometry
  setStageGeom: (m: StageGeometry) => void
  /** Stage 2: open a type's param section (stage 3). Re-tapping the open
  * type closes it. */
  openStageType: (t: StageType) => void
  /** STAGE 3's ADD — commit the drafted selection as a card under the
  * canvas (the flat params ARE the card; the recipe bar renders it).
  * Text commits its prompt; detect classes arm the export + primary;
  * paint arms export_paint. The stage-1 filter (if any) rides the
  * primary via instance_filter. A committed marquee SCOPES the add —
  * same normalized roi the canvas bar writes (the marquee is
  * canvas-surface; every authoring path carries it). */
  commitStageAdd: () => void
}

export function useStageRail({
  stage, refs, onSave, onRun,
}: StageRailOpts): StageRail {
  const { selectionRef, imgSizeRef, lastClassRef } = refs
  // ═══ THE THREE-STAGE RAIL (the owner's design, 2026-08-16, verbatim) ═══
  // STAGE 1 — BBox: count chosen BEFORE the run; "Find boxes" runs the
  // detect stage ISOLATED (no class exports, boxes ON). STAGE 2 — the
  // type buttons (face/hands/body/paint/text — TEXT IS A CLASS). STAGE
  // 3 — the open type's params + ADD; ADD commits the selection as a
  // card under the canvas. Optional and composable: a type works with
  // or without a stage-1 filter.
  const [bboxCount, setBboxCount] = useState(0)
  /** Stage 1's count write — "I CAN SELECT THE NUMBER BEFOREHAND": the
  * stepper persists max_instances THE MOMENT it moves (0 = all), so the
  * cap rides the NEXT run however it's launched (stage-1 play, ADD,
  * canvas gesture). Not an onSave on every tap of the same value. */
  const setBboxCountCapped = (n: number) => {
  setBboxCount(n)
  const p = stage.params
  if ((p.max_instances as number | undefined) === (n || undefined)) return
  onSave({ ...p, max_instances: n })
  }
  /** Stage 1's isolated run — detect_mode keeps the last class (YOLO
  * needs one), output_mode=bbox, exports OFF, boxes ON: the run's ONLY
  * product is the manifest. Carries the chosen count (max_instances)
  * and stays FULL-IMAGE (roi "") — the manifest is the vocabulary. */
  const runBboxIsolated = () => {
  const p = stage.params
  onSave({
  ...p,
  detect_mode: p.detect_mode === "none" ? lastClassRef.current : p.detect_mode,
  output_mode: "bbox",
  export_face: false, export_hands: false, export_body: false, export_paint: false,
  export_boxes: true,
  max_instances: bboxCount,
  roi: "",
  })
  onRun?.()
  }
  /** Stage 2: open a type's param section (stage 3). Re-tapping the open
  * type closes it. */
  const [typeDraft, setTypeDraft] = useState<
   "face" | "hands" | "body" | "text" | "paint" | null
  >(null)
  const [promptDraft, setPromptDraft] = useState("")
  const [stageGeom, setStageGeom] = useState<"segm" | "bbox">(
   (stage.params.output_mode as string) === "bbox" ? "bbox" : "segm",
  )
  const openStageType = (t: "face" | "hands" | "body" | "text" | "paint") => {
  setTypeDraft((cur) => (cur === t ? null : t))
  }
  /** STAGE 3's ADD — commit the drafted selection as a card under the
  * canvas (the flat params ARE the card; the recipe bar renders it).
  * Text commits its prompt; detect classes arm the export + primary;
  * paint arms export_paint. The stage-1 filter (if any) rides the
  * primary via instance_filter. A committed marquee SCOPES the add —
  * same normalized roi the canvas bar writes (the marquee is
  * canvas-surface; every authoring path carries it). */
  const commitStageAdd = () => {
  if (!typeDraft) return
  const p = stage.params
  const sel = selectionRef.current
  const { w: cw, h: ch } = imgSizeRef.current
  const roi = sel && cw > 0 && ch > 0
  ? [
  Number((sel.x / cw).toFixed(4)),
  Number((sel.y / ch).toFixed(4)),
  Number((sel.w / cw).toFixed(4)),
  Number((sel.h / ch).toFixed(4)),
  ]
  : (Array.isArray(p.roi) && p.roi.length === 4 ? p.roi : "")
  if (typeDraft === "text") {
  const trimmed = promptDraft.trim()
  if (!trimmed) return
  onSave({ ...p, sam3_prompt: trimmed, roi })
  } else if (typeDraft === "paint") {
  onSave({ ...p, export_paint: true, roi })
  } else {
  const exKey = `export_${typeDraft}` as "export_face" | "export_hands" | "export_body"
  onSave({
  ...p,
  [exKey]: true,
  detect_mode: typeDraft,
  output_mode: stageGeom,
  roi,
  })
  }
  setTypeDraft(null)
  }

  return {
  bboxCount, setBboxCountCapped, runBboxIsolated,
  typeDraft, promptDraft, setPromptDraft, stageGeom, setStageGeom,
  openStageType, commitStageAdd,
  }
}
