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
export const TITLE_MAX_LEN = 120

// ─── Shared gate core ──────────────────────────────────────────────────────

export interface MutationSpec {
 /** The field this mutation writes (the patch key). */
 field: string
 /** Coerce the raw value before validation (trim). */
 coerce: (v: unknown) => unknown
 /** Type-guard gate: string, non-empty after trim, <= TITLE_MAX_LEN. */
 validate: (v: unknown) => v is string
}

type MutationOutcome =
 | { ok: true; patch: Record<string, string> }
 | { ok: false; error: string }

/** Shared core: coerce → validate → patch. Every table's apply* entry is a
 * thin wrapper over this — one gate, one error language across targets. */
function runMutation(spec: MutationSpec, value: unknown): MutationOutcome {
 const v = spec.coerce(value)
 if (!spec.validate(v)) {
 return {
 ok: false,
 error: `Invalid ${spec.field}: must be 1-${TITLE_MAX_LEN} non-empty characters`,
 }
 }
 return { ok: true, patch: { [spec.field]: v as string } }
}

// ─── Stage (card) mutations ────────────────────────────────────────────────

/** The closed set of stage mutations. Add a member + a CARD_MUTATIONS entry
 * to extend the gate. */
export type StageMutationKind = "rename"

export type StageMutation = { kind: "rename"; value: string }

export const CARD_MUTATIONS: Record<StageMutationKind, MutationSpec> = {
 rename: {
 field: "title",
 coerce: (v) => (typeof v === "string" ? v.trim() : v),
 validate: (v): v is string =>
 typeof v === "string" && v.trim().length > 0 && v.trim().length <= TITLE_MAX_LEN,
 },
}

export type StageMutationResult =
 | { ok: true; patch: { title: string } }
 | { ok: false; error: string }

/** Pure gate. Unknown kinds error at runtime (defense in depth beyond the
 * tsc union). Every card mutation must pass through here. */
export function applyStageMutation(mutation: StageMutation): StageMutationResult {
 const spec = CARD_MUTATIONS[mutation.kind]
 if (!spec) {
 return { ok: false, error: `Unknown stage mutation kind: ${mutation.kind}` }
 }
 return runMutation(spec, mutation.value) as StageMutationResult
}

// ─── Doc (flow-level) mutations ────────────────────────────────────────

/** The closed set of flow-doc mutations (the flow rename,
 * 2026-08-09). Same extension discipline as the stage table. */
export type DocMutationKind = "rename"

export type DocMutation = { kind: "rename"; value: string }

export const DOC_MUTATIONS: Record<DocMutationKind, MutationSpec> = {
 rename: {
 field: "name",
 coerce: (v) => (typeof v === "string" ? v.trim() : v),
 validate: (v): v is string =>
 typeof v === "string" && v.trim().length > 0 && v.trim().length <= TITLE_MAX_LEN,
 },
}

export type DocMutationResult =
 | { ok: true; patch: { name: string } }
 | { ok: false; error: string }

/** Pure gate for flow-doc mutations — the flow-level sibling of
 * applyStageMutation. Cosmetic: the store action must NOT mark stale or
 * recompute keys (a rename is not a semantic change). */
export function applyDocMutation(mutation: DocMutation): DocMutationResult {
 const spec = DOC_MUTATIONS[mutation.kind]
 if (!spec) {
 return { ok: false, error: `Unknown doc mutation kind: ${mutation.kind}` }
 }
 return runMutation(spec, mutation.value) as DocMutationResult
}
