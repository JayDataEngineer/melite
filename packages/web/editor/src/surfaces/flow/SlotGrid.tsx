// SlotGrid — the flow's wiring-aware slot squares (2026-08-08).
//
// The ONE slot surface in the card detail: one square per declared slot
// (stageSlots(params) — INPUT_SLOTS ∩ params, in vocabulary order),
// replacing the old frozen-URL "stage" picker and the read-only wiring
// list. The squares are the shared SlotSquare shell (surfaces/shared —
// the same square the modifier sub-card system migrates onto later).
//
// A slot is either WIRED (live reference to an earlier card, index-ordered)
// or MANUALLY attached (file / asset) — never both. Both write paths land
// on the store contract from Phase A:
// • wire → onWireSlot(slot, upstreamId) (setSlotInput — pads inputs,
// marks stale, recomputes cache keys) + params[slot] → null
// • attach → onSaveParams({[slot]: url}) (updateStageParams merge) +
// onWireSlot(slot, null) (unwire)
// • clear → both with null
//
// The wire picker lists PRIOR stages by ARRAY INDEX (F4 — the old id-order
// proxy was invalid: ids are random). No-result stages are listed too —
// that's the point: wire BEFORE the upstream has run ("not run yet").
import { useEffect, useState } from "react"
import { Link2 } from "lucide-react"
import type { CardStage } from "@melite/contracts"
import { SlotSquare } from "@melite/ui"
import { WirePickerModal } from "@melite/ui"
import { stageSlots, uploadToEstate, estateInputUrl } from "@melite/catalog"
import { formOf } from "@melite/catalog"
import { useToastStore } from "@melite/ui"
import { Tip } from "@melite/ui/tip"
import { Button } from "@melite/ui/button"

export interface SlotGridProps {
 stage: CardStage
 /** ALL stages of the enclosing run, in array order — the wire picker
 * restricts to indices BEFORE this stage (F4). */
 upstreams: CardStage[]
 /** Persist a params patch (the card's onEditSave → updateStageParams). */
 onSaveParams: (params: Record<string, unknown>) => void
 /** Wire/unwire a slot (the store's setSlotInput). outputName selects a
 * NAMED output from the upstream (mask, …); null/omitted = primary.
 * Omit → display-only. */
 onWireSlot?: (slotKey: string, upstreamId: string | null, outputName?: string | null) => void
}

