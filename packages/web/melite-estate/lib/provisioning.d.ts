import type { Plugin } from "@deepseek-ai/cordis";
import Schema from "@deepseek-ai/schemastery";
/** The readiness retry backoff (500ms, raced against the caller's
 *  abort signal). The sleep rides the fiber-scoped timer — ctx.timeout
 *  from the vendored cordis-plugin-timer, seated by this composition's
 *  apply (J7's owed seat, cured: the composition injects "timer" and
 *  assigns SEAMS.sleep through the structural read the two-cordis
 *  topology law names — the same cast manageRegistry.ts:89 uses — so
 *  the sleep is effect-owned and dies with its context, never a bare
 *  setTimeout). The exported SEAMS holder keeps the coverage rig
 *  sovereign: it overrides the backoff by name for instant arms, or
 *  seats its own sleep to exercise the production body (ESM export
 *  bindings are frozen — an internal call can never be stubbed
 *  through the namespace; a property on a live object can). */
export declare const SEAMS: {
    sleep(ms: number): Promise<void>;
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
