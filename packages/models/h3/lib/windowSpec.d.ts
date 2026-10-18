export interface WindowSpecProjection {
    /** the carrier's own key universe (paramSchema dict), sorted. */
    readonly carrierKeys: readonly string[];
    /** the UI-served envelope (the emission's properties), sorted. */
    readonly envelope: readonly string[];
    /** the family door's declared per-window rows, sorted. */
    readonly filmRows: readonly string[];
    /** carrierKeys − envelope: hidden by the carrier's own law, sorted. */
    readonly carrierInternal: readonly string[];
    /** envelope − filmRows: served with a named exemption, sorted. */
    readonly undeclaredServed: readonly string[];
    /** filmRows − envelope: declared wire/internal, sorted. */
    readonly unservedDeclared: readonly string[];
}
/**
 * Serve the h3 window's three-home surface as one projection: the
 * carrier universe, the served envelope, and the family door's film
 * rows, plus the three named difference sets the parity wall judges.
 * Pure derivation — no hand lists; a row or knob added on any side
 * shifts the sets and the wall names it.
 */
export declare function serveWindowSpec(): WindowSpecProjection;
//# sourceMappingURL=windowSpec.d.ts.map