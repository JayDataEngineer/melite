import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { QueueConfig } from "./service.ts";
export { QueueService } from "./service.ts";
export { RunsRuntimeService } from "./runsRegistry.ts";
export { ManageGatewayService } from "./manageRegistry.ts";
export type { QueueConfig } from "./service.ts";
export * from "./vocab.ts";
export * from "./queue.ts";
export { bootSweep } from "./resurrect.ts";
export declare const name = "estate-queue";
export declare const inject: string[];
export declare function apply(ctx: Context, config?: QueueConfig): void;
declare const plugin: Plugin;
export default plugin;
export * from "./runsGates.ts";
export { findSkill, disclosureRoot } from "./skillPlane.ts";
export type { FamilyModelsSeat } from "./flowsFamilyCompose.ts";
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
export declare const runsRegistryPlugin: {
    name: string;
    inject: readonly ["queue", "draftsRemote", "cardRegistry"];
    apply(ctx: Context): void;
};
//# sourceMappingURL=index.d.ts.map
