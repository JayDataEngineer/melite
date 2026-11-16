// family-seats.ts — the plugin law's family seat (L3 cure,
// 2026-11-16, card-without-family audit; image-gen's file is the
// template): THE CARD EXISTS WITHOUT ITS FAMILY. This module is the
// card's ONLY bridge to the family package, and it holds ZERO
// static imports — the family resolves through a guarded dynamic
// import, and its DECL plus the client-safe vocabulary it owns land
// in the seat table.
//
// THE MODULE-LOAD PRIME (the TLA): this card's schema builds the
// scale vocabularies from the seat (the vocab-rails census seats
// the sites, but the enum VALUES ride the family's one truth), so
// priming completes before card.ts's module body evaluates
// (card.ts imports this module statically; the top-level await
// settles the guarded import first). allSettled keeps the degrade
// law: an absent family package rejects into its OWN seat's
// absence — the card still loads and registers, the vocabularies
// serve empty, the min-dim gate degrades to no floor, and compose
// refuses loud at the seat. Nothing waits on a PRUNED family
// beyond its own failed import.
//
// THE DEGRADE LAW (per family, never per card): a missing family
// package costs ITS OWN seat — the card never dies for a family.
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract'

/** The boarded family modules, by package — the id lives in
 *  card.ts's BOARDED literal (the family-coverage wall judges the
 *  binding on the dev tree; a typo'd id reds it there). */
const FAMILY_MODULES = [
  '@melite/models-input',
] as const

/** The input family's seat: its DECL plus the scale vocabulary it
 *  owns (the one truth the card's schema rails and the studio's
 *  menus cite — the leaf imports nothing, so the client bundle
 *  inlines its bytes; the studio reads the same seat through
 *  src/ui/studio/scaleVocabSeat.ts). */
export type FamilySeat = {
  decl: ModelDecl
  scaleMethods: readonly string[]
  scaleModelOptions: readonly string[]
  minDim: number
}

type FamilyModule = {
  DECL?: ModelDecl
  SCALE_METHODS?: readonly string[]
  SCALE_MODEL_OPTIONS?: readonly string[]
  MIN_DIM?: number
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
          scaleMethods: Array.isArray(mod.SCALE_METHODS) ? [...mod.SCALE_METHODS] : [],
          scaleModelOptions: Array.isArray(mod.SCALE_MODEL_OPTIONS) ? [...mod.SCALE_MODEL_OPTIONS] : [],
          minDim: typeof mod.MIN_DIM === 'number' && Number.isFinite(mod.MIN_DIM) ? mod.MIN_DIM : 0,
        })
      }
    })
  return priming
}

/** A family's seat — undefined when the package is absent (the
 *  compose door's own loud refusal names the family there). */
export const seatOf = (id: string): FamilySeat | undefined => seats.get(id)

/** The scale-method rail — the seat's array (a fresh copy of the
 *  family's own export; the schema rail spreads it). An absent
 *  family serves the card's own declared default as the degenerate
 *  closed set: the kit refuses an empty vocabulary (vocab.ts), so
 *  the rail cannot serve [] — the menu renders the one default and
 *  the compose door refuses the family, loud, by name (never a
 *  fabricated roster). */
export const scaleMethods = (): readonly string[] => seatOf('input')?.scaleMethods ?? ['lanczos']

/** The upscale-model rail — the seat's array (a fresh copy of the
 *  family's own export; the schema rail spreads it). Absent-family
 *  degrade: the "" unstated sentinel (see scaleMethods). */
export const scaleModelOptions = (): readonly string[] => seatOf('input')?.scaleModelOptions ?? ['']

/** The crop/scale floor — the seat's MIN_DIM. An absent family
 *  carries no floor: the gates pass through and the dispatch's own
 *  loud family refusal speaks (the degrade never silently
 *  substitutes a card-authored number for the family's law). */
export const minDim = (): number => seatOf('input')?.minDim ?? 0

// THE MODULE-LOAD PRIME — see the header (the schema's rails read
// the seat synchronously; the static import from card.ts lands
// after this settles).
await primeFamilySeats()
