// family-seats.ts — the plugin law's family seats (L3 cure,
// 2026-11-16, card-without-family audit): THE CARD EXISTS WITHOUT
// ITS FAMILIES. This module is the card's ONLY bridge to the family
// packages, and it holds ZERO static imports — each family resolves
// through a guarded dynamic import, primed once at registration
// (fire-and-forget) and read synchronously by the card's compose
// seats (the two mode lanes' declared action dispatch).
//
// THE DEGRADE LAW (per family, never per card): a missing family
// package costs ITS OWN seat — the card still registers, and the
// lane whose family is absent refuses loud naming it (card.ts's
// compose). A family module that exists but exports no DECL id is
// skipped named.
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract'

/** The families behind the rig card's two mode lanes, by package —
 *  ids live in card.ts's lane literals (the family-coverage wall
 *  judges the binding on the dev tree; a typo'd id reds it there). */
const FAMILY_MODULES = [
  '@melite/models-transfer-rig',
  '@melite/models-gem-soma',
] as const

/** One family's runtime seat: its DECL. (Both families ship no
 *  craft face — the seat carries whatever the family exports; today
 *  only the DECL is consumed.) */
export type FamilySeat = {
  decl: ModelDecl
}

type FamilyModule = {
  DECL?: ModelDecl
}

const seats = new Map<string, FamilySeat>()
let priming: Promise<void> | null = null

/** Prime every family seat (idempotent; absent packages degrade to
 *  their own absence — the card never dies for a family). Fired
 *  fire-and-forget at registration; the compose seats read the
 *  filled table synchronously. */
export const primeFamilySeats = (): Promise<void> => {
  priming ??= Promise.allSettled(FAMILY_MODULES.map((spec) => import(spec)))
    .then((results) => {
      for (const result of results) {
        if (result.status !== 'fulfilled') continue
        const mod = result.value as FamilyModule
        const decl = mod?.DECL
        if (decl?.id === undefined || typeof decl.id !== 'string') continue
        seats.set(decl.id, { decl })
      }
    })
  return priming
}

/** A family's seat — undefined when the package is absent (the lane
 *  door's own loud refusal names the family there). */
export const seatOf = (id: string): FamilySeat | undefined => seats.get(id)
