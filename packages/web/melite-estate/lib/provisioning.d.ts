import type { Plugin } from "@deepseek-ai/cordis";
import Schema from "@deepseek-ai/schemastery";
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
/** Provider config — the store-root pin (V8 cure, 2026-10-18: the
 *  weights store root resolved through an env-wins seam with a
 *  silent-swallow fallback; it is now a validated config field and
 *  the checkout-config read happens at apply, loud on a refuse). */
export interface ProvisioningCompositionConfig {
    /** The weights store root. Unset: derived from the checkout's
     *  tracked configs at apply (loadStoreRoot). */
    storeRoot?: string;
}
/** The validator twin of {@link ProvisioningCompositionConfig}. */
export declare const ProvisioningCompositionConfig: Schema<Schemastery.ObjectS<NoInfer<{
    storeRoot: Schema<string, string, "plain">;
}>>, Schemastery.ObjectT<NoInfer<{
    storeRoot: Schema<string, string, "plain">;
}>>, "plain">;
export declare const provisioningComposition: Plugin;
export default provisioningComposition;
//# sourceMappingURL=provisioning.d.ts.map
