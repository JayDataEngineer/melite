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

/** The browser face of the lane remote (R4): a fetch-shaped call
 *  over ctx.remote.runs.lane — drop-in for the same-origin /v1
 *  fetches the studios and deck tabs carried. `remote` is the
 *  dsh-api-gateway client transport (structural: one method). */
export function browserLane(
  remote: { lane(method: string, path: string, body: unknown, signal?: AbortSignal): Promise<unknown> },
): (input: string, init?: { method?: string; body?: string; signal?: AbortSignal }) => Promise<Response> {
  return async (input, init): Promise<Response> => {
    const url = new URL(input, 'http://lane.local');
    const method = (init?.method ?? 'GET').toUpperCase() as 'GET' | 'POST' | 'PATCH';
    let body: unknown;
    if (init?.body !== undefined) {
      try { body = JSON.parse(init.body) } catch { body = init.body }
    }
    try {
      const value = await remote.lane(method, url.pathname + url.search, body, init?.signal);
      return new Response(JSON.stringify(value ?? null), { status: 200, headers: { 'content-type': 'application/json' } });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return new Response(JSON.stringify({ error: message }), { status: 502, headers: { 'content-type': 'application/json' } });
    }
  };
}

