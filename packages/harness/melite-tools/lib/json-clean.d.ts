/**
 * Deep JSON-normalization for tool results.
 *
 * The DSH tool registry rejects non-lossless values (undefined, functions,
 * symbols, -0, sparse arrays) in both arguments and results — the exact
 * "binding arguments must be lossless JSON" failure W2's live gate caught in
 * model_catalog (raw `label: m.label` passthrough leaked `undefined` for
 * catalog entries without labels). Every Melite tool result passes through
 * jsonClean at the boundary so gateway-shaped data ( SparseMap-like objects
 * with undefined fields) can never poison the registry call.
 *
 * REPAIR IS THE LAW HERE, and the divergence from DSH's refusal is
 * deliberate (the §2.3 record, 2026-10-12): the live estate's tool results
 * carry gateway-shaped data every day, so refusing at the registry would
 * break live behavior the W2 gate proved exists. Two consequences are
 * accepted with that choice and named here: every `undefined` → `null`
 * collapse is MODEL-VISIBLE (the model cannot distinguish an absent field
 * from an explicit null), and DSH's snapshot non-losslessness helpers can
 * never fire on this repository's tool results because the values are
 * pre-cleaned before the registry sees them.
 */
export declare function jsonClean<T>(value: T): T;
//# sourceMappingURL=json-clean.d.ts.map