// runsValidateRefusals.ts — refusal builders: plain TS texts
// (the shape fakes and repr renders are deleted — the estate speaks
// TS). Record coercion for stage params.
export function minLengthRefusal(cls, field) {
    return cls + " " + field + " must be a non-empty string";
}
/** Record coercion for stage params: plain objects ride
 *  (falsy rides {}); anything else refuses loud. Pair-list
 *  params are refused — JSON params are objects, never pair
 *  lists. */
export function coerceRecord(v) {
    const src = v ? v : {};
    if (typeof src === "object" && src !== null && !Array.isArray(src)) {
        return { ...src };
    }
    throw new Error("stage params must be an object");
}
//# sourceMappingURL=runsValidateRefusals.js.map
