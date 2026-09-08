// server.ts — the gateway HTTP shell on the Cordis substrate.
//
// The gateway IS a Cordis app (CORDIS CORE law,
// docs/patterns/cordis-core.md): the boot is LOADER-DRIVEN —
// bootGatewayContext (src/core/context.ts) owns the Loader service
// and applies the checked-in bundle patch
// (packages/gateway/shell/cordis.patch.yml: errors, the 15 door plugins,
// timer, logger-console, the WEB SERVER entry, the gateway lifecycle
// entry) — and dispatch() is the auth gate + one ctx.serial round
// (each door module owns its plugin listeners and matches its own
// rows inside; door BODIES are untouched).
//
// WEBSERVER STROKE (2026-09-08): the transport rim rides the
// vendored harness plugin @deepseek-ai/dsh-host-webserver
// (vendor/cordis_plugins/webserver — their web carrier, "knows no
// harness concepts"): the plugin owns createServer/listen/close+
// closeAllConnections/disposal; this module owns ONLY the request
// BODY — the fallback seat (one owner, the composition law) carries
// the whole dispatch loop: uvicorn-contract URL decode (golden-
// pinned until the oracle death; contract origin after), header
// copy, body concat, dispatch, content-length stamping, the 500
// belt. Upgrades ride registerUpgrade: the runs events door serves
// the bare form exactly and the path form /v1/flows/events/<run_id>
// as a prefix route (the estate divergence on the vendored copy —
// arbitrary run ids cannot ride an exact table). Unmatched upgrades
// are closed by the plugin (their law).
//
// The queue boot (lock-first single-writer gate, resurrect queued
// work, sweep stale sidecars, ledger server.boot — py main()
// 4474-4489) runs inside the gateway plugin's apply, BEFORE the
// server accepts traffic.
//
// QUEUE LANE LAW: no fixed port — the webserver listens on an
// EPHEMERAL port (port 0, kernel-assigned) unless GATEWAY_PORT pins
// one (tests never pin). Direct run prints `READY <port>` on stdout
// so the parity wall can discover the port:
//
//   node --experimental-strip-types apps/gateway/src/main.ts
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import type { IncomingMessage, ServerResponse } from "node:http";
import { dispatch } from "@melite/gateway";

import { defaultAssetRoots, unquotePy } from "@melite/gateway";
import { handleWsUpgrade } from "@melite/gateway";
import { bootGatewayContext, refusalLine } from "@melite/gateway";
import { createProcessShutdown } from "@melite/gateway";
import { BOOT_ENGINE } from "@melite/gateway";

import type { DispatchResult } from "@melite/gateway";
import type { WebServer } from "@deepseek-ai/dsh-host-webserver";
export { BOOT_ENGINE } from "@melite/gateway";

/** Start the shell. Resolves with the actual port (ephemeral by
 *  default — pass 0 and read back the kernel pick). The queue boot
 *  runs first (registry start — the gateway plugin's apply: lock
 *  gate only when the process main claimed it, then resurrect, then
 *  sweep, then serve); a library caller never self-refuses on its
 *  own held lock. The listener itself is the vendored webserver
 *  plugin's (ctx.webServer) — disposal is theirs (close +
 *  closeAllConnections + upgraded-socket teardown). */
export async function startServer(port: number = 0): Promise<{
  port: number;
}> {
  const roots = defaultAssetRoots();
  const { ctx } = await bootGatewayContext({
    stateRoot: roots.stateRoot,
    runsRoot: roots.runsRoot,
    ledgerPath: roots.ledgerPath,
    port,
    engine: BOOT_ENGINE,
    claimLock: false,
  });
  // The card registry loads async but the validate/disclosure rims
  // are sync — prime once per boot (both boot sites; the manifest's
  // gateway-card-registry row primes at load and this re-prime is
  // belt-and-braces, mirroring the old double prime). Boot scope is
  // not a plugin and cannot declare inject, so the service resolves
  // through ctx.get('cardRegistry') (the task's rule-4 shape) —
  // undefined means the leaf miswired the provider row: LOUD, never
  // a fallback.
  const cards = ctx.get("cardRegistry");
  if (cards === undefined) {
    throw new Error(
      "[card_registry] unprimed: no CardRegistryService on the boot " +
        "context — the manifest's gateway-card-registry row is missing",
    );
  }
  await cards.prime();
  const ws: WebServer = ctx.webServer;
  // The fallback seat = the dispatch loop. No named HTTP routes:
  // every path (health, chrome bytes, /v1 doors, the 404 voice)
  // shapes through dispatch — the door rows own their own paths,
  // the rim owns none.
  ws.registerFallback(
    (req: IncomingMessage, res: ServerResponse): void => {
      const method: string = req.method ?? "GET";
      // Uvicorn decodes request.url.path BEFORE _adapt runs (probed:
      // %2e/%2F/%C3%A9 all arrive decoded, %zz stays literal, %ff
      // becomes U+FFFD) — decode the path part here so dispatch,
      // the rel slice, and the inputs unquote all see py's shape.
      // CONTRACT ORIGIN (oracle death pending): golden-pinned wire
      // behavior, not live-server mirroring.
      // The query string stays raw (route() parses + decodes it).
      const raw: string = req.url ?? "/";
      const qi: number = raw.indexOf("?");
      const target: string =
        qi < 0
          ? unquotePy(raw)
          : unquotePy(raw.slice(0, qi)) + raw.slice(qi);
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
        // dispatch is async (bridge doors forward over the network /
        // subprocess). Both the sync throw and the async rejection
        // land in the same 500 envelope py _adapt shaping gives
        // uncaught route() errors — dispatch() funnels both through
        // the error service; this catch is the belt for transport-
        // level failures (same envelope, same bytes).
        const send500 = (exc: unknown): void => {
          const answered: DispatchResult = ctx.gatewayError.internalError(
            method,
            target,
            exc,
          );
          res.writeHead(answered.status, {
            "content-type": answered.contentType,
          });
          res.end(answered.body);
        };
        const sendDispatch = (out: DispatchResult): void => {
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
        let out: DispatchResult | Promise<DispatchResult>;
        try {
          out = dispatch(method, target, body, headers, authToken);
        } catch (exc) {
          send500(exc);
          return;
        }
        void Promise.resolve(out).then(sendDispatch, send500);
      });
    },
  );
  // WS upgrade seam (runs lane): py serves /v1/flows/events* over
  // starlette WebSockets and 404s anything else at upgrade. The bare
  // door rides an exact route; the path form /v1/flows/events/<id>
  // rides a prefix route (arbitrary run ids — the vendored-copy
  // divergence). The plugin closes every unmatched upgrade (their
  // law; py destroyed those sockets too). The raw target rides (the
  // door splits + decodes it itself, exactly like _ws_starlette
  // sees uvicorn's form); a carried head buffer is unshifted so no
  // client byte is lost.
  const upgradeBody = (
    req: IncomingMessage,
    socket: import("node:stream").Duplex,
    head: Buffer,
  ): void => {
    const raw: string = req.url ?? "/";
    if (head.length > 0) socket.unshift(head);
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === "string") headers[k.toLowerCase()] = v;
      else if (Array.isArray(v) && typeof v[0] === "string") {
        headers[k.toLowerCase()] = v[0] as string;
      }
    }
    try {
      handleWsUpgrade({
        roots,
        authToken: process.env["DSH_GATEWAY_TOKEN"] ?? "",
        target: raw,
        headers,
        socket: socket as import("node:net").Socket,
      });
    } catch {
      try {
        socket.destroy();
      } catch {
        /* gone */
      }
    }
  };
  ws.registerUpgrade({
    kind: "exact",
    path: "/v1/flows/events",
    handler: upgradeBody,
  });
  ws.registerUpgrade({
    kind: "prefix",
    path: "/v1/flows/events/",
    handler: upgradeBody,
  });
  return { port: ws.port };
}

