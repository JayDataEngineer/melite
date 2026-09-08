// queue/refusals.ts — the shared refusal-envelope helper for the
// P5 queue refusal arms (resume / reproduce / lock-adjacent doors).
//
// Shape mirrors py/gateway.py _refusal (138-150): {error, code} then
// loc / expected / got ONLY when the raiser sets them (absent keys
// are honest — never null placeholders). Key order is the contract
// (error, code, loc, expected, got) — the dispatcher serializes via
// serializePy (ctx.ts), so bodies are byte-identical to py's
// json.dumps(payload, indent=2, default=str) for the ASCII domain
// every refusal text lives in.
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

/** One queue-door answer: HTTP status + the JSON envelope object
 *  (the dispatcher runs normalize4xx + serializePy over it — the
 *  same finish every other door rides). */
export interface QueueAnswer {
  readonly status: number;
  readonly payload: Record<string, unknown>;
}

/** Build the refusal envelope (py _refusal): error text verbatim,
 *  code always, loc/expected/got only when set. */
export function qRefusal(
  status: number,
  error: string,
  code: string,
  loc?: string,
  expected?: string,
  got?: string,
): QueueAnswer {
  const payload: Record<string, unknown> = { error, code };
  if (loc !== undefined) payload["loc"] = loc;
  if (expected !== undefined) payload["expected"] = expected;
  if (got !== undefined) payload["got"] = got;
  return { status, payload };
}
