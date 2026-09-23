/** One listed media item — the source row's picker row. `url` is
 * the SAME /melite-media/runs grammar the byte route serves (one
 * spelling, minted at the tree, never restated client-side). */
export interface MediaListRow {
    readonly url: string;
    readonly name: string;
    readonly kind: string;
    readonly runId: string;
    /** §23 CROSS-ROOTS: the state root that served this row (own
     *  root first; first-root-wins on run-id collisions). */
    readonly served_from: string;
}
