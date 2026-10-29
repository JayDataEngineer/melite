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
export function jsonClean(value) {
    return clean(value, new WeakMap());
}
function clean(value, seen) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean')
        return value;
    if (typeof value === 'number')
        return Object.is(value, -0) ? 0 : value;
    if (typeof value === 'bigint')
        return String(value);
    if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol')
        return null;
    if (Array.isArray(value)) {
        const out = new Array(value.length);
        for (let i = 0; i < value.length; i++)
            out[i] = value[i] === undefined ? null : clean(value[i], seen);
        return out;
    }
    /* v8 ignore next -- typeof exhaustion: every non-object returns above (2026-09-12) */
    if (typeof value === 'object') {
        const obj = value;
        const hit = seen.get(obj);
        if (hit !== undefined)
            return hit;
        const out = {};
        seen.set(obj, out);
        for (const k of Object.keys(obj)) {
            const v = obj[k];
            if (v === undefined)
                continue;
            out[k] = clean(v, seen);
        }
        return out;
    }
    // No trailing return: typeof exhausts — string/boolean/null above,
    // number, bigint, undefined/function/symbol, array-or-object — so no
    // value can fall through (the old `return null` was dead, 2026-09-12).
}
//# sourceMappingURL=json-clean.js.map