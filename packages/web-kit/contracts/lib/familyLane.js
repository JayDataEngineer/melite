// familyLane.ts — THE DERIVED-FAMILY LANE LAW (the one-seat
// migration, 2026-11-12): the family axis NO DECL variant row can
// name (h3's t4_open/t4r/t4_chain — derived from the doc's own
// shape) declares its lanes and their dead keys as DATA (the DECL's
// familyLaw), and every judge of that axis — the client compose
// mirror (card-base), the registry's family reseat seat
// (cardsRegistry) — derives the lane through THIS one spelling.
// Before it, the derivation lived as a private copy in the client
// judge and the drop math lived as the per-card reseatFamily face
// (h3's own code on the card definition — the "multiple-seat
// cancer" the operator named): laws spelled in per-card faces drift
// apart. The face is dead; the declaration owns everything.
/** A key is present for the family derivation when it states
 *  something: null/undefined/blank/empty-array are absence. The
 *  presence grammar every family judge shares — the derivation,
 *  the drop math, and the client mirror's refusal clause read the
 *  same seats the same way (a private spelling elsewhere is a
 *  split family waiting to burn).
 *  @param v the stated value
 *  @returns true when the value states something */
export function familyKeyPresent(v) {
    if (v === null || v === undefined)
        return false;
    if (typeof v === 'string')
        return v.trim() !== '';
    if (Array.isArray(v))
        return v.length > 0;
    return true;
}
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
export function deriveFamilyLane(law, doc) {
    const calls = Array.isArray(doc['calls']) ? doc['calls'] : [];
    for (const lane of law.lanes) {
        if (lane.minCalls === undefined && lane.guideKeys === undefined && lane.callGuideKeys === undefined) {
            return lane.lane;
        }
        if (lane.minCalls !== undefined && calls.length >= lane.minCalls)
            return lane.lane;
        if (lane.guideKeys?.some((k) => familyKeyPresent(doc[k])))
            return lane.lane;
        if (lane.callGuideKeys?.some((k) => calls.some((c) => familyKeyPresent(c?.[k]))))
            return lane.lane;
    }
    return law.lanes[law.lanes.length - 1]?.lane ?? '';
}
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
export function reseatDeadKeys(law, doc, prior) {
    const lane = deriveFamilyLane(law, doc);
    const dead = law.deadKeys[lane];
    if (dead === undefined || dead.length === 0)
        return { params: doc, dropped: [] };
    const dropped = dead
        .filter((k) => Object.prototype.hasOwnProperty.call(doc, k) && Object.prototype.hasOwnProperty.call(prior, k))
        .sort();
    if (dropped.length === 0)
        return { params: doc, dropped: [] };
    const reseated = { ...doc };
    for (const k of dropped)
        delete reseated[k];
    return { params: reseated, dropped };
}
//# sourceMappingURL=familyLane.js.map