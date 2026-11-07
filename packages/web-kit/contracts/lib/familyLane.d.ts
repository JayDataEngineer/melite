/** One declared lane of a family law: predicates in declared order,
 *  first match wins. A lane with no qualifiers is the fallthrough;
 *  `minCalls` matches the calls array's length, `guideKeys` the doc
 *  level, `callGuideKeys` inside each calls row. */
export interface FamilyLaneRow {
    readonly lane: string;
    readonly minCalls?: number;
    readonly guideKeys?: readonly string[];
    readonly callGuideKeys?: readonly string[];
}
/** A family's derived-lane declaration (served verbatim off the DECL
 *  as FormSpecDoc.familyLaw; carried on the card definition as the
 *  registry's own truth). `deadKeys` maps a derived lane to the
 *  param keys whose PRESENCE that lane refuses — the stale carry a
 *  family flip strands and the reseat seat drops. */
export interface FamilyLaw {
    readonly lanes: readonly FamilyLaneRow[];
    readonly deadKeys: Readonly<Record<string, readonly string[]>>;
}
/** A key is present for the family derivation when it states
 *  something: null/undefined/blank/empty-array are absence. The
 *  presence grammar every family judge shares — the derivation,
 *  the drop math, and the client mirror's refusal clause read the
 *  same seats the same way (a private spelling elsewhere is a
 *  split family waiting to burn).
 *  @param v the stated value
 *  @returns true when the value states something */
export declare function familyKeyPresent(v: unknown): boolean;
/** Derive the doc's family lane, generic over the declared law data
 *  (the DECL's own law, pinned to the family's derivation module by
 *  the contract wall): lanes in declared order, first match wins —
 *  minCalls against the calls length, guideKeys at the doc level,
 *  callGuideKeys inside each calls row; a lane with no qualifiers is
 *  the fallthrough. No match = the last declared lane.
 *  @param law the family's declared lane law.
 *  @param doc the doc-shaped params (calls/keyframes/ref surface).
 *  @returns the derived lane id ('' only for an empty law — a shape
 *    the declaration judge refuses at boot). */
export declare function deriveFamilyLane(law: FamilyLaw, doc: Record<string, unknown>): string;
/** THE RESEAT DROP (the one seat's math — h3's reseatFamilyDead
 *  spine, generalized over the declaration): when the MERGED doc's
 *  derived lane refuses keys the law names dead, every dead key the
 *  doc states that the PRIOR row also stated is stale carry the
 *  family flip stranded — it drops before the judges and the store,
 *  so the row that lands is the row the next run composes. THE
 *  CARRY LINE (2026-11-11): a dead key the merged doc holds only
 *  because THIS write states it is authored, stands untouched, and
 *  the write door's family judge refuses it in the run door's own
 *  voice — the drop is never a launderer. A doc whose lane honors
 *  every stated key rides unchanged (dropped: []).
 *  @param law the family's declared lane law.
 *  @param doc the MERGED params view the write door would judge.
 *  @param prior the stored row's params BEFORE the merge.
 *  @returns the cleaned view (a NEW record when keys dropped; the
 *    input reference otherwise) + the dropped key names. */
export declare function reseatDeadKeys(law: FamilyLaw, doc: Record<string, unknown>, prior: Record<string, unknown>): {
    params: Record<string, unknown>;
    dropped: string[];
};
//# sourceMappingURL=familyLane.d.ts.map