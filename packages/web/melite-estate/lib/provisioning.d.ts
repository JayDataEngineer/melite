import type { Context, Plugin } from "@deepseek-ai/cordis";
import { type DeclarationPort } from "@melite/estate-provisioning";
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
    /** THE ACQUIRE STALL BUDGET (ERRORS.md k2, P5 F1): how long a direct
     *  fetch may land no bytes before the stall watchdog fails it — the
     *  deployment-varying face of ACQUIRE_STALL_TIMEOUT_MS (a lossy link
     *  wants a wider window). Unset: the service default owns the bound.
     *  Validated downstream (positive integer, fails loud at boot). */
    acquireStallTimeoutMs?: number;
    /** THE DURABLE DOWNLOAD SEAT (the lifetime finding, 2026-10-21):
     *  true on the operator's lane — that seat claims 'requested' op
     *  rows and owns every download's lifetime. Unset/false:
     *  transient (an agent session's seat mints requests, never
     *  wires). */
    durableDownloads?: boolean;
    /** THE CLAIM CADENCE (durable seats only): how often the shared
     *  op store is polled for requested rows, in milliseconds.
     *  Validated downstream (positive integer, fails loud at boot). */
    downloadClaimIntervalMs?: number;
}
/** The validator twin of {@link ProvisioningCompositionConfig}. */
export declare const ProvisioningCompositionConfig: Schema<Schemastery.ObjectS<NoInfer<{
    storeRoot: Schema<string, string, "plain">;
    acquireStallTimeoutMs: Schema<number, number, "plain">;
    durableDownloads: Schema<boolean, boolean, "plain">;
    downloadClaimIntervalMs: Schema<number, number, "plain">;
}>>, Schemastery.ObjectT<NoInfer<{
    storeRoot: Schema<string, string, "plain">;
    acquireStallTimeoutMs: Schema<number, number, "plain">;
    durableDownloads: Schema<boolean, boolean, "plain">;
    downloadClaimIntervalMs: Schema<number, number, "plain">;
}>>, "plain">;
/** The direct-model arm's idle budget when the caller passes no
 *  signal (audit V-E9 → the 9.35GB cure, 2026-10-10): the dial
 *  bounds IDLE, never duration — a whole-body cap aborts a healthy
 *  saturated stream mid-file (10 minutes ≈ 5.4GB at lane
 *  bandwidth), so a large weight can never land: every attempt
 *  dies, and the retry (audit download-stack-audit-2026-10-20 F7)
 *  asks `Range: bytes=N-` from the kept part's offset instead of
 *  restarting at zero. A stalled DECL host still cannot park its
 *  operation forever — only a source that stops flowing trips the
 *  bound. */
export declare const PROVISION_FETCH_DIAL_MS = 600000;
/** THE IDLE DIAL (the direct arm's byte source): a fetch whose
 *  abort clock REARMS on every flowing chunk and clears when the
 *  stream ends or is cancelled. `fetch`'s own signal abort is the
 *  only enforcement — the transform just pokes the clock.
 *  @param dialMs — the idle bound; a caller's own signal (when
 *  passed) wins at once and no idle timer rides. */
export declare function idleDialFetch(dialMs: number): (url: string, signal?: AbortSignal, init?: {
    rangeFrom?: number;
}) => Promise<{
    status: number;
    body: ReadableStream<Uint8Array> | null;
    resumedFrom?: number;
    totalBytes?: number;
}>;
/** The declaration half of the provisioning seat — the one contract
 *  door that turns a ResourceRef into its ProvisionPlan. Exported so
 *  the declared-resources wall drives the SAME port the seat consumes
 *  (zero drift: the wall never re-derives a plan). */
export declare function declarationPort(ctx: Context): DeclarationPort;
export declare const provisioningComposition: Plugin;
export default provisioningComposition;
//# sourceMappingURL=provisioning.d.ts.map
