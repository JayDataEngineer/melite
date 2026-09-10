import type { Context } from "@deepseek-ai/cordis";
import { apply as applyJsonBackend, Config as JsonBackendConfig } from "@deepseek-ai/dsh-storage-json";
import { apply as applyDomainFacility, Config as DomainFacilityConfig } from "@deepseek-ai/dsh-storage-domain";
/** Provides `ctx.storage` (no inject — injecting the service it
 *  provides would self-wait). */
export declare const storageHub: {
    name: string;
    apply(ctx: Context): void;
};
/** The json backend plugin (unit files under its root) — config
 *  `{ root }` is env-derived at the composition site, never pinned. */
export declare const storageJsonBackend: {
    name: string;
    inject: string[];
    Config: import("@deepseek-ai/schemastery").default<JsonBackendConfig>;
    apply: typeof applyJsonBackend;
};
/** The domain facility plugin (`ctx.storageDomain`) — config
 *  `{ backend: "json" }` (routes reserved for a second backend). */
export declare const storageDomainFacility: {
    name: string;
    inject: string[];
    Config: import("@deepseek-ai/schemastery").default<DomainFacilityConfig>;
    apply: typeof applyDomainFacility;
};
//# sourceMappingURL=storage.d.ts.map
