// server.ts — the gateway HTTP shell on the Cordis substrate.
//
// The gateway IS a Cordis app (CORDIS CORE law,
// docs/patterns/cordis-core.md): the boot is LOADER-DRIVEN —
// bootGatewayContext (src/core/context.ts) owns the Loader service
// and applies the checked-in manifest
// (packages/gateway/cordis.config.json: errors, the 15 door plugins,
// timer, logger-console, the gateway lifecycle entry) — and
// dispatch() is the auth gate + one ctx.serial round (each door
// module owns its plugin listeners and matches its own rows inside;
// door BODIES are untouched). This module keeps ONLY the transport
// rim (no framework server exists): body concat, uvicorn-parity URL
// decode, header copy, content-length stamping, the WS upgrade seam.
//
// Serves the health/chrome doors (captured bytes) with the py _adapt
// wire contract: indent=2 JSON envelopes, 404s in the py route()
// shape. The queue boot (lock-first single-writer gate, resurrect
// queued work, sweep stale sidecars, ledger server.boot — py main()
// 4474-4489) runs inside the gateway plugin's apply, BEFORE the
// server accepts traffic.
//
// QUEUE LANE LAW: no fixed port — the server listens on an EPHEMERAL
// port (port 0, kernel-assigned) unless GATEWAY_PORT pins one (tests
// never pin). Direct run prints `READY <port>` on stdout so the
// parity wall can discover the port:
//
//   node --experimental-strip-types packages/gateway/src/server.ts
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { Socket } from "node:net";
import { dispatch } from "./ctx.ts";
import type { DispatchResult } from "./ctx.ts";
import { defaultAssetRoots, unquotePy } from "./doors/assets.ts";
import { handleWsUpgrade } from "./doors/runs.ts";
import { bootGatewayContext, refusalLine } from "./core/context.ts";
import { createProcessShutdown } from "./core/processShutdown.ts";
import { BOOT_ENGINE } from "./core/gateway.ts";

export { BOOT_ENGINE, bootState } from "./core/gateway.ts";

/** Start the shell. Resolves with the bound server + actual port
 *  (ephemeral by default — pass 0 and read back the kernel pick).
 *  The queue boot runs first (registry start — the gateway plugin's
 *  apply: lock gate only when the process main claimed it, then
 *  resurrect, then sweep, then serve); a library caller never
 *  self-refuses on its own held lock. */
export async function startServer(port: number = 0): Promise<{
  server: Server;
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
  const server: Server = createServer(
    (req: IncomingMessage, res: ServerResponse): void => {
      const method: string = req.method ?? "GET";
      // Uvicorn decodes request.url.path BEFORE _adapt runs (probed:
      // %2e/%2F/%C3%A9 all arrive decoded, %zz stays literal, %ff
      // becomes U+FFFD) — decode the path part here so dispatch,
      // the rel slice, and the inputs unquote all see py's shape.
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
  // starlette WebSockets and 404s anything else at upgrade. Only
  // the events doors upgrade — every other upgrade path is refused
  // (socket destroyed; py answers 404 there, and no wall pins the
  // bytes). The raw target rides (the door splits + decodes it
  // itself, exactly like _ws_starlette sees uvicorn's form); a
  // carried head buffer is unshifted so no client byte is lost.
  server.on(
    "upgrade",
    (req: IncomingMessage, socket: Socket, head: Buffer): void => {
      const raw: string = req.url ?? "/";
      const qi: number = raw.indexOf("?");
      const bare: string = qi < 0 ? raw : raw.slice(0, qi);
      let decoded = "";
      try {
        decoded = decodeURIComponent(bare.replace(/\+/g, " "));
      } catch {
        decoded = bare;
      }
      const normed: string = decoded.replace(/\/+$/, "") || "/";
      // Exactly py's two WSRoute rows (path form + bare door; the
      // query form rides the bare door and the door itself parses
      // ?run_id=). A ?run_id= on any OTHER path upgrades nowhere.
      const isEvents: boolean =
        normed === "/v1/flows/events" ||
        normed.startsWith("/v1/flows/events/");
      if (!isEvents) {
        try {
          socket.destroy();
        } catch {
          /* gone */
        }
        return;
      }
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
          socket,
        });
      } catch {
        try {
          socket.destroy();
        } catch {
          /* gone */
        }
      }
    },
  );
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, "127.0.0.1", (): void => {
      const addr: unknown = server.address();
      const bound: number =
        typeof addr === "object" && addr !== null
          ? (addr as { port: number }).port
          : port;
      resolve({ server, port: bound });
    });
  });
}

const isMain: boolean = (process.argv[1] ?? "").endsWith("server.ts");

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
      const { server, port: bound } = await startServer(port);
      // The listener rides the fiber registry now (the ctx.effect
      // conversion — the framework runs the disposer on root
      // dispose, before process exit): no hand-rolled close at the
      // rim. Disposal pairs close() with closeAllConnections() —
      // the harness webserver law (packages/host/webserver): a
      // handler may hold its response open (our WS seam is exactly
      // that class) and such connections never end on their own;
      // without the force-close teardown would hang.
      ctx.effect((): (() => void) => {
        return (): void => {
          server.close((): void => {});
          server.closeAllConnections?.();
        };
      });
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
