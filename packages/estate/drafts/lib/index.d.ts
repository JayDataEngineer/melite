import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { DraftsConfig } from "./store.js";
export { BenchRemoteService, DraftsRemoteService, installBenchChangeSeam } from "./remote.js";
export { resolveStorageRoot, openDraftsDomain, } from "./store.js";
export type { DraftsConfig } from "./store.js";
export { DRAFT_ID_RE, draftIdOk } from "./spec.js";
export type { CharacterRecord } from "./spec.js";
export type { BenchChangeSeam } from "./bench.js";
export { setBenchChangeSeam } from "./bench.js";
export type { BenchEnsureRow, BenchGetRow, DraftListResult, DraftListRow, } from "./remote.js";
export declare const name = "estate-drafts";
export declare function apply(ctx: Context, config?: DraftsConfig): void;
declare const plugin: Plugin;
export default plugin;
//# sourceMappingURL=index.d.ts.map