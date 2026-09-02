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
import { registerRayAssetsTab } from './assets-tab.tsx'

/** 'betterSidebar': the public right-sidebar registry (dsh-better-sidebar,
 * mounted by the web profile's web-ui-all aggregate) — hosts the Ray
 * Assets tab. */
export const inject = ['slots', 'betterSidebar']

export function apply(ctx: ClientContext): void {
  if (!claimDeckApply()) return
  ctx.effect(() => releaseDeckApply, 'ray-card-deck: apply claim')

  // The Cards sidebar entry (family row, self-healing DOM via the vendored
  // entry core; dsh's sidebar shell exposes no registrable nav slot).
  // Toggle mounts the deck container in the center column; deck-fullbleed
  // applies the takeover. Logged, never thrown (shell law).
  try {
    ctx.effect(() => mountCardsSidebarEntry(), 'ray-card-deck: sidebar entry')
  } catch (error) {
    console.error('[ray-card-deck] sidebar entry mount failed:', error)
  }

  // Full-bleed takeover of the center column while the deck container is
  // the resident view — the family's Task Board / SSH method (column-level
  // overlay + <html> attribute + their dsh-panel-activate bus), our
  // namespace. Logged, never thrown (shell law).
  try {
    ctx.effect(() => mountDeckFullbleed(), 'ray-card-deck: full-bleed')
  } catch (error) {
    console.error('[ray-card-deck] full-bleed mount failed:', error)
  }

  // Ray Assets — the old asset sidebar reborn in the better-sidebar (the
  // public registry; a first-class + menu tab). Draggable model tiles that
  // land as action cards on any card view. Logged, never thrown.
  try {
    registerRayAssetsTab(ctx as unknown as Parameters<typeof registerRayAssetsTab>[0])
  } catch (error) {
    console.error('[ray-card-deck] assets tab registration failed:', error)
  }
}
