// family-seats.ts — the plugin law's family seat (L3 cure,
// 2026-11-16, card-without-family audit; image-gen's file is the
// template): THE CARD EXISTS WITHOUT ITS FAMILIES. This module is
// the card's ONLY bridge to the family packages, and it holds ZERO
// static imports — each family resolves through a guarded dynamic
// import, and its DECL (plus, for the mask family, the detector
// download rows it owns) lands in the seat table.
//
// THE MODULE-LOAD PRIME (the TLA): this card's schema builds the
// list cap from the seated DECLs' max_images (the max_images law —
// the card RIDES the lanes, never a hardcoded count), and the
// registration rows serve the mask family's DETECTOR_PROVISIONS
// export, read synchronously inside registerCard's effect — so
// priming completes before card.ts's module body evaluates
// (card.ts imports this module statically; the top-level await
// settles the guarded imports first). allSettled keeps the degrade
// law: an absent family package rejects into its OWN seat's absence
// — the card still loads and registers with the seats that remain,
// and compose refuses loud at the absent seat. Nothing waits on a
// PRUNED family beyond its own failed import.
//
// THE DEGRADE LAW (per family, never per card): a missing family
// package costs ITS OWN seat — the card never dies for a family.
import type { ModelDecl, ProvisionRow } from '@melite/comfyui-card-kit/model-contract'

/** The boarded family modules, by package — the three edit lanes
 *  plus the mask family (its detector rows serve the crop_stitch
 *  arm). Ids live in card.ts's BOARDED literal (the family-coverage
 *  wall judges the binding on the dev tree; a typo'd id reds it
 *  there). */
const FAMILY_MODULES = [
  '@melite/models-qwen-img-edit-21',
  '@melite/models-fibo2-edit',
  '@melite/models-h3-image-edit',
  '@melite/models-mask',
] as const

/** One family's runtime seat: its DECL plus the detector rows when
 *  the family owns them (today only mask ships DETECTOR_PROVISIONS;
 *  the field is the pattern any future row-owner rides). */
export type FamilySeat = {
  decl: ModelDecl
  detectors?: ProvisionRow[]
}

type FamilyModule = {
  DECL?: ModelDecl
  DETECTOR_PROVISIONS?: ProvisionRow[]
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
          detectors: Array.isArray(mod.DETECTOR_PROVISIONS)
            ? mod.DETECTOR_PROVISIONS
            : undefined,
        })
      }
    })
  return priming
}

/** A family's seat — undefined when the package is absent (the
 *  compose door's own loud refusal names the family there). */
export const seatOf = (id: string): FamilySeat | undefined => seats.get(id)

/** The detector rows the crop_stitch arm serves — the mask
 *  family's DETECTOR_PROVISIONS export by identity (the downloads
 *  law: the card serves, never authors a copy); an absent mask
 *  package serves no rows (its absence is its own cost). */
export const detectorProvisions = (): ProvisionRow[] | undefined =>
  seatOf('mask-select')?.detectors

/** The present edit seats, in BOARDED order — the schema's list-cap
 *  derivation reads these (a pruned lane costs its own contribution
 *  to the cap, never the card). */
export const editSeats = (): FamilySeat[] =>
  ['qwen-img-edit-21', 'fibo2-edit', 'h3-image-edit']
    .map((id) => seatOf(id))
    .filter((seat): seat is FamilySeat => seat !== undefined)

// THE MODULE-LOAD PRIME — see the header (the schema's cap and the
// registration rows read the seats synchronously; the static import
// from card.ts lands after this settles).
await primeFamilySeats()
