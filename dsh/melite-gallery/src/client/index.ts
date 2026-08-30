/**
 * `@melite-plugin/dsh-gallery` — browser half.
 *
 * NO browser surfaces (operator directive 2026-08-22: the bottom-left
 * "Melite" button was never asked for). The gallery's data path is the
 * host-half proxy routes (/melite-gallery/runs, /melite-gallery/artifact);
 * the runs are surfaced where they belong — in the Cards tab's canvas
 * lanes and the chat's rich cards — never as parallel melite-owned chrome.
 * The store + view exports below remain for headless harnesses.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { claimGalleryApply, releaseGalleryApply } from './apply-guard.ts'

/** Required services (fiber inject waiting — the slot registry must be up first). */
export const inject = ['slots']

/**
 * Client apply: claims the single application slot and mounts nothing —
 * presence in the client bundle keeps the host-half proxy routes alive.
 * @param ctx - client root context.
 */
export function apply(_ctx: ClientContext): void {
  if (!claimGalleryApply()) return
  _ctx.effect(() => releaseGalleryApply, 'melite-gallery: apply claim')
}

// Re-exported for headless harnesses; the loader consumes only name/inject/apply.
export { galleryStore } from './store.ts'
export { fetchRuns } from './runs-data.ts'
export type { RunRecord, RunsState } from './runs-data.ts'
export { RunCard, runModel, runOpenUrl, formatRunTime } from './RunCard.tsx'
export { RunsView } from './RunsView.tsx'
export { GalleryView } from './GalleryView.tsx'