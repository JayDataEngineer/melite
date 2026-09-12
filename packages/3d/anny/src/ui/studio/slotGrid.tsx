// SlotGrid — the wiring-aware slot squares.
//
// The ONE slot surface in the card rail: one square per declared slot
// (stageSlots(params) — INPUT_SLOTS ∩ params, in vocabulary order).
// The squares are anny's own SlotSquare shell — the same square every
// slot-shaped surface renders.
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
//
// (Founded 2026-09-12, anny gap-1 translation: 1:1 behavior port of the
// dead editor SlotGrid onto native seams — anny SlotSquare, the
// mask-parity WirePickerModal, live @melite/catalog, card-base
// toast/icons, DSH atoms. The banned @melite/ui shell is gone; the
// wire-button geometry rides a local token class because the atoms
// Button has no icon-xs size.)
import { useEffect, useState } from "react"
import type { CardStage } from "@melite/contracts"
import { Button } from "@deepseek-ai/dsh-client-ui-primitives"
import { Link2 } from "@melite/card-base/icons"
import { useToastStore } from "@melite/card-base/toast"
import { Tip } from "./controls"
import { SlotSquare } from "./slot"
import { WirePickerModal } from "./WirePickerModal"
import { stageSlots, uploadToEstate, estateInputUrl, formOf } from "@melite/catalog"
import styles from "./slotGrid.module.css"

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

  // THE UPLOAD RAIL previews: object URLs for freshly
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

  // THE UPLOAD RAIL: a picked/dropped File goes through
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
      <div className={styles.grid}>
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
              // File attach rides param-saving (onSaveParams is required —
              // display-only still edits params, only wiring is gated on
              // onWireSlot), so these handlers are unconditional (2026-09-12).
              onPickFile={(f) => void handleFile(f, slot)}
              onDropFile={(f) => void handleFile(f, slot)}
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
                      onClick={(e) => { e.stopPropagation(); setPicker({ slot, index: i }) }}
                      aria-label={`Wire ${slot} from an earlier card`}
                      data-slot-wire
                      className={styles.wireBtn}
                    >
                      <Link2 className={styles.wireIcon} />
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
