/** Frozen vocabularies — types + vocabulary CONSTANTS only (no
 * render, no fetch; the icon-bearing META table stays app-side). */
export declare const Provenance: {
    readonly agent: "agent";
    readonly user: "user";
    readonly imported: "imported";
};
export type Provenance = (typeof Provenance)[keyof typeof Provenance];
export declare const PROVENANCE_VALUES: readonly Provenance[];
/** Is the value a valid Provenance? Gate untrusted JSON (a past run's
 * metadata, a drag payload) before rendering. */
export declare function isProvenance(v: unknown): v is Provenance;
//# sourceMappingURL=vocab.d.ts.map