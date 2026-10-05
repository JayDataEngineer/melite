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
 * reports through the seam — this row entry wires the seam ONCE to
 * the row's own toast store, so verdicts surface from the same
 * instance that renders them.
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "@melite/card-base";
export declare const inject: string[];
/** No client-side effects: the row exists for the browser graph —
 *  its atoms reach every card through the loader's require. */
export declare function apply(_ctx: Context): void;
export * from '../index.js';
//# sourceMappingURL=index.d.ts.map
