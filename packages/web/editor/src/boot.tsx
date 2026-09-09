/**
 * Editor boot selector — row-4 S4b skeleton (2026-09-10).
 *
 * TWO contexts, one file:
 * - DSH-HOSTED: a DSH host serves this page (it injects `__DSH_BOOT__` +
 *   `__ModuleLoader__` and resolves `__DSH_BOOT_READY__`, exactly the
 *   surface `AppWebEntry.run()` consumes in
 *   `references/deepseek-harness/packages/client/web/src/boot.ts`). The
 *   editor boots the DSH way: `new AppWebEntry(el).run()`. No custom
 *   `BootSeams` yet — no served editor plugins exist, so there is no
 *   `loadBundle` transport to carry; that seam lands with the first
 *   served editor plugin (S4d).
 * - STANDALONE: bare Vite (dev `:5173`, built dist, deck embed) — no host
 *   globals. The pre-row-4 path runs verbatim (moved here from main.tsx,
 *   same order: stale-chunk install → capabilities → storage seed →
 *   App + createRoot → storePersistence → render).
 *
 * What stays OUT of this file under either boot (shell-build concerns,
 * orthogonal to AppWebEntry): `base: '/editor/'`, the vite dev proxy,
 * the multi-page rollup inputs, the `R()` alias pins (the dual-React
 * cure — apps/web solves the same problem with `dedupe`).
 *
 * Wall: `src/__tests__/boot.test.ts` (branch selection in isolation).
 */
import { StrictMode } from 'react'
import { initBrowserStorage } from "@melite/contracts"
import { installStaleChunkReload } from './lib/staleChunk'

/** The DSH host globals `AppWebEntry.run()` reads (structural slice — the
 *  full types live in `@deepseek-ai/dsh-client-modules/client`). */
export interface DshHostGlobals {
  readonly __DSH_BOOT__?: unknown
  readonly __ModuleLoader__?: unknown
}

/**
 * True when a DSH host serves this page (both globals present). BOTH are
 * required: `AppWebEntry` throws on a missing `__ModuleLoader__`, and a
 * lone `__DSH_BOOT__` without its loader is a half-injected document.
 * @param host - global scope to probe (defaults to globalThis; injectable for tests).
 * @returns whether the DSH-hosted branch applies.
 */
export function isDshHosted(host: DshHostGlobals = globalThis): boolean {
  return host.__DSH_BOOT__ !== undefined && host.__ModuleLoader__ !== undefined
}

/** Editor mount point (index.html always carries it; loud when absent). */
function rootElement(): HTMLElement {
  const el = document.getElementById('root')
  if (el === null) throw new Error('editor boot: missing #root')
  return el
}

/**
 * Boot the editor in whichever context serves this page.
 * @returns resolves after the application mounts (standalone) or after the
 * DSH loader quiesces and mounts (hosted — `AppWebEntry` renders boot
 * failures onto its own boot page instead of rejecting).
 */
export async function bootEditor(): Promise<void> {
  if (isDshHosted()) {
    // Lazy: the standalone bundle never loads the DSH web kernel.
    const { AppWebEntry } = await import('@deepseek-ai/dsh-client-web')
    await new AppWebEntry(rootElement()).run()
    return
  }
  await bootStandalone()
}

/** Bare-Vite boot — the pre-row-4 bootstrap, order-preserved. */
async function bootStandalone(): Promise<void> {
  // Stale-chunk self-heal FIRST (lib/staleChunk.ts — the card-view
  // crash, 2026-09-06): dist rebuilds land under open tabs; a dead
  // chunk hash must reload the page, not crash the surface.
  installStaleChunkReload()

  // The capabilities lane: plugins' session-scoped agent tools +
  // studio-context loaders register BEFORE the shell renders (fire and
  // contain: a broken capability logs, never bricks boot).
  await import("./shell/pluginCapabilities")

  // ALWAYS-ON: ALL browser storage is IndexedDB-backed. Every module that
  // reads localStorage SYNCHRONOUSLY at module-eval time (storePersistence
  // rehydrate, tagMap, rightPanelStore, bodyStudio, motionThumb/Poster
  // stores) must see the seeded cache — so the app is imported lazily
  // AFTER `initBrowserStorage()` swaps the global. See lib/browserStorage.ts.
  try {
    await initBrowserStorage()
  } catch (err) {
    // Absolute last resort — never let a storage failure block the editor.
    console.error('[bootstrap] storage init failed:', err)
  }

  const [{ createRoot }, { App }] = await Promise.all([
    import('react-dom/client'),
    import('./App'),
  ])

  // ALWAYS-ON: persist flow stores so the composed flow survives
  // browser refresh, tab close, and HMR full reloads. Side-effect import —
  // rehydrates before first render (the storage cache is already seeded above).
  await import('./surfaces/flow/storePersistence')

  createRoot(rootElement()).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
