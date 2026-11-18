/** The h3 lane's optional package seats (the plugin law, harness
 *  side — S4 cure, 2026-11-16, core-without-card audit):
 *  @melite/models-h3 and the h3-timeline card are PLUGINS. The
 *  tools plane loads without them — a static import here would
 *  kill every base tool the moment either package is absent (the
 *  exact rc.3 shape, one file away). The seats resolve lazily and
 *  degrade to null: the h3 lane cannot exist without its packages
 *  (the card's registration is the gate that names the absence in
 *  the engine's ledger), so a null seat is unreachable on a live
 *  h3 stage and merely quiet everywhere else. Guarded by the
 *  harness-no-static-card-imports wall. */
export type H3ModelLane = typeof import('@melite/models-h3');
export type H3TimelineCardLane = typeof import('@melite/video-h3-timeline/card');
export type H3TimelineContractLane = typeof import('@melite/models-h3/timelineContract');
/** The models-h3 family seat (admitCrossRegimeJoin) — null when
 *  the family package is not installed. */
export declare const h3ModelSeat: () => Promise<H3ModelLane | null>;
/** The h3-timeline card seat (CROSS_REGIME_BAG_KEYS) — null when
 *  the card package is not installed. */
export declare const h3CardSeat: () => Promise<H3TimelineCardLane | null>;
/** The h3 timeline contract seat (expandCuts — the one split law)
 *  — null when the family package is not installed. */
export declare const h3TimelineContractSeat: () => Promise<H3TimelineContractLane | null>;
//# sourceMappingURL=h3-lane-seats.d.ts.map