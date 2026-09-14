import { BenchRemoteService, DraftsRemoteService } from "./remote.js";
export { BenchRemoteService, DraftsRemoteService } from "./remote.js";
export { resolveStorageRoot, openDraftsDomain, } from "./store.js";
export { DRAFT_ID_RE, draftIdOk } from "./spec.js";
export const name = "estate-drafts";
export function apply(ctx) {
    new DraftsRemoteService(ctx);
    new BenchRemoteService(ctx);
}
const plugin = { name, apply };
export default plugin;
//# sourceMappingURL=index.js.map