// storage.ts — the persistence tier rows (re-homed, gateway kill 2026-09-10).
//
// The DSH storage packages export plugin PIECES (name/inject/apply),
// not ready plugin objects — this module composes the loader-ready
// rows the estate bundle mounts, FIRST in the persistence tier
// (hub → json backend → domain facility: the domain layer injects
// the backend's lifecycle service key, so activation cannot race
// registration). Plugin Config stays schemastery (the packages' own
// contracts, validated by the registry before apply).
import { Storage } from "@deepseek-ai/dsh-storage";
import { apply as applyJsonBackend, Config as JsonBackendConfig, inject as jsonBackendInject, name as jsonBackendName, } from "@deepseek-ai/dsh-storage-json";
import { apply as applyDomainFacility, Config as DomainFacilityConfig, inject as domainFacilityInject, name as domainFacilityName, } from "@deepseek-ai/dsh-storage-domain";
/** Provides `ctx.storage` (no inject — injecting the service it
 *  provides would self-wait). */
export const storageHub = {
    name: "storage-hub",
    apply(ctx) {
        new Storage(ctx);
    },
};
/** The json backend plugin (unit files under its root) — config
 *  `{ root }` is env-derived at the composition site, never pinned. */
export const storageJsonBackend = {
    name: jsonBackendName,
    inject: jsonBackendInject,
    Config: JsonBackendConfig,
    apply: applyJsonBackend,
};
/** The domain facility plugin (`ctx.storageDomain`) — config
 *  `{ backend: "json" }` (routes reserved for a second backend). */
export const storageDomainFacility = {
    name: domainFacilityName,
    inject: domainFacilityInject,
    Config: DomainFacilityConfig,
    apply: applyDomainFacility,
};
//# sourceMappingURL=storage.js.map
