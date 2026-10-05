// cardMutations — the declarative card + flow mutation gate (2026-08-09).
//
// DECLARATIVE way. One table, one gate — no per-kind imperative store code.
// Each row declares the field a mutation kind writes + its validation
// + coercion; extending the gate = adding a union member + a table row (same
// discipline as _FORM_CONFIGS, and the
// backend's pydantic models this table mirrors).
//
// The enforcement is two-layer, mirroring the catalog schema's pattern:
// • HERE (frontend, edit time): the typed unions (tsc) + this runtime gate —
// every card/doc mutation passes through applyStageMutation /
// applyDocMutation (the shared runMutation core).
// • BACKEND (wire, run start): FlowStep.title AND FlowDoc.name
// carry Field(max_length=TITLE_MAX_LEN) in backend/media/comfyui/flow.py
// — the pydantic bounds. Bump all together.
//
// THE NAMING RULE (2026-08-09, the "meta-asset" pattern): every user-visible
// name gets a row in one of these tables + a bound in the owning layer
// (pydantic where Python owns the model, zod where Node does). No ad-hoc
// name writes — that's how drift and breakage creep in.
/** Max length of a card title / flow name. MIRRORED on the backend:
 * FlowStep.title AND FlowDoc.name carry Field(max_length=120) in
 * backend/media/comfyui/flow.py. */
export const TITLE_MAX_LEN = 120;
/** Shared core: coerce → validate → patch. Every table's apply* entry is a
 * thin wrapper over this — one gate, one error language across targets. */
function runMutation(spec, value) {
    const v = spec.coerce(value);
    if (!spec.validate(v)) {
        return {
            ok: false,
            error: `Invalid ${spec.field}: must be 1-${TITLE_MAX_LEN} non-empty characters`,
        };
    }
    return { ok: true, patch: { [spec.field]: v } };
}
export const CARD_MUTATIONS = {
    rename: {
        field: "title",
        coerce: (v) => (typeof v === "string" ? v.trim() : v),
        validate: (v) => typeof v === "string" && v.trim().length > 0 && v.trim().length <= TITLE_MAX_LEN,
    },
};
/** Pure gate. Unknown kinds error at runtime (defense in depth beyond the
 * tsc union). Every card mutation must pass through here. */
export function applyStageMutation(mutation) {
    const spec = CARD_MUTATIONS[mutation.kind];
    if (!spec) {
        return { ok: false, error: `Unknown stage mutation kind: ${mutation.kind}` };
    }
    return runMutation(spec, mutation.value);
}
export const DOC_MUTATIONS = {
    rename: {
        field: "name",
        coerce: (v) => (typeof v === "string" ? v.trim() : v),
        validate: (v) => typeof v === "string" && v.trim().length > 0 && v.trim().length <= TITLE_MAX_LEN,
    },
};
/** Pure gate for flow-doc mutations — the flow-level sibling of
 * applyStageMutation. Cosmetic: the store action must NOT mark stale or
 * recompute keys (a rename is not a semantic change). */
export function applyDocMutation(mutation) {
    const spec = DOC_MUTATIONS[mutation.kind];
    if (!spec) {
        return { ok: false, error: `Unknown doc mutation kind: ${mutation.kind}` };
    }
    return runMutation(spec, mutation.value);
}
//# sourceMappingURL=cardMutations.js.map
