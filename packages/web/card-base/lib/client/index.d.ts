/**
 * client/index.ts — @melite/card-base: the ONE graph-row browser
 * face (THE ONE-ROW LAW, operator order 2026-10-01). The preset
 * wraps this entry into lib/client.js — one
 * `window.__ModuleLoader__.load({id: '@melite/card-base', factory})`
 * registration — and every card client consumes it through the
 * loader's require (`dsh.client.external:
 * ['@melite/card-base/client']`), exactly the way DSH plugins
 * consume platform seed atoms. One compiled instance, one
 * css-module hash; a fix here lands for every card at once.
 *
 * This face is also the TYPED door: `exports['./client']` points
 * its types condition here, so client-plane imports of
 * `@melite/card-base/client` typecheck against the package root
 * verbatim (the loader serves the row — a bare or arbitrary
 * subpath require would miss the table; stripClientSuffix strips
 * only '/client', the DSH convention dsh-api-gateway set).
 *
 * THE ROW IDENTITY (the dual-face law, both planes). The lane
 * composition declares this package as a cordis plugin row
 * (`card-studio-atoms` in profile/cordis.patch.yml), and the shell
 * registers EVERY boot row on both planes — `loader.import` →
 * `unwrapExports` → `registry.plugin`, which refuses a namespace
 * without `apply`. So the browser face carries the same marker the
 * host face carries at `exports['.']` (src/host.ts): name, inject,
 * apply. A row that is a plugin node-side and a plain module in the
 * browser dies the WHOLE client plugin graph with "invalid plugin,
 * expect function or object with an apply method" — the failure
 * paints an empty shell, not a missing card.
 *
 * CONTRACT TOASTS (the row is the one host that outlives every
 * reporting surface): the catalog contract stores inline into
 * every client bundle that reaches @melite/formats, and each copy
 * reports through the seam — the row's apply wires the seam ONCE to
 * the row's own toast store, so verdicts surface from the same
 * instance that renders them (the ordering proof rides apply).
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "@melite/card-base";
export declare const inject: string[];
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
export declare function apply(ctx: Context): void;
export * from '../index.js';
//# sourceMappingURL=index.d.ts.map
