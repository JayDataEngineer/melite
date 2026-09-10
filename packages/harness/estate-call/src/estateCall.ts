// estateCall.ts — the ONE lane-call contract every card tool shares
// (the stamped-client audit: eight card packages each carried a
// hand-copied GatewayError + gwJson + fetch block — the exact
// degeneration LAW 2 exists to prevent; this module is the SSOT).
//
// A card NEVER owns transport: the registrar (melite-tools) hands the
// builder this call shape, built from the ctx seats + door listeners
// (in-process; see melite-tools/src/estate.ts). The wrapper below
// owns the response contract the cards used to re-implement: JSON
// parse, error extraction, the named-refusal field.

/** The transport every estate consumer receives. Plain, structural,
 *  JSON-in/JSON-out, cancellation + timeout owned by the caller. */
export type EstateCall = (
  method: "GET" | "POST" | "PATCH",
  path: string,
  body: unknown,
  signal: AbortSignal | undefined,
  timeoutMs: number,
) => Promise<unknown>

/** A lane refusal: status + raw body + the named `error` field the
 *  doors stamp (field names kept from the cards' shape — their catch
 *  arms are unchanged). */
export class GatewayError extends Error {
  readonly status: number
  readonly body: string
  readonly named: string
  constructor(status: number, body: string, named: string) {
    super(`gateway ${status}: ${body}`)
    this.name = "GatewayError"
    this.status = status
    this.body = body
    this.named = named
  }
}

/** Adapt the raw call to the JSON-record contract the cards speak:
 *  non-record bodies and refusals throw GatewayError exactly as the
 *  stamped clients did. */
export function jsonLane(
  call: EstateCall,
): (
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: Record<string, unknown>,
  signal?: AbortSignal,
  timeoutMs?: number,
) => Promise<Record<string, unknown>> {
  return async (method, path, body, signal, timeoutMs = 60_000) => {
    // A pre-aborted call never dials the lane — cancellation is a
    // transport law owned here, not by each consumer.
    signal?.throwIfAborted()
    let raw: unknown
    try {
      raw = await call(method, path, body, signal, timeoutMs)
    } catch (e) {
      if (e instanceof GatewayError) throw e
      throw new GatewayError(0, e instanceof Error ? e.message : String(e), "")
    }
    if (raw instanceof GatewayError) throw raw
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new GatewayError(0, "lane returned a non-object body", "")
    }
    return raw as Record<string, unknown>
  }
}
