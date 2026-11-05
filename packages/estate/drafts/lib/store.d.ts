import { Service, type Context } from "@deepseek-ai/cordis";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import type { DraftsDomainSpec } from "./spec.js";
/** The fiber-scoped seat owning the drafts domain handles (id
 *  `meliteDraftsDomain` — the estate-seat prefix law, cf.
 *  skillRegistry.ts:20-28): one instance per mounting fiber, so the
 *  cached opens die with the fiber instead of living at module
 *  scope. Fields are TS-`private`, never `#private` — cordis
 *  `ctx.get` returns a proxy and private class fields die through
 *  it ("Cannot read private member ... whose class did not declare
 *  it"; the flows seat, flowsData.ts, is the measured precedent). */
export declare class DraftsDomainSeatService extends Service {
    static readonly inject: {
        readonly optional: readonly [];
    };
    /** Per-facility open handles, keyed by the facility object (one
     *  slot per provider; GC-bounded, fiber-lifetime). */
    private cached;
    /** Handles this seat opened: the facility frees the name on
     *  Domain.close() only, and the WeakMap above cannot be
     *  enumerated at teardown — so live handles ride this set. */
    private opened;
    constructor(ctx: Context);
    /** Open (or reuse) the drafts domain through the host's storage
     *  facility. Throws LOUD when the host provides no storage
     *  facility — misconfiguration fails at the earliest resolvable
     *  point.
     *  @returns the ready domain handle (cached per facility). */
    open(): Promise<Domain<DraftsDomainSpec>>;
}
/** Open (or reuse) the drafts domain through the mounted seat. The
 *  apply mounts `DraftsDomainSeatService` before the remote
 *  services; tests mount it on their own Context.
 *  @param ctx - the Context whose fiber carries the seat.
 *  @returns the ready domain handle. */
export declare function openDraftsDomain(ctx: Context): Promise<Domain<DraftsDomainSpec>>;
//# sourceMappingURL=store.d.ts.map