const isMain: boolean = (process.argv[1] ?? "").endsWith("main.ts");

if (isMain) {
  // P5 lock-first (py main() 4474-4480): the single-writer gate
  // runs BEFORE any boot side effect — resurrect, sweep, worker,
  // listen. The gate lives inside the gateway plugin's apply (a
  // second writer on the same state root refuses LOUD there —
  // py-identical REFUSING line carried as the rejection, shaped
  // below into stderr + exit 1 — having touched nothing).
  const gateRoots = defaultAssetRoots();
  const pinned: string = process.env["GATEWAY_PORT"] ?? "";
  const port: number = pinned === "" ? 0 : Number(pinned);
  try {
    const { ctx } = await bootGatewayContext({
      stateRoot: gateRoots.stateRoot,
      runsRoot: gateRoots.runsRoot,
      ledgerPath: gateRoots.ledgerPath,
      port,
      engine: BOOT_ENGINE,
      claimLock: true,
    });
    // Same rule-4 prime as startServer below (boot scope cannot
    // inject — ctx.get, LOUD on miswire). The provider row primes at
    // load; both explicit primes are belt-and-braces.
    const bootCards = ctx.get("cardRegistry");
    if (bootCards === undefined) {
      throw new Error(
        "[card_registry] unprimed: no CardRegistryService on the boot " +
          "context — the manifest's gateway-card-registry row is missing",
      );
    }
    await bootCards.prime();
    // Clean shutdown rides the harness's process-shutdown shape
    // (core/processShutdown.ts — copied verbatim @ 141ebf6): signals
    // dispose the ROOT context fiber, which cascades every plugin
    // fiber (the gateway entry's disposer ledgers server.stop (py
    // shutdown(), reason signal) and releases the lock pid-checked;
    // storage domains drain; the listener closes via ctx.effect).
    // SIGTERM is a supervisor's stop → 0; SIGINT is a user
    // interrupt → 130 (their law). Repeated signal escalates to
    // force-exit; 5 s grace bounds a wedged teardown.
    const shutdown = createProcessShutdown((): Promise<void> => ctx.fiber.dispose());
    const interrupt = (code: number): void => {
      shutdown.interrupt(code);
    };
    process.on("SIGTERM", (): void => interrupt(0));
    process.on("SIGINT", (): void => interrupt(130));
    try {
      const { port: bound } = await startServer(port);
      // No close shim here: the vendored webserver plugin owns
      // listener disposal (close + closeAllConnections + tracked
      // upgraded sockets — the harness webserver law) through its
      // fiber teardown, which the root dispose above cascades.
      // Wall-pinned handshake (e2e_tsboot parses stdout for exactly
      // this line): stays on console.log, never ctx.logger — the
      // logger-console sink re-shapes every record it touches.
      console.log("READY " + bound);
    } catch (exc: unknown) {
      const msg: string = exc instanceof Error ? exc.message : String(exc);
      // TS-side transport failure (no py mirror): rides ctx.logger
      // (logger-console plugin). %s-param shape — the message is
      // arbitrary listener text, never a format string.
      ctx.logger("gateway").error("%s", "[gateway-ts] listen failed: " + msg);
      process.exit(1);
    }
  } catch (exc: unknown) {
    // The loader wraps entry failures (see refusalLine): recover the
    // byte-exact py-identical REFUSING line for stderr (the queue
    // parity wall pins it byte-equal) — anything else prints raw.
    const msg: string = exc instanceof Error ? exc.message : String(exc);
    process.stderr.write((refusalLine(exc) ?? msg) + "\n");
    process.exit(1);
  }
}
