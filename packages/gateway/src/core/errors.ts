// core/errors.ts — the ONE error-envelope service.
//
// Every error byte the gateway serves is built here (CORDIS CORE
// law, docs/patterns/cordis-core.md §6): the py _adapt wire
// contract — indent=2 JSON envelopes, ASCII-only for 4xx/401 —
// with the single deliberate exception the old server.ts send500
// carried: 500s ride plain JSON.stringify (byte-parity demands it,
// so the builder below keeps it).
//
// Relocated verbatim from ctx.ts (normalize4xx, serializePy,
// authRefusal + AUTH_TOKEN_ENV/AUTH_EXEMPT_PATHS), the ctx.ts
// dispatch-tail 404 builder, and the server.ts send500 body —
// ownership changed, bytes did not.
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { Context, Service } from "@deepseek-ai/cordis";

/** Bearer env var — the same constant as python/gateway.py AUTH_TOKEN_ENV. */
export const AUTH_TOKEN_ENV: string = "DSH_GATEWAY_TOKEN";

/** Health probe stays reachable with auth on (py AUTH_EXEMPT_PATHS). */
export const AUTH_EXEMPT_PATHS: readonly string[] = ["/v1/health"];

/** Dispatcher answer: status + exact bytes + content type (+ extra
 *  headers, e.g. WWW-Authenticate on 401, Content-Range on 206).
 *  body is a UTF-8 string for JSON/text doors, raw bytes for the
 *  asset byte doors (server.ts lengths + sends either). */
export interface DispatchResult {
  readonly status: number;
  readonly body: string | Uint8Array;
  readonly contentType: string;
  readonly headers: Record<string, string>;
}

/** Python-compatible JSON envelope — mirrors
 *  json.dumps(payload, indent=2, default=str): 2-space indent with
 *  ", "/" :" separators (JSON.stringify parity) plus ensure_ascii
 *  (every non-ASCII UTF-16 unit -> lowercase \\uXXXX, surrogate
 *  pairs becoming two escapes exactly as py). Chrome 200s never
 *  pass through here (served verbatim from CHROME_BODIES); 4xx/401
 *  envelopes are ASCII-only so this is byte-exact for them. */
export function serializePy(payload: unknown): string {
  const text: string = JSON.stringify(payload, null, 2) ?? "null";
  return text.replace(
    /[^\x00-\x7F]/g,
    (ch: string): string =>
      "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0"),
  );
}

/** R4.2 dispatcher normalization — mirrors route() 4347-4356: EVERY
 *  4xx object body leaves with a code; explicit codes are kept, the
 *  rest ride invalid_request. Error text is never touched. Arrays
 *  are not dicts (py isinstance(payload, dict)) — left alone. */
export function normalize4xx(status: number, payload: unknown): unknown {
  if (
    typeof status === "number" &&
    status >= 400 &&
    status < 500 &&
    typeof payload === "object" &&
    payload !== null &&
    !Array.isArray(payload) &&
    !("code" in (payload as Record<string, unknown>))
  ) {
    (payload as Record<string, unknown>)["code"] = "invalid_request";
  }
  return payload;
}

/** The gateway error envelopes, provided once as `ctx.gatewayError`
 *  (the card plane's `ctx.comfyui` shape: the host provides, doors
 *  inject). The pure builders above are exposed as instance members
 *  so door plugins read everything through the service; they are
 *  ALSO the module's exports so ctx.ts can keep its wall-pinned unit
 *  addresses without a context. Every method returns exact wire
 *  bytes — no logging, no side effects, so the door walls stay
 *  byte-parity. */
export class GatewayErrorService extends Service {
  readonly serializePy: (payload: unknown) => string;
  readonly normalize4xx: (status: number, payload: unknown) => unknown;

  constructor(ctx: Context) {
    super(ctx, "gatewayError");
    this.serializePy = serializePy;
    this.normalize4xx = normalize4xx;
  }

  /** The auth gate — mirrors _adapt/_auth_ok: an empty token passes
   *  everything; otherwise /v1/health is exempt and the rest demand
   *  `Authorization: Bearer <token>` (query tokens do not count on
   *  the HTTP path — _adapt passes "" as query_token). The token is a
   *  parameter (never read from process here) so the service stays a
   *  pure unit; server.ts passes process.env[DSH_GATEWAY_TOKEN]
   *  through. Returns the 401 answer, or null to let the request ride. */
  authCheck(
    path: string,
    headers: Record<string, string>,
    authToken: string,
  ): DispatchResult | null {
    if (authToken === "") return null;
    if ((AUTH_EXEMPT_PATHS as readonly string[]).includes(path)) return null;
    if (headers["authorization"] === "Bearer " + authToken) return null;
    return {
      status: 401,
      body: this.serializePy({
        error:
          "unauthorized: missing or invalid bearer token " +
          "(Authorization: Bearer <token>; set " +
          AUTH_TOKEN_ENV +
          " to enable)",
      }),
      contentType: "application/json",
      headers: { "www-authenticate": "Bearer" },
    };
  }

  /** The honest unserved signal — the same 404 shape py route()
   *  returns for unknown paths (and matched-but-unported rows). */
  notFound(method: string, path: string): DispatchResult {
    const payload: Record<string, string> = {
      error: "no such route " + method + " " + path,
      code: "no_such_route",
    };
    this.normalize4xx(404, payload);
    return {
      status: 404,
      body: this.serializePy(payload),
      contentType: "application/json",
      headers: {},
    };
  }

  /** The 500 envelope — mirrors the py _adapt shaping for uncaught
   *  route() errors. NOTE the deliberate asymmetry: plain
   *  JSON.stringify, NOT serializePy (the old server.ts send500
   *  shape — byte-parity pins it). */
  internalError(method: string, target: string, exc: unknown): DispatchResult {
    const msg: string = exc instanceof Error ? exc.message : String(exc);
    const name: string =
      exc instanceof Error ? exc.constructor.name : "Error";
    const tb: string = exc instanceof Error ? exc.stack ?? "" : "";
    return {
      status: 500,
      body: JSON.stringify(
        {
          error: msg,
          type: name,
          traceback: tb,
          route: method + " " + target,
        },
        null,
        2,
      ),
      contentType: "application/json",
      headers: {},
    };
  }
}

declare module "@deepseek-ai/cordis" {
  interface Context {
    gatewayError: GatewayErrorService;
  }
}

/** Provides `ctx.gatewayError` (no inject — injecting the service it
 *  provides would self-wait; the card plane's cli.ts ComfyUIService
 *  shape). */
export const gatewayErrors = {
  name: "gateway-errors",
  apply(ctx: Context): void {
    new GatewayErrorService(ctx);
  },
};
