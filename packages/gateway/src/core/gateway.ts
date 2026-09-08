// core/gateway.ts — the gateway as a Cordis plugin.
//
// Lifecycle (lock/boot/gates) maps to registry start/dispose
// (CORDIS CORE law, docs/patterns/cordis-core.md §5): apply() runs
// the single-writer gate FIRST (py main() 4474-4480) and the queue
// boot SECOND (resurrect queued work, sweep stale sidecars, ledger
// server.boot — py main() 4481-4489, all BEFORE the server accepts
// traffic), and returns the teardown disposer (ledger server.stop +
// pid-checked lock release — py release_lock + lifespan 4506).
//
// The gate is NOT claimed by library boots: a library caller must
// never self-refuse on its own held lock (the old server.ts rule),
// so apply() only gates when config.claimLock is set — the process
// main sets it, startServer-as-library does not. Teardown likewise
// only releases a claimed lock.
//
// The boot never throws for a poisoned state root (the queue module
// guards every read/parse/register, and the seam below swallows the
// rest so boot wedges nothing — except the gate refusal, which is
// LOUD by design: py-identical REFUSING line carried as the thrown
// message, and the main shapes it into stderr + exit 1).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import z from "@deepseek-ai/schemastery";
import type { QueueRoots, RebuiltRun } from "../queue/queue.ts";
import {
  appendLedger,
  bootGate,
  bootQueue,
  refuseStartLine,
  releaseLock,
} from "../queue/queue.ts";
import { enqueueResurrected } from "../doors/flowsRun.ts";

/** The P5 boot engine tag for the server.boot ledger row (py writes
 *  "python-orchestrator"; the TS shell is the preview runtime). */
export const BOOT_ENGINE: string = "ts-preview";

/** Gateway plugin config — the boot roots plus the process/lock role. */
export interface GatewayConfig {
  readonly stateRoot: string;
  readonly runsRoot: string;
  readonly ledgerPath: string;
  readonly port: number;
  readonly engine: string;
  readonly claimLock: boolean;
}

/** Load-time config contract, validated by the registry BEFORE the
 *  plugin starts (fork fiber resolveConfig over Standard Schema
 *  V1 — operator vocabulary drop). Pure STRUCTURE (field types
 *  only): every config accepted today still loads; a mistyped
 *  config refuses LOUD at load instead of crashing downstream.
 *  The lock GATE stays in apply (disk state, not config shape —
 *  Config cannot own it). Door plugins carry NO Config: they take
 *  no load config by design (roots ride the bus per-request —
 *  request scope, not load scope, so Config must not own them). */
const GatewayConfigSchema = z.object({
  stateRoot: z.string().required(),
  runsRoot: z.string().required(),
  ledgerPath: z.string().required(),
  port: z.number().required(),
  engine: z.string().required(),
  claimLock: z.boolean().required(),
});

/** P5 boot: resurrect queued work FIRST, sweep stale sidecars
 *  SECOND, ledger server.boot — all BEFORE the server accepts
 *  traffic. Never throws (see the module header). The log sink
 *  defaults to the old stderr seam (library callers without a
 *  context keep it); the plugin apply passes ctx.logger. */
export function bootState(
  stateRoot: string,
  runsRoot: string,
  ledgerPath: string,
  port: number,
  log: (msg: string) => void = (msg: string): void => {
    try {
      process.stderr.write(msg + "\n");
    } catch {
      /* stderr gone — boot anyway */
    }
  },
): { resurrected: number; swept: number; live: string[] } {
  try {
    const roots: QueueRoots = { stateRoot, runsRoot, ledgerPath };
    return bootQueue(
      roots,
      (run: RebuiltRun): void => {
        enqueueResurrected(run);
      },
      port,
      BOOT_ENGINE,
    );
  } catch (exc: unknown) {
    const msg: string = exc instanceof Error ? exc.message : String(exc);
    log("[gateway-ts] boot queue skipped: " + msg);
    return { resurrected: 0, swept: 0, live: [] };
  }
}

/** The gateway plugin: gates + boots on start, tears down on
 *  dispose. Injects the error service (every refusal envelope rides
 *  it). Awaiting its fiber settles the whole boot. */
export const gatewayPlugin: Plugin<GatewayConfig> = {
  name: "gateway",
  // The cast bridges schemastery's unparameterized '~standard'
  // (Props<unknown, unknown> — the fork threads no Schema generics
  // into it) to the registry's Config slot. Runtime conformance is
  // probed, not assumed (object validate returns {value}/{issues}
  // exactly as fork resolveConfig consumes).
  Config: GatewayConfigSchema as unknown as StandardSchemaV1<
    any,
    GatewayConfig
  >,
  inject: ["gatewayError"],
  apply(ctx: Context, config: GatewayConfig): () => void {
    // Lock-first (py main() 4474-4480): the single-writer gate runs
    // BEFORE any boot side effect. A second writer on the same state
    // root refuses LOUD here, having touched nothing.
    if (config.claimLock) {
      const gate = bootGate(config.stateRoot);
      if (!gate.ok) {
        throw new Error(refuseStartLine(gate.note));
      }
    }
    // Resurrect, then sweep, then serve (py main() 4485-4486). The
    // boot port for the server.boot row is the requested port (0 =
    // ephemeral, exactly what the caller asked for); the bound port
    // rides the READY line. The skip seam is TS-side (no py mirror)
    // so it rides ctx.logger (logger-console plugin — the gateway
    // entry boots after it in the manifest). %s-param shape: the
    // message carries arbitrary fs error text, never a format.
    const log = ctx.logger("gateway");
    bootState(
      config.stateRoot,
      config.runsRoot,
      config.ledgerPath,
      config.port,
      (msg: string): void => {
        log.warn("%s", msg);
      },
    );
    // Teardown (py shutdown(), reason signal): a retiring process
    // frees only its OWN lock, never the live holder's — and only
    // when it claimed one. The journal must never wedge teardown.
    return (): void => {
      if (!config.claimLock) return;
      try {
        appendLedger(config.stateRoot, "server.stop", {
          reason: "signal",
        });
      } catch {
        /* the journal must never wedge teardown */
      }
      releaseLock(config.stateRoot);
    };
  },
};
