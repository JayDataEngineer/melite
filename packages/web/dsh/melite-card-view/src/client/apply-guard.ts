/**
 * Cross-module-instance apply guard for the melite-card-view client bundle.
 *
 * The client factory can run more than once in one page lifetime (stale bundle
 * mixed with a rebuilt one across a host restart). Without a guard, every
 * factory run registers its own toolview entry. The flag lives on globalThis so
 * independent factory runs share one guard: first claim wins, later claims are
 * no-ops until the owning fiber unloads (hot reload) releases it.
 */
declare global {
  // eslint-disable-next-line no-var
  var __rayCardViewApplied: boolean | undefined
}

/** Claims the plugin apply slot. Returns true when this call won the slot. */
export function claimCardViewApply(): boolean {
  if (globalThis.__rayCardViewApplied === true) return false
  globalThis.__rayCardViewApplied = true
  return true
}

/** Releases the claim so a hot-reloaded bundle can claim again in-page. */
export function releaseCardViewApply(): void {
  globalThis.__rayCardViewApplied = undefined
}
