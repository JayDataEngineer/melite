// family-seats.ts — the plugin law's family seat (L3 cure,
// 2026-11-16, card-without-family audit; image-gen's file is the
// template): THE CARD EXISTS WITHOUT ITS FAMILY. This module is the
// card's ONLY bridge to the family package, and it holds ZERO
// static imports — the family resolves through a guarded dynamic
// import, and its DECL plus the download rows it owns land in the
// seat table.
//
// THE MODULE-LOAD PRIME (the TLA): this card's registration rows
// serve the family's own PROVISIONS export (the downloads law —
// the card serves, never authors a copy), read synchronously
// inside registerCard's effect, so priming completes before
// card.ts's module body evaluates (card.ts imports this module
// statically; the top-level await settles the guarded import
// first). allSettled keeps the degrade law: an absent mask package
// rejects into its OWN seat's absence — the card still loads and
// registers, the rows serve empty, compose refuses loud at the
// seat. Nothing waits on a PRUNED family beyond its own failed
// import.
//
// THE DEGRADE LAW (per family, never per card): a missing family
// package costs ITS OWN seat — the card never dies for a family.
import type { ModelDecl, ProvisionRow } from '@melite/comfyui-card-kit/model-contract'

/** The boarded family modules, by package — the id lives in the
 *  compose door's seat read (the family-coverage wall judges the
 *  binding on the dev tree; a typo'd id reds it there). */
const FAMILY_MODULES = [
  '@melite/models-mask',
] as const

/** The mask family's seat: its DECL plus the download rows the
 *  family owns (served by identity — never a card-authored copy). */
export type FamilySeat = {
  decl: ModelDecl
  provisions: ProvisionRow[]
}

type FamilyModule = {
  DECL?: ModelDecl
  PROVISIONS?: ProvisionRow[]
}

const seats = new Map<string, FamilySeat>()
let priming: Promise<void> | null = null

/** Prime every family seat (idempotent; absent packages degrade to
 *  their own absence — the card never dies for a family). */
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
          provisions: Array.isArray(mod.PROVISIONS) ? mod.PROVISIONS : [],
        })
      }
    })
  return priming
}

/** A family's seat — undefined when the package is absent (the
 *  compose door's own loud refusal names the family there). */
export const seatOf = (id: string): FamilySeat | undefined => seats.get(id)

/** The registration rows the card serves — the family's OWN
 *  PROVISIONS export, by identity; an absent family package serves
 *  no rows (its absence is its own cost). */
export const maskProvisions = (): ProvisionRow[] | undefined =>
  seatOf('mask-select')?.provisions

// THE MODULE-LOAD PRIME — see the header (the registration rows
// read the seat synchronously inside the card's registration
// effect; the static import from card.ts lands after this settles).
await primeFamilySeats()
