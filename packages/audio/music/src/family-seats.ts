// family-seats.ts — the plugin law's family seat (the L3 cure,
// audio trio, 2026-11-16): THE CARD EXISTS WITHOUT ITS FAMILIES.
// This module is the card's ONLY bridge to the family packages, and
// it holds ZERO static imports — each family resolves through a
// guarded dynamic import, primed once at registration
// (fire-and-forget) and read synchronously by the card's post-boot
// seats (the compose dispatch, the tool face's boarded knob).
//
// THE DEGRADE LAW (per family, never per card): a missing family
// package costs ITS OWN seat — the card still registers, the tool
// knob serves the present families, compose refuses loud naming the
// absent family at the dispatch. A family module that exists but
// exports no DECL id is skipped named.
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract'

/** The boarded family modules, by package — ids live in card.ts's
 *  BOARDED literal (the family-coverage wall judges the binding on
 *  the dev tree; a typo'd id reds it there). */
const FAMILY_MODULES = [
  '@melite/models-music3',
  '@melite/models-yue2',
] as const

/** One family's runtime seat: its DECL. The seat is the pattern any
 *  future craft face the families export rides (image-gen's seat
 *  carries anima's promptTags restorer the same way). */
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
        seats.set(decl.id, { decl })
      }
    })
  return priming
}

/** A family's seat — undefined when the package is absent (the
 *  compose door's own loud refusal names the family there). */
export const seatOf = (id: string): FamilySeat | undefined => seats.get(id)

/** The boarded knob's live ids — the PRESENT families in the
 *  FAMILY_MODULES order (a missing family costs its enum row, never
 *  the knob; an all-absent install serves an empty list and the
 *  tool face falls back to the BOARDED literal, where the run
 *  refuses loud at the model seat). */
export const boardedModels = (): string[] =>
  [...seats.values()].map((seat) => seat.decl.id)
