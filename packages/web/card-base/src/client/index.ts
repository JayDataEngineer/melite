/**
 * client/index.ts — @melite/card-base: the ONE graph-row browser
 * face (THE ONE-ROW LAW, operator order 2026-10-01). The preset
 * wraps this entry into lib/client.js — one
 * `window.__ModuleLoader__.load({id: '@melite/card-base', factory})`
 * registration — and every card client consumes it through the
 * loader's require (`dsh.client.external: ['@melite/card-base']`),
 * exactly the way DSH plugins consume platform seed atoms. One
 * compiled instance, one css-module hash; a fix here lands for
 * every card at once.
 *
 * The entry is the package root verbatim: consumers import the
 * BARE specifier (the loader serves the package row — a subpath
 * require misses the table, stripClientSuffix strips only
 * '/client'), so the root owns the full client-consumed surface
 * and this face adds nothing of its own.
 */
export * from '../index.ts'
