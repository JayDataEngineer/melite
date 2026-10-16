/**
 * useFamilyReseatHeal — the family-reseat heal (D8, 2026-11-06).
 *
 * THE LIVE BRICK: a film legally stamped sr_switch (Final Cut on a
 * multi-call doc) lost a call, derived t4r, and EVERY compose
 * refused "h3_window(t4r): unsanctioned inject keys: sr_switch"
 * while the rail kept serving the dead switches — a family edit
 * left the card uncomposable ("physically impossible" by the
 * operator's own reading, and he was right: no knob WRITE happened
 * between the last green compose and the first red one; the FAMILY
 * moved under a legal stamp).
 *
 * THE LAW: the t4r lane wires NO post chain (the renderer's own
 * truth — the graph goes straight to CreateVideo), so the walk
 * refuses the twelve T4_ONLY knobs on a doc that derived t4r.
 * When the shown doc derives t4r, any T4_ONLY key the layer still
 * carries is recipe/switch residue on a lane that cannot honor it
 * — ONE write unstated them (serializeLayerA omits each key and
 * its delete ride nulls a base-carried stamp, so the next compose
 * reads the doc clean). The rail's omitFields gate keeps NEW
 * writes off the dead lane; this heal clears the stranded ones.
 * Inert-value tolerant: false/""/null ride absent from the
 * serializer already — unstating them would be churn, not cure.
 */
import { useEffect } from "react"
import { T4_ONLY_KEYS, deriveWindowFamily } from "@melite/models-h3/timelineContract"
import { mergeDocLayers } from "./docModel.ts"
import type { LayerA } from "./docModel.ts"

/**
 * @param base the stage's settled params (calls/keyframes/ref
 *  surface live here — the same seats the walk reads; null is the
 *  spine's absent-params spelling, owned HERE never at a caller)
 * @param layerA the shown Layer A (the T4 residue's home)
 * @param updateLayerA the whole-layer setter (useShownDoc's verb —
 *  the heal's ONE write rides the same commit seam as every edit)
 */
export function useFamilyReseatHeal(
  base: Record<string, unknown> | null | undefined,
  layerA: LayerA,
  updateLayerA: (u: (prev: LayerA) => LayerA) => void,
): void {
  useEffect(() => {
    if (deriveWindowFamily(mergeDocLayers(base, layerA as unknown as Record<string, unknown>)) !== "t4r") return
    const residue = T4_ONLY_KEYS.filter((k) => {
      const v = (layerA as unknown as Record<string, unknown>)[k]
      return v !== undefined && v !== null && v !== false && v !== ""
    })
    if (residue.length === 0) return
    updateLayerA((prev) => {
      const next = { ...(prev as unknown as Record<string, unknown>) }
      for (const k of residue) next[k] = undefined
      return next as unknown as LayerA
    })
  }, [base, layerA, updateLayerA])
}
