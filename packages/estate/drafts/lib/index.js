import { BenchRemoteService, DraftsRemoteService } from "./remote.js";
import { DraftsDomainSeatService } from "./store.js";
export { BenchRemoteService, DraftsRemoteService, installBenchChangeSeam } from "./remote.js";
export { resolveStorageRoot, openDraftsDomain, } from "./store.js";
export { DRAFT_ID_RE, draftIdOk } from "./spec.js";
export { setBenchChangeSeam } from "./bench.js";
export const name = "estate-drafts";
export function apply(ctx) {
    // the domain seat mounts FIRST — the remote services' writers open
    // the drafts domain through it (openDraftsDomain probes this seat)
    new DraftsDomainSeatService(ctx);
    new DraftsRemoteService(ctx);
    new BenchRemoteService(ctx);
}
const plugin = { name, apply };
export default plugin;
//# sourceMappingURL=index.js.map
