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
 * CONTRACT TOASTS (the row is the one host that outlives every
 * reporting surface): the catalog contract stores inline into
 * every client bundle that reaches @melite/formats, and each copy
 * reports through the seam — this row entry wires the seam ONCE to
 * the row's own toast store, so verdicts surface from the same
 * instance that renders them.
 */
import { setContractToastSink } from '@melite/catalog'
import { useToastStore } from '../index.ts'

setContractToastSink((type, message, action) => {
  useToastStore.getState().addToast(type, message, action)
})

export * from '../index.ts'
