// ctx.ts — the dispatcher: auth gate + one bus dispatch.
//
// The gateway IS a Cordis app (CORDIS CORE law,
// docs/patterns/cordis-core.md): routing/dispatch rides ctx events
// (ctx.serial 'gateway/request' — bail IS first-match-wins), doors
// are registry plugins (each door module owns its plugin: inject +
// its own route listeners), errors are the GatewayErrorService. This
// module keeps the public dispatch() signature and the wall-pinned
// unit exports (normalize4xx / serializePy — the chrome wall imports
// THIS module and probes them directly).
//
// Dispatch mirrors py route()+_adapt for the ported scope: the 401
// gate runs BEFORE dispatch (no code key — exactly as py); the bus
// round serves the first door answer (every door matches its own
// ROUTES rows INSIDE its listener via the routeUtil pure functions —
// the deleted GatewayRouterService bought no load-gating for pure
// request math, so matching is door-local, not a service); a serial
// rejection (a throwing door — e.g. the manage non-dict .get crash)
// lands in the same 500 envelope py _adapt shaping gives uncaught
// route() errors (both the old sync throw and the async rejection
// funneled here); anything unanswered — unknown paths AND
// matched-but-unclaimed rows — answers the same 404 shape py
// route() returns for unknown paths.
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { defaultAssetRoots } from "./doors/assets.ts";
import type { AssetRoots } from "./doors/assets.ts";
import { ensureDoorContext } from "./core/context.ts";
import type { DispatchResult } from "./core/errors.ts";
import { normalizePath } from "./routeUtil.ts";

export type { DispatchResult } from "./core/errors.ts";
export {
  AUTH_EXEMPT_PATHS,
  AUTH_TOKEN_ENV,
  GatewayErrorService,
  normalize4xx,
  serializePy,
} from "./core/errors.ts";

/** One request on the bus. Doors match it against their own ROUTES
 *  rows inside their listeners (routeUtil.matchRoute) — the match is
 *  door-local, never pre-matched up front. */
export interface GatewayRequest {
  readonly method: string;
  readonly target: string;
  readonly path: string;
  readonly body: Uint8Array;
  readonly headers: Record<string, string>;
  readonly authToken: string;
  readonly roots: AssetRoots;
}

declare module "@deepseek-ai/cordis" {
  interface Events {
    "gateway/request": (
      req: GatewayRequest,
    ) => DispatchResult | undefined | Promise<DispatchResult | undefined>;
  }
}

/** Dispatch one request — auth gate, one bus round, 404 fallback. */
export async function dispatch(
  method: string,
  target: string,
  body: Uint8Array,
  headers: Record<string, string>,
  authToken: string = "",
  roots: AssetRoots = defaultAssetRoots(),
): Promise<DispatchResult> {
  const ctx = await ensureDoorContext();
  const path: string = normalizePath(target);
  const refused: DispatchResult | null = ctx.gatewayError.authCheck(
    path,
    headers,
    authToken,
  );
  if (refused !== null) return refused;
  const req: GatewayRequest = {
    method,
    target,
    path,
    body,
    headers,
    authToken,
    roots,
  };
  let answered: DispatchResult | undefined;
  try {
    answered = await ctx.serial("gateway/request", req);
  } catch (exc) {
    return ctx.gatewayError.internalError(method, target, exc);
  }
  if (answered !== undefined) return answered;
  return ctx.gatewayError.notFound(method, path);
}
