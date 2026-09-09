// routeMount.ts — the DSH route law for the gateway doors.
//
// The webserver contract (vendor/cordis_plugins/webserver): plugins
// register NAMED routes — `register({kind:'exact'|'prefix', path,
// handler})`; duplicates throw; the framework owns matching order
// (exact table, then longest prefix, then the fallback voice);
// "No decoding, no normalization — handlers own their pathname
// semantics." The retired plane was the opposite: one fallback seat
// ran a uvicorn-contract rim (py URL decode, trailing-slash
// normalize, one ctx.serial bus round) and every door matched its
// own rows on a custom `gateway/request` event — a shadow router
// byte-pinned to dead python.
//
// THE CONVERSION (routing 1:1, 2026-09-09): each door mounts its
// authored ROUTES rows through this adapter. Literal rows ride
// `exact`; regex rows ride `prefix` on their static head (the
// listener's own matchRoute re-refines inside — the door-local row
// order contract, e.g. F3 stage-patch before greedy draft :id,
// never depended on the rim). The adapter owns per-route mechanics
// ONLY: body read, the auth gate, GatewayRequest fabrication, the
// DispatchResult write, the 500 belt. Path decode and slash
// normalization are NOT done here — handlers that need decoded
// segments call unquotePy on their own groups (the framework law).
//
// Transition law: named routes claim their paths before the legacy
// fallback, so a converted door answers from the framework table
// while unconverted doors still ride the rim. When the last door
// converts, the rim + the `gateway/request` event + the door-local
// matchRoute calls die (the ROUTES table stays: docs + the mirror
// wall + the adapter's row source).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import type { IncomingMessage, ServerResponse } from "node:http";
import type { Context } from "@deepseek-ai/cordis";
import type { WebServer } from "@deepseek-ai/dsh-host-webserver";
import "@deepseek-ai/dsh-host-webserver";
import type { GatewayRequest, DispatchResult } from "@melite/gateway-core";
import type { GatewayRoute } from "@melite/gateway-core";
import { matchRoute, ROUTES } from "@melite/gateway-core";
import { defaultAssetRoots } from "./doors/assets.ts";

/** The listener body every door already owns: match its rows,
 *  answer, or return undefined when the request is not this door's
 *  (the adapter then answers the 404 — the prefix claimed the
 *  path, so the framework's own no-owner voice must not fire). */
export type DoorListener = (
  req: GatewayRequest,
) => DispatchResult | undefined | Promise<DispatchResult | undefined>;

/** The static head of a regex row: everything before the first
 *  capture group, `^` stripped, one trailing `/` dropped — the
 *  framework's prefix contract is `pathname === prefix ||
 *  pathname.startsWith(prefix + "/")`, so a slash-terminated head
 *  (`/v1/flows/status/`) would claim NOTHING (it would require a
 *  doubled slash). `^/v1/flows/status/(.+)$` →
 *  `/v1/flows/status`; `^/poser/` → `/poser`. The door's own
 *  matchRoute re-refines inside the claim, so the coarser head is
 *  safe (bare-prefix claims like `/poser` answer the adapter 404,
 *  the py voice's fate). */
function regexHead(row: GatewayRoute): string {
  const src: string = row.path.replace(/^\^/, "");
  const cut: number = src.indexOf("(");
  let head: string = cut < 0 ? src : src.slice(0, cut);
  if (head.length > 1 && head.endsWith("/")) head = head.slice(0, -1);
  return head;
}

/** One authored row → one named registration. kind: exact for
 *  literal rows, prefix for regex rows (the door re-refines). */
function registerRow(
  ws: WebServer,
  row: GatewayRoute,
  handler: (req: IncomingMessage, res: ServerResponse) => void,
): void {
  if (row.regex) {
    ws.register({ kind: "prefix", path: regexHead(row), handler });
    return;
  }
  ws.register({ kind: "exact", path: row.path, handler });
}

/** Mount every row whose handler name is in `handlers` (the door's
 *  own rows from the authored SSOT) as named webServer routes,
 *  wrapped with the shared per-route mechanics. One registration
 *  per DISTINCT path — multi-method rows (`GET|POST`) share it and
 *  the listener's matchRoute owns the method arm (py answered 404
 *  on method mismatch; that voice is the door's, not a 405). */
export function mountDoorRoutes(
  ctx: Context,
  ws: WebServer,
  handlers: readonly string[],
  listen: DoorListener,
): void {
  const mine: readonly string[] = handlers;
  const mounted: Set<string> = new Set();
  for (const row of ROUTES) {
    if (!mine.includes(row.handler)) continue;
    if (row.ws) continue; // upgrade doors ride registerUpgrade (their own seam)
    const kind: string = row.regex ? "prefix:" + regexHead(row) : "exact:" + row.path;
    if (mounted.has(kind)) continue; // multi-method rows share one registration
    mounted.add(kind);
    registerRow(ws, row, (req, res): void => {
      const method: string = req.method ?? "GET";
      const raw: string = req.url ?? "/";
      const qi: number = raw.indexOf("?");
      const pathname: string = qi < 0 ? raw : raw.slice(0, qi);
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (typeof v === "string") headers[k.toLowerCase()] = v;
        else if (Array.isArray(v) && typeof v[0] === "string") {
          headers[k.toLowerCase()] = v[0] as string;
        }
      }
      const chunks: Uint8Array[] = [];
      req.on("data", (c: Uint8Array): void => {
        chunks.push(c);
      });
      req.on("end", (): void => {
        const body: Uint8Array = Buffer.concat(chunks);
        const authToken: string = process.env["DSH_GATEWAY_TOKEN"] ?? "";
        const send500 = (exc: unknown): void => {
          const answered: DispatchResult = ctx.gatewayError.internalError(
            method,
            raw,
            exc,
          );
          res.writeHead(answered.status, {
            "content-type": answered.contentType,
          });
          res.end(answered.body);
        };
        const send = (out: DispatchResult): void => {
          const bytes: Buffer =
            typeof out.body === "string"
              ? Buffer.from(out.body, "utf8")
              : Buffer.from(out.body);
          const resHeaders: Record<string, string> = {
            "content-type": out.contentType,
            "content-length": String(bytes.length),
          };
          for (const [k, v] of Object.entries(out.headers)) {
            resHeaders[k] = v;
          }
          res.writeHead(out.status, resHeaders);
          res.end(bytes);
        };
        // RAW pathname (the framework law: no decode, no
        // normalize) — doors decode their own groups.
        const fabricated: GatewayRequest = {
          method,
          target: raw,
          path: pathname,
          body,
          headers,
          authToken,
          roots: defaultAssetRoots(),
        };
        let answered: DispatchResult | undefined | Promise<DispatchResult | undefined>;
        try {
          const refused: DispatchResult | null = ctx.gatewayError.authCheck(
            pathname,
            headers,
            authToken,
          );
          if (refused !== null) {
            send(refused);
            return;
          }
          answered = listen(fabricated);
        } catch (exc) {
          send500(exc);
          return;
        }
        void Promise.resolve(answered).then((out): void => {
          send(out ?? ctx.gatewayError.notFound(method, pathname));
        }, send500);
      });
    });
  }
}

/** The door's row-matching voice, shared by listeners during the
 *  transition: match method+path against ROUTES first-match-wins
 *  and keep only rows this door owns. */
export function doorMatch(
  req: GatewayRequest,
  handlers: readonly string[],
): { row: GatewayRoute; m: RegExpExecArray | null } | null {
  const hit = matchRoute(req.method, req.path);
  if (hit === null) return null;
  if (!handlers.includes(hit.row.handler)) return null;
  return hit;
}
