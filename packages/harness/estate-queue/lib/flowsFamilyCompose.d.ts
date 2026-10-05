import type { RegistryFlow } from "./flowsData.js";
/** The families seat's read shape (structural — the models
 * service's allDecls() rows, action arrays intact). */
export type FamilyDeclRow = {
    readonly id: string;
};
export type FamilyModelsSeat = {
    allDecls(): readonly FamilyDeclRow[];
};
/** How the family seat answered, which is three different facts:
 *  `seated` (the table holds families), `bare` (the owner is mounted
 *  and the table holds none — a lane that mounted the catalog
 *  provider without the family plugins), and `absent` (no seat at
 *  all: an unmounted context whose singleton never booted). The
 *  refusal must name which one it is — a family that is merely
 *  unregistered is a different defect from a lane with no table.
 *  A flow with NO family stage never reads this. */
export type FamilySeatState = "seated" | "bare" | "absent";
/** The live family declarations, and how the seat answered. A flow
 *  WITH a family stage refuses LOUD on an unanswering seat inside
 *  composeOne, in the seat's own voice.
 * @param modelsSeat the context's models service when mounted
 *  (the injectable read); the booted singleton otherwise
 * @returns the declarations (empty on an unanswering seat) and the
 *  state that produced them */
export declare function liveFamilySeat(modelsSeat?: FamilyModelsSeat | null): {
    readonly decls: readonly FamilyDeclRow[];
    readonly state: FamilySeatState;
};
/** The live family declarations, for the callers that only need the
 *  rows. A refusal composed from these alone cannot tell an absent
 *  seat from an unregistered family — use {@link liveFamilySeat}.
 * @param modelsSeat the context's models service when mounted
 * @returns the family declarations, or [] when no seat answers */
export declare function liveFamilyDecls(modelsSeat?: FamilyModelsSeat | null): readonly FamilyDeclRow[];
/** Compose every family-action stage of an expanded flow into its
 * workflow envelope. Flows with no family stage pass through
 * byte-identical (zero lookups, zero overhead).
 * @param flow the EXPANDED registry flow (fromFlow links resolved)
 * @param decls the families seat's declarations (allDecls())
 * @param seatState how the seat answered, so a refusal names the
 *  condition it found (see {@link liveFamilySeat})
 * @returns the flow with every family stage composed
 * @throws when the seat cannot answer, a family is unregistered, an
 *  action undeclared, a param unadmitted, or a hand-written output
 *  contradicts the action's declaration */
export declare function composeFamilyStages(flow: RegistryFlow, decls: readonly FamilyDeclRow[], seatState?: FamilySeatState): RegistryFlow;
//# sourceMappingURL=flowsFamilyCompose.d.ts.map
