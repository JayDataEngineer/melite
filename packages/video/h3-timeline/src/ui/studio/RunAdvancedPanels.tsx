/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx.
 *
 * THE LAYER A/B LAW REWORK (2026-09-17): the advanced knob rows ride
 * the SHARED SpecPanel (the estate's parameter system) at their WIRE
 * names (no h3_ spelling, no attention gate — the sla_* keys ride
 * unconditionally); the lora surface is the MOD PLANE
 * (ModifiersSection over the spec's features.modifiers). The hand-
 * rolled vocabulary (Speed LoRA knob pair, RTX VSR multiplier/
 * quality, Output CRF) is GONE: no node ever read them.
 */
import { SpecPanel, ModifiersSection, useFormSpec } from "@melite/card-base"
import s from "./studio.module.css"
import type { LayerA, SetLayerAKey } from "./docModel"

/** Layer A rail: SLA lab (unconditional) + Loras (mod plane) +
 * Post-processing leaves. The served doc is fetched ONCE and shared
 * with ModLane (SpecPanel skips its own fetch when handed the doc)
 * so the door is never hit twice. */
export function RunAdvancedPanels({
  layerA, setLayerAKey,
}: {
  layerA: LayerA
  setLayerAKey: SetLayerAKey
}) {
  // THE SERVED SPEC — fetched once, owned here; the estate's SpecPanel
  // and ModLane both read it.
  const { spec, error } = useFormSpec("h3-timeline")
  const values = layerA as unknown as Record<string, unknown>
  const onEdit = setLayerAKey as unknown as (n: string, v: unknown) => void
  return (
    <>
      <SpecPanel
        model="h3-timeline"
        spec={spec}
        error={error}
        values={values}
        onEdit={onEdit}
        sections={[
          {
            // SLA rides EVERY layer A — compose reads the sla_* keys
            // unconditionally (the old attention dropdown gate was
            // fiction). sla_min_seq_len is undeclared on the card →
            // SpecPanel renders no ghost row.
            title: "SLA — block-sparse attention",
            testid: "tl-sla-panel",
            rows: [
              { name: "sla_sparsity" }, { name: "sla_block_size" },
              { name: "sla_min_seq_len" },
              { name: "sla_dense_last_steps" }, { name: "sla_dense_steps" },
              { name: "sla_dense_backend" }, { name: "sla_reference_protection" },
              { name: "sla_protect_audio" }, { name: "sla_stabilize_motion" },
              { name: "sla_disable_fp16_accum" },
            ],
          },
          {
            title: "Post-processing",
            testid: "tl-post-panel",
            // PLAIN WIRE NAMES — the leaves' visibility rides the
            // DECLARATION's own visible_when grammar ("key=value"
            // guards, &-ANDed, |-SET values); the card schema owns
            // the leaf law, this file owns only the seat order.
            rows: [
              { name: "sharpen_enabled" },
              { name: "sharpen_method" },
              { name: "sharpen_strength" },
              { name: "sharpen_radius" },
              { name: "sharpen_threshold" },
              { name: "sharpen_iterations" },
              { name: "interpolate_enabled" },
              { name: "interp_model" },
              { name: "interp_multiplier" },
              { name: "sr_switch" },
              { name: "sr_resolution" },
            ],
          },
        ]}
      />
      {/* The loras MOD BAG — the estate's ModifiersSection over the
       * served mod plane (features.modifiers); options = the family's
       * flavor catalog; entries {id, strength} serialize as
       * params.loras. The hand-rolled Speed LoRA knob pair died: it
       * never matched the card's read and never fired. */}
      <ModLane spec={spec} layerA={layerA} setLayerAKey={setLayerAKey} />
    </>
  )
}

/** The mod lane (loras). Ridden only when the door serves
 * features.modifiers — otherwise the estate renders nothing
 * (ModifiersSection's no-kinds arm). Reads the SAME doc the panel
 * above fetched, so the door is hit once. */
function ModLane({ spec, layerA, setLayerAKey }: {
  spec: ReturnType<typeof useFormSpec>["spec"]
  layerA: LayerA
  setLayerAKey: SetLayerAKey
}) {
  const kinds = spec?.features?.modifiers ?? []
  if (kinds.length === 0) return null
  return (
    <div className={s.group} data-testid="tl-mods-panel">
      <div className={s.groupTitle}>Loras — speed adapters</div>
      <ModifiersSection
        kinds={kinds}
        values={{ loras: layerA.loras ?? [] } as unknown as Record<string, unknown>}
        onEdit={(k, v) => setLayerAKey(k as keyof LayerA, v as LayerA[keyof LayerA])}
      />
    </div>
  )
}
