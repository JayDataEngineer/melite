/** Frozen vocabularies — types + vocabulary CONSTANTS only (no
 * render, no fetch; the icon-bearing META table stays app-side). */
export declare const Authorship: {
    readonly agent: "agent";
    readonly user: "user";
    readonly imported: "imported";
};
export type Authorship = (typeof Authorship)[keyof typeof Authorship];
export declare const AUTHORSHIP_VALUES: readonly Authorship[];
/** Is the value a valid Authorship? Gate untrusted JSON (a past run's
 * metadata, a drag payload) before rendering. */
export declare function isAuthorship(v: unknown): v is Authorship;
//# sourceMappingURL=vocab.d.ts.map
