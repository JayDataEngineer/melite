import type { CardRegistryService } from "./cardsRegistry.js";
/**
 * The overlay's mod-fold scoping decision (round-22 compose audit
 * Q3a): which family scopes the absorbed mod surface for a stage's
 * card. The request's model seat wins outright; with no seat, the
 * card's sole boarded family scopes it; a multi-family card with no
 * seat stays unscoped ("" — the union, compose's own selector to
 * refuse). Pure so the walls can pin the routing; the route→atom map
 * itself rides the engine-fiber fold (`owningAtom`, never booted in
 * the test fiber).
 *
 * @param boarded the card decl's boarded families
 * @param fam the request's family seat ("" when none)
 * @returns the scoping family, "" for unscoped
 */
export declare function overlayAtomFor(boarded: readonly string[], fam: string): string;
/**
 * The decls read both doors ride (round-22 compose audit Q5b,
 * FLOW-DOOR-DEGRADE-OR-MAP): the registry's cardDecls() is a STRICT
 * read — a missing model-facts.json throws raw (a 500 past the flow
 * doors, where the {model:} door degrades by policy), because both
 * overlay call sites sat outside any RemoteError mapping. The read
 * rides this one mapping so both doors voice the same
 * runs/invalid-request naming the missing file — never a raw
 * escape, never two voices.
 *
 * @param cardRegistry the context's card registry seat
 * @returns the declared rows, as cardDecls() serves them
 * @throws runs/invalid-request (loc "params") when the strict read throws
 */
export declare function overlayDecls(cardRegistry: Pick<CardRegistryService, "cardDecls">): ReturnType<CardRegistryService["cardDecls"]>;
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