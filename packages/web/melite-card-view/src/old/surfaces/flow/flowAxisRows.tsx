// flowAxisRows.tsx — the Model + variant-axes row of the form card
// (FILE-SIZE PIVOT Cut 1b; moved VERBATIM from FlowCard.tsx). The
// axis derivation is a module-level PURE FUNCTION (deriveAxisState) and
// the row is a pure props component — never a hook (the pose_studio
// mega-hook anti-pattern is forbidden). THE ONE matrix composition
// path: route-switching variants resolve through composeVariantRoute
// (onModelChange), patch-only variants layer onto the draft
// (onApplyDraft).

import { Fragment } from "react"
import { composeVariantRoute } from "@melite/catalog"
import { evalVisibleWhen, type FormSpec } from "@melite/contracts"
import { applyVariantOverrides, type Variant } from "@/surfaces/generate/PresetGroup"
import { activeVariantId, relaxedDerive, VariantSelect } from "./flowCardAxes"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@melite/ui/select"

export function deriveAxisState(
  spec: FormSpec | null,
  draft: Record<string, unknown>,
  draftService: string,
) {
  // ── Variant toggle data + handler ──
  // Wire note: /v1/form-spec emits `variants` at the TOP level of the
  // FormSpec body (the form_wire.FormSpecRow SSOT), NOT under `features`.
  // `variant_groups` does live under features. The previous read
  // (specFeatures?.variants) consulted the wrong object — `specFeatures`
  // is `spec.features`, which carries `variant_groups` but never
  // `variants` — and the Variant/Quant tabs silently rendered as zero
  // rows for every card. (2026-09-05 "variants and quants are not
  // showing up".)
  const variants = (spec?.variants ?? []) as Variant[]
  const variantGroups = spec?.features?.variant_groups ?? {}
  // THE HIERARCHY (2026-08-17): MODEL FILTERS VARIANT. VARIANT FILTERS
  // QUANT. The Variant row is the model's variant FOLDER set. The Quant
  // row is the ACTIVE VARIANT's cells: the routed entries its variant
  // FILE declares (owner). The retired patch-base merge (quant_bases)
  // died with the ghost-cells: every option is a routed cell with its
  // own artifact, and only-existing-combinations (axisCellExists) keeps
  // cross-tier picks out of the dropdowns.
  const variantRows = variants.filter((v) => (v.group ?? "") === "Variant")
  const quantRows = variants.filter((v) => (v.group ?? "") === "Quant")
  const groupsInOrder = Array.from(
    new Set(variants.map((v) => v.group ?? "").filter(Boolean)),
  )
  // as a dropdown on the model row — the SERVED declaration's key order
  // (variant_groups dict order IS the chain order: the pydantic contract
  // enforces Model → Variant → Quant and form_spec emits the groups in
  // chain order, each carrying its resolved filters_on). No frontend
  // copy of the vocabulary — the chain is DECLARED, and there is no
  // non-select axis to keep a toggle row for.
  const dropdownGroups = Object.keys(variantGroups).filter((g) =>
    groupsInOrder.includes(g),
  )
  // RECIPE-ABOVE-MODEL (operator order, 2026-09-06): every non-chain
  // axis (Recipe today — the grammar ships it on EVERY family) renders
  // on its own rail ABOVE the Model row, never as a column beside it.
  // The chain (Variant/Quant) stays on the Model grid row. Generic
  // over group names: anything outside the chain is a recipe-class
  // axis and rides the upper rail in served declaration order.
  const CHAIN = new Set(["Variant", "Quant"])
  const recipeGroups = dropdownGroups.filter((g) => !CHAIN.has(g))
  const chainGroups = dropdownGroups.filter((g) => CHAIN.has(g))
  // The ACTIVE QUANT cell — exact route/coordinate match, else the
  // relaxed recipe derive (axis-chain-only arithmetic: `model` overrides
  // always match — model is tracked by draftService, never a draft field
  // — and null overrides match unset/empty, so the head's int8 cell
  // (loras_selected: null) IS the "no loras" recipe).
  const activeQuantId =
    activeVariantId(quantRows, draft, draftService) ?? relaxedDerive(quantRows, draft)
  // The ACTIVE VARIANT — exact/coordinate/derive over the folder rows,
  // else the OWNER of the active quant cell (every quant cell is
  // declared by exactly one variant file — the head renders standard
  // because int8's owner IS standard).
  const activeVariantRow =
    activeVariantId(variantRows, draft, draftService) ??
    quantRows.find((e) => e.id === activeQuantId)?.owner
  // The Quant row's options: the active variant's routed cells (owner).
  // Unknown active variant (no owner data) → the served set, unchanged.
  const quantOptions = (() => {
    const act = activeVariantRow
    if (!act) return quantRows
    return quantRows.filter((e) => e.owner === act)
  })()
  return { variants, variantGroups, variantRows, quantRows, groupsInOrder, dropdownGroups, recipeGroups, chainGroups, activeQuantId, activeVariantRow, quantOptions }
}

