import { useEffect, useState } from 'react'
import { TooltipProvider } from '@melite/ui/tooltip'
import { WorkspaceLayout } from './surfaces/shared/WorkspaceLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Toaster } from './components/Toaster'
import { AppSkeleton } from './components/AppSkeleton'
// Themes lane (§16): fetches the served theme table once and applies
// the persisted selection as inline CSS vars on :root. Mounts ABOVE the
// skeleton so the stored theme paints from the first frame.
import { ThemeProvider } from './shell/themeProvider'
import { initTagSync } from "@melite/catalog"
import { AgentCardsEmbed } from './surfaces/flow/AgentCardsEmbed'
import { AssetsEmbed, AssetsPreviewEmbed } from './surfaces/library/AssetsEmbed'
// Wand deep link (2026-08-29): /editor/?revive=<run_id> hydrates the card
// canvas from that run — the SAME action as the sidebar wand ("Open as
// cards") — so external surfaces (the DSH media panel) can drop the user
// straight into a filled, editable card view for iteration.
import { useLibraryFlowStore } from './surfaces/flow/flowStore'

export function App() {
  const [loading, setLoading] = useState(true)
  // DSH chat embed (2026-08-22): /editor/?meliteCards=<draftId> renders ONLY
  // the agent cards surface — the REAL InlineFlowCards, hydrated from
  // the backend draft, no shell chrome. The DSH toolview iframes this URL;
  // everything (tiles, zoom, CardStudio, Run) is the one card design.
  const [embedDraftId] = useState(
    () => new URLSearchParams(window.location.search).get('meliteCards'),
  )
  // DSH sidebar-tab embeds (2026-08-22): /editor/?meliteAssets=media |
  // cards renders ONE REAL sidebar per tab — the media archive (media)
  // and the capability library (cards) were DIFFERENT things in the old
  // system; they stay different tabs here. (the flows TEMPLATES tab
  // retired 2026-09-05 with the yaml spec library — NO LEGACY.)
  // ?melitePreview=<id> is the FULLSCREEN preview overlay the media tab
  // opens for a tile click.
  const [embedAssets] = useState(
    () => new URLSearchParams(window.location.search).get('meliteAssets'),
  )
  const [embedPreviewId] = useState(
    () => new URLSearchParams(window.location.search).get('melitePreview'),
  )
  // ?revive=<run_id> — wand entry point (see import note above). Runs after
  // init settles; loadRunById owns its own clobber guard (confirm dialog
  // when a non-empty flow would be replaced) — identical to the wand.
  const [reviveRunId] = useState(
    () => new URLSearchParams(window.location.search).get('revive'),
  )
  useEffect(() => {
    if (loading || !reviveRunId) return
    void useLibraryFlowStore.getState().loadRunById(reviveRunId)
  }, [loading, reviveRunId])
  useEffect(() => {
    let mounted = true
    // initTagSync hydrates the tag store from the server (canonical) + arms
    // the debounced PUT on mutations. Silent on failure — offline mode keeps
    // the localStorage cache and stays local-only.
    const init = async () => {
      try {
        await initTagSync()
      } catch (err) {
        console.error('[App] Failed to initialize:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    init()
    return () => { mounted = false }
  }, [])

  if (embedPreviewId !== null) {
    return (
      <ThemeProvider>
        <ErrorBoundary>
          <TooltipProvider delayDuration={300}>
            <AssetsPreviewEmbed assetId={embedPreviewId} />
            <Toaster />
          </TooltipProvider>
        </ErrorBoundary>
      </ThemeProvider>
    )
  }
  if (embedAssets === 'media' || embedAssets === 'cards') {
    return (
      <ThemeProvider>
        <ErrorBoundary>
          <TooltipProvider delayDuration={300}>
            <AssetsEmbed section={embedAssets} />
            <Toaster />
          </TooltipProvider>
        </ErrorBoundary>
      </ThemeProvider>
    )
  }
  if (embedDraftId) {
    return (
      <ThemeProvider>
        <ErrorBoundary>
          <TooltipProvider delayDuration={300}>
            <AgentCardsEmbed draftId={embedDraftId} />
            <Toaster />
          </TooltipProvider>
        </ErrorBoundary>
      </ThemeProvider>
    )
  }

  if (loading) {
    // AppSkeleton mirrors the real WorkspaceLayout shape (ActivityBar rail
    // + left drawer + header + card grid) so the boot reads as "the app,
    // dimmed" instead of a void with a spinning dot. No layout shift when
    // the real component swaps in.
    return (
      <ThemeProvider>
        <AppSkeleton />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <TooltipProvider delayDuration={300}>
          <WorkspaceLayout />
          <Toaster />
        </TooltipProvider>
      </ErrorBoundary>
    </ThemeProvider>
  )
}
