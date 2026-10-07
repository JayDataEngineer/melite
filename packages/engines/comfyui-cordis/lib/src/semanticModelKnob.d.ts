import type { ModelDecl } from './models/families/contract.js';
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
    readonly value: string;
    readonly label: string;
    readonly family: string;
    readonly route: string;
};
type DeclSlice = Pick<ModelDecl, 'id' | 'label' | 'variants'>;
/** Derive the served style entries from the boarded families'
 *  DECLs, in board order: variants by their `order`, cells in
 *  declared order, hidden cells skipped (the DECL's own
 *  hide_from_dropdown is the served face's truth — the same law
 *  the engine dropdown rides).
 *
 *  @param decls the boarded families' DECLs, in board order
 *  @returns entries with `entries[0]` the card's default pick
 */
export declare const semanticModelEntries: (decls: readonly DeclSlice[]) => SemanticModelEntry[];
/** Resolve a served style value to its admission route — the
 *  estate-side fold a request's `model` field rides. Returns null
 *  for any value the derivation never served.
 *
 *  @param entries the derivation's own output (one spelling)
 *  @param value the request's model field
 */
export declare const resolveSemanticModel: (entries: readonly SemanticModelEntry[], value: string) => SemanticModelEntry | null;
export {};
