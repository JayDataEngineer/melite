/**
 * `@melite-plugin/dsh-gallery` — browser half.
 *
 * THE FULL PORT (2026-09-11, operator order: the media sidebar lost
 * its features to the migrations — "there isn't even a modal anymore").
 * The deleted @infer-media/dsh-media package's feature set returns onto
 * the gallery's package + routes: the registration follows the deleted
 * client and the shipped tabs (dsh-card-view's cards tab,
 * dsh-card-deck's comfy-manager) — the `ui-sidebar-right` tab registry
 * carries the type + guide row, the `sidebar.right.pane.tab` slot
 * carries the body.
 *
 * SINGLE-TAB SHAPE (operator order, later the same day — the
 * standalone Flows tab read as a second sidebar entry beside Media):
 * ONE tab only — Media (kind 'media', guide order 51). The composed
 * action cards (drafts) live exclusively behind the Media panel's
 * segmented Flows/Artifacts toggle (the flows face over
 * /infer-gallery/drafts, click loads onto the bench and opens the
 * cards tab). The deleted package's second registration
 * (infer-media:flows, kind 'flows', order 52) is deliberately NOT
 * restored; its component file died with it — no unregistered dead
 * tab code ships.
 *
 * The body is self-driving (useFeed → the gallery's own host routes —
 * no transport threading, the panel carries its own fetch caller).
 *
 * The seat spellings below are the LOCAL TabCtx pattern (same as
 * dsh-card-deck's assets-tab — a local structural interface, like
 * dsh-task-board's local 'web-ui.plugin.item' spelling) so this
 * package registers without the sibling UI packages' type graphs.
 *
 * This entry is deliberately JSX-free (the shared preset only
 * discovers src/client/index.ts); the glyph lives in MediaPanel.tsx.
 *
 * The store + view exports below remain for headless harnesses.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ComponentType } from 'react'
import { claimGalleryApply, releaseGalleryApply } from './apply-guard.ts'
import { MediaPanel, MediaTabIcon } from './MediaPanel.tsx'

import { setContractToastSink } from '@melite/catalog'
import { useToastStore } from '@melite/card-base/client'

// CONTRACT TOASTS — wire the inlined catalog contract stores to the
// row's toast store (the one host that outlives every reporting
// surface); verdicts surface from the same instance that renders them.
setContractToastSink((type, message, action) => {
  useToastStore.getState().addToast(type, message, action)
})

/** The tab type's identity (the id its body registers under — the
 *  deleted package's contract spelling, restored). */
const MEDIA_TAB_ID = 'infer-media:media'

/** Local structural spelling of the seats this entry touches (the
 *  card-deck pattern: no type-merge dependency on sibling UI
 *  packages). */
interface TabCtx {
  effect(fn: () => void, name?: string): unknown
  /** The native right-sidebar tab registry (ui-sidebar-right). */
  sidebarRightTabs: {
    register(def: {
      id: string
      kind: string
      title(): string
      guide?: Array<{
        id: string
        order: number
        title(): string
        description?(): string
        icon?: ComponentType<{ size?: number; className?: string }>
      }>
    }): unknown
  }
  slots: {
    inject(name: 'sidebar.right.pane.tab', declare: () => unknown): unknown
    register(options: { name: 'sidebar.right.pane.tab'; key: string }, component: ComponentType<Record<string, unknown>>): unknown
  }
}

/** Required services (fiber inject waiting — the tab registry must be
 *  up first). */
export const inject = ['slots', 'sidebarRightTabs']

/**
 * Client apply: claims the single application slot, then registers
 * the Media tab (type + body) exactly as the deleted client and the
 * shipped tabs do.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  // A duplicated client injection (factory executed twice per page
  // lifetime) would register a second entry. First application wins.
  if (!claimGalleryApply()) return
  ctx.effect(() => releaseGalleryApply, 'melite-gallery: apply claim')
  const tab = ctx as unknown as TabCtx

  // Stage one — the tab type (page kind: no patterns, opened by kind
  // from the guide row). Logged, never thrown (shell law).
  try {
    tab.effect(() => tab.sidebarRightTabs.register({
      id: MEDIA_TAB_ID,
      kind: 'media',
      title: (): string => 'Media',
      guide: [{
        id: 'media-tab-guide',
        order: 51,
        title: (): string => 'Media',
        description: (): string => 'Every run\'s artifacts — the archive, with the lightbox, chips, search and the cards wand.',
        icon: MediaTabIcon,
      }],
    }), 'melite-gallery: media tab type')
  } catch (error: unknown) {
    console.error('[melite-gallery] media tab type registration failed:', error)
  }

  // Stage two — the body, dispatched under the type's id.
  try {
    tab.slots.inject('sidebar.right.pane.tab', () => tab.slots.register(
      { name: 'sidebar.right.pane.tab', key: MEDIA_TAB_ID },
      MediaPanel as unknown as ComponentType<Record<string, unknown>>,
    ))
  } catch (error: unknown) {
    console.error('[melite-gallery] media tab body registration failed:', error)
  }
}

// Re-exported for headless harnesses; the loader consumes only name/inject/apply.
export { MediaPanel, MediaTabIcon, kindOf, callsTextOf, flatten } from './MediaPanel.tsx'
export { artifactPathOfUrl, deleteArtifact, renameArtifact } from './artifact-ops.ts'
export { loadDraftOntoBench, loadRunOntoBench, cardsBenchAddress, cardsRunAddress } from './bench-load.ts'
export { useFeed } from './useFeed.ts'
export { decodeRuns, decodeDrafts } from './decode.ts'
export type { RunRow, RunArtifact, DraftRow } from './decode.ts'
export { MEDIA_KINDS } from './media-kinds.ts'
