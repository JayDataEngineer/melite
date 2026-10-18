import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { QueueConfig } from "./service.js";
export { QueueService } from "./service.js";
export { RunsRuntimeService } from "./runsRegistry.js";
export { ManageGatewayService } from "./manageRegistry.js";
export type { QueueConfig } from "./service.js";
export * from "./vocab.js";
export * from "./queue.js";
export { bootSweep } from "./resurrect.js";
export declare const name = "estate-queue";
export declare const inject: string[];
export declare function apply(ctx: Context, config?: QueueConfig): void;
declare const plugin: Plugin;
export default plugin;
export * from "./runsGates.js";
export { findSkill, disclosureRoot } from "./skillPlane.js";
export type { FamilyModelsSeat } from "./flowsFamilyCompose.js";
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
export declare const runsRegistryPlugin: {
    name: string;
    inject: readonly ["queue", "draftsRemote", "cardRegistry"];
    apply(ctx: Context): void;
};
//# sourceMappingURL=index.d.ts.map
