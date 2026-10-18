import { QueueService } from "./service.js";
import { RunsRuntimeService } from "./runsRegistry.js";
export { QueueService } from "./service.js";
// THE MOUNTED SEATS (li-aq.3, the walls-plane typecheck's find: the
// remotes each re-declared `runs`/`manage` on Context with a
// hand-rolled structural interface while this package declared the
// same keys with the real classes — TS2717, a conflict no program
// had ever composed before the walls plane typechecked. ONE owner
// per key, typed with what actually mounts.)
export { RunsRuntimeService } from "./runsRegistry.js";
export { ManageGatewayService } from "./manageRegistry.js";
export * from "./vocab.js";
export * from "./queue.js";
// bootSweep twins (queue.ts core impl + resurrect.ts QueueRoots
// wrapper): the explicit export wins over the stars — the wrapper
// is the domain seam.
export { bootSweep } from "./resurrect.js";
import { FlowsSeatService } from "./flowsData.js";
export const name = "estate-queue";
export const inject = ["timer"];
export function apply(ctx, config = {}) {
    // THE FLOWS SEAT MOUNTS FIRST (plugin-law J4, 2026-10-18): the
    // registry's live table is service instance state, its seed rows
    // fiber-owned (ctx.effect in the constructor — the models
    // registerFamily precedent). Every later row reads it through
    // ctx.get("meliteFlows"); the queue itself needs no inject for a
    // same-row service it never property-reads.
    new FlowsSeatService(ctx);
    new QueueService(ctx, config);
}
const plugin = { name, inject, apply };
export default plugin;
export * from "./runsGates.js";
// The skill-serving path (stroke 62): findSkill + disclosureRoot —
// the agent engine's spawn-injection reader rides these over the
// SAME storage melite_load serves (never a second skill tree).
export { findSkill, disclosureRoot } from "./skillPlane.js";
// THE LIVE BENCH (the selection's only source — the catalog law)
// stays PACKAGE-INTERNAL since the dry-sweep's J18: the only live
// reader is skillPlane's buildSkillIndex (benchPicksSync, direct
// src import); the index face's re-exports had zero external
// importers, and the async twin + fingerprint rode no consumer at
// all. The spec pins the law through direct src imports.
export * from "./runsList.js";
export * from "./mediaKinds.js";
export * from "./runsTypes.js";
export * from "./runsStart.js";
export * from "./rootsManifest.js";
export * from "./discloseRegistry.js";
export * from "./skillPlane.js";
export * from "./skillRegistry.js";
export * from "./loadPlane.js";
export * from "./loadRegistry.js";
export * from "./toolProjection.js";
export * from "./ledgerTail.js";
export * from "./managePlane.js";
export * from "./manageRegistry.js";
export * from "./flowsData.js";
export * from "./runsValidate.js";
export * from "./cardsRegistry.js";
export { factsPath } from "./cardsFacts.js";
/** The runs registry row: mounts the live-run service (REBUILD-6).
 *  Inject gates on the queue + drafts + card-registry seats (the
 *  fiber's read contract — loader-mounted fibers enforce the
 *  tutorial's inject law on property reads; the service class's own
 *  static inject lists the same three); the estate-runs adapters
 *  (Typert) ride after this row. */
export const runsRegistryPlugin = {
    name: "estate-runs-registry",
    inject: ["queue", "draftsRemote", "cardRegistry"],
    apply(ctx) {
        new RunsRuntimeService(ctx);
    },
};
//# sourceMappingURL=index.js.map