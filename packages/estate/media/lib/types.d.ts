/** One listed media item — the source row's picker row. `url` is
 * the SAME /melite-media/runs grammar the byte route serves (one
 * spelling, minted at the tree, never restated client-side). */
export interface MediaListRow {
    readonly url: string;
    readonly name: string;
    readonly kind: string;
    readonly runId: string;
}
