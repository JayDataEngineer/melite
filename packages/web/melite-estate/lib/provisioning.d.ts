import type { Plugin } from "@deepseek-ai/cordis";
/** The readiness retry backoff (500ms, raced against the caller's
 *  abort signal). cordis did NOT drop `ctx.timeout` — the vendored
 *  cordis-plugin-timer supplies it and the manage row injects the
 *  seat (estate-queue/src/manageRegistry.ts:89); this composition
 *  does not seat it, so the port's retry rides a bare setTimeout —
 *  owed: seat "timer" and ride the fiber-scoped primitive. Rides
 *  the exported SEAMS holder so the coverage rig overrides the
 *  sleep by name (ESM export bindings are frozen — an internal
 *  call can never be stubbed through the namespace; a property on
 *  a live object can). */
export declare const SEAMS: {
    readinessBackoff(signal?: AbortSignal): Promise<void>;
};
export declare const provisioningComposition: Plugin;
export default provisioningComposition;
//# sourceMappingURL=provisioning.d.ts.map
