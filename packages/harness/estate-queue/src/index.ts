// index.ts — `@melite/estate-queue`: the serial run queue as a host
// Cordis service (REBUILD-5 of the gateway kill, 2026-09-10).
//
// The run-queue core lives HERE (lock, journal, sidecars,
// refusals, resurrect, run-status probe). The submit vocabulary
// rides this package (vocab.ts), and the draft-id law comes from
// `@melite/estate-drafts` (the law's one address).
import type { Context, Plugin } from "@deepseek-ai/cordis";
import { QueueService } from "./service.ts";
import type { QueueConfig } from "./service.ts";
import { RunsRuntimeService } from "./runsRegistry.ts";

export { QueueService } from "./service.ts";
// THE MOUNTED SEATS (li-aq.3, the walls-plane typecheck's find: the
// remotes each re-declared `runs`/`manage` on Context with a
// hand-rolled structural interface while this package declared the
// same keys with the real classes — TS2717, a conflict no program
// had ever composed before the walls plane typechecked. ONE owner
// per key, typed with what actually mounts.)
export { RunsRuntimeService } from "./runsRegistry.ts";
export { ManageGatewayService } from "./manageRegistry.ts";
export type { QueueConfig } from "./service.ts";
export * from "./vocab.ts";
export * from "./queue.ts";
// bootSweep twins (queue.ts core impl + resurrect.ts QueueRoots
// wrapper): the explicit export wins over the stars — the wrapper
// is the domain seam.
export { bootSweep } from "./resurrect.ts";
import { FlowsSeatService } from "./flowsData.ts";

export const name = "estate-queue";
export const inject = ["timer"];

export function apply(ctx: Context, config: QueueConfig = {}): void {
  // THE FLOWS SEAT MOUNTS FIRST (plugin-law J4, 2026-10-18): the
  // registry's live table is service instance state, its seed rows
  // fiber-owned (ctx.effect in the constructor — the models
  // registerFamily precedent). Every later row reads it through
  // ctx.get("meliteFlows"); the queue itself needs no inject for a
  // same-row service it never property-reads.
  new FlowsSeatService(ctx);
  new QueueService(ctx, config);
}

const plugin: Plugin = { name, inject, apply };

export default plugin;
export * from "./runsGates.ts";
// The skill-serving path (stroke 62): findSkill + disclosureRoot —
// the agent engine's spawn-injection reader rides these over the
// SAME storage melite_load serves (never a second skill tree).
export { findSkill, disclosureRoot } from "./skillPlane.ts";
export type { FamilyModelsSeat } from "./flowsFamilyCompose.ts";
// THE LIVE BENCH (the selection's only source — the catalog law)
// stays PACKAGE-INTERNAL since the dry-sweep's J18: the only live
// reader is skillPlane's buildSkillIndex (benchPicksSync, direct
// src import); the index face's re-exports had zero external
// importers, and the async twin + fingerprint rode no consumer at
// all. The spec pins the law through direct src imports.
export * from "./runsList.ts";
export * from "./mediaKinds.ts";
export * from "./runsTypes.ts";
export * from "./runsStart.ts";
export * from "./rootsManifest.ts";
export * from "./discloseRegistry.ts";
export * from "./skillPlane.ts";
export * from "./skillRegistry.ts";
export * from "./loadPlane.ts";
export * from "./loadRegistry.ts";
export * from "./toolProjection.ts";
export * from "./ledgerTail.ts";
export * from "./managePlane.ts";
export * from "./manageRegistry.ts";
export * from "./flowsData.ts";
export * from "./runsValidate.ts";
export * from "./cardsRegistry.ts";
export { factsPath } from "./cardsFacts.ts";

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
    new RunsRuntimeService(ctx);
  },
};

// THE RUNTIME PRESENCE PROBE (the anny burn's serving cure,
// 2026-10-21): the pure filesystem/config helpers the form-spec
// doc's runtimes block rides — one probe, every consumer (the
// press gate in cardsLanes and the doc's presence rows in
// melite-tools' discovery), never a second spelling.
export { engineRootOf, engineOutputDir, resolveRuntimeHome, runtimeEnvView, resolveRuntimeProvision, nodeRuntimeFs, sentinelHit } from "./runtimeProvision.ts";
