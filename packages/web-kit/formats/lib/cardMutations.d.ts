/** Max length of a card title / flow name, enforced by this gate at edit time. The wire types carry titles as bare strings — the gate is the bound's single home. */
export declare const TITLE_MAX_LEN = 120;
export interface MutationSpec {
    /** The field this mutation writes (the patch key). */
    field: string;
    /** Coerce the raw value before validation (trim). */
    coerce: (v: unknown) => unknown;
    /** Type-guard gate: string, non-empty after trim, <= TITLE_MAX_LEN. */
    validate: (v: unknown) => v is string;
}
/** The closed set of stage mutations. Add a member + a CARD_MUTATIONS entry
 * to extend the gate. */
export type StageMutationKind = "rename";
export type StageMutation = {
    kind: "rename";
    value: string;
};
export declare const CARD_MUTATIONS: Record<StageMutationKind, MutationSpec>;
export type StageMutationResult = {
    ok: true;
    patch: {
        title: string;
    };
} | {
    ok: false;
    error: string;
};
/** Pure gate. Unknown kinds error at runtime (defense in depth beyond the
 * tsc union). Every card mutation must pass through here. */
export declare function applyStageMutation(mutation: StageMutation): StageMutationResult;
/** The closed set of flow-doc mutations (the flow rename,
 * 2026-08-09). Same extension discipline as the stage table. */
export type DocMutationKind = "rename";
export type DocMutation = {
    kind: "rename";
    value: string;
};
export declare const DOC_MUTATIONS: Record<DocMutationKind, MutationSpec>;
export type DocMutationResult = {
    ok: true;
    patch: {
        name: string;
    };
} | {
    ok: false;
    error: string;
};
/** Pure gate for flow-doc mutations — the flow-level sibling of
 * applyStageMutation. Cosmetic: the store action must NOT mark stale or
 * recompute keys (a rename is not a semantic change). */
export declare function applyDocMutation(mutation: DocMutation): DocMutationResult;
//# sourceMappingURL=cardMutations.d.ts.map