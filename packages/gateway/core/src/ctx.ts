// ctx.ts — the door-facing request shape + the wall-pinned unit
// exports.
//
// The gateway IS a Cordis app (CORDIS CORE law,
// docs/patterns/cordis-core.md). ROUTING 1:1 (2026-09-09): the
// retired dispatcher (auth gate + one ctx.serial 'gateway/request'
// bus round + the 404 fallback) is DELETED — every door mounts its
// authored ROUTES rows as NAMED webServer routes at apply time
// (packages/gateway/doors/src/routeMount.ts: the vendored plugin's
// contract; the adapter owns per-route mechanics — auth, body,
// write, the 500 belt; handlers own their pathname semantics). This
// module now carries GatewayRequest (the door-facing shape the
// adapter fabricates) and the wall-pinned unit exports (normalize4xx
// / serializePy — the chrome wall imports THIS module and probes
// them directly).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { defaultAssetRoots } from "@melite/gateway-doors";
import type { AssetRoots } from "./storage/scan.ts";
import { ensureDoorContext } from "./core/context.ts";
import type { DispatchResult } from "./core/errors.ts";

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

