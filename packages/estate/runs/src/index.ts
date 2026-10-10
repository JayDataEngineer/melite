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
  remoteErrorOf,
} from "@deepseek-ai/dsh-typert-protocol";


/** The registry seat's adapter-facing surface (structural — the
 *  implementation is RunsRegistryService in @melite/estate-queue;
 *  the wall pins the delegation byte-for-byte). */
interface RunsSeat {
  start(
    doc: unknown,
    signal: AbortSignal,
  ): Promise<{ run_id: string; status: string; queue_position: number }>;
  status(
    runId: string,
    signal: AbortSignal,
    includeLog?: boolean,
  ): Promise<Record<string, unknown>>;
  stop(
    runId: string,
    signal: AbortSignal,
  ): Promise<Record<string, unknown>>;
  list(
    rawLimit: string,
    signal: AbortSignal,
  ): Promise<{ count: number; runs: Record<string, unknown>[] }>;
  validate(
    doc: unknown,
    signal: AbortSignal,
  ): Promise<Record<string, unknown>>;
  /** Subscribe to run-row movement (the seam module's guarded
   *  wrapper — runsChange.ts in @melite/estate-queue); returns the
   *  unsubscribe. */
  onRunChange(fn: (runId: string) => void): () => void;
}

declare module "@deepseek-ai/cordis" {
  interface Context {
    runsRemote: RunsRemoteService;
    /** The live-run registry seat (@melite/estate-queue's
     *  RunsRegistryService — structural here, per the header). */
    runs: RunsSeat;
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

  /** Endpoint `runs/subscribe` — THE PUSH SOURCE for the live row
   *  (1.8, the hand-roll audit's last poll, 2026-10-12): the row on
   *  open, then a fresh row after every registry write that moves
   *  the run — the change events the write spine fires (the claim,
   *  the settle, the artifacts harvest, the stop press). Stream mode
   *  rides the typert logical-stream carrier — the same-origin mux
   *  the bench tail rides. Abort ends the stream clean; a listener's
   *  fault never breaks it (the seam's wrapper guards). */
  @Remote({ mode: "stream" })
  async *subscribe(
    runId: string,
    signal: AbortSignal,
  ): AsyncIterable<RunRow> {
    signal.throwIfAborted();
    // One finish arm per park: finish detaches BOTH listeners before
    // resolving, so it can never run twice — the wake and the cancel
    // share it, and a second call is a no-op pair. An abort that
    // landed while the generator was suspended AT A YIELD has no
    // listener attached; the post-park re-check catches it, and the
    // row change that landed in that same window is caught by the
    // bytes comparison below (the round-14 race audit's R2,
    // dev_docs/audits/round14-race-registries-2026-10-22.md).
    const park = (): { woke: Promise<void>; cancel: () => void } => {
      let cancel = (): void => {};
      const woke = new Promise<void>((resolve) => {
        if (signal.aborted) {
          resolve();
          return;
        }
        const offAbort = (): void => { signal.removeEventListener("abort", onAbort); };
        const finish = (): void => {
          offChange();
          offAbort();
          resolve();
        };
        const offChange = this.ctx.runs.onRunChange((id) => {
          if (id !== runId) return;
          finish();
        });
        const onAbort = (): void => { finish(); };
        cancel = finish;
        signal.addEventListener("abort", onAbort, { once: true });
      });
      return { woke, cancel };
    };
    /** The row's bytes: the witness a change leaves behind when it
     *  fires with no listener attached. */
    const bytesOf = (row: Record<string, unknown>): string => JSON.stringify(row);
    for (;;) {
      // THE ZERO-STATE PARK (the bench stream's birth watch, same
      // law): the gateway classifies a REJECTED open as TERMINAL, so
      // an unknown run at open would kill the holder's whole stream.
      // A run id the registry does not know YET — a start racing the
      // open, a boot replay re-birthing the row — parks instead: the
      // next runs.changed wake re-reads. runs/status still refuses
      // unknown-run for direct unary callers — only the WATCH
      // degrades.
      let row: Record<string, unknown> | undefined;
      try {
        row = await this.ctx.runs.status(runId, signal);
      } catch (error) {
        // String(code): the code union THIS package's build program
        // sees carries the protocol's own gateway codes — the runs/*
        // vocabulary is declared at the producing package
        // (@melite/estate-queue, next to the throws), which this
        // package must not pull into its build graph (the header's
        // structural law), so the watch compares the widened string.
        const refused = remoteErrorOf(error);
        if (refused === undefined || String(refused.code) !== "runs/unknown-run") throw error;
        row = undefined;
      }
      if (row !== undefined) yield row as RunRow;
      const before = row === undefined ? "" : bytesOf(row);
      const { woke, cancel } = park();
      // ATTACH-THEN-VERIFY: the listener is attached above, so every
      // change still to come is delivered. A change that landed while
      // the generator was suspended at the yield fired with NO
      // listener attached; the row's own bytes are the witness it
      // left, and this re-read resolves on them.
      let moved: boolean;
      try {
        moved = bytesOf(await this.ctx.runs.status(runId, signal)) !== before;
      } catch (error) {
        if (signal.aborted) {
          cancel();
          return;
        }
        const refused = remoteErrorOf(error);
        if (refused === undefined || String(refused.code) !== "runs/unknown-run") throw error;
        // a known run the registry no longer holds moved too: before
        // was a row, the re-read found none
        moved = before !== "";
      }
      if (moved) {
        cancel();
        continue;
      }
      await woke;
      if (signal.aborted) return;
    }
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
