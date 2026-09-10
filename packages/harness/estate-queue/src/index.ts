// index.ts — `@melite/estate-queue`: the serial run queue as a host
// Cordis service (REBUILD-5 of the gateway kill, 2026-09-10).
//
// The gateway package's queue core re-homed HERE verbatim (lock,
// journal, sidecars, refusals, resurrect, run-status probe) with
// the three gateway-core seams cut over: asciiEscape + the submit
// vocabulary ride this package (pyAscii.ts / vocab.ts — the SSOT
// address moved with the owner), and the draft-id law comes from
// `@melite/estate-drafts` (the law's one address). The door-mount
// entries (flows-resume / flows-reproduce route mounts) are DEAD
// with the gateway — no routes, no port, no second process.
import type { Context, Plugin } from "@deepseek-ai/cordis";
import { QueueService } from "./service.ts";
import type { QueueConfig } from "./service.ts";
import { RunsRegistryService } from "./runsRegistry.ts";

export { QueueService } from "./service.ts";
export type { QueueConfig } from "./service.ts";
export * from "./pyAscii.ts";
export * from "./vocab.ts";
export * from "./queue.ts";
export * from "./refusals.ts";
export * from "./runStatus.ts";
// bootSweep twins (queue.ts core impl + resurrect.ts QueueRoots
// wrapper): the explicit export wins over the stars — the wrapper
// is the domain seam.
export { bootSweep } from "./resurrect.ts";

export const name = "estate-queue";
export const inject = ["timer"];

export function apply(ctx: Context, config: QueueConfig = {}): void {
  new QueueService(ctx, config);
}

const plugin: Plugin = { name, inject, apply };

export default plugin;
export * from "./runsGates.ts";
export * from "./runsList.ts";
export * from "./mediaKinds.ts";
export * from "./runsTypes.ts";
export * from "./runsStart.ts";
export * from "./runsValidate.ts";
export * from "./cardsRegistry.ts";

/** The runs registry row: mounts the live-run service (REBUILD-6).
 *  Inject gates on the queue + drafts + card-registry seats (the
 *  fiber's read contract — loader-mounted fibers enforce the
 *  tutorial's inject law on property reads; the service class's own
 *  static inject lists the same three); the estate-runs adapters
 *  (Typert) ride after this row. */
export const runsRegistryPlugin = {
  name: "estate-runs-registry",
  inject: ["queue", "draftsRemote", "cardRegistry"] as const,
  apply(ctx: Context): void {
    new RunsRegistryService(ctx);
  },
};
