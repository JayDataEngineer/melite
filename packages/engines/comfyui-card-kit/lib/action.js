import { mintSeed } from "./graph-helpers.js";
/** Instantiate a bound action on the shared builder: parse the
 *  resolved facts through the action's door, execute the declared
 *  managed affairs (the seed-sentinel rule mints through the ONE
 *  minter — GATE S), then run the segment factory.
 *  @param action the family-declared action the card bound
 *  @param p the card's gated params doc (the schema walk validated
 *   types and bounds; the action's P is the typed read of it)
 *  @param model the resolved family row (lane_inputs, mods)
 *  @param g the shared builder the segment composes on
 *  @param runId the run id (the save prefix namespace)
 *  @returns the terminal handle (the save node's output) */
export function instantiateAction(action, p, model, g, runId) {
    const facts = action.facts(model.lane_inputs);
    const doc = { ...p };
    for (const spec of action.params) {
        if (spec.rule === "seed-sentinel") {
            if (spec.name !== "seed") {
                throw new Error(`action '${action.id}': the seed-sentinel rule fires on the 'seed' param, not '${spec.name}'`);
            }
            doc.seed = mintSeed(doc);
        }
    }
    return action.build({ p: doc, facts, model, g, runId });
}
/** Resolve the action a card binds off the family's own DECL —
 *  the RULE 5 interlock's only door. The card boards the DECL and
 *  names the action id; the hand-imported action list (one import
 *  per family, retyped per card) dies here. The DECL's actions
 *  array is the erased DeclaredAction contract; this helper owns
 *  the ONE cast back to the kit's spec type (the same erasure the
 *  DECL accepts concrete specs through, inverted at a single
 *  seam — registration validated the action's facts door at boot,
 *  so the runtime object is the family's concrete spec).
 *  @param decl the family DECL the card already boards
 *  @param actionId the declared action id the binding targets
 *  @returns the family's declared action, unmodified
 *  @throws when the family declares no action under that id — the
 *   card's binding refused at boarding, never at first compose */
export function declaredAction(decl, actionId) {
    const found = decl.actions?.find((a) => a.id === actionId);
    if (found === undefined) {
        const owned = decl.actions?.map((a) => a.id).join(", ") ?? "none";
        throw new Error(`family '${decl.id}' declares no action '${actionId}' (declared: ${owned}) — the card's binding refused at boarding`);
    }
    return found;
}
//# sourceMappingURL=action.js.map