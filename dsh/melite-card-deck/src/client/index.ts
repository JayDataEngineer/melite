/**
 * `@melite-plugin/dsh-card-deck` — browser half.
 *
 * ONE surface: the CARDS sidebar entry — the family pattern (Task Board /
 * SSH). A single "Cards" row in the left sidebar under New Session opens
 * the card deck as a FULL TAKEOVER of the center column (deck-fullbleed:
 * column sibling-kill + composer hide + <html> attribute). There is NO top
 * tab (operator law 2026-08-22: the top strip is the chat's — "that is for
 * chat [REDACTED 2026-11-05], not cards"), no footer button, no shell overlay, no left lane
 * rows. The left-sidebar row is THE way into card view.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { claimDeckApply, releaseDeckApply } from './apply-guard.ts'
import { mountCardsSidebarEntry } from './deck-sidebar-entry.tsx'
import { mountDeckFullbleed } from './deck-fullbleed.ts'
// The native form-card renderer + its ideogram_canvas slot (the advanced
// Ideogram mode import). Exported so the bundle CARRIES them for any DSH
// surface that mounts action-form cards; FormCard dispatches IdeoCanvasField
// by declared field type.
export { FormCard } from './FormCard.tsx'
export type { FormCardHandle } from './FormCard.tsx'
export { IdeoCanvasField } from './IdeoCanvasField.tsx'

/** 'betterSidebar': the public right-sidebar registry (dsh-better-sidebar,
 * mounted by the web profile's web-ui-all aggregate) — hosts the Melite
 * Assets tab. */
export const inject = ['slots', 'betterSidebar']

export function apply(ctx: ClientContext): void {
  if (!claimDeckApply()) return
  ctx.effect(() => releaseDeckApply, 'melite-card-deck: apply claim')

  // The Cards sidebar entry (family row, self-healing DOM via the vendored
  // entry core; dsh's sidebar shell exposes no registrable nav slot).
  // Toggle mounts the deck container in the center column; deck-fullbleed
  // applies the takeover. Logged, never thrown (shell law).
  try {
    ctx.effect(() => mountCardsSidebarEntry(), 'melite-card-deck: sidebar entry')
  } catch (error) {
    console.error('[melite-card-deck] sidebar entry mount failed:', error)
  }

  // Full-bleed takeover of the center column while the deck container is
  // the resident view — the family's Task Board / SSH method (column-level
  // overlay + <html> attribute + their dsh-panel-activate bus), our
  // namespace. Logged, never thrown (shell law).
  try {
    ctx.effect(() => mountDeckFullbleed(), 'melite-card-deck: full-bleed')
  } catch (error) {
    console.error('[melite-card-deck] full-bleed mount failed:', error)
  }

  // ONE SIDEBAR (operator order 2026-08-30: "stop with the three — make ONE
  // sidebar with all the features"): the ray-era Melite Assets right-sidebar
  // tabs are REMOVED. The ONE media sidebar is @infer-media/dsh-media's
  // "Media" tab (runs grid + playback + recreate); the deck keeps only its
  // left-sidebar canvas row. assets-tab.tsx was deleted — single pattern.
}
