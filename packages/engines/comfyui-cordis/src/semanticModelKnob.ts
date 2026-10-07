// semanticModelKnob — the served model knob as a semantic style
// enum (roadmap's model-knob row): multi-family cards serve
// human-labeled style entries derived from the boarded families'
// own DECL variant rows — never a bare family id list. Each entry
// carries the stable three-part address (family:variant:cell) and
// the admission route it resolves to; the label is the DECL's own
// copy at the cell's precedence (cell → variant — the contract's
// derived-route-view law at models/families/contract.ts).
import type { ModelDecl } from './models/families/contract.ts'

/** One served style entry. `value` is the wire spelling a request
 *  places in the top-level `model` field; `route` is the
 *  admission atom the estate resolves it to.
 *
 *  @param value stable three-part address family:variant:cell
 *  @param label the DECL's own human copy (cell.label else variant.label)
 *  @param family the DECL id — compose's model-unit key
 *  @param route the cell's route — the class tree's _routes atom
 */
export type SemanticModelEntry = {
  readonly value: string
  readonly label: string
  readonly family: string
  readonly route: string
}

type DeclSlice = Pick<ModelDecl, 'id' | 'label' | 'variants'>

/** Derive the served style entries from the boarded families'
 *  DECLs, in board order: variants by their `order`, cells in
 *  declared order, hidden cells skipped (the DECL's own
 *  hide_from_dropdown is the served face's truth — the same law
 *  the engine dropdown rides).
 *
 *  @param decls the boarded families' DECLs, in board order
 *  @returns entries with `entries[0]` the card's default pick
 */
export const semanticModelEntries = (decls: readonly DeclSlice[]): SemanticModelEntry[] => {
  const out: SemanticModelEntry[] = []
  for (const decl of decls) {
    const variants = [...decl.variants].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    for (const variant of variants) {
      for (const cell of variant.cells) {
        if (cell.hide_from_dropdown) continue
        const route = cell.route !== undefined && cell.route !== ''
          ? cell.route
          : variant.route ?? ''
        if (route === '') continue
        const label = cell.label !== '' ? cell.label : variant.label
        out.push({
          value: `${decl.id}:${variant.id}:${cell.quant}`,
          label: label !== '' ? label : decl.label,
          family: decl.id,
          route,
        })
      }
    }
  }
  return out
}

/** Resolve a served style value to its admission route — the
 *  estate-side fold a request's `model` field rides. Returns null
 *  for any value the derivation never served.
 *
 *  @param entries the derivation's own output (one spelling)
 *  @param value the request's model field
 */
export const resolveSemanticModel = (
  entries: readonly SemanticModelEntry[],
  value: string,
): SemanticModelEntry | null => entries.find((e) => e.value === value) ?? null
