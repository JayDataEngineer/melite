import type { CardRegistryService } from "./cardsRegistry.ts";
/** THE FLOW PARAMS OVERLAY — the one law both doors ride (round-21
 *  flows audit F1): the request's `params` overlays the expansion's
 *  fresh rows. A primitive value targets the single stage whose card
 *  admits the key (zero: unknown-key refusal; several: ambiguous —
 *  the operator names the stage); an object value targets one stage
 *  by id, every key admitted by that stage's card. Admission reads
 *  the SHARED surface (knobs ∪ absorbed mod fields ∪ admits — audit
 *  J-E2), and every refusal is runs/invalid-request BEFORE either
 *  door proceeds: validate answering green while start refused 400
 *  was the F1 divergence. Mutates the rows in place (the expansion's
 *  own containers — flowsData's TEMPLATE DETACH keeps the registry's
 *  rows shared and untouched); the stage list is copied, never the
 *  rows.
 *
 * @param flowName the flow id, named in every refusal
 * @param stages the expansion's stage rows (mutated in place)
 * @param overrideRaw the request body's raw `params` value
 * @param decls the card registry's declared rows (the admission read)
 * @param fam the request's family seat (`body.model`, "" when the
 *   request names none) — scopes the absorbed mod surface to the
 *   owning atom, the same fold compose and variant judge with
 */
export declare function applyFlowParamsOverride(flowName: string, stages: ReadonlyArray<unknown>, overrideRaw: unknown, decls: ReturnType<CardRegistryService["cardDecls"]>, fam: string): void;
//# sourceMappingURL=flowsParamsOverlay.d.ts.map