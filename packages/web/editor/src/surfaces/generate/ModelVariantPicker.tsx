// ModelVariantPicker — declarative model-family variant toggle.
//
// Renders one button per dropdown-visible sibling in the current model's
// family. Clicking a button switches to that sibling's route key. The
// active button is whichever sibling contains the current route key
// (covers quant-tier keys like "z-image-q8" — the toggle highlights
// "Turbo" because that sibling owns the q8 variant route).
//
// No model-specific logic lives here. Adding a new family with variants is
// a YAML edit only.

import { useMemo } from "react"
import { Button } from "@melite/ui/button"
import {
  activeVariantForRoute, dropdownModels, variantsForRoute,
  variantLabel, variantSiblings, familyHasVariantAxis,
} from "@melite/catalog"
import { SpecLabel } from "./assets-form-helpers"

interface Props {
  /** Current model route key (e.g. "z-image", "z-image-q8", "z-image-base"). */
  model: string
  /** Called with the new route key when the user clicks a variant button. */
  onChange: (nextRoute: string) => void
}

/**
 * Find which sibling the current route key belongs to. Direct hit first;
 * otherwise scan each sibling's variants for a route matching the current
 * model (covers quant-tier siblings like z-image-q8 — the parent "z-image"
 * sibling owns that route via its fp8/q8/q5 variant entries).
 */
function findActiveSiblingKey(currentModel: string, siblingKeys: string[]): string | undefined {
  if (siblingKeys.includes(currentModel)) return currentModel
  for (const sk of siblingKeys) {
    if (variantsForRoute(sk).some((v) => v.route === currentModel)) return sk
  }
  return undefined
}

/**
 * When the user clicks a variant sibling, choose the right route key to
 * switch to. If the current model is a quant variant of the active sibling
 * (e.g. z-image-q8), preserve the quant tier where possible
 * (z-image-q8 → click "Base" → z-image-base-q8). Otherwise switch to the
 * sibling's primary route (first variant entry with a route).
 */
function routeForSwitch(targetSiblingKey: string, currentModel: string): string {
  const targetVariants = variantsForRoute(targetSiblingKey)
  const currentQuant = activeVariantForRoute(currentModel)?.quant
  if (currentQuant) {
    const match = targetVariants.find((v) => v.quant === currentQuant && v.route)
    if (match?.route) return match.route
  }
  const first = targetVariants.find((v) => v.route)
  return first?.route ?? targetSiblingKey
}

export function ModelVariantPicker({ model, onChange }: Props) {
  const siblings = useMemo(() => {
    const visible = new Set(dropdownModels())
    return variantSiblings(model).filter((k) => visible.has(k))
  }, [model])

  // The matrix system owns the version axis when the family declares a
  // ``Variant`` group (one toggle row that composes with Quant). This
  // legacy sibling-picker would duplicate that row, so defer — one
  // system, not two (2026-08-08).
  if (siblings.length === 0 || familyHasVariantAxis(model)) return null

  const activeKey = findActiveSiblingKey(model, siblings)

  return (
    <div className="space-y-1.5">
      <SpecLabel tooltip="Variant of this model family — declared in model_catalog YAML">
        Variant
      </SpecLabel>
      <div className="flex rounded-lg border border-input/70 bg-muted/20 p-0.5">
        {siblings.map((s, idx) => {
          const isActive = activeKey === s || (activeKey === undefined && idx === 0)
          return (
            <Button
              key={s}
              type="button"
              variant="ghost"
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                isActive
                  ? "bg-brand text-foreground shadow-sm hover:bg-brand hover:text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => onChange(routeForSwitch(s, model))}>
              {variantLabel(s)}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
