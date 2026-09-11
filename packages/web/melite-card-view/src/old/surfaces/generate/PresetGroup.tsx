/**
 * PresetGroup / VariantGroup — the ONE button-row primitive for form-spec-
 * declared UI toggles. Renamed conceptually from "preset" to "variant" but
 * the export name is kept for import stability.
 *
 * Renders one button per variant from `spec.variants[]` (filtered to a
 * single group by the caller — the wire carries `variants` at the
 * FormSpec top level per form_wire.FormSpecRow, not under `features`).
 * When clicked, applies the variant's overrides to the form values.
 * Derives the active variant by matching current values against each
 * variant's overrides.
 *
 * The component has ZERO knowledge of what the overrides mean — it doesn't
 * know about speed modes, LoRA filenames, model names, step counts, engine
 * tiers, or quant levels. It's a pure primitive: render buttons, apply
 * patches. Both the former engine strip (quant tier toggle) and the former
 * preset block (mode toggle) flow through this same primitive.
 *
 * Override value types (handled generically):
 *   scalar → set absolutely
 *   null   → clear the key
 *   {add: "item"}    → append to comma-separated list (preserves existing)
 *   {remove: "item"} → remove from comma-separated list (preserves others)
 */

import { Tip } from "@melite/ui/tip"
import { Button } from "@melite/ui/button"

export interface Variant {
  id: string
  group?: string
  label: string
  hint?: string
  defaults: Record<string, unknown>
  route?: string
  engine?: string
  quant?: string
  vram_peak_gb?: number
  note?: string
  live?: boolean
  hides_groups?: string[]
  // THE HIERARCHY (2026-08-17): owner = the variant FOLDER that declared
  // a QUANT cell (the Quant row renders the active variant's cells).
  owner?: string
  // The row's route-scope (the closed set of routes where this variant's
  // weights exist — rows without a route of their own are auto-scoped by
  // the loader to their own cells' routes; NO GHOST MODELS).
  only_routes?: string[]
}

interface PresetGroupProps {
  variants: Variant[]
  values: Record<string, unknown>
  setValues: (fn: (prev: Record<string, unknown>) => Record<string, unknown>) => void
  label?: string
  tooltip?: string
}

/** Apply a single override to a values snapshot. */
function applyOverride(
  prev: Record<string, unknown>,
  key: string,
  override: unknown,
): Record<string, unknown> {
  // null → clear the key
  if (override === null) {
    const next = { ...prev }
    delete next[key]
    return next
  }

  // {add: "item"} / {remove: "item"} → list operation
  if (typeof override === "object" && override !== null && !Array.isArray(override)) {
    const op = override as { add?: string; remove?: string }
    const existing = String(prev[key] ?? "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)

    if (op.add) {
      if (!existing.some(item => item.includes(op.add!))) {
        existing.push(op.add)
      }
      return { ...prev, [key]: existing.join(", ") }
    }
    if (op.remove) {
      const filtered = existing.filter(item => !item.includes(op.remove!))
      const next = { ...prev }
      if (filtered.length > 0) {
        next[key] = filtered.join(", ")
      } else {
        delete next[key]
      }
      return next
    }
    return prev
  }

  // scalar → set absolutely
  return { ...prev, [key]: override }
}

/** Check if a single override matches the current value. */
function overrideMatches(
  values: Record<string, unknown>,
  key: string,
  override: unknown,
): boolean {
  if (override === null) {
    return !values[key]
  }

  if (typeof override === "object" && override !== null && !Array.isArray(override)) {
    const op = override as { add?: string; remove?: string }
    const current = String(values[key] ?? "")
    if (op.add) return current.includes(op.add)
    if (op.remove) return !current.includes(op.remove)
    return false
  }

  return String(values[key]) === String(override)
}

/** Derive the active variant ID by matching overrides against current values. */
export function deriveActiveVariant(
  variants: Variant[],
  values: Record<string, unknown>,
): string | undefined {
  // Check most-specific (most defaults) first so e.g. "fused" (3 keys)
  // wins over "standard" (2 keys) when both could partially match.
  const ranked = [...variants].sort(
    (a, b) => Object.keys(b.defaults).length - Object.keys(a.defaults).length,
  )
  for (const variant of ranked) {
    const allMatch = Object.entries(variant.defaults).every(([key, val]) =>
      overrideMatches(values, key, val),
    )
    if (allMatch) return variant.id
  }
  return undefined
}

/** Apply all defaults from a variant to the form values. */
export function applyVariantOverrides(
  prev: Record<string, unknown>,
  variant: Variant,
): Record<string, unknown> {
  let next = prev
  for (const [key, val] of Object.entries(variant.defaults)) {
    next = applyOverride(next, key, val)
  }
  return next
}

export function PresetGroup({
  variants, values, setValues, label, tooltip,
}: PresetGroupProps) {
  const activeId = deriveActiveVariant(variants, values)

  return (
    <div className="space-y-1.5">
      {label && (
        <Tip tip={tooltip}>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            {label}
          </span>
        </Tip>
      )}
      <div className="flex rounded-lg border border-input/70 bg-muted/20 p-0.5">
        {variants.map(variant => (
          <Tip key={variant.id} tip={variant.hint}>
            <Button
              type="button"
              variant="ghost"
              className={`flex-1 px-2 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                activeId === variant.id
                  ? "bg-brand text-foreground shadow-sm hover:bg-brand hover:text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setValues(prev => applyVariantOverrides(prev, variant))}>
              <span className="inline-flex items-center gap-1.5">
                {variant.label}
                {variant.vram_peak_gb != null && (
                  <span
                    data-testid="vram-peak"
                    title="Peak VRAM this variant declares"
                    className="text-[9px] tabular-nums px-1 py-px rounded bg-foreground/10 text-current/80">
                    {variant.vram_peak_gb % 1 === 0
                      ? `${variant.vram_peak_gb}G`
                      : `${variant.vram_peak_gb.toFixed(1)}G`}
                  </span>
                )}
              </span>
            </Button>
          </Tip>
        ))}
      </div>
    </div>
  )
}

