/**
 * `@infer-media/dsh-gallery` — browser half.
 *
 * THE GALLERY TAB (operator directive 2026-09-11: "there is no media" —
 * the earlier no-surface directive is superseded; runs media must be
 * browsable). The registration is 1:1 with the two shipped tabs
 * (dsh-card-view's cards tab, dsh-card-deck's comfy-manager tab): the
 * `ui-sidebar-right` tab registry carries the type + guide row, the
 * `sidebar.right.pane.tab` slot carries the body. The body is the
 * self-driving GalleryView (fetchRuns → RunsView over the host route
 * /infer-gallery/runs — no transport threading, the panel carries its
 * own fetch caller).
 *
 * The seat spellings below are the LOCAL TabCtx pattern (same as
 * dsh-card-deck's assets-tab — a local structural interface, like
 * dsh-task-board's local 'web-ui.plugin.item' spelling) so this
 * package registers without the sibling UI packages' type graphs.
 *
 * The store + view exports below remain for headless harnesses.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ComponentType } from 'react'
import { claimGalleryApply, releaseGalleryApply } from './apply-guard.ts'
import { GalleryView } from './GalleryView.tsx'

/** The tab type's identity (the id its body registers under). */
const GALLERY_TAB_ID = '@infer-media/dsh-gallery'

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
 * Client apply: claims the single application slot, then registers the
 * gallery tab (type + body) exactly as the shipped tabs do.
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
      id: GALLERY_TAB_ID,
      kind: 'gallery',
      title: (): string => 'Gallery',
      guide: [{
        order: 55,
        title: (): string => 'Gallery',
        description: (): string => 'The runs media — every generation\'s artifacts.',
      }],
    }), 'melite-gallery: tab type')
  } catch (error: unknown) {
    console.error('[melite-gallery] tab type registration failed:', error)
  }

  // Stage two — the body, dispatched under the type's id.
  try {
    tab.slots.inject('sidebar.right.pane.tab', () => tab.slots.register(
      { name: 'sidebar.right.pane.tab', key: GALLERY_TAB_ID },
      GalleryView as unknown as ComponentType<Record<string, unknown>>,
    ))
  } catch (error: unknown) {
    console.error('[melite-gallery] tab body registration failed:', error)
  }
}

// Re-exported for headless harnesses; the loader consumes only name/inject/apply.
export { galleryStore } from './store.ts'
export { fetchRuns } from './runs-data.ts'
export type { RunRecord, RunsState } from './runs-data.ts'
export { RunCard, runModel, runOpenUrl, formatRunTime } from './RunCard.tsx'
export { RunsView } from './RunsView.tsx'
export { GalleryView } from './GalleryView.tsx'
