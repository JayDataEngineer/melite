import type { Context, Plugin } from "@deepseek-ai/cordis";
import Schema from "@deepseek-ai/schemastery";
import type { QueueConfig } from "./service.ts";
export { QueueService } from "./service.ts";
export { RunsRuntimeService } from "./runsRegistry.ts";
export { ManageGatewayService } from "./manageRegistry.ts";
export type { QueueConfig } from "./service.ts";
export * from "./vocab.ts";
export * from "./queue.ts";
export declare const name = "estate-queue";
export declare const inject: string[];
/** The validator twin of {@link QueueConfig} — the plugin-law Config
 *  every Cordis plugin must export (cordis-tutorial/05-config.md:
 *  config is a declared schema, validated before apply, settable
 *  from cordis.yml; the 2026-11-20 cordis-waterfall audit's F1 —
 *  this seat shipped config fields with no schema, so a typo'd
 *  cordis.yml row passed silently as absent). Every field optional:
 *  the seat's own law is `config = {}`, the service resolves
 *  defaults (service.ts documents each field's resolution). */
export declare const Config: Schema<QueueConfig>;
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
export { engineRootOf, engineOutputDir, resolveRuntimeHome, runtimeEnvView, resolveRuntimeProvision, nodeRuntimeFs, sentinelHit } from "./runtimeProvision.ts";
//# sourceMappingURL=index.d.ts.map