export function AxisRows({
  modelOpts,
  modelHeads,
  modelListError,
  draftService,
  draft,
  spec,
  specVw,
  specDefaults,
  onModelChange,
  onApplyDraft,
}: {
  modelOpts: { key: string; label: string }[]
  modelHeads: Record<string, string>
  modelListError: string | null
  draftService: string
  draft: Record<string, unknown>
  spec: FormSpec | null
  specVw: Record<string, string | null>
  specDefaults: Record<string, unknown>
  onModelChange: (service: string) => void
  onApplyDraft: (rest: Record<string, unknown>) => void
}) {
  const { variants, variantGroups, quantRows, chainGroups, recipeGroups, activeVariantRow, quantOptions } =
    deriveAxisState(spec, draft, draftService)
  // THE ONE matrix composition path (2026-08-08): a route-switching
  // variant (any axis — Variant/Quant) is resolved through
  // composeVariantRoute so the OTHER axes are preserved (Turbo+Q8 →
  // click Raw → Raw+Q8, never Raw+FP8). The composed route replaces
  // draftService and re-seeds that cell's defaults. Patch-only variants
  // (Lightning/Standard LoRA, no `route`) layer onto the
  // draft; `model` is tracked by draftService, never a draft field, so
  // it's stripped to avoid leaking into stage.params.
  const handleVariantPick = (variant: Variant) => {
    if (variant.route) {
      const next = composeVariantRoute(draftService, variant)
      if (next !== draftService) {
        onModelChange(next)
        return
      }
    } else if (
      variant.only_routes &&
      !variant.only_routes.includes(draftService)
    ) {
      // The variant is scoped AWAY from the active route — the row still
      // renders (it is the model's folder set) but this variant's
      // weights do not exist here. Route-switch to the variant's PRIMARY
      // cell — its first routed quant (lightning4 under Lightning) —
      // instead of layering an incoherent patch in place. Already on the
      // primary → no-op (the row displays the variant via the owner
      // chain).
      const primary = quantRows.find((e) => e.owner === variant.id && e.route)?.route
      if (primary && primary !== draftService) {
        onModelChange(primary)
        return
      }
      if (primary === draftService) return
    }
    const patched = applyVariantOverrides(draft, variant)
    const { model: _drop, ...rest } = patched
    void _drop
    // Seed fields that BECAME visible after the variant override.
    // Without this, instruct stays absent when switching from CustomVoice
    // to VoiceDesign on the Speech card — it was skipped at init time
    // (visible_when failed) and patch-only variants don't trigger a
    // form-spec reload (only route-switching variants do).
    for (const [fname, cond] of Object.entries(specVw)) {
      if (!cond || fname in rest) continue
      if (!evalVisibleWhen(cond, rest)) continue
      const dv = specDefaults[fname]
      rest[fname] = dv !== undefined ? dv : ""
    }
    onApplyDraft(rest)
}
  // One axis dropdown per served group — shared by the recipe rail
  // (above) and the chain row (Model grid). The Quant row = the ACTIVE
  // variant's cells (owner-scoped — 2026-08-17). EVERY OTHER group
  // renders ITS OWN rows: the Variant row = the model's variant FOLDER
  // set; a Recipe row = the family's patch-only recipes (2026-09-05 —
  // this was hard-wired to variantRows, so any non-Quant group would
  // have wrongly shown the Variant folder set instead of its own).
  const renderAxisSelect = (g: string) => {
    const groupVariants = (
      g === "Quant"
        ? quantOptions
        : variants.filter((v) => (v.group ?? "") === g)
    ).filter((v) => v.live !== false)
    if (groupVariants.length === 0) return null
    const meta = variantGroups[g]
    return (
      <VariantSelect
        key={g}
        variants={groupVariants}
        values={draft}
        draftService={draftService}
        label={meta?.label ?? g}
        tooltip={meta?.tooltip}
        activeFallback={g === "Variant" ? activeVariantRow : undefined}
        filtersOn={meta?.filters_on}
        onPick={handleVariantPick}
      />
    )
  }
  return (
    <>
      {/* ── Recipe rail — non-chain axes (Recipe) ABOVE the Model row
           (operator order, 2026-09-06). Full-width row of the same
           VariantSelect primitive the chain row uses — one component,
           one styling, two rails. ── */}
      {recipeGroups.length > 0 && (
        <div key="recipe-rail" className="grid items-start gap-2"
          style={{ gridTemplateColumns: `repeat(${recipeGroups.length}, minmax(0,1fr))` }}>
          {recipeGroups.map(renderAxisSelect)}
        </div>
      )}
      {/* ── Model zone — the catalog-tree row (4-zone anatomy §4). The
           content IS the tree: family select (model.yaml label) + one
           dropdown per CHAIN axis (Variant/Quant) — nothing hard-coded,
           all driven by specFeatures.
           Skip-empty: no selection to make (single self-option, no
           axes) and no error → no Model zone. ── */}
      {(modelOpts.length > 1 || chainGroups.length > 0 || modelListError) && (
        // Keyed static child (React 19 warning-keys): this fragment sits
        // in the outer fragment's child list next to the KEYED flow
        // blocks — a mixed keyed/unkeyed array is flagged. Same for the
        // Parameters header below.
        <Fragment key="model-zone">
      {/* ── Model + variant axes — ONE row of selects (2026-08-09
           policy g: every canonical axis — Variant/Quant — is a
           dropdown sharing the Model select's component and styling; no
           toggle rows remain). Switching any axis still composes through
           composeVariantRoute so the other axes are preserved (Turbo+Q8 →
           Raw+Q8, never Raw+INT8); each select shows its current matrix
           coordinate, so the old "Active:" readout is gone. ── */}
      {/* ONE GRID ROW (2026-08-16 alignment fix): every column — Model,
          Variant, Quant — carries its label ABOVE its select inside the
          SAME grid cell, so all labels share one baseline and all
          selects the row below (the old layout floated the Model label
          on its own full-width line — the misaligned two-row readout).
          Model takes the wider share (folder names are long). */}
      <div
        className="grid items-start gap-2"
        style={{
          gridTemplateColumns:
            `minmax(0,1.6fr) repeat(${chainGroups.length}, minmax(0,1fr))`,
        }}
      >
        <div className="min-w-0">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            Model
          </label>
          <Select
            // DISPLAY VALUE = the tree head when the live service is an
            // axis cell (the model row IS a directory — a revived card
            // on qwen-img-edit-2511-int8 shows the folder qwen-img-edit-
            // 2511; the quant row carries the cell).
            value={
              modelOpts.some((m) => m.key === draftService)
                ? draftService
                : modelHeads[draftService] ?? draftService
            }
            onValueChange={(v) => onModelChange(v)}
          >
            <SelectTrigger
              aria-label="Model"
              data-axis="Model"
              data-value={
                modelOpts.some((m) => m.key === draftService)
                  ? draftService
                  : modelHeads[draftService] ?? draftService
              }
              className="w-full rounded border border-sidebar-border/60 bg-background/60 px-2 py-1 text-[11px] text-foreground outline-none focus:border-brand/60"
            >
              <SelectValue>
                {(v: unknown) => modelOpts.find((m) => m.key === v)?.label ?? String(v ?? "")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {modelOpts.map((m) => (
                <SelectItem key={m.key} value={m.key}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {chainGroups.map(renderAxisSelect)}
    </div>
        </Fragment>
      )}
    </>
  )
}
