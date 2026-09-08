/**
 * DEV-ONLY: suppress Vite's server-initiated full-page-reload messages.
 *
 * WHY THIS EXISTS
 * ---------------
 * Vite falls back to `{ type: 'full-reload' }` over its WebSocket when a
 * changed module cannot be hot-swapped. The two triggers that bite this
 * codebase:
 *
 *   1. React Fast Refresh bails on files that export non-component values
 *      (constants, plain functions, types) alongside a component — Refresh
 *      can only hot-replace files whose exports are all components/hooks.
 *      The classic symptom is the console warning "Could not Fast Refresh".
 *   2. Circular imports invalidate the HMR boundary — no clean acceptor is
 *      found, so Vite reloads the whole page.
 *
 * Each full reload re-evaluates every module and wipes module-level zustand
 * stores — the "Agent is composing the flow…" wipe where a composed
 * flow vanishes mid-edit.
 *
 * WHAT THIS PLUGIN DOES
 * ---------------------
 * Wraps `server.ws.send` and swallows the `full-reload` payload, logging a
 * clear hint instead. Combined with storeDevPersistence (sessionStorage
 * rehydration of the flow stores, commit b9d87e1b), the contract becomes:
 *
 *   * HMR-able edits        → hot-swap instantly, no reload (unchanged).
 *   * Non-HMR-able edits    → NO surprise reload; console logs the path that
 *                             couldn't swap; refresh manually when you're
 *                             ready — and the flow survives the refresh.
 *
 * TRADEOFF
 * --------
 * For a file Vite genuinely cannot HMR, suppressing the auto-reload means
 * the edit will NOT appear in the browser until you manually refresh. That
 * is the safe direction: a silent reload that wipes state is worse than a
 * logged no-op + a refresh you control. The rehydration layer guarantees
 * that refresh is non-destructive.
 *
 * This plugin does NOT suppress:
 *   * Client-initiated reloads from an un-applyable `update` payload (rare;
 *     the rehydration layer covers those).
 *   * `page.reload()` from Playwright e2e specs (that goes through the
 *     browser protocol, not the Vite WS — store-rehydration.spec.ts still
 *     verifies state survives an explicit reload).
 *
 * ROOT CAUSE
 * ----------
 * The durable fix is to make those files Fast-Refresh-compatible: move
 * non-component exports out of component modules and break import cycles.
 * This plugin is the safety net while that cleanup proceeds.
 */
import type { Plugin, ViteDevServer } from 'vite'

type MaybeHotPayload = { type?: unknown; path?: string }

export function noFullReloadPlugin(): Plugin {
  return {
    name: 'no-full-reload',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      const originalSend = server.ws.send.bind(server.ws) as (
        ...args: unknown[]
      ) => void

      server.ws.send = function (this: unknown, ...args: unknown[]): void {
        const payload = args[0] as MaybeHotPayload
        if (
          payload &&
          typeof payload === 'object' &&
          payload.type === 'full-reload'
        ) {
          server.config.logger.info(
            `[no-full-reload] suppressed full-reload` +
              (payload.path ? ` for ${payload.path}` : '') +
              ` — HMR couldn't swap this module (Fast Refresh only handles ` +
              `files that export only components/hooks; or a cycle blocked ` +
              `the boundary). Refresh manually when ready — flow state ` +
              `is preserved via sessionStorage.`,
          )
          return
        }
        return originalSend(...args)
      } as typeof server.ws.send
    },
  }
}
