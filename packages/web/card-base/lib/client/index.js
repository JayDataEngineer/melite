import { setContractToastSink } from '@melite/catalog';
import { useToastStore } from "../index.js";
export const name = '@melite/card-base';
export const inject = [];
/** The row's one client-side effect: wire the contract-toast seam.
 *
 *  ORDERING (2026-10-18): every contractToast fire is event-time —
 *  catalog fetch resolution, violation reports, run-status channel
 *  pushes (catalogContractStore actions, runStatusContractStore
 *  channel callbacks) — never a module eval. The boot loop
 *  (loader.import → unwrapExports → registry.plugin → this apply)
 *  runs synchronously, so a sink wired here is in place before the
 *  event loop can run any fire: render-time reporters never observe
 *  an unwired seam. The row is the ONE host that outlives every
 *  reporting surface (the /client door law) — it never disposes in
 *  the browser, so the wire carries no unwinding. */
export function apply(ctx) {
    ctx.effect(() => {
        setContractToastSink((type, message, action) => {
            useToastStore.getState().addToast(type, message, action);
        });
        return () => {
            /* the ONE graph row outlives every reporting surface — the
             * wire is page-lifetime and unwinds with the page itself */
        };
    });
}
export * from "../index.js";
//# sourceMappingURL=index.js.map
