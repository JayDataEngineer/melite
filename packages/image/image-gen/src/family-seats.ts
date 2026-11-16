// family-seats.ts — the plugin law's family seat (L3 cure,
// 2026-11-16, card-without-family audit): THE CARD EXISTS WITHOUT
// ITS FAMILIES. This module is the card's ONLY bridge to the
// family packages, and it holds ZERO static imports — each family
// resolves through a guarded dynamic import, primed once at
// registration (fire-and-forget) and read synchronously by the
// card's post-boot seats (craft normalize, compose bindings, the
// tool face's semantic knob).
//
// THE DEGRADE LAW (per family, never per card): a missing family
// package costs ITS OWN seat — the card still registers, the knob
// serves the present families, compose refuses loud naming the
// absent family at the model seat. A family module that exists
// but exports no DECL id is skipped named; a present family's
// craft face (anima's promptTags restore) is picked up generically.
import { semanticModelEntries } from '@melite/comfyui-card-kit/semanticModelKnob'
import type { SemanticModelEntry } from '@melite/comfyui-card-kit/semanticModelKnob'
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract'

/** The boarded family modules, by package — ids live in card.ts's
 *  BOARDED literal (the family-coverage wall judges the binding on
 *  the dev tree; a typo'd id reds it there). */
const FAMILY_MODULES = [
  '@melite/models-krea-2',
  '@melite/models-z-image',
  '@melite/models-anima',
  '@melite/models-qwen-img-21',
  '@melite/models-flux-klein',
  '@melite/models-moss-image',
  '@melite/models-h3-image',
] as const

/** One family's runtime seat: its DECL plus any craft face the
 *  family package exports (today only anima ships a promptTags
 *  restorer; the pattern is the seat any future craft face rides). */
export type FamilySeat = {
  decl: ModelDecl
  restorePromptTags?: (text: string) => { text: string; fixed: string[] }
}

type FamilyModule = {
  DECL?: ModelDecl
  normalizeAnimaPromptTags?: (text: string) => { text: string; fixed: string[] }
}

const seats = new Map<string, FamilySeat>()
let priming: Promise<void> | null = null

/** Prime every family seat (idempotent; absent packages degrade to
 *  their own absence — the card never dies for a family). Fired
 *  fire-and-forget at registration; the post-boot seats read the
 *  filled table synchronously. */
export const primeFamilySeats = (): Promise<void> => {
  priming ??= Promise.allSettled(FAMILY_MODULES.map((spec) => import(spec)))
    .then((results) => {
      for (const result of results) {
        if (result.status !== 'fulfilled') continue
        const mod = result.value as FamilyModule
        const decl = mod?.DECL
        if (decl?.id === undefined || typeof decl.id !== 'string') continue
        seats.set(decl.id, {
          decl,
          restorePromptTags: typeof mod.normalizeAnimaPromptTags === 'function'
            ? mod.normalizeAnimaPromptTags
            : undefined,
        })
      }
    })
  return priming
}

/** A family's seat — undefined when the package is absent (the
 *  compose door's own loud refusal names the family there). */
export const seatOf = (id: string): FamilySeat | undefined => seats.get(id)

/** The semantic model knob's entries — derived from the PRESENT
 *  families only (a missing family costs its entries, never the
 *  knob; an all-absent estate serves an empty enum and the tool
 *  default falls to BOARDED[0]). */
export const semanticModels = (): readonly SemanticModelEntry[] =>
  semanticModelEntries([...seats.values()].map((seat) => seat.decl))
