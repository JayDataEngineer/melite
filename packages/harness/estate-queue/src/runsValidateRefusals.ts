// runsValidateRefusals.ts — refusal builders: plain TS texts
// (2026-09-18: the pydantic-shape fakes, CPython AttributeError
// texts, and python-repr renders are deleted — the estate speaks
// TS). Record coercion for stage params.

export function minLengthRefusal(cls: string, field: string): string {
  return cls + " " + field + " must be a non-empty string";
}

/** Record coercion for stage params: plain objects ride
 *  (falsy rides {}); anything else refuses loud. The python
 *  dict() pair-sequence arms (strings/lists as pairs) are deleted
 *  (2026-09-18) — JSON params are objects, never pair lists. */
export function coerceRecord(v: unknown): Record<string, unknown> {
  const src: unknown = v ? v : {};
  if (typeof src === "object" && src !== null && !Array.isArray(src)) {
    return { ...(src as Record<string, unknown>) };
  }
  throw new Error("stage params must be an object");
}
