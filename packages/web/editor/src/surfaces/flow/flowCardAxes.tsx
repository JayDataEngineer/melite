// flowCardAxes.tsx — the variant-matrix axis leaf (FILE-SIZE PIVOT
// Cut 1a; moved VERBATIM from FlowCard.tsx): activeVariantId +
// relaxedDerive + VariantSelect, the per-axis dropdown machinery the
// Model zone drives. INTERNAL surface only: these names are NOT
// re-exported from the FlowCard shim — the axis machinery lives
// here, and flowAxisRows.tsx (the Model zone) imports from here.

import { routeCoordinates, axisCellExists } from "@melite/catalog"
import { deriveActiveVariant, type Variant } from "@/surfaces/generate/PresetGroup"
import { Tip } from "@melite/ui/tip"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@melite/ui/select"

/** Matrix-aware active-entry detection (2026-08-08, refined 2026-08-09 for
* dropdowns): an entry is active when its axis coordinate matches the
* current route's. A UNIQUE route match wins first (covers Quant combined
* routes like krea-2-raw). A route shared by several entries of one axis
* (wan_vace's Variant tiers all route to wan-vace) can't
* disambiguate by route alone — a plain .find would pin the dropdown on
* the first entry forever — so it falls through to coordinate matching,
* then override-matching (deriveActiveVariant). Patch entries (no route —
* qwen-img-edit-2511's Lightning/Standard LoRA) always override-match. */
export function activeVariantId(
  variants: Variant[],
  values: Record<string, unknown>,
  draftService: string,
): string | undefined {
  const cur = routeCoordinates(draftService)
  const exact = variants.filter((v) => v.route && v.route === draftService)
  if (exact.length === 1) return exact[0].id
  const activeEntry = variants.find((v) => {
    if (!v.route) return false
    if (v.group === "Quant") return v.quant !== undefined && v.quant === cur.quant
    const tv = routeCoordinates(v.route).variant
    return tv !== undefined && tv === cur.variant
    })
  return activeEntry ? activeEntry.id : deriveActiveVariant(variants, values)
}

/** Relaxed recipe derive for the AXIS CHAIN ONLY (2026-08-17): strict
 * deriveActiveVariant can't resolve a route whose cell was seeded from
 * overrides — the qwen head's int8 cell carries model/loras overrides
 * that never match a draft — so the owner fallback uses this axis-local
 * relaxation: `model` overrides always match (model is tracked by
 * draftService, never a draft field) and null overrides match unset/empty
 * (a cell that nulls loras_selected IS the "no loras" recipe). Feeds
 * ONLY the owner chain — PresetGroup's strict derive is untouched. */
export function relaxedDerive(
  variants: Variant[],
  values: Record<string, unknown>,
): string | undefined {
  const ranked = [...variants].sort(
    (a, b) => Object.keys(b.defaults).length - Object.keys(a.defaults).length,
  )
  for (const variant of ranked) {
    const allMatch = Object.entries(variant.defaults).every(([key, val]) => {
      if (key === "model") return true
      if (val === null) return values[key] == null || values[key] === ""
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        const op = val as { add?: string; remove?: string }
        const current = String(values[key] ?? "")
        if (op.add) return current.includes(op.add)
        if (op.remove) return !current.includes(op.remove)
        return false
      }
      return String(values[key]) === String(val)
    })
    if (allMatch) return variant.id
  }
  return undefined
}

/** One axis dropdown of the variant matrix — the kit Select sharing
 * the Model dropdown's component and styling (2026-08-09 policy g:
 * every canonical axis — Variant/Quant — is a dropdown on the model
 * row; no toggle rows remain). Picks the active entry via
 * activeVariantId; the matrix composes through onPick →
 * composeVariantRoute. (2026-09-06 shadcn stroke: native select →
 * @melite/ui Select — same labels, same options, same onPick.) */
export function VariantSelect({
  variants, values, draftService, label, tooltip, onPick, activeFallback, filtersOn,
}: {
  variants: Variant[]
  values: Record<string, unknown>
  draftService: string
  label: string
  tooltip?: string
  onPick: (v: Variant) => void
  // The owner-chain fallback (2026-08-17): the Variant row's active
  // entry when no route/coordinate/recipe matches — the owner of the
  // active QUANT cell (the head renders standard because int8's owner
  // IS standard).
  activeFallback?: string
  // THE CHAIN (2026-08-17): when the served declaration says this row
  // filters on ANOTHER axis (variant_groups[g].filters_on — "Quant
  // filters on Variant"), options = only cells composing with the other
  // axes' selection into a real route. A Variant row carries no
  // filters_on → the FULL folder set, NEVER the active quant's cells —
  // MODEL FILTERS VARIANT. VARIANT FILTERS QUANT. ONE direction.
  filtersOn?: string
}) {
  const activeId = activeVariantId(variants, values, draftService) ?? activeFallback
  // ONLY EXISTING COMBINATIONS (2026-08-16) — the QUANT row's filter,
  // active ONLY when the declaration chains this row onto another axis:
  // a cell is offered ONLY when it composes with the other axes'
  // current selection into a real route (axisCellExists). A quant that
  // exists elsewhere in the family but has no cell under the active
  // variant used to ride the composer's fallback — picking it silently
  // switched the sibling axis. The ACTIVE cell always stays (it IS the
  // current route — composition resolves to itself), so the select can
  // never lose its own value.
  const options = filtersOn
    ? variants.filter((v) => v.id === activeId || axisCellExists(draftService, v))
    : variants
  const value = activeId ?? options[0]?.id ?? ""
  // The popup unmounts closed, so unmounted items can't feed the
  // trigger text — resolve the label explicitly (Base UI render fn).
  const labelOf = (id: unknown) =>
    options.find((o) => o.id === id)?.label
    ?? variants.find((o) => o.id === id)?.label
    ?? String(id ?? "")
  return (
        <div className="min-w-0 flex-1">
      <Tip tip={tooltip}>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
        {label}
            </label>
      </Tip>
              <Tip tip={options.find((v) => v.id === activeId)?.hint ?? variants.find((v) => v.id === activeId)?.hint}>
              <Select
        value={value}
        onValueChange={(id) => {
          const v = options.find((x) => x.id === id)
          if (v) onPick(v)
        }}
              >
        <SelectTrigger
          aria-label={label}
          data-axis={label}
          data-value={value}
          className="w-full rounded border border-sidebar-border/60 bg-background/60 px-2 py-1 text-[11px] text-foreground outline-none focus:border-brand/60"
        >
          <SelectValue>{(v: unknown) => labelOf(v)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((variant) => (
            <SelectItem key={variant.id} value={variant.id}>
              {variant.label}
            </SelectItem>
          ))}
        </SelectContent>
              </Select>
              </Tip>
    </div>
  )
}