export function SlotGrid({ stage, upstreams, onSaveParams, onWireSlot }: SlotGridProps) {
 const toast = useToastStore((s) => s.addToast)
 const slots = stageSlots(stage.params, formOf(stage.service), stage.service)
 // One open picker at a time: {slot, index}.
 const [picker, setPicker] = useState<{ slot: string; index: number } | null>(null)

 // Close the wire picker on Escape — basic a11y.
 useEffect(() => {
 if (!picker) return
 const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPicker(null) }
 window.addEventListener("keydown", onKey)
 return () => window.removeEventListener("keydown", onKey)
 }, [picker])

 // THE UPLOAD RAIL previews (2026-09-06): object URLs for freshly
 // uploaded files — declared BEFORE the early return (hooks law).
 const [previews, setPreviews] = useState<Record<string, string>>({})
 useEffect(() => () => {
  for (const u of Object.values(previews)) URL.revokeObjectURL(u)
 }, [previews])

 if (slots.length === 0) return null

 const stageIdx = upstreams.findIndex((s) => s.id === stage.id)
 // Prior stages by ARRAY INDEX — the wire can only point backwards
 // (preserves _recomputeKeys' topological pass).
 const priorStages = upstreams
 .map((u, i) => ({ u, i }))
 .filter(({ u, i }) => u.id !== stage.id && i < stageIdx)
 .map(({ u }) => u)

 // THE UPLOAD RAIL (2026-09-06): a picked/dropped File goes through
 // POST /v1/uploads and the ESTATE PATH lands in the bag — never a
 // data: URL (the compose door refuses data: refs; the bytes must
 // live on the estate before any run registers). Local preview via
 // object URL so the operator still SEES their image immediately.
 async function handleFile(file: File, slot: string) {
  try {
   const path = await uploadToEstate(file)
   const preview = URL.createObjectURL(file)
   setPreviews((p) => {
    if (p[slot]) URL.revokeObjectURL(p[slot])
    return { ...p, [slot]: preview }
   })
   onSaveParams({ [slot]: path })
   onWireSlot?.(slot, null, null) // manual attach unwires (null outputName)
   toast("success", `Uploaded ${file.name}`)
  } catch (e) {
   toast("error", (e as Error).message)
  }
 }

 return (
 <div data-slot-grid>
 <div className="flex flex-wrap gap-3">
 {slots.map((slot, i) => {
 const wiredId = stage.inputs[i]
 const upstream = wiredId ? upstreams.find((u) => u.id === wiredId) : undefined
 const attached =
 typeof stage.params[slot] === "string" && stage.params[slot]
 ? (stage.params[slot] as string)
 : null
 const wired = !!upstream
 // The attached value previews when a browser tag can load it:
 // fresh object URL > wired upstream artifact > the estate input
 // door (data/input paths map through estateInputUrl — the
 // drilled-out card keeps its image preview after reload). A
 // mount path falls back to the raw text display.
 const attachedPreview = attached ? estateInputUrl(attached) : null
 const thumb = previews[slot] ?? upstream?.result?.assetUrls[0] ?? attachedPreview ?? attached

 return (
 <SlotSquare
 key={slot}
 label={slot}
 value={thumb}
 // Wired state: the upstream title (live) — or "not run yet"
 // when the upstream hasn't produced an artifact yet.
 badge={wired ? upstream!.title : undefined}
 metric={wired && !upstream!.result ? "not run yet" : undefined}
 onClick={onWireSlot ? () => setPicker({ slot, index: i }) : undefined}
 onPickFile={onWireSlot !== undefined || onSaveParams ? (f) => void handleFile(f, slot) : undefined}
 onDropFile={onWireSlot !== undefined || onSaveParams ? (f) => void handleFile(f, slot) : undefined}
 onDropAsset={onWireSlot !== undefined || onSaveParams ? (url) => { onSaveParams({ [slot]: url }); onWireSlot?.(slot, null, null) } : undefined}
 onClear={
 wired || attached
 ? () => { onSaveParams({ [slot]: null }); onWireSlot?.(slot, null, null) }
 : undefined
 }
 actions={
 onWireSlot ? (
 <Tip tip={`Wire ${slot} from an earlier card`}>
 <Button
 type="button"
 variant="ghost"
 size="icon-xs"
 onClick={(e) => { e.stopPropagation(); setPicker({ slot, index: i }) }}
 aria-label={`Wire ${slot} from an earlier card`}
 data-slot-wire
 className="h-5 w-5 rounded bg-background/90 text-brand hover:text-brand/80"
 >
 <Link2 className="h-3 w-3" />
 </Button>
 </Tip>
 ) : undefined
 }
 />
 )
 })}
 </div>

 {picker && onWireSlot && (
 <WirePickerModal
 slot={picker.slot}
 priorStages={priorStages}
 currentId={stage.inputs[picker.index]}
 currentOutput={stage.inputOutputs?.[picker.index] ?? null}
 onPick={(upstreamId, outputName) => {
 // Wire writes BOTH sides of the mutual-exclusion contract:
 // inputs[i] = id + params[slot] cleared (the falsy injection
 // guard reads params — a leftover value would shadow the wire).
 // outputName carries the selected named output (mask, …) when
 // the upstream is multi-output; null = primary (assetUrls[0]).
 onWireSlot(picker.slot, upstreamId, outputName ?? null)
 onSaveParams({ [picker.slot]: null })
 setPicker(null)
 }}
 onUnwire={() => {
 onWireSlot(picker.slot, null, null)
 onSaveParams({ [picker.slot]: null })
 setPicker(null)
 }}
 onClose={() => setPicker(null)}
 />
 )}
 </div>
 )
}
