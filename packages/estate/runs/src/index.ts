// index.ts — `@melite/estate-runs`: the runs Typert remote (the
// thin adapters, REBUILD-6 of the gateway kill).
//
// Shape per references/deepseek-harness/docs/cookbook/adding-a-remote-api.md:
// a host-side Cordis service extending TypertRemoteService, `@Remote`
// adapters (signal always final). This package is BUILT (tsc, the
// drafts recipe) because decorators are not erasable syntax — the
// BUSINESS (the live-run registry, the serial pump, the start
// chain, the RemoteError codes and throws) lives decorator-free in
// `@melite/estate-queue`'s RunsRegistryService (source-run), and
// every adapter delegates to that seat (`ctx.runs`). The seat
// boundary is STRUCTURAL (declared below): this package must not
// import the queue package's sources into its build graph (they
// are bundler-resolved source-run files; the wall pins the
// delegation end-to-end instead).
//
// Failures arrive as the protocol's ONE RemoteError (thrown by the
// registry, codes declared next to the throws in estate-queue) —
// the adapters add nothing, never catch, never wrap.
import type { Context } from "@deepseek-ai/cordis";
export type { JsonValue, RunStartDoc, RunRow } from "./types.ts";
import type { RunStartDoc, RunRow } from "./types.ts";

import {
  Remote,
  TypertRemoteService,
} from "@deepseek-ai/dsh-typert-protocol";
import type { RunsRuntimeService } from "@melite/estate-queue";


declare module "@deepseek-ai/cordis" {
  interface Context {
    runsRemote: RunsRemoteService;
    /** The live-run registry seat — typed with the class that
     *  MOUNTS it (li-aq.3: the hand-rolled structural twin of this
     *  key conflicted with the queue's own declaration — TS2717 —
     *  and a weaker type for a live seat is a lie the compiler
     *  could not see). */
    runs: RunsRuntimeService;
  }
}


/** The runs remote: start/status/stop over the registry seat. */
export class RunsRemoteService extends TypertRemoteService {
  static inject = ["runs"];

  constructor(ctx: Context) {
    super(ctx, "runsRemote", { namespace: "runs" });
  }

  /** Endpoint `runs/start` — the submit chain (registry seat). */
  @Remote("start")
  async remoteExportStart(
    doc: RunStartDoc,
    signal: AbortSignal,
  ): Promise<{ run_id: string; status: string; queue_position: number }> {
    return await this.ctx.runs.start(doc, signal);
  }

  /** Endpoint `runs/status` — the live row (registry seat). */
  @Remote("status")
  async remoteExportStatus(
    runId: string,
    signal: AbortSignal,
  ): Promise<RunRow> {
    return (await this.ctx.runs.status(runId, signal)) as RunRow;
  }

  /** Endpoint `runs/stop` — the flag + interrupt (registry seat). */
  @Remote("stop")
  async remoteExportStop(
    runId: string,
    signal: AbortSignal,
  ): Promise<RunRow> {
    return (await this.ctx.runs.stop(runId, signal)) as RunRow;
  }

  /** Endpoint `runs/list` — the restore-port envelope (registry
   *  seat; the raw limit string keeps int() semantics). */
  @Remote("list")
  async remoteExportList(
    rawLimit: string,
    signal: AbortSignal,
  ): Promise<{ count: number; runs: RunRow[] }> {
    return (await this.ctx.runs.list(rawLimit, signal)) as { count: number; runs: RunRow[] };
  }

  /** Endpoint `runs/validate` — the pure compile (registry seat). */
  @Remote("validate")
  async remoteExportValidate(
    doc: RunStartDoc,
    signal: AbortSignal,
  ): Promise<RunRow> {
    return (await this.ctx.runs.validate(doc, signal)) as RunRow;
  }
}

/** The runs remote row (the estate mounts it after the registry). */
export const runsRemotePlugin = {
  name: "estate-runs",
  inject: ["runs"] as const,
  apply(ctx: Context): void {
    new RunsRemoteService(ctx);
  },
};
