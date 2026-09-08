import './tailwind.css'
import './index.css'
import { StrictMode } from 'react'
import { initBrowserStorage } from "@melite/contracts"
import { installStaleChunkReload, reloadOnStaleChunk } from './lib/staleChunk'

// ALWAYS-ON: ALL browser storage is IndexedDB-backed. Every module that reads
// localStorage SYNCHRONOUSLY at module-eval time (storePersistence rehydrate,
// tagMap, rightPanelStore, bodyStudio, motionThumb/Poster stores) must see
// the seeded cache — so the app is imported lazily AFTER
// `initBrowserStorage()` swaps the global. See lib/browserStorage.ts.
async function bootstrap(): Promise<void> {
  // Stale-chunk self-heal FIRST (lib/staleChunk.ts — the card-view
  // crash, 2026-09-06): dist rebuilds land under open tabs; a dead
  // chunk hash must reload the page, not crash the surface.
  installStaleChunkReload()

  // The capabilities lane: plugins' session-scoped agent tools +
  // studio-context loaders register BEFORE the shell renders (fire and
  // contain: a broken capability logs, never bricks boot).
  await import("./shell/pluginCapabilities")

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

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap().catch((err: unknown) => {
  // Net #3 (lib/staleChunk.ts): a boot-time chunk fetch that 404'd on
  // a stale tab self-heals with ONE guarded reload; anything else is a
  // real boot failure — log it, never dead-air.
  if (!reloadOnStaleChunk(err)) {
    console.error('[bootstrap] failed:', err)
  }
})
